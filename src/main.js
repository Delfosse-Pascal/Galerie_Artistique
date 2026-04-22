import * as THREE from 'three';
import { buildMuseum } from './museum.js';
import { placePaintings, updateCartels, paintingMeshes } from './paintings.js';
import { Controls } from './controls.js';
import { initAdmin, updateAdmin } from './admin.js';

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

// ---------- Admin panel ----------
paintingsReady.then(() =>
  initAdmin({ scene, renderer, camera, rooms, materials, hemi, ambient: keyAmbient })
);

const adminToggle = document.getElementById('admin-toggle');
const adminPanel  = document.getElementById('admin-panel');
adminToggle?.addEventListener('click', (e) => {
  e.stopPropagation();
  adminPanel.classList.toggle('open');
  if (document.pointerLockElement) document.exitPointerLock();
});
window.addEventListener('keydown', (e) => {
  if (e.key === 'F1') { e.preventDefault(); adminPanel.classList.toggle('open'); }
});

// ---------- Painting click → modal ----------
const paintingModal  = document.getElementById('painting-modal');
const modalImg       = document.getElementById('modal-img');
const modalMeta      = document.getElementById('modal-meta');
const modalTitle     = document.getElementById('modal-title');
const modalDesc      = document.getElementById('modal-desc');
const modalClose     = document.getElementById('modal-close');
const raycaster      = new THREE.Raycaster();
const centerNdc      = new THREE.Vector2(0, 0);
let modalOpen        = false;

function openPainting(pm) {
  modalImg.src       = pm.url;
  modalMeta.textContent  = `${pm.entry.num} · ${pm.entry.year} · ${pm.entry.room.toUpperCase()}`;
  modalTitle.textContent = pm.entry.title;
  modalDesc.textContent  = pm.entry.note;
  paintingModal.classList.add('open');
  modalOpen = true;
  if (document.pointerLockElement) document.exitPointerLock();
}
function closePainting() {
  paintingModal.classList.remove('open');
  modalOpen = false;
}

// Click on painting (only while pointer locked — crosshair in centre).
// Raycast against the full scene so walls and frames occlude distant paintings:
// the painting only opens if it is the FIRST object hit along the line of sight.
renderer.domElement.addEventListener('click', () => {
  if (modalOpen) return;
  if (!document.pointerLockElement) return; // first click just locks pointer
  raycaster.setFromCamera(centerNdc, camera);
  const hits = raycaster.intersectObject(scene, true);
  if (!hits.length) return;
  const first = hits[0];
  if (first.object.userData && first.object.userData.painting) {
    const pm = paintingMeshes.find(p => p.mesh === first.object);
    if (pm) openPainting(pm);
  }
});

// Esc closes modal (capture phase so Controls.js Esc handler ignores)
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalOpen) {
    e.stopPropagation();
    e.preventDefault();
    closePainting();
  }
}, true);

modalClose.addEventListener('click', closePainting);
paintingModal.addEventListener('click', (e) => {
  // click on dark backdrop (not on frame content) closes
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
  renderer.domElement.click();
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
