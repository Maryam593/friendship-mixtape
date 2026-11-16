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
}

// ek step par har layer ka sur bajao
function playStep(step, time) {
    track.layers.forEach(function (layer, layerNumber) {
        if (step % layer.every !== 0) return;     // bass har doosre step par
        const index = Math.floor(step / layer.every) % layer.notes.length;  // chhota naam dobara se (loop)
        const note = layer.notes[index];
        if (note === null) return;                // khamoshi
        playNote(toFreq(note), time, track.stepTime * layer.every * 0.9, layer.type, layer.volume);
        if (layerNumber === 0) {
            bounceHeart(step % pixelHearts.length, time);   // upar wali dhun ke har sur par ek dil uchhle
        }
    });
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

// gol kono wala dabba (canvas mein seedha border-radius nahi hota)
function roundedBox(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
}

// wahi star jo CSS clip-path mein hai - % ko asal jagah mein badal kar
const STAR_POINTS = [50,0, 57,23, 75,7, 70,30, 93,25, 77,43, 100,50, 77,57, 93,75, 70,70,
    75,93, 57,77, 50,100, 43,77, 25,93, 30,70, 7,75, 23,57, 0,50, 23,43, 7,25, 30,30, 25,7, 43,23];
function drawStar(c, x, y, size, color) {
    c.beginPath();
    for (let i = 0; i < STAR_POINTS.length; i += 2) {
        c.lineTo(x + STAR_POINTS[i] / 100 * size, y + STAR_POINTS[i + 1] / 100 * size);
    }
    c.closePath();
    c.fillStyle = color;
    c.fill();
    c.lineWidth = 5;
    c.strokeStyle = 'black';
    c.stroke();
}

// lamba naam ho to font chhota karte jao jab tak jagah mein na aa jaye
function fitText(c, text, maxWidth, size, weight) {
    do {
        c.font = weight + ' ' + size + 'px system-ui, "Segoe UI", sans-serif';
        size -= 4;
    } while (c.measureText(text).width > maxWidth && size > 20);
}

// pixel dil - wahi naqsha jo CSS box-shadow mein hai
const HEART_MAP = [
    '.XX.XX.',
    'XXXXXXX',
    'XXXXXXX',
    '.XXXXX.',
    '..XXX..',
    '...X...',
];
function drawPixelHeart(c, x, y, pixel) {
    // pehle kaala (thora bara) - outline, phir upar gulabi
    [['black', 4], ['rgb(211, 41, 112)', 0]].forEach(function ([color, grow]) {
        c.fillStyle = color;
        HEART_MAP.forEach(function (row, r) {
            [...row].forEach(function (cell, col) {
                if (cell === 'X') {
                    c.fillRect(x + col * pixel - grow, y + r * pixel - grow, pixel + grow * 2, pixel + grow * 2);
                }
            });
        });
    });
}

// sound wave: dono naamon ke sur -> lehar kahan oonchi, kahan neechi
function drawWave(c, x, centerY, width, height) {
    const notes = nameToNotes(fromName + ' ' + toName, 0);
    const heights = notes.map(function (note) {
        return note === null ? 0.12 : 0.3 + (note / 21) * 0.7;   // space = choti lehar
    });
    const cycles = 28;                     // kitni baar upar neeche ho
    c.beginPath();
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
        if (px === 0) c.moveTo(x + px, y); else c.lineTo(x + px, y);
    }
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.strokeStyle = 'black';               // pehle moti kaali line (outline)
    c.lineWidth = 18;
    c.stroke();
    c.strokeStyle = 'palevioletred';       // phir upar patli gulabi
    c.lineWidth = 9;
    c.stroke();
}

function drawCard() {
    const c = cardCanvas.getContext('2d');
    const W = cardCanvas.width;            // 1080
    const H = cardCanvas.height;           // 1350

    // gulabi background + grid
    c.fillStyle = 'palevioletred';
    c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    c.lineWidth = 2;
    for (let i = 0; i <= Math.max(W, H); i += 45) {
        c.beginPath(); c.moveTo(i, 0); c.lineTo(i, H); c.stroke();
        c.beginPath(); c.moveTo(0, i); c.lineTo(W, i); c.stroke();
    }

    // card ka dabba - pehle saya, phir safed
    const x = 90, y = 170, w = 900, h = 1010, r = 30;
    roundedBox(c, x + 14, y + 14, w, h, r);
    c.fillStyle = 'black';
    c.fill();
    roundedBox(c, x, y, w, h, r);
    c.fillStyle = 'white';
    c.fill();

    // title bar (card ke andar hi rahe - clip)
    c.save();
    roundedBox(c, x, y, w, h, r);
    c.clip();
    c.fillStyle = 'plum';
    c.fillRect(x, y, w, 80);
    c.restore();
    c.fillStyle = 'black';
    c.fillRect(x, y + 80, w, 8);
    ['palevioletred', 'yellow', 'white'].forEach(function (color, i) {
        c.beginPath();
        c.arc(x + 50 + i * 40, y + 40, 12, 0, Math.PI * 2);
        c.fillStyle = color;
        c.fill();
        c.lineWidth = 3;
        c.strokeStyle = 'black';
        c.stroke();
    });
    // likhai
    c.textBaseline = 'middle';
    c.textAlign = 'center';
    c.fillStyle = 'palevioletred';
    c.font = 'bold 50px system-ui, "Segoe UI", sans-serif';
    c.fillText('happy birthday', W / 2, 340);

    c.fillStyle = 'darkblue';
    fitText(c, toName, 780, 130, 'bold');
    c.fillText(toName, W / 2, 470);

    drawWave(c, 160, 710, 760, 320);

    c.fillStyle = 'black';
    fitText(c, 'a mixtape from ' + fromName + ' 💗', 780, 46, 'bold');
    c.fillText('a mixtape from ' + fromName + ' 💗', W / 2, 935);

    // teen pixel dil
    for (let i = 0; i < 3; i++) {
        drawPixelHeart(c, W / 2 - 187 + i * 138, 990, 14);
    }

    c.fillStyle = 'gray';
    c.font = '30px system-ui, "Segoe UI", sans-serif';
    c.fillText('▶ press play on your friendship', W / 2, 1135);

    // card ki kaali border sab se aakhir mein - taake upar rahe
    roundedBox(c, x, y, w, h, r);
    c.lineWidth = 8;
    c.strokeStyle = 'black';
    c.stroke();

    // stickers - taare kono par chipke hue
    drawStar(c, 850, 70, 190, 'yellow');
    drawStar(c, 40, 1110, 150, 'blueviolet');

    c.fillStyle = 'white';
    c.font = 'bold 42px system-ui, "Segoe UI", sans-serif';
    c.fillText('friendship mixtape', W / 2, 1275);
}

cardButton.addEventListener('click', function () {
    if (fromName === '' || toName === '') return;
    drawCard();
    cardPopup.classList.remove('hidden');
});
cardClose.addEventListener('click', function () {
    cardPopup.classList.add('hidden');
});

// download: canvas -> png file -> chhupa hua link -> khud click
document.querySelector('#card-download').addEventListener('click', function () {
    cardCanvas.toBlob(function (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        // file ke naam mein ye harf mana hote hain: \ / : * ? " < > | aur space
        link.download = 'mixtape-for-' + toName.replace(/[\/:*?"<>|\s]+/g, '-') + '.png';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);   // memory saaf
    }, 'image/png');
});
