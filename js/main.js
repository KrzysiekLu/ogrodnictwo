/* Ogrodnictwo Łuczak – interakcje strony */
(function () {
  'use strict';

  /* ---------- Polska odmiana liczebników ---------- */
  function plural(n, one, few, many) {
    if (n === 1) return one;
    var n10 = n % 10, n100 = n % 100;
    if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
    return many;
  }

  /* ---------- Menu mobilne ---------- */
  var burger = document.querySelector('.header__burger');
  var mobileNav = document.getElementById('mobile-nav');

  function setMobileNav(open) {
    mobileNav.hidden = !open;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Zamknij menu' : 'Otwórz menu');
    burger.querySelector('.ms').textContent = open ? 'close' : 'menu';
  }
  burger.addEventListener('click', function () { setMobileNav(mobileNav.hidden); });
  mobileNav.addEventListener('click', function (e) {
    if (e.target.closest('a')) setMobileNav(false);
  });

  /* ---------- Podświetlanie aktywnej sekcji w menu ---------- */
  var navLinks = document.querySelectorAll('[data-section]');
  var sectionIds = ['katalog', 'hurt', 'dojazd', 'kontakt'];
  var sections = sectionIds.map(function (id) { return document.getElementById(id); });

  function updateActiveNav() {
    var probe = 80 + window.innerHeight * 0.3;
    var current = null;
    sections.forEach(function (sec) {
      if (sec.getBoundingClientRect().top <= probe) current = sec.id;
    });
    // Na samym dole strony zawsze zaznacz „Kontakt”
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = 'kontakt';
    navLinks.forEach(function (link) {
      link.classList.toggle('is-active', link.getAttribute('data-section') === current);
    });
  }
  var navTicking = false;
  function scheduleActiveNav() {
    if (navTicking) return;
    navTicking = true;
    requestAnimationFrame(function () { navTicking = false; updateActiveNav(); });
  }
  window.addEventListener('scroll', scheduleActiveNav, { passive: true });
  window.addEventListener('resize', scheduleActiveNav);
  requestAnimationFrame(updateActiveNav);

  /* ---------- Katalog: filtry i sortowanie ---------- */
  var productsEl = document.getElementById('products');
  var products = Array.prototype.slice.call(productsEl.querySelectorAll('.product'));
  var emptyEl = document.getElementById('products-empty');
  var sortSelect = document.getElementById('sort-select');
  var purposeInputs = document.querySelectorAll('input[name="purpose"]');

  var state = { size: 'all', color: null, shape: 'all' };

  // Atrybuty mogą mieć kilka wartości oddzielonych spacją (np. odmiany dwubarwne: data-color="czerwony zolty")
  function has(p, key, value) {
    return (p.dataset[key] || '').split(' ').indexOf(value) !== -1;
  }

  function matches(p, ignoreKey) {
    if (ignoreKey !== 'size' && state.size !== 'all' && !has(p, 'size', state.size)) return false;
    if (ignoreKey !== 'color' && state.color && !has(p, 'color', state.color)) return false;
    if (ignoreKey !== 'shape' && state.shape !== 'all' && !has(p, 'shape', state.shape)) return false;
    var d = p.dataset;
    var purposes = d.purpose.split(' ');
    var anyPurpose = Array.prototype.some.call(purposeInputs, function (i) {
      return i.checked && purposes.indexOf(i.value) !== -1;
    });
    return anyPurpose;
  }

  // Liczniki przy opcjach pokazują, ile odmian będzie widocznych po wybraniu danej opcji
  function updateCounts() {
    document.querySelectorAll('[data-count-for]').forEach(function (el) {
      var parts = el.getAttribute('data-count-for').split(':');
      var key = parts[0], value = parts[1];
      var n = products.filter(function (p) {
        if (!matches(p, key)) return false;
        return value === 'all' || has(p, key, value);
      }).length;
      el.textContent = n + (el.getAttribute('data-suffix') || '');
    });
  }

  var sizeRank = { drobnokwiatowa: 1, sredniokwiatowa: 2, wielkokwiatowa: 3 };
  function byName(a, b) { return a.dataset.order - b.dataset.order; }
  var sorters = {
    'default': byName,
    size: function (a, b) { return (sizeRank[a.dataset.size] - sizeRank[b.dataset.size]) || byName(a, b); },
    'size-desc': function (a, b) { return (sizeRank[b.dataset.size] - sizeRank[a.dataset.size]) || byName(a, b); }
  };

  function render() {
    var sorted = products.slice().sort(sorters[sortSelect.value] || sorters['default']);
    var visible = 0;
    sorted.forEach(function (p) {
      var show = matches(p);
      p.hidden = !show;
      if (show) visible++;
      productsEl.appendChild(p);
    });

    productsEl.hidden = visible === 0;
    emptyEl.hidden = visible !== 0;

    var total = products.length;
    document.getElementById('results-count').textContent = visible + ' z ' + total + ' ' + plural(total, 'wariant', 'warianty', 'wariantów');
    document.getElementById('filters-summary').textContent = visible + ' ' + plural(visible, 'wariant', 'warianty', 'wariantów');

    var active = 0;
    if (state.size !== 'all') active++;
    if (state.color) active++;
    if (state.shape !== 'all') active++;
    Array.prototype.forEach.call(purposeInputs, function (i) { if (!i.checked) active++; });
    document.getElementById('active-filters-badge').textContent = active + ' ' + plural(active, 'aktywny', 'aktywne', 'aktywnych');

    updateCounts();
    updateAccValues();
    carouselReset();
  }

  document.querySelectorAll('.filter-acc').forEach(function (d) {
    var summary = d.querySelector('summary');
    var anim = null;
    summary.addEventListener('click', function (e) {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      e.preventDefault();
      var opening = !d.open;
      var startH = d.offsetHeight;
      if (anim) anim.cancel();
      d.style.overflow = 'hidden';
      if (opening) d.open = true;
      var endH = opening ? d.scrollHeight : summary.offsetHeight + 4;
      if (!opening) d.classList.add('is-closing');
      anim = d.animate({ height: [startH + 'px', endH + 'px'] }, { duration: 280, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' });
      anim.onfinish = function () {
        d.open = opening;
        d.classList.remove('is-closing');
        d.style.overflow = '';
        anim = null;
      };
      anim.oncancel = function () { d.style.overflow = ''; d.classList.remove('is-closing'); };
    });
  });

  function updateAccValues() {
    function activeText(group, selector) {
      var el = document.querySelector('[data-filter="' + group + '"] ' + selector + '.is-active');
      return el ? el.textContent.replace(/\s+\d+.*$/, '').trim() : '';
    }
    var size = state.size === 'all' ? 'Wszystkie' : activeText('size', '.size-option__main');
    var color = state.color ? activeText('color', '.color-option__name') : 'Wszystkie';
    var shape = state.shape === 'all' ? 'Wszystkie' : activeText('shape', '.pot-option');
    var checked = Array.prototype.filter.call(purposeInputs, function (i) { return i.checked; });
    var purpose = checked.length === purposeInputs.length ? 'Wszystkie'
      : checked.length === 0 ? 'Brak'
      : checked[0].value === 'hurt' ? 'Hurt' : 'Detal';
    var values = { size: size, color: color, shape: shape, purpose: purpose };
    document.querySelectorAll('[data-current]').forEach(function (el) {
      el.textContent = values[el.getAttribute('data-current')];
    });
  }

  /* ---------- Karuzela katalogu ---------- */
  var carouselPrev = document.getElementById('carousel-prev');
  var carouselNext = document.getElementById('carousel-next');

  function updateCarouselNav() {
    var max = productsEl.scrollWidth - productsEl.clientWidth - 2;
    var none = productsEl.hidden || max <= 0;
    carouselPrev.disabled = none || productsEl.scrollLeft <= 2;
    carouselNext.disabled = none || productsEl.scrollLeft >= max;
  }
  var carouselQueued = false;
  function carouselReset() {
    if (carouselQueued) return;
    carouselQueued = true;
    requestAnimationFrame(function () {
      carouselQueued = false;
      productsEl.style.scrollBehavior = 'auto';
      productsEl.scrollLeft = 0;
      productsEl.style.scrollBehavior = '';
      updateCarouselNav();
    });
  }
  function carouselStep(dir) {
    productsEl.scrollBy({ left: dir * productsEl.clientWidth, behavior: 'smooth' });
  }
  carouselPrev.addEventListener('click', function () { carouselStep(-1); });
  carouselNext.addEventListener('click', function () { carouselStep(1); });
  productsEl.addEventListener('scroll', updateCarouselNav, { passive: true });
  window.addEventListener('resize', updateCarouselNav);
  productsEl.addEventListener('keydown', function (e) {
    if (e.target !== productsEl) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); carouselStep(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); carouselStep(-1); }
  });

  function syncButtons() {
    document.querySelectorAll('[data-filter]').forEach(function (group) {
      var key = group.getAttribute('data-filter');
      group.querySelectorAll('[data-value]').forEach(function (btn) {
        var on = btn.getAttribute('data-value') === (state[key] || '');
        btn.classList.toggle('is-active', on);
        btn.setAttribute('aria-pressed', String(on));
      });
    });
  }

  document.querySelectorAll('[data-filter]').forEach(function (group) {
    var key = group.getAttribute('data-filter');
    group.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-value]');
      if (!btn) return;
      var value = btn.getAttribute('data-value');
      if (key === 'color') {
        state.color = state.color === value ? null : value; // ponowne kliknięcie odznacza kolor
      } else {
        state[key] = value;
      }
      syncButtons();
      render();
    });
  });

  Array.prototype.forEach.call(purposeInputs, function (i) { i.addEventListener('change', render); });
  sortSelect.addEventListener('change', render);

  function resetFilters() {
    state = { size: 'all', color: null, shape: 'all' };
    Array.prototype.forEach.call(purposeInputs, function (i) { i.checked = true; });
    syncButtons();
    render();
  }
  document.getElementById('filters-reset').addEventListener('click', resetFilters);
  document.querySelectorAll('[data-reset-filters]').forEach(function (b) { b.addEventListener('click', resetFilters); });

  // „Zastosuj filtry” – filtry działają od razu, przycisk przewija do wyników (przydatne na telefonie)
  document.getElementById('filters-apply').addEventListener('click', function () {
    var target = document.getElementById('catalog-results');
    var top = target.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top: top, behavior: 'smooth' });
  });

  syncButtons();
  render();

  /* ---------- Pojawianie się elementów przy przewijaniu ---------- */
  var revealSelector = [
    '.hero__content > *', '.advantage', '.catalog-head', '.filters', '.toolbar', '.product',
    '.b2b__head', '.tile', '.callout', '.retail-head', '.retail .card', '.footer__col', '.footer__bottom'
  ].join(',');
  var revealEls = document.querySelectorAll(revealSelector);
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function finishReveal(el) {
    el.classList.remove('is-revealing');
    el.style.transitionDelay = '';
  }

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('is-revealed'); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      // Elementy wchodzące na ekran jednocześnie pojawiają się kolejno (od góry, od lewej)
      var batch = entries
        .filter(function (e) { return e.isIntersecting; })
        .sort(function (a, b) {
          var ra = a.boundingClientRect, rb = b.boundingClientRect;
          return (ra.top - rb.top) || (ra.left - rb.left);
        })
        .map(function (e) { return e.target; });
      batch.forEach(function (el, i) {
        revealObserver.unobserve(el);
        var delay = Math.min(i, 5) * 90;
        el.style.transitionDelay = delay + 'ms';
        el.classList.add('is-revealing', 'is-revealed');
        el.addEventListener('transitionend', function onEnd(ev) {
          if (ev.target !== el || ev.propertyName !== 'opacity') return;
          el.removeEventListener('transitionend', onEnd);
          finishReveal(el);
        });
        setTimeout(function () { finishReveal(el); }, 700 + delay + 200);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ---------- Galeria odmiany (modal) ---------- */
  // Dodatkowe zdjęcia: img/odmiany/<nazwa-zdjecia-glownego>/1.webp, 2.webp, ... (do 12, wykrywane automatycznie)
  var GALLERY_MAX = 12;
  var gallery = document.getElementById('gallery');
  var gImg = document.getElementById('gallery-img');
  var gPrev = document.getElementById('gallery-prev');
  var gNext = document.getElementById('gallery-next');
  var gCount = document.getElementById('gallery-count');
  var gThumbs = document.getElementById('gallery-thumbs');
  var gTitle = document.getElementById('gallery-title');
  var gState = { imgs: [], i: 0, title: '', token: 0 };
  var gCache = {};

  function showSlide(i) {
    var n = gState.imgs.length;
    gState.i = (i + n) % n;
    gImg.src = gState.imgs[gState.i];
    gImg.alt = gState.title + ' – zdjęcie ' + (gState.i + 1) + ' z ' + n;
    gCount.textContent = (gState.i + 1) + ' / ' + n;
    Array.prototype.forEach.call(gThumbs.children, function (t, idx) {
      t.classList.toggle('is-active', idx === gState.i);
      t.setAttribute('aria-current', String(idx === gState.i));
    });
  }

  function renderGalleryControls() {
    var multi = gState.imgs.length > 1;
    gPrev.hidden = gNext.hidden = gCount.hidden = gThumbs.hidden = !multi;
    gThumbs.innerHTML = '';
    if (!multi) return;
    gState.imgs.forEach(function (src, idx) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'gallery__thumb';
      b.setAttribute('aria-label', 'Pokaż zdjęcie ' + (idx + 1));
      var im = document.createElement('img');
      im.src = src; im.alt = ''; im.loading = 'lazy';
      b.appendChild(im);
      b.addEventListener('click', function () { showSlide(idx); });
      gThumbs.appendChild(b);
    });
  }

  function probeExtras(slug, token, imgs, done) {
    var n = 1;
    (function next() {
      if (token !== gState.token) return;
      if (n > GALLERY_MAX) { done(); return; }
      var src = 'img/odmiany/' + slug + '/' + n + '.webp';
      var probe = new Image();
      probe.onload = function () {
        if (token !== gState.token) return;
        imgs.push(src);
        n++;
        var cur = gState.i;
        renderGalleryControls();
        showSlide(cur);
        next();
      };
      probe.onerror = function () { done(); };
      probe.src = src;
    })();
  }

  function openGallery(p) {
    var main = p.querySelector('.product__media img').getAttribute('src');
    var slug = main.replace(/^.*\//, '').replace(/\.[^.]+$/, '');
    gState.title = p.querySelector('.product__title').textContent;
    gState.token++;
    gTitle.textContent = gState.title;

    var cached = gCache[slug];
    gState.imgs = cached ? cached.imgs : [main];
    renderGalleryControls();
    showSlide(0);
    if (!gallery.open) gallery.showModal();
    gallery.querySelector('.gallery__close').focus();

    if (!cached) {
      var imgs = gState.imgs;
      probeExtras(slug, gState.token, imgs, function () { gCache[slug] = { imgs: imgs }; });
    }
  }

  products.forEach(function (p) {
    var media = p.querySelector('.product__media');
    var name = p.querySelector('.product__title').textContent;
    media.setAttribute('tabindex', '0');
    media.setAttribute('role', 'button');
    media.setAttribute('aria-label', 'Zobacz zdjęcia odmiany ' + name);
    media.classList.add('is-clickable');
    p.querySelector('.product__title').classList.add('is-clickable');
    p.addEventListener('click', function (e) {
      if (e.target.closest('a')) return;
      if (e.target.closest('.product__media, .product__title')) openGallery(p);
    });
    media.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openGallery(p); }
    });
  });

  gPrev.addEventListener('click', function () { showSlide(gState.i - 1); });
  gNext.addEventListener('click', function () { showSlide(gState.i + 1); });
  document.getElementById('gallery-close').addEventListener('click', function () { gallery.close(); });
  gallery.addEventListener('click', function (e) { if (e.target === gallery) gallery.close(); });
  gallery.addEventListener('close', function () { gState.token++; });
  gallery.addEventListener('keydown', function (e) {
    if (gState.imgs.length < 2) return;
    if (e.key === 'ArrowLeft') showSlide(gState.i - 1);
    if (e.key === 'ArrowRight') showSlide(gState.i + 1);
  });

  /* ---------- Pływający przycisk kontaktu ---------- */
  var fab = document.getElementById('fab');
  var fabBtn = document.getElementById('fab-btn');

  function setFab(open) {
    fab.classList.toggle('is-open', open);
    fabBtn.setAttribute('aria-expanded', String(open));
  }
  fabBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    setFab(!fab.classList.contains('is-open'));
  });
  document.addEventListener('click', function (e) {
    if (!fab.contains(e.target)) setFab(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      setFab(false);
      if (!mobileNav.hidden) setMobileNav(false);
    }
  });
})();
