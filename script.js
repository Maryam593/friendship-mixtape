// slider chalao to bhara hua hissa (gulabi) bhi saath chale
const bar = document.querySelector('.progress-bar');
function updateFill() {
    bar.style.setProperty('--fill', bar.value + '%');
}
bar.addEventListener('input', updateFill);
updateFill();

// ---------- intro: naam lo, phir birthday message ----------
const intro = document.querySelector('#intro');
const nameStep = document.querySelector('#name-step');
const messageStep = document.querySelector('#message-step');
const fromInput = document.querySelector('#from-name');
const toInput = document.querySelector('#to-name');
const introError = document.querySelector('#intro-error');
const listenButton = document.querySelector('#listen-button');
const playerTitle = document.querySelector('#player-title');

// dono naam yahan yaad rahenge - dhun inhi se banegi
let fromName = '';
let toName = '';

// screen 1 -> screen 2
function showMessage() {
    document.querySelector('#msg-to').textContent = toName;
    document.querySelector('#msg-from').textContent = fromName;
    playerTitle.textContent = fromName + ' 💗 ' + toName;
    nameStep.classList.add('hidden');
    messageStep.classList.remove('hidden');
}

nameStep.addEventListener('submit', function (event) {
    event.preventDefault();               // form page reload na kare
    fromName = fromInput.value.trim();    // aage peeche ke space hatao
    toName = toInput.value.trim();

    if (fromName === '' || toName === '') {
        introError.textContent = 'dono naam to likho! 😄';
        return;
    }
    introError.textContent = '';
    saveNamesInLink();
    showMessage();
});

// ---------- share link: naam link mein (?from=...&to=...) ----------
// dost ko ye link bhejo - wo kholegi to seedha birthday message aayega
function saveNamesInLink() {
    const params = new URLSearchParams({ from: fromName, to: toName });
    try {
        history.replaceState(null, '', '?' + params.toString());   // page reload kiye baghair address badlo
    } catch (error) {
        // kuch browsers file:// par ye nahi karne dete - koi baat nahi
    }
}

// page khulte hi dekho: link mein naam hain?
const linkParams = new URLSearchParams(location.search);
const linkFrom = (linkParams.get('from') || '').trim().slice(0, 20);
const linkTo = (linkParams.get('to') || '').trim().slice(0, 20);
if (linkFrom !== '' && linkTo !== '') {
    fromName = linkFrom;
    toName = linkTo;
    showMessage();
}

const copyLinkButton = document.querySelector('#copy-link');
copyLinkButton.addEventListener('click', async function () {
    try {
        await navigator.clipboard.writeText(location.href);
        copyLinkButton.textContent = 'copied! now send it 💌';
    } catch (error) {
        copyLinkButton.textContent = 'copy the link from the address bar ☝';
    }
});

// screen 2 -> player (aur gaana shuru!)
listenButton.addEventListener('click', function () {
    intro.classList.add('hidden');
    play();
});

fromInput.focus();

// ---------- mixtape: naamon se dhun (Web Audio oscillator) ----------
const playButton = document.querySelector('.play-button');
const playIcon = playButton.querySelector('span');

// pentatonic scale: sirf ye 5 sur (C D E G A) - kisi bhi tarteeb mein meethe lagte hain
const SCALE = [0, 2, 4, 7, 9];
const BASE_FREQ = 261.63;    // C4 - "Sa" ki frequency

// naam -> suron ki list. har harf ka number -> ek sur. space = chup (null)
function nameToNotes(name, octave) {
    const notes = [];
    for (const letter of name.toLowerCase()) {
        if (letter.trim() === '') {
            notes.push(null);                      // space = khamoshi
            continue;
        }
        const code = letter.codePointAt(0);        // a = 97, b = 98 ... (Urdu harf bhi chalein ge)
        const sur = SCALE[code % 5];               // 5 suron mein se ek
        const upar = Math.floor(code / 5) % 2;     // kabhi kabhi ek octave upar
        notes.push(sur + 12 * (octave + upar));
    }
    return notes;
}

// sur (semitones) -> frequency (Hz). har 12 semitone par frequency double
function toFreq(semitones) {
    return BASE_FREQ * Math.pow(2, semitones / 12);
}

// mixtape mein 3 tracks - har ek dono naamon se, magar alag andaaz mein
const TRACK_COUNT = 3;

function makeTrack(index) {
    if (index === 0) {
        // track 1: tumhara naam = upar wali dhun, dost ka naam = neeche wala bass
        return {
            layers: [
                { notes: nameToNotes(fromName, 1), type: 'square', volume: 0.07, every: 1 },
                { notes: nameToNotes(toName, -1), type: 'triangle', volume: 0.25, every: 2 },
            ],
            stepTime: 0.25,    // har step kitne second ka
            length: 64,        // kitne steps ka gaana
        };
    }
    if (index === 1) {
        // track 2: ulta - dost ki dhun upar, tumhara bass neeche, thora tez
        return {
            layers: [
                { notes: nameToNotes(toName, 1), type: 'square', volume: 0.07, every: 1 },
                { notes: nameToNotes(fromName, -1), type: 'triangle', volume: 0.25, every: 2 },
            ],
            stepTime: 0.2,
            length: 64,
        };
    }
    // track 3: lori (lullaby) - dono naam ek saath, naram sine awaaz, dheere
    const together = fromName + ' ' + toName;
    return {
        layers: [
            { notes: nameToNotes(together, 1), type: 'sine', volume: 0.18, every: 1 },
            { notes: nameToNotes(together, -1).reverse(), type: 'triangle', volume: 0.2, every: 4 },
        ],
        stepTime: 0.35,
        length: 48,
    };
}

let trackIndex = 0;

// track badlo (0, 1, 2 - aakhri ke baad wapas pehla)
function changeTrack(index) {
    trackIndex = (index + TRACK_COUNT) % TRACK_COUNT;
    track = makeTrack(trackIndex);
    currentStep = 0;
    playerTitle.textContent = fromName + ' 💗 ' + toName + ' · ' + (trackIndex + 1) + '/' + TRACK_COUNT;
    updateProgress();
}

let audioCtx = null;       // speaker ka switch
let master = null;         // poore gaane ka volume knob
let track = null;
let isPlaying = false;
let currentStep = 0;
let nextStepTime = 0;      // agla step kis waqt bajna hai (audio ki ghari mein)
let timerId = null;

function setupAudio() {
    if (audioCtx) return;  // pehle se bana hai to dobara nahi
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    master = audioCtx.createGain();
    master.gain.value = 0.6;
    master.connect(audioCtx.destination);
}

// ek sur bajao: oscillator (taar) -> gain (volume) -> master -> speaker
function playNote(freq, time, duration, type, volume) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    // dheere se shuru aur dheere se band - warna "tik" ki awaaz aati hai
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(time);
    osc.stop(time + duration + 0.05);
    return osc;            // card wala gaana beech mein rokna ho to kaam aaye
}

// ek step par har layer ka sur bajao
// (whichTrack: kaun sa gaana - player ka ya card ka. bounce: pixel dil uchhlein ya nahi)
function playStep(step, time, whichTrack = track, bounce = true) {
    const played = [];
    whichTrack.layers.forEach(function (layer, layerNumber) {
        if (step % layer.every !== 0) return;     // bass har doosre step par
        const index = Math.floor(step / layer.every) % layer.notes.length;  // chhota naam dobara se (loop)
        const note = layer.notes[index];
        if (note === null) return;                // khamoshi
        played.push(playNote(toFreq(note), time, whichTrack.stepTime * layer.every * 0.9, layer.type, layer.volume));
        if (bounce && layerNumber === 0) {
            bounceHeart(step % pixelHearts.length, time);   // upar wali dhun ke har sur par ek dil uchhle
        }
    });
    return played;
}

// pixel dil ko theek usi waqt uchhalo jab sur baje
const pixelHearts = document.querySelectorAll('.pixel-heart');
function bounceHeart(number, time) {
    const wait = (time - audioCtx.currentTime) * 1000;   // sur kitne ms baad bajega
    setTimeout(function () {
        const heart = pixelHearts[number];
        heart.classList.remove('beat');
        void heart.offsetWidth;            // browser ko animation dobara shuru karne do
        heart.classList.add('beat');
    }, wait);
}

const flower = document.querySelector('.flower');

// har 25ms dekho: agle 0.1 second mein jo sur aane hain unhein pehle se tay kar do
// (setInterval akela theek waqt par nahi chalta, audio ki ghari bilkul theek chalti hai)
function scheduler() {
    while (nextStepTime < audioCtx.currentTime + 0.1) {
        playStep(currentStep, nextStepTime);
        nextStepTime += track.stepTime;
        currentStep++;
        if (currentStep >= track.length) {
            changeTrack(trackIndex + 1);           // gaana khatam - agla track
        }
    }
    updateProgress();
}

// progress bar: kitne steps baj chuke = kitna % bhara
function updateProgress() {
    bar.value = (currentStep / track.length) * 100;
    updateFill();
}

// slider ghaseeto to gaana bhi wahin pahunch jaye
bar.addEventListener('input', function () {
    if (!track) return;
    currentStep = Math.min(track.length - 1, Math.round((bar.value / 100) * track.length));
});

function play() {
    if (fromName === '' || toName === '') return;
    setupAudio();
    audioCtx.resume();
    if (!track) changeTrack(0);
    isPlaying = true;
    nextStepTime = Math.max(nextStepTime, audioCtx.currentTime + 0.05);
    timerId = setInterval(scheduler, 25);
    playIcon.textContent = '❚❚';
    playButton.classList.add('is-playing');
    flower.classList.add('spinning');
}

function pause() {
    isPlaying = false;
    clearInterval(timerId);
    audioCtx.suspend();    // ghari rok do - wapas chalao to wahin se
    playIcon.textContent = '▶';
    playButton.classList.remove('is-playing');
    flower.classList.remove('spinning');
}

playButton.addEventListener('click', function () {
    if (isPlaying) {
        pause();
    } else {
        play();
    }
});

// ⏮ pichhla track, ⏭ agla track
document.querySelector('.previous-button').addEventListener('click', function () {
    if (fromName === '') return;
    changeTrack(trackIndex - 1);
});
document.querySelector('.next-button').addEventListener('click', function () {
    if (fromName === '') return;
    changeTrack(trackIndex + 1);
});

// ---------- music card: naamon ki dhun se bani tasveer (canvas) ----------
const cardButton = document.querySelector('#card-button');
const cardPopup = document.querySelector('#card-popup');
const cardCanvas = document.querySelector('#card-canvas');
const cardClose = document.querySelector('#card-close');

// ---- black & white card ke rang ----
const INK = '#ececec';          // safed (baja hua hissa, likhai)
const SMOKE = '#7d7d7d';        // grey (abhi nahi baja)

// film jaisa grain - ek baar bana kar yaad rakho (har frame mein dobara banana mehnga hai)
let grainCanvas = null;
function getGrain(W, H) {
    if (grainCanvas) return grainCanvas;
    grainCanvas = document.createElement('canvas');
    grainCanvas.width = W;
    grainCanvas.height = H;
    const g = grainCanvas.getContext('2d');
    const image = g.createImageData(W, H);
    for (let i = 0; i < image.data.length; i += 4) {
        const shade = Math.random() * 255;
        image.data[i] = image.data[i + 1] = image.data[i + 2] = shade;
        image.data[i + 3] = Math.random() * 28;      // bohat halka - bas thori si "film" feel
    }
    g.putImageData(image, 0, 0);
    return grainCanvas;
}

// lamba naam ho to font chhota karte jao jab tak jagah mein na aa jaye
function fitText(c, text, maxWidth, size, weight, spacing = 0) {
    do {
        c.font = weight + ' ' + size + 'px system-ui, "Segoe UI", sans-serif';
        size -= 4;
    } while (spacedWidth(c, text, spacing) > maxWidth && size > 20);
}

// harfon ke beech jagah - "h a p p y" jaisa aesthetic look
function spacedWidth(c, text, spacing) {
    const letters = [...text];
    return letters.reduce(function (sum, l) { return sum + c.measureText(l).width; }, 0) + spacing * (letters.length - 1);
}
function drawSpaced(c, text, centerX, y, spacing) {
    let x = centerX - spacedWidth(c, text, spacing) / 2;
    c.textAlign = 'left';
    for (const letter of text) {
        c.fillText(letter, x, y);
        x += c.measureText(letter).width + spacing;
    }
    c.textAlign = 'center';
}

// sound wave: dono naamon ke sur -> lehar kahan oonchi, kahan neechi
// progress: 0 se 1 - jitna gaana baj chuka utni lehar safed, baqi grey
function drawWave(c, x, centerY, width, height, progress) {
    const notes = nameToNotes(fromName + ' ' + toName, 0);
    const heights = notes.map(function (note) {
        return note === null ? 0.12 : 0.3 + (note / 21) * 0.7;   // space = choti lehar
    });
    const cycles = 24;                     // kitni baar upar neeche ho
    const wave = new Path2D();             // lehar ka raasta alag se yaad rakho - do baar banana hai
    for (let px = 0; px <= width; px += 2) {
        const t = px / width;              // 0 se 1 tak - kitna aage aa gaye
        const spot = t * (heights.length - 1);
        const a = heights[Math.floor(spot)];
        const b = heights[Math.ceil(spot)];
        const mix = spot - Math.floor(spot);
        const smooth = mix * mix * (3 - 2 * mix);                  // do suron ke beech naram badlav
        const edge = Math.sqrt(Math.sin(Math.PI * t));             // shuru aur aakhir mein patli
        const amp = (a + (b - a) * smooth) * edge * (height / 2);
        const y = centerY + Math.sin(t * cycles * Math.PI * 2) * amp;
        if (px === 0) wave.moveTo(x + px, y); else wave.lineTo(x + px, y);
    }
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.lineWidth = 9;
    c.strokeStyle = SMOKE;                 // poori lehar grey
    c.stroke(wave);
    // jitna baj chuka - sirf utne hisse mein safed (clip = baqi hissa chhupa do)
    c.save();
    c.beginPath();
    c.rect(x - 20, centerY - height, width * progress + 20, height * 2);
    c.clip();
    c.strokeStyle = INK;
    c.stroke(wave);
    c.restore();
}

// vinyl record - gaane ke saath ghoomta hai (angle radians mein)
function drawVinyl(c, cx, cy, radius, angle) {
    c.save();
    c.translate(cx, cy);
    c.rotate(angle);
    // kaala record
    c.beginPath();
    c.arc(0, 0, radius, 0, Math.PI * 2);
    c.fillStyle = '#0b0b0b';
    c.fill();
    // grooves - bohat saare halke gol daire
    c.lineWidth = 1.5;
    for (let r = radius - 12; r > radius * 0.34; r -= 7) {
        c.beginPath();
        c.arc(0, 0, r, 0, Math.PI * 2);
        c.strokeStyle = 'rgba(255, 255, 255, ' + (0.04 + (r % 3) * 0.015) + ')';
        c.stroke();
    }
    // chamak - do halki tirchhi patti (ghoomne par nazar aata hai ke record chal raha hai)
    [0, Math.PI].forEach(function (start) {
        c.beginPath();
        c.moveTo(0, 0);
        c.arc(0, 0, radius - 10, start - 0.25, start + 0.25);
        c.closePath();
        c.fillStyle = 'rgba(255, 255, 255, 0.05)';
        c.fill();
    });
    // beech ka label + dost ka naam
    c.beginPath();
    c.arc(0, 0, radius * 0.3, 0, Math.PI * 2);
    c.fillStyle = '#d6d6d6';
    c.fill();
    c.fillStyle = '#1a1a1a';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    fitText(c, toName.toLowerCase(), radius * 0.45, 30, 'bold');
    c.fillText(toName.toLowerCase(), 0, -radius * 0.1);
    c.font = '18px system-ui, "Segoe UI", sans-serif';
    c.fillText('side a', 0, radius * 0.12);
    // beech ka chhed
    c.beginPath();
    c.arc(0, 0, 9, 0, Math.PI * 2);
    c.fillStyle = '#0b0b0b';
    c.fill();
    c.restore();
}

// patli si progress line + waqt
function drawCardProgress(c, centerX, y, progress, label) {
    const width = 560, left = centerX - width / 2;
    c.lineCap = 'round';
    c.lineWidth = 4;
    c.strokeStyle = SMOKE;
    c.beginPath(); c.moveTo(left, y); c.lineTo(left + width, y); c.stroke();
    c.strokeStyle = INK;
    c.beginPath(); c.moveTo(left, y); c.lineTo(left + width * progress, y); c.stroke();
    c.beginPath();
    c.arc(left + width * progress, y, 9, 0, Math.PI * 2);
    c.fillStyle = INK;
    c.fill();
    c.fillStyle = SMOKE;
    c.font = '24px system-ui, "Segoe UI", sans-serif';
    drawSpaced(c, label, centerX, y + 40, 2);
}

// progress: kitna gaana baj chuka (0 se 1). label: progress ke neeche likhai. seconds: record ghumane ke liye
function drawCard(progress = 0, label = 'tap the card to play ▶', seconds = 0) {
    const c = cardCanvas.getContext('2d');
    const W = cardCanvas.width;            // 1080
    const H = cardCanvas.height;           // 1350

    // dhundla kaala background - beech mein thora roshan, kinaron par gehra
    const light = c.createRadialGradient(W * 0.45, H * 0.35, 50, W / 2, H / 2, H * 0.8);
    light.addColorStop(0, '#3a3a3a');
    light.addColorStop(1, '#0a0a0a');
    c.fillStyle = light;
    c.fillRect(0, 0, W, H);

    drawWave(c, 110, 400, 860, 380, progress);

    // likhai - phaile hue harf
    c.textBaseline = 'middle';
    c.textAlign = 'center';
    c.fillStyle = INK;
    c.font = '52px system-ui, "Segoe UI", sans-serif';
    drawSpaced(c, 'happy birthday', W / 2, 700, 20);
    const name = toName.toLowerCase();
    fitText(c, name, 900, 84, 'bold', 24);
    drawSpaced(c, name, W / 2, 795, 24);

    drawCardProgress(c, W / 2, 888, progress, label);

    // record kone mein - aadha bahar. 33 chakkar fi minute = 0.55 chakkar fi second
    drawVinyl(c, 880, 1275, 340, seconds * 0.55 * Math.PI * 2);

    // tumhara naam watermark ki tarah, record ke upar halka sa
    c.fillStyle = 'rgba(255, 255, 255, 0.38)';
    fitText(c, 'from ' + fromName.toLowerCase(), 620, 62, 'bold');
    c.fillText('from ' + fromName.toLowerCase(), W * 0.4, 1150);

    // grain sab se upar
    c.drawImage(getGrain(W, H), 0, 0);
}

// ---------- card ka gaana: card par click = bajao, download = video (tasveer + awaaz) ----------
const cardDownload = document.querySelector('#card-download');
const DOWNLOAD_TEXT = 'download video 🎬';
let cardSession = null;    // abhi card ka gaana chal raha hai to uski saari maloomat, warna null

// 75 second -> "1:15"
function formatTime(seconds) {
    const s = Math.max(0, Math.floor(seconds));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

// browser kaun si video bana sakta hai? mp4 sab jagah chalti hai, warna webm
function pickVideoType() {
    const types = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'];
    return types.find(function (type) { return MediaRecorder.isTypeSupported(type); }) || '';
}

// koi bhi file download karwao: chhupa hua link banao aur khud click karo
function downloadBlob(blob, extension) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    // file ke naam mein ye harf mana hote hain: \ / : * ? " < > | aur space
    link.download = 'mixtape-for-' + toName.replace(/[\\/:*?"<>|\s]+/g, '-') + '.' + extension;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);   // memory saaf
}

// card ka gaana bajao (track 1). record = true ho to saath saath video bhi banao
function playCard(record) {
    stopCard();
    if (isPlaying) pause();                 // player wala gaana roko, warna do gaane ek saath
    setupAudio();
    audioCtx.resume();

    const cardTrack = makeTrack(0);
    const duration = cardTrack.length * cardTrack.stepTime;
    const start = audioCtx.currentTime + 0.4;  // thora ruk kar shuru - video ka pehla frame saaf aaye
    const session = { notes: [], recorder: null, timer: null, cancelled: false };

    // poore gaane ke sur ek saath tay kar do (sirf 16 second ka hai)
    for (let step = 0; step < cardTrack.length; step++) {
        session.notes.push(...playStep(step, start + step * cardTrack.stepTime, cardTrack, false));
    }

    if (record) {
        // video = canvas ki tasveerein + gaane ki awaaz
        const soundOut = audioCtx.createMediaStreamDestination();
        const louder = audioCtx.createGain();   // video mein awaaz thori oonchi (phone par dheemi lagti thi)
        louder.gain.value = 2;
        master.connect(louder);
        louder.connect(soundOut);
        const stream = new MediaStream([
            ...cardCanvas.captureStream(30).getVideoTracks(),
            ...soundOut.stream.getAudioTracks(),
        ]);
        const type = pickVideoType();
        const recorder = new MediaRecorder(stream, type ? { mimeType: type, videoBitsPerSecond: 4000000 } : {});
        const pieces = [];
        recorder.ondataavailable = function (event) {
            if (event.data.size > 0) pieces.push(event.data);
        };
        recorder.onstop = function () {
            master.disconnect(louder);
            stream.getTracks().forEach(function (t) { t.stop(); });
            cardDownload.disabled = false;
            cardDownload.textContent = DOWNLOAD_TEXT;
            if (session.cancelled) return;  // beech mein band kiya - download nahi
            const blob = new Blob(pieces, { type: recorder.mimeType });
            downloadBlob(blob, recorder.mimeType.includes('mp4') ? 'mp4' : 'webm');
        };
        recorder.start();
        session.recorder = recorder;
        cardDownload.disabled = true;
        cardDownload.textContent = 'recording... keep this tab open ⏺';
    }

    // har 33ms (30 frame/second) card dobara banao - lehar aur progress aage
    session.timer = setInterval(function () {
        const t = audioCtx.currentTime - start;
        const progress = Math.min(1, Math.max(0, t / duration));
        drawCard(progress, formatTime(t) + ' / ' + formatTime(duration), Math.max(0, t));
        if (t >= duration + 0.3) {
            clearInterval(session.timer);
            if (session.recorder) session.recorder.stop();
            cardSession = null;
        }
    }, 33);
    cardSession = session;
}

// card ka gaana beech mein roko
function stopCard() {
    if (!cardSession) return;
    clearInterval(cardSession.timer);
    cardSession.notes.forEach(function (osc) {
        try { osc.stop(); } catch (error) { /* pehle hi ruk chuka */ }
    });
    if (cardSession.recorder && cardSession.recorder.state === 'recording') {
        cardSession.cancelled = true;
        cardSession.recorder.stop();
    }
    cardSession = null;
    drawCard();
}

cardButton.addEventListener('click', function () {
    if (fromName === '' || toName === '') return;
    drawCard();
    cardPopup.classList.remove('hidden');
});
cardClose.addEventListener('click', function () {
    stopCard();
    cardPopup.classList.add('hidden');
});

// card par click: chal raha hai to roko, warna bajao (video ban rahi ho to kuch nahi)
cardCanvas.addEventListener('click', function () {
    if (cardSession && cardSession.recorder) return;
    if (cardSession) {
        stopCard();
    } else {
        playCard(false);
    }
});

cardDownload.textContent = DOWNLOAD_TEXT;
cardDownload.addEventListener('click', function () {
    if (typeof MediaRecorder === 'undefined') {
        cardDownload.textContent = 'this browser cannot make videos 😢';
        return;
    }
    playCard(true);
});
