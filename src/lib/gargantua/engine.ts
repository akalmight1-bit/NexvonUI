/**
 * Interactive Gargantua engine — port of the working nexvon-preview.html
 * Raw WebGL (no Three.js). Drag to orbit, click to disturb, double-click auto-orbit.
 */
import rayFrag from "./ray.frag.glsl?raw";

const VERT = `
attribute vec2 position;
varying vec2 vUv;
void main(){
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const HOME = { x: 4.49, y: 2.72, z: 25.46 };
const FOV_DEG = 44;

type Vec3 = { x: number; y: number; z: number };
type Spherical = { theta: number; phi: number; radius: number };
type Particle = { a: number; r: number; life: number };

function vecToSpherical(v: Vec3): Spherical {
  const radius = Math.hypot(v.x, v.y, v.z);
  if (radius === 0) return { theta: 0, phi: 0, radius: 0 };
  return {
    theta: Math.atan2(v.x, v.z),
    phi: Math.acos(Math.max(-1, Math.min(1, v.y / radius))),
    radius,
  };
}

function sphericalToVec(s: Spherical): Vec3 {
  const sinPhiRadius = Math.sin(s.phi) * s.radius;
  return {
    x: sinPhiRadius * Math.sin(s.theta),
    y: Math.cos(s.phi) * s.radius,
    z: sinPhiRadius * Math.cos(s.theta),
  };
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}
function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}
function scale(a: Vec3, s: number): Vec3 {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}
function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}
function dot(a: Vec3, b: Vec3) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}
function norm(a: Vec3): Vec3 {
  const l = Math.hypot(a.x, a.y, a.z) || 1;
  return { x: a.x / l, y: a.y / l, z: a.z / l };
}

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type);
  if (!s) throw new Error("createShader failed");
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(s) || "shader compile error");
  }
  return s;
}

export class GargantuaEngine {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private prog: WebGLProgram;
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private partLocs: (WebGLUniformLocation | null)[] = [];
  private target: Vec3 = { x: 0, y: 0, z: 0 };
  private spherical: Spherical;
  private camPos: Vec3;
  private steps = 220;
  private pulse = 0;
  private energy = 0;
  private tug = 0;
  private rotSpeed = 1;
  private diskBright = 1;
  private rippleOrigin = { x: 0, y: 0 };
  private rippleT = 10;
  private rippleAmp = 0;
  private particles: Particle[] = [];
  private autoOrbit = false;
  private simTime = 0;
  private last = performance.now();
  private rafId = 0;
  private running = false;
  private disposed = false;
  private pointer = { down: false, x: 0, y: 0, moved: false };

  private onResize: () => void;
  private onPointerDown: (e: PointerEvent) => void;
  private onPointerMove: (e: PointerEvent) => void;
  private onPointerUp: (e: PointerEvent) => void;
  private onWheel: (e: WheelEvent) => void;
  private onDblClick: (e: MouseEvent) => void;
  private onVisibility: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext("webgl", {
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
    });
    if (!gl) throw new Error("WebGL unavailable");
    this.gl = gl;

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, rayFrag);
    const prog = gl.createProgram();
    if (!prog) throw new Error("createProgram failed");
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(prog) || "link failed");
    }
    this.prog = prog;
    gl.useProgram(prog);

    const posLoc = gl.getAttribLocation(prog, "position");
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, -1, 1, 1, -1, 1]),
      gl.STATIC_DRAW,
    );
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const names = [
      "uRes",
      "uTime",
      "uCamPos",
      "uCamTarget",
      "uFov",
      "uSteps",
      "uRotSign",
      "uDin",
      "uDout",
      "uDopMax",
      "uOpNear",
      "uOpFar",
      "uDiskBright",
      "uStarBright",
      "uSkyFloor",
      "uRotSpeed",
      "uPulse",
      "uEnergy",
      "uRippleOrigin",
      "uRippleT",
      "uRippleAmp",
      "uPartCount",
    ];
    for (const n of names) this.uniforms[n] = gl.getUniformLocation(prog, n);
    for (let i = 0; i < 16; i++) {
      this.partLocs.push(gl.getUniformLocation(prog, `uPart[${i}]`));
    }

    this.spherical = vecToSpherical(HOME);
    this.camPos = { ...HOME };
    this.applySpherical();

    this.onResize = () => this.resize();
    this.onVisibility = () => {
      if (document.hidden) this.stopLoop();
      else if (this.running) this.startLoop();
    };
    this.onPointerDown = (e) => {
      if (e.button !== 0) return;
      this.pointer = { down: true, x: e.clientX, y: e.clientY, moved: false };
    };
    this.onPointerMove = (e) => {
      if (!this.pointer.down) return;
      const dx = e.clientX - this.pointer.x;
      const dy = e.clientY - this.pointer.y;
      if (Math.hypot(dx, dy) > 4) this.pointer.moved = true;
      const h = this.canvas.clientHeight || 1;
      this.spherical.theta -= 2 * Math.PI * (dx / h) * 0.55;
      this.spherical.phi = Math.max(
        0.02,
        Math.min(Math.PI - 0.02, this.spherical.phi - 2 * Math.PI * (dy / h) * 0.55),
      );
      this.applySpherical();
      this.pointer.x = e.clientX;
      this.pointer.y = e.clientY;
    };
    this.onPointerUp = (e) => {
      if (!this.pointer.down) return;
      const moved = this.pointer.moved;
      this.pointer.down = false;
      if (!moved) this.interact(e.clientX, e.clientY);
    };
    this.onWheel = (e) => {
      e.preventDefault();
      this.spherical.radius = Math.max(
        1.72,
        Math.min(90, this.spherical.radius * Math.pow(1.0015, e.deltaY)),
      );
      this.applySpherical();
    };
    this.onDblClick = (e) => {
      e.preventDefault();
      this.autoOrbit = !this.autoOrbit;
    };

    window.addEventListener("resize", this.onResize);
    window.addEventListener("orientationchange", this.onResize);
    document.addEventListener("visibilitychange", this.onVisibility);
    canvas.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
    canvas.addEventListener("dblclick", this.onDblClick);

    this.resize();
  }

  start() {
    if (this.disposed) return;
    this.running = true;
    this.startLoop();
  }

  /** Pulse the disk when the user sends a chat message */
  feed(count = 3) {
    for (let i = 0; i < count; i++) {
      this.spawn(Math.random() * Math.PI * 2, 10 + Math.random() * 18, 0.85 + Math.random() * 0.4);
    }
    this.pulse = Math.min(1.4, this.pulse + 0.35);
  }

  private applySpherical() {
    const o = sphericalToVec(this.spherical);
    this.camPos = {
      x: this.target.x + o.x,
      y: this.target.y + o.y,
      z: this.target.z + o.z,
    };
  }

  private spawn(ang: number, radius: number, life = 1) {
    if (this.particles.length >= 16) this.particles.shift();
    this.particles.push({ a: ang, r: radius, life });
  }

  private ripple(ndcX: number, ndcY: number, amp: number) {
    const aspect =
      (this.canvas.clientWidth || 1) / Math.max(this.canvas.clientHeight || 1, 1);
    this.rippleOrigin = { x: ndcX * aspect, y: ndcY };
    this.rippleT = 0;
    this.rippleAmp = amp;
  }

  private hitTest(ndcX: number, ndcY: number) {
    const fov = 1 / Math.tan((FOV_DEG * Math.PI) / 180 / 2);
    const aspect = this.canvas.clientWidth / Math.max(this.canvas.clientHeight, 1);
    const wwl = norm(sub(this.target, this.camPos));
    const uu = norm(cross(wwl, { x: 0, y: 1, z: 0 }));
    const vv = cross(uu, wwl);
    const rd = norm(add(add(scale(uu, ndcX * aspect), scale(vv, ndcY)), scale(wwl, fov)));
    if (Math.abs(rd.y) > 1e-4) {
      const t = -this.camPos.y / rd.y;
      if (t > 0.2) {
        const q = add(this.camPos, scale(rd, t));
        const qr = Math.hypot(q.x, q.z);
        if (qr > 2.75 && qr < 40)
          return { type: "disk" as const, qr, ang: Math.atan2(q.z, q.x) };
      }
    }
    const tca = -dot(this.camPos, rd);
    const closest = add(this.camPos, scale(rd, Math.max(tca, 0)));
    const minR = Math.hypot(closest.x, closest.y, closest.z);
    if (minR < 2.7) return { type: "horizon" as const, minR };
    return { type: "space" as const, minR };
  }

  private interact(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -(((clientY - rect.top) / rect.height) * 2 - 1);
    const hit = this.hitTest(ndcX, ndcY);
    if (hit.type === "horizon") {
      this.ripple(ndcX, ndcY, 1.15);
      this.pulse = Math.min(1.6, this.pulse + 0.85);
      this.tug = Math.max(this.tug, 2.4);
      for (let i = 0; i < 10; i++) this.spawn((Math.PI * 2 * i) / 10, 5 + Math.random() * 4, 1);
    } else if (hit.type === "disk") {
      this.ripple(ndcX, ndcY, 0.7);
      this.pulse = Math.min(1.4, this.pulse + 0.45);
      this.tug = Math.max(this.tug, 0.9);
      for (let i = 0; i < 6; i++) {
        this.spawn(
          hit.ang + (Math.random() - 0.5) * 0.6,
          hit.qr + (Math.random() - 0.5) * 2.5,
          1,
        );
      }
    } else {
      this.ripple(ndcX, ndcY, 0.45);
      this.pulse = Math.min(1.2, this.pulse + 0.22);
    }
  }

  private resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, Math.min(w, h) < 640 ? 1 : 1.5);
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  private startLoop() {
    if (this.rafId || this.disposed || !this.running) return;
    this.last = performance.now();
    const tick = (now: number) => {
      if (!this.running || this.disposed) {
        this.rafId = 0;
        return;
      }
      if (document.hidden) {
        this.rafId = 0;
        return;
      }
      this.frame(now);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private stopLoop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  private frame(now: number) {
    const dt = Math.min((now - this.last) / 1000, 0.1);
    this.last = now;
    this.simTime += dt;

    if (this.autoOrbit) {
      this.spherical.theta += 0.16 * dt;
      this.applySpherical();
    }

    if (this.tug > 0.01) {
      this.spherical.radius = Math.max(1.85, this.spherical.radius - this.tug * 4.5 * dt);
      this.applySpherical();
      this.tug *= Math.exp(-3.2 * dt);
    } else this.tug = 0;

    this.pulse *= Math.exp(-1.6 * dt);
    this.energy *= Math.exp(-0.55 * dt);
    this.rippleT += dt;
    this.rippleAmp *= Math.exp(-0.55 * dt);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!;
      const omega = 1.1 * this.rotSpeed * Math.pow(3 / Math.max(p.r, 3), 1.5);
      p.a += omega * dt;
      p.r -= (0.9 + 8.4 / Math.max(p.r, 2)) * dt;
      p.life -= dt * 0.22;
      if (p.r < 1.55 || p.life <= 0) {
        this.pulse = Math.min(1.5, this.pulse + 0.12);
        this.particles.splice(i, 1);
      }
    }

    const gl = this.gl;
    const u = this.uniforms;
    gl.useProgram(this.prog);
    gl.uniform2f(u.uRes, this.canvas.width, this.canvas.height);
    gl.uniform1f(u.uTime, this.simTime);
    gl.uniform3f(u.uCamPos, this.camPos.x, this.camPos.y, this.camPos.z);
    gl.uniform3f(u.uCamTarget, this.target.x, this.target.y, this.target.z);
    gl.uniform1f(u.uFov, 1 / Math.tan((FOV_DEG * Math.PI) / 180 / 2));
    gl.uniform1i(u.uSteps, this.steps);
    gl.uniform1f(u.uRotSign, 1);
    gl.uniform1f(u.uDin, 2.75);
    gl.uniform1f(u.uDout, 40);
    gl.uniform1f(u.uDopMax, 1.85);
    gl.uniform1f(u.uOpNear, 0.9);
    gl.uniform1f(u.uOpFar, 0.8);
    gl.uniform1f(u.uDiskBright, this.diskBright);
    gl.uniform1f(u.uStarBright, 1);
    gl.uniform1f(u.uSkyFloor, 0.04);
    gl.uniform1f(u.uRotSpeed, this.rotSpeed);
    gl.uniform1f(u.uPulse, this.pulse);
    gl.uniform1f(u.uEnergy, this.energy);
    gl.uniform2f(u.uRippleOrigin, this.rippleOrigin.x, this.rippleOrigin.y);
    gl.uniform1f(u.uRippleT, this.rippleT);
    gl.uniform1f(u.uRippleAmp, this.rippleAmp);
    gl.uniform1i(u.uPartCount, this.particles.length);
    for (let i = 0; i < 16; i++) {
      const p = this.particles[i];
      gl.uniform3f(this.partLocs[i], p ? p.a : 0, p ? p.r : 0, p ? p.life : 0);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    this.canvas.classList.add("is-live");
  }

  dispose() {
    this.disposed = true;
    this.running = false;
    this.stopLoop();
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("orientationchange", this.onResize);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("wheel", this.onWheel);
    this.canvas.removeEventListener("dblclick", this.onDblClick);
    this.gl.deleteProgram(this.prog);
  }
}
