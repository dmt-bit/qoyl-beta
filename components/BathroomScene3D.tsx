"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type * as T from "three";

export interface SceneProps {
  onHotspot: (id: "shower" | "vanity" | "dashboard") => void;
  fullViewport?: boolean;
  /** Summary lines shown on the wall-mounted routine board */
  wallInfo?: { greeting: string; chips: string[]; routineLines: string[] };
  hud?: {
    total: number;
    hasPrice: boolean;
    checkedCount: number;
    totalCount: number;
    onShare: () => void;
    onShopAll: () => void;
  };
}

export default function BathroomScene3D({ onHotspot, fullViewport, wallInfo, hud }: SceneProps) {
  const mountRef  = useRef<HTMLDivElement>(null);
  const rafRef    = useRef<number>(0);
  const [hint, setHint] = useState<string | null>(null);
  const onHotspotRef = useRef(onHotspot);
  useEffect(() => { onHotspotRef.current = onHotspot; }, [onHotspot]);

  const initScene = useCallback(() => {
    const el = mountRef.current;
    if (!el) return;

    import("three").then((THREE) => {
      if (!mountRef.current) return;
      const elDiv = el as HTMLDivElement;
      try {

      // ─── Helpers ────────────────────────────────────────────────────────────
      const shiftBrightness = (hex: string, delta: number): string => {
        const n = parseInt(hex.replace("#",""), 16);
        const r = Math.max(0, Math.min(255, (n>>16) + delta));
        const g = Math.max(0, Math.min(255, ((n>>8)&0xff) + delta));
        const b = Math.max(0, Math.min(255, (n&0xff) + delta));
        return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`;
      };

      // ─── Marble slab texture (large-format, minimal grout) ──────────────────
      const marbleSlab = (w: number, h: number, base: string, veinAlpha = 0.18, groutW = 1.5): T.CanvasTexture => {
        const c = document.createElement("canvas"); c.width = w; c.height = h;
        const ctx = c.getContext("2d")!;
        const bg = ctx.createLinearGradient(0, 0, w, h*0.7);
        bg.addColorStop(0, shiftBrightness(base, 10));
        bg.addColorStop(0.5, base);
        bg.addColorStop(1, shiftBrightness(base, -6));
        ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
        // Layered veining
        for (let pass = 0; pass < 3; pass++) {
          const count = [3, 6, 11][pass];
          for (let i = 0; i < count; i++) {
            ctx.beginPath();
            const a = veinAlpha * [1.0, 0.55, 0.28][pass] * (0.6 + Math.random()*0.8);
            ctx.strokeStyle = `rgba(140,124,100,${a})`;
            ctx.lineWidth = [2.8, 1.4, 0.6][pass] * (0.5 + Math.random());
            let x = Math.random()*w, y = Math.random()*h;
            ctx.moveTo(x, y);
            for (let s = 0; s < 5+pass; s++) {
              const nx = x + (Math.random()-0.5)*w*0.45, ny = y + (Math.random()-0.5)*h*0.45;
              ctx.quadraticCurveTo(x+(Math.random()-0.5)*80, y+(Math.random()-0.5)*80, nx, ny);
              x = nx; y = ny;
            }
            ctx.stroke();
          }
        }
        // Pixel noise
        const id = ctx.getImageData(0,0,w,h);
        for (let p = 0; p < id.data.length; p += 4) {
          const n = (Math.random()-0.5)*7;
          id.data[p]   = Math.max(0,Math.min(255,id.data[p]+n));
          id.data[p+1] = Math.max(0,Math.min(255,id.data[p+1]+n));
          id.data[p+2] = Math.max(0,Math.min(255,id.data[p+2]+n));
        }
        ctx.putImageData(id, 0, 0);
        // Thin grout — large format tiles (fewer lines)
        ctx.strokeStyle = `rgba(180,168,150,0.7)`; ctx.lineWidth = groutW;
        const tileX = w/2, tileY = h/2;
        for (let x = 0; x <= w; x += tileX) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
        for (let y = 0; y <= h; y += tileY) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
        const t = new THREE.CanvasTexture(c);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        return t;
      };

      // Brass/gold texture
      const brassTex = (): T.CanvasTexture => {
        const c = document.createElement("canvas"); c.width = 128; c.height = 8;
        const ctx = c.getContext("2d")!;
        const g = ctx.createLinearGradient(0,0,128,0);
        g.addColorStop(0,"#4A3010"); g.addColorStop(0.3,"#8A6228"); g.addColorStop(0.5,"#C4924A"); g.addColorStop(0.7,"#8A6228"); g.addColorStop(1,"#4A3010");
        ctx.fillStyle = g; ctx.fillRect(0,0,128,8);
        return new THREE.CanvasTexture(c);
      };

      // Matte black metal texture
      const blackMetalTex = (): T.CanvasTexture => {
        const c = document.createElement("canvas"); c.width = 64; c.height = 64;
        const ctx = c.getContext("2d")!;
        ctx.fillStyle = "#1A1818"; ctx.fillRect(0,0,64,64);
        return new THREE.CanvasTexture(c);
      };

      // Hotspot texture
      const hotspotTex = (label: string): T.CanvasTexture => {
        const c = document.createElement("canvas"); c.width = 256; c.height = 256;
        const ctx = c.getContext("2d")!;
        ctx.clearRect(0,0,256,256);
        ctx.beginPath(); ctx.arc(128,128,118,0,Math.PI*2); ctx.strokeStyle="rgba(200,168,106,0.2)"; ctx.lineWidth=8; ctx.stroke();
        ctx.beginPath(); ctx.arc(128,128,80,0,Math.PI*2); ctx.strokeStyle="rgba(200,168,106,0.75)"; ctx.lineWidth=2.5; ctx.stroke();
        ctx.beginPath(); ctx.arc(128,128,22,0,Math.PI*2); ctx.fillStyle="rgba(200,168,106,0.9)"; ctx.fill();
        ctx.font="600 22px sans-serif"; ctx.fillStyle="rgba(220,185,110,0.95)"; ctx.textAlign="center"; ctx.fillText(label.toUpperCase(),128,218);
        return new THREE.CanvasTexture(c);
      };

      // Window glass texture (frosted/subtle exterior)
      const windowTex = (): T.CanvasTexture => {
        const c = document.createElement("canvas"); c.width = 256; c.height = 512;
        const ctx = c.getContext("2d")!;
        // Sky gradient
        const sky = ctx.createLinearGradient(0,0,0,512);
        sky.addColorStop(0,"#D4E8F0"); sky.addColorStop(0.4,"#E8F0F4"); sky.addColorStop(1,"#F4F0E8");
        ctx.fillStyle = sky; ctx.fillRect(0,0,256,512);
        // Trees
        ctx.fillStyle = "rgba(100,120,80,0.35)";
        for (let i = 0; i < 8; i++) {
          const tx = 20+i*32, th = 180+Math.random()*120, tw = 18+Math.random()*14;
          ctx.fillRect(tx-tw/2, 512-th, tw, th);
          ctx.beginPath(); ctx.arc(tx, 512-th, tw*1.8, 0, Math.PI*2); ctx.fill();
        }
        // Frame bars
        ctx.strokeStyle = "rgba(50,38,28,0.9)"; ctx.lineWidth = 5;
        ctx.strokeRect(2,2,252,508);
        for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(i*86,0); ctx.lineTo(i*86,512); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(0,256); ctx.lineTo(256,256); ctx.stroke();
        const t = new THREE.CanvasTexture(c);
        return t;
      };

      try { localStorage.setItem('__bscene_step','textures-done'); } catch{}

      // ─── Renderer ───────────────────────────────────────────────────────────
      const W = elDiv.clientWidth||window.innerWidth, H = elDiv.clientHeight||window.innerHeight;
      const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2.5));
      renderer.setSize(W, H);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      elDiv.appendChild(renderer.domElement);
      try { localStorage.setItem('__bscene_step','renderer-ok'); } catch{}

      // ─── Scene & Camera ─────────────────────────────────────────────────────
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xF0EBE2);
      scene.fog = new THREE.FogExp2(0xF0EBE2, 0.008); // very light fog

      const cam = new THREE.PerspectiveCamera(72, W/H, 0.05, 80);
      // Camera in center of room, eye height, facing slightly toward shower/vanity
      cam.position.set(0.8, 1.62, 2.2);
      let yaw = -0.25, pitch = -0.05;

      // ─── Room dimensions ────────────────────────────────────────────────────
      // Wider, longer room matching reference — spacious luxury spa feel
      const RW = 10, RH = 3.6, RD = 12;

      // ─── Lighting ───────────────────────────────────────────────────────────
      // Very soft ambient
      scene.add(new THREE.AmbientLight(0xFFF8F0, 0.4));
      // Hemisphere
      scene.add(new THREE.HemisphereLight(0xFFF8EE, 0xE8E0D4, 0.3));

      // Cove strip light — warm LED ring around ceiling perimeter
      // Simulate with 4 point lights at ceiling corners + center
      const coveColor = 0xFFEED0;
      const coveLights = [
        [-RW/2+1, RH-0.1, -RD/2+1],
        [ RW/2-1, RH-0.1, -RD/2+1],
        [-RW/2+1, RH-0.1,  RD/2-1],
        [ RW/2-1, RH-0.1,  RD/2-1],
        [0,       RH-0.1, -RD/4  ],
        [0,       RH-0.1,  RD/4  ],
      ];
      for (const [cx,cy,cz] of coveLights) {
        const cl = new THREE.PointLight(coveColor, 1.8, 10, 1.6);
        cl.position.set(cx,cy,cz); scene.add(cl);
      }

      // Recessed downlights (can lights) — 6 across ceiling
      const downPositions: [number,number,number][] = [
        [-2.5, RH-0.05, -4], [2.5, RH-0.05, -4],
        [-2.5, RH-0.05,  0], [2.5, RH-0.05,  0],
        [-2.5, RH-0.05,  3], [2.5, RH-0.05,  3],
      ];
      const downLights: T.PointLight[] = [];
      for (const [dx,dy,dz] of downPositions) {
        const dl = new THREE.PointLight(0xFFF8EE, 2.2, 7, 1.8);
        dl.position.set(dx,dy,dz); dl.castShadow = true;
        dl.shadow.mapSize.width = 512; dl.shadow.mapSize.height = 512;
        scene.add(dl); downLights.push(dl);
        // Visible fixture disc
        const fixt = new THREE.Mesh(
          new THREE.CylinderGeometry(0.055,0.07,0.04,24),
          new THREE.MeshStandardMaterial({color:0xE8E4DE, roughness:0.6})
        );
        fixt.position.set(dx,RH-0.02,dz); scene.add(fixt);
        // Emissive bulb
        const bulbDisc = new THREE.Mesh(
          new THREE.CylinderGeometry(0.038,0.038,0.01,24),
          new THREE.MeshStandardMaterial({color:0xFFFAF0,emissive:new THREE.Color(0xFFF5D0),emissiveIntensity:2.5,roughness:0.5})
        );
        bulbDisc.position.set(dx,RH-0.025,dz); scene.add(bulbDisc);
      }

      // Window daylight from left wall
      const dayLight = new THREE.DirectionalLight(0xFAF5EE, 1.2);
      dayLight.position.set(-RW, 3, 1); dayLight.castShadow = true;
      dayLight.shadow.mapSize.width = 1024; dayLight.shadow.mapSize.height = 1024;
      dayLight.shadow.camera.near = 0.1; dayLight.shadow.camera.far = 30;
      dayLight.shadow.camera.left = -8; dayLight.shadow.camera.right = 8;
      dayLight.shadow.camera.top = 6; dayLight.shadow.camera.bottom = -6;
      scene.add(dayLight);

      // ─── Materials ──────────────────────────────────────────────────────────
      const bm = new THREE.MeshStandardMaterial({ map: brassTex(), roughness:0.28, metalness:0.82 });
      const blackMat = new THREE.MeshStandardMaterial({ map: blackMetalTex(), roughness:0.22, metalness:0.88, color:0x1A1818 });

      // Floor — highly polished travertine/marble (large 60×120cm slabs)
      const floorTex = marbleSlab(2048, 2048, "#E2D8C8", 0.14, 1.2);
      floorTex.repeat.set(5, 6);
      const floorMat = new THREE.MeshPhysicalMaterial({
        map: floorTex, roughness: 0.12, metalness: 0.0,
        clearcoat: 0.9, clearcoatRoughness: 0.06, reflectivity: 0.9,
      });

      // Walls — large-slab travertine, almost no grout
      const wallTex = marbleSlab(2048, 1024, "#EDE7DC", 0.10, 0.8);
      wallTex.repeat.set(1.5, 1);
      const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.68, metalness: 0 });

      // Ceiling — flat warm white
      const ceilMat = new THREE.MeshStandardMaterial({ color:0xF8F4EE, roughness:0.98 });

      // Shower wall — slightly darker marble
      const shWallTex = marbleSlab(1024, 1024, "#D8D2C6", 0.16, 0.8);
      shWallTex.repeat.set(1, 1);
      const shWallMat = new THREE.MeshPhysicalMaterial({ map: shWallTex, roughness: 0.32, clearcoat: 0.4, clearcoatRoughness: 0.15 });

      // ─── Room shell ─────────────────────────────────────────────────────────
      const addPlane = (geo: T.BufferGeometry, mat: T.Material, x: number, y: number, z: number, rx = 0, ry = 0) => {
        const m = new THREE.Mesh(geo, mat);
        m.rotation.x = rx; m.rotation.y = ry;
        m.position.set(x,y,z); m.receiveShadow = true; scene.add(m); return m;
      };

      // Floor
      addPlane(new THREE.PlaneGeometry(RW, RD), floorMat, 0, 0, 0, -Math.PI/2);
      // Ceiling — with cove recess (slightly inset plane)
      addPlane(new THREE.PlaneGeometry(RW, RD), ceilMat, 0, RH, 0, Math.PI/2);
      // Ceiling cove crown (inset tray) — just a slightly lowered inner plane for the tray look
      const coveInner = new THREE.Mesh(new THREE.PlaneGeometry(RW-0.8, RD-0.8), new THREE.MeshStandardMaterial({color:0xF4F0E8, roughness:0.98}));
      coveInner.rotation.x = Math.PI/2; coveInner.position.set(0, RH-0.14, 0); scene.add(coveInner);
      // Cove side strips (the dropped band around perimeter)
      const coveBand = new THREE.MeshStandardMaterial({color:0xEEE8E0, roughness:0.95});
      for (const [w,h,x,z,ry] of [
        [RW,  0.14, 0,        -RD/2, 0],
        [RW,  0.14, 0,         RD/2, Math.PI],
        [RD,  0.14, -RW/2, 0,        Math.PI/2],
        [RD,  0.14,  RW/2, 0,       -Math.PI/2],
      ] as [number,number,number,number,number][]) {
        const cb = new THREE.Mesh(new THREE.PlaneGeometry(w, h), coveBand);
        cb.rotation.y = ry; cb.position.set(x, RH-0.07, z); scene.add(cb);
      }
      // Cove LED emissive strip (faint glow at ceiling-wall junction)
      const coveLEDMat = new THREE.MeshStandardMaterial({
        color:0xFFEED0, emissive:new THREE.Color(0xFFE8B0), emissiveIntensity:0.6, roughness:1
      });
      for (const [w,x,z,ry] of [
        [RW, 0, -RD/2+0.01, 0],
        [RW, 0,  RD/2-0.01, Math.PI],
        [RD, -RW/2+0.01, 0, Math.PI/2],
        [RD,  RW/2-0.01, 0, -Math.PI/2],
      ] as [number,number,number,number][]) {
        const strip = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.06), coveLEDMat);
        strip.rotation.y = ry; strip.position.set(x, RH-0.14, z); scene.add(strip);
      }
      // Back wall
      addPlane(new THREE.PlaneGeometry(RW, RH), wallMat, 0, RH/2, -RD/2);
      // Left wall — windows take up most of this, add partial panels
      addPlane(new THREE.PlaneGeometry(RD, RH), wallMat, -RW/2, RH/2, 0, 0, Math.PI/2);
      // Right wall
      addPlane(new THREE.PlaneGeometry(RD, RH), wallMat, RW/2, RH/2, 0, 0, -Math.PI/2);

      // ─── Floor-to-ceiling WINDOWS (left wall) ───────────────────────────────
      // Three window panels — dark bronze frames, exterior view
      const winGlassMat = new THREE.MeshPhysicalMaterial({
        map: windowTex(), color:0xD0E8F0, transparent:true, opacity:0.65,
        roughness:0.04, metalness:0.0, transmission:0.6, side:THREE.DoubleSide
      });
      const winFrameMat = new THREE.MeshStandardMaterial({color:0x2A201A, roughness:0.5, metalness:0.3});
      const winW = 1.8, winH = RH - 0.4, winY = RH/2 + 0.1;
      const winPositions = [-3.5, -1.0, 1.5]; // z positions of 3 window panels
      for (const wz of winPositions) {
        // Frame
        const frames = [
          [winW+0.1, 0.06, 0.08, winY+winH/2+0.03, wz], // top
          [winW+0.1, 0.06, 0.08, winY-winH/2-0.03, wz], // bottom
          [0.06, winH+0.1, 0.08, winY, wz-winW/2-0.03], // left
          [0.06, winH+0.1, 0.08, winY, wz+winW/2+0.03], // right
          [0.04, winH, 0.06, winY, wz],                   // center mullion
        ];
        for (const [fw,fh,fd,fy,fz] of frames as [number,number,number,number,number][]) {
          const frm = new THREE.Mesh(new THREE.BoxGeometry(fd, fh, fw), winFrameMat);
          frm.position.set(-RW/2+0.04, fy, fz); scene.add(frm);
        }
        // Glass pane
        const glass = new THREE.Mesh(new THREE.PlaneGeometry(winW, winH), winGlassMat);
        glass.rotation.y = Math.PI/2; glass.position.set(-RW/2+0.06, winY, wz);
        scene.add(glass);
      }
      // Window sill
      const sillMat = new THREE.MeshStandardMaterial({color:0xE8E0D4, roughness:0.5});
      const sill = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, winW*3+1.2), sillMat);
      sill.position.set(-RW/2+0.11, winY-winH/2-0.025, 0); scene.add(sill);

      // ─── SHOWER ENCLOSURE ───────────────────────────────────────────────────
      // Back-right corner shower, matte black frame + glass
      const SX = RW/2 - 1.8; // right side
      const SZ = -RD/2 + 2.2;
      const SW = 2.6, SD = 2.2, SH = RH;

      // Shower back and side walls (marble)
      const shBack = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), shWallMat);
      shBack.position.set(SX, SH/2, -RD/2+0.02); scene.add(shBack);
      const shSide = new THREE.Mesh(new THREE.PlaneGeometry(SD, SH), shWallMat);
      shSide.rotation.y = -Math.PI/2; shSide.position.set(RW/2-0.02, SH/2, SZ); scene.add(shSide);
      // Shower floor niche
      const shFloor = new THREE.Mesh(new THREE.PlaneGeometry(SW, SD), new THREE.MeshPhysicalMaterial({map:marbleSlab(512,512,"#C8C4BA",0.1,1),roughness:0.35,clearcoat:0.5}));
      shFloor.rotation.x = -Math.PI/2; shFloor.position.set(SX, 0.005, SZ); scene.add(shFloor);

      // Frameless glass panels — matte black frames
      const shGlassMat = new THREE.MeshPhysicalMaterial({color:0xD8E8E8,transparent:true,opacity:0.14,roughness:0.02,metalness:0,transmission:0.94,ior:1.5,side:THREE.DoubleSide});
      // Front glass
      const shGlassFront = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH*0.98), shGlassMat);
      shGlassFront.position.set(SX, SH*0.49, SZ+SD/2); scene.add(shGlassFront);
      // Side glass
      const shGlassSide = new THREE.Mesh(new THREE.PlaneGeometry(SD, SH*0.98), shGlassMat);
      shGlassSide.rotation.y = Math.PI/2; shGlassSide.position.set(SX-SW/2, SH*0.49, SZ); scene.add(shGlassSide);
      // Black frame posts
      for (const [gx,gz,ry] of [
        [SX-SW/2, SZ+SD/2, 0], [SX+SW/2, SZ+SD/2, 0],
        [SX-SW/2, SZ-SD/2, 0],
      ] as [number,number,number][]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.028, SH, 0.028), blackMat);
        post.position.set(gx, SH/2, gz); post.rotation.y = ry; scene.add(post);
      }
      // Top rails
      const shTopFront = new THREE.Mesh(new THREE.BoxGeometry(SW+0.028, 0.028, 0.028), blackMat);
      shTopFront.position.set(SX, SH-0.014, SZ+SD/2); scene.add(shTopFront);
      const shTopSide = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.028, SD), blackMat);
      shTopSide.position.set(SX-SW/2, SH-0.014, SZ); scene.add(shTopSide);

      // Shower fixtures — matte black
      // Rain head (ceiling-mount)
      const rainArm = new THREE.Mesh(new THREE.CylinderGeometry(0.016,0.016,0.28,24), blackMat);
      rainArm.position.set(SX-0.4, SH-0.14, -RD/2+0.9); scene.add(rainArm);
      const rainHead = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.22,0.03,48), blackMat);
      rainHead.position.set(SX-0.4, SH-0.3, -RD/2+0.9); scene.add(rainHead);
      // Hand shower on side wall
      const hsPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.014,0.014,0.6,20), blackMat);
      hsPipe.rotation.z = Math.PI/2; hsPipe.position.set(RW/2-0.35, 1.3, -RD/2+0.7); scene.add(hsPipe);
      // Valve
      const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.038,0.038,0.05,32), blackMat);
      valve.rotation.z = Math.PI/2; valve.position.set(RW/2-0.08, 1.1, SZ+0.5); scene.add(valve);

      // Shower niche shelf
      const nicheMat = new THREE.MeshStandardMaterial({color:0xD0CABC, roughness:0.7});
      const niche = new THREE.Mesh(new THREE.BoxGeometry(0.7,0.65,0.18), nicheMat);
      niche.position.set(SX+0.5, 1.5, -RD/2+0.1); scene.add(niche);
      for (const sy of [1.2, 1.56]) { const sh2 = new THREE.Mesh(new THREE.BoxGeometry(0.68,0.02,0.16), new THREE.MeshPhysicalMaterial({map:marbleSlab(128,64,"#D8D2C6"),roughness:0.3,clearcoat:0.5})); sh2.position.set(SX+0.5,sy,-RD/2+0.1); scene.add(sh2); }
      const pColors = [0xB4CAD0,0xD4B8D0,0xC8D4B0,0xD0C4A8];
      for (let i=0;i<4;i++) {
        const bot = new THREE.Mesh(new THREE.CylinderGeometry(0.044,0.044,0.2+Math.random()*0.08,24), new THREE.MeshStandardMaterial({color:pColors[i],roughness:0.5}));
        bot.position.set(SX+0.3+(i%2)*0.2, [1.28,1.28,1.65,1.65][i], -RD/2+0.08); scene.add(bot);
      }

      // ─── FREESTANDING OVAL TUB ──────────────────────────────────────────────
      // Elegant egg-shaped tub — left of center, z forward area
      const TX = -1.8, TZ = 1.8;
      // Build with LatheGeometry for smooth oval profile
      const tubProfilePts: T.Vector2[] = [];
      for (let i = 0; i <= 24; i++) {
        const t = i/24;
        // Profile: flat bottom, curved sides, slight inward rim
        const angle = t * Math.PI;
        const r = Math.sin(angle) * 0.52 + (1-Math.sin(angle*0.5))*0.08;
        const y = t * 0.62;
        tubProfilePts.push(new THREE.Vector2(r, y));
      }
      const tubGeo = new THREE.LatheGeometry(tubProfilePts, 64);
      const tubMat = new THREE.MeshPhysicalMaterial({
        color: 0xF8F5F0, roughness: 0.12, metalness: 0,
        clearcoat: 0.85, clearcoatRoughness: 0.06,
      });
      const tubMesh = new THREE.Mesh(tubGeo, tubMat);
      // Stretch oval shape by scaling Z
      tubMesh.scale.set(1, 1, 1.75);
      tubMesh.position.set(TX, 0, TZ);
      tubMesh.castShadow = true; tubMesh.receiveShadow = true;
      scene.add(tubMesh);
      // Tub interior (hollow bowl)
      const tubInnerPts: T.Vector2[] = [];
      for (let i = 0; i <= 20; i++) {
        const t = i/20;
        const angle = t * Math.PI;
        const r = Math.sin(angle) * 0.46 + (1-Math.sin(angle*0.5))*0.04;
        const y = 0.06 + t * 0.5;
        tubInnerPts.push(new THREE.Vector2(r, y));
      }
      const tubInner = new THREE.Mesh(
        new THREE.LatheGeometry(tubInnerPts, 64),
        new THREE.MeshPhysicalMaterial({color:0xEDE8E0, roughness:0.18, clearcoat:0.6})
      );
      tubInner.scale.set(0.98, 1, 1.72); tubInner.position.set(TX, 0.01, TZ); scene.add(tubInner);
      // Water surface
      const waterSurf = new THREE.Mesh(
        new THREE.EllipseCurve ? new THREE.PlaneGeometry(0.84, 1.52, 1, 1) : new THREE.PlaneGeometry(0.84, 1.52),
        new THREE.MeshPhysicalMaterial({color:0xC8DCE4,transparent:true,opacity:0.38,roughness:0.04,metalness:0,transmission:0.3})
      );
      waterSurf.rotation.x = -Math.PI/2; waterSurf.position.set(TX, 0.52, TZ); scene.add(waterSurf);
      // Tub filler — floor-mounted, matte black + brass
      const fillerBase = new THREE.Mesh(new THREE.CylinderGeometry(0.028,0.028,0.55,24), blackMat);
      fillerBase.position.set(TX+0.1, 0.275, TZ-0.9); scene.add(fillerBase);
      const fillerSpout = new THREE.Mesh(new THREE.TorusGeometry(0.09,0.016,16,32,Math.PI*0.75), blackMat);
      fillerSpout.rotation.set(0, -Math.PI/4, Math.PI/2); fillerSpout.position.set(TX+0.1, 0.56, TZ-0.82); scene.add(fillerSpout);

      // ─── FLOATING WALNUT VANITY (right wall) ────────────────────────────────
      const VX = RW/2, VZ = -1.0, VW = 4.4, VHc = 0.88, VDEPTH = 0.52;
      const walnutMat = new THREE.MeshStandardMaterial({color:0x4A2E18, roughness:0.55, metalness:0.0});
      const walnutFaceMat = new THREE.MeshStandardMaterial({color:0x5A3820, roughness:0.5, metalness:0.0});

      // Cabinet body — floating (gap at bottom)
      const cab = new THREE.Mesh(new THREE.BoxGeometry(VDEPTH, VHc-0.06, VW), walnutMat);
      cab.position.set(VX - VDEPTH/2, VHc/2 + 0.18, VZ); scene.add(cab);
      cab.castShadow = true;

      // Door fronts (three panels with thin black pulls)
      for (let d = 0; d < 3; d++) {
        const dz = VZ - VW/2 + VW/6 + d*(VW/3);
        const door = new THREE.Mesh(new THREE.BoxGeometry(0.015, VHc-0.1, VW/3-0.06), walnutFaceMat);
        door.position.set(VX-VDEPTH+0.008, VHc/2+0.18, dz); scene.add(door);
        // Thin black recessed pull
        const pull = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.014, 0.22), blackMat);
        pull.position.set(VX-VDEPTH-0.004, VHc/2+0.18, dz); scene.add(pull);
      }

      // Marble countertop
      const ctrTex = marbleSlab(1024, 512, "#EDE8DF", 0.12, 0.6);
      const ctrMat = new THREE.MeshPhysicalMaterial({ map: ctrTex, roughness:0.16, metalness:0, clearcoat:0.7, clearcoatRoughness:0.08 });
      const ctr = new THREE.Mesh(new THREE.BoxGeometry(VDEPTH+0.06, 0.028, VW+0.06), ctrMat);
      ctr.position.set(VX - VDEPTH/2, VHc + 0.18 + 0.014, VZ); scene.add(ctr);

      // Vessel basins — two round white ceramic bowls
      for (const dz of [-VW/4, VW/4]) {
        const basinGeo = new THREE.LatheGeometry(
          Array.from({length:16},(_,i)=>{ const t=i/15; return new THREE.Vector2(Math.sin(t*Math.PI)*0.19+0.01, t*0.14); }),
          48
        );
        const basin = new THREE.Mesh(basinGeo, new THREE.MeshPhysicalMaterial({color:0xF8F5F0,roughness:0.1,clearcoat:0.8,clearcoatRoughness:0.06}));
        basin.position.set(VX-VDEPTH*0.5, VHc+0.18+0.028, VZ+dz); basin.castShadow = true; scene.add(basin);
        // Basin interior
        const inner = new THREE.Mesh(
          new THREE.LatheGeometry(Array.from({length:12},(_,i)=>{ const t=i/11; return new THREE.Vector2(Math.sin(t*Math.PI)*0.16+0.01,0.02+t*0.11); }), 40),
          new THREE.MeshPhysicalMaterial({color:0xEEEBE2,roughness:0.14,clearcoat:0.5})
        );
        inner.position.set(VX-VDEPTH*0.5, VHc+0.18+0.03, VZ+dz); scene.add(inner);
        // Wall-mount faucet — matte black + warm brass spout tip
        const fBody = new THREE.Mesh(new THREE.CylinderGeometry(0.016,0.016,0.14,24), blackMat);
        fBody.rotation.z = Math.PI/2; fBody.position.set(VX-0.08, VHc+0.52, VZ+dz); scene.add(fBody);
        const fSpout = new THREE.Mesh(new THREE.CylinderGeometry(0.013,0.013,0.22,24), blackMat);
        fSpout.position.set(VX-0.19, VHc+0.6, VZ+dz-0.03); scene.add(fSpout);
        const fTip = new THREE.Mesh(new THREE.CylinderGeometry(0.016,0.013,0.025,24), bm.clone());
        fTip.position.set(VX-0.19, VHc+0.49, VZ+dz-0.03); scene.add(fTip);
        // Handles (two levers)
        for (const hd of [-0.06, 0.06]) {
          const handle = new THREE.Mesh(new THREE.BoxGeometry(0.08,0.012,0.012), blackMat);
          handle.position.set(VX-0.08, VHc+0.52, VZ+dz+hd); scene.add(handle);
        }
      }

      // Large framed mirror — full vanity width, LED lit
      const mirrorGeo = new THREE.PlaneGeometry(VW-0.1, 1.05);
      const mirrorMat = new THREE.MeshStandardMaterial({color:0xD8E8F0,roughness:0.02,metalness:0.95,envMapIntensity:1.2});
      const mirror = new THREE.Mesh(mirrorGeo, mirrorMat);
      mirror.rotation.y = -Math.PI/2; mirror.position.set(VX-0.025, VHc+0.88, VZ); scene.add(mirror);
      // Mirror frame (thin brass)
      for (const [fw,fh,fy,fz] of [
        [VW-0.1+0.08, 0.025, VHc+0.88+0.525+0.012, VZ],
        [VW-0.1+0.08, 0.025, VHc+0.88-0.525-0.012, VZ],
        [0.025, 1.05+0.05, VHc+0.88, VZ-(VW-0.1)/2-0.025],
        [0.025, 1.05+0.05, VHc+0.88, VZ+(VW-0.1)/2+0.025],
      ] as [number,number,number,number][]) {
        const fr = new THREE.Mesh(new THREE.BoxGeometry(0.022, fh, fw), bm.clone());
        fr.rotation.y = -Math.PI/2; fr.position.set(VX-0.022, fy, fz); scene.add(fr);
      }
      // Mirror LED backlight (emissive strip behind mirror top edge)
      const ledStrip = new THREE.Mesh(new THREE.PlaneGeometry(VW-0.1, 0.04), new THREE.MeshStandardMaterial({color:0xFFF8E0,emissive:new THREE.Color(0xFFEDC0),emissiveIntensity:1.4,roughness:1}));
      ledStrip.rotation.y = -Math.PI/2; ledStrip.position.set(VX-0.022, VHc+0.88+0.52+0.025, VZ); scene.add(ledStrip);
      const mirrorLight = new THREE.PointLight(0xFFF5D0, 2.5, 5);
      mirrorLight.position.set(VX-0.3, VHc+0.88+0.6, VZ); scene.add(mirrorLight);

      // Pendant lights over vanity — two dark cylindrical pendants
      const pendantMat = new THREE.MeshStandardMaterial({color:0x1A1818, roughness:0.45, metalness:0.5});
      for (const pz of [VZ-0.95, VZ+0.95]) {
        const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006,0.006,0.65,8), new THREE.MeshStandardMaterial({color:0x2A2020,roughness:0.9}));
        cord.position.set(VX-0.18, RH-0.325, pz); scene.add(cord);
        const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.09,0.2,32), pendantMat);
        shade.position.set(VX-0.18, RH-0.72, pz); scene.add(shade);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045,20,20), new THREE.MeshStandardMaterial({color:0xFFF8DC,emissive:new THREE.Color(0xFFE890),emissiveIntensity:2.2,roughness:0.4}));
        bulb.position.set(VX-0.18, RH-0.72, pz); scene.add(bulb);
        const pendPt = new THREE.PointLight(0xFFE8A0, 1.8, 3.5);
        pendPt.position.set(VX-0.3, RH-0.75, pz); scene.add(pendPt);
      }

      // Small accessories on counter
      for (const [az,h,r] of [[-VW/4-0.3,0.14,0.04],[VW/4+0.3,0.11,0.038]] as [number,number,number][]) {
        const acc = new THREE.Mesh(new THREE.CylinderGeometry(r,r*0.9,h,24), new THREE.MeshStandardMaterial({color:0x1E2820,roughness:0.5}));
        acc.position.set(VX-VDEPTH*0.6, VHc+0.18+0.028+h/2, VZ+az); scene.add(acc);
      }
      // Towel on counter edge
      const towelMat = new THREE.MeshStandardMaterial({color:0xE8E0D4, roughness:0.95});
      const towelFold = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.38), towelMat);
      towelFold.position.set(VX-VDEPTH-0.03, VHc+0.18+0.038, VZ+VW/4-0.4); scene.add(towelFold);

      // ─── HEATED TOWEL RAIL (back wall, center) ──────────────────────────────
      const trZ = -RD/2+0.06, trX = 2.0, trH = 1.1, trW = 0.6;
      const railMat = new THREE.MeshStandardMaterial({color:0xD0C8BC, roughness:0.4, metalness:0.3});
      // Vertical bars (ladder)
      for (const rx of [trX-trW/2, trX+trW/2]) {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.016,0.016,trH,20), railMat);
        bar.position.set(rx, trH/2+0.4, trZ); scene.add(bar);
      }
      // Horizontal rungs (7 rungs)
      for (let i = 0; i < 7; i++) {
        const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.012,trW,16), railMat);
        rung.rotation.z = Math.PI/2; rung.position.set(trX, 0.42+i*0.17, trZ); scene.add(rung);
      }
      // Towel draped over rail
      const drapeMat = new THREE.MeshStandardMaterial({color:0xDDD5C8, roughness:0.98});
      const drape = new THREE.Mesh(new THREE.BoxGeometry(trW+0.1, 0.02, 0.44), drapeMat);
      drape.position.set(trX, 0.42+3*0.17, trZ+0.08); scene.add(drape);

      // ─── PLANT (back-left corner) ────────────────────────────────────────────
      const PX = -RW/2+0.6, PZ = RD/2-0.7;
      const plantPot = new THREE.Mesh(new THREE.CylinderGeometry(0.19,0.14,0.42,32), new THREE.MeshStandardMaterial({color:0x8A8070,roughness:0.9}));
      plantPot.position.set(PX,0.21,PZ); plantPot.castShadow = true; scene.add(plantPot);
      const stm = new THREE.Mesh(new THREE.CylinderGeometry(0.022,0.022,1.9,16), new THREE.MeshStandardMaterial({color:0x4A5C32,roughness:0.9}));
      stm.position.set(PX,1.37,PZ); scene.add(stm);
      const lc=[0x6A8858,0x5A7848,0x7A9068,0x648050,0x5C7040];
      for (let i=0;i<10;i++) {
        const a=(i/10)*Math.PI*2, h2=0.4+(i/10)*1.5;
        const lf=new THREE.Mesh(new THREE.PlaneGeometry(0.5+Math.random()*0.3,0.11), new THREE.MeshStandardMaterial({color:lc[i%5],roughness:0.85,side:THREE.DoubleSide}));
        lf.position.set(PX+Math.cos(a)*0.3,0.4+h2,PZ+Math.sin(a)*0.3);
        lf.rotation.set(Math.random()*0.3-0.15,a+Math.PI/2,Math.PI/10+Math.random()*0.2); scene.add(lf);
      }

      // Small decorative vase (vanity area, back wall)
      const vaseMat = new THREE.MeshStandardMaterial({color:0x8A7060,roughness:0.7});
      const vase = new THREE.Mesh(new THREE.LatheGeometry([
        new THREE.Vector2(0.04,0), new THREE.Vector2(0.07,0.1),
        new THREE.Vector2(0.1,0.25), new THREE.Vector2(0.07,0.42),
        new THREE.Vector2(0.045,0.5),
      ],32), vaseMat);
      vase.position.set(0, 0, -RD/2+0.08); scene.add(vase);
      // Dried stems in vase
      const stemMat = new THREE.MeshStandardMaterial({color:0x706050,roughness:0.9});
      for (let i=0;i<4;i++) {
        const st = new THREE.Mesh(new THREE.CylinderGeometry(0.004,0.004,0.65+Math.random()*0.3,8), stemMat);
        st.rotation.z = (Math.random()-0.5)*0.4; st.position.set((Math.random()-0.5)*0.05, 0.5+0.3+st.geometry.parameters.height/2*Math.cos(st.rotation.z), -RD/2+0.08); scene.add(st);
      }

      // ─── DASHBOARD BOARD (back wall, left section) ──────────────────────────
      const boardW = 2.1, boardH = 1.4;
      const boardBX = -2.2, boardBY = 2.05;
      const boardC = document.createElement("canvas"); boardC.width = 512; boardC.height = 342;
      const bctx = boardC.getContext("2d")!;
      const boardGrad = bctx.createLinearGradient(0,0,512,342);
      boardGrad.addColorStop(0,"#1E1A15"); boardGrad.addColorStop(1,"#17130E");
      bctx.fillStyle = boardGrad; bctx.fillRect(0,0,512,342);
      bctx.strokeStyle = "rgba(200,168,106,0.18)"; bctx.lineWidth = 1.5;
      bctx.strokeRect(13,13,486,316);
      const wi = wallInfo ?? { greeting: "Your routine", chips: [], routineLines: [] };
      bctx.font = "italic 300 29px 'Georgia', serif";
      bctx.fillStyle = "#E8D090"; bctx.textAlign = "center";
      bctx.fillText(wi.greeting, 256, 55);
      bctx.strokeStyle = "rgba(200,168,106,0.45)"; bctx.lineWidth = 1;
      bctx.beginPath(); bctx.moveTo(80,68); bctx.lineTo(432,68); bctx.stroke();
      bctx.beginPath(); bctx.moveTo(140,64); bctx.lineTo(372,64); bctx.stroke();
      let bCx = 26, bCy = 95;
      bctx.font = "500 11px 'Arial', sans-serif";
      for (const chip of wi.chips.slice(0,4)) {
        const tw = bctx.measureText(chip).width + 20;
        if (bCx + tw > 486) { bCx = 26; bCy += 27; }
        bctx.fillStyle = "rgba(200,168,106,0.09)";
        bctx.beginPath(); (bctx as CanvasRenderingContext2D & {roundRect?:(x:number,y:number,w:number,h:number,r:number)=>void}).roundRect?.(bCx, bCy-14, tw, 22, 11); bctx.fill();
        bctx.strokeStyle = "rgba(200,168,106,0.5)"; bctx.lineWidth = 0.9;
        bctx.beginPath(); (bctx as CanvasRenderingContext2D & {roundRect?:(x:number,y:number,w:number,h:number,r:number)=>void}).roundRect?.(bCx, bCy-14, tw, 22, 11); bctx.stroke();
        bctx.fillStyle = "rgba(218,192,132,0.9)"; bctx.fillText(chip, bCx+10, bCy+2);
        bCx += tw + 9;
      }
      const bRy = Math.max(bCy + 24, 130);
      bctx.strokeStyle = "rgba(200,168,106,0.16)"; bctx.lineWidth = 1;
      bctx.beginPath(); bctx.moveTo(26,bRy); bctx.lineTo(486,bRy); bctx.stroke();
      bctx.textAlign = "left"; let bLy = bRy + 20;
      for (const line of wi.routineLines.slice(0,4)) {
        bctx.fillStyle = "rgba(200,168,106,0.55)"; bctx.fillRect(26, bLy-10, 2.5, 13);
        const colon = line.indexOf(":");
        if (colon > -1) {
          bctx.font = "600 11px 'Arial', sans-serif"; bctx.fillStyle = "rgba(230,208,158,0.95)";
          bctx.fillText(line.slice(0, colon+1), 36, bLy);
          bctx.font = "11px 'Arial', sans-serif"; bctx.fillStyle = "rgba(198,182,148,0.7)";
          const rest = line.slice(colon+1).trim();
          let wrd = ""; let bWx = 36 + bctx.measureText(line.slice(0,colon+1)).width + 7;
          for (const w of rest.split(" ")) {
            const test = wrd + (wrd?" ":"") + w;
            if (bWx + bctx.measureText(test).width > 480) { bctx.fillText(wrd, bWx, bLy); bLy+=14; wrd=w; bWx=36; } else { wrd=test; }
          }
          if (wrd) bctx.fillText(wrd, bWx, bLy);
        } else {
          bctx.font = "11px 'Arial', sans-serif"; bctx.fillStyle = "rgba(208,190,152,0.82)";
          bctx.fillText(line, 36, bLy);
        }
        bLy += 25; if (bLy > 310) break;
      }
      bctx.font = "10px 'Arial', sans-serif"; bctx.fillStyle = "rgba(200,168,106,0.35)";
      bctx.textAlign = "center"; bctx.fillText("tap to open your dashboard  →", 256, 330);
      const boardTex = new THREE.CanvasTexture(boardC);
      const boardMesh = new THREE.Mesh(new THREE.PlaneGeometry(boardW, boardH),
        new THREE.MeshStandardMaterial({map:boardTex, roughness:0.88, metalness:0}));
      boardMesh.rotation.y = Math.PI;
      boardMesh.position.set(boardBX, boardBY, -RD/2+0.025);
      scene.add(boardMesh);
      for (const [fw,fh,fx,fy] of [
        [boardW+0.07, 0.03, boardBX, boardBY+boardH/2+0.015],
        [boardW+0.07, 0.03, boardBX, boardBY-boardH/2-0.015],
        [0.03, boardH+0.06, boardBX-boardW/2-0.015, boardBY],
        [0.03, boardH+0.06, boardBX+boardW/2+0.015, boardBY],
      ] as [number,number,number,number][]) {
        const frm = new THREE.Mesh(new THREE.BoxGeometry(fw,fh,0.03), bm.clone());
        frm.position.set(fx,fy,-RD/2+0.018); scene.add(frm);
      }

      // ─── HOTSPOTS ───────────────────────────────────────────────────────────
      const hotspots: {mesh: T.Mesh; id:"shower"|"vanity"|"dashboard"}[] = [];
      for (const {id,px,py,pz,label,ry} of [
        {id:"shower"    as const, px:SX-0.5, py:1.4, pz:SZ+1.0, label:"Shower",  ry:0},
        {id:"vanity"    as const, px:VX-1.0, py:1.4, pz:VZ+0.5, label:"Vanity",  ry:-Math.PI/2},
        {id:"dashboard" as const, px:boardBX, py:1.4, pz:-RD/2+0.7, label:"Routine", ry:Math.PI},
      ]) {
        const mat=new THREE.MeshBasicMaterial({map:hotspotTex(label),transparent:true,depthWrite:false,side:THREE.DoubleSide});
        const mesh=new THREE.Mesh(new THREE.PlaneGeometry(0.7,0.7),mat);
        mesh.position.set(px,py,pz); mesh.rotation.y=ry;
        mesh.userData.id=id;
        scene.add(mesh); hotspots.push({mesh,id});
      }

      // ─── INPUT ───────────────────────────────────────────────────────────────
      const cvs = renderer.domElement;
      cvs.style.cursor = "grab";
      const ray=new THREE.Raycaster();
      const mp=new THREE.Vector2();
      let isDown=false, dragged=false, dx0=0, dy0=0, lx=0, ly=0;
      const onDown = (e:PointerEvent) => {isDown=true;dragged=false;dx0=e.clientX;dy0=e.clientY;lx=e.clientX;ly=e.clientY; cvs.setPointerCapture(e.pointerId);};
      const onMove = (e:PointerEvent) => {
        if(!isDown) return;
        if(Math.hypot(e.clientX-dx0,e.clientY-dy0)>6) dragged=true;
        yaw  -= (e.clientX-lx)*0.0026;
        pitch = Math.max(-Math.PI/2.6, Math.min(Math.PI/2.6, pitch-(e.clientY-ly)*0.0026));
        lx=e.clientX; ly=e.clientY;
      };
      const onUp = (e:PointerEvent) => {
        if(!dragged){
          const r=cvs.getBoundingClientRect();
          mp.x=((e.clientX-r.left)/r.width)*2-1; mp.y=-((e.clientY-r.top)/r.height)*2+1;
          ray.setFromCamera(mp,cam);
          const hits=ray.intersectObjects(hotspots.map(h=>h.mesh));
          if(hits.length) onHotspotRef.current(hits[0].object.userData.id as "shower"|"vanity"|"dashboard");
        }
        isDown=false;
      };
      const onMov2 = (e:MouseEvent) => {
        if(isDown) return;
        const r=cvs.getBoundingClientRect();
        mp.x=((e.clientX-r.left)/r.width)*2-1; mp.y=-((e.clientY-r.top)/r.height)*2+1;
        ray.setFromCamera(mp,cam);
        const hits=ray.intersectObjects(hotspots.map(h=>h.mesh));
        cvs.style.cursor=hits.length?"pointer":"grab";
        const hid = hits.length ? hits[0].object.userData.id : null;
        setHint(hid==="shower"?"Shower":hid==="vanity"?"Vanity":hid==="dashboard"?"My Routine":null);
      };
      cvs.addEventListener("pointerdown",onDown); cvs.addEventListener("pointermove",onMove);
      cvs.addEventListener("pointerup",onUp); cvs.addEventListener("mousemove",onMov2);

      // ─── ANIMATE ─────────────────────────────────────────────────────────────
      try { localStorage.setItem('__bscene_step','before-animate'); } catch{}
      let t=0;
      const animate = () => {
        rafRef.current=requestAnimationFrame(animate); t+=0.016;
        const dir=new THREE.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));
        cam.lookAt(cam.position.clone().add(dir));
        // Subtle pulse on hotspots
        hotspots.forEach(({mesh})=>{mesh.lookAt(cam.position);mesh.scale.setScalar(1+Math.sin(t*2.1)*0.06);});
        // Very gentle cove flicker
        downLights.forEach((dl,i)=>{ dl.intensity = 2.2 + Math.sin(t*0.4+i)*0.04; });
        renderer.render(scene,cam);
      };
      animate();

      const onResize = () => {
        const nw=elDiv.clientWidth||window.innerWidth, nh=elDiv.clientHeight||window.innerHeight;
        cam.aspect=nw/nh; cam.updateProjectionMatrix(); renderer.setSize(nw,nh);
      };
      window.addEventListener("resize",onResize);

      (elDiv as HTMLElement & {_cleanup?:()=>void})._cleanup=()=>{
        cancelAnimationFrame(rafRef.current);
        cvs.removeEventListener("pointerdown",onDown); cvs.removeEventListener("pointermove",onMove);
        cvs.removeEventListener("pointerup",onUp); cvs.removeEventListener("mousemove",onMov2);
        window.removeEventListener("resize",onResize);
        renderer.dispose();
        if(elDiv.contains(cvs)) elDiv.removeChild(cvs);
      };
      } catch(err) {
        const msg = err instanceof Error ? err.stack || err.message : String(err);
        console.error('[BathroomScene3D] scene init error:', err);
        try { localStorage.setItem('__bscene_err', msg); } catch{}
      }
    }).catch(err => {
      const msg = err instanceof Error ? err.stack || err.message : String(err);
      console.error('[BathroomScene3D] import error:', err);
      try { localStorage.setItem('__bscene_err', 'IMPORT:' + msg); } catch{}
    });
  }, [wallInfo]);

  useEffect(() => {
    initScene();
    return () => {
      const el = mountRef.current;
      if (!el) return;
      const c=(el as HTMLElement & {_cleanup?:()=>void})._cleanup;
      if(c) c();
    };
  }, [initScene]);

  return (
    <div style={{ position:"relative", width:"100%", height: fullViewport ? "100%" : undefined, background:"#F0EBE2" }}>
      <div ref={mountRef} style={{ width:"100%", height: fullViewport ? "100%" : undefined, display:"block" }} />

      <div style={{
        position:"absolute", bottom: hud ? 90 : 20, left:"50%", transform:"translateX(-50%)",
        fontSize:11, letterSpacing:"0.14em", textTransform:"uppercase",
        color:"rgba(200,168,106,0.9)", textShadow:"0 1px 8px rgba(0,0,0,0.4)",
        pointerEvents:"none", fontFamily:"'DM Sans',sans-serif", whiteSpace:"nowrap",
      }}>drag to look around · tap a glowing ring to open</div>

      {hint && (
        <div style={{
          position:"absolute", top:24, left:"50%", transform:"translateX(-50%)",
          background:"rgba(28,22,18,0.75)", backdropFilter:"blur(10px)",
          color:"#E8D090", fontSize:12, letterSpacing:"0.12em", textTransform:"uppercase",
          padding:"7px 20px", borderRadius:100, border:"1px solid rgba(200,168,106,0.4)",
          fontFamily:"'DM Sans',sans-serif", pointerEvents:"none", whiteSpace:"nowrap",
        }}>{hint}</div>
      )}

      {hud && (
        <div style={{
          position:"absolute", bottom:0, left:0, right:0,
          padding:"20px 28px 32px",
          background:"linear-gradient(to top, rgba(18,13,10,0.78) 0%, rgba(18,13,10,0.0) 100%)",
          display:"flex", alignItems:"flex-end", justifyContent:"space-between", gap:16,
          pointerEvents:"none",
        }}>
          <div>
            {hud.hasPrice && (
              <div style={{
                fontSize:30, fontWeight:300, color:"#F8F3EC",
                fontFamily:"'Cormorant Garamond',Georgia,serif",
                letterSpacing:"0.02em", lineHeight:1, textShadow:"0 2px 12px rgba(0,0,0,0.5)",
              }}>${hud.total.toFixed(2)}</div>
            )}
            <div style={{
              fontSize:11, letterSpacing:"0.12em", textTransform:"uppercase",
              color:"rgba(210,195,170,0.85)", marginTop:5,
              fontFamily:"'DM Sans',sans-serif", textShadow:"0 1px 6px rgba(0,0,0,0.5)",
            }}>{hud.checkedCount} of {hud.totalCount} checked off</div>
          </div>
          <div style={{ display:"flex", gap:10, pointerEvents:"all" }}>
            <button type="button" onClick={hud.onShare} style={{
              padding:"11px 24px", borderRadius:100,
              border:"1.5px solid rgba(255,255,255,0.22)",
              background:"rgba(255,255,255,0.09)", backdropFilter:"blur(14px)",
              cursor:"pointer", fontSize:12, fontWeight:500,
              letterSpacing:"0.07em", fontFamily:"'DM Sans',sans-serif", color:"#F8F3EC", whiteSpace:"nowrap",
            }}>Share shelf</button>
            <button type="button" onClick={hud.onShopAll} style={{
              padding:"11px 24px", borderRadius:100, border:"none",
              background:"rgba(200,168,106,0.9)", backdropFilter:"blur(8px)",
              cursor:"pointer", fontSize:12, fontWeight:500,
              letterSpacing:"0.07em", fontFamily:"'DM Sans',sans-serif", color:"#1A1410", whiteSpace:"nowrap",
            }}>Shop all</button>
          </div>
        </div>
      )}
    </div>
  );
}
