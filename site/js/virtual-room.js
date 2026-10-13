import {layoutArtworks} from './virtual-model.js';
const THREE=window.THREE,TWEEN=window.TWEEN;
let artworksData=[],gallerySettings;
    const TextureGenerator = {
      createSeamlessHerringbone: function(isWood = false) {
        const S = 512;
        const Cw = 64;
        const P = 64;

        const canvas = document.createElement('canvas');
        canvas.width = S;
        canvas.height = S;
        const ctx = canvas.getContext('2d');
        const imgData = ctx.createImageData(S, S);
        const data = imgData.data;

        let baseR, baseG, baseB;
        if (isWood) {
          baseR = 186; baseG = 126; baseB = 76;
        } else {
          baseR = 34; baseG = 35; baseB = 38;
        }

        function hash2(x, y) {
          const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
          return n - Math.floor(n);
        }

        for (let y = 0; y < S; y++) {
          for (let x = 0; x < S; x++) {
            const col = Math.floor(x / Cw);
            const isEven = (col % 2 === 0);
            const d = isEven ? (y - x) : (y + x);
            const plankId = Math.floor(d / P);
            const f = ((d % P) + P) % P;

            const distPlank = Math.min(f, P - f);
            const distCol = Math.min(x % Cw, Cw - (x % Cw));
            const seamDist = Math.min(distPlank, distCol);

            const pVariation = (hash2(col, plankId) - 0.5) * (isWood ? 36 : 14);
            const grainFreq = Math.sin((d * 0.4) + Math.cos(d * 0.15) * 2);
            const grain = (grainFreq * (isWood ? 12 : 5));

            let r = baseR + pVariation + grain;
            let g = baseG + pVariation * (isWood ? 0.75 : 1) + grain;
            let b = baseB + pVariation * (isWood ? 0.45 : 1) + grain;

            if (seamDist < 2.0) {
              const factor = Math.max(0.3, seamDist / 2.0);
              r *= factor; g *= factor; b *= factor;
            }

            const idx = (y * S + x) * 4;
            data[idx] = Math.min(255, Math.max(0, r));
            data[idx + 1] = Math.min(255, Math.max(0, g));
            data[idx + 2] = Math.min(255, Math.max(0, b));
            data[idx + 3] = 255;
          }
        }

        ctx.putImageData(imgData, 0, 0);
        const texture = new THREE.CanvasTexture(canvas);
        texture.encoding = THREE.sRGBEncoding;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(6, 6);
        return texture;
      },

      createSeamlessWoodPlank: function() {
        const S = 1024;
        const plankH = 128;
        const canvas = document.createElement('canvas');
        canvas.width = S;
        canvas.height = S;
        const ctx = canvas.getContext('2d');

        for (let row = 0; row < 8; row++) {
          const y = row * plankH;
          const tone = 150 + (Math.sin(row * 1.7) * 22);
          ctx.fillStyle = `rgb(${tone}, ${tone * 0.65}, ${tone * 0.38})`;
          ctx.fillRect(0, y, S, plankH);

          ctx.strokeStyle = 'rgba(70, 35, 12, 0.22)';
          for (let g = 8; g < plankH - 8; g += 7) {
            ctx.lineWidth = 1 + Math.sin(g) * 0.8;
            ctx.beginPath();
            for (let x = 0; x <= S; x += 16) {
              const wave = Math.sin((x / S) * Math.PI * 4) * 4 + Math.sin((x / S) * Math.PI * 8) * 2;
              const gy = y + g + wave;
              if (x === 0) ctx.moveTo(x, gy);
              else ctx.lineTo(x, gy);
            }
            ctx.stroke();
          }

          ctx.fillStyle = 'rgba(255, 230, 190, 0.15)';
          ctx.fillRect(0, y, S, 2);
          ctx.fillStyle = 'rgba(40, 20, 8, 0.45)';
          ctx.fillRect(0, y + plankH - 2, S, 2);

          const jointX = (row * 384) % S;
          ctx.fillStyle = 'rgba(30, 15, 5, 0.65)';
          ctx.fillRect(jointX, y, 3, plankH);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.encoding = THREE.sRGBEncoding;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 4);
        return texture;
      },

      createSeamlessWhiteFloor: function() {
        const S = 512;
        const canvas = document.createElement('canvas');
        canvas.width = S;
        canvas.height = S;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#f8f8fa';
        ctx.fillRect(0, 0, S, S);

        ctx.strokeStyle = 'rgba(215, 218, 224, 0.5)';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(0, 0, S, S);
        ctx.strokeRect(S / 2, 0, S / 2, S / 2);
        ctx.strokeRect(0, S / 2, S / 2, S / 2);

        const texture = new THREE.CanvasTexture(canvas);
        texture.encoding = THREE.sRGBEncoding;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 4);
        return texture;
      },

      createWallTexture: function() {
        const S = 512;
        const canvas = document.createElement('canvas');
        canvas.width = S;
        canvas.height = S;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#f9f9fa';
        ctx.fillRect(0, 0, S, S);

        const imgData = ctx.getImageData(0, 0, S, S);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const noise = (Math.random() - 0.5) * 6;
          data[i] = Math.min(255, Math.max(0, data[i] + noise));
          data[i+1] = Math.min(255, Math.max(0, data[i+1] + noise));
          data[i+2] = Math.min(255, Math.max(0, data[i+2] + noise));
        }
        ctx.putImageData(imgData, 0, 0);

        const texture = new THREE.CanvasTexture(canvas);
        texture.encoding = THREE.sRGBEncoding;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(6, 4);
        return texture;
      },

      createPlaqueTexture: function(art) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 360;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#fdfdfb';
        ctx.fillRect(0, 0, 512, 360);

        ctx.strokeStyle = '#d5d5d2';
        ctx.lineWidth = 3;
        ctx.strokeRect(6, 6, 500, 348);

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(36, 32, 40, 4);

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 26px "Noto Sans KR", sans-serif';
        ctx.fillText(art.artist || 'Unknown Artist', 36, 72);

        ctx.fillStyle = '#1e293b';
        ctx.font = 'italic 600 22px "Cinzel", "Noto Sans KR", serif';
        const displayTitle = (art.titleEn || art.title);
        ctx.fillText(displayTitle.length > 22 ? displayTitle.substring(0, 22) + '...' : displayTitle, 36, 110);
        if (art.titleKo) {
          ctx.font = '500 16px "Noto Sans KR", sans-serif';
          ctx.fillStyle = '#475569';
          ctx.fillText(art.titleKo, 36, 136);
        }

        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(36, 154);
        ctx.lineTo(476, 154);
        ctx.stroke();

        ctx.fillStyle = '#64748b';
        ctx.font = '16px "Noto Sans KR", sans-serif';
        ctx.fillText(`연도: ${art.year || '2026'}`, 36, 184);
        const mediumStr = art.medium.length > 24 ? art.medium.substring(0, 24) + '...' : art.medium;
        ctx.fillText(`재료: ${mediumStr}`, 36, 214);
        ctx.fillText(`규격: ${art.dimensions} (세로×가로)`, 36, 244);

        ctx.fillStyle = '#0284c7';
        ctx.font = 'bold 18px "Noto Sans KR", sans-serif';
        ctx.fillText(`가격: ${art.price || '별도 문의'}`, 36, 280);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '600 13px "Noto Sans KR", sans-serif';
        ctx.fillText('CLICK TO VIEW 🔍', 350, 320);

        const texture = new THREE.CanvasTexture(canvas);
        texture.encoding = THREE.sRGBEncoding;
        return texture;
      },

      createPhotorealisticForestTexture: function() {
        const W = 2048;
        const H = 1024;
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');

        const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
        skyGrad.addColorStop(0, '#8ec5e8');
        skyGrad.addColorStop(0.2, '#cde6a8');
        skyGrad.addColorStop(0.5, '#4f7d3a');
        skyGrad.addColorStop(0.85, '#2b4720');
        skyGrad.addColorStop(1, '#1a2e14');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, W, H);

        for (let i = 0; i < 90; i++) {
          const tx = Math.random() * W;
          const tw = 12 + Math.random() * 25;
          const th = 600 + Math.random() * 400;
          ctx.fillStyle = 'rgba(40, 75, 35, 0.35)';
          ctx.fillRect(tx, H - th, tw, th);
        }

        const trunkCount = 55;
        for (let i = 0; i < trunkCount; i++) {
          const x = (i / trunkCount) * W + (Math.random() - 0.5) * 40;
          const tw = 22 + Math.random() * 32;

          const barkGrad = ctx.createLinearGradient(x, 0, x + tw, 0);
          barkGrad.addColorStop(0, '#241c15');
          barkGrad.addColorStop(0.35, '#4a3b2c');
          barkGrad.addColorStop(0.65, '#6b5742');
          barkGrad.addColorStop(0.9, '#8c765c');
          barkGrad.addColorStop(1, '#33271c');

          ctx.fillStyle = barkGrad;
          ctx.beginPath();
          ctx.moveTo(x, H);
          ctx.lineTo(x + tw, H);
          ctx.lineTo(x + tw * 0.8, 0);
          ctx.lineTo(x + tw * 0.2, 0);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = 'rgba(20, 15, 10, 0.45)';
          for (let b = 4; b < tw - 4; b += 5) {
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(x + b, H);
            ctx.lineTo(x + b * 0.8, 0);
            ctx.stroke();
          }

          ctx.fillStyle = 'rgba(235, 255, 195, 0.35)';
          ctx.fillRect(x + tw * 0.65, 0, tw * 0.25, H);
        }

        const leafPalette = [
          '#3d6a2a', '#5c963e', '#7abf52', '#97d867', '#b6ed7d',
          '#2a4a1c', '#609141', '#85b85a', '#aee07a', '#dcf7a6'
        ];

        for (let i = 0; i < 4500; i++) {
          const lx = Math.random() * W;
          const ly = Math.random() * (H * 0.75);
          const lr = 12 + Math.random() * 38;

          ctx.fillStyle = leafPalette[Math.floor(Math.random() * leafPalette.length)];
          ctx.beginPath();
          ctx.ellipse(lx, ly, lr, lr * 0.6, (Math.random() - 0.5) * 1.5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        for (let r = 0; r < 14; r++) {
          const rx = 350 + r * 125 + (Math.random() - 0.5) * 50;
          const beamGrad = ctx.createLinearGradient(rx, 0, rx + 300, H);
          beamGrad.addColorStop(0, 'rgba(255, 250, 215, 0.35)');
          beamGrad.addColorStop(0.5, 'rgba(255, 245, 190, 0.18)');
          beamGrad.addColorStop(1, 'rgba(255, 240, 180, 0)');

          ctx.fillStyle = beamGrad;
          ctx.beginPath();
          ctx.moveTo(rx, 0);
          ctx.lineTo(rx + 80, 0);
          ctx.lineTo(rx + 420, H);
          ctx.lineTo(rx + 220, H);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();

        const fenceW = 550;
        const fenceH = 650;
        const slatH = 22;
        const slatGap = 6;
        for (let y = H - fenceH; y < H; y += slatH + slatGap) {
          ctx.fillStyle = '#b57948';
          ctx.fillRect(0, y, fenceW, slatH);
          ctx.fillStyle = 'rgba(255,255,255,0.2)';
          ctx.fillRect(0, y, fenceW, 2);
          ctx.fillStyle = 'rgba(0,0,0,0.4)';
          ctx.fillRect(0, y + slatH - 3, fenceW, 3);
        }

        const hedgeTop = H - 380;
        const hedgeH = 340;
        const hedgeGrad = ctx.createLinearGradient(0, hedgeTop, 0, H);
        hedgeGrad.addColorStop(0, '#4e8339');
        hedgeGrad.addColorStop(0.4, '#366126');
        hedgeGrad.addColorStop(1, '#1b3313');
        ctx.fillStyle = hedgeGrad;
        ctx.fillRect(250, hedgeTop, W - 250, hedgeH);

        for (let i = 0; i < 6000; i++) {
          const hx = 250 + Math.random() * (W - 250);
          const hy = hedgeTop + Math.random() * hedgeH;
          const hr = 4 + Math.random() * 8;
          ctx.fillStyle = leafPalette[Math.floor(Math.random() * leafPalette.length)];
          ctx.beginPath();
          ctx.arc(hx, hy, hr, 0, Math.PI * 2);
          ctx.fill();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.encoding = THREE.sRGBEncoding;
        return texture;
      },

      createGravelTexture: function() {
        const S = 512;
        const canvas = document.createElement('canvas');
        canvas.width = S;
        canvas.height = S;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#9ca0a6';
        ctx.fillRect(0, 0, S, S);

        const pebbleColors = ['#7c7e82', '#b8bcc2', '#dcdfe4', '#a69e94', '#606266', '#ece9e2', '#85888d'];
        for (let i = 0; i < 4500; i++) {
          const px = Math.random() * S;
          const py = Math.random() * S;
          const pr = 2.5 + Math.random() * 4.5;

          ctx.fillStyle = pebbleColors[Math.floor(Math.random() * pebbleColors.length)];
          ctx.beginPath();
          ctx.ellipse(px, py, pr, pr * (0.65 + Math.random() * 0.4), Math.random() * Math.PI, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.encoding = THREE.sRGBEncoding;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(8, 4);
        return texture;
      },

      createDrainGrillTexture: function() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#111214';
        ctx.fillRect(0, 0, 128, 512);

        ctx.fillStyle = '#2b2d31';
        for (let y = 4; y < 512; y += 12) {
          ctx.fillRect(8, y, 112, 6);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.encoding = THREE.sRGBEncoding;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 16);
        return texture;
      },

      createArtworkTexture: function(art) {
        const texture=new THREE.TextureLoader().load(art.dataUrl,undefined,undefined,()=>GalleryApp.showToast('일부 작품 이미지를 불러오지 못했습니다. 작품 목록에서 다시 확인해주세요.'));
        texture.encoding=THREE.sRGBEncoding;
        return {texture,dataUrl:art.dataUrl};
      }
    };

    /* =========================================================================
       3. THREE.JS APP ARCHITECTURE & SCENE SETUP
       ========================================================================= */
    const GalleryApp = {
      container: document.getElementById('webgl-canvas'),
      scene: null,
      camera: null,
      renderer: null,
      clock: new THREE.Clock(),

      materials: {
        floor: null,
        ceilingBeams: null,
        trim: null,
        walls: null
      },
      textures: {},

      artworkObjects: [],
      spotlights: [],
      raycaster: new THREE.Raycaster(),
      mouse: new THREE.Vector2(),

      player: {
        height: 1.75,
        speed: 5.5,
        position: new THREE.Vector3(0, 1.75, 2.5),
        yaw: 0,
        pitch: 0,
        bounds: {
          minX: -7.0,
          maxX: 6.8,
          minZ: -6.0,
          maxZ: 6.0
        }
      },

      keys: {
        forward: false,
        backward: false,
        left: false,
        right: false
      },

      isPointerLocked: false,
      isDraggingMouse: false,
      prevMousePos: { x: 0, y: 0 },
      isInspectMode: false,
      isTourActive: false,
      tourIndex: 0,
      activeTheme: 'black',

      wallConfigs: {
        front: {
          name: "전면 벽 (메인 벽면)",
          fixedCoord: -7.95,
          axis: 'Z',
          tMin: -5.0,
          tMax: 5.0,
          rot: [0, Math.PI / 2, 0],
          getPos: (t) => [-7.95, 2.0, t],
          getSpotPos: (t) => [-7.95 + 2.4, 4.15, t]
        },
        right: {
          name: "우측 벽 (창가 우측 벽면)",
          fixedCoord: -6.95,
          axis: 'X',
          tMin: -5.0,
          tMax: 5.0,
          rot: [0, 0, 0],
          getPos: (t) => [t, 2.0, -6.95],
          getSpotPos: (t) => [t, 4.15, -6.95 + 2.4]
        },
        left: {
          name: "좌측 벽 (창가 좌측 벽면)",
          fixedCoord: 6.95,
          axis: 'X',
          tMin: -5.0,
          tMax: 5.0,
          rot: [0, Math.PI, 0],
          getPos: (t) => [t, 2.0, 6.95],
          getSpotPos: (t) => [t, 4.15, 6.95 - 2.4]
        }
      },

      init: function() {


        this.setupRenderer();
        this.setupScene();
        this.setupCamera();
        this.setupLights();
        this.buildGalleryRoom();
        if(gallerySettings.outdoor)this.buildOutdoorGarden();
        this.buildArtworks();
        this.setupEvents();

        this.setTheme(gallerySettings.theme);
        this.materials.walls.color.set(gallerySettings.wallColor);
        this.renderer.toneMappingExposure=gallerySettings.brightness;
        this.player.speed=gallerySettings.speed;

        this.animate();
      },

      setupRenderer: function() {
        this.renderer = new THREE.WebGLRenderer({
          canvas: this.container,
          antialias: true,
          powerPreference: "high-performance"
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.94;
        this.renderer.outputEncoding = THREE.sRGBEncoding;

        this.raycaster.far = 1000;
      },

      setupScene: function() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xb2d4ec);
        this.scene.fog = new THREE.FogExp2(0xa7c28d, 0.012);
      },

      setupCamera: function() {
        this.camera = new THREE.PerspectiveCamera(
          65,
          window.innerWidth / window.innerHeight,
          0.1,
          200
        );
        this.camera.position.copy(this.player.position);
        this.camera.rotation.order = 'YXZ';
      },

      setupLights: function() {
        const ambientLight = new THREE.AmbientLight(0xf2f7fc, 0.45);
        this.scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xfff6ea, 1.4);
        sunLight.position.set(24, 18, -6);
        sunLight.target.position.set(0, 0, 0);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 1024;
        sunLight.shadow.mapSize.height = 1024;
        sunLight.shadow.camera.near = 1;
        sunLight.shadow.camera.far = 60;
        sunLight.shadow.camera.left = -16;
        sunLight.shadow.camera.right = 16;
        sunLight.shadow.camera.top = 16;
        sunLight.shadow.camera.bottom = -16;
        sunLight.shadow.bias = -0.0003;
        this.scene.add(sunLight);
        this.scene.add(sunLight.target);

        const hemisphereLight = new THREE.HemisphereLight(0xe8f4ff, 0x3d4a36, 0.25);
        this.scene.add(hemisphereLight);
      },

      buildGalleryRoom: function() {
        const roomW = 16;
        const roomD = 14;
        const roomH = 4.2;

        this.textures.floorBlack = TextureGenerator.createSeamlessHerringbone(false);
        this.textures.floorHerringboneWood = TextureGenerator.createSeamlessHerringbone(true);
        this.textures.floorWood = TextureGenerator.createSeamlessWoodPlank();
        this.textures.floorWhite = TextureGenerator.createSeamlessWhiteFloor();
        this.textures.wallPlaster = TextureGenerator.createWallTexture();

        const floorGeo = new THREE.PlaneGeometry(roomW, roomD);
        this.materials.floor = new THREE.MeshStandardMaterial({
          map: this.textures.floorBlack,
          roughness: 0.35,
          metalness: 0.08
        });
        const floor = new THREE.Mesh(floorGeo, this.materials.floor);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0;
        floor.receiveShadow = true;
        this.scene.add(floor);

        this.materials.walls = new THREE.MeshStandardMaterial({
          map: this.textures.wallPlaster,
          color: 0xfdfdfd,
          roughness: 0.85,
          metalness: 0.02
        });

        const frontWallGeo = new THREE.PlaneGeometry(roomW, roomH);
        const frontWall = new THREE.Mesh(frontWallGeo, this.materials.walls);
        frontWall.position.set(0, roomH / 2, -roomD / 2);
        frontWall.receiveShadow = true;
        this.scene.add(frontWall);

        const backWallGeo = new THREE.PlaneGeometry(roomW, roomH);
        const backWall = new THREE.Mesh(backWallGeo, this.materials.walls);
        backWall.position.set(0, roomH / 2, roomD / 2);
        backWall.rotation.y = Math.PI;
        backWall.receiveShadow = true;
        this.scene.add(backWall);

        const leftWallGeo = new THREE.PlaneGeometry(roomD, roomH);
        const leftWall = new THREE.Mesh(leftWallGeo, this.materials.walls);
        leftWall.position.set(-roomW / 2, roomH / 2, 0);
        leftWall.rotation.y = Math.PI / 2;
        leftWall.receiveShadow = true;
        this.scene.add(leftWall);

        this.materials.trim = new THREE.MeshStandardMaterial({
          color: 0x1f2022,
          roughness: 0.5
        });
        const bbGeoX = new THREE.BoxGeometry(roomW, 0.16, 0.06);
        const bbFront = new THREE.Mesh(bbGeoX, this.materials.trim);
        bbFront.position.set(0, 0.08, -roomD / 2 + 0.03);
        this.scene.add(bbFront);

        const bbBack = new THREE.Mesh(bbGeoX, this.materials.trim);
        bbBack.position.set(0, 0.08, roomD / 2 - 0.03);
        this.scene.add(bbBack);

        const bbGeoZ = new THREE.BoxGeometry(0.06, 0.16, roomD);
        const bbLeft = new THREE.Mesh(bbGeoZ, this.materials.trim);
        bbLeft.position.set(-roomW / 2 + 0.03, 0.08, 0);
        this.scene.add(bbLeft);

        const ceilingGeo = new THREE.PlaneGeometry(roomW, roomD);
        const ceilingMat = new THREE.MeshStandardMaterial({
          color: 0xf5f6f8,
          roughness: 0.9
        });
        const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
        ceiling.position.set(0, roomH, 0);
        ceiling.rotation.x = Math.PI / 2;
        this.scene.add(ceiling);

        const beamGeo = new THREE.BoxGeometry(0.35, 0.45, roomD);
        this.materials.ceilingBeams = new THREE.MeshStandardMaterial({
          color: 0x222325,
          roughness: 0.4
        });
        const beam1 = new THREE.Mesh(beamGeo, this.materials.ceilingBeams);
        beam1.position.set(4.0, roomH - 0.225, 0);
        this.scene.add(beam1);

        const beam2 = new THREE.Mesh(beamGeo, this.materials.ceilingBeams);
        beam2.position.set(-4.0, roomH - 0.225, 0);
        this.scene.add(beam2);

        this.buildWindowWall(roomW, roomD, roomH);
      },

      buildWindowWall: function(roomW, roomD, roomH) {
        const windowX = roomW / 2;
        const windowLength = roomD - 0.2;
        const frameColor = 0x18191b;
        const frameMat = new THREE.MeshStandardMaterial({
          color: frameColor,
          metalness: 0.8,
          roughness: 0.25
        });

        const grateGeo = new THREE.PlaneGeometry(0.7, windowLength);
        const grateMat = new THREE.MeshStandardMaterial({
          map: TextureGenerator.createDrainGrillTexture(),
          roughness: 0.4,
          metalness: 0.5
        });
        const floorGrate = new THREE.Mesh(grateGeo, grateMat);
        floorGrate.rotation.x = -Math.PI / 2;
        floorGrate.position.set(windowX - 0.35, 0.005, 0);
        this.scene.add(floorGrate);

        const topFrame = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, windowLength), frameMat);
        topFrame.position.set(windowX, roomH - 0.1, 0);
        topFrame.castShadow = true;
        this.scene.add(topFrame);

        const bottomSill = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, windowLength), frameMat);
        bottomSill.position.set(windowX, 0.07, 0);
        bottomSill.castShadow = true;
        this.scene.add(bottomSill);

        const postFront = new THREE.Mesh(new THREE.BoxGeometry(0.2, roomH, 0.2), frameMat);
        postFront.position.set(windowX, roomH / 2, -windowLength / 2);
        postFront.castShadow = true;
        this.scene.add(postFront);

        const postBack = new THREE.Mesh(new THREE.BoxGeometry(0.2, roomH, 0.2), frameMat);
        postBack.position.set(windowX, roomH / 2, windowLength / 2);
        postBack.castShadow = true;
        this.scene.add(postBack);

        const mullionCount = 5;
        const span = windowLength / mullionCount;
        for (let i = 1; i < mullionCount; i++) {
          const zPos = -windowLength / 2 + i * span;
          const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.12, roomH, 0.08), frameMat);
          mullion.position.set(windowX, roomH / 2, zPos);
          mullion.castShadow = true;
          this.scene.add(mullion);
        }

        const transom = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, windowLength), frameMat);
        transom.position.set(windowX, roomH * 0.76, 0);
        transom.castShadow = true;
        this.scene.add(transom);

        const glassGeo = new THREE.PlaneGeometry(windowLength, roomH - 0.2);
        const glassMat = new THREE.MeshPhysicalMaterial({
          color: 0xffffff,
          transmission: 0.94,
          opacity: 0.15,
          transparent: true,
          roughness: 0.03,
          metalness: 0.1,
          ior: 1.5,
          reflectivity: 0.6
        });
        const glass = new THREE.Mesh(glassGeo, glassMat);
        glass.position.set(windowX - 0.02, roomH / 2, 0);
        glass.rotation.y = -Math.PI / 2;
        this.scene.add(glass);

        this.buildSunbeams(windowX, roomH, windowLength);
      },

      buildSunbeams: function(windowX, roomH, windowLength) {
        const beamGeo = new THREE.PlaneGeometry(windowLength * 0.85, 9);
        const beamCanvas = document.createElement('canvas');
        beamCanvas.width = 128;
        beamCanvas.height = 512;
        const bctx = beamCanvas.getContext('2d');
        const bGrad = bctx.createLinearGradient(0, 0, 0, 512);
        bGrad.addColorStop(0, 'rgba(255, 245, 210, 0.15)');
        bGrad.addColorStop(0.3, 'rgba(255, 245, 210, 0.06)');
        bGrad.addColorStop(1, 'rgba(255, 245, 210, 0.0)');
        bctx.fillStyle = bGrad;
        bctx.fillRect(0, 0, 128, 512);

        const beamTex = new THREE.CanvasTexture(beamCanvas);
        beamTex.encoding = THREE.sRGBEncoding;
        const beamMat = new THREE.MeshBasicMaterial({
          map: beamTex,
          transparent: true,
          opacity: 0.65,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false
        });

        const sunbeamMesh = new THREE.Mesh(beamGeo, beamMat);
        sunbeamMesh.position.set(windowX - 3.5, 2.0, 0);
        sunbeamMesh.rotation.y = -Math.PI / 2;
        sunbeamMesh.rotation.x = -Math.PI / 4.5;
        this.scene.add(sunbeamMesh);
      },

      buildOutdoorGarden: function() {
        const gardenX = 13.0;
        const gardenW = 10;
        const gardenD = 24;

        const gravelGeo = new THREE.PlaneGeometry(gardenW, gardenD);
        const gravelMat = new THREE.MeshStandardMaterial({
          map: TextureGenerator.createGravelTexture(),
          roughness: 0.88
        });
        const gravel = new THREE.Mesh(gravelGeo, gravelMat);
        gravel.rotation.x = -Math.PI / 2;
        gravel.position.set(gardenX, -0.05, 0);
        gravel.receiveShadow = true;
        this.scene.add(gravel);

        const curbGeo = new THREE.BoxGeometry(0.25, 0.35, gardenD);
        const curbMat = new THREE.MeshStandardMaterial({ color: 0x9e9b98, roughness: 0.9 });
        const curb = new THREE.Mesh(curbGeo, curbMat);
        curb.position.set(gardenX + 1.2, 0.12, 0);
        curb.castShadow = true;
        curb.receiveShadow = true;
        this.scene.add(curb);

        const panoRadius = 24;
        const panoGeo = new THREE.CylinderGeometry(panoRadius, panoRadius, 22, 48, 1, true, -Math.PI / 3, (2 * Math.PI) / 3);
        const panoMat = new THREE.MeshBasicMaterial({
          map: TextureGenerator.createPhotorealisticForestTexture(),
          side: THREE.BackSide,
          fog: false
        });
        const panoMesh = new THREE.Mesh(panoGeo, panoMat);
        panoMesh.position.set(4, 9, 0);
        panoMesh.rotation.y = -Math.PI / 2;
        this.scene.add(panoMesh);
      },

      /* -----------------------------------------------------------------------
         COLLISION-FREE SMART WALL SPACING ALGORITHM
         ----------------------------------------------------------------------- */
      rebalanceArtworksOnWalls: function() {
        const walls = ['front', 'right', 'left'];
        walls.forEach(wallKey => {
          const cfg = this.wallConfigs[wallKey];
          const list = artworksData.filter(a => a.wall === wallKey);
          if (list.length === 0) return;

          const tMin = cfg.tMin;
          const tMax = cfg.tMax;
          const totalLength = tMax - tMin;

          let totalOccupied = 0;
          list.forEach(a => {
            const w = (a.size && a.size[0]) ? a.size[0] : 2.0;
            totalOccupied += (w + 0.45);
          });

          const gap = Math.max(0.65, (totalLength - totalOccupied) / (list.length + 1));
          let currentT = tMin + gap;

          list.forEach(a => {
            const w = (a.size && a.size[0]) ? a.size[0] : 2.0;
            const centerT = currentT + w / 2;

            a.position = cfg.getPos(centerT);
            a.rotation = cfg.rot;

            currentT += w + 0.45 + gap;
          });
        });
      },

      /* -----------------------------------------------------------------------
         EXHIBITION ARTWORKS & DETAILED 3D PLAQUE CAPTIONS
         ----------------------------------------------------------------------- */
      clearArtworks: function() {
        this.artworkObjects.forEach(group => {
          this.scene.remove(group);
        });
        this.spotlights.forEach(spot => {
          this.scene.remove(spot.target);
          this.scene.remove(spot);
        });
        this.artworkObjects = [];
        this.spotlights = [];
      },

      buildArtworks: function() {
        this.rebalanceArtworksOnWalls();
        this.clearArtworks();

        const matMaterial = new THREE.MeshStandardMaterial({
          color: 0xf5f4f0,
          roughness: 0.95
        });

        artworksData.forEach((art, index) => {
          const { texture, dataUrl } = TextureGenerator.createArtworkTexture(art);
          art.dataUrl = dataUrl;

          const group = new THREE.Group();
          group.position.set(...art.position);
          group.rotation.set(...art.rotation);

          const w = art.size[0];
          const h = art.size[1];

          let frameColor = 0x141416;
          let frameRoughness = 0.35;
          let frameMetal = 0.5;

          if (art.frameStyle === 'wood') {
            frameColor = 0x8a522a;
            frameRoughness = 0.6;
            frameMetal = 0.05;
          } else if (art.frameStyle === 'white') {
            frameColor = 0xf0f0f2;
            frameRoughness = 0.3;
            frameMetal = 0.1;
          }

          const frameMaterial = new THREE.MeshStandardMaterial({
            color: frameColor,
            metalness: frameMetal,
            roughness: frameRoughness
          });

          // 1. Frame Box
          const frameDepth = (art.frameStyle === 'none') ? 0.04 : 0.08;
          const frameWidthExtra = (art.frameStyle === 'none') ? 0.0 : 0.12;
          const frameHeightExtra = (art.frameStyle === 'none') ? 0.0 : 0.12;

          const frameGeo = new THREE.BoxGeometry(w + frameWidthExtra, h + frameHeightExtra, frameDepth);
          const frameMesh = new THREE.Mesh(frameGeo, frameMaterial);
          frameMesh.position.z = -frameDepth / 2;
          frameMesh.castShadow = true;
          frameMesh.receiveShadow = true;
          frameMesh.userData = { isArtwork: true, data: art, index: index };
          group.add(frameMesh);

          // 2. Passe-partout
          if (art.frameStyle !== 'none') {
            const innerMatGeo = new THREE.PlaneGeometry(w + 0.02, h + 0.02);
            const matMesh = new THREE.Mesh(innerMatGeo, matMaterial);
            matMesh.position.z = 0.002;
            matMesh.userData = { isArtwork: true, data: art, index: index };
            group.add(matMesh);
          }

          // 3. Canvas Painting
          const canvasGeo = new THREE.PlaneGeometry(w - 0.08, h - 0.08);
          const canvasMat = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.95,
            metalness: 0.0
          });
          const canvasMesh = new THREE.Mesh(canvasGeo, canvasMat);
          canvasMesh.position.z = 0.005;
          canvasMesh.castShadow = true;
          canvasMesh.receiveShadow = true;
          canvasMesh.userData = { isArtwork: true, data: art, index: index };
          group.add(canvasMesh);

          // 4. Detailed 3D Plaque Caption
          const plaqueTexture = TextureGenerator.createPlaqueTexture(art);
          const plaqueGeo = new THREE.PlaneGeometry(0.34, 0.24);
          const plaqueMat = new THREE.MeshStandardMaterial({
            map: plaqueTexture,
            roughness: 0.35,
            metalness: 0.05
          });
          const plaque = new THREE.Mesh(plaqueGeo, plaqueMat);
          plaque.position.set(w / 2 + 0.36, -h / 2 + 0.15, 0.006);
          plaque.castShadow = true;
          plaque.userData = { isArtwork: true, data: art, index: index };
          group.add(plaque);

          this.scene.add(group);
          this.artworkObjects.push(group);

          // 5. Gallery Museum Track Spotlight
          const cfg = this.wallConfigs[art.wall] || this.wallConfigs['front'];
          const spotPos = cfg.getSpotPos(cfg.axis === 'Z' ? art.position[2] : art.position[0]);

          const spotLight = new THREE.SpotLight(0xfff6ed, 1.15, 12, Math.PI / 6, 0.6, 1.2);
          spotLight.position.set(...spotPos);

          const spotTarget = new THREE.Object3D();
          spotTarget.position.set(...art.position);
          this.scene.add(spotTarget);
          spotLight.target = spotTarget;

          this.scene.add(spotLight);
          this.spotlights.push(spotLight);
        });


      },

      setTheme: function(themeName) {
        this.activeTheme = themeName;

        document.querySelectorAll('.theme-option').forEach(el => {
          el.classList.toggle('active', el.dataset.theme === themeName);
        });

        if (themeName === 'black') {
          this.materials.floor.map = this.textures.floorBlack;
          this.materials.floor.roughness = 0.35;
          this.materials.floor.metalness = 0.08;
          this.materials.ceilingBeams.color.setHex(0x222325);
          this.materials.trim.color.setHex(0x1f2022);
          this.renderer.toneMappingExposure = 0.94;
        } else if (themeName === 'herringbone-wood') {
          this.materials.floor.map = this.textures.floorHerringboneWood;
          this.materials.floor.roughness = 0.42;
          this.materials.floor.metalness = 0.03;
          this.materials.ceilingBeams.color.setHex(0x754322);
          this.materials.trim.color.setHex(0x4a2a14);
          this.renderer.toneMappingExposure = 1.02;
        } else if (themeName === 'wood') {
          this.materials.floor.map = this.textures.floorWood;
          this.materials.floor.roughness = 0.45;
          this.materials.floor.metalness = 0.02;
          this.materials.ceilingBeams.color.setHex(0x6b3f20);
          this.materials.trim.color.setHex(0x422612);
          this.renderer.toneMappingExposure = 1.02;
        } else if (themeName === 'white') {
          this.materials.floor.map = this.textures.floorWhite;
          this.materials.floor.roughness = 0.22;
          this.materials.floor.metalness = 0.05;
          this.materials.ceilingBeams.color.setHex(0xdcdde2);
          this.materials.trim.color.setHex(0xd0d0d5);
          this.renderer.toneMappingExposure = 0.90;
        }

        this.materials.floor.needsUpdate = true;
        this.materials.ceilingBeams.needsUpdate = true;
        this.materials.trim.needsUpdate = true;
      },

      /* -----------------------------------------------------------------------
         EVENT LISTENERS
         ----------------------------------------------------------------------- */
      setupEvents: function() {
        const self = this;

        window.addEventListener('resize', () => {
          self.camera.aspect = window.innerWidth / window.innerHeight;
          self.camera.updateProjectionMatrix();
          self.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        document.getElementById('enter-gallery-btn').addEventListener('click', () => {
          document.getElementById('start-overlay').classList.add('hidden');

        });

        document.getElementById('btn-help').addEventListener('click', () => {
          document.getElementById('start-overlay').classList.remove('hidden');
        });

        document.querySelectorAll('.theme-option').forEach(btn => {
          btn.addEventListener('click', () => {
            const theme = btn.dataset.theme;
            self.setTheme(theme);
          });
        });

        document.getElementById('btn-fullscreen').addEventListener('click', () => {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
          } else {
            document.exitFullscreen().catch(() => {});
          }
        });

        document.getElementById('btn-close').addEventListener('click', () => {
          self.resetCamera();
        });

        window.addEventListener('keydown', (e) => {
          if (self.isInspectMode && e.key === 'Escape') {
            self.closeModal();
            return;
          }

          const k = e.key.toLowerCase();
          const code = e.code;

          if (k === 'w' || k === 'ㅈ' || code === 'KeyW' || code === 'ArrowUp') self.keys.forward = true;
          if (k === 's' || k === 'ㄴ' || code === 'KeyS' || code === 'ArrowDown') self.keys.backward = true;
          if (k === 'a' || k === 'ㅁ' || code === 'KeyA' || code === 'ArrowLeft') self.keys.left = true;
          if (k === 'd' || k === 'ㅇ' || code === 'KeyD' || code === 'ArrowRight') self.keys.right = true;
        });

        window.addEventListener('keyup', (e) => {
          const k = e.key.toLowerCase();
          const code = e.code;

          if (k === 'w' || k === 'ㅈ' || code === 'KeyW' || code === 'ArrowUp') self.keys.forward = false;
          if (k === 's' || k === 'ㄴ' || code === 'KeyS' || code === 'ArrowDown') self.keys.backward = false;
          if (k === 'a' || k === 'ㅁ' || code === 'KeyA' || code === 'ArrowLeft') self.keys.left = false;
          if (k === 'd' || k === 'ㅇ' || code === 'KeyD' || code === 'ArrowRight') self.keys.right = false;
        });

        // Click on Artwork from Any Distance
        this.container.addEventListener('click', (e) => {
          if (self.isInspectMode) return;

          if (self.isPointerLocked) {
            self.raycaster.setFromCamera(new THREE.Vector2(0, 0), self.camera);
          } else {
            const rect = self.container.getBoundingClientRect();
            self.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            self.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            self.raycaster.setFromCamera(self.mouse, self.camera);
          }

          const hit = self.findIntersectedArtwork();
          if (hit) {
            self.inspectArtwork(hit.userData.data);
            return;
          }

          if (!self.isPointerLocked) {
            self.requestPointerLock();
          }
        });

        document.addEventListener('pointerlockchange', () => {
          self.isPointerLocked = (document.pointerLockElement === self.container);
          document.body.classList.toggle('pointer-locked', self.isPointerLocked);
        });

        window.addEventListener('mousemove', (e) => {
          if (self.isInspectMode) return;

          if (self.isPointerLocked) {
            const movementX = e.movementX || 0;
            const movementY = e.movementY || 0;

            self.player.yaw -= movementX * 0.0022;
            self.player.pitch -= movementY * 0.0022;
            self.player.pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, self.player.pitch));

            self.camera.rotation.set(self.player.pitch, self.player.yaw, 0, 'YXZ');

            self.checkArtworkTargeting(new THREE.Vector2(0, 0));
            return;
          }

          if (self.isDraggingMouse) {
            const dx = e.clientX - self.prevMousePos.x;
            const dy = e.clientY - self.prevMousePos.y;
            self.prevMousePos = { x: e.clientX, y: e.clientY };

            self.player.yaw -= dx * 0.0035;
            self.player.pitch -= dy * 0.0035;
            self.player.pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, self.player.pitch));

            self.camera.rotation.set(self.player.pitch, self.player.yaw, 0, 'YXZ');
          }

          const rect = self.container.getBoundingClientRect();
          self.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          self.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
          self.checkArtworkTargeting(self.mouse);
        });

        this.container.addEventListener('mousedown', (e) => {
          if (!self.isPointerLocked && !self.isInspectMode) {
            self.isDraggingMouse = true;
            self.prevMousePos = { x: e.clientX, y: e.clientY };
          }
        });

        window.addEventListener('mouseup', () => {
          self.isDraggingMouse = false;
        });

        this.setupNavButtons();

        document.getElementById('modal-close-btn').addEventListener('click', () => self.closeModal());
        document.getElementById('modal-back-btn').addEventListener('click', () => self.closeModal());
        document.getElementById('art-modal').addEventListener('click', (e) => {
          if (e.target.id === 'art-modal') self.closeModal();
        });

        document.getElementById('btn-tour').addEventListener('click', () => self.startTour());
      },

      findIntersectedArtwork: function() {
        const hits = [];
        this.artworkObjects.forEach(group => {
          const intersects = this.raycaster.intersectObjects(group.children, true);
          if (intersects.length > 0) {
            hits.push(intersects[0]);
          }
        });

        if (hits.length === 0) return null;
        hits.sort((a, b) => a.distance - b.distance);
        return hits[0].object;
      },

      checkArtworkTargeting: function(coords) {
        if (this.isInspectMode) {
          document.getElementById('hover-status-pill').classList.remove('show');
          document.getElementById('crosshair').classList.remove('targeting');
          return;
        }

        this.raycaster.setFromCamera(coords, this.camera);
        const hit = this.findIntersectedArtwork();
        const statusPill = document.getElementById('hover-status-pill');
        const statusText = document.getElementById('hover-status-text');
        const crosshair = document.getElementById('crosshair');

        if (hit && hit.userData && hit.userData.data) {
          const art = hit.userData.data;
          statusText.innerText = `${art.titleEn || art.title} (${art.artist}) • 클릭 시 정면 감상`;
          statusPill.classList.add('show');
          crosshair.classList.add('targeting');
          this.container.style.cursor = 'pointer';
        } else {
          statusPill.classList.remove('show');
          crosshair.classList.remove('targeting');
          this.container.style.cursor = 'grab';
        }
      },

      setupNavButtons: function() {
        const self = this;
        const bindButton = (id, keyName) => {
          const btn = document.getElementById(id);
          const startPress = (e) => {
            e.preventDefault();
            self.keys[keyName] = true;
          };
          const endPress = () => {
            self.keys[keyName] = false;
          };

          btn.addEventListener('mousedown', startPress);
          btn.addEventListener('mouseup', endPress);
          btn.addEventListener('mouseleave', endPress);
          btn.addEventListener('touchstart', startPress, { passive: false });
          btn.addEventListener('touchend', endPress);
        };

        bindButton('nav-forward', 'forward');
        bindButton('nav-backward', 'backward');
        bindButton('nav-left', 'left');
        bindButton('nav-right', 'right');
      },

      requestPointerLock: function() {
        this.container.requestPointerLock = this.container.requestPointerLock || this.container.mozRequestPointerLock;
        if (this.container.requestPointerLock) {
          this.container.requestPointerLock();
        }
      },

      /* -----------------------------------------------------------------------
         KUNSTMATRIX ARTWORK INSPECTION (Camera Glides into Artwork)
         ----------------------------------------------------------------------- */
      inspectArtwork: function(art) {
        this.isInspectMode = true;
        if (document.exitPointerLock) document.exitPointerLock();

        const targetPos = new THREE.Vector3(...art.position);
        const viewDistance = Math.max(2.0, art.size[0] * 1.15);
        let camTargetPos = targetPos.clone();

        if (art.wall === 'front') {
          camTargetPos.x += viewDistance;
          this.player.yaw = Math.PI / 2;
        } else if (art.wall === 'right') {
          camTargetPos.z += viewDistance;
          this.player.yaw = 0;
        } else if (art.wall === 'left') {
          camTargetPos.z -= viewDistance;
          this.player.yaw = Math.PI;
        }
        camTargetPos.y = art.position[1];
        this.player.pitch = 0;

        new TWEEN.Tween(this.camera.position)
          .to(camTargetPos, window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:1200)
          .easing(TWEEN.Easing.Cubic.Out)
          .onUpdate(() => {
            this.camera.lookAt(targetPos);
          })
          .onComplete(() => {
            this.camera.position.copy(camTargetPos);
            this.player.position.copy(camTargetPos);
            this.openModal(art);
          })
          .start();
      },

      openModal: function(art) {
        document.getElementById('modal-img').src = art.dataUrl;

        document.getElementById('modal-title-en').innerText = art.titleEn || art.title;
        document.getElementById('modal-title-ko').innerText = art.titleKo || '';
        document.getElementById('modal-artist').innerText = `${art.artist}, ${art.year}`;

        const fullTitle = art.titleKo ? `${art.titleEn || art.title} (${art.titleKo})` : (art.titleEn || art.title);
        document.getElementById('modal-spec-title').innerText = fullTitle;
        document.getElementById('modal-spec-year').innerText = art.year;
        document.getElementById('modal-spec-medium').innerText = art.medium;
        document.getElementById('modal-spec-dimensions').innerText = art.dimensions;
        document.getElementById('modal-spec-price').innerText = art.price || '별도 문의';

        document.getElementById('modal-desc').innerText = art.description;
        document.getElementById('art-modal').classList.add('active');
      },

      closeModal: function() {
        document.getElementById('art-modal').classList.remove('active');
        this.isInspectMode = false;
      },

      resetCamera: function() {
        this.closeModal();
        const defaultPos = new THREE.Vector3(0, 1.75, 2.5);
        new TWEEN.Tween(this.camera.position)
          .to(defaultPos, window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:1000)
          .easing(TWEEN.Easing.Cubic.Out)
          .onComplete(() => {
            this.player.position.copy(defaultPos);
            this.player.yaw = 0;
            this.player.pitch = 0;
            this.camera.rotation.set(0, 0, 0, 'YXZ');
          })
          .start();
      },

      startTour: function() {
        if (artworksData.length === 0) return;
        this.closeModal();
        this.isTourActive = true;
        this.tourIndex = 0;
        this.nextTourStop();
      },

      nextTourStop: function() {
        if (!this.isTourActive) return;
        const currentArt = artworksData[this.tourIndex];
        this.inspectArtwork(currentArt);
        this.tourIndex = (this.tourIndex + 1) % artworksData.length;
      },

      /* -----------------------------------------------------------------------
         ARTWORK UPLOAD & MANAGEMENT SYSTEM
         ----------------------------------------------------------------------- */
      showToast: function(msg) {
        const toast = document.getElementById('toast-msg');
        toast.innerText = msg;
        toast.classList.add('show');
        setTimeout(() => {
          toast.classList.remove('show');
        }, 3200);
      },

      /* -----------------------------------------------------------------------
         MAIN ANIMATION & PHYSICS LOOP
         ----------------------------------------------------------------------- */
      animate: function() {
        if(this.disposed)return;
        this.animationFrame=requestAnimationFrame(() => this.animate());

        const delta = Math.min(this.clock.getDelta(), 0.1);
        TWEEN.update();

        if (!this.isInspectMode) {
          this.updatePlayerMovement(delta);
        }

        this.renderer.render(this.scene, this.camera);
      },

      updatePlayerMovement: function(delta) {
        const moveVector = new THREE.Vector3();

        if (this.keys.forward) moveVector.z -= 1;
        if (this.keys.backward) moveVector.z += 1;
        if (this.keys.left) moveVector.x -= 1;
        if (this.keys.right) moveVector.x += 1;

        if (moveVector.lengthSq() > 0) {
          moveVector.normalize();
          moveVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.player.yaw);

          this.player.position.x += moveVector.x * this.player.speed * delta;
          this.player.position.z += moveVector.z * this.player.speed * delta;

          // Wall Collision
          this.player.position.x = Math.max(this.player.bounds.minX, Math.min(this.player.bounds.maxX, this.player.position.x));
          this.player.position.z = Math.max(this.player.bounds.minZ, Math.min(this.player.bounds.maxZ, this.player.position.z));
        }

        this.camera.position.x = this.player.position.x;
        this.camera.position.y = this.player.height;
        this.camera.position.z = this.player.position.z;
      }
    };

// Public runtime adaptations: saved exhibition content, stable wall layout,
// touch input and native accessible artwork dialogs.
GalleryApp.rebalanceArtworksOnWalls=function(){artworksData=layoutArtworks(artworksData);};
GalleryApp.requestPointerLock=function(){};
TextureGenerator.createPlaqueTexture=function(art){
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=512;
 const context=canvas.getContext('2d');context.fillStyle='#f6f4ee';context.fillRect(0,0,768,512);context.fillStyle='#19211e';
 context.font='600 40px Noto Sans KR';context.fillText(art.title,35,65,690);
 context.font='26px Noto Sans KR';
 const lines=[art.artist,art.year,art.medium,art.dimensions,...(gallerySettings.showPrices&&art.price?[art.price]:[])].filter(Boolean);
 lines.forEach((line,index)=>context.fillText(line,35,125+index*57,690));
 const texture=new THREE.CanvasTexture(canvas);texture.encoding=THREE.sRGBEncoding;return texture;
};
const originalOpen=GalleryApp.openModal;
GalleryApp.openModal=function(art){
 originalOpen.call(this,art);const dialog=document.getElementById('art-modal');
 document.getElementById('modal-img').alt=art.image.alt||art.title;
 document.getElementById('modal-artist').textContent=[art.artist,art.year].filter(Boolean).join(', ');
 document.getElementById('modal-spec-year').closest('.art-spec-row').hidden=!art.year;
 document.getElementById('modal-spec-medium').closest('.art-spec-row').hidden=!art.medium;
 document.getElementById('tour-stop').hidden=!this.isTourActive;
 document.getElementById('modal-spec-price').closest('.art-spec-row').hidden=!gallerySettings.showPrices||!art.price;
 document.getElementById('tour-next').hidden=!this.isTourActive;
 if(!dialog.open)dialog.showModal();
};
GalleryApp.closeModal=function(){
 const dialog=document.getElementById('art-modal');dialog.classList.remove('active');if(dialog.open)dialog.close();
 this.isInspectMode=false;this.camera.rotation.set(this.player.pitch,this.player.yaw,0,'YXZ');
};
export function mountRoom(settings,works){
 gallerySettings=settings;
 artworksData=works.map(work=>({...work,titleEn:work.titleEn||work.title,titleKo:work.titleEn?work.title:'',frameStyle:work.frame,dataUrl:work.image.url,dimensions:`${work.heightCm} × ${work.widthCm} cm`}));
 GalleryApp.init();
 const canvas=GalleryApp.container;let touching=null,pressPoint=null,moved=false;
 canvas.style.touchAction='none';
 canvas.addEventListener('pointerdown',event=>{moved=false;pressPoint={x:event.clientX,y:event.clientY};if(event.pointerType==='touch'){touching={x:event.clientX,y:event.clientY};canvas.setPointerCapture(event.pointerId);}});
 canvas.addEventListener('pointermove',event=>{
  if(pressPoint&&event.buttons&&Math.abs(event.clientX-pressPoint.x)+Math.abs(event.clientY-pressPoint.y)>4)moved=true;
  if(!touching||GalleryApp.isInspectMode)return;
  const dx=event.clientX-touching.x,dy=event.clientY-touching.y;if(Math.abs(dx)+Math.abs(dy)>2)moved=true;
  GalleryApp.player.yaw-=dx*.0035;GalleryApp.player.pitch=Math.max(-Math.PI/2.5,Math.min(Math.PI/2.5,GalleryApp.player.pitch-dy*.0035));
  GalleryApp.camera.rotation.set(GalleryApp.player.pitch,GalleryApp.player.yaw,0,'YXZ');touching={x:event.clientX,y:event.clientY};
 });
 canvas.addEventListener('pointerup',()=>{touching=null;});canvas.addEventListener('pointercancel',()=>{touching=null;});
 canvas.addEventListener('click',event=>{if(moved){event.preventDefault();event.stopImmediatePropagation();}},true);
 const release=()=>{for(const key of Object.keys(GalleryApp.keys))GalleryApp.keys[key]=false;};
 window.addEventListener('blur',release);document.addEventListener('visibilitychange',release);
 for(const button of document.querySelectorAll('.nav-btn'))button.addEventListener('pointerleave',release);
 document.getElementById('art-modal').addEventListener('cancel',event=>{event.preventDefault();GalleryApp.closeModal();});
 document.getElementById('tour-next').onclick=()=>{GalleryApp.closeModal();GalleryApp.nextTourStop();};
 document.getElementById('tour-stop').onclick=()=>{GalleryApp.isTourActive=false;GalleryApp.closeModal();};
 document.getElementById('btn-close').addEventListener('click',()=>{GalleryApp.isTourActive=false;});
 const stop=()=>{GalleryApp.disposed=true;cancelAnimationFrame(GalleryApp.animationFrame);TWEEN.removeAll();GalleryApp.scene.traverse(object=>{object.geometry?.dispose();for(const material of [object.material].flat().filter(Boolean)){material.map?.dispose();material.dispose();}});GalleryApp.renderer.dispose();};
 // Back/forward cache retains the live room; dispose only when leaving for good.
 window.addEventListener('pagehide',event=>{if(!event.persisted)stop();});
 return {inspect:id=>{const art=artworksData.find(work=>work.id===id);if(art){document.getElementById('start-overlay').classList.add('hidden');GalleryApp.inspectArtwork(art);}},stop};
}
