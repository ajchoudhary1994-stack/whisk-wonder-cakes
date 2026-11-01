// If a product photo fails to load, hide it instead of showing a broken image.
// Images with an empty src (for example the lightbox before it opens) are left alone.
// When a photo loads successfully, the inline opacity set here is removed again.
document.addEventListener('error', function (e) {
  var t = e.target;
  if (t && t.tagName === 'IMG' && t.getAttribute('src')) { t.style.opacity = 0; }
}, true);
document.addEventListener('load', function (e) {
  var t = e.target;
  if (t && t.tagName === 'IMG' && t.style.opacity === '0') { t.style.opacity = ''; }
}, true);
