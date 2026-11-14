// Simple gallery for LionPhotos: reads window.LIONPHOTOS_EXPORT (data.js) and draws every collection.
(function () {
  'use strict';
  var data = window.LIONPHOTOS_EXPORT || { collections: [] };
  var opts = data.options || {};
  if (opts.theme === 'dark') document.body.classList.add('dark');
  document.documentElement.lang = data.locale || 'en';
  var main = document.getElementById('main');
  var big = document.getElementById('big');
  var el = function (tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  var fmtDate = function (iso) { try { return new Date(iso).toLocaleDateString(data.locale || undefined, { year: 'numeric', month: 'short', day: 'numeric' }); } catch (e) { return ''; } };
  document.getElementById('title').textContent = data.collections.length === 1 ? data.collections[0].name : document.title;
  document.title = document.getElementById('title').textContent;

  function open(it) {
    var img = document.getElementById('big-img');
    img.src = it.image || it.thumb || '';
    img.alt = it.alt || it.caption || it.file;
    var cap = document.getElementById('big-cap');
    cap.textContent = '';
    cap.appendChild(el('div', 'file', it.file));
    if (it.caption) cap.appendChild(el('div', 'cap', it.caption));
    if (it.alt) cap.appendChild(el('div', 'cap', it.alt));
    big.showModal();
  }
  document.getElementById('big-close').onclick = function () { big.close(); };
  big.addEventListener('click', function (e) { if (e.target === big) big.close(); });

  function draw(q) {
    main.textContent = '';
    q = (q || '').toLowerCase();
    data.collections.forEach(function (c) {
      var items = c.items.filter(function (it) { return !q || (it.file + ' ' + (it.caption || '') + ' ' + (it.alt || '')).toLowerCase().indexOf(q) >= 0; });
      if (!items.length) return;
      var s = el('section');
      s.appendChild(el('h2', null, c.name));
      if (c.description) s.appendChild(el('p', 'about', c.description));
      var grid = el('div', 'grid');
      items.forEach(function (it) {
        var f = el('figure', 'card');
        var b = el('button');
        b.setAttribute('aria-label', it.file);
        var img = el('img');
        img.loading = 'lazy';
        img.src = it.thumb || it.image || '';
        img.alt = it.alt || it.caption || it.file;
        b.appendChild(img);
        b.onclick = function () { open(it); };
        f.appendChild(b);
        var fc = el('figcaption');
        fc.appendChild(el('div', 'file', it.file));
        if (it.caption) fc.appendChild(el('div', 'cap', it.caption));
        if (opts.showDetails !== false && (it.takenAt || it.camera)) fc.appendChild(el('div', 'meta', [it.takenAt ? fmtDate(it.takenAt) : '', it.camera || ''].filter(Boolean).join(' · ')));
        f.appendChild(fc);
        grid.appendChild(f);
      });
      s.appendChild(grid);
      main.appendChild(s);
    });
  }
  document.getElementById('q').addEventListener('input', function (e) { draw(e.target.value); });
  draw('');
})();
