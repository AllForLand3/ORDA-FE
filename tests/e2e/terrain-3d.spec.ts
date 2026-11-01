import { expect, test } from '@playwright/test';

const mockedVWorld = `
  window.Cesium = {
    Math: { toDegrees: value => value * 180 / Math.PI, toRadians: value => value * Math.PI / 180 },
    Cartesian3: { fromDegrees: (...values) => values },
    HeightmapTerrainData: class { constructor(options) { window.demTestHeights = options.buffer; } },
  };
  const radians = value => value * Math.PI / 180;
  window.ws3d = {
    viewer: {
      terrainProvider: {
        tilingScheme: {
          tileXYToRectangle: () => ({ west: radians(126.95), south: radians(37.43), east: radians(126.97), north: radians(37.45) }),
        },
        requestTileGeometry: () => Promise.reject(new Error('Original terrain was used inside DEM bounds')),
        getTileDataAvailable: () => false,
      },
      camera: {
        flyTo: () => window.ws3d.viewer.terrainProvider.requestTileGeometry(0, 0, 0),
      },
    },
  };
  window.vw = {
    Map: class {
      setOption() {}
      setMapId() {}
      start() { setTimeout(() => window.vw.ws3dInitCallBack(), 0); }
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

test('2D 지도에서 3D 지도로 이동하고 원래 화면으로 돌아간다', async ({ page }) => {
  await mockVWorld(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/mountains');
  const terrainLink = page.getByRole('link', { name: '관악산 3D 지도 보기' });
  const mapTypeBox = await page.getByRole('group', { name: '배경지도 선택' }).boundingBox();
  const terrainBox = await terrainLink.boundingBox();
  const panel = await page.getByRole('complementary', { name: '산 선택 패널' }).boundingBox();
  if (!mapTypeBox || !terrainBox || !panel) throw new Error('지도 컨트롤 또는 패널이 없습니다.');
  expect(terrainBox.y).toBeGreaterThanOrEqual(mapTypeBox.y + mapTypeBox.height);
  expect(terrainBox.y + terrainBox.height).toBeLessThanOrEqual(panel.y);
  await terrainLink.click();

  await expect(page).toHaveURL(/\/terrain-3d\?from=/);
  await expect(page.getByRole('heading', { name: '관악산 3D 지도' })).toBeVisible();
  await page.getByRole('link', { name: '2D 지도로 돌아가기' }).click();

  await expect(page).toHaveURL('/mountains');
  await expect(page.locator('.orda-map-layout__map-surface')).toHaveAttribute(
    'data-map-ready',
    'true',
  );
});
