/* Ogrodnictwo Małgorzata Łuczak – interakcje strony */
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
  window.addEventListener('scroll', updateActiveNav, { passive: true });
  window.addEventListener('resize', updateActiveNav);
  updateActiveNav();

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
    'new': function (a, b) { return (b.dataset['new'] - a.dataset['new']) || byName(a, b); },
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
    document.getElementById('results-count').textContent = visible + ' z ' + total + ' ' + plural(total, 'pozycji', 'pozycji', 'pozycji');
    document.getElementById('filters-summary').textContent = visible + ' ' + plural(visible, 'odmiana', 'odmiany', 'odmian');

    var active = 0;
    if (state.size !== 'all') active++;
    if (state.color) active++;
    if (state.shape !== 'all') active++;
    Array.prototype.forEach.call(purposeInputs, function (i) { if (!i.checked) active++; });
    document.getElementById('active-filters-badge').textContent = active + ' ' + plural(active, 'aktywny', 'aktywne', 'aktywnych');

    updateCounts();
  }

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
        .map(function (e) { return e.target; })
        .sort(function (a, b) {
          var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
          return (ra.top - rb.top) || (ra.left - rb.left);
        });
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
