# Real device checklist: Whisk & Wonder Cakes (phone-only test)

Works with a phone only. Use the phone's own browser for every test. Mark each line PASS, FAIL or NOTE.
Record anything odd with a screenshot or a screen recording.

## 0. Devices to test (minimum)
- [ ] Android, mid-range (2-4 GB RAM), Chrome. Example: any Redmi, Realme, Samsung A-series.
- [ ] Android, budget (2 GB RAM or less), Chrome. This is the most important test: it shows slow-phone performance.
- [ ] iPhone (iOS 16 or newer), Safari.
- [ ] Samsung Internet (common on Samsung phones).
- [ ] Optional: a tablet, to check the layout between phone and desktop.

## 1. Before you start
- [ ] Open the site on the live URL after deploy (not a file on your phone).
- [ ] Clear the browser cache once, then reload.
- [ ] Turn off data saver and battery saver for the first test, then turn them on and test again.

## 2. Load and first impression
- [ ] Preloader logo shows a liquid shine, then the hero appears within about 2 seconds on Wi-Fi.
- [ ] Hero text is readable, not hidden behind the confetti particles.
- [ ] No white flash or layout jump while loading.
- [ ] On 4G/3G (turn on throttling if your phone allows), the page is usable within about 5 seconds.
- [ ] Run PageSpeed Insights (pagespeed.web.dev) on your phone browser. Note the Mobile performance and Accessibility scores.

## 3. Scrolling and motion (most important for "smooth")
- [ ] Scroll the whole page top to bottom. No stutter, no jump, no pages stuck.
- [ ] Desktop-style smooth scroll does not fight phone touch scroll (phones should keep native momentum).
- [ ] Tap an item in the menu. The page glides to that section, not a sudden jump.
- [ ] Section headings rise in as you scroll, and do not flicker.
- [ ] Hero image moves a little (parallax) as you scroll away from it.
- [ ] The "Signature" section copy and cake fade up as you reach it.

## 4. 3D features
- [ ] Hero confetti: visible and smooth, it does not heat the phone up after 30 seconds on screen.
- [ ] Signature 3D cake: drag horizontally, it turns with a little inertia. Vertical drag still scrolls the page.
- [ ] Signature cake looks glossy and not black. Note the phone model if colours look off.
- [ ] Party store 3D table: drag to turn. Balloons and candles are visible, not clipped.
- [ ] Gallery 3D ring: swipe left and right. The front photo snaps into place.
- [ ] Tap a side photo in the gallery. It moves to the front and does not open the lightbox.
- [ ] Tap the front photo. The lightbox opens with the right cake name and details.
- [ ] Gallery caption under the ring shows the right name for the front photo.
- [ ] Card tilt is only on desktop (it should not run on touch).
- [ ] Turn on "Remove animations" (Android: Settings > Accessibility > Remove animations, or iPhone: Settings > Accessibility > Motion > Reduce Motion). Reload. The 3D pieces should show as still images and the page should still work.

## 5. Buttons, links and the order flow
- [ ] Tap "Order on WhatsApp" (cake section, hero, nav). WhatsApp opens with the right message.
- [ ] Tap "Call Now". The phone dialer opens with the right number.
- [ ] Cart: add a cake, open the cart drawer, scroll inside it. The page behind must not scroll.
- [ ] Lightbox: open a photo, scroll inside it. The page behind must not scroll. Close it with the X and by tapping outside.
- [ ] Check delivery distance: type a village or PIN code. Result appears.
- [ ] Payment choice shows UPI and COD where you expect them.
- [ ] Submit a test order only if the owner agrees. Otherwise stop before the final step.

## 6. Forms and feedback
- [ ] Feedback form: required fields show a message if empty.
- [ ] Phone field accepts +91 numbers with spaces.
- [ ] Keyboard does not cover the field you are typing in (scroll to it if needed).
- [ ] Rating stars can be tapped.

## 7. Accessibility on the phone
- [ ] Turn on TalkBack (Android) or VoiceOver (iPhone). Swipe through the hero, one section and the gallery. Each button and photo should be announced with a name.
- [ ] Set the phone's font size to large. Text should grow and nothing should overlap or get cut off.
- [ ] Zoom the browser to 200%. The page should still work and read in one column.
- [ ] Dark mode on the phone: check the text is still readable.
- [ ] Use the 3D cake with arrow keys if you have an external keyboard. Arrow keys should turn it.

## 8. Layout and visual polish
- [ ] Portrait and landscape both look right. Note any overlapping items.
- [ ] Sticky header stays at the top and does not cover section titles when you jump to a section.
- [ ] Floating WhatsApp and call buttons do not cover the Order buttons at the bottom.
- [ ] Footer links open the Privacy and Terms pages.
- [ ] No text reads as broken boxes (missing fonts).

## 9. Battery and heat check (budget phone)
- [ ] Keep the page open on the 3D cake for 2 minutes. Phone should not get very hot.
- [ ] Scroll away from the 3D sections. The confetti and cake should stop animating (their pages go quiet).

## 10. How to report a problem
Send this for each FAIL:
- Device model, Android or iOS version, browser name and version
- Section name and the step that failed
- What you expected, and what happened
- A screenshot or short screen recording
- Whether it happens every time, or only sometimes

## Sign-off
- [ ] All sections above tested on at least two devices, including one budget phone.
- [ ] Every FAIL is either fixed or written down with a decision (for example "accept", "fix later").
- [ ] The owner has approved the final look.
