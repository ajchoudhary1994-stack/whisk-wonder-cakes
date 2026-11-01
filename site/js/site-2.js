/* ===== Whisk & Wonder: shop + party store + bundles + cart + checkout + payments + delivery check ===== */
(function () {
  'use strict';
  var OWNER_WA = '919459755408';       /* primary WhatsApp */
  var ALT_WA = '918219938169';         /* alternate WhatsApp */
  var EXTRAS_NOTE = 'Payment is taken for cakes only. Bundles and party supplies are added to your order with no payment now. We confirm them on WhatsApp and deliver them together with your cake.';
  var UPI_ID = '8219938169@axl';   /* used for the Pay Now button (not shown to customers). Blank = hide UPI option */
  var UPI_NAME = 'Whisk & Wonder Cakes';
  var STORE_KEY = 'wnw_cart_v2';
  var KITCHEN = { lat: 32.083754, lon: 76.498323 };   /* Our kitchen, Arla */
  var RADIUS_KM = 10;

  /* Fallback menu. On the live site /catalog.json is loaded and overrides this. */
  var CATALOG = {
  "products": [
    {
      "id": "black-forest",
      "kind": "cake",
      "name": "Black Forest",
      "tag": "Timeless Classic",
      "perLb": 525,
      "badge": "Chef's Special",
      "sizes": {
        "1 lb (500 g)": 525,
        "2 lb (1 kg)": 1050,
        "3 lb (1.5 kg)": 1575
      }
    },
    {
      "id": "pineapple",
      "kind": "cake",
      "name": "Pineapple",
      "tag": "Fruity Favourite",
      "perLb": 375,
      "sizes": {
        "1 lb (500 g)": 375,
        "2 lb (1 kg)": 750,
        "3 lb (1.5 kg)": 1125
      }
    },
    {
      "id": "strawberry",
      "kind": "cake",
      "name": "Strawberry",
      "tag": "Fresh & Fruity",
      "perLb": 425,
      "sizes": {
        "1 lb (500 g)": 425,
        "2 lb (1 kg)": 850,
        "3 lb (1.5 kg)": 1275
      }
    },
    {
      "id": "butterscotch",
      "kind": "cake",
      "name": "Butterscotch",
      "tag": "Rich & Indulgent",
      "perLb": 425,
      "sizes": {
        "1 lb (500 g)": 425,
        "2 lb (1 kg)": 850,
        "3 lb (1.5 kg)": 1275
      }
    },
    {
      "id": "red-velvet",
      "kind": "cake",
      "name": "Red Velvet",
      "tag": "Signature Layers",
      "perLb": 575,
      "badge": "Customer Favourite",
      "sizes": {
        "1 lb (500 g)": 575,
        "2 lb (1 kg)": 1150,
        "3 lb (1.5 kg)": 1725
      }
    },
    {
      "id": "vanilla",
      "kind": "cake",
      "name": "Vanilla",
      "tag": "Classic & Elegant",
      "perLb": 375,
      "badge": "Most Demanding",
      "sizes": {
        "1 lb (500 g)": 375,
        "2 lb (1 kg)": 750,
        "3 lb (1.5 kg)": 1125
      }
    },
    {
      "id": "metallic-balloons",
      "kind": "party",
      "name": "Metallic Balloons",
      "tag": "Party Store",
      "desc": "Shiny gold, rose-gold and silver foil balloons — rounds, stars and hearts that make every photo pop.",
      "details": [
        "Gold, rose-gold and silver finishes",
        "Rounds, stars and hearts",
        "Great for backdrops and photo corners"
      ],
      "sizes": {
        "Pack of 5": null,
        "Pack of 10": null
      }
    },
    {
      "id": "pastel-balloons",
      "kind": "party",
      "name": "Pastel Balloons",
      "tag": "Party Store",
      "desc": "Soft pink, mint, lavender and cream latex balloons for dreamy, Instagram-ready decor.",
      "details": [
        "Pink, mint, lavender and cream mix",
        "Latex balloons",
        "Perfect for kids' parties and baby showers"
      ],
      "sizes": {
        "Pack of 20": null,
        "Pack of 50": null
      }
    },
    {
      "id": "candles",
      "kind": "party",
      "name": "Candles",
      "tag": "Party Store",
      "desc": "Birthday candles in plain, striped and themed styles to match your cake.",
      "details": [
        "Plain and striped styles",
        "Matches any cake from our menu",
        "Tell us the theme in the order notes"
      ],
      "sizes": {
        "Pack of 12": null,
        "Pack of 24": null
      }
    },
    {
      "id": "banners",
      "kind": "party",
      "name": "Banners & Bunting",
      "tag": "Party Store",
      "desc": "Happy Birthday, Anniversary and theme banners to dress up your wall or cake table.",
      "details": [
        "Happy Birthday, Anniversary and theme banners",
        "Easy to hang, light-weight",
        "Mention the name or theme in the notes"
      ],
      "sizes": {
        "Single banner": null,
        "Banner + bunting": null
      }
    },
    {
      "id": "party-caps",
      "kind": "party",
      "name": "Party Caps & Hats",
      "tag": "Party Store",
      "desc": "Colourful cone caps and hats for kids and grown-ups — because everyone should wear one.",
      "details": [
        "Colourful cone caps",
        "Sizes for kids and adults",
        "Mixed colours unless you ask for a theme"
      ],
      "sizes": {
        "Pack of 6": null,
        "Pack of 12": null
      }
    },
    {
      "id": "poppers",
      "kind": "party",
      "name": "Popper, Confetti & More",
      "tag": "Party Store",
      "desc": "Party poppers, confetti, streamers and sparkle for the big moment.",
      "details": [
        "Party poppers and confetti",
        "Streamers and sparkle extras",
        "Ideal for the cake-cutting moment"
      ],
      "sizes": {
        "Popper + confetti set": null,
        "Party pack": null
      }
    },
    {
      "id": "bundle-birthday",
      "kind": "bundle",
      "name": "Birthday Starter",
      "tag": "Simple & sweet",
      "emoji": "🎂",
      "desc": "Everything for a lovely home birthday — a 1 kg cake with the essentials to set the mood.",
      "details": [
        "1 kg cake of your choice",
        "10 pastel balloons",
        "Candles (pack of 12)",
        "Happy Birthday banner"
      ],
      "opts": [
        "Black Forest",
        "Pineapple",
        "Strawberry",
        "Butterscotch",
        "Red Velvet"
      ],
      "sizes": {
        "Bundle": null
      }
    },
    {
      "id": "bundle-kids",
      "kind": "bundle",
      "name": "Kids Party Pack",
      "tag": "Colourful & fun",
      "emoji": "🎈",
      "badge": "Most popular",
      "desc": "A colourful kids' party in one box — cake, loads of balloons, caps and poppers.",
      "details": [
        "1 kg cake of your choice",
        "20 pastel balloons",
        "6 party caps",
        "Candles (pack of 12)",
        "Popper + confetti set"
      ],
      "opts": [
        "Black Forest",
        "Pineapple",
        "Strawberry",
        "Butterscotch",
        "Red Velvet"
      ],
      "sizes": {
        "Bundle": null
      }
    },
    {
      "id": "bundle-anniversary",
      "kind": "bundle",
      "name": "Glam Anniversary",
      "tag": "Elegant & shiny",
      "emoji": "✨",
      "desc": "A glamorous set-up for anniversaries and date nights, with metallic balloons that glow in photos.",
      "details": [
        "1 kg cake of your choice",
        "5 metallic balloons",
        "Candles (pack of 12)",
        "Anniversary banner"
      ],
      "opts": [
        "Black Forest",
        "Pineapple",
        "Strawberry",
        "Butterscotch",
        "Red Velvet"
      ],
      "sizes": {
        "Bundle": null
      }
    },
    {
      "id": "bundle-grand",
      "kind": "bundle",
      "name": "Grand Celebration",
      "tag": "For big gatherings",
      "emoji": "🎉",
      "desc": "Our biggest bundle for milestone birthdays and family functions — a 2 kg cake and the full decor set.",
      "details": [
        "2 kg cake of your choice",
        "10 metallic + 20 pastel balloons",
        "Banner + bunting",
        "12 party caps",
        "Popper + confetti set",
        "Candles (pack of 24)"
      ],
      "opts": [
        "Black Forest",
        "Pineapple",
        "Strawberry",
        "Butterscotch",
        "Red Velvet"
      ],
      "sizes": {
        "Bundle": null
      }
    }
  ]
};

  /* Cakes are priced per 1 lb and sold by weight. Default selection is the smallest weight. */
  var DEFAULT_SIZE = '1 lb (500 g)';

  /* Weight pill: pounds big, grams small. '2 lb (1 kg)' -> '2 lb' over '1 kg' */
  function sizeHtml(s) {
    var m = /^(.+?)\s*\((.+)\)$/.exec(s);
    return m ? '<span class="sz-main">' + esc(m[1]) + '</span><span class="sz-sub">' + esc(m[2]) + '</span>'
             : '<span class="sz-main">' + esc(s) + '</span>';
  }

  /* Details for things that are not priced products */
  var INFO = {
    celebration: { art: '🎂', name: 'Celebration Cakes', tag: 'Celebrate', cta: 'shop',
      desc: 'Birthdays, promotions, farewells and every small win deserve a cake baked just for the moment.',
      details: ['Baked fresh only after you order', '100% eggless, premium ingredients', 'Any flavour from our menu', 'Name or message on the cake on request'] },
    anniversary: { art: '💞', name: 'Anniversary Cakes', tag: 'Cherish', cta: 'shop',
      desc: 'Elegant cakes for couples and families — soft cream, rosettes and a finish that looks as good as it tastes.',
      details: ['Rosette, floral and drip finishes', 'Names and messages piped on request', 'Pairs well with metallic balloons from our Party Store'] },
    wedding: { art: '💍', name: 'Wedding Cakes', tag: 'Forever', cta: 'wa',
      desc: 'Wedding and engagement cakes are made to order. Share the date, number of guests and your design idea on WhatsApp and we will confirm what is possible and the price.',
      details: ['Designed from your reference photo', 'Weight depends on number of guests', 'Please book as early as you can'] },
    kids: { art: '🧸', name: 'Kids Theme Cakes', tag: 'Delight', cta: 'shop',
      desc: 'Cartoon, colour or character themes for your little one’s big day — made fresh and fun.',
      details: ['Theme and colours of your choice', 'Share a reference photo on WhatsApp', 'Add caps, balloons and poppers from the Party Store'] },
    custom: { art: '🎨', name: 'Custom Design Cakes', tag: 'Made for you', cta: 'wa',
      desc: 'Have a design in mind? Share a reference photo or theme and we will recreate it in fondant, buttercream or a semi-naked finish.',
      details: ['Send a reference image on WhatsApp', 'Fondant, buttercream or semi-naked finish', 'Price depends on design and weight, confirmed before you pay'] },
    'foil-balloons': { art: '🔢', name: 'Foil Number & Letter Balloons', tag: 'Available on request', cta: 'wa',
      desc: 'Big foil numbers and letters to spell out an age, a name or a message.',
      details: ['Numbers and letters on request', 'Gold, rose-gold and silver colours', 'Tell us the name or age and we confirm availability and price'] },
    'cake-toppers': { art: '🎂', name: 'Cake Toppers', tag: 'Available on request', cta: 'wa',
      desc: 'Toppers for the top of your cake — Happy Birthday, Anniversary, names and themes.',
      details: ['Message and theme toppers', 'Matches the cake design you order', 'Availability and price confirmed on WhatsApp'] },
    streamers: { art: '🎀', name: 'Streamers & Curtains', tag: 'Available on request', cta: 'wa',
      desc: 'Foil curtains and streamers for a shimmering photo backdrop.',
      details: ['Foil fringe curtains and paper streamers', 'Colours to match your theme', 'Availability and price confirmed on WhatsApp'] },
    sparklers: { art: '🎇', name: 'Sparkler Candles', tag: 'Available on request', cta: 'wa',
      desc: 'Sparkling candles that light up the cake-cutting moment.',
      details: ['Fountain and stick styles on request', 'Please use with adult supervision', 'Availability and price confirmed on WhatsApp'] },
    sashes: { art: '👑', name: 'Sashes & Crowns', tag: 'Available on request', cta: 'wa',
      desc: 'Birthday boy or girl sashes and crowns to make the celebrant feel like royalty.',
      details: ['Sashes and crowns for kids and adults', 'Colour and message on request', 'Availability and price confirmed on WhatsApp'] },
    'photo-props': { art: '📸', name: 'Photo Props', tag: 'Available on request', cta: 'wa',
      desc: 'Fun props and signs for photo-booth moments with family and friends.',
      details: ['Masks, signs and speech bubbles', 'Light-weight and easy to hold', 'Availability and price confirmed on WhatsApp'] },
    'fairy-lights': { art: '✨', name: 'Fairy Lights', tag: 'Available on request', cta: 'wa',
      desc: 'Warm fairy lights that make any corner or backdrop feel magical in the evening.',
      details: ['Warm-white string lights', 'Great for backdrops and cake tables', 'Availability and price confirmed on WhatsApp'] },
    tableware: { art: '🍽️', name: 'Plates, Cups & Napkins', tag: 'Available on request', cta: 'wa',
      desc: 'Disposable party plates, cups and napkins so serving is quick and clean-up is easy.',
      details: ['Plain and themed designs', 'Quantity as per your guest count', 'Availability and price confirmed on WhatsApp'] },
    'theme-kits': { art: '🎁', name: 'Theme Decor Kits', tag: 'Available on request', cta: 'wa',
      desc: 'Matching decor sets built around one theme, so everything on the table looks like it belongs together.',
      details: ['Tell us the theme and budget', 'We put the kit together for you', 'Price confirmed on WhatsApp'] }
  };
  var CAT_KEYS = { 'Celebration Cakes': 'celebration', 'Anniversary Cakes': 'anniversary', 'Wedding Cakes': 'wedding', 'Kids Theme Cakes': 'kids' };

  var $ = function (id) { return document.getElementById(id); };
  var cart = [];
  var picked = {};
  var infoP = null, infoSel = {};

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function rupee(n) { return '₹' + Number(n).toLocaleString('en-IN'); }
  function kindOf(p) { return p.kind || 'cake'; }
  function byKind(k) { return CATALOG.products.filter(function (p) { return kindOf(p) === k; }); }
  function findProduct(id) { return CATALOG.products.filter(function (p) { return p.id === id; })[0]; }
  /* Cakes are sold by weight: price per 1 lb x pounds. The + button lets customers go above 3 lb (up to 10 lb). */
  var MAX_LB = 10;
  var extraLb = {};   /* per cake id: heaviest weight shown in the picker. Starts at 3 lb. */
  function lbKey(n) { return n + ' lb (' + (n === 1 ? '500 g' : (n / 2) + ' kg') + ')'; }
  function lbOf(key) { var m = /^(\d+) lb \(/.exec(key || ''); return m ? parseInt(m[1], 10) : 0; }
  function isCake(p) { return !!(p && p.perLb > 0); }
  function cakeMax(id) { return Math.min(MAX_LB, Math.max(3, extraLb[id] || 3)); }
  function cakeWeightKeys(p) { var out = []; for (var i = 1; i <= cakeMax(p.id); i++) { out.push(lbKey(i)); } return out; }
  function sizeValue(p, key) {
    if (!p) { return 0; }
    if (isCake(p)) { var n = lbOf(key); return (n > 0 && n <= MAX_LB && lbKey(n) === key) ? p.perLb * n : 0; }
    return p.sizes[key] || 0;
  }
  function priceOf(l) { return sizeValue(findProduct(l.id), l.size); }
  function minPrice(p) { var v = Object.keys(p.sizes).map(function (k) { return p.sizes[k]; }).filter(function (n) { return n > 0; }); return v.length ? Math.min.apply(null, v) : 0; }
  function showsPrice(p) { return p.showPrice !== false; }
  function isQuote(l) { return priceOf(l) <= 0; }
  function hasQuote() { return cart.some(isQuote); }
  function imgFor(name) { var im = document.querySelector('.gallery-item[data-name="' + name + '"] img'); return im ? im.src : ''; }
  function partyArtEl(id) { return document.querySelector('.party-card[data-pid="' + id + '"] .party-art'); }
  function lineLabel(l) {
    var p = findProduct(l.id);
    return p.name + (l.size !== 'Bundle' ? ' (' + l.size + ')' : '') + (l.opt ? ' – ' + l.opt + ' cake' : '');
  }
  function thumb(p) {
    var k = kindOf(p);
    if (k === 'cake') { return '<div class="cart-thumb"><img src="' + imgFor(p.name) + '" alt=""></div>'; }
    if (k === 'party') { var a = partyArtEl(p.id), sv = a && a.querySelector('svg'); return '<div class="cart-thumb">' + (sv ? sv.outerHTML : '🎈') + '</div>'; }
    return '<div class="cart-thumb">' + esc(p.emoji || '🎁') + '</div>';
  }

  function load() { try { cart = JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch (e) { cart = []; } }
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(cart)); } catch (e) {} }
  function clean() { cart = cart.filter(function (l) { var p = findProduct(l.id); return p && (isCake(p) ? sizeValue(p, l.size) > 0 : Object.prototype.hasOwnProperty.call(p.sizes, l.size)) && l.qty > 0; }); }
  function total() { return cart.reduce(function (s, l) { return s + priceOf(l) * l.qty; }, 0); }
  function count() { return cart.reduce(function (s, l) { return s + l.qty; }, 0); }

  var toastT;
  function toast(msg) { var t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2400); }

  /* ---------- cake shop grid ---------- */
  /* The + button: adds 1 lb to the weight picker. Stops at MAX_LB. */
  function plusHtml(p) {
    if (cakeMax(p.id) >= MAX_LB) {
      return '<button type="button" class="size-plus" data-act="more" disabled title="Maximum 10 lb. For bigger cakes, message us on WhatsApp.">+</button>';
    }
    return '<button type="button" class="size-plus" data-act="more" aria-label="Add 1 lb" title="Add 1 lb">+</button>';
  }

  function renderShop() {
    var grid = $('shopGrid'); if (!grid) return;
    grid.innerHTML = byKind('cake').map(function (p) {
      var sizes = cakeWeightKeys(p);
      if (!picked[p.id] || sizes.indexOf(picked[p.id]) < 0) picked[p.id] = DEFAULT_SIZE;
      return '<article class="shop-card" data-id="' + esc(p.id) + '">' +
        '<div class="shop-img"><img src="' + imgFor(p.name) + '" alt="' + esc(p.name) + ' cake" loading="lazy">' + (p.badge ? '<span class="ribbon">' + esc(p.badge) + '</span>' : '') + '</div>' +
        '<div class="shop-body"><span class="tag">' + esc(p.tag || '') + '</span><h3>' + esc(p.name) + '</h3>' +
        '<div class="size-row">' + sizes.map(function (s) { return '<button type="button" class="size-pill' + (s === picked[p.id] ? ' active' : '') + '" data-size="' + esc(s) + '">' + sizeHtml(s) + '</button>'; }).join('') + plusHtml(p) + '</div>' +
        '<div class="shop-foot"><span class="shop-price-wrap"><span class="shop-price">' + rupee(sizeValue(p, picked[p.id])) + '</span><small class="per-lb">' + rupee(p.perLb || 0) + ' per 1 lb</small></span><button type="button" class="btn btn-gold add-btn">Add to Cart</button></div></div></article>';
    }).join('');
  }

  /* ---------- party store prices ---------- */
  function renderParty() {
    document.querySelectorAll('.party-card[data-pid]').forEach(function (c) {
      var p = findProduct(c.getAttribute('data-pid')); if (!p) return;
      var el = c.querySelector('.party-from'); if (el) { var m = minPrice(p); el.textContent = (m && showsPrice(p)) ? 'From ' + rupee(m) : ''; }
    });
  }

  /* ---------- bundles ---------- */
  function renderBundles() {
    var g = $('bundleGrid'); if (!g) return;
    g.innerHTML = byKind('bundle').map(function (p) {
      return '<article class="bundle-card" data-id="' + esc(p.id) + '" role="button" tabindex="0" aria-label="View details: ' + esc(p.name) + '">' +
        (p.badge ? '<span class="b-badge">' + esc(p.badge) + '</span>' : '') +
        '<div class="b-emoji" aria-hidden="true">' + esc(p.emoji || '🎁') + '</div><h4>' + esc(p.name) + '</h4><span class="b-tag">' + esc(p.tag || '') + '</span>' +
        '<ul>' + (p.details || []).map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') + '</ul>' +
        (p.opts ? '<label class="b-opt-l">Cake flavour<select class="b-opt">' + p.opts.map(function (o) { return '<option>' + esc(o) + '</option>'; }).join('') + '</select></label>' : '') +
        '<div class="b-foot">' + (minPrice(p) && showsPrice(p) ? '<strong>' + rupee(minPrice(p)) + '</strong>' : '') + '<button type="button" class="btn btn-gold bundle-add">Add to Cart</button></div></article>';
    }).join('');
  }

  /* ---------- cart ---------- */
  function add(id, size, qty, opt) {
    var p = findProduct(id); if (!p) return false;
    size = size || (p.sizes[DEFAULT_SIZE] ? DEFAULT_SIZE : Object.keys(p.sizes)[0]);
    opt = opt || '';
    var ex = cart.filter(function (l) { return l.id === id && l.size === size && (l.opt || '') === opt; })[0];
    if (ex) { ex.qty = Math.min(20, ex.qty + (qty || 1)); } else { cart.push({ id: id, size: size, qty: qty || 1, opt: opt }); }
    save(); renderCart();
    var c = $('cartCount'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
    toast(p.name + ' added to cart');
    return true;
  }

  function renderCart() {
    clean();
    var n = count(), badge = $('cartCount');
    badge.textContent = n; badge.classList.toggle('show', n > 0);
    var box = $('cartLines');
    if (!cart.length) {
      box.innerHTML = '<div class="cart-empty"><p>Your cart is empty.</p><a class="btn btn-gold" href="#shop" id="emptyShop">Browse Cakes</a></div>';
      $('cartFoot').style.display = 'none';
    } else {
      $('cartFoot').style.display = '';
      box.innerHTML = cart.map(function (l, i) {
        var p = findProduct(l.id);
        var sub = [(l.size !== 'Bundle' ? esc(l.size) : ''), (l.opt ? esc(l.opt) + ' cake' : ''), (isQuote(l) ? '' : rupee(priceOf(l)))].filter(Boolean).join(' · ');
        return '<div class="cart-line">' + thumb(p) +
          '<div><strong>' + esc(p.name) + '</strong><small>' + sub + '</small>' +
          '<div class="qty"><button type="button" data-act="dec" data-i="' + i + '" aria-label="Decrease">−</button><span>' + (parseInt(l.qty, 10) || 1) + '</span><button type="button" data-act="inc" data-i="' + i + '" aria-label="Increase">+</button></div></div>' +
          '<div class="cart-line-right"><div class="lp">' + (isQuote(l) ? '<small class="st-js-1">No payment now</small>' : rupee(priceOf(l) * l.qty)) + '</div><button type="button" class="rm" data-act="rm" data-i="' + i + '">Remove</button></div></div>';
      }).join('');
    }
    var t = total(), q = hasQuote();
    $('cartSubtotal').textContent = rupee(t);
    $('cartFine').textContent = q ? EXTRAS_NOTE : 'Delivery: ₹20 for the first 1 km, then ₹10 more for every extra km (5 km = ₹60, 10 km = ₹110). Beyond 10 km, we confirm the charge with you on WhatsApp. Pickup is free.';
  }

  var drawer, overlay;
  function view(name) {
    ['viewCart', 'viewCheckout', 'viewDone'].forEach(function (v) { $(v).classList.toggle('active', v === name); });
    $('cartFoot').style.display = (name === 'viewCart' && cart.length) ? '' : 'none';
    $('cartTitle').textContent = name === 'viewCheckout' ? 'Checkout' : name === 'viewDone' ? 'Order Confirmed' : 'Your Cart';
    $('viewCheckout').scrollTop = 0;
  }
  function openCart(v) {
    renderCart(); view(v || 'viewCart');
    drawer.classList.add('open'); overlay.classList.add('open'); drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function closeCart() {
    drawer.classList.remove('open'); overlay.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  /* ---------- details modal (party items, bundles, categories, "on request" items) ---------- */
  function openInfo(key) {
    var p = findProduct(key), d, priced = false;
    if (p && kindOf(p) !== 'cake') { d = { name: p.name, tag: p.tag || '', desc: p.desc || '', details: p.details || [] }; priced = true; }
    else { d = INFO[key]; }
    if (!d) return;
    infoP = priced ? p : null;
    infoSel = priced ? { size: Object.keys(p.sizes)[0], opt: p.opts ? p.opts[0] : '' } : {};

    var art = $('infoArt');
    art.className = 'info-art';
    if (priced && kindOf(p) === 'party' && partyArtEl(key)) {
      var src = partyArtEl(key); art.className = src.className + ' info-art'; art.innerHTML = src.innerHTML;
    } else { art.textContent = (priced ? p.emoji : d.art) || '🎁'; }

    $('infoTag').textContent = d.tag || '';
    $('infoTitle').textContent = d.name;
    $('infoDesc').textContent = d.desc || '';
    $('infoList').innerHTML = (d.details || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
    renderBuy();
    $('infoAdd').style.display = priced ? '' : 'none';
    if (!priced && d.cta === 'shop') {
      $('infoAdd').style.display = ''; $('infoAdd').textContent = 'Browse Our Cakes'; $('infoAdd').setAttribute('data-go', 'shop');
    } else { $('infoAdd').textContent = 'Add to Cart'; $('infoAdd').removeAttribute('data-go'); }
    var wa = $('infoWa');
    wa.setAttribute('data-msg', 'Hi Whisk & Wonder, I want to know about ' + d.name);
    wa.textContent = priced ? 'Ask on WhatsApp' : (d.cta === 'wa' ? 'Ask on WhatsApp' : 'Ask on WhatsApp');
    $('infoFine').textContent = priced ? (minPrice(p) ? 'The price is shown in your cart. Delivery charges, if any, are confirmed on WhatsApp.' : 'Add it to your cart with no payment now. We confirm the details on WhatsApp and deliver it together with your cake.') : (key in INFO && INFO[key].tag === 'Available on request' ? 'Availability and price are confirmed on WhatsApp.' : '');
    $('infoModal').classList.add('open'); $('infoModal').setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    $('infoModal').querySelector('.info-card').scrollTop = 0;
    $('infoClose').focus();
  }
  function closeInfo() {
    $('infoModal').classList.remove('open'); $('infoModal').setAttribute('aria-hidden', 'true');
    if (!drawer.classList.contains('open')) { document.body.style.overflow = ''; }
  }
  function renderBuy() {
    var box = $('infoBuy'); if (!infoP) { box.innerHTML = ''; return; }
    var sizes = Object.keys(infoP.sizes), h = '';
    if (sizes.length > 1) {
      h += '<div class="size-row">' + sizes.map(function (s) { return '<button type="button" class="size-pill' + (s === infoSel.size ? ' active' : '') + '" data-size="' + esc(s) + '">' + sizeHtml(s) + '</button>'; }).join('') + '</div>';
    }
    if (infoP.opts) {
      h += '<label class="st-js-2 b-opt-l">Cake flavour<select id="infoOpt">' + infoP.opts.map(function (o) { return '<option' + (o === infoSel.opt ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select></label>';
    }
    if (infoP.sizes[infoSel.size] > 0 && showsPrice(infoP)) { h += '<div class="st-js-3 info-price">' + rupee(infoP.sizes[infoSel.size]) + '</div>'; }
    box.innerHTML = h;
  }

  /* ---------- checkout ---------- */
  function coErr(msg) { var e = $('coErr'); e.textContent = msg || ''; e.classList.toggle('show', !!msg); if (msg) { e.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }
  /* ---------- delivery: simple rule, charge confirmed on WhatsApp ---------- */
  /* Charge is not calculated on the site. The owner checks the address and confirms the exact
     charge on WhatsApp (₹20 for the first 1 km, then ₹10 per extra km, beyond 10 km by agreement). */
  function deliveryPending() { return $('coMode').value === 'delivery'; }
  function deliveryAmt() { return 0; }

  /* Reward codes are checked on the server (netlify/functions/rewards.js) */
  var appliedReward = null;  /* {code, amount} once the server confirms the code */
  function discountAmt() { return appliedReward ? Math.min(appliedReward.amount, total()) : 0; }
  function checkRewardCode() {
    var code = $('coCode').value.trim().toUpperCase(), msg = $('coCodeMsg');
    appliedReward = null;
    if (!code) { msg.textContent = ''; fillSummary(); return; }
    msg.style.color = ''; msg.textContent = 'Checking code…';
    rewardApi('check', { code: code }).then(function (j) {
      if (j && j.valid) {
        appliedReward = { code: code, amount: j.amount };
        msg.style.color = '#2f6b3a';
        msg.textContent = '✓ ₹' + j.amount + ' OFF will be applied to your cakes.';
      } else {
        msg.style.color = '#b23b3b';
        msg.textContent = (j && j.message) || 'This code is not valid.';
      }
      fillSummary();
    }).catch(function () {
      msg.textContent = 'Could not check the code right now. We will check it when you place the order.';
    });
  }
  function fillSummary() {
    var t = total(), disc = discountAmt(), dlv = deliveryAmt(), x = hasQuote();
    $('coSummary').innerHTML = cart.map(function (l) { return '<div><span>' + esc(lineLabel(l)) + ' × ' + l.qty + '</span><span>' + (isQuote(l) ? 'On WhatsApp' : rupee(priceOf(l) * l.qty)) + '</span></div>'; }).join('') +
      (disc ? '<div><span>Reward ' + esc(appliedReward.code) + '</span><span>− ' + rupee(disc) + '</span></div>' : '') + (dlv ? '<div><span>Delivery</span><span>+ ' + rupee(dlv) + '</span></div>' : (deliveryPending() ? '<div><span>Delivery</span><span>To confirm on WhatsApp</span></div>' : '')) + '<div class="sum-total"><span>Pay now</span><span>' + rupee(t - disc + dlv) + '</span></div>' + (x ? '<p class="sum-note">' + esc(EXTRAS_NOTE) + '</p>' : '');
    var upiOk = !!UPI_ID && (t - disc + dlv) > 0;
    $('payUpiOpt').hidden = !upiOk;
    var cur = document.querySelector('input[name="pay"]:checked');
    if (!upiOk) { document.querySelector('input[name="pay"][value="cod"]').checked = true; }
    else if (!cur || cur.closest('label').hidden) { document.querySelector('input[name="pay"][value="upi"]').checked = true; }
    $('payUpiSub').textContent = x ? 'Pay for your cakes now. Bundles and party items are confirmed on WhatsApp.' : 'Opens your UPI app with the amount filled in, or scan our QR code.';
    $('payCodSub').textContent = (t - disc + dlv) > 0 ? 'Pay 50% now by UPI, the rest on delivery or pickup' : 'No payment now. We confirm everything on WhatsApp.';
  }
  function itemsText() { return cart.map(function (l) { return lineLabel(l) + ' x' + l.qty; }).join(', '); }
  function newOrderId() { return makeCode('ORD'); }

  function readForm() {
    return {
      name: $('coName').value.trim(), phone: $('coPhone').value.trim(), email: $('coEmail').value.trim(), mode: $('coMode').value,
      addr: $('coAddr').value.trim(), date: $('coDate').value, slot: $('coSlot').value,
      msg: $('coMsg').value.trim(), notes: $('coNotes').value.trim(), code: $('coCode').value.trim().toUpperCase(),
      pay: (document.querySelector('input[name="pay"]:checked') || {}).value || 'cod'
    };
  }

  function waText(o, payLine) {
    var L = ['🛒 *New Order - Whisk & Wonder Cakes*', '', '🧾 Order ID: ' + o.id, '👤 Name: ' + o.f.name, '📱 Phone: ' + o.f.phone,
      o.f.mode === 'pickup' ? '🏠 Pickup from kitchen, Arla' : '📍 Address: ' + o.f.addr,
      '📅 When: ' + o.f.date + ', ' + o.f.slot, ''];
    o.lines.forEach(function (l) { L.push('• ' + l.label + ' × ' + l.qty + (l.amount > 0 ? ' = ' + rupee(l.amount) : ' (no payment now, details on WhatsApp)')); });
    var cakesOnly = o.total - (o.delivery || 0);
    L.push('', '💰 Cakes total: ' + (cakesOnly ? rupee(cakesOnly) : 'none') + (o.extras ? ' (bundles / party items: confirmed on WhatsApp, delivered with the cake)' : ''));
    if (o.deliveryPending) L.push('🚚 Delivery (home delivery): charge to be confirmed with customer on WhatsApp');
    L.push('💳 Total payable: ' + rupee(o.total), '💳 Payment: ' + payLine);
    if (o.discount) L.push('🏷️ Reward ' + o.f.code + ': -' + rupee(o.discount) + ' (cakes total above is after discount)');
    if (o.f.msg) L.push('🎂 Message on cake: ' + o.f.msg);
    if (o.f.notes) L.push('📝 Notes: ' + o.f.notes);
    if (o.f.email) L.push('✉️ Email: ' + o.f.email);
    if (o.f.code) L.push('🏷️ Reward code: ' + o.f.code);
    return L.join('\n');
  }

  function recordOrder(o, payLine, status, text) {   /* saved in Netlify Forms: dashboard + email notifications */
    var data = {
      'form-name': 'order', 'Order ID': o.id, 'Name': o.f.name, 'Phone': o.f.phone, 'Email': o.f.email,
      'Address': o.f.mode === 'pickup' ? 'PICKUP' : o.f.addr, 'Delivery Date': o.f.date, 'Time Slot': o.f.slot,
      'Cakes': o.cakesText, 'Bundles / Party Items': o.extrasText, 'Cake Total (payable)': o.total ? String(o.total) : '0',
      'Payment': payLine, 'Payment Status': status, 'Cake Message': o.f.msg, 'Notes': o.f.notes, 'Reward Code': o.f.code, 'Full Order Text': text
    };
    var body = Object.keys(data).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(data[k]); }).join('&');
    try { fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body }).catch(function () {}); } catch (e) {}
  }

  function finish(o, payLine, status) {
    var text = waText(o, payLine), enc = encodeURIComponent(text);
    recordOrder(o, payLine, status, text);
    var isUpi = status === 'UPI PENDING';
    $('doneId').textContent = o.id;
    $('doneWa').href = 'https://wa.me/' + OWNER_WA + '?text=' + enc;
    $('doneWaAlt').href = 'https://wa.me/' + ALT_WA + '?text=' + enc;
    $('doneTitle').textContent = isUpi ? (o.balance > 0 ? 'Order placed! Pay 50% now by UPI' : 'Order placed! Now pay by UPI') : 'Order placed!';
    $('doneText').textContent = (isUpi
      ? (o.balance > 0
        ? 'Pay the 50% advance now with the button or QR code below, then send your order and the payment screenshot on WhatsApp. The remaining 50% is paid on delivery or pickup. Your order is confirmed once we see the advance payment.'
        : 'Pay for your cakes with the button or QR code below, then send your order and the payment screenshot on WhatsApp. Your order is confirmed once we see the payment.')
      : 'Tap the button below to send your order on WhatsApp. We will confirm the timing and delivery there.') + (o.extras ? ' ' + EXTRAS_NOTE : '') + ' Once we confirm your payment, we will WhatsApp you a link to share feedback and get your reward code.';
    var panel = $('upiPanel'); panel.hidden = !isUpi;
    if (isUpi) {
      $('upiAmt').textContent = rupee(o.advance);
      $('upiAmtNote').textContent = (o.balance > 0 ? 'Balance ' + rupee(o.balance) + ' on delivery / pickup.' : '') + (o.extras ? ' Bundles and party supplies are confirmed on WhatsApp.' : '');
      $('upiPayBtn').href = 'upi://pay?pa=' + encodeURIComponent(UPI_ID) + '&pn=' + encodeURIComponent(UPI_NAME) + '&tn=' + encodeURIComponent('Order ' + o.id) + '&am=' + o.advance + '&cu=INR';
    }
    cart = []; appliedReward = null; $('coCodeMsg').textContent = ''; save(); renderCart(); view('viewDone');
  }

  function onPlace(e) {
    e.preventDefault(); coErr('');
    if (!cart.length) { return; }
    var f = readForm();
    if (f.name.length < 2) { coErr('Please enter your name.'); return; }
    if (!/^[0-9+\s-]{10,15}$/.test(f.phone)) { coErr('Please enter a valid phone number.'); return; }
    if (f.mode === 'delivery' && f.addr.length < 8) { coErr('Please enter your full delivery address.'); return; }
    if (!f.date) { coErr('Please choose a delivery / pickup date.'); return; }
    var cakes = cart.filter(function (l) { return !isQuote(l); }), extras = cart.filter(isQuote);
    var o = {
      id: newOrderId(), f: f, total: total(), discount: 0, delivery: 0, deliveryPending: deliveryPending(), deliveryKm: 0, extras: extras.length > 0,
      cakesText: cakes.map(function (l) { return lineLabel(l) + ' x' + l.qty; }).join(', '),
      extrasText: extras.map(function (l) { return lineLabel(l) + ' x' + l.qty; }).join(', '),
      lines: cart.map(function (l) { return { label: lineLabel(l), qty: l.qty, amount: priceOf(l) * l.qty }; })
    };
    if (!f.code) { placeOrder(o, f); return; }

    /* Reward code: checked here (read only). The server applies and marks it used only when the order is saved. */
    var btn = $('coPlace'); btn.disabled = true;
    rewardApi('check', { code: f.code.toUpperCase() }).then(function (j) {
      btn.disabled = false;
      if (!j || !j.valid) { coErr((j && j.message) || 'This reward code could not be used. Please check it or remove it.'); return; }
      o.discount = Math.min(j.amount, o.total);
      o.total = o.total - o.discount;
      o.f.code = f.code.toUpperCase();
      placeOrder(o, f);
    }).catch(function () {
      btn.disabled = false;
      coErr('Could not check the reward code right now. Please try again.');
    });
  }
  function placeOrder(o, f) {
    o.total = o.total + o.delivery;   /* cakes (after reward) + delivery */
    var canUpi = o.total > 0 && !!UPI_ID;
    var payLine, status;
    if (canUpi && f.pay === 'cod') {
      /* Pay on delivery / pickup option: 50% now by UPI, 50% on delivery or pickup */
      o.advance = Math.ceil(o.total / 2);
      o.balance = o.total - o.advance;
      payLine = '50% advance by UPI now: ' + rupee(o.advance) + ', balance ' + rupee(o.balance) + ' on delivery / pickup';
      status = 'UPI PENDING';
    } else if (canUpi) {
      /* UPI option: full payment now */
      o.advance = o.total;
      o.balance = 0;
      payLine = 'Full payment by UPI now: ' + rupee(o.total);
      status = 'UPI PENDING';
    } else {
      o.advance = 0; o.balance = o.total;
      payLine = 'Pay on delivery / pickup';
      status = 'COD';
    }
    /* The order is saved on the server first. If that fails, the customer is told and nothing is lost. */
    var btn = $('coPlace'); btn.disabled = true;
    if (window.WWFx) { WWFx.spin(btn); }
    var saveErr = 'We could not place your order right now. Please try again, or message us on WhatsApp.';
    rewardApi('createOrder', {
      orderId: o.id, name: f.name, phone: f.phone, email: f.email,
      items: cart.map(function (l) { return { id: l.id, size: l.size, qty: l.qty, opt: l.opt || '' }; }),
      total: o.total, delivery: o.delivery,
      rewardCode: o.f.code ? o.f.code.toUpperCase() : '',
      cakes: o.cakesText, extras: o.extrasText, date: f.date, payment: payLine
    }).then(function (j) {
      if (!j || !j.ok) {
        if (window.WWFx) { WWFx.reset(btn); }
        btn.disabled = false;
        coErr((j && j.message) || saveErr);
        return;
      }
      /* Saved on the server: now the success animation, then the done screen */
      var go = function () { if (window.WWFx) { WWFx.reset(btn); } btn.disabled = false; finish(o, payLine, status); };
      if (window.WWFx) { WWFx.success(btn, 'Order placed! We will confirm on WhatsApp.', go); } else { go(); }
    }).catch(function () {
      if (window.WWFx) { WWFx.reset(btn); }
      btn.disabled = false;
      coErr(saveErr);
    });
  }

  /* ---------- delivery check ---------- */
  function haversine(a, b, c, d) {
    var R = 6371, rad = Math.PI / 180, dLat = (c - a) * rad, dLon = (d - b) * rad;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a * rad) * Math.cos(c * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  function showErr(msg) {
    var r = $('hdResult'); r.className = 'hd-result show err';
    r.innerHTML = '<h4>We couldn’t check that</h4><p>' + esc(msg) + '</p><div class="hd-acts"><a class="btn btn-gold js-contact" data-contact="wa" data-msg="Hi Whisk &amp; Wonder, can you deliver to my area? I will share my location here." href="https://wa.me/' + OWNER_WA + '">Ask on WhatsApp</a></div>';
  }
  function showResult(lat, lon, label) {
    var d = haversine(KITCHEN.lat, KITCHEN.lon, lat, lon), dTxt = d < 10 ? d.toFixed(1) : Math.round(d);
    var inside = d <= RADIUS_KM;
    var title = inside ? 'Yes, we deliver to you!' : 'Outside our 10 km radius, but you can still order';
    var body = inside
      ? 'You are about ' + dTxt + ' km from our kitchen in Arla (straight-line), inside our ' + RADIUS_KM + ' km home-delivery radius. Delivery charge: ₹20 for the first 1 km, then ₹10 for each extra km. We confirm the final charge on WhatsApp.'
      : 'You are about ' + dTxt + ' km from our kitchen (straight-line). Your order can still be placed. We will confirm the delivery charge with you on WhatsApp.';
    var msg = 'Hi Whisk & Wonder, delivery check: ' + label + ' is about ' + dTxt + ' km from your kitchen. Please confirm delivery.';
    var mapLink = 'https://www.google.com/maps/search/?api=1&query=' + lat + ',' + lon;
    var acts = '<a class="btn btn-gold" href="#shop">Order Now</a>' +
      '<a class="btn btn-dark js-contact" data-contact="wa" data-msg="' + esc(msg) + '" href="https://wa.me/' + OWNER_WA + '">Confirm on WhatsApp</a>';
    var state = inside ? 'ok' : 'maybe';
    var r = $('hdResult'); r.className = 'hd-result show ' + state;
    r.innerHTML = '<h4>' + title + '</h4><p>' + esc(body) + '</p><p class="hd-place">Checked for: ' + esc(label) + '. Not the right place? Add your village and nearest town or PIN code.</p>' +
      '<div class="hd-acts">' + acts + '</div><p class="hd-place"><a href="' + mapLink + '" target="_blank" rel="noopener">View your location on the map</a></p>';
  }
  /* Arla is our home area: always inside the delivery radius, no map lookup needed */
  function showLocalResult(label) {
    var r = $('hdResult'); r.className = 'hd-result show ok';
    var msg = 'Hi Whisk & Wonder, delivery check: ' + label + ' (Arla area). Please confirm delivery.';
    r.innerHTML = '<h4>Yes, we deliver to you!</h4>' +
      '<p>' + esc('Arla is our home area, inside our ' + RADIUS_KM + ' km home-delivery radius. Delivery charge: ₹20 for the first 1 km, then ₹10 for each extra km. We confirm the exact charge with you on WhatsApp.') + '</p>' +
      '<p class="hd-place">Checked for: ' + esc(label) + '.</p>' +
      '<div class="hd-acts"><a class="btn btn-gold" href="#shop">Order Now</a>' +
      '<a class="btn btn-dark js-contact" data-contact="wa" data-msg="' + esc(msg) + '" href="https://wa.me/' + OWNER_WA + '">Confirm on WhatsApp</a></div>';
  }
  function checkArea() {
    var q = $('hdArea').value.trim();
    if (q.length < 3) { $('hdArea').focus(); $('hdArea').style.borderColor = '#b23b3b'; return; }
    if (/\barla/i.test(q)) { showLocalResult(q); return; }
    var btn = $('hdCheckBtn'); btn.disabled = true; btn.firstChild.nodeValue = 'Checking…';
    var query = /himachal|kangra|palampur|\bhp\b/i.test(q) ? q : q + ', Himachal Pradesh';
    var url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=in&viewbox=75.9,32.6,77.1,31.6&q=' + encodeURIComponent(query);
    fetch(url, { headers: { Accept: 'application/json' } }).then(function (r) { if (!r.ok) { throw new Error('geo'); } return r.json(); })
      .then(function (res) {
        if (!res.length) { showErr('We couldn’t find “' + q + '” on the map. Try your nearest town or PIN code, or use your current location.'); return; }
        var lat = parseFloat(res[0].lat), lon = parseFloat(res[0].lon);
        if (haversine(KITCHEN.lat, KITCHEN.lon, lat, lon) > 150) { showErr('That search matched a place far from us. Please add your village and town (for example “Village, Palampur”) or your PIN code.'); return; }
        showResult(lat, lon, res[0].display_name.split(',').slice(0, 3).join(',').trim());
      }).catch(function () { showErr('The map lookup is not working right now. Please use “Use my current location” or ask us on WhatsApp.'); })
      .then(function () { btn.disabled = false; btn.firstChild.nodeValue = 'Check'; });
  }
  /* ---------- wire up ---------- */
  function rerender() { renderShop(); renderParty(); renderBundles(); renderCart(); }

  document.addEventListener('DOMContentLoaded', function () {
    drawer = $('cartDrawer'); overlay = $('cartOverlay');
    load();
    var d = new Date(), pad = function (n) { return (n < 10 ? '0' : '') + n; };
    $('coDate').min = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    if (UPI_ID) { $('payUpiOpt').hidden = false; }
    $('coCode').addEventListener('blur', checkRewardCode);

    rerender();
    /* Prices come from the built-in CATALOG and are checked again on the server. No remote override. */

    /* cakes */
    $('shopGrid').addEventListener('click', function (e) {
      var card = e.target.closest('.shop-card'); if (!card) return;
      var id = card.getAttribute('data-id'), p = findProduct(id);
      var pill = e.target.closest('.size-pill');
      if (pill) {
        picked[id] = pill.getAttribute('data-size');
        card.querySelectorAll('.size-pill').forEach(function (b) { b.classList.toggle('active', b === pill); });
        card.querySelector('.shop-price').textContent = rupee(sizeValue(p, picked[id]));
      }
      var plus = e.target.closest('.size-plus');
      if (plus && !plus.disabled) {
        extraLb[id] = Math.min(MAX_LB, cakeMax(id) + 1);
        picked[id] = lbKey(cakeMax(id));
        renderShop();
        return;
      }
      if (e.target.closest('.add-btn')) { add(id, picked[id], 1); }
    });

    /* party cards: click = details, button = add */
    document.querySelectorAll('.party-card[data-pid]').forEach(function (c) {
      c.addEventListener('click', function (e) {
        var id = c.getAttribute('data-pid');
        if (e.target.closest('.party-add')) { var p = findProduct(id); if (p) { add(id, Object.keys(p.sizes)[0], 1); } return; }
        openInfo(id);
      });
      c.addEventListener('keydown', function (e) {
        if ((e.key === 'Enter' || e.key === ' ') && e.target === c) { e.preventDefault(); openInfo(c.getAttribute('data-pid')); }
      });
    });

    /* bundles */
    var bg = $('bundleGrid');
    bg.addEventListener('click', function (e) {
      var card = e.target.closest('.bundle-card'); if (!card) return;
      var id = card.getAttribute('data-id');
      if (e.target.closest('select')) { return; }
      if (e.target.closest('.bundle-add')) {
        var sel = card.querySelector('.b-opt');
        add(id, 'Bundle', 1, sel ? sel.value : ''); return;
      }
      openInfo(id);
    });
    bg.addEventListener('keydown', function (e) {
      var card = e.target.closest('.bundle-card');
      if (card && e.target === card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openInfo(card.getAttribute('data-id')); }
    });

    /* "available on request" chips, cake flavour chips, category cards */
    document.addEventListener('click', function (e) {
      var chip = e.target.closest('.chip[data-info]');
      if (chip) { openInfo(chip.getAttribute('data-info')); return; }
      var fl = e.target.closest('.chip[data-flavour]');
      if (fl) {
        var name = fl.getAttribute('data-flavour');
        if (name === 'custom') { openInfo('custom'); return; }
        var gi = document.querySelector('.gallery-item[data-name="' + name + '"]'); if (gi) { gi.click(); }
        return;
      }
      var cat = e.target.closest('.cat-card');
      if (cat) {
        var h = cat.querySelector('h3'), key = h && CAT_KEYS[h.textContent.trim()];
        if (key) { e.preventDefault(); openInfo(key); }
      }
    });

    /* details modal controls */
    $('infoClose').addEventListener('click', closeInfo);
    $('infoModal').addEventListener('click', function (e) { if (e.target === $('infoModal')) { closeInfo(); } });
    $('infoBuy').addEventListener('click', function (e) {
      var pill = e.target.closest('.size-pill'); if (!pill || !infoP) return;
      infoSel.size = pill.getAttribute('data-size'); renderBuy();
    });
    $('infoBuy').addEventListener('change', function (e) { if (e.target.id === 'infoOpt') { infoSel.opt = e.target.value; } });
    $('infoAdd').addEventListener('click', function () {
      if (this.getAttribute('data-go') === 'shop') { closeInfo(); var s = $('shop'); if (s) { s.scrollIntoView({ behavior: 'smooth' }); } return; }
      if (infoP) { add(infoP.id, infoSel.size, 1, infoSel.opt); closeInfo(); }
    });

    /* cart drawer */
    $('cartBtn').addEventListener('click', function () { openCart('viewCart'); });
    $('cartClose').addEventListener('click', closeCart);
    overlay.addEventListener('click', closeCart);
    $('doneClose').addEventListener('click', closeCart);
    $('goCheckout').addEventListener('click', function () { fillSummary(); coErr(''); view('viewCheckout'); });
    $('coBack').addEventListener('click', function () { view('viewCart'); });
    $('coForm').addEventListener('submit', onPlace);
    $('coMode').addEventListener('change', function () {
      var pick = this.value === 'pickup';
      $('coAddrWrap').style.display = pick ? 'none' : '';
      $('coDelWrap').style.display = pick ? 'none' : '';
      fillSummary();
    });
    $('cartLines').addEventListener('click', function (e) {
      if (e.target.closest('#emptyShop')) { closeCart(); return; }
      var b = e.target.closest('[data-act]'); if (!b) return;
      var i = +b.getAttribute('data-i'), act = b.getAttribute('data-act'), l = cart[i]; if (!l) return;
      if (act === 'inc') { l.qty = Math.min(20, l.qty + 1); }
      if (act === 'dec') { l.qty -= 1; if (l.qty < 1) { cart.splice(i, 1); } }
      if (act === 'rm') { cart.splice(i, 1); }
      save(); renderCart();
    });

    /* lightbox: add to cart */
    var lbAdd = $('lbAdd');
    if (lbAdd) {
      lbAdd.addEventListener('click', function () {
        var name = $('lbTitle').textContent.trim();
        var p = byKind('cake').filter(function (x) { return x.name === name; })[0];
        if (p) { add(p.id, p.sizes[DEFAULT_SIZE] ? DEFAULT_SIZE : Object.keys(p.sizes)[0], 1); }
        else {
          $('lightboxClose').click();
          var s = $('shop'); if (s) { s.scrollIntoView({ behavior: 'smooth' }); }
          toast('Pick a flavour below and add it to your cart');
        }
      });
    }

    /* delivery check */
    $('hdCheckBtn').addEventListener('click', checkArea);
    $('hdArea').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); checkArea(); } });
    $('hdArea').addEventListener('input', function () { this.style.borderColor = ''; });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if ($('infoModal').classList.contains('open')) { closeInfo(); }
      else if (drawer.classList.contains('open')) { closeCart(); }
    });
  });
})();
