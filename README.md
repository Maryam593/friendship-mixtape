# 💗 friendship-mixtape

> A cute, doodle-style birthday mixtape made with plain **HTML + CSS + JS**. Type your name and your friend's name, and the page composes a little song from both names. 🎀

![design inspiration](doodle.PNG)

---

## ✨ What's inside

| Sticker | What it is |
|---|---|
| 🩷 **Pink grid** | Background made of tiny white vertical + horizontal line divs |
| 💬 **PLAY / COOL bubbles** | Tilted speech-bubble stickers with bold text |
| ⭐ **Starbursts** | 12-point stars cut out with `clip-path: polygon()` |
| 🎵 **Mixtape player** | Window with a title bar, colored dots, `_ □ x` controls |
| 🎚️ **Progress slider** | A real, draggable `<input type="range">` that follows the song |
| ⏮ ▶ ⏭ **Buttons** | Play / pause and three tracks to skip between |
| 🌼 **Daisy flower** | 12 petals placed with `rotate()` + `translateY()`, spins while music plays |
| 💌 **Heart bubble** | A heart made from two circles and a rotated square |
| 👾 **Pixel hearts** | Pixel art drawn with one tiny box and 27 `box-shadow` copies, bouncing on every note |
| 🎂 **Birthday card** | Asks for both names, then shows a Happy Birthday message |

## 🎹 How the music works

There are no mp3 files. Every sound is made live by the browser's **Web Audio API**:

1. Each letter of a name becomes a number (`a` = 97...), and that number picks a note from a **pentatonic scale** (C D E G A), so every name sounds sweet.
2. **Your name** plays the melody (a `square` wave, very 8-bit 👾) and **your friend's name** plays the bass (a `triangle` wave).
3. Spaces become little rests. The shorter name loops so both layers play together.
4. Same names = the same song every time. It's *your* friendship's song 💗

## 🔗 Send it to a friend

After you make a mixtape, the link holds both names, like `index.html?from=Ali&to=Sara`.
Press **copy link to send**, share it, and your friend lands straight on their birthday message. 🎁

## 🎬 Video music card

Press **get your card 💿** under the player:

- **Tap the card** to play its song right there. The sound wave fills up with pink as the song plays.
- **download video 🎬** records the card with its song (about 16 seconds) and saves it as an `.mp4` (or `.webm` on some browsers).
- It's sized 1080×1350, ready for WhatsApp, Instagram or a story. Your friend taps it and hears their song. 💗
- Keep the tab open while it records!

## 🚧 Coming soon

- [ ] `_ □ x` window buttons that actually work
- [ ] Looks nice on phones too (responsive)
- [ ] Star outlines

## 🎀 How to run

No installs, no build — just open it:

1. Download / clone this folder
2. Double-click **`index.html`**
3. Enjoy the mixtape 💿

## 📁 Files

```
friendship-mixtape/
├── index.html   → the page structure
├── style.css    → all the cute styling
├── script.js    → names, music and buttons
└── doodle.PNG   → the design reference
```

## 🧠 Things I learned while making this

- `position: absolute` + `position: relative` to layer stickers on top of the grid
- `overflow: hidden` can hide things you *didn't* mean to hide 👀
- `clip-path` to cut shapes like stars
- One `transform` line can hold both `translate()` and `rotate()`
- Child styles win over parent styles (hello, `font-size` bug!)
- Styling a range slider with `::-webkit-slider-thumb` and `::-moz-range-thumb`
- Pixel art with many `box-shadow`s, and an outline that follows the shape with `filter: drop-shadow()`
- Making music with an oscillator, and scheduling notes on the audio clock
- Drawing on a `<canvas>` and recording it with sound using `MediaRecorder`

---

<!-- taggie -->
Made with ❤ for friendship
<!-- /taggie -->
