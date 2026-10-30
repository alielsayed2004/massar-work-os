/**
 * HeroMonogram 3D scene (CLAUDE.md §7).
 *
 * TEMPORARY STAND-IN: the mesh is built from public/brand/massar_mono_green.png
 * (alpha-tested layers stacked in depth) because the monogram SVG master has
 * not been supplied yet. Swap for SVGLoader → ExtrudeGeometry once Ali sends it.
 *
 * At rest the scene settles upright and front-facing, so it reads exactly as
 * the 2D mark.
 */
import {
  Group,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  TextureLoader,
  Vector3,
  WebGLRenderer,
  type Texture,
} from "three";

const GREEN = new Vector3(13 / 255, 59 / 255, 52 / 255);
const LAYERS = 24;
const DEPTH = 0.06; // ≈ 6% of width
const SPREAD = 0.3; // arms start 30% apart
const CONVERGE_MS = 1600;
const MAX_TILT = (8 * Math.PI) / 180;

/** cubic-bezier(.2,.7,.2,1) — the site's --ease. */
function ease(t: number) {
  const [x1, y1, x2, y2] = [0.2, 0.7, 0.2, 1];
  let lo = 0,
    hi = 1,
    s = t;
  for (let i = 0; i < 20; i++) {
    s = (lo + hi) / 2;
    const x = 3 * (1 - s) ** 2 * s * x1 + 3 * (1 - s) * s ** 2 * x2 + s ** 3;
    if (x < t) lo = s;
    else hi = s;
  }
  return 3 * (1 - s) ** 2 * s * y1 + 3 * (1 - s) * s ** 2 * y2 + s ** 3;
}

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const fragment = /* glsl */ `
  uniform sampler2D map;
  uniform vec3 color;
  uniform float shade;
  uniform int arm;
  varying vec2 vUv;
  void main() {
    if (texture2D(map, vUv).a < 0.5) discard;
    vec2 p = vUv - 0.5;
    bool inArm =
      (arm == 0 && p.y >= abs(p.x)) ||
      (arm == 1 && p.x > abs(p.y)) ||
      (arm == 2 && -p.y >= abs(p.x)) ||
      (arm == 3 && -p.x > abs(p.y));
    if (!inArm) discard;
    gl_FragColor = vec4(color * shade, 1.0);
  }
`;

// Unit directions for top, right, bottom, left arms.
const DIRS = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
] as const;

export function mountMonogram(host: HTMLElement, src: string): Promise<() => void> {
  return new Promise((resolve, reject) => {
    new TextureLoader().load(src, (tex) => resolve(build(host, tex)), undefined, reject);
  });
}

function build(host: HTMLElement, map: Texture): () => void {
  const canvas = document.createElement("canvas");
  canvas.className = "mono__canvas";
  canvas.setAttribute("aria-hidden", "true");
  host.append(canvas);

  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 0.1, 100);
  const root = new Group();
  scene.add(root);

  const geo = new PlaneGeometry(1, 1);
  const arms = DIRS.map((_, arm) => {
    const g = new Group();
    for (let i = 0; i < LAYERS; i++) {
      const front = i === 0;
      // Side layers darken toward the back: reads as a soft key light from the front.
      const shade = front ? 1 : 0.62 - (0.18 * i) / LAYERS;
      const mat = new ShaderMaterial({
        uniforms: {
          map: { value: map },
          color: { value: GREEN },
          shade: { value: shade },
          arm: { value: arm },
        },
        vertexShader: vertex,
        fragmentShader: fragment,
      });
      const m = new Mesh(geo, mat);
      m.position.z = (-DEPTH * i) / (LAYERS - 1);
      g.add(m);
    }
    root.add(g);
    return g;
  });

  const size = () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Match the static image: min(300px, 62% of width).
    const markPx = Math.min(300, w * 0.62);
    const visH = h / markPx;
    camera.position.z = visH / 2 / Math.tan((camera.fov * Math.PI) / 360);
    camera.updateProjectionMatrix();
  };
  size();

  let visible = true;
  let raf = 0;
  const start = performance.now();
  const rot = { x: 0, y: 0, vx: 0, vy: 0 };
  const target = { x: 0, y: 0 };

  const frame = (now: number) => {
    raf = 0;
    const t = Math.min(1, (now - start) / CONVERGE_MS);
    const k = 1 - ease(t);
    arms.forEach((g, i) => g.position.set(DIRS[i][0] * SPREAD * k, DIRS[i][1] * SPREAD * k, 0));

    // Spring toward the target tilt; settles exactly at 0 (upright, front-facing).
    for (const a of ["x", "y"] as const) {
      const v = a === "x" ? "vx" : "vy";
      rot[v] = (rot[v] + (target[a] - rot[a]) * 0.08) * 0.78;
      rot[a] += rot[v];
      if (Math.abs(target[a] - rot[a]) < 1e-4 && Math.abs(rot[v]) < 1e-4) {
        rot[a] = target[a];
        rot[v] = 0;
      }
    }
    root.rotation.set(rot.x, rot.y, 0);
    renderer.render(scene, camera);

    const moving =
      t < 1 || rot.vx !== 0 || rot.vy !== 0 || rot.x !== target.x || rot.y !== target.y;
    if (moving && visible) raf = requestAnimationFrame(frame);
  };
  const kick = () => {
    if (!raf && visible) raf = requestAnimationFrame(frame);
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const r = host.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
    const y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
    target.y = x * MAX_TILT;
    target.x = y * MAX_TILT;
    kick();
  };
  const onLeave = () => {
    target.x = target.y = 0;
    kick();
  };
  host.addEventListener("pointermove", onMove);
  host.addEventListener("pointerleave", onLeave);

  const ro = new ResizeObserver(() => {
    size();
    kick();
  });
  ro.observe(host);
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    kick();
  });
  io.observe(host);

  raf = requestAnimationFrame((now) => {
    frame(now);
    host.classList.add("is-3d");
  });

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    io.disconnect();
    host.removeEventListener("pointermove", onMove);
    host.removeEventListener("pointerleave", onLeave);
    renderer.dispose();
    canvas.remove();
  };
}
