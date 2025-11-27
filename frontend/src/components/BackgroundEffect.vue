<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { createNoise2D } from 'simplex-noise';

const svgRef = ref<SVGSVGElement | null>(null);
const noise2D = createNoise2D();

let animationId: number;
let paths: SVGPathElement[] = [];
let lines: any[][] = [];
let bounding = { width: 0, height: 0, left: 0, top: 0 };
let time = 0;

const mouse = {
  x: -10, y: 0, lx: 0, ly: 0, sx: 0, sy: 0,
  v: 0, vs: 0, a: 0, set: false
};

const setSize = () => {
  if (!svgRef.value) return;
  const rect = svgRef.value.getBoundingClientRect();
  bounding = {
    width: rect.width,
    height: rect.height,
    left: rect.left,
    top: rect.top
  };
};

const updateMousePosition = (x: number, y: number) => {
  mouse.x = x - bounding.left;
  mouse.y = y - bounding.top + window.scrollY;

  if (!mouse.set) {
    mouse.sx = mouse.x;
    mouse.sy = mouse.y;
    mouse.lx = mouse.x;
    mouse.ly = mouse.y;
    mouse.set = true;
  }
};

const onMouseMove = (e: MouseEvent) => {
  updateMousePosition(e.clientX, e.clientY);
};

const onResize = () => {
  setSize();
  setLines();
};

const setLines = () => {
  if (!svgRef.value) return;
  const { width, height } = bounding;

  // Cleanup
  paths.forEach(p => p.remove());
  paths = [];
  lines = [];

  // Config
  const xGap = 20; // Optimized gap
  const yGap = 32;

  const oWidth = width + 200;
  const oHeight = height + 30;

  const totalLines = Math.ceil(oWidth / xGap);
  const totalPoints = Math.ceil(oHeight / yGap);

  const xStart = (width - xGap * totalLines) / 2;
  const yStart = (height - yGap * totalPoints) / 2;

  for (let i = 0; i <= totalLines; i++) {
    const points = [];
    for (let j = 0; j <= totalPoints; j++) {
      points.push({
        x: xStart + xGap * i,
        y: yStart + yGap * j,
        wave: { x: 0, y: 0 },
        cursor: { x: 0, y: 0, vx: 0, vy: 0 }
      });
    }

    // Create SVG Path
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.classList.add('wave-line');
    // Tailwind classes for stroke color adapting to theme
    path.setAttribute('class', 'wave-line stroke-gray-400/20 dark:stroke-white/10 fill-none stroke-[1px] transition-colors duration-300');
    
    svgRef.value.appendChild(path);
    paths.push(path);
    lines.push(points);
  }
};

const moved = (point: any, withCursorForce = true) => {
  const coords = {
    x: point.x + point.wave.x + (withCursorForce ? point.cursor.x : 0),
    y: point.y + point.wave.y + (withCursorForce ? point.cursor.y : 0),
  };
  // Round for performance
  coords.x = Math.round(coords.x * 10) / 10;
  coords.y = Math.round(coords.y * 10) / 10;
  return coords;
};

const movePoints = (t: number) => {
  lines.forEach((points) => {
    points.forEach((p) => {
      // Simpler Wave: Vertical lines waving in X direction
      // Reduced speed: t * 0.0005 (was 0.002)
      const nVal = noise2D(
        p.x * 0.0005 + t * 0.0005, // X variation
        p.y * 0.0015 + t * 0.0005  // Y variation (vertical flow)
      );
      
      // Direct mapping: map noise (-1 to 1) to x offset (-30 to 30)
      p.wave.x = nVal * 30; 
      p.wave.y = 0; // Keep Y stable for vertical lines

      // Mouse Interaction
      const dx = p.x - mouse.sx;
      const dy = p.y - mouse.sy;
      const d = Math.hypot(dx, dy);
      const l = Math.max(175, mouse.vs);

      if (d < l) {
        const s = 1 - d / l;
        const f = Math.cos(d * 0.001) * s;
        p.cursor.vx += Math.cos(mouse.a) * f * l * mouse.vs * 0.00065;
        p.cursor.vy += Math.sin(mouse.a) * f * l * mouse.vs * 0.00065;
      }

      // Physics
      p.cursor.vx += (0 - p.cursor.x) * 0.01; // Higher tension for snappier return
      p.cursor.vy += (0 - p.cursor.y) * 0.01;
      p.cursor.vx *= 0.9; // Friction
      p.cursor.vy *= 0.9;
      
      p.cursor.x += p.cursor.vx;
      p.cursor.y += p.cursor.vy;
    });
  });
};

const drawLines = () => {
  lines.forEach((points, index) => {
    // Build path string
    let p1 = moved(points[0], false);
    let d = `M ${p1.x} ${p1.y}`;

    points.forEach((pt, i) => {
      const isLast = i === points.length - 1;
      p1 = moved(pt, !isLast);
      // Simple LineTo for performance (CurveTo 'Q' is smoother but slower)
      // Reference used 'L' in the commented code but active code used `L`.
      // Wait, reference code:
      // d += `L ${p1.x} ${p1.y}`
      // It commented out the Q curve.
      d += ` L ${p1.x} ${p1.y}`;
    });

    paths[index].setAttribute('d', d);
  });
};

const tick = () => {
  time++;

  // Mouse smoothing
  mouse.sx += (mouse.x - mouse.sx) * 0.1;
  mouse.sy += (mouse.y - mouse.sy) * 0.1;

  const dx = mouse.x - mouse.lx;
  const dy = mouse.y - mouse.ly;
  const d = Math.hypot(dx, dy);

  mouse.v = d;
  mouse.vs += (d - mouse.vs) * 0.1;
  mouse.vs = Math.min(100, mouse.vs);

  mouse.lx = mouse.x;
  mouse.ly = mouse.y;
  mouse.a = Math.atan2(dy, dx);

  movePoints(time);
  drawLines();

  animationId = requestAnimationFrame(tick);
};

onMounted(() => {
  if (svgRef.value) {
    setSize();
    setLines();
    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMouseMove);
    tick();
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', onResize);
  window.removeEventListener('mousemove', onMouseMove);
  cancelAnimationFrame(animationId);
});
</script>

<template>
  <svg 
    ref="svgRef" 
    class="fixed inset-0 pointer-events-none -z-10 bg-[#F9FAF5] dark:bg-[#0F172A] transition-colors duration-500 w-full h-full"
  ></svg>
</template>
