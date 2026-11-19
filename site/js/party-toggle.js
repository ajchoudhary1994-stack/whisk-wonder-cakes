/* Party store: two-column list of items. Click an item to see its photo and details. Search box filters the list. */
(function () {
  'use strict';
  var btn = document.getElementById('partyToggle');
  var wrap = document.getElementById('partyItems');
  var search = document.getElementById('partySearch');
  var empty = document.getElementById('partyEmpty');
  var overlay = document.getElementById('partyDetail');
  var pdImg = document.getElementById('pdImg');
  var pdTitle = document.getElementById('pdTitle');
  var pdDesc = document.getElementById('pdDesc');
  var pdWa = document.getElementById('pdWa');
  var pdClose = document.getElementById('pdClose');
  var lastFocus = null;
  if (!btn || !wrap) return;

  btn.addEventListener('click', function () {
    var open = wrap.hasAttribute('hidden');
    if (open) wrap.removeAttribute('hidden'); else wrap.setAttribute('hidden', '');
    btn.setAttribute('aria-expanded', String(open));
    btn.textContent = open ? 'Hide party items' : 'Browse party items';
    if (open) wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  if (search) {
    search.addEventListener('input', function () {
      var q = search.value.trim().toLowerCase();
      var shown = 0;
      [].forEach.call(wrap.querySelectorAll('.pl-row'), function (row) {
        var hit = !q || row.getAttribute('data-search').indexOf(q) !== -1;
        row.parentNode.hidden = !hit;
        if (hit) shown++;
      });
      if (empty) empty.hidden = shown !== 0;
    });
  }

  function openDetail(row) {
    lastFocus = row;
    pdTitle.textContent = row.getAttribute('data-title');
    pdDesc.textContent = row.getAttribute('data-desc');
    pdWa.setAttribute('href', row.getAttribute('data-wa'));
    var src = row.getAttribute('data-img');
    if (src) { pdImg.setAttribute('src', src); pdImg.setAttribute('alt', row.getAttribute('data-title')); pdImg.hidden = false; }
    else { pdImg.removeAttribute('src'); pdImg.hidden = true; }
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';   // also stops the smooth scroll behind it
    pdClose.focus();
  }
  function closeDetail() {
    overlay.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }

  wrap.addEventListener('click', function (e) {
    var row = e.target.closest && e.target.closest('.pl-row');
    if (row) openDetail(row);
  });
  pdClose.addEventListener('click', closeDetail);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeDetail(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !overlay.hidden) closeDetail();
  });
})();
