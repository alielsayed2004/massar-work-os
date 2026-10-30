/**
 * Motion spec (CLAUDE.md §6): scroll reveal, scale-in fallback, stat count-up,
 * case card tilt. Runs on every page load, including View Transition swaps.
 */
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function reveal() {
  const els = document.querySelectorAll<HTMLElement>(
    "[data-reveal]:not(.is-in), .scale-in:not(.is-in)",
  );
  if (reduced() || !("IntersectionObserver" in window)) {
    els.forEach((el) => el.classList.add("is-in"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      }
    },
    { threshold: 0.15 },
  );
  els.forEach((el) => io.observe(el));
}

/** Count the first number in a stat up from 0 over 1.2s. The final text is restored exactly. */
function countUp() {
  if (reduced()) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        const el = e.target as HTMLElement;
        const final = el.dataset.count ?? el.textContent ?? "";
        const m = final.match(/\d[\d,]*(\.\d+)?/);
        if (!m) continue;
        const target = parseFloat(m[0].replace(/,/g, ""));
        if (!target) continue;
        const decimals = m[1] ? m[1].length - 1 : 0;
        const [pre, post] = [final.slice(0, m.index), final.slice(m.index! + m[0].length)];
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / 1200);
          const eased = 1 - Math.pow(1 - t, 3);
          el.textContent = t < 1 ? pre + (target * eased).toFixed(decimals) + post : final;
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    },
    { threshold: 0.6 },
  );
  document.querySelectorAll("[data-count]").forEach((el) => io.observe(el));
}

/** 3D tilt toward the cursor, max 4°. Mouse/trackpad only. */
function tilt() {
  if (reduced() || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  document.querySelectorAll<HTMLElement>("[data-tilt]").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.setProperty("--ry", `${(x * 8).toFixed(2)}deg`);
      card.style.setProperty("--rx", `${(-y * 8).toFixed(2)}deg`);
    });
    card.addEventListener("pointerleave", () => {
      card.style.removeProperty("--rx");
      card.style.removeProperty("--ry");
    });
  });
}

document.addEventListener("astro:after-swap", () => document.documentElement.classList.add("js"));
document.addEventListener("astro:page-load", () => {
  reveal();
  countUp();
  tilt();
});
