/* The Beige Stallion. 2000 to 2026. All behaviour for the memorial page.
   No network requests: data comes from js/data.js, media from relative paths. */
(function () {
  'use strict';

  var D = window.BS_DATA || { trips: [], cams: [], photos: {}, states: [] };
  var html = document.documentElement;
  var RM = html.classList.contains('rm');
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };
  var stripH = function () { return $('.strip').getBoundingClientRect().height; };
  var SVGNS = document.querySelector('svg').namespaceURI;

  function store(key, val) {
    try {
      if (val === undefined) return window.localStorage.getItem(key);
      window.localStorage.setItem(key, val);
    } catch (e) { return null; }
    return null;
  }

  /* ---------- Grain texture and icon, drawn locally ---------- */
  (function grain() {
    try {
      var c = document.createElement('canvas');
      c.width = c.height = 128;
      var g = c.getContext('2d');
      var img = g.createImageData(128, 128);
      for (var i = 0; i < img.data.length; i += 4) {
        var v = 110 + Math.random() * 120;
        img.data[i] = v; img.data[i + 1] = v * 0.96; img.data[i + 2] = v * 0.9; img.data[i + 3] = 70;
      }
      g.putImageData(img, 0, 0);
      html.style.setProperty('--grain', 'url(' + c.toDataURL('image/png') + ')');
    } catch (e) { /* no grain, no harm */ }
  })();

  /* ---------- Odometer drums ---------- */
  function buildDrums(el) {
    var cells = '';
    for (var d = 0; d <= 9; d++) cells += '<span>' + d + '</span>';
    cells += '<span>0</span><span>?</span>';
    var out = '';
    for (var i = 0; i < 6; i++) {
      out += '<span class="drum"><span class="reel">' + cells + '</span></span>';
      if (i === 2) out += '<span class="drum-comma">,</span>';
    }
    el.innerHTML = out;
    return $$('.reel', el);
  }
  function setDrums(reels, v, cell) {
    for (var i = 0; i < 6; i++) {
      var place = Math.pow(10, i);
      var n = Math.floor(v / place);
      var d = n % 10;
      var frac;
      if (i === 0) frac = v - Math.floor(v);
      else {
        var r = v % place;
        frac = r > place - 1 ? r - (place - 1) : 0;
      }
      reels[5 - i].style.transform = 'translateY(' + (-(d + frac) * cell) + 'em)';
    }
  }
  function setPast(reels, cell) {
    var pos = [2, 0, 0, 11, 11, 11];
    for (var i = 0; i < 6; i++) reels[i].style.transform = 'translateY(' + (-pos[i] * cell) + 'em)';
  }

  var odoBtn = $('#odo');
  var odoReels = buildDrums($('.odo__drums'));
  var bigEl = $('#bigodo');
  var bigReels = bigEl ? buildDrums(bigEl) : [];
  var odoText = $('#odo-text');
  var odoNote = $('#odo-note');
  var lastOdoAnnounce = '';
  var isPast = false;

  function fmt(n) { return Math.round(n).toLocaleString('en-US'); }

  odoBtn.removeAttribute('aria-describedby');
  odoBtn.addEventListener('click', function () {
    if (!isPast) return;
    odoNote.classList.toggle('show');
  });
  document.addEventListener('click', function (e) {
    if (!odoBtn.contains(e.target)) odoNote.classList.remove('show');
  });

  /* ---------- Running head and chapter-level announcements ---------- */
  var running = $('#running');
  if ('IntersectionObserver' in window) {
    var runIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          var t = en.target.getAttribute('data-running');
          if (t) running.textContent = t.replace(/&middot;/g, '·');
          var txt = isPast ? 'Odometer: 200,??? miles. Past 200,000. The last mileage was never written down.'
            : 'Odometer: ' + fmt(currentOdo) + ' miles';
          if (txt !== lastOdoAnnounce) { odoText.textContent = txt; lastOdoAnnounce = txt; }
        }
      });
    }, { rootMargin: '-50% 0px -50% 0px' });
    $$('[data-running]').forEach(function (s) { runIO.observe(s); });
  }


  /* ---------- Turn the key: the real cluster, the light sweep, the amber lamp ---------- */
  var intro = $('#intro');
  var introOpen = false;
  var timers = [];
  function setInert(on) {
    ['main', '.strip', '.footer', '.skip-link'].forEach(function (s) { var el = $(s); if (el) el.inert = on; });
  }
  function closeIntro(fast) {
    if (!introOpen) return;
    introOpen = false;
    timers.forEach(clearTimeout);
    intro.classList.add('is-leaving');
    if (fast) intro.style.transitionDuration = '.6s';
    html.classList.remove('intro-on');
    setInert(false);
    setTimeout(function () { intro.hidden = true; }, fast ? 650 : 2100);
    var h1 = $('#title');
    if (h1) h1.focus({ preventScroll: true });
    onScroll();
  }
  function turnKey() {
    if (intro.classList.contains('is-started')) return;
    intro.classList.add('is-started');
    var at = function (ms, fn) { timers.push(setTimeout(fn, ms)); };
    at(500, function () { intro.classList.add('is-lit'); });        // the cluster fades up
    at(1400, function () { intro.classList.add('is-sweep'); });     // a slow light sweep across the dials
    at(2600, function () { intro.classList.add('is-check'); html.classList.add('cel-on'); }); // the amber lamp
    at(4600, function () { intro.classList.add('is-titled'); });
    at(7600, function () { intro.classList.add('is-dim'); });
    at(9200, function () { closeIntro(false); });
  }
  if (html.classList.contains('intro-on') && intro) {
    intro.hidden = false;
    introOpen = true;
    setInert(true);
    $('#turn-key').addEventListener('click', turnKey);
    $('#skip-intro').addEventListener('click', function () { closeIntro(true); });
    intro.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); closeIntro(true); }
      if (e.key === 'Tab') {
        var f = [$('#turn-key'), $('#skip-intro')].filter(function (b) { return b.offsetParent !== null; });
        var i = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(i + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus();
      }
    });
    setTimeout(function () { $('#turn-key').focus({ preventScroll: true }); }, 60);
  }

  /* ---------- Reveals: chapters arrive slowly, quotes line by line ---------- */
  function splitLines(el) {
    if (!el.getAttribute('data-src')) el.setAttribute('data-src', el.innerHTML);
    el.innerHTML = el.getAttribute('data-src');
    var text = el.textContent;
    var words = text.split(/(\s+)/);
    el.innerHTML = words.map(function (w) { return /^\s+$/.test(w) ? w : '<span class="w">' + w.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</span>'; }).join('');
    var spans = $$('.w', el), lines = [], top = null;
    spans.forEach(function (s) {
      if (top === null || Math.abs(s.offsetTop - top) > 4) { lines.push([]); top = s.offsetTop; }
      lines[lines.length - 1].push(s.textContent);
    });
    el.innerHTML = lines.map(function (l, i) {
      return '<span class="ln-wrap"><span class="ln" style="transition-delay:' + (i * 140) + 'ms">' + l.join(' ').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</span></span>';
    }).join(' ');
  }
  var splitEls = [];
  if (!RM && 'IntersectionObserver' in window) {
    splitEls = $$('.pq blockquote p, .ceremony > span, .epitaph__quote, .letter__big');
    var doSplit = function () { splitEls.forEach(splitLines); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(doSplit); else doSplit();
    var rsT = null;
    window.addEventListener('resize', function () { clearTimeout(rsT); rsT = setTimeout(doSplit, 250); });
    var rvSel = '.prose > p, .pq, .letter, .ph:not(.filmstrip .ph), .divider, .classified, .plaque, .words__wall li, .ceremony, .chapter__head, .moment, .dashshot, .nameplate, .seq__intro, .order__list li, .corollas__inner > *, .ledger__title, .words__title, .epitaph';
    var rvIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-shown'); rvIO.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    $$(rvSel).forEach(function (el, i) {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.9 && !introOpen) { el.classList.add('rv', 'is-shown'); return; }
      el.classList.add('rv');
      rvIO.observe(el);
    });
    $$('.plaques .plaque, .words__wall li, .order__list li').forEach(function (el, i) { el.style.transitionDelay = (i % 5) * 90 + 'ms'; });
  }

  /* ---------- Slow pans and parallax on openers ---------- */
  var openers = $$('.opener, .farewell, .cover');
  if ('IntersectionObserver' in window && !RM) {
    var panIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); } });
    }, { threshold: 0.15 });
    openers.forEach(function (o) { panIO.observe(o); });
  }
  function parallax(vh) {
    if (RM) return;
    openers.forEach(function (o) {
      var m = o.querySelector('.opener__media');
      if (!m) return;
      var r = o.getBoundingClientRect();
      if (r.bottom < -50 || r.top > vh + 50) return;
      var p = (r.top + r.height / 2 - vh / 2) / vh; // -1..1 around centre
      m.style.transform = 'translate3d(0,' + (p * -7).toFixed(2) + '%,0)';
    });
  }

  /* ---------- The roads map: brass routes, a camera that follows each trip ---------- */
  var map = $('#map');
  var trips = D.trips || [];
  var N = trips.length;
  var routeEls = [], maskEls = [], destEls = [], labelEls = [], waypointEls = [], camEls = [], stateLabels = [], homeEls = [];
  var pins = [];
  var CERT = { 'yes': 'Yes', 'very likely': 'Very likely', 'possible': 'Possible' };
  var CERT_CLS = { 'yes': 'yes', 'very likely': 'likely', 'possible': 'possible' };
  var DASH = { yes: null, likely: [7, 5], possible: [0.1, 5] };
  function lineSample(cert) {
    return '<svg viewBox="0 0 40 8" aria-hidden="true"><path d="M2 4h36" class="ln ln--' + CERT_CLS[cert] + '"/></svg>';
  }
  function el(name, attrs, parent) {
    var e = document.createElementNS(SVGNS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function curvePath(pts) {
    var d = 'M' + pts[0][0] + ' ' + pts[0][1];
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i];
      var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      // bow direction depends only on the pair, not the order: the way out and the way back share one curve
      var lo = (a[0] < b[0] || (a[0] === b[0] && a[1] <= b[1])) ? a : b, hi = lo === a ? b : a;
      var dx = hi[0] - lo[0], dy = hi[1] - lo[1];
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var k = 0.12 * len;
      d += ' Q' + (mx - dy / len * k).toFixed(1) + ' ' + (my + dx / len * k).toFixed(1) + ' ' + b[0] + ' ' + b[1];
    }
    return d;
  }
  // Out and back to a pair of neighbouring towns (Indio, then La Quinta): come home along the way out,
  // so the trip reads as one road instead of two near-parallel lines. Places and order are unchanged.
  function foldReturn(pts) {
    var n = pts.length;
    if (n < 4) return pts;
    var a = pts[0], b = pts[1], c = pts[n - 2], z = pts[n - 1];
    var near = Math.sqrt(Math.pow(c[0] - b[0], 2) + Math.pow(c[1] - b[1], 2));
    if (z[0] === a[0] && z[1] === a[1] && near > 0 && near < 12) return pts.slice(0, n - 1).concat([b, z]);
    return pts;
  }
  function farthest(pts, home) {
    var best = pts[0], bd = -1;
    pts.forEach(function (p) {
      var d = Math.pow(p[0] - home[0], 2) + Math.pow(p[1] - home[1], 2);
      if (d > bd) { bd = d; best = p; }
    });
    return best;
  }
  var ALL = [12, 14, 424, 694]; // x, y, w, h of California, Oregon and Nevada
  var boxes = [];
  if (map && N) {
    var defs = el('defs', {}, map);
    var glow = el('filter', { id: 'route-glow', x: '-20%', y: '-20%', width: '140%', height: '140%' }, defs);
    var glowBlur = el('feGaussianBlur', { stdDeviation: '2.2', result: 'b' }, glow);
    var fm = el('feMerge', {}, glow);
    el('feMergeNode', { in: 'b' }, fm); el('feMergeNode', { in: 'SourceGraphic' }, fm);
    var gBase = el('g', {}, map);
    D.states.filter(function (s) { return s.faint; }).concat(D.states.filter(function (s) { return !s.faint; })).forEach(function (s) {
      el('path', { d: s.d, class: s.faint ? 'state state--faint' : 'state state--' + s.id }, gBase);
    });
    var gRoutes = el('g', {}, map);
    var gPins = el('g', {}, map);
    var gLabels = el('g', {}, map);
    // state names sit where no route passes (checked against every route in places.json)
    [['Oregon', 178, 140], ['Nevada', 338, 292], ['California', 272, 500]].forEach(function (l) {
      var t = el('text', { x: l[1], y: l[2], class: 'state-label', 'text-anchor': 'middle', 'dominant-baseline': 'middle' }, gLabels);
      t.textContent = l[0];
      stateLabels.push(t);
    });
    var home = D.home;
    trips.forEach(function (t, i) {
      var cls = CERT_CLS[t.certainty];
      var dest = t.pin ? t.pts[0] : farthest(t.pts, home);
      var xs = t.pts.map(function (p) { return p[0]; }).concat(t.pin ? [] : [home[0]]);
      var ys = t.pts.map(function (p) { return p[1]; }).concat(t.pin ? [] : [home[1]]);
      boxes[i] = [Math.min.apply(0, xs), Math.min.apply(0, ys), Math.max.apply(0, xs), Math.max.apply(0, ys)];
      if (!t.pin) {
        var d = curvePath(foldReturn(t.pts));
        var m = el('mask', { id: 'mk-' + i, maskUnits: 'userSpaceOnUse', x: '-50', y: '-50', width: '600', height: '820' }, defs);
        maskEls[i] = el('path', { d: d, fill: 'none', stroke: '#fff', 'stroke-width': '12', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', pathLength: '1', 'stroke-dasharray': '1 1', 'stroke-dashoffset': RM ? '0' : '1' }, m);
        var g = el('g', { mask: 'url(#mk-' + i + ')' }, gRoutes);
        routeEls[i] = el('path', { d: d, class: 'route route--' + cls }, g);
        routeEls[i].dash = DASH[cls];
        waypointEls[i] = t.pts.slice(1, -1).filter(function (p) { return p !== dest; }).map(function (p) {
          return el('circle', { cx: p[0], cy: p[1], r: '1.6', class: 'wp' }, gPins);
        });
      } else { waypointEls[i] = []; }
      destEls[i] = el('circle', { cx: dest[0], cy: dest[1], r: '3', class: 'dest' }, gPins);
      var lab = el('text', { x: dest[0], y: dest[1], class: 'label' }, gLabels);
      lab.textContent = t.label;
      lab.anchor = dest;
      labelEls[i] = lab;
      pins.push({ x: dest[0], y: dest[1], kind: 'trip', idx: i });
    });
    D.cams.forEach(function (c, i) {
      camEls.push(el('rect', { x: c.xy[0], y: c.xy[1], width: 5, height: 5, class: 'cam' }, gPins));
      pins.push({ x: c.xy[0], y: c.xy[1], kind: 'cam', idx: i });
    });
    homeEls.push(el('circle', { cx: home[0], cy: home[1], r: '7', class: 'home-ring' }, gPins));
    homeEls.push(el('circle', { cx: home[0], cy: home[1], r: '3.6', class: 'home' }, gPins));
    var hl = el('text', { x: home[0], y: home[1], class: 'home-label', 'text-anchor': 'end' }, gLabels);
    hl.textContent = 'San Francisco';
    homeEls.push(hl);
    $('.roads__track').style.setProperty('--n', N + 1);
  }

  // camera: the viewBox eases toward a target that frames the current trip
  var vb = ALL.slice(), vbTarget = ALL.slice(), camAnim = null;
  function fitBox(b, pad, minSize) {
    var box = map.parentNode.getBoundingClientRect();
    var aspect = box.width / Math.max(1, box.height);
    var w = Math.max(b[2] - b[0], minSize), h = Math.max(b[3] - b[1], minSize);
    var cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
    w *= 1 + pad; h *= 1 + pad;
    if (w / h < aspect) w = h * aspect; else h = w / aspect;
    return [cx - w / 2, cy - h / 2, w, h];
  }
  // keep room west of San Francisco (open ocean) so its name never sits on a route
  function roomForHome(v) {
    var box = map.parentNode.getBoundingClientRect();
    var h0 = D.home;
    if (h0[1] < v[1] || h0[1] > v[1] + v[3]) return v;
    for (var it = 0; it < 3; it++) {
      var k = v[2] / Math.max(1, box.width);
      var short = 112 * k - (h0[0] - v[0]);
      if (short <= 0) break;
      var add = Math.min(short, v[2] * 0.3);
      var nw = v[2] + add, nh = nw * v[3] / v[2];
      v = [v[0] - add, v[1] - (nh - v[3]) / 2, nw, nh];
    }
    return v;
  }
  function allView() { return roomForHome(fitBox([ALL[0], ALL[1], ALL[0] + ALL[2], ALL[1] + ALL[3]], 0.02, 0)); }
  function applyView() {
    map.setAttribute('viewBox', vb.map(function (v) { return v.toFixed(2); }).join(' '));
    var box = map.getBoundingClientRect();
    var k = vb[2] / Math.max(1, box.width); // svg units per css pixel
    if (typeof glowBlur !== 'undefined') glowBlur.setAttribute('stdDeviation', (2.4 * k).toFixed(3));
    routeEls.forEach(function (r) {
      if (!r) return;
      r.style.strokeWidth = ((r.classList.contains('is-current') ? 2.6 : 1.7) * k).toFixed(3);
      if (r.dash) r.style.strokeDasharray = r.dash.map(function (x) { return (x * k).toFixed(3); }).join(' ');
    });
    destEls.forEach(function (d) { d.setAttribute('r', (d.classList.contains('is-current') ? 4.6 : 3.2) * k); d.setAttribute('stroke-width', 1.4 * k); });
    waypointEls.forEach(function (a) { a.forEach(function (w) { w.setAttribute('r', 2 * k); }); });
    camEls.forEach(function (c, i) {
      var s = 6.5 * k, p = D.cams[i].xy;
      c.setAttribute('x', p[0] - s / 2); c.setAttribute('y', p[1] - s / 2); c.setAttribute('width', s); c.setAttribute('height', s);
      c.setAttribute('transform', 'rotate(45 ' + p[0] + ' ' + p[1] + ')'); c.setAttribute('stroke-width', 1 * k);
    });
    if (homeEls.length) {
      homeEls[0].setAttribute('r', 8 * k); homeEls[0].setAttribute('stroke-width', 1 * k);
      homeEls[1].setAttribute('r', 4 * k); homeEls[1].setAttribute('stroke-width', 1.2 * k);
      var homeLeft = (D.home[0] - vb[0]) < 100 * k;
      homeEls[2].setAttribute('x', D.home[0] + (homeLeft ? 10 : -11) * k); homeEls[2].setAttribute('y', D.home[1] + (homeLeft ? 18 : 3.5) * k);
      homeEls[2].setAttribute('text-anchor', homeLeft ? 'start' : 'end');
      homeEls[2].style.fontSize = (10 * k) + 'px'; homeEls[2].style.strokeWidth = (6 * k) + 'px';
    }
    stateLabels.forEach(function (t) {
      t.style.fontSize = (11.5 * k) + 'px'; t.style.strokeWidth = (5 * k) + 'px';
      // hide a state name the camera would cut in half at the map edge
      var half = t.textContent.length * 11.5 * k * 0.47, x = +t.getAttribute('x'), y = +t.getAttribute('y');
      var fits = x - half > vb[0] && x + half < vb[0] + vb[2] && y - 8 * k > vb[1] && y + 8 * k < vb[1] + vb[3];
      t.style.opacity = fits ? '' : '0';
    });
    labelEls.forEach(function (t) {
      var a = t.anchor, right = a[0] > vb[0] + vb[2] * 0.62;
      t.setAttribute('x', a[0] + (right ? -10 : 10) * k); t.setAttribute('y', a[1] - 9 * k);
      t.setAttribute('text-anchor', right ? 'end' : 'start');
      t.style.fontSize = (12 * k) + 'px'; t.style.strokeWidth = (6 * k) + 'px';
    });
  }
  function camStep() {
    var done = true;
    for (var i = 0; i < 4; i++) {
      var d = vbTarget[i] - vb[i];
      if (Math.abs(d) > 0.05) { vb[i] += d * 0.06; done = false; } else vb[i] = vbTarget[i];
    }
    applyView();
    camAnim = done ? null : window.requestAnimationFrame(camStep);
  }
  function aimCamera(target) {
    vbTarget = target;
    if (RM) { vb = target.slice(); applyView(); return; }
    if (!camAnim) camAnim = window.requestAnimationFrame(camStep);
  }

  var drawn = [];
  var currentTrip = -2;
  function paintTrips(fracs, cur) {
    for (var i = 0; i < N; i++) {
      var f = fracs[i];
      if (maskEls[i]) maskEls[i].setAttribute('stroke-dashoffset', (1 - f).toFixed(4));
      destEls[i].classList.toggle('is-shown', f > 0.92 || (trips[i].pin && f > 0.02));
      destEls[i].classList.toggle('is-current', i === cur);
      (waypointEls[i] || []).forEach(function (w) { w.classList.toggle('is-shown', f > 0.5); w.classList.toggle('is-current', i === cur); });
      labelEls[i].classList.toggle('is-shown', i === cur && f > 0.25);
      if (routeEls[i]) {
        routeEls[i].classList.toggle('is-current', i === cur);
        routeEls[i].setAttribute('filter', i === cur ? 'url(#route-glow)' : '');
      }
      drawn[i] = f;
    }
    map.classList.toggle('is-all', cur === -1);
    if (cur !== currentTrip) {
      currentTrip = cur;
      showNow(cur);
      if (cur === -1) aimCamera(allView());
      else {
        var b = boxes[cur], t = trips[cur];
        var hb = [Math.min(b[0], D.home[0]), Math.min(b[1], D.home[1]), Math.max(b[2], D.home[0]), Math.max(b[3], D.home[1])];
        aimCamera(roomForHome(fitBox(t.pin ? hb : b, 0.35, 70)));
      }
      applyView();
    }
  }
  function showNow(i) {
    var t = trips[i];
    var now = $('.now');
    if (now) now.classList.toggle('is-all', !t);
    if (!t) {
      $('#now-count').textContent = 'Every road';
      $('#now-dates').textContent = '2018 to 2023';
      $('#now-name').textContent = 'California, Oregon and Nevada';
      $('#now-cert').innerHTML = '<span>Tap any pin to read more</span>';
      return;
    }
    $('#now-count').textContent = (i + 1) + ' of ' + N;
    $('#now-dates').textContent = t.dates;
    $('#now-name').textContent = t.name;
    $('#now-cert').innerHTML = (t.pin ? '' : lineSample(t.certainty)) + '<span>' + CERT[t.certainty] + (t.pin ? ', a pin only' : '') + '</span>';
  }
  if (N) {
    if (RM) { vb = allView(); paintTrips(trips.map(function () { return 1; }), -1); applyView(); }
    else { vb = allView(); applyView(); paintTrips(trips.map(function () { return 0; }), 0); }
    $('#now-open').addEventListener('click', function () { if (currentTrip >= 0) openTrip(currentTrip); else openTrip(0); });
    window.addEventListener('resize', function () { var c = currentTrip; currentTrip = -2; paintTrips(drawn, c); });
  }

  var hit = $('#map-hit');
  function pinsNear(cx, cy, radius) {
    var ctm = map.getScreenCTM();
    if (!ctm) return [];
    var pt = map.createSVGPoint();
    var out = [];
    pins.forEach(function (p) {
      if (p.kind === 'trip' && (drawn[p.idx] || 0) < 0.3) return;
      pt.x = p.x; pt.y = p.y;
      var s = pt.matrixTransform(ctm);
      var d = Math.sqrt(Math.pow(s.x - cx, 2) + Math.pow(s.y - cy, 2));
      if (d <= radius) out.push({ p: p, d: d });
    });
    out.sort(function (a, b) { return a.d - b.d; });
    return out;
  }
  if (hit) {
    hit.addEventListener('click', function (e) {
      var near = pinsNear(e.clientX, e.clientY, 26);
      if (!near.length) return;
      if (near.length === 1 || near[1].d - near[0].d > 14) openPin(near[0].p);
      else openChooser(near.slice(0, 7).map(function (n) { return n.p; }));
    });
    hit.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      hit.classList.toggle('near', pinsNear(e.clientX, e.clientY, 26).length > 0);
    });
  }

  /* ---------- Cards (map) ---------- */
  var card = $('#card');
  var cardBody = $('#card-body');
  var lastFocus = null;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function photoFig(stem) {
    var p = D.photos[stem];
    if (!p) return '';
    return '<figure><img src="img/s/' + stem + '.jpg" alt="' + esc(p.alt) + '" width="720" height="' + Math.round(720 * p.h / p.w) + '">' +
      '<figcaption><time>' + esc(p.d) + '</time> ' + esc(p.cap) + '</figcaption></figure>';
  }
  function showCard(markup) {
    if (!card.open) lastFocus = document.activeElement;
    cardBody.innerHTML = markup;
    if (typeof card.showModal === 'function') { if (!card.open) card.showModal(); }
    else card.setAttribute('open', '');
    var first = cardBody.querySelector('button') || $('#card-close');
    first.focus();
  }
  function openTrip(i) {
    var t = trips[i];
    var kicker = '<p class="card__kicker"><span>Road ' + (i + 1) + ' of ' + N + '</span>' +
      (t.pin ? '<span>Pin only</span>' : lineSample(t.certainty)) + '<span>' + CERT[t.certainty] + '</span></p>';
    showCard(kicker + '<h3 id="card-title">' + esc(t.name) + '</h3><p class="card__dates">' + esc(t.dates) + '</p>' +
      '<p>' + esc(t.note) + '</p><p class="card__ev">Evidence: ' + esc(t.evidence) + '</p>' + (t.photo ? photoFig(t.photo) : ''));
  }
  function openCam(i) {
    var c = D.cams[i], p = D.photos[c.photo];
    showCard('<p class="card__kicker"><span>Photo pin</span></p><h3 id="card-title">' + esc(c.name) + '</h3>' +
      '<p class="card__dates">' + esc(p.d) + '</p>' + photoFig(c.photo));
  }
  function openPin(p) { if (p.kind === 'trip') openTrip(p.idx); else openCam(p.idx); }
  function openChooser(list) {
    var items = list.map(function (p, k) {
      var name, sub;
      if (p.kind === 'trip') { name = trips[p.idx].label; sub = trips[p.idx].dates + ', ' + CERT[trips[p.idx].certainty]; }
      else { name = D.cams[p.idx].name; sub = 'Photo, ' + D.photos[D.cams[p.idx].photo].d; }
      return '<li><button type="button" data-k="' + k + '">' + esc(name) + '<span>' + esc(sub) + '</span></button></li>';
    }).join('');
    showCard('<p class="card__kicker"><span>Several pins here</span></p><h3 id="card-title">Which one?</h3><ul class="card__choices">' + items + '</ul>');
    $$('.card__choices button', cardBody).forEach(function (b) {
      b.addEventListener('click', function () { openPin(list[+b.getAttribute('data-k')]); });
    });
  }
  function closeCard() {
    if (card.open) { if (card.close) card.close(); else card.removeAttribute('open'); }
  }
  if (card) {
    $('#card-close').addEventListener('click', closeCard);
    card.addEventListener('click', function (e) { if (e.target === card) closeCard(); });
    card.addEventListener('close', function () { if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true }); });
  }

  /* list of every road and pin, for keyboard and screen readers */
  (function roll() {
    var ol = $('#roll-trips'), ul = $('#roll-cams');
    if (!ol || !N) return;
    trips.forEach(function (t, i) {
      var li = document.createElement('li');
      li.innerHTML = '<button type="button" class="roll__btn"><span class="roll__d">' + esc(t.dates) + '</span>' +
        '<span class="roll__name">' + esc(t.name) + '</span><span class="roll__c">' + (t.pin ? '' : lineSample(t.certainty)) +
        esc(CERT[t.certainty]) + (t.pin ? ', pin' : '') + '</span></button>';
      li.firstChild.addEventListener('click', function () { openTrip(i); });
      ol.appendChild(li);
    });
    D.cams.forEach(function (c, i) {
      var p = D.photos[c.photo];
      var li = document.createElement('li');
      li.innerHTML = '<button type="button" class="roll__btn"><span class="roll__d">Photo, ' + esc(p.d) + '</span>' +
        '<span class="roll__name">' + esc(c.name) + '</span><span class="roll__c"><svg viewBox="0 0 40 8" aria-hidden="true"><rect x="16" y="0" width="8" height="8" transform="rotate(45 20 4)" class="cam-key"/></svg>Photo</span></button>';
      li.firstChild.addEventListener('click', function () { openCam(i); });
      ul.appendChild(li);
    });
  })();


  /* ---------- The Last Autumn: one photo at a time, at its own shape ---------- */
  var seq = $('#seq');
  var seqItems = $$('.seq__item');
  var seqImgs = $$('.seq__img');
  var seqIdx = -1, seqFront = 0;
  var seqStems = seqItems.map(function (li) { return li.querySelector('[data-lb]').getAttribute('data-lb'); });
  var SEQ_LIVE = !!(seq && !RM && seqItems.length);
  var frame = $('.seq__frame');
  if (SEQ_LIVE) {
    seq.classList.add('seq--live');
    $('#seq-track').style.setProperty('--n', seqItems.length);
    var stage = $('.seq__stage');
    var fb = document.createElement('button');
    fb.type = 'button'; fb.className = 'seq__enlarge vh'; fb.textContent = 'Enlarge the photo shown';
    stage.appendChild(fb);
    var openCurrent = function () { if (seqIdx >= 0) openLightbox(seqStems[seqIdx]); };
    fb.addEventListener('click', openCurrent);
    fb.addEventListener('focus', function () { fb.classList.remove('vh'); });
    fb.addEventListener('blur', function () { fb.classList.add('vh'); });
    frame.addEventListener('click', openCurrent);
    frame.style.cursor = 'zoom-in';
  }
  function sizeFrame(stem) {
    var p = D.photos[stem];
    if (!p || !frame) return;
    var st = $('.seq__stage').getBoundingClientRect();
    var wide = window.innerWidth >= 1024;
    var availW = wide ? st.width - 320 : st.width;
    var availH = window.innerHeight - stripH() - (wide ? 64 : 150);
    var w = availW, h = w * p.h / p.w;
    if (h > availH) { h = availH; w = h * p.w / p.h; }
    frame.style.width = Math.round(w) + 'px';
    frame.style.height = Math.round(h) + 'px';
  }
  function showSeq(i, force) {
    if (i === seqIdx && !force) return;
    seqIdx = i;
    var stem = seqStems[i];
    var p = D.photos[stem];
    sizeFrame(stem);
    var back = seqImgs[1 - seqFront];
    back.onload = function () {
      back.classList.add('is-on');
      seqImgs[seqFront].classList.remove('is-on');
      seqFront = 1 - seqFront;
    };
    back.alt = '';
    back.src = 'img/l/' + stem + '.jpg';
    var cap = seqItems[i].querySelector('.seq__cap');
    $('#seq-date').textContent = p ? p.d : '';
    $('#seq-what').textContent = cap ? cap.textContent : '';
    $('#seq-count').textContent = (i + 1) + ' / ' + seqItems.length;
    [i + 1, i + 2].forEach(function (k) { if (seqStems[k]) { var im = new Image(); im.src = 'img/l/' + seqStems[k] + '.jpg'; } });
  }
  if (SEQ_LIVE) window.addEventListener('resize', function () { if (seqIdx >= 0) sizeFrame(seqStems[seqIdx]); });

  /* ---------- 199,999: the drums roll up once, and hold ---------- */
  var peakStage = $('#peak-stage');
  var bigDone = false;
  if (bigReels.length) {
    if (RM || !('IntersectionObserver' in window)) { setDrums(bigReels, 199999, 1.3); bigDone = true; }
    else {
      setDrums(bigReels, 199000, 1.3);
      var bigIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting || bigDone) return;
          bigDone = true; bigIO.disconnect();
          peakStage.classList.add('is-lit');
          var t0 = null, dur = 6200;
          var step = function (ts) {
            if (t0 === null) t0 = ts;
            var k = clamp((ts - t0) / dur, 0, 1);
            var e = 1 - Math.pow(1 - k, 4);
            var v = 199000 + 999 * e;
            var whole = Math.floor(v), fr = v - whole;
            setDrums(bigReels, k >= 1 ? 199999 : whole + clamp((fr - 0.6) / 0.4, 0, 1), 1.3);
            if (k < 1) window.requestAnimationFrame(step);
            else bigEl.classList.add('hold');
          };
          window.requestAnimationFrame(step);
        });
      }, { threshold: 0.55 });
      bigIO.observe(peakStage);
    }
  }

  /* ---------- Scroll engine ---------- */
  var returnLight = $('#return-light');
  var celBack = false, lampRetired = false;
  var currentOdo = 150000;
  var anthemTarget = 0.45;
  var ticking = false;
  function docTop(elm) { return elm.getBoundingClientRect().top + window.pageYOffset; }
  function onScroll() {
    ticking = false;
    var u = window.pageYOffset, vh = window.innerHeight, sh = stripH(), mid = vh * 0.5;

    // corner odometer: 150,000 at the handshake, 199,999 as Chapter V arrives, then 200,???
    var A = $('#handshake'), PK = $('#peak'), END = $('[data-odo-end]');
    var v = 150000;
    if (A && PK) {
      var u0 = docTop(A) - mid, u1 = docTop(PK) - vh * 0.35;
      v = 150000 + 49999 * clamp((u - u0) / Math.max(1, u1 - u0), 0, 1);
    }
    var whole = Math.floor(v), fr = v - whole;
    v = whole + (RM ? 0 : clamp((fr - 0.8) / 0.2, 0, 1));
    currentOdo = v;
    var past = END ? END.getBoundingClientRect().top < mid : false;
    if (past !== isPast) {
      isPast = past;
      odoBtn.classList.toggle('is-past', past);
      if (past) odoBtn.setAttribute('aria-describedby', 'odo-note');
      else { odoBtn.removeAttribute('aria-describedby'); odoNote.classList.remove('show'); }
    }
    if (isPast) setPast(odoReels, 1.4); else setDrums(odoReels, v, 1.4);

    // the check-engine light: day one to about six weeks in, then back in the last chapter
    var naming = $('#naming');
    var on = (naming && naming.getBoundingClientRect().top > mid);
    if (returnLight && returnLight.getBoundingClientRect().top < vh * 0.7) { on = true; if (!celBack) { celBack = true; returnLight.classList.add('is-lit'); } }
    if (lampRetired) on = false;
    if (!introOpen || intro.classList.contains('is-check')) html.classList.toggle('cel-on', !!on);

    // anthem level: quiet early, full as Chapter V arrives, then settles
    var Q = $('#quiet');
    if (Q && PK) {
      var qTop = Q.getBoundingClientRect().top, pTop = PK.getBoundingClientRect().top, pBot = PK.getBoundingClientRect().bottom;
      if (qTop > mid) anthemTarget = 0.42;
      else if (pTop > mid * 0.6) anthemTarget = 0.42 + 0.48 * clamp((mid - qTop) / Math.max(1, (mid - qTop) + (pTop - mid * 0.6)), 0, 1);
      else if (pBot > 0) anthemTarget = 0.9;
      else anthemTarget = 0.62;
    }

    // map
    if (N && !RM) {
      var tr = $('.roads__track');
      var r = tr.getBoundingClientRect();
      var len = Math.max(1, r.height - (vh - sh));
      var prog = clamp((sh - r.top) / len, 0, 1);
      var steps = prog * (N + 1) - 0.15;
      var fr2 = [];
      for (var i = 0; i < N; i++) { var f = clamp((steps - i) / 0.7, 0, 1); fr2.push(f * f * (3 - 2 * f)); }
      paintTrips(fr2, steps >= N ? -1 : clamp(Math.floor(steps), 0, N - 1));
    }

    // sequence
    if (SEQ_LIVE) {
      var st = $('#seq-track').getBoundingClientRect();
      var sl = Math.max(1, st.height - (vh - sh));
      var sp = clamp((sh - st.top) / sl, 0, 0.9999);
      if (st.top < vh) showSeq(Math.floor(sp * seqItems.length));
    }

    parallax(vh);
  }
  function requestTick() { if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); } }
  window.addEventListener('scroll', requestTick, { passive: true });
  window.addEventListener('resize', requestTick);
  window.addEventListener('load', requestTick);
  onScroll();
  if (SEQ_LIVE && seqIdx < 0) showSeq(0);

  /* ---------- Ledger count-up ---------- */
  function fmtCount(span, val) {
    var dec = +(span.getAttribute('data-dec') || 0);
    var s = dec ? val.toFixed(dec) : Math.round(val).toString();
    if (span.hasAttribute('data-sep')) s = Number(s).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    return (span.getAttribute('data-prefix') || '') + s;
  }
  var counters = $$('[data-count]');
  if (!RM && 'IntersectionObserver' in window && counters.length) {
    counters.forEach(function (s) { s.textContent = fmtCount(s, 0); });
    var ledIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        ledIO.unobserve(en.target);
        var s = en.target, target = +s.getAttribute('data-count'), t0 = null, dur = 2200;
        var step = function (ts) {
          if (t0 === null) t0 = ts;
          var k = clamp((ts - t0) / dur, 0, 1);
          s.textContent = fmtCount(s, target * easeOut(k));
          if (k < 1) window.requestAnimationFrame(step); else s.textContent = fmtCount(s, target);
        };
        window.requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (s) { ledIO.observe(s); });
  }

  /* ---------- Price in Corollas ---------- */
  var price = $('#price'), out = $('#corollas-out'), cars = $('#corollas-cars');
  function carMarkup(fill, k) {
    return '<span class="car' + (RM ? '' : ' car-in') + '" style="animation-delay:' + Math.min(k * 25, 900) + 'ms">' +
      '<svg viewBox="0 0 64 26"><use href="#i-car"/></svg>' +
      '<span class="fill" style="width:' + (fill * 100).toFixed(1) + '%"><svg viewBox="0 0 64 26"><use href="#i-car"/></svg></span></span>';
  }
  function corollas() {
    var raw = (price.value || '').replace(/[$,\s]/g, '');
    var n = parseFloat(raw);
    if (!raw || isNaN(n) || n <= 0) { out.textContent = ''; cars.innerHTML = ''; return; }
    var c = n / 1200;
    var shown = c.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    out.textContent = "That's " + shown + ' ' + (shown === '1.0' ? 'Corolla' : 'Corollas') + '.';
    var whole = Math.floor(c), part = c - whole, cap = 60, h = '';
    for (var i = 0; i < Math.min(whole, cap); i++) h += carMarkup(1, i);
    if (whole < cap && part > 0.01) h += carMarkup(part, whole);
    if (whole > cap) h += '<span class="corollas__more">+ ' + (whole - cap).toLocaleString('en-US') + ' more</span>';
    cars.innerHTML = h;
  }
  if (price) {
    price.addEventListener('input', corollas);
    $('#corollas-form').addEventListener('submit', function (e) { e.preventDefault(); corollas(); });
    price.value = '4,800';
    corollas();
  }


  /* ---------- Anthem: only on a click, always with an off switch; its level follows the story ---------- */
  var audio = $('#anthem');
  var sw = $('#anthem-switch'), invite = $('#anthem-invite');
  var fadeTimer = null, playing = false, fading = false;
  function fadeTo(target, ms, done) {
    clearInterval(fadeTimer);
    fading = true;
    var start = audio.volume, t0 = Date.now();
    fadeTimer = setInterval(function () {
      var k = clamp((Date.now() - t0) / ms, 0, 1);
      var e = k * k * (3 - 2 * k);
      audio.volume = clamp(start + ((typeof target === 'function' ? target() : target) - start) * e, 0, 1);
      if (k >= 1) { clearInterval(fadeTimer); fading = false; if (done) done(); }
    }, 40);
  }
  setInterval(function () {
    if (!playing || fading || !audio) return;
    var d = anthemTarget - audio.volume;
    if (Math.abs(d) > 0.005) audio.volume = clamp(audio.volume + d * 0.04, 0, 1);
  }, 100);
  function setAnthem(on) {
    playing = on;
    sw.setAttribute('aria-pressed', on ? 'true' : 'false');
    $('.anthem-switch__state', sw).textContent = on ? 'on' : 'off';
    if (invite) invite.textContent = on ? 'Stop the anthem' : 'Play the anthem';
    if (on) {
      audio.volume = 0;
      var pr = audio.play();
      if (pr && pr.catch) pr.catch(function () { setAnthem(false); });
      fadeTo(function () { return anthemTarget; }, RM ? 400 : 3200);
    } else {
      fadeTo(0, RM ? 400 : 1800, function () { if (!playing) audio.pause(); });
    }
  }
  if (audio && sw) {
    sw.addEventListener('click', function () { setAnthem(!playing); });
    if (invite) invite.addEventListener('click', function () { setAnthem(!playing); });
  }

  /* ---------- Honk once ---------- */
  var honkBtn = $('#honk'), honkN = $('#honk-n');
  var KEY = 'beige-stallion-honks';
  var honks = parseInt(store(KEY) || '0', 10) || 0;
  var ac = null;
  function showHonks() { honkN.textContent = honks.toLocaleString('en-US'); var w = $('#honk-word'); if (w) w.textContent = honks === 1 ? 'honk' : 'honks'; }
  function horn() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!ac) ac = new AC();
    if (ac.state === 'suspended') ac.resume();
    var t = ac.currentTime + 0.01;
    var master = ac.createGain();
    master.gain.setValueAtTime(0.0001, t);
    master.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
    master.gain.setValueAtTime(0.22, t + 0.38);
    master.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    var lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400; lp.Q.value = 0.7;
    var body = ac.createBiquadFilter(); body.type = 'peaking'; body.frequency.value = 950; body.gain.value = 9; body.Q.value = 1.2;
    lp.connect(body); body.connect(master); master.connect(ac.destination);
    [[405, 'sawtooth'], [508, 'sawtooth'], [404, 'square']].forEach(function (o) {
      var osc = ac.createOscillator();
      var g = ac.createGain();
      osc.type = o[1]; osc.frequency.setValueAtTime(o[0], t);
      osc.frequency.linearRampToValueAtTime(o[0] * 0.985, t + 0.5);
      g.gain.value = o[1] === 'square' ? 0.12 : 0.3;
      osc.connect(g); g.connect(lp);
      osc.start(t); osc.stop(t + 0.55);
    });
  }
  if (honkBtn) {
    showHonks();
    honkBtn.addEventListener('click', function () {
      horn();
      honks += 1; store(KEY, String(honks)); showHonks();
      if (!RM) {
        var fm = $('#farewell-media');
        fm.classList.add('flash');
        honkBtn.classList.add('is-pressed');
        setTimeout(function () { fm.classList.remove('flash'); honkBtn.classList.remove('is-pressed'); }, 220);
      }
      // the last beat: the amber lamp in the top bar goes out, quietly, for the last time
      if (!lampRetired) {
        lampRetired = true;
        setTimeout(function () {
          html.classList.add('lamp-retired');
          html.classList.remove('cel-on');
          var last = $('#last-line');
          if (last) { last.hidden = false; window.requestAnimationFrame(function () { last.classList.add('is-shown'); }); }
        }, RM ? 0 : 1600);
      }
    });
  }

  /* ---------- Lightbox ---------- */
  var lb = $('#lightbox'), lbImg = $('#lb-img'), lbCap = $('#lb-cap');
  var lbReturn = null;
  function openLightbox(stem) {
    var p = D.photos[stem];
    if (!p || !lb) return;
    lbReturn = document.activeElement;
    lbImg.src = 'img/' + (p.full ? 'full' : 'l') + '/' + stem + '.jpg';
    lbImg.alt = p.alt;
    lbCap.innerHTML = '<time>' + esc(p.d) + '</time> ' + esc(p.cap);
    if (typeof lb.showModal === 'function') lb.showModal(); else lb.setAttribute('open', '');
    $('#lb-close').focus();
  }
  function closeLightbox() { if (lb.open) { if (lb.close) lb.close(); else lb.removeAttribute('open'); } }
  if (lb) {
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-lb]');
      if (b) openLightbox(b.getAttribute('data-lb'));
    });
    $('#lb-close').addEventListener('click', closeLightbox);
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target.tagName === 'FIGURE') closeLightbox(); });
    lb.addEventListener('close', function () { lbImg.removeAttribute('src'); if (lbReturn && lbReturn.focus) lbReturn.focus({ preventScroll: true }); });
  }
})();
