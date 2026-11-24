"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

// ─── Types ────────────────────────────────────────────────────────────────────
interface HotspotDef {
  id: "shower" | "vanity";
  position: THREE.Vector3;
  label: string;
}

interface Props {
  onHotspot: (id: "shower" | "vanity") => void;
}

// ─── Procedural texture helpers ───────────────────────────────────────────────
function makeMarbleTexture(w = 512, h = 512, dark = false): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  const base = dark ? "#CFC8BC" : "#EDE8DF";
  const vein1 = dark ? "rgba(165,148,122,0.6)" : "rgba(182,165,142,0.55)";
  const vein2 = dark ? "rgba(148,132,108,0.38)" : "rgba(168,148,122,0.38)";
  const grout = dark ? "rgba(190,180,165,0.8)" : "rgba(205,195,178,0.9)";

  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  // veins
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.strokeStyle = i % 2 === 0 ? vein1 : vein2;
    ctx.lineWidth = 1 + Math.random() * 1.5;
    const startX = Math.random() * w;
    const startY = Math.random() * h;
    ctx.moveTo(startX, startY);
    for (let j = 0; j < 4; j++) {
      ctx.quadraticCurveTo(
        Math.random() * w, Math.random() * h,
        Math.random() * w, Math.random() * h
      );
    }
    ctx.stroke();
  }

  // grout grid (tile seams)
  const tileSize = w / 4;
  ctx.strokeStyle = grout;
  ctx.lineWidth = 2;
  for (let x = 0; x <= w; x += tileSize) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y <= h; y += tileSize) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

function makeBrassTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 64, 0);
  grad.addColorStop(0, "#7A5C28");
  grad.addColorStop(0.3, "#C4A462");
  grad.addColorStop(0.55, "#E8D090");
  grad.addColorStop(0.8, "#C4A462");
  grad.addColorStop(1, "#9A7238");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

function makeGlassTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128; canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 128, 256);
  // subtle sheen
  const grad = ctx.createLinearGradient(0, 0, 128, 0);
  grad.addColorStop(0, "rgba(195,218,228,0.08)");
  grad.addColorStop(0.3, "rgba(228,242,248,0.22)");
  grad.addColorStop(0.7, "rgba(210,228,236,0.15)");
  grad.addColorStop(1, "rgba(195,215,225,0.06)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 256);
  // top sheen
  const sheen = ctx.createLinearGradient(0, 0, 0, 80);
  sheen.addColorStop(0, "rgba(255,255,255,0.28)");
  sheen.addColorStop(1, "rgba(255,255,255,0.0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, 128, 80);
  return new THREE.CanvasTexture(canvas);
}

function makeHotspotTexture(label: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 256, 256);

  // outer pulse ring
  ctx.beginPath();
  ctx.arc(128, 128, 110, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(200,168,106,0.35)";
  ctx.lineWidth = 6;
  ctx.stroke();

  // inner ring
  ctx.beginPath();
  ctx.arc(128, 128, 68, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(200,168,106,0.9)";
  ctx.lineWidth = 3;
  ctx.stroke();

  // dot
  ctx.beginPath();
  ctx.arc(128, 128, 20, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(200,168,106,0.85)";
  ctx.fill();

  // label
  ctx.font = "bold 28px sans-serif";
  ctx.fillStyle = "rgba(200,168,106,0.95)";
  ctx.textAlign = "center";
  ctx.fillText(label.toUpperCase(), 128, 220);

  return new THREE.CanvasTexture(canvas);
}

// ─── Room builder ─────────────────────────────────────────────────────────────
function buildRoom(scene: THREE.Scene) {
  const marbleTex  = makeMarbleTexture(512, 512, false);
  const floorTex   = makeMarbleTexture(512, 512, true);
  const brassTex   = makeBrassTexture();
  const glassTex   = makeGlassTexture();

  const W = 10, H = 4, D = 10; // room width, height, depth

  // ── WALLS ──
  const wallMat = new THREE.MeshStandardMaterial({ map: marbleTex, roughness: 0.75, metalness: 0.0 });
  const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.5, metalness: 0.05 });

  // back wall
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(W, H), wallMat);
  backWall.position.set(0, H / 2, -D / 2);
  scene.add(backWall);

  // left wall
  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(D, H), wallMat);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-W / 2, H / 2, 0);
  scene.add(leftWall);

  // right wall
  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(D, H), wallMat);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(W / 2, H / 2, 0);
  scene.add(rightWall);

  // floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(floor);

  // ceiling
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0xFEFCF8, roughness: 0.9 });
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = H;
  scene.add(ceil);

  // ── BRASS TRIM ──
  const brassMat = new THREE.MeshStandardMaterial({ map: brassTex, roughness: 0.3, metalness: 0.75 });

  // baseboard all around
  [[0, -D/2, 0], [-W/2, 0, Math.PI/2], [W/2, 0, -Math.PI/2]].forEach(([x, z, ry]) => {
    const board = new THREE.Mesh(new THREE.BoxGeometry(x === 0 ? W : D, 0.08, 0.04), brassMat.clone());
    board.position.set(x as number, 0.04, z as number);
    board.rotation.y = ry as number;
    scene.add(board);
  });

  // crown moulding
  [[0, -D/2, 0], [-W/2, 0, Math.PI/2], [W/2, 0, -Math.PI/2]].forEach(([x, z, ry]) => {
    const crown = new THREE.Mesh(new THREE.BoxGeometry(x === 0 ? W : D, 0.06, 0.04), brassMat.clone());
    crown.position.set(x as number, H - 0.03, z as number);
    crown.rotation.y = ry as number;
    scene.add(crown);
  });

  // ── SHOWER (back-right corner) ──
  const showerX = 2.5, showerZ = -D / 2 + 0.01;
  const showerW = 3.5, showerH = H - 0.1;

  // shower back wall (tile, darker)
  const showerWallMat = new THREE.MeshStandardMaterial({
    map: makeMarbleTexture(512, 512, true), roughness: 0.6, metalness: 0.0,
  });
  const showerBack = new THREE.Mesh(new THREE.PlaneGeometry(showerW, showerH), showerWallMat);
  showerBack.position.set(showerX, showerH / 2, showerZ);
  scene.add(showerBack);

  // glass panels (3 panes)
  const glassMat = new THREE.MeshStandardMaterial({
    map: glassTex, transparent: true, opacity: 0.28,
    roughness: 0.08, metalness: 0.1, side: THREE.DoubleSide,
  });
  for (let i = 0; i < 3; i++) {
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(showerW / 3 - 0.04, showerH - 0.1), glassMat);
    pane.position.set(showerX - showerW / 2 + (showerW / 3) * i + showerW / 6, showerH / 2, -D / 2 + 0.35);
    scene.add(pane);
    // brass divider
    const div = new THREE.Mesh(new THREE.BoxGeometry(0.025, showerH, 0.025), brassMat.clone());
    div.position.set(showerX - showerW / 2 + (showerW / 3) * i, showerH / 2, -D / 2 + 0.35);
    scene.add(div);
  }
  // top brass rail
  const topRail = new THREE.Mesh(new THREE.BoxGeometry(showerW, 0.06, 0.06), brassMat.clone());
  topRail.position.set(showerX, showerH, -D / 2 + 0.35);
  scene.add(topRail);

  // rain head
  const headStem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 12), brassMat.clone());
  headStem.position.set(showerX + 0.3, H - 0.3, -D / 2 + 0.5);
  scene.add(headStem);
  const headDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 20), brassMat.clone());
  headDisc.position.set(showerX + 0.3, H - 0.62, -D / 2 + 0.5);
  scene.add(headDisc);

  // niche shelf
  const nicheMat = new THREE.MeshStandardMaterial({ color: 0xD8D2C8, roughness: 0.8 });
  const niche = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.0, 0.18), nicheMat);
  niche.position.set(showerX - 0.2, H / 2 + 0.4, showerZ + 0.09);
  scene.add(niche);
  // brass shelf inside niche
  const shelf1 = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.025, 0.16), brassMat.clone());
  shelf1.position.set(showerX - 0.2, H / 2 + 0.42, showerZ + 0.08);
  scene.add(shelf1);
  const shelf2 = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.025, 0.16), brassMat.clone());
  shelf2.position.set(showerX - 0.2, H / 2 - 0.08, showerZ + 0.08);
  scene.add(shelf2);

  // products in niche (little cylinders)
  const productColors = [0xB4CAD0, 0xD4B8D0, 0xC8D4B0, 0xD0C4A8, 0xC5D5D8];
  for (let i = 0; i < 5; i++) {
    const pMat = new THREE.MeshStandardMaterial({ color: productColors[i % productColors.length], roughness: 0.6 });
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.28 + Math.random() * 0.08, 10), pMat);
    bottle.position.set(showerX - 0.36 + i * 0.18, H / 2 + 0.57, showerZ + 0.06);
    scene.add(bottle);
  }

  // ── VANITY (left wall) ──
  const vanityX = -W / 2 + 0.01;
  const vanityZ = -1.0;
  const vanityW = 3.6, vanityH_cabinet = 0.9;

  // counter top
  const counterMat = new THREE.MeshStandardMaterial({ color: 0xEDE8E0, roughness: 0.5, metalness: 0.05 });
  const counter = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, vanityW), counterMat);
  counter.position.set(vanityX + 0.04, vanityH_cabinet + 0.03, vanityZ);
  scene.add(counter);

  // cabinet body
  const cabinetMat = new THREE.MeshStandardMaterial({ color: 0xE2DDD5, roughness: 0.75 });
  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(0.08, vanityH_cabinet, vanityW), cabinetMat);
  cabinet.position.set(vanityX + 0.04, vanityH_cabinet / 2, vanityZ);
  scene.add(cabinet);

  // cabinet legs
  const legMat = brassMat.clone();
  [[-vanityW/2 + 0.1], [vanityW/2 - 0.1]].forEach(([z]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.1, 8), legMat);
    leg.position.set(vanityX + 0.04, 0.05, vanityZ + (z as number));
    scene.add(leg);
  });

  // mirror on wall
  const mirrorMat = new THREE.MeshStandardMaterial({
    color: 0xC8E0F0, roughness: 0.05, metalness: 0.9, envMapIntensity: 1,
  });
  const mirror = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 1.6, 1, 1), mirrorMat);
  mirror.rotation.y = Math.PI / 2;
  mirror.position.set(vanityX + 0.03, vanityH_cabinet + 1.1, vanityZ);
  scene.add(mirror);

  // brass mirror frame
  const frameMat = brassMat.clone();
  const frameW = 0.025;
  [
    [0.04, 1.6 + frameW * 2, frameW, vanityZ],
    [0.04, frameW, 1.6, vanityZ - 0.8 - frameW / 2],
    [0.04, frameW, 1.6, vanityZ + 0.8 + frameW / 2],
  ].forEach(([_dx, fw, fh, fz]) => {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.03, fh as number, fw as number), frameMat);
    frame.position.set(vanityX + 0.03, vanityH_cabinet + 1.1, fz as number);
    scene.add(frame);
  });
  // top/bottom frame bars
  [[vanityH_cabinet + 1.1 + 0.8 + frameW / 2], [vanityH_cabinet + 1.1 - 0.8 - frameW / 2]].forEach(([y]) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.03, frameW, vanityW * 0.6 + frameW * 2), frameMat);
    bar.position.set(vanityX + 0.03, y, vanityZ);
    scene.add(bar);
  });

  // vessel sink
  const sinkMat = new THREE.MeshStandardMaterial({ color: 0xEDEAE4, roughness: 0.35, metalness: 0.0 });
  const sinkBase = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.12, 20), sinkMat);
  sinkBase.position.set(vanityX + 0.04, vanityH_cabinet + 0.09, vanityZ + 0.4);
  scene.add(sinkBase);
  // faucet
  const faucetMat = brassMat.clone();
  const faucetStem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.4, 10), faucetMat);
  faucetStem.position.set(vanityX + 0.04, vanityH_cabinet + 0.42, vanityZ + 0.1);
  scene.add(faucetStem);
  const faucetSpout = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.28, 10), faucetMat);
  faucetSpout.rotation.z = Math.PI / 2;
  faucetSpout.position.set(vanityX + 0.04, vanityH_cabinet + 0.6, vanityZ + 0.24);
  scene.add(faucetSpout);

  // counter accessories
  const accessMat = new THREE.MeshStandardMaterial({ color: 0x2A3832, roughness: 0.5 });
  [[-0.5, 0.18], [-0.3, 0.14]].forEach(([dz, h]) => {
    const acc = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, h as number, 8), accessMat);
    acc.position.set(vanityX + 0.04, vanityH_cabinet + (h as number) / 2, vanityZ + (dz as number));
    scene.add(acc);
  });

  // sconce light fixture beside mirror
  const sconceMat = new THREE.MeshStandardMaterial({ color: 0xFFF8DC, roughness: 0.5, emissive: 0xFFF0C0, emissiveIntensity: 0.6 });
  const sconce = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), sconceMat);
  sconce.position.set(vanityX + 0.1, vanityH_cabinet + 1.5, vanityZ + 1.1);
  scene.add(sconce);
  const sconceBracket = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8), faucetMat);
  sconceBracket.rotation.z = Math.PI / 2;
  sconceBracket.position.set(vanityX + 0.0, vanityH_cabinet + 1.5, vanityZ + 1.1);
  scene.add(sconceBracket);

  // ── TUB (right wall) ──
  const tubMat = new THREE.MeshStandardMaterial({ color: 0xFBF9F5, roughness: 0.3, metalness: 0.0 });
  const tubBody = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 2.6), tubMat);
  tubBody.position.set(W / 2 - 0.1, 0.25, 0.5);
  scene.add(tubBody);

  // tub rim
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xECEAE6, roughness: 0.4 });
  const rim = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.045, 2.68), rimMat);
  rim.position.set(W / 2 - 0.1, 0.52, 0.5);
  scene.add(rim);

  // tub floor-mount faucet
  const tubFaucetMat = new THREE.MeshStandardMaterial({ color: 0x1E1A18, roughness: 0.3, metalness: 0.8 });
  const tubStem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.65, 10), tubFaucetMat);
  tubStem.position.set(W / 2 - 0.1, 0.33, -0.5);
  scene.add(tubStem);
  const tubSpout = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.015, 8, 20, Math.PI / 2), tubFaucetMat);
  tubSpout.rotation.x = Math.PI / 2;
  tubSpout.position.set(W / 2 - 0.1, 0.65, -0.5 + 0.14);
  scene.add(tubSpout);

  // tub water
  const waterMat = new THREE.MeshStandardMaterial({ color: 0xC8DCE8, transparent: true, opacity: 0.22, roughness: 0.1 });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 2.4), waterMat);
  water.rotation.z = Math.PI / 2;
  water.position.set(W / 2 - 0.1, 0.42, 0.5);
  scene.add(water);

  // ── PLANT (right back corner) ──
  const potMat = new THREE.MeshStandardMaterial({ color: 0xB8B0A5, roughness: 0.8 });
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.32, 14), potMat);
  pot.position.set(W / 2 - 0.5, 0.16, -D / 2 + 0.5);
  scene.add(pot);
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x5A6E42, roughness: 0.9 });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.8, 8), stemMat);
  stem.position.set(W / 2 - 0.5, 0.32 + 0.9, -D / 2 + 0.5);
  scene.add(stem);
  const leafColors = [0x6A8858, 0x5A7848, 0x7A9068, 0x648050];
  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2;
    const leafMat = new THREE.MeshStandardMaterial({ color: leafColors[i % 4], roughness: 0.85, side: THREE.DoubleSide });
    const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.4 + Math.random() * 0.3, 0.14), leafMat);
    const h = 0.5 + (i / 7) * 1.4;
    leaf.position.set(W / 2 - 0.5 + Math.cos(angle) * 0.3, 0.32 + h, -D / 2 + 0.5 + Math.sin(angle) * 0.3);
    leaf.rotation.set(Math.random() * 0.4 - 0.2, angle + Math.PI / 2, Math.PI / 8 + Math.random() * 0.3);
    scene.add(leaf);
  }

  // ── CHANDELIER ──
  const chanMat = brassMat.clone();
  const chanArm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.25, 8), chanMat);
  chanArm.position.set(0, H - 0.12, 0);
  scene.add(chanArm);
  const chanRing = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.015, 8, 30), chanMat);
  chanRing.position.set(0, H - 0.26, 0);
  scene.add(chanRing);
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xFFF8E8, emissive: 0xFFF0C0, emissiveIntensity: 1.2, roughness: 0.5 });
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), bulbMat);
    bulb.position.set(Math.cos(angle) * 0.55, H - 0.3, Math.sin(angle) * 0.55);
    scene.add(bulb);
    const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.12, 6), chanMat);
    wire.position.set(Math.cos(angle) * 0.55, H - 0.2, Math.sin(angle) * 0.55);
    scene.add(wire);
  }

  // ── TOWEL RAIL (right wall, near tub) ──
  const towelMat = new THREE.MeshStandardMaterial({ color: 0xF5F0E8, roughness: 0.5 });
  const towel = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.42, 0.9), towelMat);
  towel.position.set(W / 2 - 0.03, 1.4, -1.0);
  scene.add(towel);
  const railMat = brassMat.clone();
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.0, 10), railMat);
  rail.rotation.z = Math.PI / 2;
  rail.position.set(W / 2 - 0.03, 1.65, -1.0);
  scene.add(rail);
  // rail brackets
  for (const dz of [-0.42, 0.42]) {
    const bracket = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.1, 8), railMat);
    bracket.rotation.x = Math.PI / 2;
    bracket.position.set(W / 2 - 0.03, 1.65, -1.0 + dz);
    scene.add(bracket);
  }

  return { showerX, showerZ, vanityX, vanityZ };
}

// ─── Main 3D scene component ──────────────────────────────────────────────────
export default function BathroomScene3D({ onHotspot }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    animId: number;
    hotspots: Array<{ mesh: THREE.Mesh; id: "shower" | "vanity" }>;
    camera: THREE.PerspectiveCamera;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
    isPointerDown: boolean;
    pointerDownPos: { x: number; y: number };
    yaw: number;
    pitch: number;
    isDragging: boolean;
  } | null>(null);

  const [hint, setHint] = useState<string | null>(null);
  const hintTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const el = mountRef.current;

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
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
    camera.position.set(0, 1.6, 2.5); // eye height, slightly forward from center
    let yaw = 0, pitch = 0;

    // ── Lights ──
    // Ambient
    scene.add(new THREE.AmbientLight(0xFFF8F0, 0.55));

    // Chandelier point light
    const chanLight = new THREE.PointLight(0xFFEDC0, 1.8, 14);
    chanLight.position.set(0, 3.6, 0);
    chanLight.castShadow = true;
    scene.add(chanLight);

    // Sconce warm fill
    const sconceLight = new THREE.PointLight(0xFFE4B0, 1.1, 5);
    sconceLight.position.set(-4.6, 2.5, -1.2);
    scene.add(sconceLight);

    // Window fill from right
    const fillLight = new THREE.DirectionalLight(0xE8F4FF, 0.4);
    fillLight.position.set(4, 3, 1);
    scene.add(fillLight);

    // ── Build room ──
    const { showerX, showerZ, vanityX, vanityZ } = buildRoom(scene);

    // ── Hotspot sprites ──
    const hotspots: Array<{ mesh: THREE.Mesh; id: "shower" | "vanity" }> = [];
    const hotspotDefs: HotspotDef[] = [
      { id: "shower",  position: new THREE.Vector3(showerX,  1.5, showerZ + 0.5), label: "Shower" },
      { id: "vanity",  position: new THREE.Vector3(vanityX + 0.6, 1.4, vanityZ - 0.6), label: "Vanity" },
    ];
    hotspotDefs.forEach(({ id, position, label }) => {
      const tex = makeHotspotTexture(label);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), mat);
      mesh.position.copy(position);
      mesh.userData.hotspotId = id;
      scene.add(mesh);
      hotspots.push({ mesh, id });
    });

    // ── Pointer state ──
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isPointerDown = false;
    let pointerDownPos = { x: 0, y: 0 };
    let isDragging = false;
    let lastPointerX = 0, lastPointerY = 0;

    // ── Interaction ──
    function onPointerDown(e: PointerEvent) {
      isPointerDown = true;
      isDragging = false;
      pointerDownPos = { x: e.clientX, y: e.clientY };
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
    }

    function onPointerMove(e: PointerEvent) {
      if (!isPointerDown) return;
      const dx = e.clientX - lastPointerX;
      const dy = e.clientY - lastPointerY;
      const totalDist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (totalDist > 5) isDragging = true;

      yaw -= dx * 0.003;
      pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, pitch - dy * 0.003));
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
    }

    function onPointerUp(e: PointerEvent) {
      if (!isDragging) {
        // tap — check hotspot hit
        const rect = el.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const meshes = hotspots.map((h) => h.mesh);
        const hits = raycaster.intersectObjects(meshes);
        if (hits.length > 0) {
          const id = hits[0].object.userData.hotspotId as "shower" | "vanity";
          onHotspot(id);
        }
      }
      isPointerDown = false;
    }

    function onMouseMove(e: MouseEvent) {
      if (isPointerDown) return;
      const rect = el.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(hotspots.map((h) => h.mesh));
      if (hits.length > 0) {
        el.style.cursor = "pointer";
        const id = hits[0].object.userData.hotspotId as string;
        setHint(id === "shower" ? "Shower Products" : "Vanity Products");
        if (hintTimeout.current) clearTimeout(hintTimeout.current);
      } else {
        el.style.cursor = "grab";
        setHint(null);
      }
    }

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("mousemove", onMouseMove);

    // ── Animation ──
    let t = 0;
    function animate() {
      const animId = requestAnimationFrame(animate);
      sceneRef.current!.animId = animId;
      t += 0.016;

      // Update camera from yaw/pitch
      const dir = new THREE.Vector3(
        Math.sin(yaw) * Math.cos(pitch),
        Math.sin(pitch),
        -Math.cos(yaw) * Math.cos(pitch)
      );
      camera.lookAt(camera.position.clone().add(dir));

      // Billboard hotspots to face camera
      hotspots.forEach(({ mesh }) => {
        mesh.lookAt(camera.position);
        // pulse scale
        const pulse = 1 + Math.sin(t * 2.2) * 0.07;
        mesh.scale.setScalar(pulse);
      });

      // Chandelier flicker
      chanLight.intensity = 1.8 + Math.sin(t * 7.3) * 0.06;

      renderer.render(scene, camera);
    }
    animate();

    // ── Resize ──
    function onResize() {
      const w = el.clientWidth, h = el.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener("resize", onResize);

    sceneRef.current = { renderer, animId: 0, hotspots, camera, raycaster, mouse, isPointerDown, pointerDownPos, yaw, pitch, isDragging };

    return () => {
      cancelAnimationFrame(sceneRef.current!.animId);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [onHotspot]);

  return (
    <div style={{ position: "relative", width: "100%", height: 0, paddingBottom: "56.25%", background: "#F5F0E8" }}>
      <div ref={mountRef} style={{ position: "absolute", inset: 0, cursor: "grab" }} />

      {/* Drag hint */}
      <div style={{
        position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)",
        fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase",
        color: "rgba(200,168,106,0.9)",
        textShadow: "0 1px 6px rgba(0,0,0,0.3)",
        pointerEvents: "none",
        fontFamily: "'DM Sans', sans-serif",
      }}>
        drag to look around · tap a glowing ring to open
      </div>

      {/* Hover label */}
      {hint && (
        <div style={{
          position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)",
          background: "rgba(42,36,32,0.75)", backdropFilter: "blur(8px)",
          color: "#E8D090", fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase",
          padding: "8px 18px", borderRadius: 100,
          fontFamily: "'DM Sans', sans-serif",
          pointerEvents: "none",
          border: "1px solid rgba(200,168,106,0.4)",
        }}>
          {hint}
        </div>
      )}
    </div>
  );
}
