"use client";

import { useEffect, useRef, useState } from "react";
import type * as THREE_TYPES from "three";

interface Props {
  onHotspot: (id: "shower" | "vanity") => void;
}

export default function BathroomScene3D({ onHotspot }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const animIdRef = useRef<number>(0);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const el = mountRef.current;

    // Dynamic import keeps Three.js out of the SSR bundle entirely
    import("three").then((THREE) => {
      // ── Procedural texture helpers ──────────────────────────────────────
      function makeMarbleTexture(w = 512, h = 512, dark = false): THREE_TYPES.CanvasTexture {
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = dark ? "#CFC8BC" : "#EDE8DF";
        ctx.fillRect(0, 0, w, h);
        const v1 = dark ? "rgba(165,148,122,0.6)" : "rgba(182,165,142,0.55)";
        const v2 = dark ? "rgba(148,132,108,0.38)" : "rgba(168,148,122,0.38)";
        const grout = dark ? "rgba(190,180,165,0.8)" : "rgba(205,195,178,0.9)";
        for (let i = 0; i < 6; i++) {
          ctx.beginPath();
          ctx.strokeStyle = i % 2 === 0 ? v1 : v2;
          ctx.lineWidth = 1 + Math.random() * 1.5;
          ctx.moveTo(Math.random() * w, Math.random() * h);
          for (let j = 0; j < 4; j++) {
            ctx.quadraticCurveTo(Math.random() * w, Math.random() * h, Math.random() * w, Math.random() * h);
          }
          ctx.stroke();
        }
        const tileSize = w / 4;
        ctx.strokeStyle = grout; ctx.lineWidth = 2;
        for (let x = 0; x <= w; x += tileSize) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
        for (let y = 0; y <= h; y += tileSize) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(3, 3);
        return tex;
      }

      function makeBrassTexture(): THREE_TYPES.CanvasTexture {
        const canvas = document.createElement("canvas");
        canvas.width = 64; canvas.height = 64;
        const ctx = canvas.getContext("2d")!;
        const g = ctx.createLinearGradient(0, 0, 64, 0);
        g.addColorStop(0, "#7A5C28"); g.addColorStop(0.3, "#C4A462");
        g.addColorStop(0.55, "#E8D090"); g.addColorStop(0.8, "#C4A462"); g.addColorStop(1, "#9A7238");
        ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
        return new THREE.CanvasTexture(canvas);
      }

      function makeGlassTexture(): THREE_TYPES.CanvasTexture {
        const canvas = document.createElement("canvas");
        canvas.width = 128; canvas.height = 256;
        const ctx = canvas.getContext("2d")!;
        ctx.clearRect(0, 0, 128, 256);
        const g = ctx.createLinearGradient(0, 0, 128, 0);
        g.addColorStop(0, "rgba(195,218,228,0.08)"); g.addColorStop(0.3, "rgba(228,242,248,0.22)");
        g.addColorStop(0.7, "rgba(210,228,236,0.15)"); g.addColorStop(1, "rgba(195,215,225,0.06)");
        ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 256);
        const sheen = ctx.createLinearGradient(0, 0, 0, 80);
        sheen.addColorStop(0, "rgba(255,255,255,0.28)"); sheen.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = sheen; ctx.fillRect(0, 0, 128, 80);
        return new THREE.CanvasTexture(canvas);
      }

      function makeHotspotTexture(label: string): THREE_TYPES.CanvasTexture {
        const canvas = document.createElement("canvas");
        canvas.width = 256; canvas.height = 256;
        const ctx = canvas.getContext("2d")!;
        ctx.clearRect(0, 0, 256, 256);
        ctx.beginPath(); ctx.arc(128, 128, 110, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(200,168,106,0.35)"; ctx.lineWidth = 6; ctx.stroke();
        ctx.beginPath(); ctx.arc(128, 128, 68, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(200,168,106,0.9)"; ctx.lineWidth = 3; ctx.stroke();
        ctx.beginPath(); ctx.arc(128, 128, 20, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(200,168,106,0.85)"; ctx.fill();
        ctx.font = "bold 28px sans-serif"; ctx.fillStyle = "rgba(200,168,106,0.95)";
        ctx.textAlign = "center"; ctx.fillText(label.toUpperCase(), 128, 220);
        return new THREE.CanvasTexture(canvas);
      }

      // ── Renderer ──
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(el.clientWidth, el.clientHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      el.appendChild(renderer.domElement);

      // ── Scene ──
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xF5F0E8);
      scene.fog = new THREE.FogExp2(0xF5F0E8, 0.025);

      // ── Camera ──
      const camera = new THREE.PerspectiveCamera(75, el.clientWidth / el.clientHeight, 0.1, 50);
      camera.position.set(0, 1.6, 2.5);
      let yaw = 0, pitch = 0;

      // ── Lights ──
      scene.add(new THREE.AmbientLight(0xFFF8F0, 0.55));
      const chanLight = new THREE.PointLight(0xFFEDC0, 1.8, 14);
      chanLight.position.set(0, 3.6, 0);
      chanLight.castShadow = true;
      scene.add(chanLight);
      const sconceLight = new THREE.PointLight(0xFFE4B0, 1.1, 5);
      sconceLight.position.set(-4.6, 2.5, -1.2);
      scene.add(sconceLight);
      const fillLight = new THREE.DirectionalLight(0xE8F4FF, 0.4);
      fillLight.position.set(4, 3, 1);
      scene.add(fillLight);

      // ── Materials ──
      const brassTex = makeBrassTexture();
      const brassMat = new THREE.MeshStandardMaterial({ map: brassTex, roughness: 0.3, metalness: 0.75 });
      const wallMat  = new THREE.MeshStandardMaterial({ map: makeMarbleTexture(512, 512, false), roughness: 0.75 });
      const floorMat = new THREE.MeshStandardMaterial({ map: makeMarbleTexture(512, 512, true),  roughness: 0.5, metalness: 0.05 });

      const W = 10, H = 4, D = 10;

      // ── Room walls ──
      const backWall = new THREE.Mesh(new THREE.PlaneGeometry(W, H), wallMat);
      backWall.position.set(0, H / 2, -D / 2); scene.add(backWall);

      const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(D, H), wallMat);
      leftWall.rotation.y = Math.PI / 2; leftWall.position.set(-W / 2, H / 2, 0); scene.add(leftWall);

      const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(D, H), wallMat);
      rightWall.rotation.y = -Math.PI / 2; rightWall.position.set(W / 2, H / 2, 0); scene.add(rightWall);

      const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat);
      floor.rotation.x = -Math.PI / 2; floor.position.y = 0; scene.add(floor);

      const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ color: 0xFEFCF8, roughness: 0.9 }));
      ceil.rotation.x = Math.PI / 2; ceil.position.y = H; scene.add(ceil);

      // Baseboards
      ([ [0, -D/2, 0], [-W/2, 0, Math.PI/2], [W/2, 0, -Math.PI/2] ] as [number,number,number][]).forEach(([x, z, ry]) => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(x === 0 ? W : D, 0.08, 0.04), brassMat.clone());
        b.position.set(x, 0.04, z); b.rotation.y = ry; scene.add(b);
        const c = new THREE.Mesh(new THREE.BoxGeometry(x === 0 ? W : D, 0.06, 0.04), brassMat.clone());
        c.position.set(x, H - 0.03, z); c.rotation.y = ry; scene.add(c);
      });

      // ── Shower (back wall, right of center) ──
      const showerX = 2.5, showerZ = -D / 2 + 0.01;
      const showerW = 3.5, showerH = H - 0.1;
      const showerWallMat = new THREE.MeshStandardMaterial({ map: makeMarbleTexture(512, 512, true), roughness: 0.6 });
      const showerBack = new THREE.Mesh(new THREE.PlaneGeometry(showerW, showerH), showerWallMat);
      showerBack.position.set(showerX, showerH / 2, showerZ); scene.add(showerBack);

      const glassMat = new THREE.MeshStandardMaterial({
        map: makeGlassTexture(), transparent: true, opacity: 0.28,
        roughness: 0.08, metalness: 0.1, side: THREE.DoubleSide,
      });
      for (let i = 0; i < 3; i++) {
        const pane = new THREE.Mesh(new THREE.PlaneGeometry(showerW / 3 - 0.04, showerH - 0.1), glassMat);
        pane.position.set(showerX - showerW/2 + (showerW/3)*i + showerW/6, showerH/2, -D/2 + 0.35);
        scene.add(pane);
        const div = new THREE.Mesh(new THREE.BoxGeometry(0.025, showerH, 0.025), brassMat.clone());
        div.position.set(showerX - showerW/2 + (showerW/3)*i, showerH/2, -D/2 + 0.35);
        scene.add(div);
      }
      const topRail = new THREE.Mesh(new THREE.BoxGeometry(showerW, 0.06, 0.06), brassMat.clone());
      topRail.position.set(showerX, showerH, -D/2 + 0.35); scene.add(topRail);

      // Rain head
      const headStem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 12), brassMat.clone());
      headStem.position.set(showerX + 0.3, H - 0.3, -D/2 + 0.5); scene.add(headStem);
      const headDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 20), brassMat.clone());
      headDisc.position.set(showerX + 0.3, H - 0.62, -D/2 + 0.5); scene.add(headDisc);

      // Niche
      const niche = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.0, 0.18), new THREE.MeshStandardMaterial({ color: 0xD8D2C8, roughness: 0.8 }));
      niche.position.set(showerX - 0.2, H/2 + 0.4, showerZ + 0.09); scene.add(niche);
      for (const sy of [H/2 + 0.42, H/2 - 0.08]) {
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.025, 0.16), brassMat.clone());
        shelf.position.set(showerX - 0.2, sy, showerZ + 0.08); scene.add(shelf);
      }
      const bottleColors = [0xB4CAD0, 0xD4B8D0, 0xC8D4B0, 0xD0C4A8, 0xC5D5D8];
      for (let i = 0; i < 5; i++) {
        const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.28 + Math.random()*0.08, 10),
          new THREE.MeshStandardMaterial({ color: bottleColors[i % 5], roughness: 0.6 }));
        bottle.position.set(showerX - 0.36 + i*0.18, H/2 + 0.57, showerZ + 0.06); scene.add(bottle);
      }

      // ── Vanity (left wall) ──
      const vanityX = -W/2 + 0.01, vanityZ = -1.0;
      const vanityW = 3.6, vanityHc = 0.9;
      const counter = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, vanityW),
        new THREE.MeshStandardMaterial({ color: 0xEDE8E0, roughness: 0.5, metalness: 0.05 }));
      counter.position.set(vanityX + 0.04, vanityHc + 0.03, vanityZ); scene.add(counter);
      const cabinet = new THREE.Mesh(new THREE.BoxGeometry(0.08, vanityHc, vanityW),
        new THREE.MeshStandardMaterial({ color: 0xE2DDD5, roughness: 0.75 }));
      cabinet.position.set(vanityX + 0.04, vanityHc/2, vanityZ); scene.add(cabinet);

      // Mirror
      const mirror = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 1.6),
        new THREE.MeshStandardMaterial({ color: 0xC8E0F0, roughness: 0.05, metalness: 0.9 }));
      mirror.rotation.y = Math.PI/2; mirror.position.set(vanityX + 0.03, vanityHc + 1.1, vanityZ); scene.add(mirror);
      const frameW = 0.025;
      [ [1.6 + frameW*2, frameW, vanityZ], [frameW, 1.6, vanityZ - 0.8 - frameW/2], [frameW, 1.6, vanityZ + 0.8 + frameW/2] ]
        .forEach(([fw, fh, fz]) => {
          const f = new THREE.Mesh(new THREE.BoxGeometry(0.03, fh as number, fw as number), brassMat.clone());
          f.position.set(vanityX + 0.03, vanityHc + 1.1, fz as number); scene.add(f);
        });
      for (const y of [vanityHc + 1.1 + 0.8 + frameW/2, vanityHc + 1.1 - 0.8 - frameW/2]) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.03, frameW, vanityW*0.6 + frameW*2), brassMat.clone());
        bar.position.set(vanityX + 0.03, y, vanityZ); scene.add(bar);
      }

      // Sink + faucet
      const sink = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.12, 20),
        new THREE.MeshStandardMaterial({ color: 0xEDEAE4, roughness: 0.35 }));
      sink.position.set(vanityX + 0.04, vanityHc + 0.09, vanityZ + 0.4); scene.add(sink);
      const fStem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.4, 10), brassMat.clone());
      fStem.position.set(vanityX + 0.04, vanityHc + 0.42, vanityZ + 0.1); scene.add(fStem);
      const fSpout = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.28, 10), brassMat.clone());
      fSpout.rotation.z = Math.PI/2; fSpout.position.set(vanityX + 0.04, vanityHc + 0.6, vanityZ + 0.24); scene.add(fSpout);

      // Accessories
      const accMat = new THREE.MeshStandardMaterial({ color: 0x2A3832, roughness: 0.5 });
      for (const [dz, h] of [[-0.5, 0.18], [-0.3, 0.14]]) {
        const acc = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, h, 8), accMat);
        acc.position.set(vanityX + 0.04, vanityHc + h/2, vanityZ + dz); scene.add(acc);
      }

      // Sconce
      const sconceMat = new THREE.MeshStandardMaterial({ color: 0xFFF8DC, emissive: new THREE.Color(0xFFF0C0), emissiveIntensity: 0.6, roughness: 0.5 });
      const sconce = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), sconceMat);
      sconce.position.set(vanityX + 0.1, vanityHc + 1.5, vanityZ + 1.1); scene.add(sconce);
      const bracket = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8), brassMat.clone());
      bracket.rotation.z = Math.PI/2; bracket.position.set(vanityX, vanityHc + 1.5, vanityZ + 1.1); scene.add(bracket);

      // ── Tub (right wall) ──
      const tubMat = new THREE.MeshStandardMaterial({ color: 0xFBF9F5, roughness: 0.3 });
      const tubBody = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 2.6), tubMat);
      tubBody.position.set(W/2 - 0.1, 0.25, 0.5); scene.add(tubBody);
      const rim = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.045, 2.68),
        new THREE.MeshStandardMaterial({ color: 0xECEAE6, roughness: 0.4 }));
      rim.position.set(W/2 - 0.1, 0.52, 0.5); scene.add(rim);
      const tubFaucetMat = new THREE.MeshStandardMaterial({ color: 0x1E1A18, roughness: 0.3, metalness: 0.8 });
      const tubStem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.65, 10), tubFaucetMat);
      tubStem.position.set(W/2 - 0.1, 0.33, -0.5); scene.add(tubStem);
      const tubSpout = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.015, 8, 20, Math.PI/2), tubFaucetMat);
      tubSpout.rotation.x = Math.PI/2; tubSpout.position.set(W/2 - 0.1, 0.65, -0.5 + 0.14); scene.add(tubSpout);
      const water = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 2.4),
        new THREE.MeshStandardMaterial({ color: 0xC8DCE8, transparent: true, opacity: 0.22, roughness: 0.1 }));
      water.rotation.z = Math.PI/2; water.position.set(W/2 - 0.1, 0.42, 0.5); scene.add(water);

      // ── Plant (right back corner) ──
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.32, 14),
        new THREE.MeshStandardMaterial({ color: 0xB8B0A5, roughness: 0.8 }));
      pot.position.set(W/2 - 0.5, 0.16, -D/2 + 0.5); scene.add(pot);
      const stemM = new THREE.MeshStandardMaterial({ color: 0x5A6E42, roughness: 0.9 });
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.8, 8), stemM);
      stem.position.set(W/2 - 0.5, 0.32 + 0.9, -D/2 + 0.5); scene.add(stem);
      const leafColors = [0x6A8858, 0x5A7848, 0x7A9068, 0x648050];
      for (let i = 0; i < 7; i++) {
        const angle = (i/7)*Math.PI*2;
        const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.4 + Math.random()*0.3, 0.14),
          new THREE.MeshStandardMaterial({ color: leafColors[i%4], roughness: 0.85, side: THREE.DoubleSide }));
        const h = 0.5 + (i/7)*1.4;
        leaf.position.set(W/2 - 0.5 + Math.cos(angle)*0.3, 0.32 + h, -D/2 + 0.5 + Math.sin(angle)*0.3);
        leaf.rotation.set(Math.random()*0.4 - 0.2, angle + Math.PI/2, Math.PI/8 + Math.random()*0.3);
        scene.add(leaf);
      }

      // ── Chandelier ──
      const chanArm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.25, 8), brassMat.clone());
      chanArm.position.set(0, H - 0.12, 0); scene.add(chanArm);
      const chanRing = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.015, 8, 30), brassMat.clone());
      chanRing.position.set(0, H - 0.26, 0); scene.add(chanRing);
      const bulbMat = new THREE.MeshStandardMaterial({ color: 0xFFF8E8, emissive: new THREE.Color(0xFFF0C0), emissiveIntensity: 1.2, roughness: 0.5 });
      for (let i = 0; i < 6; i++) {
        const angle = (i/6)*Math.PI*2;
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), bulbMat);
        bulb.position.set(Math.cos(angle)*0.55, H - 0.3, Math.sin(angle)*0.55); scene.add(bulb);
        const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.12, 6), brassMat.clone());
        wire.position.set(Math.cos(angle)*0.55, H - 0.2, Math.sin(angle)*0.55); scene.add(wire);
      }

      // Towel rail
      const towel = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.42, 0.9),
        new THREE.MeshStandardMaterial({ color: 0xF5F0E8, roughness: 0.5 }));
      towel.position.set(W/2 - 0.03, 1.4, -1.0); scene.add(towel);
      const railM = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.0, 10), brassMat.clone());
      railM.rotation.z = Math.PI/2; railM.position.set(W/2 - 0.03, 1.65, -1.0); scene.add(railM);
      for (const dz of [-0.42, 0.42]) {
        const br = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.1, 8), brassMat.clone());
        br.rotation.x = Math.PI/2; br.position.set(W/2 - 0.03, 1.65, -1.0 + dz); scene.add(br);
      }

      // ── Hotspot sprites ──
      const hotspots: Array<{ mesh: THREE_TYPES.Mesh; id: "shower" | "vanity" }> = [];
      for (const { id, pos, label } of [
        { id: "shower" as const,  pos: new THREE.Vector3(showerX, 1.5, showerZ + 0.5),   label: "Shower"  },
        { id: "vanity" as const,  pos: new THREE.Vector3(vanityX + 0.6, 1.4, vanityZ - 0.6), label: "Vanity"  },
      ]) {
        const mat = new THREE.MeshBasicMaterial({ map: makeHotspotTexture(label), transparent: true, depthWrite: false, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), mat);
        mesh.position.copy(pos);
        mesh.userData.hotspotId = id;
        scene.add(mesh);
        hotspots.push({ mesh, id });
      }

      // ── Input ──
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();
      let isDown = false, isDragging = false;
      let downX = 0, downY = 0, lastX = 0, lastY = 0;

      function onDown(e: PointerEvent) {
        isDown = true; isDragging = false;
        downX = e.clientX; downY = e.clientY;
        lastX = e.clientX; lastY = e.clientY;
      }
      function onMove(e: PointerEvent) {
        if (!isDown) return;
        const dx = e.clientX - lastX, dy = e.clientY - lastY;
        if (Math.hypot(e.clientX - downX, e.clientY - downY) > 5) isDragging = true;
        yaw -= dx * 0.003;
        pitch = Math.max(-Math.PI/3, Math.min(Math.PI/3, pitch - dy * 0.003));
        lastX = e.clientX; lastY = e.clientY;
      }
      function onUp(e: PointerEvent) {
        if (!isDragging) {
          const rect = el.getBoundingClientRect();
          mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(mouse, camera);
          const hits = raycaster.intersectObjects(hotspots.map(h => h.mesh));
          if (hits.length > 0) onHotspot(hits[0].object.userData.hotspotId as "shower" | "vanity");
        }
        isDown = false;
      }
      function onHover(e: MouseEvent) {
        if (isDown) return;
        const rect = el.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects(hotspots.map(h => h.mesh));
        if (hits.length > 0) {
          el.style.cursor = "pointer";
          setHint(hits[0].object.userData.hotspotId === "shower" ? "Shower Products" : "Vanity Products");
        } else {
          el.style.cursor = "grab";
          setHint(null);
        }
      }

      el.addEventListener("pointerdown", onDown);
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", onUp);
      el.addEventListener("mousemove", onHover);

      // ── Animate ──
      let t = 0;
      function animate() {
        animIdRef.current = requestAnimationFrame(animate);
        t += 0.016;
        const dir = new THREE.Vector3(
          Math.sin(yaw) * Math.cos(pitch),
          Math.sin(pitch),
          -Math.cos(yaw) * Math.cos(pitch)
        );
        camera.lookAt(camera.position.clone().add(dir));
        hotspots.forEach(({ mesh }) => {
          mesh.lookAt(camera.position);
          mesh.scale.setScalar(1 + Math.sin(t * 2.2) * 0.07);
        });
        chanLight.intensity = 1.8 + Math.sin(t * 7.3) * 0.06;
        renderer.render(scene, camera);
      }
      animate();

      // ── Resize ──
      function onResize() {
        const w = el.clientWidth, h = el.clientHeight;
        camera.aspect = w / h; camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
      window.addEventListener("resize", onResize);

      // Cleanup stored on the element so the effect cleanup can reach it
      (el as HTMLDivElement & { _cleanup?: () => void })._cleanup = () => {
        cancelAnimationFrame(animIdRef.current);
        el.removeEventListener("pointerdown", onDown);
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", onUp);
        el.removeEventListener("mousemove", onHover);
        window.removeEventListener("resize", onResize);
        renderer.dispose();
        if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      };
    });

    return () => {
      const c = (el as HTMLDivElement & { _cleanup?: () => void })._cleanup;
      if (c) c();
    };
  }, [onHotspot]);

  return (
    <div style={{ position: "relative", width: "100%", height: 0, paddingBottom: "56.25%", background: "#F5F0E8" }}>
      <div ref={mountRef} style={{ position: "absolute", inset: 0, cursor: "grab" }} />

      <div style={{
        position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)",
        fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase",
        color: "rgba(200,168,106,0.9)", textShadow: "0 1px 6px rgba(0,0,0,0.3)",
        pointerEvents: "none", fontFamily: "'DM Sans', sans-serif",
      }}>
        drag to look around · tap a glowing ring to open
      </div>

      {hint && (
        <div style={{
          position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)",
          background: "rgba(42,36,32,0.75)", backdropFilter: "blur(8px)",
          color: "#E8D090", fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase",
          padding: "8px 18px", borderRadius: 100,
          fontFamily: "'DM Sans', sans-serif", pointerEvents: "none",
          border: "1px solid rgba(200,168,106,0.4)",
        }}>
          {hint}
        </div>
      )}
    </div>
  );
}
