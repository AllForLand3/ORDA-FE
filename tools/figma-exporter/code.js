/* global figma, __html__ */
// Standalone Figma development plugin. No build step or network client.
(function () {
  'use strict';

  const CHANNEL = 'orda-design-exporter';
  const VERSION = '1.1.0';
  const TARGETS = [
    ['9:825', 'Color System'],
    ['28:155', 'Component'],
    ['3:6', '모바일 홈'],
    ['104:3025', 'PC 홈'],
    ['3:121', '로그인'],
    ['6:494', '회원가입'],
    ['8:641', '산 선택'],
    ['40:788', '코스 탐색 시작'],
    ['21:138', '코스 탐색 설정 1'],
    ['21:389', '코스 탐색 설정 2'],
    ['46:401', '코스 탐색 설정 3'],
    ['46:775', '코스 비교'],
    ['67:355', '추천 코스 편집'],
    ['62:629', '지형 분석 1'],
    ['72:358', '지형 분석 2'],
    ['69:706', '주변시설'],
    ['117:762', '내 코스'],
    ['123:1434', '코스 상세'],
    ['125:2231', '코스 편집'],
    ['129:912', '내보내기 1'],
    ['133:913', '내보내기 2'],
    ['117:863', '마이페이지'],
    ['137:946', '내 정보 수정'],
  ];
  const MAX_BYTES = 240 * 1024 * 1024;
  const MAX_ASSETS = 1000;
  const VECTOR_TYPES = new Set([
    'VECTOR',
    'BOOLEAN_OPERATION',
    'ELLIPSE',
    'LINE',
    'POLYGON',
    'STAR',
    'RECTANGLE',
  ]);
  const PROPERTIES = [
    'id',
    'name',
    'type',
    'visible',
    'opacity',
    'x',
    'y',
    'width',
    'height',
    'absoluteBoundingBox',
    'absoluteRenderBounds',
    'relativeTransform',
    'rotation',
    'layoutMode',
    'layoutWrap',
    'layoutSizingHorizontal',
    'layoutSizingVertical',
    'layoutAlign',
    'layoutGrow',
    'layoutPositioning',
    'constraints',
    'primaryAxisAlignItems',
    'counterAxisAlignItems',
    'primaryAxisSizingMode',
    'counterAxisSizingMode',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'itemSpacing',
    'counterAxisSpacing',
    'minWidth',
    'maxWidth',
    'minHeight',
    'maxHeight',
    'clipsContent',
    'fills',
    'strokes',
    'strokeWeight',
    'strokeAlign',
    'dashPattern',
    'effects',
    'blendMode',
    'isMask',
    'maskType',
    'cornerRadius',
    'topLeftRadius',
    'topRightRadius',
    'bottomLeftRadius',
    'bottomRightRadius',
    'cornerSmoothing',
    'characters',
    'fontName',
    'fontSize',
    'fontWeight',
    'lineHeight',
    'letterSpacing',
    'paragraphSpacing',
    'textAlignHorizontal',
    'textAlignVertical',
    'textAutoResize',
    'textCase',
    'textDecoration',
    'hasMissingFont',
    'textStyleId',
    'fillStyleId',
    'strokeStyleId',
    'effectStyleId',
    'gridStyleId',
    'boundVariables',
    'resolvedVariableModes',
    'explicitVariableModes',
    'componentProperties',
    'componentPropertyDefinitions',
    'variantProperties',
    'description',
    'exportSettings',
    'reactions',
    'overflowDirection',
    'layoutGrids',
  ];
  const STYLE_PROPERTIES = [
    'id',
    'name',
    'type',
    'key',
    'description',
    'remote',
    'paints',
    'effects',
    'fontName',
    'fontSize',
    'lineHeight',
    'letterSpacing',
    'paragraphSpacing',
    'textCase',
    'textDecoration',
    'layoutGrids',
    'boundVariables',
  ];
  let active = false;
  let cancelled = false;
  let session = null;
  let requestId = null;
  let cancelPending = null;

  function clean(value) {
    if (typeof value === 'symbol') return { mixed: true };
    if (value === undefined || typeof value === 'function') return undefined;
    if (Array.isArray(value)) return value.map(clean);
    if (value && typeof value === 'object') {
      const result = {};
      Object.keys(value).forEach(function (key) {
        const item = clean(value[key]);
        if (item !== undefined) result[key] = item;
      });
      return result;
    }
    return value;
  }

  function properties(source, keys) {
    const result = {};
    keys.forEach(function (key) {
      try {
        const value = clean(source[key]);
        if (value !== undefined) result[key] = value;
      } catch (error) {
        result[key] = { unavailable: String(error) };
      }
    });
    return result;
  }

  function safeName(value) {
    return (
      String(value)
        .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
        .slice(0, 70)
        .replace(/[. ]+$/g, '') || 'unnamed'
    );
  }

  function post(type, payload) {
    figma.ui.postMessage(
      Object.assign(
        { type: type, channel: CHANNEL, session: session, requestId: requestId },
        payload || {},
      ),
    );
  }

  function checkpoint() {
    if (cancelled) throw new Error('사용자가 추출을 중단했습니다.');
  }

  function waitFor(action, label) {
    checkpoint();
    post('progress', { text: label });
    return new Promise(function (resolve, reject) {
      let finished = false;
      let timer;
      function finish(error, value) {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        if (cancelPending === stop) cancelPending = null;
        if (error) reject(error);
        else resolve(value);
      }
      function stop() {
        finish(new Error('사용자가 추출을 중단했습니다.'));
      }
      cancelPending = stop;
      timer = setTimeout(function () {
        finish(new Error(label + ' · 20초 동안 응답이 없어 건너뜁니다.'));
      }, 20000);
      Promise.resolve()
        .then(action)
        .then(
          function (value) {
            finish(null, value);
          },
          function (error) {
            finish(error);
          },
        );
    });
  }

  function selectionSummary() {
    return Array.from(figma.currentPage.selection).map(function (node) {
      return {
        id: node.id,
        name: node.name,
        type: node.type,
        width: node.width,
        height: node.height,
      };
    });
  }

  function fileExtension(bytes) {
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e) return 'png';
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'jpg';
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'gif';
    if (bytes[0] === 0x52 && bytes[8] === 0x57 && bytes[9] === 0x45) return 'webp';
    return 'bin';
  }

  function walkPage(container, output) {
    Array.from(container.children || []).forEach(function (node) {
      if (node.type === 'SECTION' || node.type === 'GROUP') walkPage(node, output);
      else if (['FRAME', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE'].includes(node.type)) {
        output.push({ node: node });
      }
    });
  }

  async function targets(mode) {
    if (mode === 'orda') {
      const result = [];
      for (const target of TARGETS) {
        checkpoint();
        try {
          result.push({
            id: target[0],
            label: target[1],
            node: await waitFor(function () {
              return figma.getNodeByIdAsync(target[0]);
            }, '대상 확인 · ' + target[1]),
          });
        } catch (error) {
          result.push({ id: target[0], label: target[1], error: String(error) });
        }
      }
      return result;
    }
    if (mode === 'page') {
      await waitFor(function () {
        return figma.currentPage.loadAsync();
      }, '현재 페이지 화면을 확인하고 있습니다');
      const result = [];
      walkPage(figma.currentPage, result);
      return result;
    }
    if (mode !== 'selection') throw new Error('추출 범위를 다시 선택해주세요.');
    const selected = Array.from(figma.currentPage.selection);
    // A selected child is already included in a selected ancestor's export.
    const ids = new Set(
      selected.map(function (node) {
        return node.id;
      }),
    );
    return selected
      .filter(function (node) {
        let parent = node.parent;
        while (parent) {
          if (ids.has(parent.id)) return false;
          parent = parent.parent;
        }
        return true;
      })
      .map(function (node) {
        return { node: node };
      });
  }

  async function exportDesign(options) {
    const frames = [];
    const issues = [];
    const assetIndex = [];
    const imageCache = new Map();
    const rendered = new Set();
    const svgCache = new Map();
    const styles = new Map();
    const variables = new Map();
    const collections = new Map();
    const visited = new Set();
    let totalBytes = 0;
    let assetCount = 0;
    const inventory = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      // fileKey requires Figma private-plugin access; it is not needed for local export.
      file: { name: figma.root.name },
      exporterVersion: VERSION,
      scope: options.mode,
      options: { screenshots: true, assets: options.assets, screenshotScale: 1 },
      frames: frames,
      assets: assetIndex,
      issues: issues,
      complete: false,
      limitations: [
        '비파괴 시점별 추출입니다. 추출 중 디자인 편집을 멈춰주세요.',
        'SVG는 보이는 벡터와 작은 벡터 그룹을 자동 수집합니다. 목록으로 누락 여부를 검토하세요.',
        'OS 상태바·지도 이미지도 원본 확인용으로 포함됩니다. 웹 UI 구현용 사용 여부는 별도 판단합니다.',
        '변수는 참조된 것과 그 별칭을 수집합니다. 접근할 수 없는 원격 리소스는 issues에 기록합니다.',
      ],
    };

    function issue(node, kind, error) {
      issues.push({ nodeId: node ? node.id : null, kind: kind, message: String(error) });
    }

    function sendFile(path, data) {
      checkpoint();
      if (typeof data === 'string' ? !data.length : !data.byteLength) {
        throw new Error('빈 내보내기 파일: ' + path);
      }
      // JSON is UTF-16 in JS; this upper bound includes its UTF-8 conversion.
      totalBytes += typeof data === 'string' ? data.length * 3 : data.byteLength;
      if (totalBytes > MAX_BYTES)
        throw new Error('자료가 너무 큽니다. 화면을 나누어 추출해주세요 (240MB 기준).');
      post('file', { path: path, data: data });
    }

    function jsonFile(path, value) {
      sendFile(path, JSON.stringify(value, null, 2));
    }

    async function collectReferences(value) {
      checkpoint();
      if (!value || typeof value !== 'object') return;
      if (value.type === 'VARIABLE_ALIAS' && typeof value.id === 'string') {
        await variable(value.id);
      }
      for (const key of Object.keys(value)) {
        if (key.endsWith('StyleId') && typeof value[key] === 'string' && value[key]) {
          await style(value[key]);
        } else if (value[key] && typeof value[key] === 'object') {
          await collectReferences(value[key]);
        }
      }
    }

    async function style(id) {
      if (styles.has(id)) return;
      styles.set(id, { id: id, unavailable: true });
      try {
        const value = await waitFor(function () {
          return figma.getStyleByIdAsync(id);
        }, '스타일 읽기 · ' + id);
        if (!value) throw new Error('스타일을 찾을 수 없습니다: ' + id);
        const result = properties(value, STYLE_PROPERTIES);
        styles.set(id, result);
        await collectReferences(result);
      } catch (error) {
        checkpoint();
        issue(null, 'style', id + ': ' + String(error));
      }
    }

    async function variable(id) {
      if (variables.has(id)) return;
      variables.set(id, { id: id, unavailable: true });
      try {
        const value = await waitFor(function () {
          return figma.variables.getVariableByIdAsync(id);
        }, '변수 읽기 · ' + id);
        if (!value) throw new Error('변수를 찾을 수 없습니다.');
        const result = properties(value, [
          'id',
          'name',
          'key',
          'description',
          'remote',
          'resolvedType',
          'variableCollectionId',
          'valuesByMode',
          'scopes',
          'codeSyntax',
        ]);
        variables.set(id, result);
        const collectionId = value.variableCollectionId;
        if (collectionId && !collections.has(collectionId)) {
          collections.set(collectionId, { id: collectionId, unavailable: true });
          const collection = await waitFor(function () {
            return figma.variables.getVariableCollectionByIdAsync(collectionId);
          }, '변수 모드 읽기 · ' + collectionId);
          if (!collection) throw new Error('변수 컬렉션을 찾을 수 없습니다.');
          collections.set(
            collectionId,
            properties(collection, ['id', 'name', 'key', 'remote', 'modes', 'defaultModeId']),
          );
        }
        await collectReferences(result.valuesByMode);
      } catch (error) {
        checkpoint();
        issue(null, 'variable', id + ': ' + String(error));
      }
    }

    let metadataCount = 0;
    async function metadata(node) {
      checkpoint();
      metadataCount += 1;
      if (metadataCount % 25 === 0) {
        post('progress', {
          text: '디자인 속성 읽기 · 레이어 ' + metadataCount + '개 · ' + node.name,
        });
        await new Promise(function (resolve) {
          setTimeout(resolve, 0);
        });
        checkpoint();
      }
      const result = properties(node, PROPERTIES);
      if (node.type === 'TEXT') {
        try {
          result.styledTextSegments = clean(
            node.getStyledTextSegments([
              'fontName',
              'fontSize',
              'fontWeight',
              'fills',
              'textStyleId',
              'fillStyleId',
              'letterSpacing',
              'lineHeight',
              'textDecoration',
            ]),
          );
        } catch (error) {
          issue(node, 'text-segments', error);
        }
      }
      if (node.type === 'INSTANCE') {
        try {
          const component = await waitFor(function () {
            return node.getMainComponentAsync();
          }, '컴포넌트 읽기 · ' + node.name);
          result.mainComponent = component
            ? properties(component, ['id', 'name', 'key', 'remote'])
            : null;
        } catch (error) {
          checkpoint();
          issue(node, 'component', error);
        }
      }
      await collectReferences(result);
      if (node.children) {
        result.children = [];
        for (const child of node.children) result.children.push(await metadata(child));
      }
      return result;
    }

    async function asset(node, kind, create, key, extra) {
      const cache = kind === 'image' ? imageCache : svgCache;
      if (cache.has(key)) {
        assetIndex.push(
          Object.assign({ nodeId: node.id, kind: kind, path: cache.get(key) }, extra || {}),
        );
        return;
      }
      if (assetCount >= MAX_ASSETS) {
        issue(node, 'asset-limit', '에셋 1000개 제한. 화면을 나누어 다시 추출하세요.');
        return;
      }
      assetCount += 1;
      try {
        const exported = await waitFor(create, '에셋 추출 · ' + node.name + ' · ' + kind);
        const path = 'assets/' + kind + '/' + safeName(key) + '.' + exported.extension;
        sendFile(path, exported.bytes);
        cache.set(key, path);
        assetIndex.push(Object.assign({ nodeId: node.id, kind: kind, path: path }, extra || {}));
      } catch (error) {
        checkpoint();
        issue(node, kind, error);
      }
    }

    function paints(node) {
      const list = [];
      for (const key of ['fills', 'strokes']) {
        if (Array.isArray(node[key])) list.push.apply(list, node[key]);
      }
      if (node.type === 'TEXT' && node.fills === figma.mixed) {
        for (const segment of node.getStyledTextSegments(['fills'])) {
          if (Array.isArray(segment.fills)) list.push.apply(list, segment.fills);
        }
      }
      return list;
    }

    const pureCache = new Map();
    function isPureVector(node) {
      if (pureCache.has(node.id)) return pureCache.get(node.id);
      let result = VECTOR_TYPES.has(node.type);
      if (node.children && node.children.length) {
        result = node.children.every(function (child) {
          return isPureVector(child);
        });
      }
      if (
        paints(node).some(function (paint) {
          return paint.type === 'IMAGE' || paint.type === 'VIDEO';
        })
      ) {
        result = false;
      }
      pureCache.set(node.id, result);
      return result;
    }

    async function collectAssets(node, insideSvg, parentVisible) {
      checkpoint();
      const visible = parentVisible && node.visible !== false;
      if (!visible || visited.has(node.id)) return;
      visited.add(node.id);
      const list = paints(node).filter(function (paint) {
        return paint.type === 'IMAGE' && paint.imageHash && paint.visible !== false;
      });
      for (const paint of list) {
        await asset(
          node,
          'image',
          async function () {
            const image = figma.getImageByHash(paint.imageHash);
            if (!image) throw new Error('이미지 원본을 찾을 수 없습니다.');
            const bytes = await image.getBytesAsync();
            return { bytes: bytes, extension: fileExtension(bytes) };
          },
          paint.imageHash,
          { paint: clean(paint), width: node.width, height: node.height },
        );
      }
      // Keep both the original and the actual crop/mask used by the layer.
      if (list.length && !rendered.has(node.id)) {
        rendered.add(node.id);
        await asset(
          node,
          'rendered-image',
          async function () {
            return {
              bytes: await node.exportAsync({
                format: 'PNG',
                constraint: { type: 'SCALE', value: 1 },
              }),
              extension: 'png',
            };
          },
          node.id,
          { width: node.width, height: node.height },
        );
      }
      const svg =
        !insideSvg &&
        isPureVector(node) &&
        (VECTOR_TYPES.has(node.type) || (node.width <= 256 && node.height <= 256));
      if (svg) {
        await asset(
          node,
          'svg',
          async function () {
            return { bytes: await node.exportAsync({ format: 'SVG' }), extension: 'svg' };
          },
          node.id,
          { name: node.name, width: node.width, height: node.height },
        );
      }
      for (const child of node.children || []) {
        await collectAssets(child, insideSvg || svg, visible);
      }
    }

    try {
      const entries = await targets(options.mode);
      if (!entries.length)
        throw new Error('추출할 화면이 없습니다. Figma에서 화면 Frame을 선택해주세요.');
      for (let i = 0; i < entries.length; i += 1) {
        checkpoint();
        const entry = entries[i];
        const node = entry.node;
        post('progress', {
          text: i + 1 + ' / ' + entries.length + ' · ' + (node ? node.name : entry.label),
        });
        if (!node || typeof node.exportAsync !== 'function') {
          frames.push({ id: entry.id, requestedName: entry.label, status: 'missing' });
          issue(
            entry,
            'missing-node',
            entry.error || '노드가 없습니다. 복제본이면 현재 페이지 범위로 추출해주세요.',
          );
          continue;
        }
        let page = node.parent;
        while (page && page.type !== 'PAGE') page = page.parent;
        const stem = safeName(node.id) + '-' + safeName(node.name);
        const frame = {
          id: node.id,
          name: node.name,
          requestedName: entry.label || null,
          type: node.type,
          width: node.width,
          height: node.height,
          page: page ? { id: page.id, name: page.name } : null,
          screenshot: null,
          metadata: null,
          rest: null,
          status: 'partial',
        };
        frames.push(frame);
        const issueStart = issues.length;
        try {
          const bytes = await waitFor(function () {
            return node.exportAsync({
              format: 'PNG',
              constraint: { type: 'SCALE', value: 1 },
              contentsOnly: true,
              useAbsoluteBounds: true,
            });
          }, '화면 PNG 추출 · ' + node.name);
          sendFile('screens/' + stem + '.png', bytes);
          frame.screenshot = 'screens/' + stem + '.png';
        } catch (error) {
          checkpoint();
          issue(node, 'screenshot', error);
        }
        try {
          post('progress', { text: '디자인 속성 읽기 · ' + node.name });
          const tree = await metadata(node);
          jsonFile('frames/' + stem + '.json', tree);
          frame.metadata = 'frames/' + stem + '.json';
        } catch (error) {
          checkpoint();
          issue(node, 'metadata', error);
        }
        try {
          const rest = await waitFor(function () {
            return node.exportAsync({ format: 'JSON_REST_V1' });
          }, 'Figma 원본 JSON 추출 · ' + node.name);
          jsonFile('frames/' + stem + '.rest.json', rest);
          frame.rest = 'frames/' + stem + '.rest.json';
        } catch (error) {
          checkpoint();
          issue(node, 'rest-json', error);
        }
        if (options.assets) {
          try {
            await collectAssets(node, false, true);
          } catch (error) {
            checkpoint();
            issue(node, 'assets', error);
          }
        }
        frame.status = issues.length === issueStart ? 'exported' : 'partial';
      }
      inventory.complete = issues.length === 0;
    } catch (error) {
      issue(null, cancelled ? 'cancelled' : 'export', error);
    }

    // Always offer a diagnostic archive, even after partial failure/cancellation.
    cancelled = false;
    totalBytes = 0;
    jsonFile('tokens.json', {
      styles: Array.from(styles.values()),
      variables: Array.from(variables.values()),
      collections: Array.from(collections.values()),
    });
    jsonFile('inventory.json', inventory);
    sendFile(
      'READ-ME.txt',
      [
        'ORDA 디자인 원본 추출 자료',
        'inventory.json: Frame 크기, 원본 노드 ID, 결과 경로, 누락/실패 목록',
        'screens/: 원본 확인용 PNG (UI 전체를 이미지로 구현하는 용도가 아님)',
        'frames/: 전체 하위 레이어 속성 JSON 및 Figma REST 형식 JSON',
        'tokens.json: 참조된 스타일, 변수, 모드',
        'assets/: 원본 이미지, 크롭 이미지, 벡터 SVG',
        'inventory.complete는 추출 오류 여부만 뜻합니다. 디자인 검토 완료를 뜻하지 않습니다.',
        'SVG 자동 수집 결과, 누락/실패 목록 및 파일 출처를 확인한 뒤 구현하세요.',
        '지도 배경 이미지·OS 상태바는 웹 UI로 그대로 재현하지 않습니다.',
      ].join('\n'),
    );
    post('complete', {
      frames: frames.length,
      exported: frames.filter(function (frame) {
        return frame.status === 'exported';
      }).length,
      issues: issues.length,
    });
  }

  figma.showUI(__html__, { width: 460, height: 590, themeColors: true });
  figma.ui.onmessage = async function (message) {
    if (!message || message.channel !== CHANNEL || typeof message.session !== 'string') return;
    if (message.type === 'init' && !active) {
      session = message.session;
      post('ready', { version: VERSION, selection: selectionSummary() });
      return;
    }
    if (message.session !== session) return;
    if (message.type === 'selection' && !active) {
      post('selection', { selection: selectionSummary() });
      return;
    }
    if (message.type === 'cancel') {
      if (message.requestId !== requestId) return;
      cancelled = true;
      if (cancelPending) cancelPending();
      return;
    }
    if (message.type !== 'export' || active || typeof message.requestId !== 'string') return;
    active = true;
    requestId = message.requestId;
    cancelled = false;
    post('start', {
      mode: message.mode,
      selection: message.mode === 'selection' ? selectionSummary() : [],
    });
    try {
      await exportDesign({ mode: message.mode, assets: message.assets !== false });
    } catch (error) {
      post('error', { text: String(error) });
    } finally {
      active = false;
      requestId = null;
    }
  };
  figma.on('selectionchange', function () {
    if (session && !active) post('selection', { selection: selectionSummary() });
  });
})();
