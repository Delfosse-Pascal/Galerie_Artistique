import * as THREE from 'three';
import { buildMuseum } from './museum.js';
import { placePaintings, updateCartels, paintingMeshes } from './paintings.js';
import { Controls } from './controls.js';
import { initAdmin, updateAdmin } from './admin.js';
import { initMusic, startRandom as startRandomMusic } from './music.js';

const app = document.getElementById('app');
const startBtn = document.getElementById('start-btn');
const loading = document.getElementById('loading');
const startPanel = document.getElementById('start');
const roomName = document.getElementById('room-name');

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
app.appendChild(renderer.domElement);

// ---------- Scene ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe8dfd1);
// Fog désactivé temporairement — mode visibilité pastel
// scene.fog = new THREE.FogExp2(0xe8dfd1, 0.004);

// ---------- Camera ----------
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.05, 200);
camera.position.set(0, 1.65, -1);

// ---------- Ambient — mode pastel visibilité ----------
const hemi = new THREE.HemisphereLight(0xfff3e0, 0xd0c8b8, 1.3);
scene.add(hemi);
const keyAmbient = new THREE.AmbientLight(0xffffff, 0.75);
scene.add(keyAmbient);

// ---------- Museum architecture ----------
const { rooms, colliders, roomLabels, materials } = buildMuseum(scene);

// ---------- Paintings ----------
const paintingsReady = placePaintings(scene, rooms);

// ---------- Controls ----------
const controls = new Controls(camera, renderer.domElement, colliders);

// ---------- Music ----------
initMusic();

// ---------- Admin panel ----------
paintingsReady.then(() =>
  initAdmin({ scene, renderer, camera, rooms, materials, hemi, ambient: keyAmbient })
);

const adminToggle = document.getElementById('admin-toggle');
const adminPanel  = document.getElementById('admin-panel');
function toggleAdmin() {
  const open = adminPanel.classList.toggle('open');
  adminToggle.style.right = open ? '360px' : '14px';  // slide clear of panel when open
  controls.enabled = !(open || modalOpen);             // freeze camera while any overlay is visible
}
adminToggle?.addEventListener('click', (e) => { e.stopPropagation(); toggleAdmin(); });
window.addEventListener('keydown', (e) => {
  if (e.key === 'F1') { e.preventDefault(); toggleAdmin(); }
});
// Admin panel may close itself (close button inside) — re-enable controls + reset toggle
window.addEventListener('admin:closed', () => {
  adminToggle.style.right = '14px';
  controls.enabled = !modalOpen;
});

// ---------- Painting click → modal ----------
const paintingModal  = document.getElementById('painting-modal');
const modalImg       = document.getElementById('modal-img');
const modalMeta      = document.getElementById('modal-meta');
const modalTitle     = document.getElementById('modal-title');
const modalDesc      = document.getElementById('modal-desc');
const modalClose     = document.getElementById('modal-close');
const raycaster      = new THREE.Raycaster();
let modalOpen        = false;

function openPainting(pm) {
  modalImg.src       = pm.url;
  modalMeta.textContent  = `${pm.entry.num} · ${pm.entry.year} · ${pm.entry.room.toUpperCase()}`;
  modalTitle.textContent = pm.entry.title;
  modalDesc.textContent  = pm.entry.note;
  paintingModal.classList.add('open');
  modalOpen = true;
  controls.enabled = false;
}
function closePainting() {
  paintingModal.classList.remove('open');
  modalOpen = false;
  controls.enabled = !adminPanel.classList.contains('open');
}

// Click on painting — raycast from exact cursor NDC against full scene.
// Walls/frames/benches occlude, so distant paintings only open with clear line of sight.
renderer.domElement.addEventListener('click', (e) => {
  if (modalOpen) return;
  const rect = renderer.domElement.getBoundingClientRect();
  const ndc = new THREE.Vector2(
     ((e.clientX - rect.left) / rect.width)  * 2 - 1,
    -((e.clientY - rect.top)  / rect.height) * 2 + 1
  );
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObject(scene, true);
  if (!hits.length) return;
  const first = hits[0];
  if (first.object.userData && first.object.userData.painting) {
    const pm = paintingMeshes.find(p => p.mesh === first.object);
    if (pm) openPainting(pm);
  }
});

// Esc closes modal first, then admin panel if open
window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (modalOpen)                          { closePainting(); return; }
  if (adminPanel.classList.contains('open')) { toggleAdmin();  return; }
});

modalClose.addEventListener('click', closePainting);
paintingModal.addEventListener('click', (e) => {
  if (e.target === paintingModal) closePainting();
});

// ---------- Resize ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Start button ----------
paintingsReady.then(() => {
  loading.textContent = 'Prêt à entrer.';
  startBtn.disabled = false;
  startBtn.textContent = 'Entrer dans le musée';
});
startBtn.addEventListener('click', () => {
  startPanel.style.display = 'none';
  renderer.domElement.focus();
  startRandomMusic();   // autoplay ok : déclenché par geste utilisateur
});

// ---------- Loop ----------
const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(0.05, clock.getDelta());
  if (!modalOpen) controls.update(dt);
  updateAdmin(dt);

  // Room label from current position
  const p = controls.position;
  let current = '';
  for (const r of roomLabels) {
    if (p.x >= r.minX && p.x <= r.maxX && p.z >= r.minZ && p.z <= r.maxZ) {
      current = r.name;
      break;
    }
  }
  roomName.textContent = current;

  updateCartels(camera);

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
frame();
