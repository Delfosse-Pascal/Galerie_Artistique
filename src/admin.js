import * as THREE from 'three';
import { paintingGroups, setFrameStyle } from './paintings.js';
import * as Music from './music.js';

// =======================================================================
//  Admin panel — Mosaic texture manager + live scene tuning
//  Works on materials tagged via userData.surface = 'wall'|'floor'|'ceiling'
// =======================================================================

// Chaque surface a sa propre sous-dossier : les textures de mur ne vont
// jamais sur le plafond ni le sol, etc.
const SUBFOLDER = { wall: 'mur', ceiling: 'plafond', floor: 'sol' };

const state = {
  folder: 'texturegif',       // racine des sous-dossiers
  imageFolder: 'images',
  texturesBySurface: { wall: [], floor: [], ceiling: [] },   // listes par surface
  loadedTex: new Map(),       // "surface::filename" -> THREE.Texture (cache)
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

  // Place les textures mosaic immédiatement (3 textures différentes pour mur/sol/plafond)
  await applyDefaultTextures();

  buildUI();
  updateStats();
}

async function applyDefaultTextures() {
  // Tire une texture aléatoire dans le sous-dossier dédié à chaque surface.
  // Garanti : mur ne reçoit que des fichiers de texturegif/mur, etc.
  const pickRandom = (surface) => {
    const pool = state.texturesBySurface[surface];
    if (!pool.length) return null;
    const i = Math.floor(Math.random() * pool.length);
    state.idx[surface] = i;
    return pool[i];
  };
  const w = pickRandom('wall');
  const f = pickRandom('floor');
  const c = pickRandom('ceiling');
  await Promise.all([
    w && applyTexture('wall',    w, 4),
    f && applyTexture('floor',   f, 6),
    c && applyTexture('ceiling', c, 3),
  ]);
}

async function loadManifest() {
  try {
    const r = await fetch(`./${state.folder}/manifest.json`, { cache: 'no-cache' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    state.folder = j.folder || state.folder;
    // Nouveau schema : { mur: [...], plafond: [...], sol: [...] }
    // Ancien schema : { items: [...] } (tout en vrac, réutilisé pour les 3 surfaces)
    if (j.mur || j.plafond || j.sol) {
      state.texturesBySurface.wall    = j.mur     || [];
      state.texturesBySurface.ceiling = j.plafond || [];
      state.texturesBySurface.floor   = j.sol     || [];
    } else {
      const flat = j.items || j.textures || [];
      state.texturesBySurface.wall    = flat.slice();
      state.texturesBySurface.ceiling = flat.slice();
      state.texturesBySurface.floor   = flat.slice();
    }
  } catch (e) {
    console.warn('Manifest texturegif introuvable —', e.message);
    state.texturesBySurface = { wall: [], floor: [], ceiling: [] };
  }
}

function loadTex(surface, filename) {
  const key = `${surface}::${filename}`;
  if (state.loadedTex.has(key)) return Promise.resolve(state.loadedTex.get(key));
  const sub = SUBFOLDER[surface];
  const url = `./${state.folder}/${sub}/${encodeURIComponent(filename)}`;
  return new Promise((resolve) => {
    loader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.anisotropy = 8;
        state.loadedTex.set(key, tex);
        resolve(tex);
      },
      undefined,
      (err) => { console.warn('Texture load fail:', url, err); resolve(null); }
    );
  });
}

async function applyTexture(surface, filename, repeat = 4) {
  const tex = await loadTex(surface, filename);
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
  const pool = state.texturesBySurface[surface];
  if (!pool.length) return;
  state.idx[surface] = (state.idx[surface] + 1) % pool.length;
  const f = pool[state.idx[surface]];
  applyTexture(surface, f);
  setBadge(surface, f);
}

function randomizeAll() {
  for (const s of ['wall', 'floor', 'ceiling']) {
    const pool = state.texturesBySurface[s];
    if (!pool.length) continue;
    state.idx[s] = Math.floor(Math.random() * pool.length);
    const f = pool[state.idx[s]];
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
    <button class="admin-closebtn" id="admin-close" title="Fermer (Esc)">✕</button>
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

    <div class="admin-section">🎵 Musique</div>
    <div class="music-now" id="music-now">—</div>
    <div class="music-row">
      <button class="admin-btn music-mini" data-m="prev"   title="Précédente">⏮</button>
      <button class="admin-btn music-mini" data-m="toggle" title="Lecture/Pause" id="music-toggle">▶</button>
      <button class="admin-btn music-mini" data-m="next"   title="Suivante">⏭</button>
    </div>
    <div class="music-row">
      <label class="music-chk"><input type="checkbox" id="music-shuffle" /> 🔀 Aléatoire</label>
      <label class="music-chk"><input type="checkbox" id="music-loop" /> 🔁 Boucle</label>
    </div>
    <label class="admin-label" id="lbl-vol">Volume : 55%</label>
    <input id="music-vol" class="admin-slider" type="range" min="0" max="100" value="55" />

    <div class="admin-section">Statistiques</div>
    <div class="admin-stats" id="admin-stats"></div>
  `;

  // Close button
  panel.querySelector('#admin-close').addEventListener('click', () => {
    panel.classList.remove('open');
    window.dispatchEvent(new CustomEvent('admin:closed'));
  });

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

  // ------------ Music controls ------------
  panel.querySelectorAll('[data-m]').forEach(b => {
    b.addEventListener('click', () => {
      const a = b.dataset.m;
      if (a === 'toggle') Music.toggle();
      else if (a === 'next') Music.next();
      else if (a === 'prev') Music.prev();
    });
  });
  const shuffleCk = panel.querySelector('#music-shuffle');
  const loopCk    = panel.querySelector('#music-loop');
  const volSlider = panel.querySelector('#music-vol');
  const volLabel  = panel.querySelector('#lbl-vol');
  const s0 = Music.getSnapshot();
  shuffleCk.checked = s0.shuffle;
  loopCk.checked    = s0.loop;
  volSlider.value   = Math.round(s0.volume * 100);
  volLabel.textContent = `Volume : ${Math.round(s0.volume * 100)}%`;
  shuffleCk.addEventListener('change', () => Music.setShuffle(shuffleCk.checked));
  loopCk.addEventListener('change',    () => Music.setLoop(loopCk.checked));
  volSlider.addEventListener('input',  () => {
    const v = volSlider.value / 100;
    Music.setVolume(v);
    volLabel.textContent = `Volume : ${volSlider.value}%`;
  });

  window.addEventListener('music:state', (e) => {
    const s = e.detail;
    const btn = document.getElementById('music-toggle');
    const now = document.getElementById('music-now');
    if (btn) btn.textContent = s.playing ? '⏸' : '▶';
    if (now) {
      const name = s.track ? s.track.replace(/\.[^.]+$/, '') : '—';
      now.textContent = s.count ? `${s.idx + 1}/${s.count} · ${name}` : 'Aucune musique';
    }
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
  const m = Music.getSnapshot();
  const tw = state.texturesBySurface.wall.length;
  const tc = state.texturesBySurface.ceiling.length;
  const tf = state.texturesBySurface.floor.length;
  el.innerHTML = `
    <div>📁 Dossier images : <b>${state.imageFolder}</b></div>
    <div>🖼️ Tableaux affichés : <b>${frames}</b></div>
    <div>🎵 Musiques : <b>${m.count}</b></div>
    <div>🎞️ Vidéos : <b>0</b></div>
    <div>💾 Textures mur/plafond/sol : <b>${tw}</b>/<b>${tc}</b>/<b>${tf}</b></div>
    <div>🖼️ Cadres rendus : <b>${frames * 2}</b></div>
  `;
}
