import * as THREE from 'three';

// ----------------------------------------------------------------------------
// First-person controls — NO pointer-lock
//
// Cursor stays visible at all times (custom red crosshair via CSS).
// Camera rotates when the mouse approaches the screen edges (edge-pan),
// so you aim by moving the cursor. A central dead-zone keeps the view still
// when the cursor is near screen centre.
//
//   - W/S  ou ↑/↓ : avancer / reculer
//   - A/D  ou ←/→ : pas latéral
//   - souris bords : tourner / regarder haut-bas
//   - molette : zoom (FOV)
//   - clic sur tableau : ouvrir la fiche
// ----------------------------------------------------------------------------

const PLAYER_HEIGHT = 1.65;
const PLAYER_RADIUS = 0.35;
const WALK_SPEED    = 2.4;
const YAW_SPEED     = 2.1;   // rad/s at screen edge
const PITCH_SPEED   = 1.3;
const DEADZONE      = 0.22;  // fraction of half-screen where no rotation occurs
const PITCH_LIMIT   = 1.25;
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
    this.mouseNDC = new THREE.Vector2(0, 0);  // x right, y down (screen-normalised, −1..1)

    this.position = new THREE.Vector3(0, PLAYER_HEIGHT, -1.5);
    this.fov = camera.fov;
    this.enabled = true;

    this.#bind();
  }

  #bind() {
    window.addEventListener('mousemove', (e) => {
      this.mouseNDC.x = (e.clientX / window.innerWidth)  * 2 - 1;
      this.mouseNDC.y = (e.clientY / window.innerHeight) * 2 - 1;
    });

    window.addEventListener('wheel', (e) => {
      const d = Math.sign(e.deltaY) * ZOOM_STEP;
      this.fov = Math.max(FOV_MIN, Math.min(FOV_MAX, this.fov + d));
      this.camera.fov = this.fov;
      this.camera.updateProjectionMatrix();
    }, { passive: true });

    document.addEventListener('keydown', (e) => { this.keys[e.code] = true; });
    document.addEventListener('keyup',   (e) => { this.keys[e.code] = false; });
    window.addEventListener('blur', () => { this.keys = Object.create(null); });
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

    // ---- Edge-pan rotation (yaw seulement — pitch figé pour éviter mal de mer) ----
    const nx = this.mouseNDC.x;
    if (Math.abs(nx) > DEADZONE) {
      const eff = (nx - Math.sign(nx) * DEADZONE) / (1 - DEADZONE);
      this.yaw -= eff * YAW_SPEED * dt;
    }
    this.pitch = 0;

    // ---- Movement (WASD + arrows) ----
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
      const step = WALK_SPEED * dt * Math.min(1, mag);
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
