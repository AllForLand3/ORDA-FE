import { expect, test } from '../fixtures/authenticatedTest';

const mockedVWorld = `
  let cameraChanged = () => {};
  let cameraTarget = [126.96, 37.44, 300];
  let cameraRange = 2000;

  window.Cesium = {
    Math: {
      toDegrees: value => value * 180 / Math.PI,
      toRadians: value => value * Math.PI / 180,
    },
    Cartesian3: {
      fromDegrees: (...values) => values,
      distance: () => cameraRange,
    },
    Cartesian2: class {
      constructor(x, y) {
        this.x = x;
        this.y = y;
      }
    },
    Cartographic: {
      fromDegrees: (longitude, latitude) => ({ longitude, latitude }),
    },
    HeadingPitchRange: class {
      constructor(heading, pitch, range) {
        this.range = range;
      }
    },
    Matrix4: { IDENTITY: {} },
    HeightmapTerrainData: class {
      constructor(options) {
        window.demTestHeights = options.buffer;
      }
    },
  };

  const radians = value => value * Math.PI / 180;

  window.ws3d = {
    viewer: {
      terrainProvider: {
        tilingScheme: {
          tileXYToRectangle: () => ({
            west: radians(126.95),
            south: radians(37.43),
            east: radians(126.97),
            north: radians(37.45),
          }),
        },
        requestTileGeometry: () =>
          Promise.reject(new Error('Original terrain was used inside DEM bounds')),
        getTileDataAvailable: () => false,
      },
      scene: {
        canvas: document.documentElement,
        globe: {
          getHeight: () => 300,
          pick: () => cameraTarget,
          ellipsoid: {
            cartesianToCartographic: point => ({
              longitude: radians(point[0]),
              latitude: radians(point[1]),
              height: point[2],
            }),
          },
        },
      },
      camera: {
        positionWC: {},
        frustum: { fovy: Math.PI / 3 },
        percentageChanged: 0.5,
        getPickRay: point => point,
        changed: {
          addEventListener(callback) {
            cameraChanged = callback;
            return () => {
              cameraChanged = () => {};
            };
          },
        },
        moveEnd: {
          addEventListener() {
            return () => {};
          },
        },
        lookAt(target, offset) {
          cameraTarget = target;
          cameraRange = offset.range;
          window.mapTestView = {
            center: target.slice(0, 2),
            range: cameraRange,
          };
          window.ws3d.viewer.terrainProvider.requestTileGeometry(0, 0, 0);
          setTimeout(() => cameraChanged(), 0);
        },
        lookAtTransform() {},
        flyTo: () =>
          window.ws3d.viewer.terrainProvider.requestTileGeometry(0, 0, 0),
      },
    },
  };

  window.vw = {
    Map: class {
      setOption() {}
      setMapId() {}
      start() {
        setTimeout(() => window.vw.ws3dInitCallBack(), 0);
      }
    },
    CameraPosition: class {},
    CoordZ: class {},
    Direction: class {},
  };
`;

async function mockVWorld(page: import('@playwright/test').Page) {
  await page.route('https://map.vworld.kr/js/webglMapInit.js.do?**', (route) =>
    route.fulfill({ body: mockedVWorld, contentType: 'application/javascript' }),
  );
}

test('VWorld 3D 지도에 관악산 DEM 고도를 적용한다', async ({ page }) => {
  await mockVWorld(page);
  await page.goto('/terrain-3d');
  await expect(page.getByRole('heading', { name: '관악산 3D 지도' })).toBeVisible();

  const frame = page.frameLocator('iframe[title="VWorld 관악산 3D 지도"]');

  if ((await page.locator('iframe[title="VWorld 관악산 3D 지도"]').count()) === 0) {
    await expect(page.getByRole('alert')).toContainText('VWorld API 키가 설정되지 않았습니다.');
    return;
  }

  await expect(frame.locator('body')).toHaveAttribute('data-dem-ready', 'true', {
    timeout: 30_000,
  });
  await expect(page.getByText('관악산 DEM 적용')).toBeVisible();
  await expect(page.getByText('19–618 m')).toBeVisible();

  const heights = await frame.locator('body').evaluate(() => {
    const buffer = (window as Window & { demTestHeights?: Float32Array }).demTestHeights;
    return buffer ? [buffer.length, Math.min(...buffer), Math.max(...buffer)] : null;
  });

  expect(heights).not.toBeNull();
  expect(heights?.[0]).toBe(33 * 33);
  expect(heights?.[1]).toBeGreaterThan(0);
  expect(heights?.[2]).toBeLessThan(700);
});

test('같은 페이지에서 3D로 전환하고 이동한 위치와 축척을 2D에 유지한다', async ({ page }) => {
  await mockVWorld(page);
  await page.goto('/tests/fixtures/map-page-layout.html');
  await page.context().grantPermissions(['geolocation']);
  await page.context().setGeolocation({ longitude: 127.03, latitude: 37.51 });
  await page.getByRole('button', { name: '현재 위치로 이동', exact: true }).click();

  const surface = page.locator('.orda-map-layout__map-surface');

  await expect(surface).toHaveAttribute('data-map-center', '127.030000,37.510000');
  const zoom = await surface.getAttribute('data-map-zoom');

  await page.getByRole('button', { name: '3D 지도 보기', exact: true }).click();

  await expect(page).toHaveURL(/map-page-layout.html$/);
  await expect(page.getByRole('heading', { name: '지도 작업 패널' })).toBeVisible();

  const frame = page.frameLocator('iframe[title="VWorld 3D 지도"]');

  await expect(page.locator('.orda-inline-terrain')).toHaveAttribute('aria-busy', 'false', {
    timeout: 30_000,
  });
  await expect(surface).toHaveAttribute('data-map-center', '127.030000,37.510000');
  await expect(surface).toHaveAttribute('data-map-zoom', zoom ?? '15');
  await expect(page.getByRole('button', { name: '3D 지도 보기', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  // SDK 카메라 이동을 재현하여 실제 위치 연동 코드를 검증한다.
  await frame.locator('body').evaluate(() => {
    const viewer = window.ws3d?.viewer;
    const cesium = window.Cesium;

    if (!viewer || !cesium) throw Error('Missing SDK');

    const range =
      (((156543.03392804097 * Math.cos((37.53 * Math.PI) / 180)) / 2 ** 14.5) *
        document.documentElement.clientHeight) /
      (2 * Math.tan(Math.PI / 6));

    viewer.camera.lookAt(
      cesium.Cartesian3.fromDegrees(127.05, 37.53, 300),
      new cesium.HeadingPitchRange(0, -1, range),
    );
  });

  await expect(surface).toHaveAttribute('data-map-center', '127.050000,37.530000');
  await expect(surface).toHaveAttribute('data-map-zoom', '14.5');

  await page.getByRole('button', { name: '위성지도 보기', exact: true }).click();

  await expect(page.locator('.ol-viewport')).toBeVisible();
  await expect(page.locator('iframe')).toHaveCount(0);
  await expect(surface).toHaveAttribute('data-map-base-layer', 'satellite');
  await expect(surface).toHaveAttribute('data-map-center', '127.050000,37.530000');
  await expect(surface).toHaveAttribute('data-map-zoom', '14.5');
});

test('모바일에서 3D 로딩 중 복귀와 오류 후 재시도가 가능하다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  let fail = true;

  await page.route('https://map.vworld.kr/js/webglMapInit.js.do?**', (route) =>
    route.fulfill({
      body: fail ? '' : mockedVWorld,
      contentType: 'application/javascript',
    }),
  );

  await page.goto('/tests/fixtures/map-page-layout.html');

  const surface = page.locator('.orda-map-layout__map-surface');
  const center = await surface.getAttribute('data-map-center');

  await page.getByRole('button', { name: '3D 지도 보기', exact: true }).click();
  await page.getByRole('button', { name: '일반지도 보기', exact: true }).click();

  await expect(page.locator('iframe')).toHaveCount(0);
  await expect(page.locator('.ol-viewport')).toBeVisible();

  await page.getByRole('button', { name: '3D 지도 보기', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible({ timeout: 30_000 });

  fail = false;

  await page.getByRole('button', { name: '다시 시도', exact: true }).click();

  await expect(page.locator('.orda-inline-terrain')).toHaveAttribute('aria-busy', 'false', {
    timeout: 30_000,
  });
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(surface).toHaveAttribute('data-map-center', center ?? '');

  const switcher = await page.getByRole('group', { name: '배경지도 선택' }).boundingBox();

  expect(switcher?.x).toBeGreaterThanOrEqual(0);
  expect((switcher?.x ?? 0) + (switcher?.width ?? 0)).toBeLessThanOrEqual(390);
});