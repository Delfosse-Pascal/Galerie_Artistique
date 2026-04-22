import * as THREE from 'three';
import { paintingGroups, setFrameStyle } from './paintings.js';

// =======================================================================
//  Admin panel — Mosaic texture manager + live scene tuning
//  Works on materials tagged via userData.surface = 'wall'|'floor'|'ceiling'
// =======================================================================

const state = {
  textures: [],               // list of GIF filenames from manifest
  folder: 'texturegif',       // current texture folder
  imageFolder: 'images',
  loadedTex: new Map(),       // filename -> THREE.Texture (cached)
  idx: { wall: 0, floor: 0, ceiling: 0 },
  ambiance: 0.60,             // 0..1
  zoom: 1.0,
  rotSpeedDeg: 0.0,
  rotAccum: 0,
  frameStyle: 'or',
  baseFov: 60,
  hemiBase: 1.3,
  ambBase: 0.75,
  exposureBase: 1.05,
};

const loader = new THREE.TextureLoader();

export async function initAdmin(ctx) {
  // ctx = { scene, renderer, camera, rooms, materials, hemi, ambient }
  state.ctx = ctx;

  state.baseFov      = ctx.camera.fov;
  state.hemiBase     = ctx.hemi.intensity;
  state.ambBase      = ctx.ambient.intensity;
  state.exposureBase = ctx.renderer.toneMappingExposure;

  // Collect materials by surface tag
  state.matsBySurface = { wall: [], floor: [], ceiling: [] };
  for (const key of Object.keys(ctx.materials)) {
    const group = ctx.materials[key];
    state.matsBySurface.wall.push(group.wall);
    state.matsBySurface.floor.push(group.floor);
    state.matsBySurface.ceiling.push(group.ceiling);
  }

  await loadManifest();
  applyFrameStyle(state.frameStyle);
  applyAmbiance(state.ambiance);
  applyZoom(state.zoom);

  buildUI();
  updateStats();
}

async function loadManifest() {
  try {
    const r = await fetch(`./${state.folder}/manifest.json`, { cache: 'no-cache' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    state.textures = j.textures || [];
    state.folder = j.folder || state.folder;
  } catch (e) {
    console.warn('Manifest texturegif introuvable —', e.message);
    state.textures = [];
  }
}

function loadTex(filename) {
  if (state.loadedTex.has(filename)) return Promise.resolve(state.loadedTex.get(filename));
  return new Promise((resolve) => {
    loader.load(
      `./${state.folder}/${filename}`,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.anisotropy = 8;
        state.loadedTex.set(filename, tex);
        resolve(tex);
      },
      undefined,
      (err) => { console.warn('Texture load fail:', filename, err); resolve(null); }
    );
  });
}

async function applyTexture(surface, filename, repeat = 4) {
  const tex = await loadTex(filename);
  if (!tex) return;
  const clone = tex.clone();
  clone.wrapS = clone.wrapT = THREE.RepeatWrapping;
  clone.repeat.set(repeat, repeat);
  clone.needsUpdate = true;
  for (const m of state.matsBySurface[surface]) {
    m.map = clone;
    m.color.setHex(0xffffff);       // let texture color show
    m.needsUpdate = true;
  }
}

function resetTexture(surface) {
  for (const m of state.matsBySurface[surface]) {
    m.map = null;
    m.color.setHex(m.userData.baseColor);
    m.needsUpdate = true;
  }
}

function cycleTexture(surface) {
  if (!state.textures.length) return;
  state.idx[surface] = (state.idx[surface] + 1) % state.textures.length;
  const f = state.textures[state.idx[surface]];
  applyTexture(surface, f);
  setBadge(surface, f);
}

function randomizeAll() {
  if (!state.textures.length) return;
  for (const s of ['wall', 'floor', 'ceiling']) {
    state.idx[s] = Math.floor(Math.random() * state.textures.length);
    const f = state.textures[state.idx[s]];
    applyTexture(s, f);
    setBadge(s, f);
  }
}

function resetAllTextures() {
  for (const s of ['wall', 'floor', 'ceiling']) {
    resetTexture(s);
    setBadge(s, '—');
  }
}

function applyAmbiance(v) {
  state.ambiance = v;
  const { hemi, ambient, renderer } = state.ctx;
  hemi.intensity     = 0.15 + v * 1.45;
  ambient.intensity  = 0.08 + v * 0.90;
  renderer.toneMappingExposure = 0.55 + v * 0.85;
}

function applyZoom(v) {
  state.zoom = v;
  state.ctx.camera.fov = state.baseFov / v;
  state.ctx.camera.updateProjectionMatrix();
}

function applyFrameStyle(name) {
  state.frameStyle = name;
  setFrameStyle(name);
}

// Called each frame from main loop
export function updateAdmin(dt) {
  if (state.rotSpeedDeg === 0) return;
  state.rotAccum += state.rotSpeedDeg * (Math.PI / 180) * dt * 60;
  for (const g of paintingGroups) {
    g.rotation.y = g.userData.baseRotY + state.rotAccum;
  }
}

// ==================== UI ====================

function buildUI() {
  const panel = document.getElementById('admin-panel');
  if (!panel) return;

  panel.innerHTML = `
    <div class="admin-title"><span class="gear">⚙</span> Administration</div>

    <div class="admin-section">Actions</div>
    <button class="admin-btn" data-a="refresh">🔄 Rafraîchir l'affichage</button>
    <button class="admin-btn" data-a="rescan">📁 Re-scanner le dossier</button>
    <button class="admin-btn" data-a="changefolder">📂 Changer de dossier</button>

    <div class="admin-section">🎨 Textures</div>
    <button class="admin-btn" data-a="wall"><span class="pill wall">▦</span>Changer texture des murs</button>
    <button class="admin-btn" data-a="ceiling"><span class="pill ceil">⇪</span>Changer texture du plafond</button>
    <button class="admin-btn" data-a="floor"><span class="pill floor">▢</span>Changer texture du sol</button>
    <button class="admin-btn" data-a="random">🎲 Textures aléatoires</button>
    <button class="admin-btn" data-a="resettex">🔁 Réinitialiser textures</button>

    <label class="admin-label">Style des cadres</label>
    <select id="admin-frame" class="admin-select">
      <option value="or">Or</option>
      <option value="argent">Argent</option>
      <option value="bronze">Bronze</option>
      <option value="boisfonce">Bois foncé</option>
      <option value="noir">Noir mat</option>
      <option value="blanc">Blanc</option>
    </select>

    <label class="admin-label" id="lbl-amb">Ambiance tamisée : 60%</label>
    <input id="admin-amb" class="admin-slider" type="range" min="0" max="100" value="60" />

    <label class="admin-label" id="lbl-zoom">Zoom : 1.0</label>
    <input id="admin-zoom" class="admin-slider" type="range" min="5" max="25" value="10" />

    <label class="admin-label" id="lbl-rot">Vitesse rotation : 0.0°/frame</label>
    <input id="admin-rot" class="admin-slider" type="range" min="0" max="30" value="0" />

    <div class="admin-section">Statistiques</div>
    <div class="admin-stats" id="admin-stats"></div>
  `;

  // Texture buttons
  panel.querySelectorAll('.admin-btn').forEach(b => {
    b.addEventListener('click', () => handleAction(b.dataset.a));
  });

  // Frame dropdown
  const sel = panel.querySelector('#admin-frame');
  sel.value = state.frameStyle;
  sel.addEventListener('change', () => applyFrameStyle(sel.value));

  // Ambiance slider
  const amb = panel.querySelector('#admin-amb');
  const ambLbl = panel.querySelector('#lbl-amb');
  amb.addEventListener('input', () => {
    const v = amb.value / 100;
    applyAmbiance(v);
    ambLbl.textContent = `Ambiance tamisée : ${amb.value}%`;
  });

  // Zoom slider
  const zm = panel.querySelector('#admin-zoom');
  const zmLbl = panel.querySelector('#lbl-zoom');
  zm.addEventListener('input', () => {
    const v = zm.value / 10;
    applyZoom(v);
    zmLbl.textContent = `Zoom : ${v.toFixed(1)}`;
  });

  // Rotation slider
  const rot = panel.querySelector('#admin-rot');
  const rotLbl = panel.querySelector('#lbl-rot');
  rot.addEventListener('input', () => {
    state.rotSpeedDeg = rot.value / 10;
    rotLbl.textContent = `Vitesse rotation : ${state.rotSpeedDeg.toFixed(1)}°/frame`;
  });
}

function handleAction(a) {
  switch (a) {
    case 'refresh':
      applyAmbiance(state.ambiance);
      updateStats();
      break;
    case 'rescan':
      loadManifest().then(updateStats);
      break;
    case 'changefolder': {
      const next = prompt('Nouveau dossier de textures :', state.folder);
      if (next && next.trim()) {
        state.folder = next.trim();
        state.loadedTex.clear();
        loadManifest().then(updateStats);
      }
      break;
    }
    case 'wall':    cycleTexture('wall'); break;
    case 'floor':   cycleTexture('floor'); break;
    case 'ceiling': cycleTexture('ceiling'); break;
    case 'random':  randomizeAll(); break;
    case 'resettex': resetAllTextures(); break;
  }
}

function setBadge(surface, name) {
  // Could show last-applied texture per surface — kept simple for now
}

function updateStats() {
  const el = document.getElementById('admin-stats');
  if (!el) return;
  const frames = paintingGroups.length;
  el.innerHTML = `
    <div>📁 Dossier : <b>${state.imageFolder}</b></div>
    <div>🖼️ Images : <b>${frames}</b></div>
    <div>🎞️ Vidéos : <b>0</b></div>
    <div>📂 Sous-dossiers : <b>1</b></div>
    <div>💾 Textures : <b>${state.textures.length}</b></div>
    <div>🖼️ Cadres affichés : <b>${frames * 2}</b></div>
  `;
}
