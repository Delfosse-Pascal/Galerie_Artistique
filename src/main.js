import * as THREE from 'three';
import { buildMuseum } from './museum.js';
import { placePaintings, updateCartels } from './paintings.js';
import { Controls } from './controls.js';

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
scene.background = new THREE.Color(0x07060a);
scene.fog = new THREE.FogExp2(0x0b0a0f, 0.018);

// ---------- Camera ----------
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.05, 200);
camera.position.set(0, 1.65, -1);

// ---------- Ambient low fill (stone reflection) ----------
const hemi = new THREE.HemisphereLight(0x9bb0c9, 0x1a1510, 0.18);
scene.add(hemi);
const keyAmbient = new THREE.AmbientLight(0x2a2620, 0.12);
scene.add(keyAmbient);

// ---------- Museum architecture ----------
const { rooms, colliders, roomLabels } = buildMuseum(scene);

// ---------- Paintings ----------
const paintingsReady = placePaintings(scene, rooms);

// ---------- Controls ----------
const controls = new Controls(camera, renderer.domElement, colliders);

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
  controls.update(dt);

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
