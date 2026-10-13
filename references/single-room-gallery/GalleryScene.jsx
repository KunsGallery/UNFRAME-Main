import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { placementFor, wallAdjustmentLimits, layoutFor } from './gallery-model';
import { readAsset } from './gallery-storage';
import { beamAlphaAt } from './beam-mask';

// Shared sRGB approximation of 6000 K; all room and artwork lights use this one preset.
function colorAtKelvin(kelvin) {
  const temperature = kelvin / 100;
  const red = temperature <= 66 ? 255 : 329.7 * (temperature - 60) ** -0.1332;
  const green = temperature <= 66 ? 99.47 * Math.log(temperature) - 161.12 : 288.12 * (temperature - 60) ** -0.0755;
  const blue = temperature >= 66 ? 255 : temperature <= 19 ? 0 : 138.52 * Math.log(temperature - 10) - 305.04;
  const channel = (value) => THREE.MathUtils.clamp(value, 0, 255) / 255;
  return new THREE.Color().setRGB(channel(red), channel(green), channel(blue), THREE.SRGBColorSpace);
}
const WHITE_6000K = colorAtKelvin(6000);
function createBeamPoolMask(shape) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  const image = context.createImageData(canvas.width, canvas.height);
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const nx = (x - 127.5) / 127.5;
      const ny = (y - 127.5) / 127.5;
      const alpha = beamAlphaAt(shape, nx, ny);
      const index = (y * canvas.width + x) * 4;
      image.data[index] = 255;
      image.data[index + 1] = 255;
      image.data[index + 2] = 255;
      image.data[index + 3] = alpha;
    }
  }
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

function addBox(parent, color, width, height, depth, x, y, z, extras = {}) {
  const material = color instanceof THREE.Material ? color : new THREE.MeshStandardMaterial({ color, roughness: 0.86, ...extras });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function makeExhibitionPlaque(title, artist, description) {
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 760;
  const context = canvas.getContext('2d');
  context.fillStyle = '#f3f0e8';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = '#b9b3a8';
  context.lineWidth = 3;
  context.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);
  context.textAlign = 'left';
  context.fillStyle = '#3456d1';
  context.font = '700 23px Arial, sans-serif';
  context.fillText('U.A.U APPROVED ARTIST', 66, 82);
  context.fillStyle = '#24231f';
  let titleSize = 61;
  context.font = `500 ${titleSize}px "Noto Serif KR", serif`;
  while (context.measureText(title || '전시 서문').width > 820 && titleSize > 38) {
    titleSize -= 2;
    context.font = `500 ${titleSize}px "Noto Serif KR", serif`;
  }
  context.fillText(title || '전시 서문', 66, 190, 820);
  context.fillStyle = '#4b5fb1';
  context.font = '500 31px "Noto Serif KR", serif';
  context.fillText(artist || '작가명', 66, 250, 820);
  context.strokeStyle = '#b9b3a8';
  context.lineWidth = 2;
  context.beginPath(); context.moveTo(66, 292); context.lineTo(894, 292); context.stroke();

  const copy = (description || '작가와 작품을 소개합니다.').replace(/\s+/g, ' ').trim();
  context.fillStyle = '#514e47';
  context.font = '29px "Noto Sans KR", Arial, sans-serif';
  const lines = [];
  let line = '';
  for (const character of copy) {
    if (context.measureText(line + character).width > 820 && line) {
      lines.push(line);
      line = character;
    } else line += character;
  }
  if (line) lines.push(line);
  const visibleLines = lines.slice(0, 7);
  if (lines.length > visibleLines.length) visibleLines[visibleLines.length - 1] = `${visibleLines.at(-1).slice(0, -2)}…`;
  visibleLines.forEach((text, index) => context.fillText(text, 66, 355 + index * 43));

  context.strokeStyle = '#b9b3a8';
  context.beginPath(); context.moveTo(66, 650); context.lineTo(894, 650); context.stroke();
  context.fillStyle = '#24231f';
  context.font = '600 30px Arial, sans-serif';
  context.fillText('U · A · U', 66, 704);
  context.fillStyle = '#777168';
  context.font = '500 17px Arial, sans-serif';
  context.fillText('UNFRAME ARTIST UNIT', 245, 702);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export const GalleryScene = forwardRef(function GalleryScene({ layoutId = 'two-room', longWindow = false, ceiling, lighting, onRoomChange, onArtworkClick, works, previewWork, exhibitionTitle, artistName, exhibitionDescription }, ref) {
  const mount = useRef(null);
  const api = useRef({});
  const callbacks = useRef({ onRoomChange, onArtworkClick, works, exhibitionTitle, artistName, exhibitionDescription });
  const worksState = useRef(works);
  const ceilingState = useRef(ceiling);
  const lightingState = useRef(lighting);
  callbacks.current = { onRoomChange, onArtworkClick, works, exhibitionTitle, artistName, exhibitionDescription };
  worksState.current = works;

  useImperativeHandle(ref, () => ({
    goToRoom: (room) => api.current.goToRoom?.(room),
    moveForward: () => api.current.moveForward?.(),
    moveBackward: () => api.current.moveBackward?.(),
    turn: (direction) => api.current.turn?.(direction),
    setWorks: (items) => api.current.setWorks?.(items),
    previewWork: (work) => api.current.previewWork?.(work),
  }), []);

  useEffect(() => { ceilingState.current = ceiling; api.current.updateEnvironment?.(); }, [ceiling]);
  useEffect(() => { lightingState.current = lighting; api.current.updateEnvironment?.(); }, [lighting]);
  useEffect(() => { api.current.setWorks?.(works); }, [works]);
  useEffect(() => {
    if (previewWork) api.current.previewWork?.(previewWork);
    else works.forEach((work) => api.current.previewWork?.(work));
  }, [previewWork, works]);
  useEffect(() => { api.current.setExhibitionInfo?.(exhibitionTitle, artistName, exhibitionDescription); }, [exhibitionTitle, artistName, exhibitionDescription]);

  useEffect(() => {
    const host = mount.current;
    const layout = layoutFor(layoutId), { width, depth, centers } = layout;
    const windowed = layout.id === 'single-long' && longWindow;
    const single = centers.length === 1, sx = width / 12, sz = depth / 15;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe6e3db);
    scene.fog = new THREE.Fog(0xe6e3db, 20, 38);
    const camera = new THREE.PerspectiveCamera(62, 1, 0.05, 65);
    camera.position.set(0, 1.65, 6);
    const target = new THREE.Vector3(0, 1.65, 6);
    let yaw = 0;
    let targetYaw = 0;
    let pitch = 0;
    let targetPitch = 0;
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const beamPoolMasks = { circle: createBeamPoolMask('circle'), square: createBeamPoolMask('square') };
    host.appendChild(renderer.domElement);

    const textureLoader = new THREE.TextureLoader();
    const surfaceTexture = (path, repeatX, repeatY) => {
      const texture = textureLoader.load(path);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.MirroredRepeatWrapping;
      texture.wrapT = THREE.MirroredRepeatWrapping;
      texture.repeat.set(repeatX, repeatY);
      texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
      return texture;
    };
    // Shared deterministic material maps; no per-exhibition baked lighting.
    const materialTexture = (kind, repeatX = 1, repeatY = 1) => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
      const context = canvas.getContext('2d');
      const pixels = context.createImageData(256, 256);
      let seed = 12345;
      const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
        const i = (y * 256 + x) * 4;
        const noise = (random() - .5);
        const grain = Math.sin(y * .8 + Math.sin(x * .03) * 2) * 5 + Math.sin(y * 2.3 + x * .012) * 3;
        const mottling = Math.sin(x * .042) * Math.cos(y * .05) * 7;
        const base = kind === 'wood' ? [151, 133, 104] : kind === 'paving' ? [160, 161, 151] : kind === 'concrete' ? [177, 174, 161] : [205, 204, 195];
        const variation = kind === 'wood' ? grain + noise * 12 : kind === 'paving' ? noise * 45 : kind === 'concrete' ? mottling + noise * 13 : noise * 2 + mottling * .08;
        for (let c = 0; c < 3; c++) pixels.data[i + c] = base[c] + variation;
        pixels.data[i + 3] = 255;
      }
      context.putImageData(pixels, 0, 0);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(repeatX, repeatY);
      texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
      return texture;
    };
    const floorTexture = materialTexture('urethane', 4, 5);
    const wallTexture = surfaceTexture('/textures/wall-plaster.webp', 2, 1.4);
    const diffuserTexture = surfaceTexture('/textures/ceiling-diffuser.webp', 2, 2);
    const skyTexture = textureLoader.load('/textures/glass-sky.webp');
    skyTexture.colorSpace = THREE.SRGBColorSpace;
    const floorMaterial = new THREE.MeshPhysicalMaterial({ map: floorTexture, bumpMap: floorTexture, bumpScale: .00035, roughness: .31, metalness: 0, clearcoat: .28, clearcoatRoughness: .36 });
    const wallMaterial = new THREE.MeshStandardMaterial({ map: wallTexture, bumpMap: wallTexture, bumpScale: 0.009, roughness: 0.93 });
    const diffuserMaterial = new THREE.MeshStandardMaterial({ map: diffuserTexture, emissive: WHITE_6000K, emissiveMap: diffuserTexture, emissiveIntensity: 0.42, roughness: 1 });

    const architectural = new THREE.Group();
    const floors = [];
    const solidCeilings = [];
    scene.add(architectural);
    const contactCanvas = document.createElement('canvas'); contactCanvas.width = 64; contactCanvas.height = 2;
    const contactContext = contactCanvas.getContext('2d');
    const contactGradient = contactContext.createLinearGradient(0, 0, 64, 0);
    contactGradient.addColorStop(0, '#ffffff'); contactGradient.addColorStop(.35, '#666666'); contactGradient.addColorStop(1, '#000000');
    contactContext.fillStyle = contactGradient; contactContext.fillRect(0, 0, 64, 2);
    const contactMap = new THREE.CanvasTexture(contactCanvas);
    const contactMaterial = new THREE.MeshBasicMaterial({ color: 0x302e27, alphaMap: contactMap, transparent: true, opacity: .22, depthWrite: false });
    const contactStrip = (x, z, length, rotation = 0, breadth = .28, height = -.016) => {
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(breadth, length), contactMaterial);
      strip.rotation.set(-Math.PI / 2, 0, rotation); strip.position.set(x, height, z); architectural.add(strip);
    };
    // Shared materials and fixtures, sized to the selected room layout.
    for (const z of centers) {
      const floor = addBox(architectural, floorMaterial, width, 0.12, depth, 0, -0.08, z);
      floor.receiveShadow = true;
      floor.userData.floor = true;
      floors.push(floor);
      contactStrip(-width / 2 + .14, z, depth);
      if (!windowed) contactStrip(width / 2 - .14, z, depth, Math.PI);
      contactStrip(0, z - depth / 2 + .14, width, Math.PI / 2);
      contactStrip(0, z + depth / 2 - .14, width, -Math.PI / 2);
      addBox(architectural, wallMaterial, 0.15, 5, depth, -width / 2, 2.5, z);
      if (!windowed) addBox(architectural, wallMaterial, 0.15, 5, depth, width / 2, 2.5, z);
      else {
        const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x343a36, roughness: .68 });
        const glass = new THREE.MeshPhysicalMaterial({ color: 0xf1f4ef, transparent: true, opacity: .055, roughness: .08, metalness: .02, side: THREE.DoubleSide, depthWrite: false });
        const pane = new THREE.Mesh(new THREE.BoxGeometry(.018, 4.88, depth - .12), glass);
        pane.position.set(width / 2, 2.46, z); architectural.add(pane);
        for (const offset of [-depth / 2, -depth / 3, -depth / 6, 0, depth / 6, depth / 3, depth / 2]) {
          const mullion = addBox(architectural, frameMaterial, .075, 4.98, .045, width / 2, 2.47, z + offset);
          mullion.castShadow = true;
        }
        addBox(architectural, frameMaterial, .085, .055, depth, width / 2, 4.94, z);
        addBox(architectural, frameMaterial, .07, .025, depth, width / 2, -.023, z);
        // A flush linear grate gives the glazing a real architectural junction.
        addBox(architectural, frameMaterial, .19, .016, depth, width / 2 - .14, -.025, z);
        for (let offset = -depth / 2; offset < depth / 2; offset += .075) {
          addBox(architectural, 0x747770, .165, .008, .014, width / 2 - .14, -.014, z + offset);
        }
        // Actual horizontal paving and an inset planter anchor the exterior.
        const pavingTexture = materialTexture('paving', 4, 18);
        const pavingMaterial = new THREE.MeshStandardMaterial({ map: pavingTexture, bumpMap: pavingTexture, bumpScale: .018, roughness: .95 });
        const paving = addBox(architectural, pavingMaterial, 4.1, .1, depth + .3, width / 2 + 2.05, -.08, z);
        paving.receiveShadow = true;
        for (let offset = -depth / 2; offset <= depth / 2; offset += .75) {
          addBox(architectural, 0x93958b, 2.25, .003, .012, width / 2 + 1.125, -.027, z + offset);
        }
        addBox(architectural, 0x93958b, .012, .003, depth, width / 2 + 1.125, -.027, z);
        const concreteTexture = materialTexture('concrete', 4, 1);
        const planterMaterial = new THREE.MeshStandardMaterial({ map: concreteTexture, bumpMap: concreteTexture, bumpScale: .012, roughness: .94 });
        const planter = addBox(architectural, planterMaterial, .78, .48, depth + .15, width / 2 + 2.65, .21, z);
        planter.castShadow = true; planter.receiveShadow = true;
        contactStrip(width / 2 + 2.17, z, depth, Math.PI, .18, -.026);
        addBox(architectural, 0x343e2d, .66, .035, depth, width / 2 + 2.65, .46, z);
        // Shared instanced foliage has real volume and parallax, without models.
        const hedge = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 7, 5), new THREE.MeshStandardMaterial({ color: 0x5b6b44, roughness: 1 }), 120);
        const leaf = new THREE.InstancedMesh(new THREE.SphereGeometry(.035, 5, 3), new THREE.MeshStandardMaterial({ color: 0x9bad81, roughness: 1 }), 14000);
        const plantTransform = new THREE.Object3D();
        let gardenSeed = 37;
        const gardenRandom = () => { gardenSeed = (gardenSeed * 1664525 + 1013904223) >>> 0; return gardenSeed / 4294967296; };
        for (let i = 0; i < 120; i++) {
          plantTransform.position.set(width / 2 + 2.65 + (gardenRandom() - .5) * .35, .72 + gardenRandom() * .14, z - depth / 2 + (i / 119) * depth);
          plantTransform.scale.set(.3, .25, .34); plantTransform.rotation.set(0, 0, 0); plantTransform.updateMatrix(); hedge.setMatrixAt(i, plantTransform.matrix);
        }
        for (let i = 0; i < 14000; i++) {
          plantTransform.position.set(width / 2 + 2.65 + (gardenRandom() - .5) * .88, .52 + gardenRandom() * .51, z - depth / 2 + gardenRandom() * depth);
          plantTransform.scale.set(.7 + gardenRandom() * .6, .25, .6 + gardenRandom() * .6);
          plantTransform.rotation.set(gardenRandom() * Math.PI, gardenRandom() * Math.PI, gardenRandom() * Math.PI);
          plantTransform.updateMatrix(); leaf.setMatrixAt(i, plantTransform.matrix);
          leaf.setColorAt(i, new THREE.Color().setHSL(.22 + gardenRandom() * .06, .18 + gardenRandom() * .12, .2 + gardenRandom() * .14));
        }
        hedge.castShadow = true; hedge.receiveShadow = true; leaf.castShadow = true; leaf.receiveShadow = true;
        architectural.add(hedge, leaf);
        // Side returns conceal backdrop edges and enclose the shallow courtyard.
        for (const side of [-1, 1]) {
          addBox(architectural, side === 1 ? 0x827865 : wallMaterial, 4.15, 5, .12, width / 2 + 2.075, 2.45, z + side * depth / 2);
        }
        const timberTexture = materialTexture('wood', 3, 1);
        const timberMaterial = new THREE.MeshStandardMaterial({ map: timberTexture, bumpMap: timberTexture, bumpScale: .013, roughness: .82 });
        for (let y = .05; y < 4.95; y += .17) {
          addBox(architectural, timberMaterial, 4.08, .145, .04, width / 2 + 2.04, y, z + depth / 2 - .08);
        }
        const forestTexture = textureLoader.load('/textures/long-gallery-woodland-v1.webp');
        forestTexture.colorSpace = THREE.SRGBColorSpace;
        forestTexture.wrapS = THREE.MirroredRepeatWrapping; forestTexture.repeat.x = 1.5;
        forestTexture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
        const view = new THREE.Mesh(new THREE.PlaneGeometry(48, 16), new THREE.MeshBasicMaterial({ map: forestTexture, color: new THREE.Color(1.35, 1.35, 1.3), side: THREE.DoubleSide, toneMapped: false, fog: false }));
        view.rotation.y = -Math.PI / 2;
        view.position.set(width / 2 + 4.12, 1, z); architectural.add(view);
      }
    }
    addBox(architectural, wallMaterial, width, 5, 0.16, 0, 2.5, centers[0] + depth / 2);
    addBox(architectural, wallMaterial, width, 5, 0.16, 0, 2.5, centers[centers.length - 1] - depth / 2);
    if (!single) {
      addBox(architectural, wallMaterial, 4.2, 5, 0.16, -3.9, 2.5, -5);
      addBox(architectural, wallMaterial, 4.2, 5, 0.16, 3.9, 2.5, -5);
      // Keep the opening clear: a slim 24 cm reveal instead of bulky deep piers.
      addBox(architectural, wallMaterial, 3.6, 1.35, 0.24, 0, 4.325, -5.08);
      for (const x of [-1.8, 1.8]) addBox(architectural, wallMaterial, 0.1, 3.65, 0.24, x, 1.825, -5.08);
    }
    // Tracks are fixed architecture; each artwork gets its own aimed head below.
    for (const z of centers) {
      for (const x of [-width / 2 + 1.15, width / 2 - 1.15]) {
        addBox(architectural, 0xa6a49e, 0.045, 0.045, depth - 2.5, x, 4.77, z);
      }
    }
    if (!single) {
      addBox(architectural, 0x9d907b, 1.7, 0.08, 0.6, 0, 0.64, -16.2);
      for (const x of [-0.71, 0.71]) addBox(architectural, 0x978a77, 0.09, 0.56, 0.48, x, 0.32, -16.2);
    }
    for (const z of centers) {
      addBox(architectural, 0xc8c3ba, width, 0.045, 0.045, 0, 0.12, z - depth / 2 + .1);
      solidCeilings.push(addBox(architectural, 0xeeeae1, width, 0.06, depth, 0, 4.97, z));
    }

    const ceilingGroups = {};
    for (const kind of ['luminous', 'plain', 'glass']) {
      const group = new THREE.Group();
      scene.add(group);
      ceilingGroups[kind] = group;
      for (const z of centers) {
        if (kind === 'luminous') {
          const panelZ = z - 2.1 * sz;
          addBox(group, diffuserMaterial, 7 * sx, 0.035, 7.6 * sz, 0, 4.91, panelZ);
          for (const x of [-3.55 * sx, 0, 3.55 * sx]) addBox(group, 0xbcbab4, 0.075, 0.065, 7.68 * sz, x, 4.87, panelZ);
          for (const edge of [-3.82 * sz, 0, 3.82 * sz]) addBox(group, 0xbcbab4, 7.15 * sx, 0.065, 0.075, 0, 4.87, panelZ + edge);
        } else if (kind === 'plain') {
          addBox(group, wallMaterial, width - .2, 0.035, depth - .2, 0, 4.91, z);
          for (const x of [-3.6 * sx, 0, 3.6 * sx]) addBox(group, 0xd3d1cc, 0.04, 0.03, depth - 2, x, 4.87, z);
        } else {
          // A real opening in the roof: a sky image above low-opacity glass,
          // with fixed mullions that cast daylight shadows on the floor.
          for (const x of [-5.4 * sx, 5.4 * sx]) addBox(group, 0xeeeae1, 1.2 * sx, 0.08, depth, x, 4.97, z);
          for (const offset of [-6.75 * sz, 6.75 * sz]) addBox(group, 0xeeeae1, 9.6 * sx, 0.08, 1.5 * sz, 0, 4.97, z + offset);
          const sky = new THREE.Mesh(new THREE.PlaneGeometry(9.5 * sx, 11.9 * sz), new THREE.MeshBasicMaterial({ map: skyTexture, side: THREE.DoubleSide, toneMapped: false }));
          sky.rotation.x = Math.PI / 2;
          sky.position.set(0, 5.35, z);
          group.add(sky);
          addBox(group, 0xeaf4f6, 9.5 * sx, 0.015, 11.9 * sz, 0, 4.91, z, { transparent: true, opacity: 0.08, depthWrite: false, metalness: 0.05, roughness: 0.18 });
          for (const x of [-4.75, -2.375, 0, 2.375, 4.75].map(x => x * sx)) {
            const bar = addBox(group, 0xa6afb0, 0.12, 0.12, 11.9 * sz, x, 4.84, z);
            bar.castShadow = true;
          }
          for (const offset of [-5.95, -2.975, 0, 2.975, 5.95].map(z => z * sz)) {
            const bar = addBox(group, 0xa6afb0, 9.5 * sx, 0.12, 0.12, 0, 4.84, z + offset);
            bar.castShadow = true;
          }
        }
      }
    }

    const ambient = new THREE.HemisphereLight(WHITE_6000K, 0xd9d2c3, 1.42);
    scene.add(ambient);
    const daylight = new THREE.DirectionalLight(WHITE_6000K, 2.6);
    daylight.position.set(windowed ? 18 : 8, windowed ? 10 : 14, windowed ? 12 : 6);
    daylight.target.position.set(0, 0, -5);
    daylight.castShadow = true;
    daylight.shadow.mapSize.set(2048, 2048);
    daylight.shadow.intensity = windowed ? .82 : .16;
    daylight.shadow.radius = windowed ? 1.5 : 7;
    daylight.shadow.camera.left = windowed ? -14 : -23;
    daylight.shadow.camera.right = windowed ? 14 : 23;
    daylight.shadow.camera.top = windowed ? 14 : 23;
    daylight.shadow.camera.bottom = windowed ? -14 : -23;
    daylight.shadow.camera.near = 1;
    daylight.shadow.camera.far = 50;
    daylight.shadow.bias = -0.0002;
    scene.add(daylight, daylight.target);
    const generalLights = new THREE.Group();
    scene.add(generalLights);
    for (const z of centers.flatMap(center => [center + depth / 4, center - depth / 4])) {
      const light = new THREE.PointLight(WHITE_6000K, windowed ? 12 : 18, 12, 1.8);
      light.position.set(0, 4.35, z);
      generalLights.add(light);
    }
    let exhibitionPlaque = new THREE.Group();
    scene.add(exhibitionPlaque);
    const setExhibitionInfo = (title, artist, description) => {
      exhibitionPlaque.traverse((object) => {
        object.geometry?.dispose();
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => { material.map?.dispose(); material.dispose(); });
        }
      });
      scene.remove(exhibitionPlaque);
      exhibitionPlaque = new THREE.Group();
      // Keep the center sightline open: the welcome text lives on the left wall
      // near the entrance, with the U.A.U wordmark integrated into the panel.
      exhibitionPlaque.position.set(-width / 2 + .075, 2.05, centers[0] + depth / 2 - 1.8);
      exhibitionPlaque.rotation.y = Math.PI / 2;
      addBox(exhibitionPlaque, 0xbcb6aa, 2.2, 1.86, 0.06, 0, 0, 0);
      const print = new THREE.Mesh(new THREE.PlaneGeometry(2.12, 1.78), new THREE.MeshBasicMaterial({ map: makeExhibitionPlaque(title, artist, description), side: THREE.DoubleSide }));
      print.position.z = 0.032;
      exhibitionPlaque.add(print);
      scene.add(exhibitionPlaque);
    };
    setExhibitionInfo(callbacks.current.exhibitionTitle, callbacks.current.artistName, callbacks.current.exhibitionDescription);
    api.current.setExhibitionInfo = setExhibitionInfo;
    let artGroup = new THREE.Group();
    scene.add(artGroup);
    const artworkMeshes = [];
    const artworkStates = new Map();
    const createArtworkFixture = () => {
      const fixture = new THREE.Group();
      const housing = new THREE.MeshStandardMaterial({ color: 0xe4e3df, metalness: 0.18, roughness: 0.46 });
      const recess = new THREE.MeshStandardMaterial({ color: 0x76756f, metalness: 0.12, roughness: 0.72 });
      const lens = new THREE.MeshStandardMaterial({ color: 0xfafcff, emissive: WHITE_6000K, emissiveIntensity: 0.22, roughness: 0.45 });
      addBox(fixture, housing, 0.09, 0.2, 0.09, 0, 0.12, 0);
      const pivot = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 8), housing);
      fixture.add(pivot);
      const head = new THREE.Group();
      head.position.y = -0.08;
      fixture.add(head);

      const round = new THREE.Group();
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.135, 0.27, 24), housing);
      round.add(cone);
      const roundRim = new THREE.Mesh(new THREE.CylinderGeometry(0.136, 0.136, 0.025, 24), recess);
      roundRim.position.y = -0.139;
      round.add(roundRim);
      const roundLens = new THREE.Mesh(new THREE.CircleGeometry(0.119, 24), lens);
      roundLens.rotation.x = Math.PI / 2;
      roundLens.position.y = -0.153;
      round.add(roundLens);
      head.add(round);

      const square = new THREE.Group();
      addBox(square, housing, 0.23, 0.27, 0.23, 0, 0, 0);
      addBox(square, recess, 0.25, 0.026, 0.25, 0, -0.141, 0);
      const squareLens = new THREE.Mesh(new THREE.PlaneGeometry(0.218, 0.218), lens);
      squareLens.rotation.x = Math.PI / 2;
      squareLens.position.y = -0.155;
      square.add(squareLens);
      head.add(square);
      artGroup.add(fixture);
      return { fixture, head, round, square };
    };
    const disposeGroup = (group) => {
      const disposedMaterials = new Set();
      const disposedTextures = new Set();
      group.traverse((object) => {
        object.geometry?.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.filter(Boolean).forEach((material) => {
          if (disposedMaterials.has(material)) return;
          disposedMaterials.add(material);
          if (material.map && !disposedTextures.has(material.map)) { disposedTextures.add(material.map); material.map.dispose(); }
          material.dispose();
        });
      });
      scene.remove(group);
    };
    const renderWorks = (items) => {
      artworkStates.forEach((state) => state.canvasEdgeTextures?.forEach((texture) => texture.dispose()));
      disposeGroup(artGroup);
      artGroup = new THREE.Group();
      scene.add(artGroup);
      artworkMeshes.length = 0;
      artworkStates.clear();
      const loader = new GLTFLoader();
      items.forEach((work) => {
        const placement = placementFor(work, layoutId, longWindow);
        const { x, y, z, rotation, type } = placement;
        if (type === 'floor' || work.type === 'object') {
          const pedestal = new THREE.Group();
          pedestal.position.set(x, y, z);
          artGroup.add(pedestal);
          const base = addBox(pedestal, 0xe8e6e0, 1.2, 0.78, 1.2, 0, 0.39, 0, { roughness: 0.78 });
          base.userData.decorative = true;
          if (work.assetId) {
            readAsset(work.assetId).then(async (blob) => {
              if (!blob || !pedestal.parent) return;
              loader.parse(await blob.arrayBuffer(), '', (gltf) => {
                if (!pedestal.parent) return;
                const object = gltf.scene;
                const bounds = new THREE.Box3().setFromObject(object);
                const size = bounds.getSize(new THREE.Vector3());
                const scale = 1.45 / Math.max(size.x, size.y, size.z, 0.001);
                object.scale.setScalar(scale);
                object.position.y = 0.79 - bounds.min.y * scale;
                object.traverse((node) => { if (node.isMesh) { node.userData.workId = work.id; artworkMeshes.push(node); } });
                pedestal.add(object);
              }, () => {});
            }).catch(() => {});
          }
          return;
        }
        const group = new THREE.Group();
        group.position.set(x, y, z);
        group.rotation.y = rotation;
        artGroup.add(group);
        const surface = new THREE.Group();
        group.add(surface);
        const frame = new THREE.Group();
        addBox(frame, 0xb8b5ae, 2.7, 3.06, 0.055, 0, 0, -0.06);
        addBox(frame, 0xf9f8f4, 2.62, 2.98, 0.055, 0, 0, -0.02);
        const presentation = work.presentation || (work.frame === false ? 'none' : 'frame');
        frame.visible = work.type !== 'image' || presentation === 'frame';
        surface.add(frame);
        const src = work.mediumUrl || work.originalUrl;
        let framedImage = null;
        let unframedImage = null;
        let canvasObject = null;
        const beamPool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: WHITE_6000K, map: beamPoolMasks.circle, transparent: true, opacity: 0.84, depthWrite: false, side: THREE.DoubleSide }));
        // Place the single projected pool on the wall, behind the artwork and
        // frame. This preserves the image pixels without cutting a square hole
        // out of the light, which previously looked like a second beam.
        beamPool.position.z = placement.id.includes('divider') ? -0.02 : placement.id.includes('back-') ? -0.05 : -0.065;
        beamPool.visible = lightingState.current === 'focused';
        surface.add(beamPool);
        const fixture = createArtworkFixture();
        if (work.type === 'video') {
          const dark = addBox(surface, 0x17191b, 2.35, 1.36, 0.02, 0, 0, 0.025);
          dark.userData.workId = work.id;
          artworkMeshes.push(dark);
          const play = new THREE.Mesh(new THREE.CircleGeometry(0.18, 24), new THREE.MeshBasicMaterial({ color: 0xffffff }));
          play.position.set(0, 0, 0.04); play.userData.workId = work.id; surface.add(play); artworkMeshes.push(play);
        } else if (src) {
          const texture = textureLoader.load(src, (loadedTexture) => {
            const state = artworkStates.get(work.id);
            if (!state?.canvasSideMaterials) return;
            const edgeRegions = [
              { x: 0.965, y: 0, width: 0.035, height: 1 },
              { x: 0, y: 0, width: 0.035, height: 1 },
              { x: 0, y: 0.965, width: 1, height: 0.035 },
              { x: 0, y: 0, width: 1, height: 0.035 },
            ];
            state.canvasEdgeTextures = edgeRegions.map((region) => {
              const edgeTexture = loadedTexture.clone();
              edgeTexture.wrapS = THREE.ClampToEdgeWrapping;
              edgeTexture.wrapT = THREE.ClampToEdgeWrapping;
              edgeTexture.repeat.set(region.width, region.height);
              edgeTexture.offset.set(region.x, region.y);
              edgeTexture.needsUpdate = true;
              return edgeTexture;
            });
            applyCanvasEdge(state, state.canvasEdge);
          }, undefined, () => {});
          texture.colorSpace = THREE.SRGBColorSpace;
          // The artwork is a printed surface: focused lighting must not wash
          // out its pixels or alter its perceived sharpness.
          const imageMaterial = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
          framedImage = new THREE.Mesh(new THREE.PlaneGeometry(2.35, 2.68), imageMaterial);
          framedImage.position.z = 0.025;
          framedImage.userData.workId = work.id;
          framedImage.visible = work.frame !== false;
          unframedImage = new THREE.Mesh(new THREE.PlaneGeometry(2.62, 2.98), imageMaterial);
          unframedImage.position.z = 0.025;
          unframedImage.userData.workId = work.id;
          unframedImage.visible = presentation === 'none';
          surface.add(framedImage, unframedImage);
          artworkMeshes.push(framedImage, unframedImage);
          const thickness = (Number(work.canvasThickness) === 5 ? 5 : 2.5) / 100;
          const edgeColor = work.canvasEdge === 'black' ? 0x111111 : 0xf4f2ed;
          const edgeMaterials = [0, 1, 2, 3].map(() => new THREE.MeshStandardMaterial({ color: edgeColor, roughness: 0.92 }));
          const frontMaterial = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
          const backMaterial = new THREE.MeshStandardMaterial({ color: 0xf4f2ed, roughness: 0.92 });
          const body = new THREE.Mesh(new THREE.BoxGeometry(2.62, 2.98, thickness), [...edgeMaterials, frontMaterial, backMaterial]);
          body.position.z = 0.025 + thickness / 2;
          canvasObject = new THREE.Group();
          canvasObject.add(body);
          canvasObject.visible = presentation === 'canvas';
          surface.add(canvasObject);
          artworkMeshes.push(body);
          // The side textures are attached asynchronously once the image loads;
          // the chosen edge finish stays live before and after that load.
        }
        artworkStates.set(work.id, { root: group, surface, frame, framedImage, unframedImage, canvasObject, canvasBody: canvasObject?.children[0], canvasSideMaterials: canvasObject?.children[0]?.material?.slice(0, 4), canvasEdgeTextures: [], canvasEdge: work.canvasEdge || 'image', canvasThickness: Number(work.canvasThickness) === 5 ? 5 : 2.5, beamPool, ...fixture });
      });
      items.forEach(updateWorkPose);
    };
    const applyCanvasEdge = (state, edge) => {
      if (!state.canvasSideMaterials) return;
      state.canvasEdge = edge;
      const color = edge === 'black' ? 0x111111 : 0xf4f2ed;
      state.canvasSideMaterials.forEach((material, index) => {
        material.map = edge === 'image' ? state.canvasEdgeTextures?.[index] || null : null;
        material.color.setHex(edge === 'image' ? 0xffffff : color);
        material.needsUpdate = true;
      });
    };
    const updateWorkPose = (work) => {
      const state = artworkStates.get(work.id);
      if (!state) return;
      const placement = placementFor(work, layoutId, longWindow);
      const { x, y, z, rotation } = placement;
      const limits = wallAdjustmentLimits(placement.id, work.size ?? 1, layoutId, longWindow);
      const along = THREE.MathUtils.clamp(Number(work.wallAlong) || 0, -limits.along, limits.along);
      const height = THREE.MathUtils.clamp(Number(work.wallHeight) || 0, -limits.height, limits.height);
      const scale = THREE.MathUtils.clamp(Number(work.size) || 1, 0.65, 1.3);
      state.root.position.set(x, y, z);
      state.root.rotation.y = rotation;
      state.surface.position.set(along, height, 0);
      state.surface.scale.setScalar(scale);
      if (state.framedImage) {
        const presentation = work.presentation || (work.frame === false ? 'none' : 'frame');
        state.frame.visible = presentation === 'frame';
        state.framedImage.visible = presentation === 'frame';
        state.unframedImage.visible = presentation === 'none';
        state.canvasObject.visible = presentation === 'canvas';
        const thickness = Number(work.canvasThickness) === 5 ? 5 : 2.5;
        if (state.canvasThickness !== thickness) {
          state.canvasBody.geometry.dispose();
          state.canvasBody.geometry = new THREE.BoxGeometry(2.62, 2.98, thickness / 100);
          state.canvasBody.position.z = 0.025 + thickness / 200;
          state.canvasThickness = thickness;
        }
        if (state.canvasEdge !== (work.canvasEdge || 'image')) applyCanvasEdge(state, work.canvasEdge || 'image');
      }
      const shape = work.beamShape === 'square' ? 'square' : 'circle';
      state.round.visible = shape === 'circle';
      state.square.visible = shape === 'square';
      const railCenter = centers[placement.room - 1];
      const artworkCenter = new THREE.Vector3(x + Math.cos(rotation) * along, y + height, z - Math.sin(rotation) * along);
      state.fixture.position.set(
        artworkCenter.x < 0 ? -width / 2 + 1.15 : width / 2 - 1.15,
        4.57,
        THREE.MathUtils.clamp(artworkCenter.z, railCenter - (depth - 2.5) / 2, railCenter + (depth - 2.5) / 2),
      );
      const headOrigin = state.fixture.position.clone().add(new THREE.Vector3(0, -0.08, 0));
      state.head.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), artworkCenter.sub(headOrigin).normalize());
      const angleDegrees = THREE.MathUtils.clamp(Number(work.beamAngle) || 38, 18, 50);
      state.beamPool.material.map = beamPoolMasks[shape];
      state.beamPool.material.needsUpdate = true;
      const poolSize = 3.3 + ((angleDegrees - 18) / 32) * 1.7;
      state.beamPool.scale.set(poolSize, poolSize, 1);
    };
    renderWorks(worksState.current);
    api.current.setWorks = renderWorks;
    api.current.previewWork = updateWorkPose;

    // Floor clicks travel to the clicked position. Crossing rooms routes via
    // the doorway; forward/backward controls use the current gaze direction.
    let route = [];
    let reportedRoom = 1;
    const roomForZ = (z) => !single && z < -5 ? 2 : 1;
    const limitToRoom = (x, z, room) => new THREE.Vector3(
      THREE.MathUtils.clamp(x, -width / 2 + .85, width / 2 - .85), 1.65,
      THREE.MathUtils.clamp(z, centers[room - 1] - depth / 2 + .85, centers[room - 1] + depth / 2 - .85),
    );
    const navigateTo = (point, origin = camera.position) => {
      const fromRoom = roomForZ(origin.z);
      const toRoom = roomForZ(point.z);
      const destination = limitToRoom(point.x, point.z, toRoom);
      const alignedWithDoor = Math.abs(origin.x) < 1.45 && Math.abs(destination.x) < 1.45;
      route = fromRoom === toRoom || alignedWithDoor ? [destination] : [
        limitToRoom(0, fromRoom === 1 ? -4.35 : -5.65, fromRoom),
        limitToRoom(0, toRoom === 1 ? -4.35 : -5.65, toRoom),
        destination,
      ];
      target.copy(route[0]);
    };
    const step = (direction) => {
      const origin = route.length ? route[route.length - 1].clone() : camera.position.clone();
      const distance = 2.25 * direction;
      const x = origin.x - Math.sin(yaw) * distance;
      const z = origin.z - Math.cos(yaw) * distance;
      const currentRoom = roomForZ(origin.z);
      if (roomForZ(z) !== currentRoom && Math.abs(x) > 1.45) {
        navigateTo(limitToRoom(x, currentRoom === 1 ? -4.45 : -5.55, currentRoom), origin);
      } else {
        navigateTo(new THREE.Vector3(x, 1.65, z), origin);
      }
    };
    const strafe = (direction) => {
      const origin = route.length ? route[route.length - 1].clone() : camera.position.clone();
      const distance = 1.1 * direction;
      const x = origin.x + Math.cos(targetYaw) * distance;
      const z = origin.z - Math.sin(targetYaw) * distance;
      navigateTo(new THREE.Vector3(x, 1.65, z), origin);
    };
    api.current.goToRoom = (nextRoom) => navigateTo(new THREE.Vector3(0, 1.65, nextRoom === 1 ? 6 : -12.5));
    api.current.moveForward = () => step(1);
    api.current.moveBackward = () => step(-1);
    api.current.moveLeft = () => strafe(-1);
    api.current.moveRight = () => strafe(1);
    api.current.turn = (direction) => { targetYaw -= direction * Math.PI / 8; };
    api.current.updateEnvironment = () => {
      Object.entries(ceilingGroups).forEach(([kind, group]) => { group.visible = kind === ceilingState.current; });
      const focused = lightingState.current === 'focused';
      const glass = ceilingState.current === 'glass';
      solidCeilings.forEach((roof) => { roof.visible = !glass; });
      daylight.visible = glass || windowed;
      // Focused mode adds art-directed accents over a reduced room wash; it
      // should not plunge unlit architecture into darkness.
      daylight.intensity = windowed ? 3.8 : 2.6;
      ambient.intensity = windowed ? (focused ? .6 : .7) : focused ? (glass ? .95 : 1.05) : 1.42;
      // Point lights create round pools on the wall even when a square beam is
      // selected. The focused preset uses a uniform room wash instead.
      generalLights.visible = !focused;
      artworkStates.forEach((state) => { state.beamPool.visible = focused; });
    };
    api.current.updateEnvironment();

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDown = null;
    const onPointerDown = (event) => { pointerDown = { x: event.clientX, y: event.clientY, yaw: targetYaw, pitch: targetPitch }; renderer.domElement.setPointerCapture(event.pointerId); };
    const onPointerMove = (event) => {
      if (!pointerDown) return;
      targetYaw = pointerDown.yaw - (event.clientX - pointerDown.x) * 0.004;
      targetPitch = THREE.MathUtils.clamp(pointerDown.pitch - (event.clientY - pointerDown.y) * 0.003, -0.4, 0.48);
    };
    const onPointerUp = (event) => {
      if (!pointerDown) return;
      const moved = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > 7;
      pointerDown = null;
      if (moved) return;
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects([...artworkMeshes, architectural], true)[0];
      if (hit?.object.userData.workId && hit.distance < 13) {
        const work = callbacks.current.works.find((item) => item.id === hit.object.userData.workId);
        if (work) callbacks.current.onArtworkClick(work);
      } else if (hit?.object.userData.floor) {
        navigateTo(hit.point);
      }
    };
    const onKeyDown = (event) => {
      if (document.querySelector('[role="dialog"]') || event.target.closest?.('button, input, select, textarea')) return;
      // Physical key positions work with both English and Korean input layouts.
      if (event.key === 'ArrowUp' || event.code === 'KeyW') { step(1); event.preventDefault(); }
      if (event.key === 'ArrowDown' || event.code === 'KeyS') { step(-1); event.preventDefault(); }
      if (event.code === 'KeyA') { strafe(-1); event.preventDefault(); }
      if (event.code === 'KeyD') { strafe(1); event.preventDefault(); }
      if (event.key === 'ArrowLeft') { targetYaw += Math.PI / 8; event.preventDefault(); }
      if (event.key === 'ArrowRight') { targetYaw -= Math.PI / 8; event.preventDefault(); }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    window.addEventListener('keydown', onKeyDown);

    const resize = () => { const width = host.clientWidth; const height = host.clientHeight; camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height); };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    let frame;
    const render = () => {
      frame = requestAnimationFrame(render);
      camera.position.lerp(target, 0.14);
      if (route.length && camera.position.distanceTo(target) < 0.13) {
        route.shift();
        if (route.length) target.copy(route[0]);
      }
      const nextRoom = roomForZ(camera.position.z);
      if (nextRoom !== reportedRoom) { reportedRoom = nextRoom; callbacks.current.onRoomChange(nextRoom); }
      yaw += (targetYaw - yaw) * 0.09;
      pitch += (targetPitch - pitch) * 0.09;
      camera.lookAt(camera.position.x - Math.sin(yaw) * Math.cos(pitch), camera.position.y + Math.sin(pitch), camera.position.z - Math.cos(yaw) * Math.cos(pitch));
      renderer.render(scene, camera);
    };
    render();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);
      const disposedMaterials = new Set();
      const disposedTextures = new Set();
      scene.traverse((object) => { object.geometry?.dispose(); if (object.material) { const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach((material) => { if (disposedMaterials.has(material)) return; disposedMaterials.add(material); for (const key of ['map', 'bumpMap', 'emissiveMap', 'alphaMap']) { const texture = material[key]; if (texture && !disposedTextures.has(texture)) { disposedTextures.add(texture); texture.dispose(); } } material.dispose(); }); } });
      Object.values(beamPoolMasks).forEach((texture) => texture.dispose());
      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
  }, [layoutId, longWindow]);

  return <div className="gallery-canvas" ref={mount} aria-label={`${layoutFor(layoutId).centers.length}개 전시실로 된 3D 가상 갤러리`}/>;
});
