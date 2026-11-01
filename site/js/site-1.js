var fbState = { id: '', t: '' };   /* order id + token from the feedback link */
function rewardApi(action, body) {
  var payload = Object.assign({ action: action }, body || {});
  return fetch('/.netlify/functions/rewards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    .then(function (r) { return r.json().catch(function () { return {}; }); });
}
function makeCode(prefix) {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', buf = new Uint32Array(6), out = '';
  (window.crypto || window.msCrypto).getRandomValues(buf);
  for (var i = 0; i < 6; i++) { out += chars[buf[i] % chars.length]; }
  return prefix + '-' + out;
}
document.addEventListener('DOMContentLoaded', function () {

  /* Preloader */
  var preloader = document.getElementById('preloader');
  window.addEventListener('load', function () {
    setTimeout(function () { preloader.classList.add('hide'); }, 700);
  });
  setTimeout(function () { preloader.classList.add('hide'); }, 2200);

  /* Sticky header + scroll progress */
  var header = document.getElementById('siteHeader');
  var progress = document.getElementById('progressRibbon');
  var backToTop = document.getElementById('backToTop');
  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop;
    header.classList.toggle('scrolled', y > 60);
    backToTop.classList.toggle('show', y > 500);
    var h = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = h > 0 ? (y / h * 100) + '%' : '0%';
  }
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  backToTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

  /* Mobile menu */
  var hamburger = document.getElementById('hamburgerBtn');
  var mobileMenu = document.getElementById('mobileMenu');
  hamburger.addEventListener('click', function () {
    var open = mobileMenu.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  mobileMenu.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () {
      mobileMenu.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });

  /* Reveal on scroll */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in-view'); });
  }

  /* FAQ accordion */
  document.querySelectorAll('.faq-item').forEach(function (item) {
    var q = item.querySelector('.faq-q');
    var a = item.querySelector('.faq-a');
    if (item.classList.contains('open')) { a.style.maxHeight = a.scrollHeight + 'px'; }
    q.addEventListener('click', function () {
      var isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(function (other) {
        other.classList.remove('open');
        other.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
        other.querySelector('.faq-a').style.maxHeight = null;
      });
      if (!isOpen) {
        item.classList.add('open');
        q.setAttribute('aria-expanded', 'true');
        a.style.maxHeight = a.scrollHeight + 'px';
      }
    });
  });

  /* Reviews slider */
  var track = document.getElementById('reviewsTrack');
  var cards = track.querySelectorAll('.review-card');
  var dotsWrap = document.getElementById('revDots');
  var idx = 0;
  cards.forEach(function (_, i) {
    var d = document.createElement('button');
    if (i === 0) d.classList.add('active');
    d.setAttribute('aria-label', 'Go to review ' + (i + 1));
    d.addEventListener('click', function () { goTo(i); });
    dotsWrap.appendChild(d);
  });
  function goTo(i) {
    idx = (i + cards.length) % cards.length;
    track.style.transform = 'translateX(-' + (idx * 100) + '%)';
    dotsWrap.querySelectorAll('button').forEach(function (d, di) { d.classList.toggle('active', di === idx); });
  }
  document.getElementById('revPrev').addEventListener('click', function () { goTo(idx - 1); });
  document.getElementById('revNext').addEventListener('click', function () { goTo(idx + 1); });
  var autoplay = setInterval(function () { goTo(idx + 1); }, 6000);
  track.closest('.reviews-wrap').addEventListener('mouseenter', function () { clearInterval(autoplay); });

  /* Gallery: cake details lightbox */
  var lightbox = document.getElementById('lightbox');
  var lightboxImg = document.getElementById('lightboxImg');
  var lbOrder = document.getElementById('lbOrder');
  var lastFocus = null;
  function lockScroll(on) { document.body.style.overflow = on ? 'hidden' : ''; }
  function openLightbox(item) {
    var name = item.getAttribute('data-name') || '';
    var img = item.querySelector('img');
    lightboxImg.src = img.currentSrc || img.src;
    lightboxImg.alt = img.alt;
    document.getElementById('lbTag').textContent = item.getAttribute('data-tag') || '';
    document.getElementById('lbTitle').textContent = name;
    document.getElementById('lbDesc').textContent = item.getAttribute('data-desc') || '';
    document.getElementById('lbFlavour').textContent = item.getAttribute('data-flavour') || '';
    document.getElementById('lbBest').textContent = item.getAttribute('data-best') || '';
    document.getElementById('lbFinish').textContent = item.getAttribute('data-finish') || '';
    var msg = "Hi Whisk & Wonder, I'd like to order a " + name + ".";
    lbOrder.setAttribute('data-msg', msg);
    lbOrder.href = 'https://wa.me/919459755408?text=' + encodeURIComponent(msg);
    lastFocus = item;
    lightbox.classList.add('open');
    lockScroll(true);
    lightbox.querySelector('.lb-card').scrollTop = 0;
    document.getElementById('lightboxClose').focus();
  }
  function closeLightbox() {
    lightbox.classList.remove('open');
    lightboxImg.src = '';
    lockScroll(false);
    if (lastFocus) { lastFocus.focus(); }
  }
  document.querySelectorAll('.gallery-item').forEach(function (item) {
    item.addEventListener('click', function () { openLightbox(item); });
    item.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(item); }
    });
  });
  document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', function (e) { if (e.target === lightbox) closeLightbox(); });

  /* Contact chooser: shows both numbers together */
  var sheet = document.getElementById('contactSheet');
  var NUM_A = '919459755408', NUM_B = '918219938169';
  var ICO_CALL = '<svg viewBox="0 0 24 24" fill="none"><path d="M4 5c0 8 7 15 15 15l3-4-6-3-2 2c-2-1-4-3-5-5l2-2-3-6-4 3Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
  var ICO_WAP = '<svg viewBox="0 0 24 24" fill="none"><path d="M4 20l1.4-4.2A8 8 0 1 1 9 18.5L4 20Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
  function openSheet(type, msg) {
    var isWa = type === 'wa';
    var text = msg || "Hi Whisk & Wonder, I'd like to order a cake";
    document.getElementById('sheetTitle').textContent = isWa ? 'Chat on WhatsApp' : 'Call Us';
    var a = document.getElementById('sheetPrimary'), b = document.getElementById('sheetAlt');
    if (isWa) {
      a.href = 'https://wa.me/' + NUM_A + '?text=' + encodeURIComponent(text);
      b.href = 'https://wa.me/' + NUM_B + '?text=' + encodeURIComponent(text);
      a.target = b.target = '_blank'; a.rel = b.rel = 'noopener';
    } else {
      a.href = 'tel:+' + NUM_A; b.href = 'tel:+' + NUM_B;
      a.removeAttribute('target'); b.removeAttribute('target');
    }
    a.querySelector('.s-ico').innerHTML = b.querySelector('.s-ico').innerHTML = isWa ? ICO_WAP : ICO_CALL;
    sheet.classList.add('open');
    sheet.setAttribute('aria-hidden', 'false');
    lockScroll(true);
  }
  function closeSheet() {
    sheet.classList.remove('open');
    sheet.setAttribute('aria-hidden', 'true');
    if (!lightbox.classList.contains('open')) { lockScroll(false); }
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('.js-contact');
    if (t) { e.preventDefault(); openSheet(t.getAttribute('data-contact'), t.getAttribute('data-msg')); return; }
    if (e.target.closest('[data-close]') && sheet.contains(e.target)) { closeSheet(); }
  });
  sheet.querySelectorAll('.sheet-link').forEach(function (l) { l.addEventListener('click', function () { setTimeout(closeSheet, 150); }); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') { return; }
    if (sheet.classList.contains('open')) { closeSheet(); } else if (lightbox.classList.contains('open')) { closeLightbox(); }
  });

  /* Reviews: swipe on touch screens */
  (function () {
    var wrap = track.closest('.reviews-wrap'), sx = null;
    wrap.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    wrap.addEventListener('touchend', function (e) {
      if (sx === null) { return; }
      var dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) > 45) { clearInterval(autoplay); goTo(idx + (dx < 0 ? 1 : -1)); }
    }, { passive: true });
  })();

  /* Celebration & Feedback form */
  var celebForm = document.getElementById('celebForm');
  if (celebForm) {
    var celebOccasionSelect = document.getElementById('celebOccasion');
    var celebSuccess = document.getElementById('celebSuccess');
    var celebError = document.getElementById('celebError');
    var celebCodeEl = document.getElementById('celebCode');
    var rewardCodeField = document.getElementById('rewardCode');
    var celebOtherWrap = document.getElementById('celebOtherWrap');
    var celebOtherInput = document.getElementById('celebOtherOccasion');

    /* Show the "Other occasion" box only when "Other" is picked */
    function syncOtherOccasion() {
      var isOther = celebOccasionSelect.value === 'Other';
      celebOtherWrap.hidden = !isOther;
      celebOtherInput.disabled = !isOther;
      celebOtherInput.required = isOther;
      if (!isOther) { celebOtherInput.value = ''; }
    }
    celebOccasionSelect.addEventListener('change', syncOtherOccasion);
    syncOtherOccasion();

    /* Show the "Other relation" box only when "Other" is picked */
    var celebRelationSelect = document.getElementById('celebRelation');
    var celebOtherRelationWrap = document.getElementById('celebOtherRelationWrap');
    var celebOtherRelationInput = document.getElementById('celebOtherRelation');
    function syncOtherRelation() {
      var isOther = celebRelationSelect.value === 'Other';
      celebOtherRelationWrap.hidden = !isOther;
      celebOtherRelationInput.disabled = !isOther;
      celebOtherRelationInput.required = isOther;
      if (!isOther) { celebOtherRelationInput.value = ''; }
    }
    celebRelationSelect.addEventListener('change', syncOtherRelation);
    syncOtherRelation();

    /* Feedback opens only from the link sent after the order is confirmed */
    var celebLocked = document.getElementById('celebLocked');
    var fbParams = new URLSearchParams(window.location.search);
    var fbId = fbParams.get('feedback'), fbT = fbParams.get('t');
    if (fbId && fbT) {
      rewardApi('feedbackInfo', { orderId: fbId, token: fbT }).then(function (j) {
        if (j && j.ok && j.done) {
          celebLocked.innerHTML = '';
          var p = document.createElement('p'); p.style.margin = '0';
          p.textContent = 'Thank you, your feedback is already saved. Your reward code is ' + j.code + ' (₹50 OFF on any future order).';
          celebLocked.appendChild(p);
        } else if (j && j.ok) {
          fbState = { id: fbId, t: fbT };
          if (j.name) { document.getElementById('celebName').value = j.name; }
          celebLocked.hidden = true;
          celebForm.classList.remove('is-hidden-init'); celebForm.style.display = '';
        } else {
          celebLocked.querySelector('p').textContent = (j && j.message) || 'This feedback link is not valid.';
        }
      }).catch(function () {
        celebLocked.querySelector('p').textContent = 'Could not open the feedback form right now. Please try again in a minute.';
      });
    }

    function encodeFormData(data) {
      return Object.keys(data).map(function (key) {
        return encodeURIComponent(key) + '=' + encodeURIComponent(data[key]);
      }).join('&');
    }

    var OWNER_WHATSAPP = '919459755408';

    function buildWhatsAppLink(fields, code) {
      var lines = [
        '🎂 *New Celebration Feedback - Whisk & Wonder Cakes*',
        '',
        '👤 Name: ' + fields.name,
        '📱 Phone: ' + fields.phone,
        '🎉 Occasion: ' + fields.occasion,
        '📅 Celebration Date: ' + fields.date,
        '🎁 Cake For: ' + fields.recipient + ' (' + fields.relation + ')',
        '⭐ Rating: ' + fields.rating + '/5',
        '💬 Feedback: ' + fields.feedback,
        '🏷️ Reward Code: ' + code
      ];
      return 'https://wa.me/' + OWNER_WHATSAPP + '?text=' + encodeURIComponent(lines.join('\n'));
    }

    celebForm.addEventListener('submit', function (e) {
      e.preventDefault();
      celebError.classList.remove('show');

      var starChecked = celebForm.querySelector('input[name="Rating"]:checked');
      if (!starChecked) {
        celebError.textContent = 'Please select a star rating before submitting.';
        celebError.classList.add('show');
        return;
      }

      var occasion = celebOccasionSelect.value;
      var otherOccasion = celebOtherInput.value.trim();
      if (occasion === 'Other' && !otherOccasion) {
        celebError.textContent = 'Please tell us the occasion in the box that appeared under "This Cake Was For".';
        celebError.classList.add('show');
        celebOtherInput.focus();
        return;
      }
      var relation = celebRelationSelect.value;
      var otherRelation = celebOtherRelationInput.value.trim();
      if (relation === 'Other' && !otherRelation) {
        celebError.textContent = 'Please tell us the exact relation in the box that appeared under "Their Relation To You".';
        celebError.classList.add('show');
        celebOtherRelationInput.focus();
        return;
      }
      var relationLabel = relation === 'Other' ? 'Other - ' + otherRelation : relation;
      var occasionLabel = occasion === 'Other' ? 'Other - ' + otherOccasion : occasion;
      var occasionDisplay = occasion === 'Other' ? otherOccasion : occasion;

      var fields = {
        name: document.getElementById('celebName').value,
        phone: document.getElementById('celebPhone').value,
        occasion: occasionLabel,
        date: document.getElementById('celebDate').value,
        recipient: document.getElementById('celebRecipient').value,
        relation: relationLabel,
        rating: starChecked.value,
        feedback: document.getElementById('celebMessage').value
      };

      var submitBtn = celebForm.querySelector('.celeb-submit');
      submitBtn.disabled = true;

      /* Open a blank tab right now, on the tap, so mobile browsers do not block it.
         It is sent to WhatsApp once the server has issued the code. */
      var waWin = window.open('', '_blank');

      rewardApi('feedbackSubmit', { orderId: fbState.id, token: fbState.t, rating: starChecked.value, feedback: fields.feedback, occasion: occasionLabel, date: fields.date, recipient: fields.recipient, relation: relationLabel }).then(function (j) {
        if (!j || !j.code) { throw new Error((j && j.message) || 'Something went wrong. Please try again, or message us directly on WhatsApp.'); }
        var code = j.code;
        rewardCodeField.value = code;

        var link = buildWhatsAppLink(fields, code);
        if (waWin) { waWin.location.href = link; } else { window.open(link, '_blank'); }

        var formData = new FormData(celebForm);
        var payload = {};
        formData.forEach(function (value, key) { payload[key] = value; });

        return fetch('/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: encodeFormData(payload)
        }).catch(function () { /* Netlify copy failed; the WhatsApp message still has the details */ }).then(function () {
          celebCodeEl.textContent = code;
          celebForm.classList.add('hide');
          celebSuccess.classList.add('show');
        });
      }).catch(function (err) {
        if (waWin) { waWin.close(); }
        submitBtn.disabled = false;
        celebError.textContent = (err && err.message) || 'Something went wrong. Please try again, or message us directly on WhatsApp.';
        celebError.classList.add('show');
      });
    });
  }

  /* Location map: Map / Satellite toggle */
  var mapFrame = document.getElementById('mapFrame');
  if (mapFrame) {
    var mapBtns = document.querySelectorAll('.map-btn');
    mapBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var view = btn.getAttribute('data-view');
        mapFrame.src = view === 'satellite' ? mapFrame.getAttribute('data-sat-src') : mapFrame.getAttribute('data-map-src');
        mapBtns.forEach(function (b) {
          var on = b === btn;
          b.classList.toggle('active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
      });
    });
  }

});
