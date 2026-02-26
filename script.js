/**
 * NEXUS — Glassmorphism Cyber Homepage
 * script.js — All interactive functionality
 *
 * Sections:
 *  1. Clock
 *  2. Search
 *  3. Custom Cursor
 *  4. Matrix Rain (Canvas)
 *  5. Particle Layer (Canvas)
 *  6. Status Bar
 *  7. Init
 */

'use strict';

/* ─────────────────────────────────────────
   1. CLOCK MODULE
   Updates time & date every second.
   Drives the seconds progress bar.
───────────────────────────────────────── */
const Clock = (() => {
  const timeEl    = document.getElementById('clock-time');
  const dateEl    = document.getElementById('clock-date');
  const barFill   = document.getElementById('clock-bar-fill');

  /** Zero-pad a number to 2 digits */
  const pad = (n) => String(n).padStart(2, '0');

  /** Full day/month name arrays */
  const DAYS   = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];

  function tick() {
    const now = new Date();

    // ── Time display
    timeEl.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    // ── Date display
    dateEl.textContent = `${DAYS[now.getDay()]} · ${MONTHS[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

    // ── Seconds progress bar (0–59 → 0–100%)
    barFill.style.width = `${(now.getSeconds() / 59) * 100}%`;
  }

  function init() {
    tick(); // immediate render
    setInterval(tick, 1000);
  }

  return { init };
})();


/* ─────────────────────────────────────────
   2. SEARCH MODULE
   Animated placeholder cycling.
   Google search on Enter or button click.
───────────────────────────────────────── */
const Search = (() => {
  const input  = document.getElementById('search-input');
  const btn    = document.getElementById('search-btn');
  const hint   = document.getElementById('search-hint');

  /** Placeholder phrases to cycle through */
  const PLACEHOLDERS = [
    'Search the web…',
    'Run a query…',
    'Execute command…',
    'Access the network…',
    'Retrieve data…',
  ];

  let phIndex   = 0;
  let charIndex = 0;
  let isDeleting = false;
  let phTimeout  = null;

  /** Type-writer placeholder animation */
  function typePlaceholder() {
    const current = PLACEHOLDERS[phIndex];

    if (!isDeleting) {
      // Typing forward
      charIndex++;
      input.placeholder = current.slice(0, charIndex);

      if (charIndex === current.length) {
        // Pause at full string, then start deleting
        isDeleting = true;
        phTimeout = setTimeout(typePlaceholder, 2200);
        return;
      }
    } else {
      // Erasing
      charIndex--;
      input.placeholder = current.slice(0, charIndex);

      if (charIndex === 0) {
        isDeleting = false;
        phIndex = (phIndex + 1) % PLACEHOLDERS.length;
        phTimeout = setTimeout(typePlaceholder, 400);
        return;
      }
    }

    // Typing speed: slightly randomized for organic feel
    const speed = isDeleting ? 45 : 75 + Math.random() * 30;
    phTimeout = setTimeout(typePlaceholder, speed);
  }

  /** Open Google search in new tab */
  function doSearch() {
    const q = input.value.trim();
    if (!q) return;
    window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, '_blank', 'noopener,noreferrer');
    input.value = '';
  }

  function init() {
    // Start placeholder animation
    phTimeout = setTimeout(typePlaceholder, 800);

    // Pause animation while user types
    input.addEventListener('focus', () => {
      clearTimeout(phTimeout);
      input.placeholder = '';
    });

    input.addEventListener('blur', () => {
      if (!input.value) {
        charIndex = 0;
        isDeleting = false;
        phTimeout = setTimeout(typePlaceholder, 600);
      }
    });

    // Enter key → search
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doSearch();
    });

    // Button click → search
    btn.addEventListener('click', doSearch);

    // Hint text: toggle on input
    input.addEventListener('input', () => {
      hint.textContent = input.value
        ? 'Press Enter · Opens in new tab'
        : 'Press Enter to search · Google';
    });
  }

  return { init };
})();


/* ─────────────────────────────────────────
   3. CUSTOM CURSOR MODULE
   Glowing orb that follows the mouse.
   Expands over interactive elements.
───────────────────────────────────────── */
const CursorGlow = (() => {
  // Skip on touch devices
  if (window.matchMedia('(hover: none)').matches) return { init: () => {} };

  const glow = document.getElementById('cursor-glow');
  let cx = -100, cy = -100; // off-screen initially
  let tx = -100, ty = -100; // target

  /** Smooth follow with lerp */
  function loop() {
    cx += (tx - cx) * 0.18;
    cy += (ty - cy) * 0.18;
    glow.style.left = `${cx}px`;
    glow.style.top  = `${cy}px`;
    requestAnimationFrame(loop);
  }

  function init() {
    document.addEventListener('mousemove', (e) => {
      tx = e.clientX;
      ty = e.clientY;
    });

    // Expand on interactive elements
    const interactives = 'a, button, input, [role="button"]';
    document.addEventListener('mouseover', (e) => {
      if (e.target.matches(interactives)) {
        glow.classList.add('cursor-expanded');
      }
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.matches(interactives)) {
        glow.classList.remove('cursor-expanded');
      }
    });

    // Hide when leaving window
    document.addEventListener('mouseleave', () => { glow.style.opacity = '0'; });
    document.addEventListener('mouseenter', () => { glow.style.opacity = '1'; });

    requestAnimationFrame(loop);
  }

  return { init };
})();


/* ─────────────────────────────────────────
   4. MATRIX RAIN MODULE
   Very faint code-rain canvas.
   Uses requestAnimationFrame. Optimized.
───────────────────────────────────────── */
const MatrixRain = (() => {
  const canvas  = document.getElementById('matrix-canvas');
  const ctx     = canvas.getContext('2d');

  const CHAR_SET = '01アイウエオカキクケコサシスセソタチツテトナニヌネノ∑∂∇∈∉⊂⊃∪∩ABCDEFabcdef0123456789';
  const FONT_SIZE = 13;
  let columns = 0;
  let drops   = [];
  let lastTime = 0;
  const INTERVAL = 90; // ms between frames — keeps it subtle

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    columns = Math.floor(canvas.width / FONT_SIZE);
    // Reset drops (preserve existing where possible)
    const newDrops = Array.from({ length: columns }, (_, i) =>
      drops[i] !== undefined ? drops[i] : Math.random() * -(canvas.height / FONT_SIZE)
    );
    drops = newDrops;
  }

  function draw(timestamp) {
    // Throttle frame rate
    if (timestamp - lastTime < INTERVAL) {
      requestAnimationFrame(draw);
      return;
    }
    lastTime = timestamp;

    // Trail fade
    ctx.fillStyle = 'rgba(10, 22, 40, 0.06)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = `${FONT_SIZE}px JetBrains Mono, monospace`;

    drops.forEach((y, i) => {
      // Pick a random character
      const char = CHAR_SET[Math.floor(Math.random() * CHAR_SET.length)];
      const x = i * FONT_SIZE;

      // Slight color variation: top of drop slightly brighter
      const row = Math.floor(y);
      const brightness = row % 7 === 0 ? 200 : 130;
      ctx.fillStyle = `rgba(93, 232, 216, ${brightness / 1000})`;
      ctx.fillText(char, x, y * FONT_SIZE);

      // Reset drop randomly after it goes off-screen
      if (y * FONT_SIZE > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i] += 0.6; // slow fall speed
    });

    requestAnimationFrame(draw);
  }

  function init() {
    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(draw);
  }

  return { init };
})();


/* ─────────────────────────────────────────
   5. PARTICLE LAYER MODULE
   Soft floating particles for depth.
   Lightweight — small count, slow movement.
───────────────────────────────────────── */
const Particles = (() => {
  const canvas = document.getElementById('particle-canvas');
  const ctx    = canvas.getContext('2d');

  const COUNT = 38; // keep low for performance
  let particles = [];

  /** Single particle factory */
  function createParticle() {
    return {
      x:    Math.random() * window.innerWidth,
      y:    Math.random() * window.innerHeight,
      r:    Math.random() * 1.5 + 0.4,         // radius
      vx:   (Math.random() - 0.5) * 0.18,      // velocity x
      vy:   (Math.random() - 0.5) * 0.12,      // velocity y
      alpha: Math.random() * 0.35 + 0.05,      // opacity
      pulse: Math.random() * Math.PI * 2,       // phase for alpha pulsing
    };
  }

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((p) => {
      // Pulsing alpha
      p.pulse += 0.012;
      const a = p.alpha * (0.6 + 0.4 * Math.sin(p.pulse));

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(93, 232, 216, ${a})`;
      ctx.fill();

      // Move
      p.x += p.vx;
      p.y += p.vy;

      // Wrap around edges
      if (p.x < -5) p.x = canvas.width + 5;
      if (p.x > canvas.width + 5) p.x = -5;
      if (p.y < -5) p.y = canvas.height + 5;
      if (p.y > canvas.height + 5) p.y = -5;
    });

    requestAnimationFrame(draw);
  }

  function init() {
    resize();
    particles = Array.from({ length: COUNT }, createParticle);
    window.addEventListener('resize', resize);
    requestAnimationFrame(draw);
  }

  return { init };
})();


/* ─────────────────────────────────────────
   6. STATUS BAR MODULE
   Shows timezone and week info.
───────────────────────────────────────── */
const StatusBar = (() => {
  const tzEl   = document.getElementById('status-tz');
  const weekEl = document.getElementById('status-week');

  function getWeekNumber(d) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day  = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  }

  function init() {
    const now = new Date();

    // Timezone abbreviation
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const tzOffset = -now.getTimezoneOffset() / 60;
    const offsetStr = `UTC${tzOffset >= 0 ? '+' : ''}${tzOffset}`;
    tzEl.textContent = `${tz} · ${offsetStr}`;

    // Week number
    weekEl.textContent = `W${getWeekNumber(now)}`;
  }

  return { init };
})();


/* ─────────────────────────────────────────
   7. KEYBOARD SHORTCUT
   '/' to focus search from anywhere
───────────────────────────────────────── */
const Shortcuts = (() => {
  function init() {
    document.addEventListener('keydown', (e) => {
      const input = document.getElementById('search-input');
      // '/' focuses search if not already in an input
      if (e.key === '/' && document.activeElement !== input) {
        e.preventDefault();
        input.focus();
      }
      // Escape blurs search
      if (e.key === 'Escape') {
        input.blur();
      }
    });
  }

  return { init };
})();


/* ─────────────────────────────────────────
   8. LINK CARD STAGGER ANIMATION
   Applies staggered entry animation to
   each quick-link card via JS (so no
   inline styles are needed in HTML).
───────────────────────────────────────── */
const LinkStagger = (() => {
  function init() {
    const cards = document.querySelectorAll('.link-card');
    cards.forEach((card, i) => {
      card.style.opacity    = '0';
      card.style.transform  = 'translateY(12px)';
      card.style.transition = `opacity 0.5s ease ${0.65 + i * 0.07}s, transform 0.5s ease ${0.65 + i * 0.07}s, box-shadow 0.3s ease, border-color 0.3s ease, background 0.3s ease`;

      // Force reflow, then set final state
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          card.style.opacity   = '1';
          card.style.transform = 'translateY(0)';
        });
      });
    });
  }

  return { init };
})();


/* ─────────────────────────────────────────
   INIT — Bootstrap all modules on DOMReady
───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  Clock.init();
  Search.init();
  CursorGlow.init();
  MatrixRain.init();
  Particles.init();
  StatusBar.init();
  Shortcuts.init();
  LinkStagger.init();
});
