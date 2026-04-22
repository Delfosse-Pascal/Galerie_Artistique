// =======================================================================
//  Musique — lecteur audio du musée
//  - charge musiques/manifest.json (généré par scripts/gen_manifests.py)
//  - démarrage aléatoire sur geste utilisateur (contourne l'autoplay block)
//  - expose controles pour admin.js (play/pause/next/prev/shuffle/volume)
//  - émet 'music:state' à chaque changement pour que l'UI se remette à jour
// =======================================================================

const state = {
  tracks: [],
  idx: -1,
  shuffle: true,
  loop: true,
  volume: 0.55,
  audio: null,
  ready: false,
};

export async function initMusic() {
  try {
    const r = await fetch('./musiques/manifest.json', { cache: 'no-cache' });
    if (r.ok) {
      const j = await r.json();
      state.tracks = j.items || [];
    }
  } catch (_) { state.tracks = []; }

  state.audio = new Audio();
  state.audio.preload = 'auto';
  state.audio.volume = state.volume;
  state.audio.addEventListener('ended', () => {
    if (state.loop || state.shuffle) next();
    else notify();
  });
  state.audio.addEventListener('play',  notify);
  state.audio.addEventListener('pause', notify);
  state.ready = true;
  notify();
}

export function startRandom() {
  if (!state.tracks.length) return;
  state.idx = Math.floor(Math.random() * state.tracks.length);
  load(state.idx);
  play();
}

export function play()  { state.audio?.play().catch(() => {}); }
export function pause() { state.audio?.pause(); }
export function toggle() {
  if (!state.audio) return;
  state.audio.paused ? play() : pause();
}
export function next() {
  if (!state.tracks.length) return;
  state.idx = state.shuffle
    ? randomOther(state.idx, state.tracks.length)
    : (state.idx + 1) % state.tracks.length;
  load(state.idx);
  play();
}
export function prev() {
  if (!state.tracks.length) return;
  state.idx = (state.idx - 1 + state.tracks.length) % state.tracks.length;
  load(state.idx);
  play();
}
export function setVolume(v) {
  state.volume = Math.max(0, Math.min(1, v));
  if (state.audio) state.audio.volume = state.volume;
  notify();
}
export function setShuffle(b) { state.shuffle = !!b; notify(); }
export function setLoop(b)    { state.loop    = !!b; notify(); }

export function getSnapshot() {
  return {
    track:    state.tracks[state.idx] || '',
    idx:      state.idx,
    count:    state.tracks.length,
    playing:  !!(state.audio && !state.audio.paused && state.idx >= 0),
    shuffle:  state.shuffle,
    loop:     state.loop,
    volume:   state.volume,
    ready:    state.ready,
  };
}

function load(i) {
  if (!state.audio) return;
  state.audio.src = `./musiques/${encodeURIComponent(state.tracks[i])}`;
}
function randomOther(cur, n) {
  if (n <= 1) return 0;
  let j = Math.floor(Math.random() * (n - 1));
  if (j >= cur) j++;
  return j;
}
function notify() {
  window.dispatchEvent(new CustomEvent('music:state', { detail: getSnapshot() }));
}
