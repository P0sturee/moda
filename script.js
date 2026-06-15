/* ============================================
   MUSE — Fashion Canvas Premium
   script.js
   ============================================ */

(function () {
  'use strict';

  /* =========================================
     CONFIG
  ========================================= */
  const TOTAL_FRAMES   = 295;
  const FRAMES_DIR     = 'frames/';
  const FRAME_PAD      = 4;   // 0001 … 0295
  const CANVAS_SECTION_HEIGHT = '500vh';

  /* =========================================
     STATE
  ========================================= */
  const images        = new Array(TOTAL_FRAMES).fill(null);
  let   loaded        = 0;
  let   allLoaded     = false;
  let   currentFrame  = 0;
  let   targetFrame   = 0;
  let   rafId         = null;
  let   lastDrawFrame = -1;

  /* =========================================
     DOM REFS
  ========================================= */
  const loader         = document.getElementById('loader');
  const loaderBar      = document.getElementById('loaderBar');
  const loaderCount    = document.getElementById('loaderCount');
  const navbar         = document.getElementById('navbar');
  const canvas         = document.getElementById('heroCanvas');
  const ctx            = canvas.getContext('2d');
  const heroContent    = document.querySelector('.hero-content');
  const scrollHint     = document.getElementById('scrollHint');
  const progressBar    = document.getElementById('scrollProgressBar');
  const hamburger      = document.getElementById('hamburger');
  const mobileMenu     = document.getElementById('mobileMenu');

  /* =========================================
     HELPERS
  ========================================= */
  function padFrame(n) {
    return String(n + 1).padStart(FRAME_PAD, '0');
  }

  function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
  }

  /* =========================================
     CANVAS SIZING
  ========================================= */
  function resizeCanvas() {
    canvas.width  = canvas.offsetWidth  * (window.devicePixelRatio || 1);
    canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1);
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    drawFrame(currentFrame, true);
  }

  /* =========================================
     DRAW
  ========================================= */
  function drawFrame(index, force) {
    index = clamp(Math.round(index), 0, TOTAL_FRAMES - 1);

    if (!force && index === lastDrawFrame) return;

    // Try exact frame, then search nearby valid frame
    let img = images[index];
    if (!img || !img.complete || img.naturalWidth === 0) {
      // Fallback: find nearest loaded frame
      img = null;
      for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
        const lo = index - offset;
        const hi = index + offset;
        if (lo >= 0 && images[lo] && images[lo].complete && images[lo].naturalWidth > 0) {
          img = images[lo]; break;
        }
        if (hi < TOTAL_FRAMES && images[hi] && images[hi].complete && images[hi].naturalWidth > 0) {
          img = images[hi]; break;
        }
      }
    }

    if (!img) return; // nothing loaded yet

    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    const iW = img.naturalWidth;
    const iH = img.naturalHeight;

    // Cover fit
    const scale = Math.max(W / iW, H / iH);
    const dW = iW * scale;
    const dH = iH * scale;
    const dx = (W - dW) / 2;
    const dy = (H - dH) / 2;

    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(img, dx, dy, dW, dH);

    lastDrawFrame = index;
  }

  /* =========================================
     SMOOTH ANIMATION LOOP
  ========================================= */
  function animLoop() {
    // Lerp toward target for silky motion
    if (Math.abs(currentFrame - targetFrame) > 0.3) {
      currentFrame += (targetFrame - currentFrame) * 0.18;
    } else {
      currentFrame = targetFrame;
    }
    drawFrame(currentFrame);
    rafId = requestAnimationFrame(animLoop);
  }

  /* =========================================
     FRAME PRELOADING
  ========================================= */
  function preloadFrames() {
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      const idx = i; // capture

      img.onload = function () {
        loaded++;
        const pct = Math.round((loaded / TOTAL_FRAMES) * 100);
        loaderBar.style.width  = pct + '%';
        loaderCount.textContent = pct + '%';

        // Draw first valid frame immediately so canvas isn't black
        if (idx === 0 || (loaded === 1 && lastDrawFrame === -1)) {
          drawFrame(0, true);
        }

        if (loaded === TOTAL_FRAMES) {
          allLoaded = true;
          onAllLoaded();
        }
      };

      img.onerror = function () {
        // Count as "loaded" so we don't hang forever
        loaded++;
        const pct = Math.round((loaded / TOTAL_FRAMES) * 100);
        loaderBar.style.width  = pct + '%';
        loaderCount.textContent = pct + '%';
        if (loaded === TOTAL_FRAMES) {
          allLoaded = true;
          onAllLoaded();
        }
      };

      img.src = FRAMES_DIR + padFrame(i) + '.webp';
      images[i] = img;
    }
  }

  /* =========================================
     POST-LOAD
  ========================================= */
  function onAllLoaded() {
    // Draw first frame clean
    drawFrame(0, true);

    // Slight delay for polish
    setTimeout(function () {
      loader.classList.add('hidden');

      // Reveal hero text
      setTimeout(function () {
        heroContent.classList.add('visible');
      }, 300);

      // Start anim loop
      animLoop();

      // Init GSAP
      initGSAP();
    }, 400);
  }

  /* =========================================
     GSAP SCROLL TRIGGER
  ========================================= */
  function initGSAP() {
    gsap.registerPlugin(ScrollTrigger);

    // Frame scrub
    ScrollTrigger.create({
      trigger:  '#canvas-section',
      start:    'top top',
      end:      'bottom bottom',
      scrub:    true,
      onUpdate: function (self) {
        const progress = clamp(self.progress, 0, 1);

        // Update target frame from scroll progress
        targetFrame = progress * (TOTAL_FRAMES - 1);

        // Progress bar
        progressBar.style.width = (progress * 100) + '%';

        // Hide scroll hint after first movement
        if (progress > 0.02) {
          scrollHint.classList.add('hidden');
        } else {
          scrollHint.classList.remove('hidden');
        }

        // Fade hero overlay when scrolling deep
        const heroOverlay = document.getElementById('heroOverlay');
        if (heroOverlay) {
          const fadeStart = 0.05;
          const fadeEnd   = 0.25;
          const opacity   = 1 - clamp((progress - fadeStart) / (fadeEnd - fadeStart), 0, 1);
          heroOverlay.style.opacity = opacity;
          heroOverlay.style.transform = 'translateY(' + (-progress * 30) + 'px)';
        }
      }
    });

    // Reveal product cards
    const cards = document.querySelectorAll('[data-reveal]');
    cards.forEach(function (card, i) {
      ScrollTrigger.create({
        trigger: card,
        start:   'top 88%',
        once:    true,
        onEnter: function () {
          setTimeout(function () {
            card.classList.add('visible');
          }, i * 80);
        }
      });
    });
  }

  /* =========================================
     NAVBAR SCROLL
  ========================================= */
  function initNavbar() {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(function () {
          if (window.scrollY > 20) {
            navbar.classList.add('scrolled');
          } else {
            navbar.classList.remove('scrolled');
          }
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  /* =========================================
     HAMBURGER
  ========================================= */
  function initHamburger() {
    hamburger.addEventListener('click', function () {
      hamburger.classList.toggle('active');
      mobileMenu.classList.toggle('open');
    });

    // Close on link click
    var links = mobileMenu.querySelectorAll('a');
    links.forEach(function (a) {
      a.addEventListener('click', function () {
        hamburger.classList.remove('active');
        mobileMenu.classList.remove('open');
      });
    });
  }

  /* =========================================
     SCROLL-BASED CANVAS SIZE FALLBACK
     (for browsers where sticky doesn't resize)
  ========================================= */
  window.addEventListener('resize', function () {
    resizeCanvas();
    if (typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.refresh();
    }
  }, { passive: true });

  /* =========================================
     MOBILE: touch scroll progress
     ScrollTrigger handles this natively,
     but we ensure canvas never goes black
     by drawing the last known frame on
     every rAF tick.
  ========================================= */

  /* =========================================
     INIT
  ========================================= */
  function init() {
    // Size canvas to viewport
    canvas.style.width  = '100%';
    canvas.style.height = '100%';
    resizeCanvas();

    // Fill black initially
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

    // Kick off preload
    initNavbar();
    initHamburger();
    preloadFrames();
  }

  /* =========================================
     WAIT FOR DOM
  ========================================= */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}());