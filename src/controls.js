import * as THREE from 'three';

// ----------------------------------------------------------------------------
// First-person controls — drag-to-look
//
// Pas de pointer-lock, pas d'edge-pan (nausée). La caméra tourne uniquement
// quand on maintient le clic gauche et qu'on déplace la souris.
//
//   - W/S ou ↑/↓ : avancer / reculer
//   - A/D ou ←/→ : pas latéral
//   - Shift (maintenu) : courir (×2)
//   - clic gauche + glisser : tourner (yaw)
//   - molette : zoom (FOV)
//   - clic sans glisser : ouvrir un tableau
//
// Pitch (haut/bas) hard-locké à 0 pour éviter le mal de mer.
// ----------------------------------------------------------------------------

const PLAYER_HEIGHT = 1.65;
const PLAYER_RADIUS = 0.35;
const WALK_SPEED    = 2.4;
const RUN_MULT      = 2.0;           // Shift held → sprint multiplier
const YAW_SENS      = 0.0035;        // rad per pixel of horizontal drag
const DRAG_THRESHOLD = 4;            // px — beyond this, mouseup is drag not click
const FOV_MIN       = 12;
const FOV_MAX       = 75;
const ZOOM_STEP     = 2.5;

export class Controls {
  constructor(camera, domElement, colliders) {
    this.camera = camera;
    this.dom = domElement;
    this.colliders = colliders;

    this.yaw = 0;
    this.pitch = 0;
    this.keys = Object.create(null);

    this.dragging   = false;
    this.dragMoved  = false;  // consumed by main.js click handler to skip modal-open after a drag
    this.lastX      = 0;
    this.dragAccum  = 0;

    this.position = new THREE.Vector3(0, PLAYER_HEIGHT, -1.5);
    this.fov = camera.fov;
    this.enabled = true;

    this.#bind();
  }

  #bind() {
    // Start drag only on the canvas — clicks on admin panel / modal don't reach here
    this.dom.addEventListener('mousedown', (e) => {
      if (e.button !== 0 || !this.enabled) return;
      this.dragging = true;
      this.dragMoved = false;
      this.dragAccum = 0;
      this.lastX = e.clientX;
      this.dom.classList.add('dragging');
    });

    // Move/up on window so releasing outside the canvas still ends the drag cleanly
    window.addEventListener('mousemove', (e) => {
      if (!this.dragging) return;
      const dx = e.clientX - this.lastX;
      this.lastX = e.clientX;
      this.yaw -= dx * YAW_SENS;
      this.dragAccum += Math.abs(dx);
      if (this.dragAccum > DRAG_THRESHOLD) this.dragMoved = true;
    });

    const endDrag = () => {
      if (!this.dragging) return;
      this.dragging = false;
      this.dom.classList.remove('dragging');
    };
    window.addEventListener('mouseup', endDrag);
    window.addEventListener('blur', () => { endDrag(); this.keys = Object.create(null); });

    window.addEventListener('wheel', (e) => {
      const d = Math.sign(e.deltaY) * ZOOM_STEP;
      this.fov = Math.max(FOV_MIN, Math.min(FOV_MAX, this.fov + d));
      this.camera.fov = this.fov;
      this.camera.updateProjectionMatrix();
    }, { passive: true });

    document.addEventListener('keydown', (e) => { this.keys[e.code] = true; });
    document.addEventListener('keyup',   (e) => { this.keys[e.code] = false; });
  }

  // AABB vs. sphere (circle in XZ) — true if this position collides
  #hits(x, z) {
    const r = PLAYER_RADIUS;
    for (let i = 0; i < this.colliders.length; i++) {
      const b = this.colliders[i];
      if (b.maxY < 0.1 || b.minY > PLAYER_HEIGHT + 0.1) continue;
      const cx = Math.max(b.minX, Math.min(x, b.maxX));
      const cz = Math.max(b.minZ, Math.min(z, b.maxZ));
      const dx = x - cx, dz = z - cz;
      if (dx*dx + dz*dz < r*r) return true;
    }
    return false;
  }

  update(dt) {
    if (!this.enabled) return;

    // Pitch stays flat (no seasickness)
    this.pitch = 0;

    // ---- Movement (WASD + arrows, Shift = sprint) ----
    const running = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']);
    const speed = WALK_SPEED * (running ? RUN_MULT : 1);

    const fx = -Math.sin(this.yaw);
    const fz = -Math.cos(this.yaw);
    const rx = -fz;
    const rz =  fx;

    let moveF = 0, moveR = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp'])    moveF += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown'])  moveF -= 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft'])  moveR -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveR += 1;

    let dx = fx * moveF + rx * moveR;
    let dz = fz * moveF + rz * moveR;
    const mag = Math.hypot(dx, dz);
    if (mag > 0) {
      const step = speed * dt * Math.min(1, mag);
      dx = (dx / mag) * step;
      dz = (dz / mag) * step;
      const tx = this.position.x + dx;
      if (!this.#hits(tx, this.position.z)) this.position.x = tx;
      const tz = this.position.z + dz;
      if (!this.#hits(this.position.x, tz)) this.position.z = tz;
    }

    this.position.y = PLAYER_HEIGHT;
    this.camera.position.copy(this.position);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    this.camera.rotation.z = 0;
  }
}
