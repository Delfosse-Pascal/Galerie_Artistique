import * as THREE from 'three';

// ----------------------------------------------------------------------------
// Musée Maëlle Corvain — plan au sol
//
// Axe Z = profondeur (entrée à z=-3, fond à z=51).
// Toutes les salles axées sur x=0 (sauf branches atelier/immersive).
//
//                                ┌────────────────┐
//                                │  R4 Monumental │  z: 39–51
//                                │  h = 10 m      │
//                                └────────┬───────┘
//                                         │ porte x≈0
//  ┌───────────┐               ┌──────────┴───────┐               ┌──────────┐
//  │ Immersive │◄────porte x≈-5│  R3 Hantises     │porte x≈+5─────► Atelier  │
//  │  h=6 m    │               │  h = 4 m         │               │  h=4 m   │
//  └───────────┘               │  z: 28–36        │               └──────────┘
//                              └────────┬─────────┘
//                                       │ porte x≈0
//                             ┌─────────┴─────────┐
//                             │  R2 Errance       │  z: 17–25, h=5
//                             └─────────┬─────────┘
//                                       │
//                             ┌─────────┴─────────┐
//                             │  R1 Jeunesse      │  z: 6–14, h=5
//                             └─────────┬─────────┘
//                                       │
//                             ┌─────────┴─────────┐
//                             │  Hall d'entrée    │  z: -3–3, h=5
//                             └───────────────────┘
//
// ----------------------------------------------------------------------------

const DOOR_W = 1.6;
const DOOR_H = 2.4;
const WALL_T = 0.3;
const FLOOR_Y = 0;

// ---------- Materials ----------
function makeMaterials() {
  const loader = new THREE.TextureLoader();

  // Procedural concrete: subtle noise via canvas
  const concreteTex = makeNoiseTexture(512, 0.10, 0.18);
  concreteTex.wrapS = concreteTex.wrapT = THREE.RepeatWrapping;
  concreteTex.repeat.set(6, 4);

  const woodTex = makeWoodTexture(512);
  woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
  woodTex.repeat.set(3, 3);

  return {
    concrete: new THREE.MeshStandardMaterial({ color: 0x5a554d, roughness: 0.92, metalness: 0.02, map: concreteTex }),
    darkConcrete: new THREE.MeshStandardMaterial({ color: 0x35312c, roughness: 0.95, metalness: 0.02, map: concreteTex }),
    oak: new THREE.MeshStandardMaterial({ color: 0x4a3624, roughness: 0.62, metalness: 0.04, map: woodTex }),
    iron: new THREE.MeshStandardMaterial({ color: 0x2a2826, roughness: 0.45, metalness: 0.75 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xaec3d5, roughness: 0.05, metalness: 0, transmission: 0.7, thickness: 0.3, transparent: true, opacity: 0.35 }),
    floorStone: new THREE.MeshStandardMaterial({ color: 0x3d3832, roughness: 0.8, metalness: 0.05, map: concreteTex }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0x1a1714, roughness: 0.98, metalness: 0 }),
  };
}

function makeNoiseTexture(size, dark = 0.1, light = 0.2) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 180 + Math.floor((Math.random() * (light - dark) + dark) * 255);
    img.data[i] = img.data[i+1] = img.data[i+2] = Math.min(255, v);
    img.data[i+3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  // Subtle coarse blotches
  for (let k = 0; k < 40; k++) {
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = Math.random() < 0.5 ? '#000' : '#fff';
    ctx.beginPath();
    ctx.arc(Math.random()*size, Math.random()*size, 20+Math.random()*60, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeWoodTexture(size) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d');
  const grd = ctx.createLinearGradient(0, 0, size, 0);
  grd.addColorStop(0, '#3d2a18');
  grd.addColorStop(0.5, '#4e3722');
  grd.addColorStop(1, '#3a2614');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 80; i++) {
    ctx.strokeStyle = `rgba(30,18,10,${0.12 + Math.random()*0.15})`;
    ctx.lineWidth = 0.6 + Math.random()*1.4;
    ctx.beginPath();
    const y = Math.random() * size;
    ctx.moveTo(0, y);
    for (let x = 0; x < size; x += 8) {
      ctx.lineTo(x, y + Math.sin(x*0.05 + i) * 2);
    }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------- Helpers: walls ----------
function addBox(parent, aabbs, mat, x, y, z, sx, sy, sz, castShadow = true, receiveShadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
  m.position.set(x, y, z);
  m.castShadow = castShadow;
  m.receiveShadow = receiveShadow;
  parent.add(m);
  if (aabbs) {
    aabbs.push({
      minX: x - sx/2, maxX: x + sx/2,
      minY: y - sy/2, maxY: y + sy/2,
      minZ: z - sz/2, maxZ: z + sz/2,
    });
  }
  return m;
}

// X-oriented wall segment (constant Z), span [x1,x2], thickness=WALL_T on Z
function wallX(parent, aabbs, mat, x1, x2, z, h, y0 = 0) {
  const cx = (x1 + x2) / 2;
  const len = Math.abs(x2 - x1);
  if (len < 0.01) return;
  addBox(parent, aabbs, mat, cx, y0 + h/2, z, len, h, WALL_T);
}

// Z-oriented wall segment (constant X), span [z1,z2]
function wallZ(parent, aabbs, mat, x, z1, z2, h, y0 = 0) {
  const cz = (z1 + z2) / 2;
  const len = Math.abs(z2 - z1);
  if (len < 0.01) return;
  addBox(parent, aabbs, mat, x, y0 + h/2, cz, WALL_T, h, len);
}

// Wall with a door opening. Builds two side-segments plus a lintel above.
function wallXWithDoor(parent, aabbs, mat, x1, x2, z, h, doorCenterX, doorW = DOOR_W, doorH = DOOR_H) {
  const left1 = x1, left2 = doorCenterX - doorW/2;
  const right1 = doorCenterX + doorW/2, right2 = x2;
  if (left2 > left1) wallX(parent, aabbs, mat, left1, left2, z, h);
  if (right2 > right1) wallX(parent, aabbs, mat, right1, right2, z, h);
  // lintel above door (no AABB — player can't reach that high)
  if (doorH < h) {
    const cx = doorCenterX;
    addBox(parent, null, mat, cx, doorH + (h - doorH)/2, z, doorW, h - doorH, WALL_T);
  }
}

function wallZWithDoor(parent, aabbs, mat, x, z1, z2, h, doorCenterZ, doorW = DOOR_W, doorH = DOOR_H) {
  const bot1 = z1, bot2 = doorCenterZ - doorW/2;
  const top1 = doorCenterZ + doorW/2, top2 = z2;
  if (bot2 > bot1) wallZ(parent, aabbs, mat, x, bot1, bot2, h);
  if (top2 > top1) wallZ(parent, aabbs, mat, x, top1, top2, h);
  if (doorH < h) {
    const cz = doorCenterZ;
    addBox(parent, null, mat, x, doorH + (h - doorH)/2, cz, WALL_T, h - doorH, doorW);
  }
}

// Floor plane (no collision — ground plane checked by Y)
function addFloor(parent, mat, x1, x2, z1, z2) {
  const geom = new THREE.PlaneGeometry(x2 - x1, z2 - z1);
  const m = new THREE.Mesh(geom, mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set((x1+x2)/2, FLOOR_Y + 0.001, (z1+z2)/2);
  m.receiveShadow = true;
  parent.add(m);
}
function addCeiling(parent, mat, x1, x2, z1, z2, h) {
  const geom = new THREE.PlaneGeometry(x2 - x1, z2 - z1);
  const m = new THREE.Mesh(geom, mat);
  m.rotation.x = Math.PI / 2;
  m.position.set((x1+x2)/2, h, (z1+z2)/2);
  parent.add(m);
}

// ----------------------------------------------------------------------------
// Build
// ----------------------------------------------------------------------------
export function buildMuseum(scene) {
  const mats = makeMaterials();
  const aabbs = [];
  const root = new THREE.Group();
  scene.add(root);

  // ================== ROOM DEFINITIONS ==================
  const rooms = {
    lobby:     { minX: -4,  maxX: 4,  minZ: -3, maxZ: 3,  h: 5 },
    r1:        { minX: -6,  maxX: 6,  minZ: 6,  maxZ: 14, h: 5 },
    r2:        { minX: -6,  maxX: 6,  minZ: 17, maxZ: 25, h: 5 },
    r3:        { minX: -5,  maxX: 5,  minZ: 28, maxZ: 36, h: 4 },
    atelier:   { minX: 5,   maxX: 11, minZ: 30, maxZ: 36, h: 4 },
    immersive: { minX: -11, maxX: -5, minZ: 30, maxZ: 38, h: 6 },
    r4:        { minX: -8,  maxX: 8,  minZ: 39, maxZ: 51, h: 10 },
    c1:        { minX: -1,  maxX: 1,  minZ: 3,  maxZ: 6,  h: 4 },
    c2:        { minX: -1,  maxX: 1,  minZ: 14, maxZ: 17, h: 4 },
    c3:        { minX: -1,  maxX: 1,  minZ: 25, maxZ: 28, h: 4 },
    c4:        { minX: -1,  maxX: 1,  minZ: 36, maxZ: 39, h: 4 },
  };

  // ================== BASE MATERIAL PALETTE (neutres blancs — textures appliquées via admin) ==================
  // Toutes les salles partagent la même base blanche : les textures mosaic
  // placees au lancement (admin.js) donnent le rendu final.
  const BASE_WALL = 0xffffff, BASE_FLOOR = 0xf1ece3, BASE_CEIL = 0xf8f3e8;
  const roomKeys = ['lobby','r1','r2','r3','atelier','immersive','r4','c1','c2','c3','c4'];
  const rm = {};
  for (const k of roomKeys) {
    rm[k] = {
      wall:    new THREE.MeshStandardMaterial({ color: BASE_WALL,  roughness: 0.85, metalness: 0 }),
      floor:   new THREE.MeshStandardMaterial({ color: BASE_FLOOR, roughness: 0.75, metalness: 0 }),
      ceiling: new THREE.MeshStandardMaterial({ color: BASE_CEIL,  roughness: 0.95, metalness: 0 }),
    };
    rm[k].wall.userData    = { surface: 'wall',    room: k, baseColor: BASE_WALL };
    rm[k].floor.userData   = { surface: 'floor',   room: k, baseColor: BASE_FLOOR };
    rm[k].ceiling.userData = { surface: 'ceiling', room: k, baseColor: BASE_CEIL };
  }

  // ================== FLOORS & CEILINGS ==================
  for (const key of Object.keys(rooms)) {
    const r = rooms[key];
    addFloor(root, rm[key].floor, r.minX, r.maxX, r.minZ, r.maxZ);
    addCeiling(root, rm[key].ceiling, r.minX, r.maxX, r.minZ, r.maxZ, r.h);
  }

  // ================== OUTER GROUND ==================
  const groundGeom = new THREE.PlaneGeometry(100, 100);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0xd8cfbe, roughness: 1 });
  const ground = new THREE.Mesh(groundGeom, groundMat);
  ground.rotation.x = -Math.PI/2;
  ground.position.set(0, -0.05, 20);
  ground.receiveShadow = true;
  root.add(ground);

  // ================== WALLS (pastel par salle) ==================

  // ---- LOBBY ----
  wallX(root, aabbs, rm.lobby.wall, -4, 4, -3, 5);
  wallXWithDoor(root, aabbs, rm.lobby.wall, -4, 4, 3, 5, 0);
  wallZ(root, aabbs, rm.lobby.wall, -4, -3, 3, 5);
  wallZ(root, aabbs, rm.lobby.wall, 4, -3, 3, 5);

  // ---- C1 ----
  wallZ(root, aabbs, rm.c1.wall, -1, 3, 6, 4);
  wallZ(root, aabbs, rm.c1.wall, 1, 3, 6, 4);

  // ---- R1 JEUNESSE (pêche) ----
  wallXWithDoor(root, aabbs, rm.r1.wall, -6, 6, 6, 5, 0);
  wallXWithDoor(root, aabbs, rm.r1.wall, -6, 6, 14, 5, 0);
  wallZ(root, aabbs, rm.r1.wall, -6, 6, 14, 5);
  wallZ(root, aabbs, rm.r1.wall, 6, 6, 14, 5);

  // ---- C2 ----
  wallZ(root, aabbs, rm.c2.wall, -1, 14, 17, 4);
  wallZ(root, aabbs, rm.c2.wall, 1, 14, 17, 4);

  // ---- R2 ERRANCE (bleu) ----
  wallXWithDoor(root, aabbs, rm.r2.wall, -6, 6, 17, 5, 0);
  wallXWithDoor(root, aabbs, rm.r2.wall, -6, 6, 25, 5, 0);
  wallZ(root, aabbs, rm.r2.wall, -6, 17, 25, 5);
  wallZ(root, aabbs, rm.r2.wall, 6, 17, 25, 5);

  // ---- C3 ----
  wallZ(root, aabbs, rm.c3.wall, -1, 25, 28, 4);
  wallZ(root, aabbs, rm.c3.wall, 1, 25, 28, 4);

  // ---- R3 HANTISES (mauve) ----
  wallXWithDoor(root, aabbs, rm.r3.wall, -5, 5, 28, 4, 0);
  wallXWithDoor(root, aabbs, rm.r3.wall, -5, 5, 36, 4, 0);
  wallZWithDoor(root, aabbs, rm.r3.wall, -5, 28, 36, 4, 33);
  wallZWithDoor(root, aabbs, rm.r3.wall, 5, 28, 36, 4, 33);

  // ---- ATELIER (jaune) ----
  wallX(root, aabbs, rm.atelier.wall, 5, 11, 30, 4);
  wallX(root, aabbs, rm.atelier.wall, 5, 11, 36, 4);
  wallZ(root, aabbs, rm.atelier.wall, 11, 30, 36, 4);

  // ---- IMMERSIVE (menthe) ----
  wallX(root, aabbs, rm.immersive.wall, -11, -5, 30, 6);
  wallX(root, aabbs, rm.immersive.wall, -11, -5, 38, 6);
  wallZ(root, aabbs, rm.immersive.wall, -11, 30, 38, 6);

  // ---- C4 ----
  wallZ(root, aabbs, rm.c4.wall, -1, 36, 39, 4);
  wallZ(root, aabbs, rm.c4.wall, 1, 36, 39, 4);

  // ---- R4 DERNIERS LIEUX (rose) ----
  wallXWithDoor(root, aabbs, rm.r4.wall, -8, 8, 39, 10, 0, DOOR_W, 3.2);
  wallX(root, aabbs, rm.r4.wall, -8, 8, 51, 10);
  wallZ(root, aabbs, rm.r4.wall, -8, 39, 51, 10);
  wallZ(root, aabbs, rm.r4.wall, 8, 39, 51, 10);

  // ================== ARCHITECTURAL DETAILS ==================

  // Entrance step + lobby reception desk
  addBox(root, null, mats.oak, 0, 0.05, -1.5, 6, 0.1, 0.6);       // threshold strip (flat)
  addBox(root, aabbs, mats.oak, -2.5, 0.5, 0, 1.2, 1.0, 0.6);     // reception desk

  // Monumental columns in R4
  const columnMat = new THREE.MeshStandardMaterial({ color: 0xd8b0b0, roughness: 0.85, metalness: 0 });
  for (const cx of [-4, 4]) {
    for (const cz of [43, 47]) {
      addBox(root, aabbs, columnMat, cx, 5, cz, 0.6, 10, 0.6);
    }
  }

  // Skylights (thin emissive planes on ceilings, driven by directional lights below)
  addSkylight(root, 0, 5, 10, 4, 2);    // R1
  addSkylight(root, 0, 5, 22, 4, 2);    // R2
  addSkylight(root, 0, 10, 45, 4, 8);   // R4 monumental
  addSkylight(root, -8, 6, 34, 3, 3);   // Immersive

  // Benches
  addBench(root, mats.oak, 0, 0.25, 10);
  addBench(root, mats.oak, 0, 0.25, 22);
  addBench(root, mats.oak, 0, 0.25, 45);

  // Atelier reconstitution
  buildAtelier(root, mats);

  // Immersive room installation: iron frame cube & emissive floor
  buildImmersive(root, mats);

  // ================== LIGHTING ==================
  // Global sun-ish directional for monumental skylight
  const sun = new THREE.DirectionalLight(0xd7c7a3, 0.85);
  sun.position.set(6, 30, 48);
  sun.target.position.set(0, 0, 45);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -12; sun.shadow.camera.right = 12;
  sun.shadow.camera.top = 12;   sun.shadow.camera.bottom = -12;
  sun.shadow.camera.near = 1;   sun.shadow.camera.far = 60;
  sun.shadow.bias = -0.0005;
  scene.add(sun); scene.add(sun.target);

  // Softer zenithal key per gallery
  addSoftKey(scene, 0, 4.7, 10, 0.55);
  addSoftKey(scene, 0, 4.7, 22, 0.55);
  addSoftKey(scene, 0, 3.7, 32, 0.35);  // hantises
  addSoftKey(scene, 8, 3.7, 33, 0.4, 0xd2a86f);  // atelier
  addSoftKey(scene, -8, 5.7, 34, 0.6, 0x7c8ec5); // immersive cold

  // ================== MODERN WARM LIGHTING ==================
  // Downlights encastrés (grilles plafond) + bandeaux cove + appliques linéaires.
  // Aucun luminaire suspendu. Teinte chaude 2700–3000 K.
  const WARM      = 0xffb878;  // 2800 K
  const WARM_SOFT = 0xffc897;  // 3000 K

  // Lobby
  addDownlightGrid(root, rooms.lobby, 2, 3, WARM, 0.55);
  addCoveStrips(root, rooms.lobby, 0x663018, 0.95);
  addWallBar(root, -4 + 0.16, 2.4, -1.5, 'E', WARM);
  addWallBar(root, -4 + 0.16, 2.4,  1.5, 'E', WARM);
  addWallBar(root,  4 - 0.16, 2.4, -1.5, 'W', WARM);
  addWallBar(root,  4 - 0.16, 2.4,  1.5, 'W', WARM);

  // R1 Jeunesse
  addDownlightGrid(root, rooms.r1, 3, 4, WARM, 0.55);
  addCoveStrips(root, rooms.r1, 0x663018, 0.95);

  // R2 Errance
  addDownlightGrid(root, rooms.r2, 3, 4, WARM, 0.55);
  addCoveStrips(root, rooms.r2, 0x663018, 0.95);

  // R3 Hantises — plus sombre, downlights espacés
  addDownlightGrid(root, rooms.r3, 2, 3, WARM, 0.38);
  addCoveStrips(root, rooms.r3, 0x4a2410, 0.7);

  // Atelier — chaud saturé
  addDownlightGrid(root, rooms.atelier, 2, 2, WARM_SOFT, 0.55);
  addCoveStrips(root, rooms.atelier, 0x7a3a18, 1.0);
  addWallBar(root, 11 - 0.16, 2.4, 33, 'W', WARM_SOFT);

  // Immersive — très bas, bandes chaudes contrastant avec spot froid
  addDownlightGrid(root, rooms.immersive, 2, 2, WARM, 0.22);
  addCoveStrips(root, rooms.immersive, 0x5a2810, 0.6);

  // R4 Monumental — grille dense
  addDownlightGrid(root, rooms.r4, 4, 5, WARM, 0.7);
  addCoveStrips(root, rooms.r4, 0x6e3418, 1.1);
  // Uplights au pied des colonnes
  for (const cx of [-4, 4]) {
    for (const cz of [43, 47]) {
      addColumnUplight(root, cx, cz, WARM_SOFT);
    }
  }

  // Corridors — bande LED continue + barres latérales
  for (const key of ['c1','c2','c3','c4']) {
    const r = rooms[key];
    addCorridorStrip(root, r, WARM);
  }

  // ================== ROOM LABELS ==================
  const roomLabels = [
    { name: "Hall d'entrée", ...rooms.lobby },
    { name: 'I. Jeunesse (1862–1870)', ...rooms.r1 },
    { name: 'II. Errance (1871–1879)', ...rooms.r2 },
    { name: 'III. Hantises (1880–1888)', ...rooms.r3 },
    { name: 'Atelier reconstitué', ...rooms.atelier },
    { name: 'Salle immersive — Le Gouffre', ...rooms.immersive },
    { name: 'IV. Derniers Lieux (1889–1897)', ...rooms.r4 },
  ];

  return { rooms, colliders: aabbs, roomLabels, materials: rm };
}

// ---------- Decorative builders ----------
function addSkylight(parent, x, h, z, w, d) {
  const geom = new THREE.PlaneGeometry(w, d);
  const mat = new THREE.MeshBasicMaterial({ color: 0xfff2d7 });
  const m = new THREE.Mesh(geom, mat);
  m.rotation.x = Math.PI/2;
  m.position.set(x, h - 0.01, z);
  parent.add(m);
}

function addBench(parent, mat, x, y, z) {
  const g = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(2, 0.08, 0.5), mat);
  seat.position.y = 0.45;
  seat.castShadow = seat.receiveShadow = true;
  g.add(seat);
  for (const dx of [-0.9, 0.9]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 0.45), mat);
    leg.position.set(dx, 0.225, 0);
    g.add(leg);
  }
  g.position.set(x, 0, z);
  parent.add(g);
}

// Modern linear wall bar (flush, horizontal LED).
// side: 'N' 'S' 'E' 'W' — which way the bar faces (cast direction).
function addWallBar(parent, x, y, z, side, color = 0xffb878) {
  const g = new THREE.Group();
  let w = 0.6, t = 0.04, d = 0.08;
  let geom;
  let rotY = 0;
  if (side === 'E' || side === 'W') {
    // bar is horizontal along Z, thickness on X
    geom = new THREE.BoxGeometry(d, t, w);
    rotY = side === 'E' ? 0 : 0;
  } else {
    // bar horizontal along X, thickness on Z
    geom = new THREE.BoxGeometry(w, t, d);
  }
  const housing = new THREE.Mesh(geom, new THREE.MeshStandardMaterial({ color: 0x15110c, roughness: 0.6, metalness: 0.6 }));
  housing.position.set(x, y, z);
  parent.add(housing);

  // Emissive stripe (the lit surface)
  const stripeMat = new THREE.MeshBasicMaterial({ color });
  let stripe, sx, sy, sz;
  if (side === 'E') {
    stripe = new THREE.Mesh(new THREE.PlaneGeometry(w, t * 0.7), stripeMat);
    stripe.rotation.y = Math.PI/2;
    sx = x + d/2 + 0.001; sy = y; sz = z;
  } else if (side === 'W') {
    stripe = new THREE.Mesh(new THREE.PlaneGeometry(w, t * 0.7), stripeMat);
    stripe.rotation.y = -Math.PI/2;
    sx = x - d/2 - 0.001; sy = y; sz = z;
  } else if (side === 'N') {
    stripe = new THREE.Mesh(new THREE.PlaneGeometry(w, t * 0.7), stripeMat);
    sx = x; sy = y; sz = z + d/2 + 0.001;
  } else { // S
    stripe = new THREE.Mesh(new THREE.PlaneGeometry(w, t * 0.7), stripeMat);
    stripe.rotation.y = Math.PI;
    sx = x; sy = y; sz = z - d/2 - 0.001;
  }
  stripe.position.set(sx, sy, sz);
  parent.add(stripe);

  // Warm bounce light
  const light = new THREE.PointLight(color, 0.55, 5, 2);
  light.position.set(sx, sy, sz);
  parent.add(light);
}

function addSoftKey(scene, x, y, z, intensity, color = 0xf1e2c2) {
  const l = new THREE.SpotLight(color, intensity, 24, Math.PI * 0.35, 0.6, 1.4);
  l.position.set(x, y, z);
  l.target.position.set(x, 0, z);
  l.castShadow = true;
  l.shadow.mapSize.set(512, 512);
  l.shadow.bias = -0.0008;
  scene.add(l);
  scene.add(l.target);
}

function buildAtelier(parent, mats) {
  // Easel
  const g = new THREE.Group();
  g.position.set(8, 0, 33);
  parent.add(g);

  // floor rug
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.6), new THREE.MeshStandardMaterial({ color: 0x3a1e18, roughness: 0.9 }));
  rug.rotation.x = -Math.PI/2; rug.position.y = 0.005;
  g.add(rug);

  // Easel uprights
  const eMat = mats.oak;
  const up1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.0, 0.06), eMat); up1.position.set(-0.4, 1.0, 0); g.add(up1);
  const up2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.0, 0.06), eMat); up2.position.set(0.4, 1.0, 0); g.add(up2);
  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.8, 0.06), eMat); leg.position.set(0, 0.9, -0.5); g.add(leg);
  const tray = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 0.12), eMat); tray.position.set(0, 0.85, 0.05); g.add(tray);

  // Blank canvas on easel
  const canv = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.1), new THREE.MeshStandardMaterial({ color: 0xe9dcc4, roughness: 0.9 }));
  canv.position.set(0, 1.45, 0.04);
  g.add(canv);
  // Sketch marks
  const sketch = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.8), new THREE.MeshBasicMaterial({ color: 0x2a1a10, transparent: true, opacity: 0.15 }));
  sketch.position.set(0, 1.45, 0.045);
  g.add(sketch);

  // Work table with palette + tubes
  const table = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 0.7), eMat);
  table.position.set(1.5, 0.85, 1.0); table.castShadow = true;
  g.add(table);
  for (const [dx, dz] of [[-0.65,-0.3],[0.65,-0.3],[-0.65,0.3],[0.65,0.3]]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.85, 0.06), eMat);
    l.position.set(1.5+dx, 0.425, 1.0+dz);
    g.add(l);
  }
  const palette = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.015, 24), new THREE.MeshStandardMaterial({ color: 0x5a3b22, roughness: 0.6 }));
  palette.rotation.x = Math.PI/2; palette.position.set(1.5, 0.88, 1.0); g.add(palette);

  // Chair
  const chair = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.05, 0.45), eMat); seat.position.y = 0.45; chair.add(seat);
  for (const [dx, dz] of [[-0.18,-0.18],[0.18,-0.18],[-0.18,0.18],[0.18,0.18]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.45, 0.04), eMat);
    leg.position.set(dx, 0.225, dz);
    chair.add(leg);
  }
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.5, 0.04), eMat);
  back.position.set(0, 0.7, -0.2); chair.add(back);
  chair.position.set(-0.2, 0, -1.0);
  chair.rotation.y = -0.3;
  g.add(chair);

  // Warm point light on easel
  const ptl = new THREE.PointLight(0xffb074, 0.9, 6, 2);
  ptl.position.set(0.3, 2.5, 0.8);
  g.add(ptl);
}

function buildImmersive(parent, mats) {
  const g = new THREE.Group();
  g.position.set(-8, 0, 34);
  parent.add(g);

  // Dark reflective floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 8), new THREE.MeshStandardMaterial({ color: 0x0c0a10, roughness: 0.3, metalness: 0.2 }));
  floor.rotation.x = -Math.PI/2;
  floor.position.y = 0.02;
  g.add(floor);

  // Iron frame cube suspended
  const frameMat = mats.iron;
  const frame = new THREE.Group();
  const s = 2.4;
  const edges = [
    [[-s/2,-s/2,-s/2],[s/2,-s/2,-s/2]], [[-s/2,-s/2,s/2],[s/2,-s/2,s/2]],
    [[-s/2,s/2,-s/2],[s/2,s/2,-s/2]],   [[-s/2,s/2,s/2],[s/2,s/2,s/2]],
    [[-s/2,-s/2,-s/2],[-s/2,s/2,-s/2]], [[s/2,-s/2,-s/2],[s/2,s/2,-s/2]],
    [[-s/2,-s/2,s/2],[-s/2,s/2,s/2]],   [[s/2,-s/2,s/2],[s/2,s/2,s/2]],
    [[-s/2,-s/2,-s/2],[-s/2,-s/2,s/2]], [[s/2,-s/2,-s/2],[s/2,-s/2,s/2]],
    [[-s/2,s/2,-s/2],[-s/2,s/2,s/2]],   [[s/2,s/2,-s/2],[s/2,s/2,s/2]],
  ];
  for (const [a,b] of edges) {
    const len = Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2]);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,len,6), frameMat);
    bar.position.set((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);
    const dir = new THREE.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]).normalize();
    bar.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir);
    frame.add(bar);
  }
  frame.position.set(0, 2.5, 0);
  g.add(frame);

  // Cold light bleeding down
  const cold = new THREE.SpotLight(0x6b82b4, 1.2, 10, Math.PI*0.5, 0.7, 1.5);
  cold.position.set(0, 5.8, 0);
  cold.target.position.set(0, 0, 0);
  g.add(cold); g.add(cold.target);
}

// ============================================================================
// Modern lighting helpers
// ============================================================================

// Recessed ceiling downlight : flush disc + SpotLight aiming down.
function addDownlight(parent, x, y, z, color = 0xffb878, intensity = 0.55) {
  // Flush ring
  const ring = new THREE.Mesh(
    new THREE.CircleGeometry(0.11, 20),
    new THREE.MeshBasicMaterial({ color: 0x1a1712 })
  );
  ring.rotation.x = Math.PI/2;
  ring.position.set(x, y - 0.002, z);
  parent.add(ring);

  // Emissive lens
  const lens = new THREE.Mesh(
    new THREE.CircleGeometry(0.075, 20),
    new THREE.MeshBasicMaterial({ color })
  );
  lens.rotation.x = Math.PI/2;
  lens.position.set(x, y - 0.003, z);
  parent.add(lens);

  // Directional warm cone
  const spot = new THREE.SpotLight(color, intensity, y + 1.5, Math.PI * 0.42, 0.55, 1.6);
  spot.position.set(x, y - 0.05, z);
  spot.target.position.set(x, 0, z);
  spot.castShadow = false;
  parent.add(spot);
  parent.add(spot.target);
}

// Regular grid of downlights across a room, 30cm below ceiling.
function addDownlightGrid(parent, room, rows, cols, color, intensity) {
  const y = room.h - 0.05;
  const marginX = (room.maxX - room.minX) * 0.15;
  const marginZ = (room.maxZ - room.minZ) * 0.15;
  const spanX = (room.maxX - room.minX) - marginX*2;
  const spanZ = (room.maxZ - room.minZ) - marginZ*2;
  const stepX = cols > 1 ? spanX / (cols - 1) : 0;
  const stepZ = rows > 1 ? spanZ / (rows - 1) : 0;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x = room.minX + marginX + i * stepX;
      const z = room.minZ + marginZ + j * stepZ;
      addDownlight(parent, x, y, z, color, intensity);
    }
  }
}

// Cove strips : thin emissive bands on each of the 4 wall-ceiling junctions
// (glow upward against ceiling → indirect warm light, zero hanging fixtures).
function addCoveStrips(parent, room, emissiveColor = 0x663018, intensity = 1.0) {
  const yTop = room.h - 0.06;
  const inset = 0.3;
  const stripeMat = new THREE.MeshBasicMaterial({ color: emissiveColor });
  // 4 thin horizontal stripes (planes) facing inward and upward
  // N wall (maxZ)
  const nGeom = new THREE.PlaneGeometry((room.maxX - room.minX) - 0.6, 0.08);
  const n = new THREE.Mesh(nGeom, stripeMat);
  n.position.set((room.minX + room.maxX)/2, yTop, room.maxZ - 0.18);
  n.rotation.x = Math.PI/2 - 0.25;
  n.rotation.y = Math.PI;
  parent.add(n);
  // S
  const s = new THREE.Mesh(nGeom, stripeMat);
  s.position.set((room.minX + room.maxX)/2, yTop, room.minZ + 0.18);
  s.rotation.x = Math.PI/2 - 0.25;
  parent.add(s);
  // E
  const eGeom = new THREE.PlaneGeometry((room.maxZ - room.minZ) - 0.6, 0.08);
  const e = new THREE.Mesh(eGeom, stripeMat);
  e.position.set(room.maxX - 0.18, yTop, (room.minZ + room.maxZ)/2);
  e.rotation.x = Math.PI/2 - 0.25;
  e.rotation.z = Math.PI/2;
  parent.add(e);
  // W
  const w = new THREE.Mesh(eGeom, stripeMat);
  w.position.set(room.minX + 0.18, yTop, (room.minZ + room.maxZ)/2);
  w.rotation.x = Math.PI/2 - 0.25;
  w.rotation.z = -Math.PI/2;
  parent.add(w);

  // Subtle PointLights simulating cove bounce (one per corner)
  const coveCol = 0xffb37a;
  const ints = intensity * 0.5;
  const range = Math.min(8, Math.max(4, (room.maxX - room.minX) * 0.6));
  for (const [cx, cz] of [
    [room.minX + 0.5, room.minZ + 0.5],
    [room.maxX - 0.5, room.minZ + 0.5],
    [room.minX + 0.5, room.maxZ - 0.5],
    [room.maxX - 0.5, room.maxZ - 0.5],
  ]) {
    const p = new THREE.PointLight(coveCol, ints, range, 2);
    p.position.set(cx, yTop - 0.15, cz);
    parent.add(p);
  }
}

// Continuous LED strip down the centre of a narrow corridor.
function addCorridorStrip(parent, room, color = 0xffb878) {
  const y = room.h - 0.04;
  const len = room.maxZ - room.minZ - 0.4;
  const strip = new THREE.Mesh(
    new THREE.PlaneGeometry(0.25, len),
    new THREE.MeshBasicMaterial({ color })
  );
  strip.rotation.x = Math.PI/2;
  strip.position.set((room.minX + room.maxX)/2, y, (room.minZ + room.maxZ)/2);
  parent.add(strip);

  const nLights = Math.max(2, Math.round(len / 1.8));
  for (let i = 0; i < nLights; i++) {
    const t = (i + 0.5) / nLights;
    const z = room.minZ + 0.2 + t * len;
    const l = new THREE.PointLight(color, 0.35, 3.5, 2);
    l.position.set((room.minX + room.maxX)/2, y - 0.05, z);
    parent.add(l);
  }
}

// Warm uplight at column base — grazes the concrete upward.
function addColumnUplight(parent, x, z, color = 0xffc897) {
  // Small dark housing on floor
  const housing = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.05, 0.9),
    new THREE.MeshStandardMaterial({ color: 0x0f0d0a, roughness: 0.7, metalness: 0.4 })
  );
  housing.position.set(x, 0.025, z);
  parent.add(housing);

  // Emissive inner rectangle
  const ring = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.08),
    new THREE.MeshBasicMaterial({ color })
  );
  ring.rotation.x = -Math.PI/2;
  ring.position.set(x, 0.051, z + 0.25);
  parent.add(ring);
  const ring2 = ring.clone();
  ring2.position.set(x, 0.051, z - 0.25);
  parent.add(ring2);
  const ring3 = new THREE.Mesh(
    new THREE.PlaneGeometry(0.08, 0.5),
    new THREE.MeshBasicMaterial({ color })
  );
  ring3.rotation.x = -Math.PI/2;
  ring3.position.set(x + 0.25, 0.051, z);
  parent.add(ring3);
  const ring4 = ring3.clone();
  ring4.position.set(x - 0.25, 0.051, z);
  parent.add(ring4);

  // Upward spotlight
  const spot = new THREE.SpotLight(color, 0.9, 10, Math.PI * 0.35, 0.6, 1.3);
  spot.position.set(x, 0.1, z);
  spot.target.position.set(x, 10, z);
  parent.add(spot);
  parent.add(spot.target);
}
