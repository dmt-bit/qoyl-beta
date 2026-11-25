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

      const marbleTex = (w: number, h: number, tileDiv: number, baseColor: string, groutColor: string): T.CanvasTexture => {
        const c = document.createElement("canvas"); c.width = w; c.height = h;
        const ctx = c.getContext("2d")!;
        // Richer base gradient
        const bg = ctx.createLinearGradient(0, 0, w*0.6, h);
        bg.addColorStop(0, baseColor);
        bg.addColorStop(0.4, baseColor);
        bg.addColorStop(0.7, shiftBrightness(baseColor, -8));
        bg.addColorStop(1, shiftBrightness(baseColor, 6));
        ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
        // Layered marble veining: faint background wash + fine foreground lines
        for (let pass = 0; pass < 2; pass++) {
          const count = pass === 0 ? 5 : 9;
          for (let i = 0; i < count; i++) {
            ctx.beginPath();
            const alpha = pass === 0 ? (0.12 + Math.random()*0.18) : (0.06 + Math.random()*0.12);
            const warm = i % 3 === 0;
            ctx.strokeStyle = warm ? `rgba(160,138,110,${alpha})` : `rgba(130,118,98,${alpha})`;
            ctx.lineWidth = pass === 0 ? (1.5 + Math.random()*2.5) : (0.5 + Math.random()*1.0);
            let x = Math.random()*w, y = Math.random()*h;
            ctx.moveTo(x, y);
            const steps = 4 + Math.floor(Math.random()*4);
            for (let s = 0; s < steps; s++) {
              const nx = x + (Math.random()-0.5)*w*0.5;
              const ny = y + (Math.random()-0.5)*h*0.5;
              const cpx = (x+nx)/2 + (Math.random()-0.5)*w*0.15;
              const cpy = (y+ny)/2 + (Math.random()-0.5)*h*0.15;
              ctx.quadraticCurveTo(cpx, cpy, nx, ny);
              x = nx; y = ny;
            }
            ctx.stroke();
          }
        }
        // Subtle noise overlay
        const imgData = ctx.getImageData(0, 0, w, h);
        for (let p = 0; p < imgData.data.length; p += 4) {
          const n = (Math.random()-0.5)*6;
          imgData.data[p]   = Math.max(0, Math.min(255, imgData.data[p]   + n));
          imgData.data[p+1] = Math.max(0, Math.min(255, imgData.data[p+1] + n));
          imgData.data[p+2] = Math.max(0, Math.min(255, imgData.data[p+2] + n));
        }
        ctx.putImageData(imgData, 0, 0);
        // Grout lines with slight bevel
        const ts = w / tileDiv;
        ctx.strokeStyle = groutColor; ctx.lineWidth = 3;
        for (let x = 0; x <= w; x += ts) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
        for (let y = 0; y <= h; y += ts) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
        // Bright grout highlight (simulate bevel)
        ctx.strokeStyle = "rgba(255,252,245,0.4)"; ctx.lineWidth = 1;
        for (let x = 1; x <= w; x += ts) { ctx.beginPath(); ctx.moveTo(x+1,0); ctx.lineTo(x+1,h); ctx.stroke(); }
        for (let y = 1; y <= h; y += ts) { ctx.beginPath(); ctx.moveTo(0,y+1); ctx.lineTo(w,y+1); ctx.stroke(); }
        const t = new THREE.CanvasTexture(c);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        return t;
      }
      // Helper: lighten or darken a hex colour by delta (±)
      const shiftBrightness = (hex: string, delta: number): string => {
        const n = parseInt(hex.replace("#",""), 16);
        const r = Math.max(0, Math.min(255, (n>>16) + delta));
        const g = Math.max(0, Math.min(255, ((n>>8)&0xff) + delta));
        const b = Math.max(0, Math.min(255, (n&0xff) + delta));
        return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`;
      }

      const brassTex = (): T.CanvasTexture => {
        const c = document.createElement("canvas"); c.width = 128; c.height = 8;
        const ctx = c.getContext("2d")!;
        const g = ctx.createLinearGradient(0,0,128,0);
        g.addColorStop(0,"#6A4C1E"); g.addColorStop(0.25,"#C4A462"); g.addColorStop(0.5,"#EED088"); g.addColorStop(0.75,"#C4A462"); g.addColorStop(1,"#8A6228");
        ctx.fillStyle = g; ctx.fillRect(0,0,128,8);
        return new THREE.CanvasTexture(c);
      }

      const hotspotTex = (label: string): T.CanvasTexture => {
        const c = document.createElement("canvas"); c.width = 256; c.height = 256;
        const ctx = c.getContext("2d")!;
        ctx.clearRect(0,0,256,256);
        ctx.beginPath(); ctx.arc(128,128,118,0,Math.PI*2); ctx.strokeStyle="rgba(200,168,106,0.25)"; ctx.lineWidth=8; ctx.stroke();
        ctx.beginPath(); ctx.arc(128,128,80,0,Math.PI*2); ctx.strokeStyle="rgba(200,168,106,0.8)"; ctx.lineWidth=3; ctx.stroke();
        ctx.beginPath(); ctx.arc(128,128,22,0,Math.PI*2); ctx.fillStyle="rgba(200,168,106,0.9)"; ctx.fill();
        ctx.font="600 24px sans-serif"; ctx.fillStyle="rgba(220,185,110,0.95)"; ctx.textAlign="center"; ctx.fillText(label.toUpperCase(),128,218);
        return new THREE.CanvasTexture(c);
      }

      try { localStorage.setItem('__bscene_step','try-block-start'); } catch{}
      const W = elDiv.clientWidth||window.innerWidth, H = elDiv.clientHeight||window.innerHeight;
      const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2.5));
      renderer.setSize(W, H);
      renderer.shadowMap.enabled = true;
      try { localStorage.setItem('__bscene_step','renderer-created'); } catch{}
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      elDiv.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xE8E0D4);
      scene.fog = new THREE.FogExp2(0xE8E0D4, 0.012);

      const cam = new THREE.PerspectiveCamera(70, W/H, 0.05, 60);
      cam.position.set(0, 1.65, 0);
      let yaw = 0.1, pitch = -0.08;

      scene.add(new THREE.AmbientLight(0xFFF5E8, 0.55));
      const chanPt = new THREE.PointLight(0xFFE8B0, 4.5, 14, 1.4);
      chanPt.position.set(0, 3.7, -1); chanPt.castShadow = true;
      chanPt.shadow.mapSize.width = 1024; chanPt.shadow.mapSize.height = 1024;
      chanPt.shadow.camera.near = 0.1; chanPt.shadow.camera.far = 15;
      scene.add(chanPt);
      // Mirror sconce strip — warm fill from vanity wall
      const sconcePt = new THREE.PointLight(0xFFE0A0, 2.8, 5);
      sconcePt.position.set(-4.3, 2.4, -0.8); scene.add(sconcePt);
      const sconcePt2 = new THREE.PointLight(0xFFF0C0, 1.8, 5);
      sconcePt2.position.set(-4.3, 2.4, -2.5); scene.add(sconcePt2);
      // Shower area skylight feel
      const showerPt = new THREE.PointLight(0xE8F4FF, 1.4, 5);
      showerPt.position.set(2.5, 3.5, -3.5); scene.add(showerPt);
      // Back-wall board fill — illuminates the board and blank wall section
      const boardFill = new THREE.PointLight(0xFFEED8, 1.6, 6);
      boardFill.position.set(-1.5, 3.2, -2.5); scene.add(boardFill);
      scene.add(new THREE.HemisphereLight(0xFFF8F0, 0xC8B89A, 0.3));

      const RW = 9, RH = 4, RD = 9;
      const bm = new THREE.MeshStandardMaterial({ map: brassTex(), roughness:0.3, metalness:0.75 });

      const addWall = (geo: T.BufferGeometry, mat: T.Material, x: number, y: number, z: number, ry = 0) => {
        const m = new THREE.Mesh(geo, mat); m.rotation.y = ry;
        m.position.set(x,y,z); m.receiveShadow = true; scene.add(m); return m;
      }

      const wallTex = marbleTex(1024,1024,6,"#EAE4DC","rgba(200,188,170,0.9)"); wallTex.repeat.set(2,1);
      const floorTex = marbleTex(1024,1024,4,"#D8D0C4","rgba(188,175,158,0.95)"); floorTex.repeat.set(3,3);
      const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness:0.72, metalness:0 });
      const floorMat = new THREE.MeshPhysicalMaterial({
        map: floorTex, roughness:0.28, metalness:0.02,
        clearcoat:0.35, clearcoatRoughness:0.18, reflectivity:0.6,
      });
      const ceilMat = new THREE.MeshStandardMaterial({ color:0xF8F4EE, roughness:0.98 });

      addWall(new THREE.PlaneGeometry(RW,RH), wallMat, 0, RH/2, -RD/2);
      addWall(new THREE.PlaneGeometry(RD,RH), wallMat, -RW/2, RH/2, 0, Math.PI/2);
      addWall(new THREE.PlaneGeometry(RD,RH), wallMat, RW/2, RH/2, 0, -Math.PI/2);
      addWall(new THREE.PlaneGeometry(RW,RD), floorMat, 0,0,0, -Math.PI/2).rotation.x = -Math.PI/2;
      addWall(new THREE.PlaneGeometry(RW,RD), ceilMat, 0,RH,0, Math.PI/2).rotation.x = Math.PI/2;

      const baseboard = (len: number, x: number, z: number, ry = 0) => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(len, 0.1, 0.03), bm.clone());
        b.rotation.y = ry; b.position.set(x, 0.05, z); scene.add(b);
      }
      baseboard(RW, 0, -RD/2+0.015);
      baseboard(RD, -RW/2+0.015, 0, Math.PI/2);
      baseboard(RD,  RW/2-0.015, 0, Math.PI/2);

      // SHOWER
      const SX = 2.75, SZ = -RD/2, SW = 3.5, SH = RH;
      const showerWallTex = marbleTex(1024,512,5,"#C8C0B4","rgba(175,162,145,0.95)"); showerWallTex.repeat.set(2,1);
      const showerWallMat = new THREE.MeshPhysicalMaterial({ map: showerWallTex, roughness:0.38, clearcoat:0.3, clearcoatRoughness:0.2 });
      addWall(new THREE.PlaneGeometry(SW, SH), showerWallMat, SX, SH/2, SZ+0.01);
      const showerSideWall = new THREE.Mesh(new THREE.PlaneGeometry(3,SH), showerWallMat);
      showerSideWall.rotation.y = -Math.PI/2; showerSideWall.position.set(SX - SW/2, SH/2, SZ+1.5); scene.add(showerSideWall);

      const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xD8ECEC, transparent: true, opacity: 0.15, roughness: 0.02, metalness: 0.0, transmission: 0.92, ior: 1.5, side: THREE.DoubleSide });
      const glassPane = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH*0.98), glassMat);
      glassPane.position.set(SX, SH*0.49, -1.5); scene.add(glassPane);
      const glassSide = new THREE.Mesh(new THREE.PlaneGeometry(3, SH*0.98), glassMat);
      glassSide.rotation.y = Math.PI/2; glassSide.position.set(SX - SW/2, SH*0.49, -3.0); scene.add(glassSide);
      for (const x of [SX - SW/2, SX, SX + SW/2]) {
        const vr = new THREE.Mesh(new THREE.BoxGeometry(0.03, SH, 0.03), bm.clone()); vr.position.set(x, SH/2, -1.5); scene.add(vr);
      }
      const topRail = new THREE.Mesh(new THREE.BoxGeometry(SW+0.03, 0.06, 0.06), bm.clone()); topRail.position.set(SX, SH-0.03, -1.5); scene.add(topRail);
      const rPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.025,0.5,32), bm.clone()); rPipe.position.set(SX-0.5, SH-0.25, SZ+0.6); scene.add(rPipe);
      const rHead = new THREE.Mesh(new THREE.CylinderGeometry(0.28,0.28,0.04,48), bm.clone()); rHead.position.set(SX-0.5, SH-0.52, SZ+0.6); scene.add(rHead);
      for (let i=0;i<9;i++) for (let j=0;j<9;j++) {
        const drop = new THREE.Mesh(new THREE.CylinderGeometry(0.004,0.004,0.18,4), new THREE.MeshStandardMaterial({color:0xBDD8E8,transparent:true,opacity:0.35}));
        drop.position.set(SX-0.5-0.24+i*0.06, SH-0.72, SZ+0.6-0.24+j*0.06); scene.add(drop);
      }
      const nicheMat = new THREE.MeshStandardMaterial({ color:0xCAC4BA, roughness:0.8 });
      const niche = new THREE.Mesh(new THREE.BoxGeometry(0.8,0.9,0.22), nicheMat); niche.position.set(SX+0.6, 1.5, SZ+0.11); scene.add(niche);
      for (const sy of [1.1, 1.52, 1.95]) { const sh = new THREE.Mesh(new THREE.BoxGeometry(0.78,0.025,0.2), bm.clone()); sh.position.set(SX+0.6, sy, SZ+0.1); scene.add(sh); }
      const pColors = [0xB4CAD0,0xD4B8D0,0xC8D4B0,0xD0C4A8,0xC5D5D8,0xDDBBB0];
      for (let i=0;i<6;i++) {
        const bot = new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.055,0.26+Math.random()*0.1,10), new THREE.MeshStandardMaterial({color:pColors[i%6],roughness:0.55}));
        bot.position.set(SX+0.3+(i%3)*0.19, [1.24,1.24,1.24,1.66,1.66,1.66][i], SZ+0.08); scene.add(bot);
      }
      const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.055,0.055,16), bm.clone()); valve.rotation.z = Math.PI/2; valve.position.set(SX-SW/2+0.08, 1.1, SZ+0.6); scene.add(valve);

      // VANITY
      const VX = -RW/2, VZ = -1.5, VW = 4.0, VHc = 0.9, VDEPTH = 0.6;
      const counterMat = new THREE.MeshPhysicalMaterial({ map: marbleTex(512,512,2,"#E8E2D8","rgba(205,190,172,0.8)"), roughness:0.22, metalness:0.02, clearcoat:0.55, clearcoatRoughness:0.12 });
      const cab = new THREE.Mesh(new THREE.BoxGeometry(VDEPTH, VHc, VW), new THREE.MeshStandardMaterial({ color:0xDDD8CE, roughness:0.7 }));
      cab.position.set(VX + VDEPTH/2, VHc/2, VZ); scene.add(cab);
      const ctr = new THREE.Mesh(new THREE.BoxGeometry(VDEPTH+0.04, 0.06, VW+0.04), counterMat); ctr.position.set(VX + VDEPTH/2, VHc+0.03, VZ); scene.add(ctr);
      for (const dz of [-VW/2+0.15, 0, VW/2-0.15]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.025,0.12,8), bm.clone()); leg.position.set(VX+VDEPTH*0.8, 0.06, VZ+dz); scene.add(leg); }
      const doorMat = new THREE.MeshStandardMaterial({ color:0xCAC3B8, roughness:0.75 });
      for (let d=0;d<3;d++) {
        const dz = VZ - VW/2 + VW/6 + d*(VW/3);
        const door = new THREE.Mesh(new THREE.BoxGeometry(0.01, VHc-0.06, VW/3-0.04), doorMat); door.position.set(VX+VDEPTH+0.005, VHc/2, dz); scene.add(door);
        const pull = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.18), bm.clone()); pull.position.set(VX+VDEPTH+0.02, VHc/2, dz); scene.add(pull);
      }
      for (const dz of [-0.9, 0.9]) {
        const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.19,0.13,48), new THREE.MeshPhysicalMaterial({ color:0xECE8E0, roughness:0.22, clearcoat:0.5, clearcoatRoughness:0.1 }));
        basin.position.set(VX+VDEPTH*0.5, VHc+0.065, VZ+dz); scene.add(basin);
        const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.17,0.16,0.09,48), new THREE.MeshPhysicalMaterial({color:0xE0DBD2,roughness:0.3,clearcoat:0.3}));
        inner.position.set(VX+VDEPTH*0.5, VHc+0.05, VZ+dz); scene.add(inner);
        const fStem = new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.018,0.38,24), bm.clone()); fStem.position.set(VX+VDEPTH*0.5, VHc+0.42, VZ+dz-0.22); scene.add(fStem);
        const fElbow = new THREE.Mesh(new THREE.TorusGeometry(0.09,0.015,16,32,Math.PI/2), bm.clone()); fElbow.rotation.z = -Math.PI/2; fElbow.rotation.y = Math.PI/2; fElbow.position.set(VX+VDEPTH*0.5, VHc+0.6, VZ+dz-0.13); scene.add(fElbow);
      }
      const mirror = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 1.4), new THREE.MeshStandardMaterial({color:0xD0E4F0,roughness:0.02,metalness:0.95,envMapIntensity:1}));
      mirror.rotation.y = Math.PI/2; mirror.position.set(VX+0.03, VHc+1.1, VZ); scene.add(mirror);
      const mHalf = 0.7, mHalfW = VW*0.42;
      for (const [fy, fh, fw, fdz] of [
        [VHc+1.1+mHalf+0.018, 0.035, mHalfW*2+0.035, VZ],
        [VHc+1.1-mHalf-0.018, 0.035, mHalfW*2+0.035, VZ],
        [VHc+1.1, 1.4+0.035, 0.035, VZ-mHalfW],
        [VHc+1.1, 1.4+0.035, 0.035, VZ+mHalfW],
      ] as [number,number,number,number][]) { const fr = new THREE.Mesh(new THREE.BoxGeometry(0.03,fh,fw), bm.clone()); fr.position.set(VX+0.03, fy, fdz); scene.add(fr); }
      for (const dz of [-mHalfW-0.3, mHalfW+0.3]) {
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07,12,12), new THREE.MeshStandardMaterial({color:0xFFF8DC,emissive:new THREE.Color(0xFFE890),emissiveIntensity:1.5,roughness:0.5}));
        bulb.position.set(VX+0.18, VHc+1.5, VZ+dz); scene.add(bulb);
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.012,0.17,8), bm.clone()); arm.rotation.z = Math.PI/2; arm.position.set(VX+0.09, VHc+1.5, VZ+dz); scene.add(arm);
      }
      for (const [dz,h] of [[-0.2,0.19],[0.0,0.14],[2.1,0.17]] as [number,number][]) {
        const acc = new THREE.Mesh(new THREE.CylinderGeometry(0.038,0.038,h,8), new THREE.MeshStandardMaterial({color:0x1E2820,roughness:0.5}));
        acc.position.set(VX+VDEPTH*0.75, VHc+h/2, VZ+dz); scene.add(acc);
      }

      // BATHTUB
      const TX = RW/2 - 0.4, TZ = 0.5;
      const tub = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.52, 2.8), new THREE.MeshPhysicalMaterial({color:0xF8F5F0,roughness:0.18,metalness:0,clearcoat:0.6,clearcoatRoughness:0.08}));
      tub.position.set(TX-0.375, 0.26, TZ); scene.add(tub);
      const rim2 = new THREE.Mesh(new THREE.BoxGeometry(0.79,0.055,2.84), new THREE.MeshStandardMaterial({color:0xEEEBE5,roughness:0.35})); rim2.position.set(TX-0.395, 0.548, TZ); scene.add(rim2);
      const tubInt = new THREE.Mesh(new THREE.BoxGeometry(0.6,0.42,2.6), new THREE.MeshStandardMaterial({color:0xEDE8E0,roughness:0.3})); tubInt.position.set(TX-0.37, 0.31, TZ); scene.add(tubInt);
      const waterSurf = new THREE.Mesh(new THREE.PlaneGeometry(0.58,2.58), new THREE.MeshStandardMaterial({color:0xB8D0DC,transparent:true,opacity:0.35,roughness:0.08}));
      waterSurf.rotation.x = -Math.PI/2; waterSurf.position.set(TX-0.37, 0.52, TZ); scene.add(waterSurf);
      const tbFMat = new THREE.MeshStandardMaterial({color:0x1A1816,roughness:0.25,metalness:0.9});
      const tbStem = new THREE.Mesh(new THREE.CylinderGeometry(0.028,0.028,0.65,12), tbFMat); tbStem.position.set(TX-0.3, 0.325, TZ-1.1); scene.add(tbStem);
      const tbArch = new THREE.Mesh(new THREE.TorusGeometry(0.14,0.02,10,20,Math.PI/1.4), tbFMat); tbArch.rotation.set(0,Math.PI/2,Math.PI/2); tbArch.position.set(TX-0.3, 0.65, TZ-1.1); scene.add(tbArch);

      // PLANT
      const PX=RW/2-0.55, PZ=-RD/2+0.55;
      const plantPot = new THREE.Mesh(new THREE.CylinderGeometry(0.21,0.16,0.38,32), new THREE.MeshStandardMaterial({color:0xADA49A,roughness:0.85})); plantPot.position.set(PX,0.19,PZ); scene.add(plantPot);
      const stm = new THREE.Mesh(new THREE.CylinderGeometry(0.028,0.028,2.0,16), new THREE.MeshStandardMaterial({color:0x506038,roughness:0.9})); stm.position.set(PX,1.38,PZ); scene.add(stm);
      const lc=[0x6A8858,0x5A7848,0x7A9068,0x648050,0x5C7040];
      for (let i=0;i<9;i++) {
        const a=(i/9)*Math.PI*2, h2=0.5+(i/9)*1.6;
        const lf=new THREE.Mesh(new THREE.PlaneGeometry(0.55+Math.random()*0.25,0.13), new THREE.MeshStandardMaterial({color:lc[i%5],roughness:0.85,side:THREE.DoubleSide}));
        lf.position.set(PX+Math.cos(a)*0.32,0.38+h2,PZ+Math.sin(a)*0.32); lf.rotation.set(Math.random()*0.3-0.15,a+Math.PI/2,Math.PI/10+Math.random()*0.25); scene.add(lf);
      }

      // CHANDELIER
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.014,0.014,0.4,16), bm.clone()); chain.position.set(0,RH-0.2,-1); scene.add(chain);
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.6,0.016,16,64), bm.clone()); ring2.position.set(0,RH-0.42,-1); scene.add(ring2);
      const bMat2 = new THREE.MeshStandardMaterial({color:0xFFF5D8,emissive:new THREE.Color(0xFFEE80),emissiveIntensity:1.8,roughness:0.4});
      for (let i=0;i<6;i++) {
        const a=(i/6)*Math.PI*2;
        const bl=new THREE.Mesh(new THREE.SphereGeometry(0.065,24,24),bMat2); bl.position.set(Math.cos(a)*0.6,RH-0.48,-1+Math.sin(a)*0.6); scene.add(bl);
        const ww=new THREE.Mesh(new THREE.CylinderGeometry(0.007,0.007,0.16,12),bm.clone()); ww.position.set(Math.cos(a)*0.6,RH-0.34,-1+Math.sin(a)*0.6); scene.add(ww);
      }
      const twl=new THREE.Mesh(new THREE.BoxGeometry(0.02,0.48,1.1),new THREE.MeshStandardMaterial({color:0xF0EBE2,roughness:0.6})); twl.position.set(RW/2-0.02,1.5,-2.2); scene.add(twl);
      const rl=new THREE.Mesh(new THREE.CylinderGeometry(0.013,0.013,1.15,10),bm.clone()); rl.rotation.z=Math.PI/2; rl.position.set(RW/2-0.02,1.76,-2.2); scene.add(rl);

      // WAINSCOTING — right wall chair rail for realism
      const wainMat = new THREE.MeshStandardMaterial({ color:0xE0D8CE, roughness:0.72 });
      const chairRail = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.06, RD), wainMat);
      chairRail.position.set(RW/2 - 0.022, 0.92, 0); scene.add(chairRail);
      // Panel mouldings on right wall (decorative rectangles)
      for (const pz of [-3.2, -1.0, 1.4]) {
        const pnl = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.75, 1.3), wainMat);
        pnl.position.set(RW/2 - 0.006, 0.46, pz); scene.add(pnl);
        // inner recessed rect
        const pnlInner = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.6, 1.1), new THREE.MeshStandardMaterial({color:0xD8D0C6, roughness:0.8}));
        pnlInner.position.set(RW/2 - 0.004, 0.46, pz); scene.add(pnlInner);
      }

      // WALL BOARD — back wall, blank left section (left of shower)
      const boardW = 2.2, boardH = 1.5;
      const boardBX = -1.5; // x center on back wall (clear of shower which starts at x≈1.0)
      const boardBY = 2.1;  // height center
      const boardC = document.createElement("canvas"); boardC.width = 512; boardC.height = 358;
      const bctx = boardC.getContext("2d")!;
      // Rich dark background with subtle warm gradient
      const boardGrad = bctx.createLinearGradient(0, 0, 512, 358);
      boardGrad.addColorStop(0, "#211C17");
      boardGrad.addColorStop(1, "#1A1510");
      bctx.fillStyle = boardGrad; bctx.fillRect(0, 0, 512, 358);
      // Thin inner border
      bctx.strokeStyle = "rgba(200,168,106,0.2)"; bctx.lineWidth = 1.5;
      bctx.strokeRect(14, 14, 484, 330);
      // Greeting
      const wi = wallInfo ?? { greeting: "Your routine", chips: [], routineLines: [] };
      bctx.font = "italic 300 30px 'Georgia', serif";
      bctx.fillStyle = "#E8D090";
      bctx.textAlign = "center";
      bctx.fillText(wi.greeting, 256, 58);
      // Gold ornament line
      bctx.strokeStyle = "rgba(200,168,106,0.5)"; bctx.lineWidth = 1;
      bctx.beginPath(); bctx.moveTo(80, 72); bctx.lineTo(432, 72); bctx.stroke();
      bctx.beginPath(); bctx.moveTo(140, 68); bctx.lineTo(372, 68); bctx.stroke();
      // Chips row
      let cx = 28, cy = 100;
      bctx.font = "500 11px 'Arial', sans-serif";
      for (const chip of wi.chips.slice(0, 4)) {
        const tw = bctx.measureText(chip).width + 20;
        if (cx + tw > 484) { cx = 28; cy += 28; }
        // Pill background
        bctx.fillStyle = "rgba(200,168,106,0.1)";
        bctx.beginPath(); bctx.roundRect?.(cx, cy - 14, tw, 22, 11); bctx.fill();
        bctx.strokeStyle = "rgba(200,168,106,0.55)"; bctx.lineWidth = 1;
        bctx.beginPath(); bctx.roundRect?.(cx, cy - 14, tw, 22, 11); bctx.stroke();
        bctx.fillStyle = "rgba(220,195,135,0.9)";
        bctx.fillText(chip, cx + 10, cy + 2);
        cx += tw + 10;
      }
      // Divider
      const ry2 = Math.max(cy + 26, 136);
      bctx.strokeStyle = "rgba(200,168,106,0.18)"; bctx.lineWidth = 1;
      bctx.beginPath(); bctx.moveTo(28, ry2); bctx.lineTo(484, ry2); bctx.stroke();
      // Routine lines with accent bar
      bctx.textAlign = "left";
      let ly2 = ry2 + 22;
      for (const line of wi.routineLines.slice(0, 4)) {
        // Accent bar
        bctx.fillStyle = "rgba(200,168,106,0.6)";
        bctx.fillRect(28, ly2 - 11, 2.5, 14);
        const colon = line.indexOf(":");
        if (colon > -1) {
          bctx.font = "600 12px 'Arial', sans-serif";
          bctx.fillStyle = "rgba(232,210,160,0.95)";
          bctx.fillText(line.slice(0, colon + 1), 38, ly2);
          bctx.font = "12px 'Arial', sans-serif";
          bctx.fillStyle = "rgba(200,185,150,0.72)";
          const rest = line.slice(colon + 1).trim();
          const words = rest.split(" "); let wLine = ""; let wx = 38 + bctx.measureText(line.slice(0,colon+1)).width + 8;
          const maxW = 440;
          for (const wrd of words) {
            const test = wLine + (wLine ? " " : "") + wrd;
            if (wx + bctx.measureText(test).width > maxW) {
              bctx.fillText(wLine, wx, ly2); ly2 += 15; wLine = wrd; wx = 38;
            } else { wLine = test; }
          }
          if (wLine) bctx.fillText(wLine, wx, ly2);
        } else {
          bctx.font = "12px 'Arial', sans-serif";
          bctx.fillStyle = "rgba(210,192,155,0.85)";
          bctx.fillText(line, 38, ly2);
        }
        ly2 += 26;
        if (ly2 > 316) break;
      }
      // Tap hint
      bctx.font = "10px 'Arial', sans-serif";
      bctx.fillStyle = "rgba(200,168,106,0.38)";
      bctx.textAlign = "center";
      bctx.fillText("tap to open your dashboard  →", 256, 346);
      const boardTex = new THREE.CanvasTexture(boardC);
      const boardMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(boardW, boardH),
        new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.88, metalness: 0 })
      );
      boardMesh.rotation.y = Math.PI; // face into room from back wall
      boardMesh.position.set(boardBX, boardBY, -RD/2 + 0.02);
      scene.add(boardMesh);
      // Frame around board — back wall orientation
      for (const [fw, fh, fx, fy] of [
        [boardW+0.07, 0.045, boardBX, boardBY + boardH/2 + 0.022],
        [boardW+0.07, 0.045, boardBX, boardBY - boardH/2 - 0.022],
        [0.045, boardH+0.09, boardBX - boardW/2 - 0.022, boardBY],
        [0.045, boardH+0.09, boardBX + boardW/2 + 0.022, boardBY],
      ] as [number,number,number,number][]) {
        const frm = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.04), bm.clone());
        frm.position.set(fx, fy, -RD/2 + 0.015); scene.add(frm);
      }

      // HOTSPOTS
      const hotspots: {mesh: T.Mesh; id:"shower"|"vanity"|"dashboard"}[] = [];
      for (const {id,px,py,pz,label} of [
        {id:"shower"    as const, px:SX-0.5,    py:1.5, pz:-2.2,  label:"Shower"},
        {id:"vanity"    as const, px:-3.0,       py:1.5, pz:VZ-0.3, label:"Vanity"},
        {id:"dashboard" as const, px:-1.5,        py:1.5, pz:-RD/2+0.6, label:"Routine"},
      ]) {
        const mat=new THREE.MeshBasicMaterial({map:hotspotTex(label),transparent:true,depthWrite:false,side:THREE.DoubleSide});
        const mesh=new THREE.Mesh(new THREE.PlaneGeometry(0.75,0.75),mat);
        mesh.position.set(px,py,pz);
        if (id === "dashboard") mesh.rotation.y = Math.PI;
        mesh.userData.id=id;
        scene.add(mesh); hotspots.push({mesh,id});
      }

      // INPUT — attach to the canvas itself, not the wrapper div
      const cvs = renderer.domElement;
      cvs.style.cursor = "grab";
      const ray=new THREE.Raycaster();
      const mp=new THREE.Vector2();
      let isDown=false, dragged=false, dx0=0, dy0=0, lx=0, ly=0;
      const onDown = (e:PointerEvent) => {isDown=true;dragged=false;dx0=e.clientX;dy0=e.clientY;lx=e.clientX;ly=e.clientY; cvs.setPointerCapture(e.pointerId);};
      const onMove = (e:PointerEvent) => {
        if(!isDown) return;
        if(Math.hypot(e.clientX-dx0,e.clientY-dy0)>6) dragged=true;
        yaw  -= (e.clientX-lx)*0.0028;
        pitch = Math.max(-Math.PI/2.8, Math.min(Math.PI/2.8, pitch-(e.clientY-ly)*0.0028));
        lx=e.clientX; ly=e.clientY;
      }
      const onUp = (e:PointerEvent) => {
        if(!dragged){
          const r=cvs.getBoundingClientRect();
          mp.x=((e.clientX-r.left)/r.width)*2-1; mp.y=-((e.clientY-r.top)/r.height)*2+1;
          ray.setFromCamera(mp,cam);
          const hits=ray.intersectObjects(hotspots.map(h=>h.mesh));
          if(hits.length) onHotspotRef.current(hits[0].object.userData.id as "shower"|"vanity");
        }
        isDown=false;
      }
      const onMov2 = (e:MouseEvent) => {
        if(isDown) return;
        const r=cvs.getBoundingClientRect();
        mp.x=((e.clientX-r.left)/r.width)*2-1; mp.y=-((e.clientY-r.top)/r.height)*2+1;
        ray.setFromCamera(mp,cam);
        const hits=ray.intersectObjects(hotspots.map(h=>h.mesh));
        cvs.style.cursor=hits.length?"pointer":"grab";
        const hid = hits[0].object.userData.id;
        setHint(hits.length?(hid==="shower"?"Shower Products":hid==="vanity"?"Vanity Products":"My Routine"):null);
      }
      cvs.addEventListener("pointerdown",onDown); cvs.addEventListener("pointermove",onMove);
      cvs.addEventListener("pointerup",onUp); cvs.addEventListener("mousemove",onMov2);

      // ANIMATE
      try { localStorage.setItem('__bscene_step','before-animate'); } catch{}
      let t=0;
      const animate = () => {
        rafRef.current=requestAnimationFrame(animate); t+=0.016;
        const dir=new THREE.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));
        cam.lookAt(cam.position.clone().add(dir));
        hotspots.forEach(({mesh})=>{mesh.lookAt(cam.position);mesh.scale.setScalar(1+Math.sin(t*2.1)*0.08);});
        chanPt.intensity=3.5+Math.sin(t*6.8)*0.15;
        renderer.render(scene,cam);
      }
      animate();
      try { localStorage.setItem('__bscene_step','after-animate'); } catch{}

      const onResize = () => {
        const nw=elDiv.clientWidth||window.innerWidth, nh=elDiv.clientHeight||window.innerHeight;
        cam.aspect=nw/nh; cam.updateProjectionMatrix(); renderer.setSize(nw,nh);
      }
      window.addEventListener("resize",onResize);
      try { localStorage.setItem('__bscene_step','after-resize-listener'); } catch{}

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
    <div style={{ position:"relative", width:"100%", height: fullViewport ? "100%" : undefined, background:"#E8E0D4" }}>
      <div ref={mountRef} style={{ width:"100%", height: fullViewport ? "100%" : undefined, display:"block" }} />

      {/* Drag hint */}
      <div style={{
        position:"absolute", bottom: hud ? 90 : 20, left:"50%", transform:"translateX(-50%)",
        fontSize:11, letterSpacing:"0.14em", textTransform:"uppercase",
        color:"rgba(200,168,106,0.9)", textShadow:"0 1px 8px rgba(0,0,0,0.4)",
        pointerEvents:"none", fontFamily:"'DM Sans',sans-serif", whiteSpace:"nowrap",
      }}>drag to look around · tap a glowing ring to open</div>

      {hint && (
        <div style={{
          position:"absolute", top:24, left:"50%", transform:"translateX(-50%)",
          background:"rgba(32,26,22,0.78)", backdropFilter:"blur(10px)",
          color:"#E8D090", fontSize:12, letterSpacing:"0.12em", textTransform:"uppercase",
          padding:"7px 20px", borderRadius:100, border:"1px solid rgba(200,168,106,0.45)",
          fontFamily:"'DM Sans',sans-serif", pointerEvents:"none", whiteSpace:"nowrap",
        }}>{hint}</div>
      )}

      {/* HUD floating over the room */}
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
