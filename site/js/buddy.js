// Wonder the cake buddy: floats around, does tricks (roll, jump, tongue, drool at cakes) only when the visitor is still, and reacts to the section they stop at.
// and comments on every section and every step of the order. Lines are mixed fresh each time.
import { createAvatar } from './avatar-web.js'

const $ = (id) => document.getElementById(id)
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
const rnd = (a, b) => a + Math.random() * (b - a)
const pick = (a) => a[Math.floor(Math.random() * a.length)]
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const clamp = (v, a, b) => Math.min(Math.max(v, a), b)
const NS = 'http://www.w3.org/2000/svg'

// ---------- Words: every line is built from parts and never repeats a recent one ----------
const recent = []
const usedAll = new Set()
const fresh = (make) => { let s; for (let i = 0; i < 60; i++) { s = make(); if (!usedAll.has(s)) break } usedAll.add(s); return s }
const EM = ['✨', '😋', '🎂', '🍰', '🧁', '😍', '🤤', '🎉', '💖', '🥳', '🍓', '🍫', '🎈', '😄', '🍩']
const TAG = [' Seriously!', ' Maan lo meri baat.', ' Wonder ki guarantee 😎', ' Trust me!', ' Bilkul pakka.', ' Sach bol raha hoon.', ' Mera dil kehta hai.']
const dress = (s) => s + (Math.random() < 0.55 ? ' ' + pick(EM) : '') + (Math.random() < 0.22 ? pick(TAG) : '')
const L = (key, item) => key === 'family' ? fresh(() => pick(P.family) + ' ' + pick(['❤️', '🥹', '🤗', '💖', '🥰'])) : fresh(() => dress(pick(P[key]).replace('{item}', item || 'Yeh cake')))
const SEC = (key) => fresh(() => dress(pick(S[key][0]) + ' ' + pick(S[key][1])))

const P = {
  hello: ['Namaste! Main Wonder hoon, Whisk & Wonder ka cake guide', 'Swagat hai! Aaj ka mood meetha hai na?', 'Hello ji! Eggless cake chahiye? Main hoon na', 'Aaiye, aapke liye sabse sweet plan ready hai'],
  tap: ['Haan ji, bolo kya seva karun?', 'Dheere, main bhi sharmaa jaata hoon', 'Aapne pakad liya, ab meri trick dekhiye'],
  cartAdd: ['{item}! Bahut badhiya pasand', 'Wah, {item} to sabse zyada pasand kiya jaata hai', '{item} cart mein aa gaya, ab bas order baaki hai', 'Ek aur cake? Party ka scene jam raha hai', 'Mast chunav! {item} ke saath balloons bhi dekhiye', 'Cart mein {item}, ek tap mein order complete'],
  cartDown: ['Theek hai, ek hata diya. Soch samajh ke chuniye', 'Koi baat nahi, pasand badal sakti hai', 'Badlaav bhi zaroori hai, cart ab aapke hisaab se hai'],
  cartEmpty: ['Cart khaali ho gaya. Koi naya cake chuniye', 'Sab hata diya? Chaliye naya plan banate hain'],
  cartOpen: ['Yeh raha aapka cart, ek nazar daal lijiye', 'Cart check kar rahe hain? Achha hai, order pakka karein', 'Chaliye dekhte hain kya kya chuna gaya'],
  cartOpenEmpty: ['Cart khaali hai. Pehle koi cake chuniye', 'Abhi kuch nahi chuna. Flavours dekh lijiye'],
  checkout: ['Bas kuch details chahiye, phir cake aapka', 'Aakhri step hai, jaldi ho jayega', 'Form bharte hi kitchen shuru ho jayegi'],
  name: ['Naam batayiye, cake par likhwa denge', 'Aapka naam? Order mein yaad rakhenge'],
  phone: ['Number sahi daliye, WhatsApp par update aayega', 'Phone number chahiye, sirf order ke liye use hoga'],
  phoneOk: ['Number mil gaya', 'Dus ankon ka number, bilkul sahi', 'Perfect number, aage badhiye'],
  addr: ['Landmark zaroor likhiye, rider ko aasani hogi', 'Address mein gali ya landmark batayiye', 'Rider ko rasta samjhane mein madad kijiye'],
  date: ['Kab chahiye? Pehle se order karna sabse achha hai', 'Date chuniye, plan pakka ho jayega', 'Party ki date yaad rakhiye, time par cake milega'],
  codeFocus: ['Reward code hai? Yahan lagaiye', 'Code ho to discount pakka', 'Inaam wala code yahan daliye'],
  pickup: ['Pickup free hai, aaiye cake lene', 'Khud lene aayenge? Delivery ka kharcha bachega', 'Pickup free, bilkul sahi option'],
  delivery: ['Home delivery, aaram se baithiye', 'Ghar baithe cake, kya baat hai', 'Delivery ka option chuna, bahut achha'],
  upi: ['UPI se payment jaldi confirm hota hai', 'UPI fast option hai, ek tap mein payment', 'Payment ke baad cake banna shuru'],
  cod: ['50% abhi UPI se, baaki delivery par', 'Aadha abhi, aadha delivery par, bilkul theek', 'Delivery par baaki payment, sahi plan hai'],
  codeOk: ['Reward code laga, discount mil gaya', 'Wah, code chal gaya', 'Discount lag gaya, party time'],
  codeBad: ['Yeh code nahi chala, ek baar dekh lijiye', 'Code mein shayad galti hai, dobara likhiye', 'Hmm, yeh code mujhe bhi samajh nahi aaya'],
  err: ['Kuch adhoora hai, ek baar check kijiye', 'Ek cheez chhoot gayi hai', 'Form mein kuch missing hai'],
  hdThink: ['Distance naap raha hoon', 'Ruko, map dekh raha hoon', 'Pin code check ho raha hai'],
  hdFar: ['Thoda door hai, WhatsApp par confirm karenge', 'Yeh area 10 km se bahar hai, hum baat karke batayenge', 'Door ka address hai, rasta nikalenge'],
  hdNear: ['Delivery ho jayegi, ghar tak aayega cake', 'Yeh to paas hi hai, jaldi pahunchega', 'Mast, aapke area mein delivery pakki'],
  done: ['Order place ho gaya! Shukriya', 'Order mil gaya, ab kitchen shuru', 'Wah, order pakka, cake ka intezaar shuru'],
  upiPanel: ['Amount dekhiye aur UPI se pay kijiye', 'Payment karte hi cake banna shuru', 'Bas ek payment baaki hai'],
  thanks: ['Shukriya! Reward code aapke liye', 'Feedback ke liye dhanyawaad, code sambhal ke rakhiye', 'Aapne to dil jeet liya'],
  jump: ['Uchhal kood time!', 'Cake ki khushi mein uchhal pada', 'Hop hop hop!'],
  roll: ['Lo, ludhak gaya main', 'Gol gol ghoomta hoon, ball ki tarah', 'Rolling rolling rolling', 'Cake khane ke baad yahi haal hota hai'],
  tongue: ['Eggless hai, par swaad mein koi kami nahi', 'Pehla bite, phir dil, phir order!', 'Halka, soft, aur bilkul fresh', 'Zubaan pe mithas, aankhon mein chamak', 'Ek slice dekhiye, phir kehna nahi'],
  hover: ['Uff, dekh ke hi muh mein paani aa gaya', 'Yeh wala chakhna hai mujhe bhi', 'Soft aur fluffy, dekhte hi pata chal jaata hai', 'Aaj diet cancel, cake pehle'],
  benefit: ['100% eggless, bilkul bhi anda nahi', 'Har cake order ke baad banta hai, freezer ka stock nahi', 'Premium ingredients, halka aur soft swaad', '6 se 12 ghante mein ghar tak delivery, 10 km ke andar', 'Pickup free hai, delivery ka kharcha bachaiye', 'Order karo, feedback do, reward code paao', 'Cake ke saath party ka saara saaman bhi yahin milega'],
  family: ['Mummy ne saalon se sabka birthday manaya, is baar unke liye cake aap mangwaiye', 'Papa kuch bolte nahi, par cake dekh ke unki aankhein sab keh deti hain', 'Bachchon ki ek hansi ke liye ek cake, aur yaadein poori zindagi ki', 'Wife ne poora ghar sambhala, aaj unke naam ek meetha surprise ban-ta hai', 'Wife ka din khaas banana ho, to bas ek cake aur thoda sa waqt kaafi hai', 'Bachche ne poocha, papa cake kab aayega? Aaj hi order kar dijiye', 'Mummy ko bina bataye cake mangwa lijiye, unki aankhein bhar aayengi', 'Papa ne bachpan mein aapka har birthday yaad rakha, is baar aap unka manaiye', 'Bachchon ke chehre par candle ki roshni, yeh pal dobara nahi aata', 'Anniversary par wife ko surprise dijiye, baaki sab hum sambhal lenge', 'Mummy ke haath ka pyaar to nahi la sakte, par unka favourite cake zaroor la sakte hain', 'Ghar ke sab log saath baith ke cake kaatein, wahi sabse badi party hoti hai', 'Bachche ka pehla birthday ho ya papa ka saathva, har pal cake ke saath yaadgaar', 'Wife ko chhota sa surprise dijiye, poora ghar meetha ho jayega', 'Mummy papa ne aapke liye kitni raatein jaage, aaj ek cake unke naam', 'Chhoti bitiya ki farmaish ho ya bete ki zid, ek cake mein dono ki khushi', 'Dadi nani ke chehre ki muskaan ke liye ek meethe cake se zyada kuch nahi chahiye', 'Wife ne kabhi kuch nahi maanga, aaj aap bina maange cake le aaiye'],
  cta: ['Cake ka order abhi dijiye, 6 se 12 ghante mein ghar par', 'Pehli baar? Eggless cakes ka swaad lijiye, pachtayenge nahi'],
}
const S = {
  home: [['Swagat hai!', 'Namaste ji!', 'Aaiye aaiye!', 'Hello hello!'], ['Main Wonder, yahan ka cake guide', 'Aaj kuch meetha ho jaye?', 'Har cake aapke order ke baad banta hai']],
  cakes: [['Uff!', 'Arre wah!', 'Haye, kya nazar hai!', 'Oho!'], ['Yeh sab 100% eggless hain, bina guilt khaiye', 'Kaunsa lun, kaunsa chhodun, dil mushkil mein hai', 'Ek slice, poori party ka jaadu', 'Flavour dekh ke meri neeyat kharab ho gayi']],
  gallery: [['Photos dekh rahe hain?', 'Yeh gallery meri favourite hai.', 'Dekhiye dekhiye!'], ['Har cake haath se banaya hua hai', 'Inmein se koi bhi aapka ho sakta hai', 'Tap karke bada karke dekhiye']],
  made: [['Aapke liye khaas!', 'Custom cake chahiye?'], ['Apna idea batayiye, hum banayenge', 'Design aap sochiye, baaki hum sambhal lenge', 'Message ya photo bhejiye, cake ban jayega']],
  party: [['Party time!', 'Balloons dekhe?', 'Arre wah, party store!'], ['Cake ke saath candles aur banners bhi lijiye', 'Sab kuch ek hi delivery mein aa jayega', 'Poori party ka saaman yahin hai']],
  compare: [['Thoda compare kar lijiye.', 'Hum alag kyun hain?', 'Dekhiye fark!'], ['Har cake order ke baad bante hain, freezer ka stock nahi', 'Premium ingredients aur bilkul eggless', 'Fark taste mein bhi dikhega, ek baar try kijiye']],
  founder: [['Yeh hain humare baker.', 'Kahani sunni hai?', 'Is cake ke peeche ek insaan hai.'], ['Ghar ki kitchen se seedha aapke paas', 'Chhoti si kitchen, bada dil', 'Pyaar se banata hai, isliye swaad alag hai']],
  delivery: [['Delivery ki baat!', 'Kitni door hain aap?', 'PIN daaliye na!'], ['10 km ke andar delivery, 6 se 12 ghante mein', 'Pickup free hai, yaad rakhiye', 'Apna area check kijiye, main wait kar raha hoon']],
  faq: [['Sawal hain?', 'Kuch poochna hai?', 'Doubts clear kijiye.'], ['Zyada tar jawab yahin mil jayenge', 'Na mile to WhatsApp par poochiye', 'Main bhi yahin se seekhta hoon']],
  contact: [['Baat karni hai?', 'Contact wala section!'], ['WhatsApp par seedha message kijiye', 'Hum jaldi reply karte hain', 'Kitchen ka rasta bhi yahin hai']],
  celebration: [['Feedback ka time!', 'Ek chhota sa kaam kijiye.'], ['Apna experience batayiye, reward code milega', 'Reward code ka lalach to banta hai', 'Review dijiye, discount lijiye']],
  plan: [['Plan banana hai?', 'Celebration plan!'], ['Occasion batayiye, hum cake suggest karenge', 'Pehle se plan kijiye, tension free rahiye']],
  flow: [['Dekhiye kaise banta hai cake!', 'Process dekhiye.'], ['Order se delivery tak sab yahan hai', 'Har step par hum aapke saath hain']],
}
const SEC_STATE = { home: 'happy', cakes: 'excited', gallery: 'curious', made: 'curious', party: 'playful', compare: 'curious', founder: 'approving', delivery: 'curious', faq: 'reading', contact: 'happy', celebration: 'excited', plan: 'curious', flow: 'playful' }
const SEC_ID = { home: 'home', cakes: 'cakes', gallery: 'gallery', 'made-for-you': 'made', party: 'party', compare: 'compare', founder: 'founder', delivery: 'delivery', faq: 'faq', contact: 'contact', celebration: 'celebration', plan: 'plan', flow: 'flow' }

const mk = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e }

async function main() {
  try { if (sessionStorage.getItem('wwBuddyOff') === '1') return } catch (e) {}
  const character = window.__WW_CHARACTER__ || (await (await fetch('data/wonder.avatar.json')).json())

  const root = document.createElement('aside')
  root.className = 'ww-buddy'
  root.setAttribute('aria-label', 'Wonder, your cake helper')
  root.innerHTML = '<div class="wrap"><div class="av"><div class="bob"></div></div><button class="x" type="button" aria-label="Hide Wonder">×</button></div><p class="bub" role="status" aria-live="polite"></p>'
  document.body.appendChild(root)
  const av = root.querySelector('.av'), bob = root.querySelector('.bob'), bub = root.querySelector('.bub')
  const avatar = createAvatar(bob, { character, state: 'waking', size: '100%', settleAfterMs: reduce ? 1200 : 8000, ariaLabel: 'Wonder the cake buddy' })

  // Mouth, tongue and drops are drawn on top of the avatar.
  const fx = mk('svg', { viewBox: '0 0 100 100', 'aria-hidden': 'true' }, bob)
  Object.assign(fx.style, { position: 'absolute', left: '0', top: '0', width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' })
  bob.style.position = 'relative'
  const mouth = mk('ellipse', { class: 'mo', cx: 50, cy: 67, rx: 9, ry: 7, fill: '#5b2a2f' }, fx)
  const tg = mk('g', { class: 'tg' }, fx)
  mk('path', { d: 'M43.5 66 Q43 86 50 86 Q57 86 56.5 66 Z', fill: '#ff7a9c' }, tg)
  mk('path', { d: 'M50 69 L50 80', stroke: '#e0587c', 'stroke-width': 1.2, 'stroke-linecap': 'round', fill: 'none' }, tg)
  const drip = (x, y, color) => {
    const c = mk('ellipse', { cx: x, cy: y, rx: 3, ry: 4.2, fill: color || '#49b6f5', stroke: '#ffffff', 'stroke-width': 0.8 }, fx)
    c.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(' + rnd(30, 55) + 'px)', opacity: 0.1 }], { duration: rnd(900, 1300), easing: 'ease-in' }).finished.then(() => c.remove(), () => c.remove())
  }

  // ---------- Position ----------
  let pos = { x: 6, y: 300 }, docked = false, busy = false, asleep = false, lastEvent = 0, lastTouch = Date.now(), lastSay = 0, t1, t2
  const size = () => holderSize()
  const holderSize = () => av.offsetWidth || 70
  const bannerH = () => { const b = document.querySelector('.cc-banner'); const r = b && getComputedStyle(b).display !== 'none' ? b.getBoundingClientRect() : null; return r && r.height > 0 && r.top < innerHeight ? innerHeight - r.top : 0 }
  const bounds = () => ({ minX: 6, maxX: Math.max(6, Math.min(innerWidth - holderSize() - 6, innerWidth * 0.5 - holderSize() / 2)), minY: 72, maxY: Math.max(72, innerHeight - holderSize() - bannerH() - 14) })
  const home = () => { const b = bounds(); return { x: b.minX, y: b.maxY } }
  // Keep the speech bubble on screen: pick the side with more room, cap its width, and drop it below the avatar near the top.
  const fit = (p) => {
    const s = holderSize()
    let right = innerWidth - p.x - s - 16
    if (p.y + s > innerHeight - 180) right = Math.min(right, innerWidth - 112 - p.x - s)  // stop before the WhatsApp/call buttons
    const left = p.x - 16, flip = left > right
    root.classList.toggle('flip', flip)
    root.classList.toggle('below', p.y < 210)
    bub.style.maxWidth = Math.max(140, Math.min(260, flip ? left : right)) + 'px'
  }
  const tx = (p) => Math.round(p.x - (root.classList.contains('flip') ? Math.max(0, root.offsetWidth - holderSize()) : 0))
  const place = (p) => { fit(p); root.style.transform = 'translate3d(' + tx(p) + 'px,' + Math.round(p.y) + 'px,0)' }
  // Keep Wonder off the bottom-right corner where the WhatsApp and call buttons sit.
  const keepOff = (p) => { const s = holderSize(); if (p.x + s > innerWidth - 100 && p.y + s > innerHeight - 180) p.x = Math.max(6, innerWidth - 100 - s); return p }
  function glide(x, y, ms, ease) {
    if (docked) return Promise.resolve()
    const b = bounds(), from = pos
    pos = keepOff({ x: clamp(x, b.minX, b.maxX), y: clamp(y, b.minY, b.maxY) })
    const fromX = tx(from)
    fit(pos)
    const to = 'translate3d(' + tx(pos) + 'px,' + Math.round(pos.y) + 'px,0)'
    if (reduce || !root.animate) { root.style.transform = to; return Promise.resolve() }
    const a = root.animate([{ transform: 'translate3d(' + fromX + 'px,' + Math.round(from.y) + 'px,0)' }, { transform: to }], { duration: ms, easing: ease || 'cubic-bezier(.45,.05,.3,1)' })
    root.style.transform = to
    return a.finished.catch(() => {})
  }
  const spot = () => {
    const b = bounds(), s = holderSize()
    for (let i = 0; i < 12; i++) {
      const p = { x: rnd(b.minX, b.maxX), y: rnd(b.minY, b.maxY) }
      if (!(p.x > innerWidth - s - 96 && p.y > innerHeight - 260) && Math.hypot(p.x - pos.x, p.y - pos.y) > 90) return p
    }
    return home()
  }
  pos = home(); place(pos)

  let touring = false  // true while Wonder is rolling around the screen: no messages then
  // ---------- Speech and mood ----------
  const say = (msg, ms) => {
    if (!msg || touring || docked) return
    bub.textContent = msg; bub.classList.add('show'); lastSay = Date.now()
    clearTimeout(t2); t2 = setTimeout(() => bub.classList.remove('show'), ms || 2800 + msg.length * 55)
  }
  const react = (state, msg, ms = 3200, gesture) => {
    if (docked) return
    asleep = false; lastEvent = lastTouch = Date.now()
    avatar.setState(state)
    if (gesture && !reduce) avatar.poke(gesture)
    say(msg, ms + 700)
    clearTimeout(t1); t1 = setTimeout(() => { if (!busy) avatar.setState('idle') }, ms)
  }

  // ---------- Tricks ----------
  const A = (el, kf, o) => (reduce ? Promise.resolve() : el.animate(kf, o).finished.catch(() => {}))
  const clearAnim = () => { av.getAnimations().forEach((a) => a.cancel()); tg.getAnimations().forEach((a) => a.cancel()); av.style.transform = '' }
  const mouthOn = (tongue) => { mouth.classList.add('on'); if (tongue) tg.classList.add('on') }
  const mouthOff = () => { mouth.classList.remove('on'); tg.classList.remove('on') }

  const tricks = {
    async roam() { avatar.setState(pick(['happy', 'curious', 'playful'])); const s = spot(); await glide(s.x, s.y, rnd(1800, 2800)) },
    async jump(msg) {
      avatar.setState('excited'); if (msg) say(msg)
      const h = Math.min(70, innerHeight * 0.1)
      for (let i = 0; i < 3; i++) await A(av, [{ transform: 'translateY(0) scale(1,1)' }, { transform: 'translateY(0) scale(1.12,.84)', offset: 0.15 }, { transform: 'translateY(' + -h + 'px) scale(.92,1.1)', offset: 0.5 }, { transform: 'translateY(0) scale(1.06,.93)', offset: 0.85 }, { transform: 'translateY(0) scale(1,1)' }], { duration: 720, easing: 'ease-out' })
    },
    async roll() {
      avatar.setState('playful')
      const b = bounds(); let dir = pos.x < innerWidth / 2 ? 1 : -1
      let dx = dir * rnd(120, 200); if (pos.x + dx < b.minX || pos.x + dx > b.maxX) dx = -dx
      const turns = Math.max(1, Math.round(Math.abs(dx) / 110))
      await Promise.all([glide(pos.x + dx, pos.y, 1500, 'ease-in-out'), A(av, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(' + Math.sign(dx) * 360 * turns + 'deg)' }], { duration: 1500, easing: 'ease-in-out' })])
    },
    async tongue(msg) {
      avatar.setState('playful'); if (msg) say(msg, 6200); mouthOn(true)
      const wob = A(av, [{ transform: 'rotate(0)' }, { transform: 'rotate(-3deg)' }, { transform: 'rotate(3deg)' }, { transform: 'rotate(0)' }], { duration: 900, iterations: 3 })
      for (let i = 0; i < 3; i++) await A(tg, [{ transform: 'translateY(0) rotate(0) scaleX(1)' }, { transform: 'translateY(10%) rotate(-28deg) scaleX(.6)' }, { transform: 'translateY(14%) rotate(28deg) scaleX(-.6)' }, { transform: 'translateY(10%) rotate(-20deg) scaleX(1)' }, { transform: 'translateY(0) rotate(0) scaleX(1)' }], { duration: 900, easing: 'ease-in-out' })
      await wob
    },
    async drool(msg) {
      avatar.setState('excited'); say(msg || L('hover'), 4200); mouthOn(true)
      A(tg, [{ transform: 'translateY(0) scaleY(1)' }, { transform: 'translateY(6%) scaleY(1.18)' }, { transform: 'translateY(0) scaleY(1)' }], { duration: 650, iterations: 6, easing: 'ease-in-out' })
      const t0 = Date.now()
      while (Date.now() - t0 < 3800) { drip(rnd(43, 57), 70); await sleep(rnd(160, 290)) }
    },
    async tour() {
      touring = true; clearTimeout(t2); bub.classList.remove('show')
      avatar.setState('playful')
      const b = bounds(), cy = (b.minY + b.maxY) / 2
      const stops = [{ x: b.maxX, y: b.minY }, { x: b.minX, y: b.minY }, { x: b.maxX, y: cy }, { x: b.minX, y: cy }, { x: b.minX + (b.maxX - b.minX) * 0.5, y: b.maxY * 0.7 + b.minY * 0.3 }]
      for (const st of stops) {
        await Promise.all([
          glide(st.x, st.y, 800, 'ease-in-out'),
          A(av, [{ transform: 'translateY(0) rotate(0deg)' }, { transform: 'translateY(-22px) rotate(180deg)' }, { transform: 'translateY(0) rotate(360deg)' }], { duration: 800, easing: 'ease-in-out' })
        ])
      }
      const h = home()
      await glide(h.x, h.y, 900)
      touring = false
      avatar.setState('idle')
    },
    async spin() { avatar.setState('happy'); avatar.poke('spin', 2); await sleep(1500) },
    async dance() { avatar.setState('celebrate'); await sleep(2200) },
  }
  async function run(name, arg) {
    if (busy || !tricks[name]) return
    busy = true; lastTouch = Date.now()
    try { await tricks[name](arg) } catch (e) {} finally {
      clearAnim(); mouthOff(); avatar.setState('idle'); busy = false
    }
  }
  const RANDOM = ['tour', 'jump', 'tour', 'roll', 'jump', 'tongue', 'spin', 'dance']

  // Float all the time, and head for a new spot or a trick every few seconds.
  if (!reduce && bob.animate) bob.animate([{ transform: 'translateY(0) rotate(-3deg)' }, { transform: 'translateY(-10px) rotate(3deg)' }], { duration: 2400, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' })

  // Commentary never stops: one line, then a 2-second pause, then the next line.
  // Lines follow the section the visitor is looking at (curSec), while they scroll or sit still.
  // A line for a real action (tap, cart, form) wins for a few seconds, then the loop carries on.
  const TALK_ON = 5000, TALK_GAP = 2000
  // Cycle: avatar stays bottom-left and delivers 5 messages (5s each, 2s pause between).
  // Then it floats around the left side for about 4-5 seconds with no message, and returns to bottom-left.
  let delivered = 0
  const talk = async () => {
    if (document.visibilityState !== 'visible' || docked || touring || busy || Date.now() < tapHold || Date.now() - lastEvent < 3000) return setTimeout(talk, 1200)
    avatar.poke('bounce', 1)
    const sec = curSec || 'home'
    const line = docked ? L('cartOpen') : (Math.random() < 0.6 ? SEC(sec) : L(pick(['benefit', 'cta', 'family', 'family', 'family'])))
    const hold = line.length > 70 ? 6500 : TALK_ON
    say(line, hold)
    delivered++
    await sleep(hold)                             // message stays up for 5 to 6.5 seconds
    if (delivered < 5) return setTimeout(talk, TALK_GAP)   // 2-second pause, next message
    delivered = 0
    await sleep(TALK_GAP)
    if (!docked) await run('tour')                // float about 4-5 seconds, no messages
    setTimeout(talk, 300)                         // back at bottom-left, cycle restarts
  }
  setTimeout(talk, 7000)

  // Sleep when nobody is around, wake when somebody is.
  setInterval(() => { if (!asleep && !busy && Date.now() - lastTouch > 45000) { asleep = true; avatar.setState('sleeping') } }, 5000)
  const wake = () => { if (asleep) { asleep = false; avatar.setState('waking'); setTimeout(() => !busy && avatar.setState('idle'), 1500) } lastTouch = Date.now() }
  let lastScroll = 0
  addEventListener('scroll', () => { lastScroll = Date.now(); wake() }, { passive: true })
  ;['pointerdown', 'keydown'].forEach((e) => addEventListener(e, wake, { passive: true }))

  let tapHold = 0
  const heartBurst = (n = 7, spread = 1) => {
    if (reduce) return
    const syms = ['❤️', '💖', '✨', '🎉', '💕']
    for (let i = 0; i < n; i++) {
      const e = document.createElement('span')
      e.textContent = pick(syms)
      e.style.cssText = 'position:absolute;left:50%;top:0;pointer-events:none;font-size:' + Math.round(rnd(12, 20)) + 'px'
      root.querySelector('.wrap').appendChild(e)
      const dx = rnd(-42, 42) * spread, dy = rnd(-70, -110) * spread
      e.animate([{ transform: 'translate(-50%,0) scale(.6)', opacity: 1 }, { transform: 'translate(calc(-50% + ' + dx + 'px),' + dy + 'px) scale(1.1)', opacity: 0 }], { duration: rnd(1100, 1500), easing: 'ease-out' }).finished.then(() => e.remove(), () => e.remove())
    }
  }
  holderEvents()
  function holderEvents() {
    root.querySelector('.x').addEventListener('click', () => {
      try { sessionStorage.setItem('wwBuddyOff', '1') } catch (e) {}
      avatar.destroy(); root.remove()
    })
    bub.addEventListener('click', () => { const g = $('shopGrid'); if (g) g.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }) })
    av.addEventListener('click', () => {
      if (docked) return react('happy', L('tap'), 2200)
      tapHold = Date.now() + 5000                 // cycle pauses for 5 seconds after a tap
      heartBurst()
      if (!touring) say(L('tap'), 5000)           // the tap message stays for 5 seconds
    })
  }
  addEventListener('resize', () => { const b = bounds(); pos = docked ? { x: b.minX, y: b.maxY } : keepOff({ x: clamp(pos.x, b.minX, b.maxX), y: clamp(pos.y, b.minY, b.maxY) }); place(pos) })
  setInterval(() => { const b = bounds(); if (!busy && pos.y > b.maxY + 2) glide(pos.x, b.maxY, 600) }, 800)  // stay above the cookie banner

  const watch = (el, fn, opts) => { if (el) new MutationObserver(fn).observe(el, opts || { childList: true, characterData: true, subtree: true }) }
  const txt = (el) => (el ? el.textContent.trim() : '')

  setTimeout(() => react('happy', L('hello'), 4200), 1500)

  // ---------- Sections: a fresh comment every time a section comes into view ----------
  let lastSec = 0, lastHover = 0
  // Each section has its own stunt. It only plays once the visitor has stopped scrolling on that section.
  const SEC_STUNT = { home: 'jump', cakes: 'drool', gallery: 'spin', made: 'dance', party: 'dance', compare: 'tongue', founder: 'roll', delivery: 'tour', faq: 'jump', contact: 'spin', celebration: 'dance', plan: 'tongue', flow: 'roll' }
  let curSec = null, settleT = null
  const arm = (key) => { clearTimeout(settleT); settleT = setTimeout(() => { if (curSec !== key) return; if (Date.now() - lastScroll < 1000) return arm(key); playSection(key) }, 1200) }
  const playSection = (key) => {
    if (docked || busy || reduce || curSec !== key || Date.now() - lastScroll < 1000) return
    if (key === 'cakes') return run('drool', SEC('cakes'))
    const t = SEC_STUNT[key]
    if (t === 'jump' || t === 'roll' || t === 'tongue') return run(t, SEC(key))
    react(SEC_STATE[key], SEC(key), 3800)
    setTimeout(() => run(t), 400)
  }
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((list) => list.forEach((en) => {
      const key = SEC_ID[en.target.id]
      if (!key || docked) return
      if (en.isIntersecting && en.intersectionRatio >= 0.35) {
        if (curSec === key) return
        curSec = key
        arm(key)
      } else if (curSec === key) {
        curSec = null; clearTimeout(settleT)
      }
    }), { threshold: [0, 0.35] })
    Object.keys(SEC_ID).forEach((id) => $(id) && io.observe($(id)))
  }
  document.addEventListener('pointerover', (e) => {
    if (docked || busy || reduce || Date.now() - lastHover < 14000 || Date.now() - lastEvent < 2500 || Date.now() - lastScroll < 1500) return
    if (e.target.closest && e.target.closest('#shopGrid > *, .gallery-item, .cat-card')) { lastHover = Date.now(); run('drool', L('hover')) }
  }, { passive: true })

  // ---------- Cart ----------
  let count = Number(txt($('cartCount'))) || 0, lastItem = '', lastItemAt = 0
  watch($('toast'), () => { const m = txt($('toast')).match(/^(.+) added to cart/i); if (m) { lastItem = m[1]; lastItemAt = Date.now() } })
  watch($('cartCount'), () => {
    const n = Number(txt($('cartCount'))) || 0
    setTimeout(() => {
      const item = Date.now() - lastItemAt < 2500 ? lastItem : ''
      if (n > count) react('excited', L('cartAdd', item), 3000, 'bounce')
      else if (n === 0 && count > 0) react('sad', L('cartEmpty'), 2800)
      else if (n < count) react('curious', L('cartDown'), 2200)
      count = n
    }, 60)
  })
  const drawer = $('cartDrawer'), checkout = $('viewCheckout')
  // In the cart Wonder stays out of the way: hidden while it is open. He only pops up for a mistake
  // in the form, and once for the happy ending when the order is placed.
  let popT = null, ending = false
  const hideRoot = () => { clearTimeout(popT); clearTimeout(t1); clearTimeout(t2); bub.classList.remove('show'); root.classList.remove('popup'); root.style.visibility = 'hidden' }
  const dock = (on) => {
    docked = on; ending = false; root.classList.toggle('with-cart', on)
    if (on) { hideRoot(); return }
    root.getAnimations().forEach((a) => a.cancel())
    root.style.visibility = ''; root.classList.remove('popup')
    pos = home(); place(pos); avatar.setState('idle'); lastEvent = Date.now()
  }
  watch(drawer, () => { const open = drawer.classList.contains('open'); if (open !== docked) dock(open) }, { attributes: true, attributeFilter: ['class'] })

  // ---------- Checkout: Wonder only speaks up when something is missing or wrong ----------
  const ERR = {
    name: ['Naam bhariye, taaki cake par likh sakein', 'Pehle apna naam daaliye', 'Naam ka khana khaali reh gaya'],
    phone: ['Sahi phone number daaliye, 10 digit ka', 'Phone number adhoora hai, ek baar dekh lijiye', 'WhatsApp wala number sahi daaliye'],
    addr: ['Delivery ka poora address ya location bhariye', 'Landmark ke saath address likhiye, rider ko aasani hogi', 'Location batayiye, cake kahan pahunchana hai?'],
    date: ['Delivery ya pickup ki date chuniye', 'Date select kijiye, phir order pakka', 'Kab chahiye cake? Date chuniye'],
    code: ['Yeh reward code nahi chal raha, ek baar check kijiye', 'Code sahi nahi lag raha, dobara likhiye ya hata dijiye'],
    save: ['Order abhi save nahi hua, dobara try kijiye ya WhatsApp par bhej dijiye', 'Net ka chakkar lagta hai, ek baar phir dabaiye'],
  }
  const errKind = (m) => (/name/i.test(m) ? 'name' : /phone|mobile|number/i.test(m) ? 'phone' : /address|location|pin|landmark/i.test(m) ? 'addr' : /date|time|slot/i.test(m) ? 'date' : /code/i.test(m) ? 'code' : 'save')
  const pop = (msg, target, ms = 4800) => {
    if (!docked || ending) return
    clearTimeout(popT); clearTimeout(t2)
    root.getAnimations().forEach((a) => a.cancel())
    const s = holderSize(), r = target && target.getBoundingClientRect()
    const ok = r && r.width > 0 && r.bottom > 0 && r.top < innerHeight
    pos = ok ? { x: clamp(r.left, 6, innerWidth - s - 6), y: clamp(r.top - s - 10, 72, innerHeight - s - 14) } : home()
    bub.textContent = msg; root.classList.add('popup'); root.style.visibility = ''
    place(pos)
    avatar.setState('confused'); bub.classList.add('show')
    popT = setTimeout(hideRoot, ms)
  }
  const finale = async () => {
    if (!docked || ending) return
    ending = true; clearTimeout(popT); root.getAnimations().forEach((a) => a.cancel())
    const t = $('doneTitle') || $('doneId'), r = t && t.getBoundingClientRect(), s = holderSize()
    // Beside the tick at the top of the confirmation, so no text is covered.
    pos = { x: innerWidth - s - 24, y: clamp(r && r.width > 0 ? r.top - s - 40 : 100, 72, innerHeight - s - 120) }
    bub.textContent = L('done'); root.classList.add('popup'); root.style.visibility = ''
    place(pos)
    avatar.setState('celebrate'); bub.classList.add('show')
    heartBurst(16, 1.6); await sleep(900); heartBurst(14, 1.8); await sleep(1900)
    bub.classList.remove('show')
    if (!reduce) await root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450 }).finished.catch(() => {})
    root.style.visibility = 'hidden'; root.classList.remove('popup')
  }
  watch($('coCodeMsg'), () => { const m = txt($('coCodeMsg')); if (m && /not|invalid|used|expired|wrong|galat/i.test(m)) pop(fresh(() => pick(ERR.code) + ' ' + pick(['🙏', '😊', '🙈'])), $('coCodeMsg')) })
  watch($('coErr'), () => { const m = txt($('coErr')); if (m) pop(fresh(() => pick(ERR[errKind(m)]) + ' ' + pick(['🙏', '😊', '🙈'])), $('coErr')) })

  // ---------- Delivery check ----------
  const hdBtn = $('hdCheckBtn')
  if (hdBtn) hdBtn.addEventListener('click', () => react('thinking', L('hdThink'), 2600))
  watch($('hdResult'), () => {
    const m = txt($('hdResult')); if (!m) return
    /beyond|outside|more than|confirm the charge|WhatsApp/i.test(m) ? react('curious', L('hdFar'), 3600) : react('excited', L('hdNear'), 3200, 'bounce')
  })

  // ---------- Order, payment, feedback ----------
  watch($('doneId'), () => { if (txt($('doneId'))) finale() })
  const upi = $('upiPanel')
  watch(upi, () => { if (!upi.hidden) react('approving', L('upiPanel'), 4200) }, { attributes: true, attributeFilter: ['hidden'] })
  const cs = $('celebSuccess')
  watch(cs, () => { if (cs.classList.contains('show')) react('proud', L('thanks'), 5200, 'spin') }, { attributes: true, attributeFilter: ['class'] })

  window.WonderBuddy = { run, say: (m) => say(m) }
}
if (document.readyState === 'complete') main(); else addEventListener('load', () => (window.requestIdleCallback || setTimeout)(main))
