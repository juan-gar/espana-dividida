(function () {
  'use strict';

  var BOOK = window.BOOK;
  var view = document.getElementById('view');
  var toc = document.getElementById('toc');
  var results = document.getElementById('results');
  var searchInput = document.getElementById('searchInput');
  var progress = document.getElementById('progress');
  var topTitle = document.getElementById('topTitle');
  var current = null; // index of the chapter on screen, or null on the home page

  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  function esc(s) {
    return s.replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function fold(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  function wordCount(ch) {
    var n = 0;
    ch.sections.forEach(function (s) {
      s.paragraphs.forEach(function (p) { n += p.split(/\s+/).length; });
    });
    return n;
  }

  function minutes(ch) { return Math.max(1, Math.round(wordCount(ch) / 230)) + ' min'; }

  // ---------- table of contents ----------
  function buildToc() {
    toc.innerHTML = BOOK.chapters.map(function (ch, i) {
      var secs = ch.sections.filter(function (s) { return s.title; }).map(function (s) {
        return '<li><a href="#' + s.id + '" data-sec="' + s.id + '">' + esc(s.title) + '</a></li>';
      }).join('');
      return '<div class="toc-chapter" data-ch="' + i + '">' +
        '<a href="#' + ch.id + '"><span class="toc-label">' + esc(ch.label) + '</span>' +
        '<span class="toc-name">' + esc(ch.title.replace(/^Introducción: /, '')) + '</span></a>' +
        '<ul class="toc-sections">' + secs + '</ul></div>';
    }).join('');
  }

  function markToc() {
    toc.querySelectorAll('.toc-chapter').forEach(function (el) {
      el.classList.toggle('active', Number(el.dataset.ch) === current);
    });
  }

  // ---------- views ----------
  function renderHome() {
    current = null;
    document.title = BOOK.title;
    topTitle.textContent = '';
    var last = store.get('epd-last');
    var lastCh = last && BOOK.chapters.filter(function (c) { return c.id === last; })[0];
    view.innerHTML =
      '<section class="home">' +
      '<div class="home-kicker">Lector</div>' +
      '<h1 class="home-title">' + esc(BOOK.title) + '</h1>' +
      '<p class="home-sub">' + esc(BOOK.subtitle) + '</p>' +
      '<div class="home-author">' + esc(BOOK.author) + '</div>' +
      '<div class="home-actions">' +
      (lastCh ? '<a class="btn primary" href="#' + lastCh.id + '">Continuar: ' + esc(lastCh.label) + '</a>' +
        '<a class="btn" href="#' + BOOK.chapters[0].id + '">Empezar desde el principio</a>'
        : '<a class="btn primary" href="#' + BOOK.chapters[0].id + '">Empezar a leer</a>') +
      '</div>' +
      '<ol class="chapter-list">' + BOOK.chapters.map(function (ch, i) {
        var secs = ch.sections.filter(function (s) { return s.title; }).map(function (s) { return esc(s.title); }).join(' · ');
        return '<li><a href="#' + ch.id + '">' +
          '<span class="cl-num">' + i + '</span>' +
          '<span class="cl-title">' + esc(ch.title) + '<span class="cl-secs">' + secs + '</span></span>' +
          '<span class="cl-time">' + minutes(ch) + '</span></a></li>';
      }).join('') + '</ol>' +
      '<p class="home-note">Texto obtenido por reconocimiento óptico (OCR) de los PDF escaneados. ' +
      'Las llamadas a notas se han eliminado. La última página de los capítulos 1 a 4 aparece ' +
      'ilegible en los PDF originales y no se ha podido recuperar.</p>' +
      '</section>';
    markToc();
    window.scrollTo(0, 0);
    onScroll();
  }

  function leadIn(text) {
    var m = text.match(/^([A-ZÁÉÍÓÚÑ])([A-ZÁÉÍÓÚÑ]*(?:\s+[A-ZÁÉÍÓÚÑ]{1,})*)(\s)/);
    if (!m) return esc(text);
    return '<span class="dropcap">' + m[1] + '</span><span class="smallcaps">' +
      esc(m[2].toLowerCase()) + '</span>' + esc(text.slice(m[1].length + m[2].length));
  }

  function renderChapter(i) {
    var ch = BOOK.chapters[i];
    current = i;
    document.title = ch.title + ' · ' + BOOK.title;
    var html = '<article class="chapter">' +
      '<div class="chapter-label">' + esc(ch.label) + '</div>' +
      '<h1 class="chapter-title">' + esc(ch.title.replace(/^Introducción: /, '')) + '</h1>' +
      '<div class="chapter-meta">' + esc(BOOK.title) + ' · ' + minutes(ch) + ' de lectura</div>' +
      '<hr class="chapter-rule">';
    var n = 0;
    ch.sections.forEach(function (s) {
      if (s.title) html += '<h2 id="' + s.id + '">' + esc(s.title) + '</h2>';
      s.paragraphs.forEach(function (p) {
        var first = n === 0;
        html += '<p id="' + ch.id + '-p' + n + '"' + (first ? ' class="lead"' : '') + '>' +
          (first ? leadIn(p) : esc(p)) + '</p>';
        n++;
      });
    });
    if (ch.truncated) {
      html += '<div class="truncated">La última página de este capítulo aparece borrosa en el PDF ' +
        'original y no se ha podido transcribir; el texto termina aquí.</div>';
    }
    var prev = BOOK.chapters[i - 1], next = BOOK.chapters[i + 1];
    html += '<nav class="pager">' +
      (prev ? '<a class="prev" href="#' + prev.id + '"><small>← Anterior</small><span>' + esc(prev.title) + '</span></a>' : '') +
      (next ? '<a class="next" href="#' + next.id + '"><small>Siguiente →</small><span>' + esc(next.title) + '</span></a>' : '') +
      '</nav></article>';
    view.innerHTML = html;
    markToc();
    store.set('epd-last', ch.id);
  }

  // ---------- routing ----------
  function route() {
    var hash = decodeURIComponent(location.hash.slice(1));
    var m = hash.match(/^cap-(\d+)/);
    closeNav();
    if (!m || !BOOK.chapters[Number(m[1])]) { renderHome(); return; }
    var i = Number(m[1]);
    if (current !== i || !view.querySelector('.chapter')) renderChapter(i);
    var target = hash === BOOK.chapters[i].id ? null : document.getElementById(hash);
    if (target) {
      target.scrollIntoView();
      if (target.tagName === 'P') {
        target.classList.remove('flash');
        void target.offsetWidth;
        target.classList.add('flash');
      }
    } else {
      window.scrollTo(0, 0);
    }
    onScroll();
  }

  // ---------- scroll: progress bar + current section ----------
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (current === null || max <= 0 ? 0 : Math.min(100, window.scrollY / max * 100)) + '%';
      if (current === null) return;
      var ch = BOOK.chapters[current];
      var heads = view.querySelectorAll('h2[id]');
      var active = null;
      for (var k = 0; k < heads.length; k++) {
        if (heads[k].getBoundingClientRect().top < 140) active = heads[k];
      }
      toc.querySelectorAll('.toc-sections a').forEach(function (a) {
        a.classList.toggle('current', !!active && a.dataset.sec === active.id);
      });
      topTitle.textContent = ch.label + ' · ' + ch.title.replace(/^Introducción: /, '') +
        (active ? ' — ' + active.textContent : '');
    });
  }

  // ---------- search ----------
  var index = [];
  BOOK.chapters.forEach(function (ch, i) {
    var n = 0;
    ch.sections.forEach(function (s) {
      s.paragraphs.forEach(function (p) {
        index.push({ ch: i, id: ch.id + '-p' + n, text: p, folded: fold(p), section: s.title });
        n++;
      });
    });
  });

  function highlight(text, q) {
    // fold() keeps string length for Spanish text, so offsets map back to the original
    var f = fold(text), out = '', from = 0, at;
    while ((at = f.indexOf(q, from)) !== -1) {
      out += esc(text.slice(from, at)) + '<mark>' + esc(text.slice(at, at + q.length)) + '</mark>';
      from = at + q.length;
    }
    return out + esc(text.slice(from));
  }

  function search(raw) {
    var q = fold(raw.trim());
    if (q.length < 3) {
      results.hidden = true; toc.hidden = false; results.innerHTML = '';
      clearMarks();
      return;
    }
    var hits = index.filter(function (e) { return e.folded.indexOf(q) !== -1; });
    var html = '<div class="results-count">' + hits.length + (hits.length === 1 ? ' resultado' : ' resultados') + '</div>';
    html += hits.slice(0, 150).map(function (e) {
      var at = e.folded.indexOf(q);
      var start = Math.max(0, at - 70), end = Math.min(e.text.length, at + q.length + 90);
      var snippet = (start > 0 ? '…' : '') + e.text.slice(start, end) + (end < e.text.length ? '…' : '');
      var ch = BOOK.chapters[e.ch];
      return '<button class="result" data-id="' + e.id + '">' +
        '<div class="result-where">' + esc(ch.label) + (e.section ? ' · ' + esc(e.section) : '') + '</div>' +
        '<div class="result-text">' + highlight(snippet, q) + '</div></button>';
    }).join('');
    results.innerHTML = html;
    results.hidden = false; toc.hidden = true;
  }

  function clearMarks() {
    view.querySelectorAll('p[data-marked]').forEach(function (p) {
      p.innerHTML = p.dataset.marked;
      delete p.dataset.marked;
    });
  }

  results.addEventListener('click', function (ev) {
    var btn = ev.target.closest('.result');
    if (!btn) return;
    var id = btn.dataset.id;
    if (location.hash === '#' + id) route(); else location.hash = id;
    var p = document.getElementById(id);
    var q = fold(searchInput.value.trim());
    if (p && q.length >= 3 && !p.classList.contains('lead')) {
      clearMarks();
      p.dataset.marked = p.innerHTML;
      p.innerHTML = highlight(p.textContent, q);
    }
  });

  var searchTimer;
  searchInput.addEventListener('input', function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () { search(searchInput.value); }, 120);
  });
  searchInput.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') { searchInput.value = ''; search(''); }
  });

  // ---------- nav drawer, font size, theme ----------
  var menuBtn = document.getElementById('menuBtn');
  function closeNav() { document.body.classList.remove('nav-open'); menuBtn.setAttribute('aria-expanded', 'false'); }
  menuBtn.addEventListener('click', function () {
    var open = document.body.classList.toggle('nav-open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  document.getElementById('scrim').addEventListener('click', closeNav);
  document.querySelector('.book-title').addEventListener('click', function () { location.hash = ''; });

  function fontSize() { return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fs')) || 19; }
  function setFont(px) {
    px = Math.max(15, Math.min(26, px));
    document.documentElement.style.setProperty('--fs', px + 'px');
    store.set('epd-font', String(px));
  }
  document.getElementById('fontDown').addEventListener('click', function () { setFont(fontSize() - 1); });
  document.getElementById('fontUp').addEventListener('click', function () { setFont(fontSize() + 1); });

  var themes = ['light', 'sepia', 'dark'];
  document.getElementById('themeBtn').addEventListener('click', function () {
    var cur = document.documentElement.getAttribute('data-theme');
    if (!cur) cur = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    var next = themes[(themes.indexOf(cur) + 1) % themes.length];
    document.documentElement.setAttribute('data-theme', next);
    store.set('epd-theme', next);
  });

  document.addEventListener('keydown', function (ev) {
    if (current === null || ev.target.tagName === 'INPUT' || ev.metaKey || ev.ctrlKey || ev.altKey) return;
    if (ev.key === 'ArrowRight' && BOOK.chapters[current + 1]) location.hash = BOOK.chapters[current + 1].id;
    if (ev.key === 'ArrowLeft' && BOOK.chapters[current - 1]) location.hash = BOOK.chapters[current - 1].id;
  });

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  window.addEventListener('hashchange', route);

  buildToc();
  route();
})();
