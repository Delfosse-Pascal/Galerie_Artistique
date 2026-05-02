import * as THREE from 'three';

// Oeuvres de Delfosse Pascal — Artiste peintre — catalogue fictif
// Chaque entrée correspond à l'une des 16 toiles du dossier /images.
const CATALOG = [
  { num: 'I',    title: 'Lande au vent tombant',            year: '1862', room: 'r1', mount: { wall: 'N', x: -3, y: 1.8, scale: 1.0 }, note: "Première toile connue. La peintre a dix-neuf ans." },
  { num: 'II',   title: 'Le chemin vers Ar-Mor',            year: '1865', room: 'r1', mount: { wall: 'N', x:  3, y: 1.8, scale: 1.0 }, note: "Étude de marche, huile sur toile de voile." },
  { num: 'III',  title: 'Manoir au retour des foins',       year: '1867', room: 'r1', mount: { wall: 'S', x: -3.5, y: 1.8, scale: 1.0 }, note: "Commande privée refusée par le commanditaire." },
  { num: 'IV',   title: 'Clairière d\'octobre',             year: '1870', room: 'r1', mount: { wall: 'S', x:  3.5, y: 1.8, scale: 1.0 }, note: "Dernière œuvre de la période lumineuse." },
  { num: 'V',    title: 'Pont brisé sur l\'Enn',            year: '1872', room: 'r2', mount: { wall: 'W', x: 19, y: 1.8, scale: 1.1 }, note: "Première pièce produite après l'exil." },
  { num: 'VI',   title: 'Route d\'Arvor sous la pluie',     year: '1874', room: 'r2', mount: { wall: 'W', x: 22, y: 1.8, scale: 1.1 }, note: "Technique mixte — bitume et huile." },
  { num: 'VII',  title: 'Ferme abandonnée à Logoù',         year: '1876', room: 'r2', mount: { wall: 'E', x: 20, y: 1.8, scale: 1.1 }, note: "Motif récurrent de l'architecture vernaculaire en ruine." },
  { num: 'VIII', title: 'Le silence des halliers',          year: '1878', room: 'r2', mount: { wall: 'E', x: 23, y: 1.8, scale: 1.1 }, note: "Exposée au Salon des Refusés, 1879." },
  { num: 'IX',   title: 'Demeure des Morgane',              year: '1881', room: 'r3', mount: { wall: 'W', x: 30, y: 1.65, scale: 0.95 }, note: "Entrée dans la période dite des Hantises." },
  { num: 'X',    title: 'Appel sur la lande',               year: '1883', room: 'r3', mount: { wall: 'W', x: 34.8, y: 1.65, scale: 0.95 }, note: "Silhouette humaine ambiguë — amante ou spectre ?" },
  { num: 'XI',   title: 'Veille au seuil',                  year: '1885', room: 'r3', mount: { wall: 'E', x: 30, y: 1.65, scale: 0.95 }, note: "Format intime, peinte à la bougie." },
  { num: 'XII',  title: 'Ce qui reste d\'un jardin',        year: '1887', room: 'r3', mount: { wall: 'E', x: 35, y: 1.65, scale: 0.95 }, note: "Don du docteur Lestrel, 1921." },
  { num: 'XIII', title: 'Le grand vestibule du monde',      year: '1890', room: 'r4', mount: { wall: 'W', x: 43, y: 3.0, scale: 2.2 }, note: "Œuvre monumentale. 3,4 × 4,6 m." },
  { num: 'XIV',  title: 'Nef sans offices',                 year: '1892', room: 'r4', mount: { wall: 'E', x: 43, y: 3.0, scale: 2.2 }, note: "Pendant de \"Le grand vestibule du monde\"." },
  { num: 'XV',   title: 'Dernière fenêtre ouverte',         year: '1895', room: 'r4', mount: { wall: 'N', x: -3.8, y: 3.0, scale: 1.9 }, note: "Exécutée durant sa dernière maladie." },
  { num: 'XVI',  title: 'Les lieux oubliés',                year: '1897', room: 'r4', mount: { wall: 'N', x:  3.8, y: 3.0, scale: 1.9 }, note: "Inachevée. Trouvée sur son chevalet." },
];

// Emplacements supplémentaires pour les images au-delà des 16 œuvres canoniques.
// Positions choisies pour ne pas entrer en collision avec les tableaux existants.
// (wall='E'/'W' : m.x = coord Z ; wall='N'/'S' : m.x = coord X)
const EXTRA_SLOTS = [
  // R1 — murs E/W solides (8 m de long, hauteur 5 m)
  { room:'r1',        mount:{ wall:'E', x:  8,   y:1.8,  scale:0.9 } },
  { room:'r1',        mount:{ wall:'E', x: 10.5, y:1.8,  scale:0.9 } },
  { room:'r1',        mount:{ wall:'E', x: 13,   y:1.8,  scale:0.9 } },
  { room:'r1',        mount:{ wall:'W', x:  8,   y:1.8,  scale:0.9 } },
  { room:'r1',        mount:{ wall:'W', x: 10.5, y:1.8,  scale:0.9 } },
  { room:'r1',        mount:{ wall:'W', x: 13,   y:1.8,  scale:0.9 } },
  // R2 — places restantes entre les 4 tableaux canoniques
  { room:'r2',        mount:{ wall:'E', x: 18,   y:1.8,  scale:0.9 } },
  { room:'r2',        mount:{ wall:'W', x: 24,   y:1.8,  scale:0.9 } },
  // R4 — grand vestibule, derrière les œuvres monumentales (z=43)
  { room:'r4',        mount:{ wall:'W', x: 47,   y:2.6,  scale:1.4 } },
  { room:'r4',        mount:{ wall:'E', x: 47,   y:2.6,  scale:1.4 } },
  // Hall d'entrée
  { room:'lobby',     mount:{ wall:'E', x:  0,   y:1.75, scale:0.8 } },
  { room:'lobby',     mount:{ wall:'W', x:  0,   y:1.75, scale:0.8 } },
  // Salle immersive — mur ouest
  { room:'immersive', mount:{ wall:'W', x: 34,   y:2.3,  scale:1.1 } },
];

const WALL_OFFSET = 0.17; // distance from wall plane to painting face (wall half-thickness + 0.02)
const loadedCartels = [];

// Shared frame material — mutable so admin can swap style live
export const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x1a130a, roughness: 0.55, metalness: 0.05 });

// Painting root groups — admin rotates them for auto-rotation preview
export const paintingGroups = [];

// Painting canvas meshes — used by main.js for click-to-open modal
export const paintingMeshes = [];

// Frame style presets — admin dropdown applies one of these
export const FRAME_STYLES = {
  or:        { color: 0xd4af37, metalness: 0.85, roughness: 0.25 },
  argent:    { color: 0xc0c0c0, metalness: 0.85, roughness: 0.22 },
  bronze:    { color: 0x8c5a2b, metalness: 0.65, roughness: 0.42 },
  boisfonce: { color: 0x1a130a, metalness: 0.05, roughness: 0.55 },
  noir:      { color: 0x0a0a0a, metalness: 0.10, roughness: 0.85 },
  blanc:     { color: 0xf0ece2, metalness: 0.00, roughness: 0.70 },
};
export function setFrameStyle(name) {
  const s = FRAME_STYLES[name];
  if (!s) return;
  frameMaterial.color.setHex(s.color);
  frameMaterial.metalness = s.metalness;
  frameMaterial.roughness = s.roughness;
  frameMaterial.needsUpdate = true;
}

async function loadImageList() {
  // Source unique : fichiers réellement présents dans /images.
  // Aucun fallback codé en dur — si le dossier est vide, aucune toile placée.
  try {
    const r = await fetch('./images/manifest.json', { cache: 'no-cache' });
    if (r.ok) {
      const j = await r.json();
      if (Array.isArray(j.items)) return j.items;
    }
  } catch (_) { /* manifest absent → liste vide */ }
  return [];
}

function slotFor(i) {
  if (i < CATALOG.length) return CATALOG[i];
  const ex = EXTRA_SLOTS[i - CATALOG.length];
  if (!ex) return null;                           // overflow ignoré si plus de slots
  return { num: `•${i - CATALOG.length + 1}`, title: '', year: '', note: '…', ...ex };
}

function prettyTitleFromFilename(name) {
  return name
    .replace(/\.[^.]+$/, '')         // strip extension
    .replace(/^haunted\d+$/i, 'Sans titre')
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'Sans titre';
}

export async function placePaintings(scene, rooms) {
  const loader = new THREE.TextureLoader();
  const images = await loadImageList();
  const total  = Math.min(images.length, CATALOG.length + EXTRA_SLOTS.length);
  const promises = [];

  for (let i = 0; i < total; i++) {
    const baseSlot = slotFor(i);
    if (!baseSlot) break;
    const isExtra = i >= CATALOG.length;
    const entry = isExtra
      ? { ...baseSlot, title: prettyTitleFromFilename(images[i]), note: "Pièce d'inventaire" }
      : baseSlot;
    const url = `./images/${images[i]}`;

    const p = new Promise((resolve) => {
      loader.load(url, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;

        const aspect = tex.image.width / tex.image.height;
        const baseH = 1.2 * entry.mount.scale;
        const w = baseH * aspect;
        const h = baseH;

        const { pos, rotY } = resolveMount(entry, rooms, w, h);

        const group = new THREE.Group();
        group.position.copy(pos);
        group.rotation.y = rotY;
        group.userData = { baseRotY: rotY };
        scene.add(group);
        paintingGroups.push(group);

        // Frame
        const frameDepth = 0.05;
        const frameBorder = 0.06;
        const frame = new THREE.Mesh(
          new THREE.BoxGeometry(w + frameBorder*2, h + frameBorder*2, frameDepth),
          frameMaterial
        );
        frame.position.z = -frameDepth/2;
        frame.castShadow = true;
        group.add(frame);

        // Canvas
        const canvas = new THREE.Mesh(
          new THREE.PlaneGeometry(w, h),
          new THREE.MeshStandardMaterial({ map: tex, roughness: 0.82, metalness: 0.0 })
        );
        canvas.position.z = 0.005;
        canvas.receiveShadow = true;
        canvas.userData.painting = true;
        group.add(canvas);
        paintingMeshes.push({ mesh: canvas, entry, url });

        // Spotlight above painting
        const spot = new THREE.SpotLight(0xfff1d4, 2.2, 6, Math.PI*0.32, 0.4, 1.7);
        spot.position.set(0, h/2 + 0.9, 1.0);
        spot.target.position.set(0, 0, 0);
        spot.castShadow = false;
        group.add(spot); group.add(spot.target);

        // Cartel (plaque) to the lower-right
        const cartel = makeCartel(entry, w);
        cartel.position.set(w/2 + 0.05, -h/2 - 0.02, 0.02);
        group.add(cartel);

        // Proximity cartel data
        const worldPos = new THREE.Vector3();
        canvas.getWorldPosition(worldPos);
        loadedCartels.push({ entry, worldPos, mesh: canvas });

        resolve();
      }, undefined, (err) => {
        console.warn('Image manquante :', url, err);
        resolve();
      });
    });

    promises.push(p);
  }

  return Promise.all(promises);
}

function resolveMount(entry, rooms, w, h) {
  const r = rooms[entry.room];
  const m = entry.mount;
  const pos = new THREE.Vector3();
  let rotY = 0;
  switch (m.wall) {
    case 'N': // wall at maxZ → face looks toward -Z → rotY = Math.PI
      pos.set(m.x, m.y, r.maxZ - WALL_OFFSET);
      rotY = Math.PI;
      break;
    case 'S': // wall at minZ → face looks +Z
      pos.set(m.x, m.y, r.minZ + WALL_OFFSET);
      rotY = 0;
      break;
    case 'W': // wall at minX → face looks +X
      pos.set(r.minX + WALL_OFFSET, m.y, m.x);
      rotY = Math.PI/2;
      break;
    case 'E': // wall at maxX → face looks -X
      pos.set(r.maxX - WALL_OFFSET, m.y, m.x);
      rotY = -Math.PI/2;
      break;
  }
  return { pos, rotY };
}

function makeCartel(entry, paintingW) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 220;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#e6ddd1';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = '#3a342c';
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, c.width-3, c.height-3);

  ctx.fillStyle = '#6d5e47';
  ctx.font = 'bold 22px Georgia';
  ctx.fillText(`${entry.num} — ${entry.year}`, 20, 40);

  ctx.fillStyle = '#1a1510';
  ctx.font = 'italic 30px Georgia';
  wrapText(ctx, entry.title, 20, 90, c.width - 40, 36);

  ctx.fillStyle = '#3a342c';
  ctx.font = '18px Georgia';
  wrapText(ctx, entry.note, 20, 170, c.width - 40, 22);

  ctx.fillStyle = '#8a7f6a';
  ctx.font = '14px Georgia';
  ctx.textAlign = 'right';
  ctx.fillText('Delfosse Pascal', c.width - 20, c.height - 16);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;

  const plateW = 0.35, plateH = 0.15;
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(plateW, plateH),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.0 })
  );
  return plate;
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    const test = line + w + ' ';
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line.trim(), x, y);
      line = w + ' ';
      y += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line.trim(), x, y);
}

// Called each frame by main — shows overlay when standing close to a painting
const overlay = document.getElementById('cartel-overlay');
const overlayNum = document.getElementById('cartel-num');
const overlayTitle = document.getElementById('cartel-title');
const overlayDesc = document.getElementById('cartel-desc');

export function updateCartels(camera) {
  let closest = null;
  let minDist = 3.0; // must be within 3 m
  for (const c of loadedCartels) {
    const d = camera.position.distanceTo(c.worldPos);
    if (d < minDist) {
      // Also require camera roughly facing painting
      const dir = new THREE.Vector3().subVectors(c.worldPos, camera.position).normalize();
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      const dot = dir.dot(forward);
      if (dot > 0.55) {
        minDist = d;
        closest = c;
      }
    }
  }
  if (closest) {
    overlayNum.textContent = `${closest.entry.num} · ${closest.entry.year}`;
    overlayTitle.textContent = closest.entry.title;
    overlayDesc.textContent = closest.entry.note;
    overlay.style.display = 'block';
  } else {
    overlay.style.display = 'none';
  }
}
