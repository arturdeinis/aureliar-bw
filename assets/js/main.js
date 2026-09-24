/* 371AURELIAR interactions.
   Vanilla JS. Lenis (vendored, MIT) smooths wheel scrolling when present;
   everything else works without it. One scroll-driven update loop drives
   every scroll effect, and all of it stands down under reduced motion. */
(function () {
  'use strict';

  var doc = document;
  var body = doc.body;
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var vh = window.innerHeight;
  var vw = window.innerWidth;

  /* the curtain plays once per session */
  try { sessionStorage.setItem('aur-seen', '1'); } catch (e) {}

  /* ------------------------------------------------ rolling button labels -- */
  each(doc.querySelectorAll('.btn > span'), function (span) {
    var text = span.textContent.trim();
    span.innerHTML = '';
    var roll = doc.createElement('span');
    roll.className = 'roll';
    roll.setAttribute('data-t', text);
    roll.textContent = text;
    span.appendChild(roll);
  });

  /* ------------------------------------------------------- smooth scroll -- */
  var lenis = null;
  if (!reduced && typeof window.Lenis === 'function') {
    lenis = new window.Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); } });
    var raf = function (time) { lenis.raf(time); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }

  var headH = function () {
    var h = doc.getElementById('header');
    return h ? h.offsetHeight : 0;
  };

  function scrollToTarget(target) {
    if (lenis) lenis.scrollTo(target, { offset: target === 0 ? 0 : -headH() + 1 });
    else if (target === 0) window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  }

  /* ---------------------------------------------------------- header -- */
  var header = doc.getElementById('header');
  var lastY = window.scrollY;

  function updateHeader(y) {
    if (!header) return;
    header.classList.toggle('is-stuck', y > 40);
    var max = doc.documentElement.scrollHeight - vh;
    header.style.setProperty('--sp', max > 0 ? clamp(y / max, 0, 1).toFixed(4) : 0);
    var goingDown = y > lastY + 2;
    var goingUp = y < lastY - 2;
    if (goingDown && y > vh * 0.6 && !body.classList.contains('is-menu')) header.classList.add('is-hidden');
    else if (goingUp || y < 80) header.classList.remove('is-hidden');
    lastY = y;
  }

  /* ------------------------------------------------------------ menu -- */
  var burger = doc.getElementById('burger');
  var menu = doc.getElementById('menu');
  var menuImg = menu ? menu.querySelector('[data-menu-img]') : null;

  function setMenu(open) {
    body.classList.toggle('is-menu', open);
    body.classList.toggle('is-locked', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    var label = burger.querySelector('.menu-btn__label');
    if (label) label.textContent = open ? 'Close' : 'Menu';
    menu.setAttribute('aria-hidden', String(!open));
    if (open) {
      menu.removeAttribute('inert');
      if (lenis) lenis.stop();
      header.classList.remove('is-hidden');
    } else {
      menu.setAttribute('inert', '');
      if (lenis) lenis.start();
    }
  }

  if (burger && menu) {
    burger.addEventListener('click', function () {
      var open = !body.classList.contains('is-menu');
      setMenu(open);
      if (open) {
        var first = menu.querySelector('a');
        if (first) window.setTimeout(function () { first.focus({ preventScroll: true }); }, 200);
      }
    });

    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && body.classList.contains('is-menu')) { setMenu(false); burger.focus(); }
    });

    if (menuImg) {
      each(menu.querySelectorAll('[data-img]'), function (a) {
        var swap = function () {
          var src = a.getAttribute('data-img');
          if (menuImg.getAttribute('src') === src) return;
          menuImg.classList.add('is-swapping');
          window.setTimeout(function () {
            menuImg.src = src;
            menuImg.classList.remove('is-swapping');
          }, 180);
        };
        a.addEventListener('mouseenter', swap);
        a.addEventListener('focus', swap);
      });
    }
  }

  /* ------------------------------------------------- in-page anchors -- */
  doc.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    var target = id === '#main' || id === '#top' ? 0 : doc.querySelector(id);
    if (target === null) return;
    e.preventDefault();
    var wasOpen = body.classList.contains('is-menu');
    if (wasOpen) setMenu(false);
    window.setTimeout(function () { scrollToTarget(target); }, wasOpen ? 450 : 0);
  });

  /* -------------------------------------- page leave (curtain comes down) -- */
  if (!reduced) {
    doc.addEventListener('click', function (e) {
      var a = e.target.closest('a[href]');
      if (!a || e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank') return;
      var href = a.getAttribute('href');
      if (!/^(index|apply)\.html(\?|$)/.test(href)) return;
      e.preventDefault();
      body.classList.add('is-leaving');
      window.setTimeout(function () { window.location.href = href; }, 560);
    });
    window.addEventListener('pageshow', function (e) {
      if (e.persisted) body.classList.remove('is-leaving');
    });
  }

  /* -------------------------------------------------- reveal on view -- */
  var revealables = doc.querySelectorAll('.reveal, .split-lines');
  if (!('IntersectionObserver' in window) || reduced) {
    each(revealables, function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
    each(revealables, function (el) { io.observe(el); });
  }

  /* --------------------------------------------- manifesto word light -- */
  var words = [];
  var wordsBox = doc.querySelector('[data-words]');
  if (wordsBox) {
    var nodes = Array.prototype.slice.call(wordsBox.childNodes);
    nodes.forEach(function (node) {
      if (node.nodeType === 3) {
        var frag = doc.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(doc.createTextNode(' ')); return; }
          var s = doc.createElement('span');
          s.className = 'w';
          s.textContent = part;
          frag.appendChild(s);
          words.push(s);
        });
        wordsBox.replaceChild(frag, node);
      } else if (node.classList && node.classList.contains('pill-img')) {
        node._pill = true;
        words.push(node);
      }
    });
  }

  function updateWords() {
    if (!words.length || reduced) return;
    var r = wordsBox.getBoundingClientRect();
    if (r.bottom < -vh || r.top > vh * 2) return;
    var p = clamp((vh * 0.82 - r.top) / (r.height + vh * 0.25), 0, 1);
    var lit = p * words.length * 1.08;
    for (var i = 0; i < words.length; i++) {
      var o = clamp(lit - i, 0, 1);
      var w = words[i];
      if (w._pill) w.classList.toggle('is-on', o > 0.3);
      else if (w._o !== o) { w.style.setProperty('--o', (0.22 + o * 0.78).toFixed(3)); w._o = o; }
    }
  }

  /* ------------------------------------------------ club: sticky stage -- */
  var stageImgs = doc.querySelectorAll('[data-stage]');
  var stageNo = doc.querySelector('[data-stage-no]');
  var pillars = doc.querySelectorAll('[data-pillar]');
  var current = 0;

  function setStage(i) {
    if (i === current) return;
    each(stageImgs, function (img) { img.classList.remove('is-leaving'); });
    stageImgs[current].classList.remove('is-active');
    stageImgs[current].classList.add('is-leaving');
    stageImgs[i].classList.add('is-active');
    current = i;
    if (stageNo) stageNo.textContent = '0' + (i + 1);
  }

  if (pillars.length && 'IntersectionObserver' in window) {
    pillars[0].classList.add('is-active');
    var pio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        each(pillars, function (p) { p.classList.remove('is-active'); });
        entry.target.classList.add('is-active');
        setStage(Number(entry.target.getAttribute('data-pillar')));
      });
    }, { rootMargin: '-48% 0px -48% 0px' });
    each(pillars, function (p) { pio.observe(p); });
  }

  /* --------------------------------------------------- videos + toggle -- */
  var heroVideo = doc.querySelector('.hero__video');
  var toggle = doc.querySelector('[data-video-toggle]');
  var userPaused = reduced;

  function syncToggle() {
    if (!toggle || !heroVideo) return;
    var paused = heroVideo.paused;
    toggle.classList.toggle('is-paused', paused);
    toggle.setAttribute('aria-label', paused ? 'Play film' : 'Pause film');
    var t = toggle.querySelector('.vid-toggle__text');
    if (t) t.textContent = paused ? 'Play' : 'Pause';
  }

  if (heroVideo) {
    if (reduced) { heroVideo.removeAttribute('autoplay'); heroVideo.pause(); }
    heroVideo.addEventListener('play', syncToggle);
    heroVideo.addEventListener('pause', syncToggle);
    syncToggle();
    if (toggle) {
      toggle.addEventListener('click', function () {
        if (heroVideo.paused) { userPaused = false; heroVideo.play(); }
        else { userPaused = true; heroVideo.pause(); }
      });
    }
  }

  // Lazy films load their source near the viewport; every film pauses off-screen.
  if ('IntersectionObserver' in window) {
    var vio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var v = entry.target;
        if (entry.isIntersecting) {
          if (v.hasAttribute('data-lazy-video')) {
            each(v.querySelectorAll('source[data-src]'), function (s) { s.src = s.getAttribute('data-src'); s.removeAttribute('data-src'); });
            v.removeAttribute('data-lazy-video');
            v.load();
          }
          if (reduced) return;
          if (v === heroVideo && userPaused) return;
          var pr = v.play();
          if (pr && pr.catch) pr.catch(function () {});
        } else if (!v.paused) {
          v.pause();
          if (v === heroVideo) syncToggle();
        }
      });
    }, { rootMargin: '25% 0px' });
    each(doc.querySelectorAll('[data-video]'), function (v) { vio.observe(v); });
  }

  /* ------------------------------------------------------ film scale -- */
  var film = doc.querySelector('.film');
  var filmFrame = film ? film.querySelector('[data-film]') : null;

  function updateFilm() {
    if (!filmFrame || reduced) return;
    var r = film.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh) return;
    var p = clamp(-r.top / (vh * 0.85), 0, 1);
    var eased = 1 - Math.pow(1 - p, 3);
    filmFrame.style.setProperty('--p', eased.toFixed(4));
    film.classList.toggle('is-open', p > 0.7);
  }

  /* ------------------------------------------- moments: sideways travel -- */
  var moments = doc.querySelector('.moments');
  var track = moments ? moments.querySelector('[data-htrack]') : null;
  var hprog = moments ? moments.querySelector('[data-hprogress]') : null;
  var shotImgs = track ? track.querySelectorAll('.shot__img img') : [];
  var travel = 0;
  var pinned = false;

  function layoutMoments() {
    if (!moments || !track) return;
    pinned = !reduced && vw >= 900;
    moments.classList.toggle('is-pinned', pinned);
    if (!pinned) {
      moments.style.height = '';
      track.style.transform = '';
      return;
    }
    track.style.transform = 'none';
    travel = Math.max(0, track.scrollWidth - vw);
    moments.style.height = (vh + travel) + 'px';
  }

  function updateMoments() {
    if (!pinned) return;
    var r = moments.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh) return;
    var p = clamp(-r.top / Math.max(1, (r.height - vh)), 0, 1);
    track.style.transform = 'translate3d(' + (-p * travel).toFixed(1) + 'px,0,0)';
    if (hprog) hprog.style.setProperty('--hp', p.toFixed(4));
    for (var i = 0; i < shotImgs.length; i++) {
      var box = shotImgs[i].parentNode.getBoundingClientRect();
      var c = (box.left + box.width / 2 - vw / 2) / vw;
      shotImgs[i].style.transform = 'scale(1.12) translate3d(' + (c * -4).toFixed(2) + '%,0,0)';
    }
  }

  /* ---------------------------------------------------------- parallax -- */
  var parallax = doc.querySelectorAll('[data-parallax]');
  var innerPar = doc.querySelectorAll('[data-parallax-inner]');
  var footWord = doc.querySelector('.footer__word span');

  function updateParallax() {
    if (reduced) return;
    each(parallax, function (el) {
      var r = el.parentNode.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      var k = parseFloat(el.getAttribute('data-parallax')) || 0.15;
      var off = (r.top + r.height / 2 - vh / 2) * -k;
      el.style.transform = 'translate3d(0,' + (el.closest('.hero') ? Math.max(0, -r.top * k) : off).toFixed(1) + 'px,0)';
    });
    each(innerPar, function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      var p = clamp((vh - r.top) / (vh + r.height), 0, 1);
      el.style.setProperty('--py', (-16 + p * 16).toFixed(2) + '%');
    });
    if (footWord) {
      var fr = footWord.parentNode.getBoundingClientRect();
      if (fr.top < vh) {
        var fp = clamp((vh - fr.top) / (fr.height + 120), 0, 1);
        footWord.style.setProperty('--fy', ((1 - fp) * 60).toFixed(1) + '%');
      }
    }
  }

  /* ------------------------------------------------------ the one loop -- */
  var ticking = false;
  function frame() {
    ticking = false;
    var y = window.scrollY;
    updateHeader(y);
    updateWords();
    updateFilm();
    updateMoments();
    updateParallax();
  }
  function request() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }

  if (lenis) lenis.on('scroll', request);
  else window.addEventListener('scroll', request, { passive: true });

  var resizeT;
  window.addEventListener('resize', function () {
    clearTimeout(resizeT);
    resizeT = setTimeout(function () {
      vh = window.innerHeight; vw = window.innerWidth;
      layoutMoments();
      if (lenis) lenis.resize();
      request();
    }, 120);
  });

  layoutMoments();
  window.addEventListener('load', function () { layoutMoments(); if (lenis) lenis.resize(); request(); });
  request();

  /* ------------------------------------------------ chapter v countdown -- */
  var countdown = doc.querySelector('[data-countdown]');
  if (countdown) {
    var at = Date.parse(countdown.getAttribute('data-countdown'));
    var cells = {};
    each(countdown.querySelectorAll('[data-cd]'), function (el) { cells[el.getAttribute('data-cd')] = el; });
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var tickCd = function () {
      var left = Math.max(0, at - Date.now());
      var s = Math.floor(left / 1000);
      cells.d.textContent = pad(Math.floor(s / 86400));
      cells.h.textContent = pad(Math.floor(s / 3600) % 24);
      cells.m.textContent = pad(Math.floor(s / 60) % 60);
      cells.s.textContent = pad(s % 60);
      return left > 0;
    };
    if (!isNaN(at) && tickCd()) {
      var cdTimer = setInterval(function () { if (!tickCd()) clearInterval(cdTimer); }, 1000);
    }
  }

  /* -------------------------------------------- accordion, one at a time -- */
  var qas = doc.querySelectorAll('.qa');
  function closeQa(qa) {
    if (!qa.open) return;
    qa.classList.remove('is-open');
    window.setTimeout(function () { if (!qa.classList.contains('is-open')) qa.open = false; }, reduced ? 0 : 520);
  }
  each(qas, function (qa) {
    var summary = qa.querySelector('summary');
    summary.addEventListener('click', function (e) {
      e.preventDefault();
      if (qa.classList.contains('is-open')) { closeQa(qa); return; }
      each(qas, function (other) { if (other !== qa) closeQa(other); });
      qa.open = true;
      requestAnimationFrame(function () { requestAnimationFrame(function () { qa.classList.add('is-open'); }); });
    });
  });

  /* ------------------------------------------------------ clock, year -- */
  var clocks = doc.querySelectorAll('[data-clock]');
  if (clocks.length) {
    var fmt;
    try { fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Riga' }); } catch (e) { fmt = null; }
    var tick = function () {
      if (!fmt) return;
      var t = fmt.format(new Date());
      each(clocks, function (el) { el.textContent = t; });
    };
    tick();
    setInterval(tick, 20000);
  }

  each(doc.querySelectorAll('[data-year]'), function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  /* ============================== membership application ============== */
  var form = doc.getElementById('apply-form');
  if (!form) return;

  var status = doc.getElementById('form-status');
  var submitBtn = doc.getElementById('submit-btn');

  /* --------------------------------------------------------------------
     CRM HOOK
     Set ENDPOINT to the CRM / form endpoint (HubSpot, Attio, Pipedrive,
     Zapier, Make, a serverless function). While it is null the form
     validates, shows the confirmation state and logs the payload, so the
     journey can be demoed end to end before the CRM is wired.
  -------------------------------------------------------------------- */
  var ENDPOINT = null;

  function fieldOf(input) { return input.closest('.field') || input.closest('.consent'); }

  function setError(input, message) {
    var wrap = fieldOf(input);
    if (!wrap) return;
    wrap.classList.toggle('has-error', Boolean(message));
    var slot = wrap.querySelector('[data-error]');
    if (slot) slot.textContent = message || '';
    if (input.name === 'consent') {
      var consentSlot = doc.querySelector('[data-for="consent"]');
      if (consentSlot) consentSlot.textContent = message || '';
    }
  }

  function validate(input) {
    var value = (input.value || '').trim();

    if (input.type === 'checkbox') {
      if (input.required && !input.checked) return 'Please confirm to continue.';
      return '';
    }
    if (input.required && !value) return 'This field is required.';
    if (input.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      return 'Please enter a valid email address.';
    }
    if (input.type === 'tel' && value && !/^[+()\d\s-]{6,}$/.test(value)) {
      return 'Please enter a valid phone number.';
    }
    if (input.name === 'birthYear' && value && !/^(19|20)\d{2}$/.test(value)) {
      return 'Please enter a four-digit year.';
    }
    return '';
  }

  var inputs = form.querySelectorAll('input, select, textarea');

  /* progress: one bar per fieldset, filled by its required fields */
  var bars = doc.querySelectorAll('.progress-steps span');
  var sets = form.querySelectorAll('.fieldset');
  function updateProgress() {
    each(sets, function (set, i) {
      if (!bars[i]) return;
      var req = set.querySelectorAll('[required]');
      var done = 0;
      each(req, function (el) { if (!validate(el)) done++; });
      bars[i].style.setProperty('--f', req.length ? (done / req.length).toFixed(3) : 1);
    });
  }

  each(inputs, function (input) {
    input.addEventListener('blur', function () { setError(input, validate(input)); });
    input.addEventListener('input', function () {
      var wrap = fieldOf(input);
      if (wrap && wrap.classList.contains('has-error')) setError(input, validate(input));
      updateProgress();
    });
    input.addEventListener('change', updateProgress);
  });
  updateProgress();

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var firstInvalid = null;

    each(inputs, function (input) {
      var message = validate(input);
      setError(input, message);
      if (message && !firstInvalid) firstInvalid = input;
    });

    if (firstInvalid) {
      status.textContent = 'Please complete the highlighted fields.';
      status.dataset.state = 'error';
      firstInvalid.focus();
      return;
    }

    var payload = {};
    new FormData(form).forEach(function (value, key) {
      payload[key] = key === 'consent' ? true : value;
    });
    payload.source = 'aureliar.com/apply';
    payload.submittedAt = new Date().toISOString();

    submitBtn.disabled = true;
    submitBtn.classList.add('is-busy');
    status.dataset.state = 'sending';
    status.textContent = 'Sending your application…';

    var done = function () {
      body.classList.add('is-submitted');
      scrollToTarget(0);
    };

    if (!ENDPOINT) {
      console.info('[371AURELIAR] application payload (no CRM endpoint set yet)', payload);
      window.setTimeout(done, 500);
      return;
    }

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Request failed: ' + res.status);
        done();
      })
      .catch(function (err) {
        console.error(err);
        submitBtn.disabled = false;
        submitBtn.classList.remove('is-busy');
        status.dataset.state = 'error';
        status.textContent = 'Something went wrong. Please write to members@aureliar.com.';
      });
  });
})();
