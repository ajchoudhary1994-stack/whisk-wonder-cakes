/*
 * Analytics with consent.
 * 1. Set GA_ID below to your Google Analytics 4 Measurement ID (looks like G-XXXXXXXXXX).
 * 2. While GA_ID is empty, nothing is loaded and no banner is shown.
 * 3. When GA_ID is set, the banner asks the visitor. Google Analytics loads only after "Accept".
 *    "Reject" loads nothing. The choice is kept in this browser (localStorage), and can be changed
 *    any time with the "Cookie settings" link in the footer.
 */
(function () {
  'use strict';
  var GA_ID = 'G-9Z2W2QGJDB';         // Google Analytics 4 Measurement ID
  var KEY = 'ww_consent';
  var banner = null;

  function saved() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function save(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* private mode: ask again next visit */ } }

  function loadGA() {
    if (!GA_ID || window.__wwGA) return;
    window.__wwGA = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    // Feedback URLs contain a signed bearer token in the query string. Never send query/hash data to GA.
    window.gtag('config', GA_ID, { anonymize_ip: true, page_location: window.location.origin + window.location.pathname });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
    document.head.appendChild(s);
  }

  function hideBanner() { if (banner) banner.hidden = true; }

  function buildBanner() {
    banner = document.createElement('div');
    banner.className = 'cc-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie choice');
    banner.innerHTML =
      '<p>We use Google Analytics to see which pages people visit, so we can improve the site. It loads only if you accept. <a href="privacy.html">Privacy policy</a></p>' +
      '<div class="cc-actions"><button type="button" class="cc-btn cc-reject">Reject</button><button type="button" class="cc-btn cc-accept">Accept</button></div>';
    document.body.appendChild(banner);
    banner.querySelector('.cc-accept').addEventListener('click', function () { save('granted'); hideBanner(); loadGA(); });
    banner.querySelector('.cc-reject').addEventListener('click', function () { save('denied'); hideBanner(); });
  }

  function init() {
    if (!GA_ID) return;                 // analytics not configured: nothing to ask, nothing loaded
    var choice = saved();
    if (choice === 'granted') loadGA();
    if (!choice) { buildBanner(); }
    var link = document.getElementById('cookieSettings');
    if (link) link.addEventListener('click', function (e) {
      e.preventDefault();
      if (!banner) buildBanner();
      banner.hidden = false;
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
