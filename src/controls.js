import * as THREE from 'three';

// ----------------------------------------------------------------------------
// Custom first-person controls
//
// Specifications (voir muse.txt) :
//   - collisions permanentes, hauteur humaine, vitesse modérée
//   - souris X = rotation (yaw) ; souris Y = regard haut/bas (pitch)
//   - Shift + souris Y = avancer/reculer ("mouvement avant/arrière avec la souris")
//   - molette = zoom (FOV) — "zoom puissant avec la molette"
//   - W/S ou ↑/↓  : avancer / reculer (clavier)
//   - A/D ou ←/→  : déplacement latéral
//   - si la caméra touche un mur, le mouvement dans cette direction est bloqué
//     (axe-par-axe : on peut repartir en arrière ou sur le côté libre)
//   - pas de vol libre, pas de traversée de géométrie
// ----------------------------------------------------------------------------

const PLAYER_HEIGHT = 1.65;          // m (yeux)
const PLAYER_RADIUS = 0.35;          // m (rayon de collision)
const WALK_SPEED    = 2.4;           // m/s — vitesse modérée
const MOUSE_SENS    = 0.0022;
const PITCH_LIMIT   = 1.25;          // rad (~71°)
const FOV_MIN       = 12;
const FOV_MAX       = 75;
const ZOOM_STEP     = 2.5;
const MOUSE_WALK_GAIN = 0.012;       // shift+mouse Y → forward delta

export class Controls {
  constructor(camera, domElement, colliders) {
    this.camera = camera;
    this.dom = domElement;
    this.colliders = colliders;

    this.yaw = 0;
    this.pitch = 0;
    this.locked = false;
    this.keys = Object.create(null);
    this.shift = false;
    this.mouseWalkBuffer = 0;

    this.position = new THREE.Vector3(0, PLAYER_HEIGHT, -1.5); // start in lobby
    this.fov = camera.fov;

    this.#bind();
  }

  #bind() {
    this.dom.addEventListener('click', () => {
      if (!this.locked) this.dom.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
      this.locked = (document.pointerLockElement === this.dom);
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.yaw -= e.movementX * MOUSE_SENS;
      if (this.shift) {
        // "mouvement avant/arrière avec la souris" : shift maintenu, Y souris = walk
        // Mouse up (negative movementY) = forward
        this.mouseWalkBuffer += -e.movementY * MOUSE_WALK_GAIN;
      } else {
        // "haut et bas avec la souris" : regard vertical
        this.pitch -= e.movementY * MOUSE_SENS;
        if (this.pitch >  PITCH_LIMIT) this.pitch =  PITCH_LIMIT;
        if (this.pitch < -PITCH_LIMIT) this.pitch = -PITCH_LIMIT;
      }
    });

    document.addEventListener('wheel', (e) => {
      const d = Math.sign(e.deltaY) * ZOOM_STEP;
      this.fov = Math.max(FOV_MIN, Math.min(FOV_MAX, this.fov + d));
      this.camera.fov = this.fov;
      this.camera.updateProjectionMatrix();
    }, { passive: true });

    document.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.shift = true;
      if (e.code === 'Escape' && this.locked) document.exitPointerLock();
    });
    document.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.shift = false;
    });

    window.addEventListener('blur', () => {
      this.keys = Object.create(null);
      this.shift = false;
    });
  }

  // AABB vs. sphere (circle in XZ) — returns true if position would collide
  #hits(x, z) {
    const r = PLAYER_RADIUS;
    // Player vertical slab: feet 0..head PLAYER_HEIGHT. Only check AABBs overlapping that Y slab.
    for (let i = 0; i < this.colliders.length; i++) {
      const b = this.colliders[i];
      if (b.maxY < 0.1 || b.minY > PLAYER_HEIGHT + 0.1) continue;
      // closest point on AABB (XZ)
      const cx = Math.max(b.minX, Math.min(x, b.maxX));
      const cz = Math.max(b.minZ, Math.min(z, b.maxZ));
      const dx = x - cx, dz = z - cz;
      if (dx*dx + dz*dz < r*r) return true;
    }
    return false;
  }

  update(dt) {
    // Direction vectors from yaw
    const fx = -Math.sin(this.yaw);
    const fz = -Math.cos(this.yaw);
    const rx = -fz;
    const rz =  fx;

    let moveF = 0, moveR = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp'])    moveF += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown'])  moveF -= 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft'])  moveR -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveR += 1;

    // Consume mouse-walk buffer (Shift + Y)
    if (Math.abs(this.mouseWalkBuffer) > 0.0001) {
      moveF += this.mouseWalkBuffer;
      this.mouseWalkBuffer = 0;
    }

    let dx = fx * moveF + rx * moveR;
    let dz = fz * moveF + rz * moveR;
    const mag = Math.hypot(dx, dz);
    if (mag > 0) {
      // Cap effective speed
      const maxStep = WALK_SPEED * dt * Math.min(1, mag);
      dx = (dx / mag) * maxStep;
      dz = (dz / mag) * maxStep;

      // Axis-separated sliding: try X then Z
      const nx = this.position.x + dx;
      if (!this.#hits(nx, this.position.z)) this.position.x = nx;
      const nz = this.position.z + dz;
      if (!this.#hits(this.position.x, nz)) this.position.z = nz;
    }

    // Lock Y at eye height
    this.position.y = PLAYER_HEIGHT;

    // Apply to camera
    this.camera.position.copy(this.position);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    this.camera.rotation.z = 0;
  }
}
