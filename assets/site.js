// Progressive enhancement for the whole site. Every page reads and works
// without this file; it adds the theme switch, the pause-animations switch,
// the folding menu, the countdown, reveal-on-scroll and the gallery viewer.

(function () {
  'use strict';

  var root = document.documentElement;

  // ---- Theme -------------------------------------------------------------
  // The saved choice (if any) was applied in <head>. Otherwise follow the system.
  var THEME_KEY = 'theme';
  var systemDark = window.matchMedia('(prefers-color-scheme: dark)');

  function savedTheme() {
    try {
      var value = localStorage.getItem(THEME_KEY);
      return value === 'light' || value === 'dark' ? value : null;
    } catch (error) {
      return null;
    }
  }

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    document.querySelectorAll('.theme-toggle').forEach(function (button) {
      var label = theme === 'dark' ? button.dataset.labelLight : button.dataset.labelDark;
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
      var text = button.querySelector('[data-theme-label]');
      if (text) text.textContent = label;
    });
  }

  applyTheme(savedTheme() || (systemDark.matches ? 'dark' : 'light'));

  systemDark.addEventListener('change', function (event) {
    if (!savedTheme()) applyTheme(event.matches ? 'dark' : 'light');
  });

  document.querySelectorAll('.theme-toggle').forEach(function (button) {
    button.hidden = false;
    button.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch (error) {
        // Private browsing: the choice lasts for this page only.
      }
      applyTheme(next);
    });
  });

  // ---- Motion ------------------------------------------------------------
  // The sheens, the waves and the other decorative motion never stop on their
  // own, so every page carries a control that stops them. The choice is kept.
  var MOTION_KEY = 'motion';

  function applyMotion(paused) {
    if (paused) root.setAttribute('data-motion', 'off');
    else root.removeAttribute('data-motion');
    document.querySelectorAll('.motion-toggle').forEach(function (button) {
      var label = paused ? button.dataset.labelPlay : button.dataset.labelPause;
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
      var text = button.querySelector('[data-motion-label]');
      if (text) text.textContent = label;
    });
  }

  applyMotion(root.getAttribute('data-motion') === 'off');

  // With reduced motion requested there is nothing running to pause, so the
  // control is hidden; it comes back if that preference changes on this page.
  var reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var showMotionToggles = function () {
    document.querySelectorAll('.motion-toggle').forEach(function (button) {
      button.hidden = reducedQuery.matches;
    });
  };
  showMotionToggles();
  if (reducedQuery.addEventListener) reducedQuery.addEventListener('change', showMotionToggles);

  document.querySelectorAll('.motion-toggle').forEach(function (button) {
    button.addEventListener('click', function () {
      var paused = root.getAttribute('data-motion') !== 'off';
      try {
        if (paused) localStorage.setItem(MOTION_KEY, 'off');
        else localStorage.removeItem(MOTION_KEY);
      } catch (error) {
        // Private browsing: the choice lasts for this page only.
      }
      applyMotion(paused);
    });
  });

  // ---- Menu --------------------------------------------------------------
  var menuButton = document.querySelector('.menu-button');
  var nav = document.getElementById('site-nav');
  if (menuButton && nav) {
    var setMenu = function (open) {
      nav.classList.toggle('is-open', open);
      menuButton.setAttribute('aria-expanded', String(open));
      var label = open ? menuButton.dataset.labelClose : menuButton.dataset.labelOpen;
      menuButton.querySelector('.menu-button__text').textContent = label;
    };
    menuButton.addEventListener('click', function () {
      setMenu(menuButton.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        menuButton.focus();
      }
    });
    // Tabbing past the open panel closes it, so it never covers the focused control.
    var header = menuButton.closest('.site-header');
    if (header) {
      header.addEventListener('focusout', function (event) {
        if (menuButton.getAttribute('aria-expanded') !== 'true') return;
        if (event.relatedTarget && !header.contains(event.relatedTarget)) setMenu(false);
      });
    }
  }

  // ---- Reveal on scroll --------------------------------------------------
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );
    reveals.forEach(function (element) {
      // Siblings rise one after another.
      var siblings = Array.prototype.filter.call(element.parentElement.children, function (child) {
        return child.classList.contains('reveal');
      });
      element.style.setProperty('--reveal-order', Math.min(siblings.indexOf(element), 6));
      observer.observe(element);
    });
  } else {
    reveals.forEach(function (element) {
      element.classList.add('is-visible');
    });
  }

  // ---- Countdown ---------------------------------------------------------
  var countdown = document.querySelector('[data-countdown-target]');
  if (countdown) {
    var target = new Date(countdown.dataset.countdownTarget).getTime();
    var slots = {};
    countdown.querySelectorAll('[data-countdown]').forEach(function (slot) {
      slots[slot.dataset.countdown] = slot;
    });
    var timer = null;
    var tick = function () {
      var remaining = target - Date.now();
      if (isNaN(target)) return;
      if (remaining <= 0) {
        countdown.querySelector('.countdown__units').hidden = true;
        countdown.querySelector('.countdown__title').textContent = countdown.dataset.done;
        if (timer) clearInterval(timer);
        return;
      }
      var seconds = Math.floor(remaining / 1000);
      slots.days.textContent = Math.floor(seconds / 86400);
      slots.hours.textContent = Math.floor((seconds % 86400) / 3600);
      slots.minutes.textContent = Math.floor((seconds % 3600) / 60);
    };
    if (!isNaN(target)) {
      countdown.hidden = false;
      tick();
      // Minutes are the smallest unit shown, so the numbers change quietly.
      timer = setInterval(tick, 10000);
    }
  }

  function motionReduced() {
    return root.getAttribute('data-motion') === 'off' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // ---- Day map -----------------------------------------------------------
  // A map pin and its timeline marker share an index. Choosing either one
  // marks both and names the place under the map.
  var dayMap = document.querySelector('[data-day-map]');

  // Scrolls an element to the middle of the window over about a second,
  // easing in and out. The browser's own smooth scroll proved unreliable here
  // (it jumped), so the glide is drawn frame by frame. With motion paused or
  // reduced the page moves at once.
  var glideRun = 0;
  function glideTo(element) {
    var box = element.getBoundingClientRect();
    var start = window.scrollY;
    var limit = document.documentElement.scrollHeight - window.innerHeight;
    var target = Math.max(0, Math.min(limit, start + box.top - Math.max(0, (window.innerHeight - box.height) / 2)));
    if (motionReduced() || !window.requestAnimationFrame) {
      window.scrollTo(0, target);
      return;
    }
    var duration = Math.min(1400, 500 + Math.abs(target - start) * 0.35);
    var began = null;
    var run = (glideRun += 1);
    // Instant steps, so the stylesheet's smooth scrolling does not fight the glide.
    root.style.scrollBehavior = 'auto';
    // The guest's own scrolling, or a newer glide, ends this one.
    var yieldEvents = ['wheel', 'touchstart', 'keydown', 'mousedown'];
    // Only the newest glide restores the stylesheet's scrolling; an older one
    // that a newer glide replaced leaves it alone.
    function finish() {
      if (run === glideRun) root.style.scrollBehavior = '';
      yieldEvents.forEach(function (name) { window.removeEventListener(name, cancel); });
    }
    function cancel() {
      finish();
      if (run === glideRun) glideRun += 1;
    }
    yieldEvents.forEach(function (name) { window.addEventListener(name, cancel, { passive: true }); });
    function step(now) {
      if (run !== glideRun) { finish(); return; }
      if (began === null) began = now;
      var t = Math.min(1, (now - began) / duration);
      var eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      window.scrollTo(0, start + (target - start) * eased);
      if (t < 1) window.requestAnimationFrame(step);
      else finish();
    }
    window.requestAnimationFrame(step);
  }

  if (dayMap) {
    var mapDetail = dayMap.querySelector('[data-map-detail]');
    var mapHint = mapDetail.textContent;
    var picks = document.querySelectorAll('[data-map-pick]');
    var selectOnMap = function (index) {
      picks.forEach(function (pick) {
        var chosen = pick.getAttribute('data-map-pick') === index;
        pick.setAttribute('aria-pressed', chosen ? 'true' : 'false');
        // Choosing a pin again brings back a label that Escape put away.
        if (chosen) pick.classList.remove('is-dismissed');
        var row = pick.closest('.timeline__item');
        if (row) row.classList.toggle('is-selected', chosen);
        if (chosen && pick.hasAttribute('data-map-text')) mapDetail.textContent = pick.getAttribute('data-map-text');
      });
    };
    picks.forEach(function (pick) {
      pick.addEventListener('click', function () {
        var index = pick.getAttribute('data-map-pick');
        selectOnMap(index);
        // A timeline marker also brings the map into view, with its pin focused.
        if (!pick.classList.contains('day-map__pin')) {
          var pin = dayMap.querySelector('.day-map__pin[data-map-pick="' + index + '"]');
          if (pin) pin.focus({ preventScroll: true });
          glideTo(dayMap);
        }
      });
      // Built disabled, so that without this script nothing inert takes focus.
      pick.disabled = false;
      // A label put away with Escape stays away until the pointer or focus leaves.
      var restore = function () { pick.classList.remove('is-dismissed'); };
      pick.addEventListener('blur', restore);
      pick.addEventListener('pointerleave', restore);
      // The whole timeline row works as its marker does.
      var row = pick.closest('.timeline__item');
      if (row) {
        row.addEventListener('click', function (event) {
          if (!pick.contains(event.target) && !event.target.closest('a')) pick.click();
        });
      }
    });
    // Escape puts a label away: it clears the selection and keeps focus where it is.
    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      var active = document.activeElement;
      var onPick = Boolean(active && active.hasAttribute('data-map-pick'));
      var hovered = dayMap.querySelectorAll('.day-map__pin:hover');
      if (!hovered.length && !onPick) return;
      hovered.forEach(function (pin) { pin.classList.add('is-dismissed'); });
      if (onPick) active.classList.add('is-dismissed');
      selectOnMap(null);
      mapDetail.textContent = mapHint;
    });
  }

  // ---- Registry preview --------------------------------------------------
  // Zola's script swaps the link for a frame with no title; name it when it appears.
  var registryFrame = document.querySelector('[data-registry-frame]');
  if (registryFrame && 'MutationObserver' in window) {
    var nameFrames = function () {
      registryFrame.querySelectorAll('iframe:not([title])').forEach(function (frame) {
        frame.setAttribute('title', registryFrame.getAttribute('data-frame-title'));
      });
    };
    new MutationObserver(nameFrames).observe(registryFrame, { childList: true });
    nameFrames();
  }

  // ---- Slideshow ---------------------------------------------------------
  // A scroll-snap strip that already works by swipe and keyboard scrolling;
  // the buttons and the position readout are added here.
  document.querySelectorAll('[data-slideshow]').forEach(function (slideshow) {
    var track = slideshow.querySelector('[data-slideshow-track]');
    var slides = track ? track.children : [];
    var previous = slideshow.querySelector('[data-slideshow-previous]');
    var next = slideshow.querySelector('[data-slideshow-next]');
    var status = slideshow.querySelector('[data-slideshow-status]');
    if (!track || !slides.length || !previous || !next) return;

    var current = function () {
      var center = track.scrollLeft + track.clientWidth / 2;
      var best = 0;
      var bestDistance = Infinity;
      Array.prototype.forEach.call(slides, function (slide, index) {
        var distance = Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - center);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = index;
        }
      });
      return best;
    };
    var go = function (index) {
      var clamped = Math.max(0, Math.min(slides.length - 1, index));
      var slide = slides[clamped];
      track.scrollTo({
        left: slide.offsetLeft - (track.clientWidth - slide.offsetWidth) / 2,
        behavior: motionReduced() ? 'auto' : 'smooth',
      });
    };
    var update = function () {
      var index = current();
      previous.disabled = index === 0;
      next.disabled = index === slides.length - 1;
      if (status) status.textContent = index + 1 + ' / ' + slides.length;
    };
    previous.hidden = false;
    next.hidden = false;
    previous.addEventListener('click', function () { go(current() - 1); });
    next.addEventListener('click', function () { go(current() + 1); });
    var scrollTimer = null;
    track.addEventListener('scroll', function () {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(update, 80);
    });
    update();
  });

  // ---- Photo viewer ------------------------------------------------------
  // Opens a gallery photo larger in a <dialog>. Only real photos (links with
  // data-viewer) open; placeholders are not links.
  var viewer = document.querySelector('[data-viewer-dialog]');
  var viewerLinks = Array.prototype.slice.call(document.querySelectorAll('a[data-viewer]'));
  if (viewer && viewerLinks.length && typeof viewer.showModal === 'function') {
    var image = viewer.querySelector('img');
    var caption = viewer.querySelector('[data-viewer-caption]');
    var index = 0;
    var show = function (nextIndex) {
      index = (nextIndex + viewerLinks.length) % viewerLinks.length;
      var link = viewerLinks[index];
      image.src = link.href;
      image.alt = link.dataset.alt || '';
      // The caption is a live region: it tells a screen-reader user which photo is now shown.
      caption.textContent = index + 1 + ' / ' + viewerLinks.length + (link.dataset.alt ? ' · ' + link.dataset.alt : '');
    };
    viewerLinks.forEach(function (link, linkIndex) {
      link.addEventListener('click', function (event) {
        event.preventDefault();
        show(linkIndex);
        viewer.showModal();
      });
    });
    viewer.querySelector('[data-viewer-previous]').addEventListener('click', function () { show(index - 1); });
    viewer.querySelector('[data-viewer-next]').addEventListener('click', function () { show(index + 1); });
    viewer.querySelector('[data-viewer-close]').addEventListener('click', function () { viewer.close(); });
    viewer.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowLeft') show(index - 1);
      if (event.key === 'ArrowRight') show(index + 1);
    });
    viewer.addEventListener('click', function (event) {
      if (event.target === viewer) viewer.close();
    });
  }
})();
