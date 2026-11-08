import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import type { TerrainGrid } from '../loadGwanakDem';

interface Terrain3DCanvasProps {
  exaggeration: number;
  onError: (message: string) => void;
  terrain: TerrainGrid;
}

const METERS_PER_UNIT = 100;
const SUMMIT = [126.96444, 37.44472] as const;
const COLOR_STOPS = [
  new THREE.Color('#244f40'),
  new THREE.Color('#63865b'),
  new THREE.Color('#b1ad72'),
  new THREE.Color('#a49171'),
  new THREE.Color('#e6ded0'),
];

function terrainColor(elevationM: number, minM: number, maxM: number): THREE.Color {
  const position = ((elevationM - minM) / Math.max(1, maxM - minM)) * (COLOR_STOPS.length - 1);
  const lower = Math.min(COLOR_STOPS.length - 2, Math.floor(position));
  return COLOR_STOPS[lower].clone().lerp(COLOR_STOPS[lower + 1], position - lower);
}

function createTerrainGeometry(terrain: TerrainGrid) {
  const { width, height, elevations, bounds, minElevationM, maxElevationM } = terrain;
  const [west, south, east, north] = bounds;
  const midLatitude = ((south + north) / 2) * (Math.PI / 180);
  const widthUnits = ((east - west) * 111_320 * Math.cos(midLatitude)) / METERS_PER_UNIT;
  const depthUnits = ((north - south) * 111_320) / METERS_PER_UNIT;
  const positions = new Float32Array(width * height * 3);
  const colors = new Float32Array(width * height * 3);
  const indices: number[] = [];

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const index = row * width + col;
      const elevation = elevations[index];
      const offset = index * 3;
      positions[offset] = (col / (width - 1) - 0.5) * widthUnits;
      positions[offset + 1] = Number.isFinite(elevation)
        ? (elevation - minElevationM) / METERS_PER_UNIT
        : 0;
      positions[offset + 2] = (row / (height - 1) - 0.5) * depthUnits;

      const color = Number.isFinite(elevation)
        ? terrainColor(elevation, minElevationM, maxElevationM)
        : new THREE.Color('#000000');
      color.toArray(colors, offset);
    }
  }

  for (let row = 0; row < height - 1; row += 1) {
    for (let col = 0; col < width - 1; col += 1) {
      const a = row * width + col;
      const b = a + 1;
      const c = a + width;
      const d = c + 1;
      if ([a, b, c].every((index) => Number.isFinite(elevations[index]))) {
        indices.push(a, c, b);
      }
      if ([b, c, d].every((index) => Number.isFinite(elevations[index]))) {
        indices.push(b, c, d);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const summitCol = Math.round(((SUMMIT[0] - west) / (east - west)) * (width - 1));
  const summitRow = Math.round(((north - SUMMIT[1]) / (north - south)) * (height - 1));
  const summitIndex = summitRow * width + summitCol;
  const summitPosition = new THREE.Vector3(
    positions[summitIndex * 3],
    positions[summitIndex * 3 + 1],
    positions[summitIndex * 3 + 2],
  );

  return { geometry, summitPosition };
}

export function Terrain3DCanvas({ exaggeration, onError, terrain }: Terrain3DCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terrainMeshRef = useRef<THREE.Mesh | null>(null);
  const summitMarkerRef = useRef<THREE.Mesh | null>(null);
  const summitHeightRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch {
      onError('이 브라우저에서 3D 지도를 시작할 수 없습니다. WebGL 설정을 확인해 주세요.');
      return undefined;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor('#dce7e2');
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
    const initialAspect = container.clientWidth / Math.max(1, container.clientHeight);
    const initialDistance = Math.max(1, Math.min(1.6, 0.95 / initialAspect));
    camera.position.set(55 * initialDistance, 55 * initialDistance, 85 * initialDistance);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.minDistance = 25;
    controls.maxDistance = 220;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;
    controls.target.set(0, 5, 0);
    controls.update();

    scene.add(new THREE.AmbientLight('#ffffff', 2));
    const sunlight = new THREE.DirectionalLight('#fff5df', 2.4);
    sunlight.position.set(-30, 70, -40);
    scene.add(sunlight);

    const { geometry, summitPosition } = createTerrainGeometry(terrain);
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.y = 1;
    scene.add(mesh);
    terrainMeshRef.current = mesh;

    const markerGeometry = new THREE.SphereGeometry(0.8, 16, 12);
    const markerMaterial = new THREE.MeshBasicMaterial({ color: '#f4b94c' });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    summitHeightRef.current = summitPosition.y;
    marker.position.set(summitPosition.x, summitPosition.y + 1.5, summitPosition.z);
    scene.add(marker);
    summitMarkerRef.current = marker;

    const updateSize = () => {
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);
    updateSize();

    renderer.setAnimationLoop(() => {
      controls.update();
      renderer.render(scene, camera);
    });

    return () => {
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect();
      controls.dispose();
      geometry.dispose();
      material.dispose();
      markerGeometry.dispose();
      markerMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      terrainMeshRef.current = null;
      summitMarkerRef.current = null;
    };
  }, [terrain, onError]);

  useEffect(() => {
    const mesh = terrainMeshRef.current;
    const marker = summitMarkerRef.current;
    if (mesh) mesh.scale.y = exaggeration;
    if (marker) marker.position.y = summitHeightRef.current * exaggeration + 1.5;
  }, [exaggeration]);

  return (
    <div
      aria-label="관악산 DEM 3D 지형"
      className="terrain-3d__canvas"
      ref={containerRef}
      role="img"
    />
  );
}
