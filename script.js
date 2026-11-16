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
    showMessage();
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
