/* Plan my celebration: a popup form with drop-down choices. Sends the answers to WhatsApp. */
(function () {
  'use strict';
  var open = document.getElementById('openPlan');
  var modal = document.getElementById('planModal');
  var close = document.getElementById('planClose');
  var form = document.getElementById('planForm');
  var err = document.getElementById('pfErr');
  var clear = document.getElementById('pfClear');
  if (!open || !modal || !form) return;
  var WA = '919459755408';
  var lastFocus = null;

  function show() {
    lastFocus = open;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    document.getElementById('pfOccasion').focus();
  }
  function hide() {
    modal.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }
  function fail(msg, el) {
    err.textContent = msg; err.hidden = false;
    if (el) el.focus();
  }

  open.addEventListener('click', show);
  close.addEventListener('click', hide);
  modal.addEventListener('click', function (e) { if (e.target === modal) hide(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) hide(); });

  clear.addEventListener('click', function () {
    form.reset(); err.hidden = true;
    document.getElementById('pfOccasion').focus();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = form.elements;
    if (!f.occasion.value) return fail('Please choose the occasion.', f.occasion);
    if (!f.when.value) return fail('Please choose when you need it.', f.when);
    var name = f.name.value.trim();
    if (name.length < 2) return fail('Please enter your name.', f.name);
    var phone = f.phone.value.replace(/[\s+-]/g, '');
    if (!/^(91)?[6-9]\d{9}$/.test(phone)) return fail('Please enter a valid 10-digit mobile number.', f.phone);
    err.hidden = true;

    var lines = [
      'Hi Whisk & Wonder, I want to plan my celebration.',
      '',
      'Occasion: ' + f.occasion.value,
      'When: ' + f.when.value,
      'Guests: ' + (f.guests.value || 'Not sure'),
      'Cake: ' + (f.cake.value || 'Help me choose'),
      'Decoration: ' + (f.decor.value || 'Not sure'),
      'Delivery: ' + (f.delivery.value || 'Not sure'),
      'Area: ' + (f.area.value || 'Not sure'),
      '',
      'Name: ' + name,
      'Phone: ' + phone.replace(/^91/, '')
    ];
    window.open('https://wa.me/' + WA + '?text=' + encodeURIComponent(lines.join('\n')), '_blank', 'noopener');
  });
})();
