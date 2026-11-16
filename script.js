// slider chalao to bhara hua hissa (gulabi) bhi saath chale
const bar = document.querySelector('.progress-bar');
function updateFill() {
    bar.style.setProperty('--fill', bar.value + '%');
}
bar.addEventListener('input', updateFill);
updateFill();

// ---------- saari likhai ek jagah ----------
// JS jo likhai badalti hai, uski "chabi" (key) - badalni ho to bas yahan badlo
const TEXT = {
    needNames: 'write both names! 😄',
    copied: 'copied! now send it 💌',
    copyManual: 'copy the link from the address bar ☝',
    download: 'download video 🎬',
    recording: 'recording... keep this tab open ⏺',
    noVideo: 'this browser cannot make videos 😢',
    cardHappy: 'happy birthday',
    cardFrom: 'from {name}',
    cardTap: 'tap the card to play ▶',
    track1: 'side a',
    track2: 'side b',
    track3: 'lullaby',
};

// t('listen') -> likhai. {name} ki jagah naam bhi daal sakte hain
function t(key, name) {
    return TEXT[key].replace('{name}', name || '');
}

// chhote harf
function lower(text) {
    return text.toLowerCase();
}

// naam Urdu (Arabic script) mein likha hai? (card par jure hue harf alag na hon)
function isUrdu(text) {
    return /[؀-ۿ]/.test(text);
}

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
        introError.textContent = t('needNames');
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
        copyLinkButton.textContent = t('copied');
    } catch (error) {
        copyLinkButton.textContent = t('copyManual');
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

// gaanon wale chords: C -> G -> Am -> F (bohat saare pop gaane yahi chalate hain)
// har chord ke teen sur (C4 se kitne semitone door)
const CHORDS = [
    [0, 4, 7],      // C  (Sa Ga Pa)
    [-5, -1, 2],    // G
    [-3, 0, 4],     // Am
    [-7, -3, 0],    // F
];

// layer ki settings:
// type = awaaz ki shape, volume, every = kitne steps baad baje,
// ring = sur kitni der goonje (step ke hisaab se), attack = kitni dheere shuru ho (second)
// shimmer = ek octave upar halki si "ghanti" (music box jaisi chamak)
function makeTrack(index) {
    if (index === 0) {
        // track 1: tumhara naam = music box jaisi dhun, dost ka naam = neeche naram awaaz
        return {
            layers: [
                { notes: nameToNotes(fromName, 1), type: 'triangle', volume: 0.12, every: 1, ring: 2.5, attack: 0.005, shimmer: true },
                { notes: nameToNotes(toName, -1), type: 'sine', volume: 0.12, every: 2, ring: 1.8, attack: 0.02 },
                // awaaz: dost ka naam gaati hai - uske naam ke vowels mein
                { notes: nameToNotes(toName, 0), vowels: nameToVowels(toName), voice: true, volume: 0.5, every: 2, ring: 0.95 },
            ],
            stepTime: 0.3,     // har step kitne second ka
            barSteps: 8,       // har 8 steps par naya chord
            length: 64,        // kitne steps ka gaana
        };
    }
    if (index === 1) {
        // track 2: ulta - dost ki dhun upar, tumhari neeche, thora tez
        return {
            layers: [
                { notes: nameToNotes(toName, 1), type: 'triangle', volume: 0.12, every: 1, ring: 2.5, attack: 0.005, shimmer: true },
                { notes: nameToNotes(fromName, -1), type: 'sine', volume: 0.12, every: 2, ring: 1.8, attack: 0.02 },
                // awaaz: is baar tumhara naam
                { notes: nameToNotes(fromName, 0), vowels: nameToVowels(fromName), voice: true, volume: 0.5, every: 2, ring: 0.95 },
            ],
            stepTime: 0.27,
            barSteps: 8,
            length: 64,
        };
    }
    // track 3: lori (lullaby) - dono naam ek saath, sirf naram sine, dheere
    const together = fromName + ' ' + toName;
    return {
        layers: [
            { notes: nameToNotes(together, 1), type: 'sine', volume: 0.16, every: 1, ring: 3, attack: 0.03, shimmer: true },
            { notes: nameToNotes(together, -1).reverse(), type: 'sine', volume: 0.1, every: 4, ring: 3, attack: 0.1 },
            // lori mein awaaz sirf naram "oooh" gungunati hai
            { notes: nameToNotes(together, 0), vowels: ['u'], voice: true, volume: 0.4, every: 4, ring: 0.95 },
        ],
        stepTime: 0.4,
        barSteps: 8,
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

let output = null;         // aakhri awaaz (filter + goonj ke baad) - speaker aur video dono yahin se

// goonj (reverb) ke liye "kamre ki awaaz" banao: shor jo dheere dheere khatam ho
function makeRoom(seconds) {
    const length = audioCtx.sampleRate * seconds;
    const room = audioCtx.createBuffer(2, length, audioCtx.sampleRate);
    for (let side = 0; side < 2; side++) {
        const data = room.getChannelData(side);
        for (let i = 0; i < length; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
        }
    }
    return room;
}

// awaaz ka raasta:
// sur -> master -> filter (tez awaaz kaato) -> seedha output
//                                      \-> goonj (reverb) -> output
function setupAudio() {
    if (audioCtx) return;  // pehle se bana hai to dobara nahi
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    master = audioCtx.createGain();
    master.gain.value = 0.6;

    const soft = audioCtx.createBiquadFilter();
    soft.type = 'lowpass';             // sirf neechi (naram) frequencies guzarne do
    soft.frequency.value = 2200;

    const reverb = audioCtx.createConvolver();
    reverb.buffer = makeRoom(2.5);
    const reverbVolume = audioCtx.createGain();
    reverbVolume.gain.value = 0.35;

    output = audioCtx.createGain();
    master.connect(soft);
    soft.connect(output);
    soft.connect(reverb);
    reverb.connect(reverbVolume);
    reverbVolume.connect(output);
    output.connect(audioCtx.destination);
}

// ek sur bajao: oscillator (taar) -> gain (volume) -> master
// attack: kitni dheere shuru ho. duration: kab tak goonj kar khatam ho
function playNote(freq, time, duration, type, volume, attack = 0.01) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    // dheere se shuru aur dheere se band - warna "tik" ki awaaz aati hai
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(time);
    osc.stop(time + duration + 0.05);
    return osc;            // card wala gaana beech mein rokna ho to kaam aaye
}

// ---------- vocals: tone se gaana (formant synthesis) ----------
// insaan ki awaaz = gale ki bhinbhinahat + munh ki shape.
// munh ki har shape (aa, ee, oo) kuch khaas frequencies ko ubhaarti hai - inhein "formant" kehte hain
const VOWELS = {
    a: [800, 1150, 2900],     // "aa"
    e: [400, 1700, 2600],     // "ee" (jaise "le")
    i: [300, 2200, 3000],     // "ii"
    o: [450, 800, 2830],      // "oo" (jaise "ko")
    u: [325, 700, 2530],      // "uu"
};
const FORMANT_LOUDNESS = [1, 0.5, 0.2];   // pehla formant sab se tez
const FORMANT_WIDTH = [80, 90, 120];      // har formant kitna chaura (Hz)

// naam ke harf -> kaun sa vowel gaana hai (English, Turkish aur Urdu harf)
const VOWEL_OF = {
    a: 'a', e: 'e', i: 'i', y: 'i', o: 'o', u: 'u', w: 'u',
    ı: 'u', ö: 'o', ü: 'u', â: 'a', î: 'i', û: 'u',
    'ا': 'a', 'آ': 'a', 'ع': 'a', 'ہ': 'a', 'ة': 'a',
    'ی': 'i', 'ي': 'i', 'ئ': 'e', 'ے': 'e', 'و': 'o', 'ؤ': 'o',
};
function nameToVowels(name) {
    const vowels = [];
    for (const letter of name.toLowerCase()) {
        if (VOWEL_OF[letter]) vowels.push(VOWEL_OF[letter]);
    }
    return vowels.length > 0 ? vowels : ['a'];   // koi vowel na mile to "aa"
}

// ek sur gaao: sawtooth (bhinbhinahat) -> 3 formant filters (munh) -> master
function playVoice(freq, time, duration, vowel, volume) {
    const source = audioCtx.createOscillator();
    source.type = 'sawtooth';
    source.frequency.value = freq;

    // vibrato: ek dheema oscillator jo pitch ko halka sa upar neeche kare - thori der baad shuru
    const wobble = audioCtx.createOscillator();
    wobble.frequency.value = 5.5;                      // 5.5 baar fi second
    const wobbleAmount = audioCtx.createGain();
    wobbleAmount.gain.setValueAtTime(0, time);
    wobbleAmount.gain.linearRampToValueAtTime(freq * 0.012, time + 0.3);
    wobble.connect(wobbleAmount);
    wobbleAmount.connect(source.frequency);

    // awaaz ka volume: naram shuru, thehri rahe, naram khatam
    const voice = audioCtx.createGain();
    voice.gain.setValueAtTime(0.0001, time);
    voice.gain.exponentialRampToValueAtTime(volume, time + 0.08);
    voice.gain.setValueAtTime(volume, time + Math.max(0.1, duration - 0.15));
    voice.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    // munh ki shape - teen filter ek saath
    VOWELS[vowel].forEach(function (formant, i) {
        const band = audioCtx.createBiquadFilter();
        band.type = 'bandpass';
        band.frequency.value = formant;
        band.Q.value = formant / FORMANT_WIDTH[i];
        const loudness = audioCtx.createGain();
        loudness.gain.value = FORMANT_LOUDNESS[i];
        source.connect(band);
        band.connect(loudness);
        loudness.connect(voice);
    });
    voice.connect(master);

    source.start(time);
    wobble.start(time);
    source.stop(time + duration + 0.05);
    wobble.stop(time + duration + 0.05);
    return [source, wobble];
}

// F chord ke saath E (Ga) thora takrata hai - us waqt F bajao
function fitToChord(note, chord) {
    const isF = chord === CHORDS[3];
    return isF && ((note % 12) + 12) % 12 === 4 ? note + 1 : note;
}

// ek step par har layer ka sur bajao
// (whichTrack: kaun sa gaana - player ka ya card ka. bounce: pixel dil uchhlein ya nahi)
function playStep(step, time, whichTrack = track, bounce = true) {
    const played = [];
    const bar = whichTrack.stepTime * whichTrack.barSteps;           // ek chord kitni der
    const chord = CHORDS[Math.floor(step / whichTrack.barSteps) % CHORDS.length];

    // har naye chord par: naram pad (teeno sur) + neeche gehra bass
    if (step % whichTrack.barSteps === 0) {
        chord.forEach(function (note) {
            played.push(playNote(toFreq(note), time, bar * 1.1, 'triangle', 0.035, 0.5));
        });
        played.push(playNote(toFreq(chord[0] - 24), time, bar, 'sine', 0.2, 0.05));
    }

    whichTrack.layers.forEach(function (layer, layerNumber) {
        if (step % layer.every !== 0) return;     // neeche wali dhun har doosre step par
        const index = Math.floor(step / layer.every) % layer.notes.length;  // chhota naam dobara se (loop)
        const raw = layer.notes[index];
        if (raw === null) return;                 // khamoshi
        const note = fitToChord(raw, chord);
        const ring = whichTrack.stepTime * layer.every * layer.ring;
        if (layer.voice) {
            if (step % (whichTrack.barSteps * 2) >= whichTrack.barSteps * 1.5) return;   // har do bar ke aakhir mein saans lo
            const vowel = layer.vowels[Math.floor(step / layer.every) % layer.vowels.length];
            played.push(...playVoice(toFreq(note), time, ring, vowel, layer.volume));
            return;
        }
        played.push(playNote(toFreq(note), time, ring, layer.type, layer.volume, layer.attack));
        if (layer.shimmer) {
            played.push(playNote(toFreq(note + 12), time, ring * 0.6, 'sine', layer.volume * 0.25, layer.attack));
        }
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

// card ka font
function cardFont(weight, size) {
    return (weight ? weight + ' ' : '') + size + 'px system-ui, "Segoe UI", sans-serif';
}

// likhai ka rukh: Urdu naam daayein se baayein (rtl), baqi baayein se daayein (ltr)
function drawText(c, text, x, y) {
    c.direction = isUrdu(text) ? 'rtl' : 'ltr';
    c.fillText(text, x, y);
    c.direction = 'ltr';
}

// lamba naam ho to font chhota karte jao jab tak jagah mein na aa jaye
function fitText(c, text, maxWidth, size, weight, spacing = 0) {
    do {
        c.font = cardFont(weight, size);
        size -= 4;
    } while (spacedWidth(c, text, spacing) > maxWidth && size > 20);
}

// harfon ke beech jagah - "h a p p y" jaisa aesthetic look
function spacedWidth(c, text, spacing) {
    if (isUrdu(text)) return c.measureText(text).width;
    const letters = [...text];
    return letters.reduce(function (sum, l) { return sum + c.measureText(l).width; }, 0) + spacing * (letters.length - 1);
}
function drawSpaced(c, text, centerX, y, spacing) {
    // Urdu ke harf aapas mein jurte hain - unhein alag alag likhna tod deta hai, isliye poora ek saath
    if (isUrdu(text)) {
        drawText(c, text, centerX, y);
        return;
    }
    c.direction = 'ltr';
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
    fitText(c, lower(toName), radius * 0.45, 30, 'bold');
    drawText(c, lower(toName), 0, -radius * 0.1);
    c.font = cardFont('', 18);
    drawText(c, t('track' + (cardTrackIndex + 1)), 0, radius * 0.12);   // kaun sa track
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
    c.font = cardFont('', 24);
    drawSpaced(c, label, centerX, y + 40, 2);
}

// progress: kitna gaana baj chuka (0 se 1). label: progress ke neeche likhai. seconds: record ghumane ke liye
function drawCard(progress = 0, label = t('cardTap'), seconds = 0) {
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
    c.font = cardFont('', 52);
    drawSpaced(c, t('cardHappy'), W / 2, 700, 20);
    const name = lower(toName);
    fitText(c, name, 900, 84, 'bold', 24);
    drawSpaced(c, name, W / 2, 795, 24);

    drawCardProgress(c, W / 2, 888, progress, label);

    // record kone mein - aadha bahar. 33 chakkar fi minute = 0.55 chakkar fi second
    drawVinyl(c, 880, 1275, 340, seconds * 0.55 * Math.PI * 2);

    // tumhara naam watermark ki tarah, record ke upar halka sa
    c.fillStyle = 'rgba(255, 255, 255, 0.38)';
    const from = t('cardFrom', lower(fromName));
    fitText(c, from, 620, 62, 'bold');
    drawText(c, from, W * 0.4, 1150);

    // grain sab se upar
    c.drawImage(getGrain(W, H), 0, 0);
}

// ---------- card ka gaana: card par click = bajao, download = video (tasveer + awaaz) ----------
const cardDownload = document.querySelector('#card-download');
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

    const cardTrack = makeTrack(cardTrackIndex);
    const duration = cardTrack.length * cardTrack.stepTime;
    const start = audioCtx.currentTime + 0.4;  // thora ruk kar shuru - video ka pehla frame saaf aaye
    const session = { notes: [], recorder: null, timer: null, cancelled: false };

    // poore gaane ke sur ek saath tay kar do (sirf 20 second ka hai)
    for (let step = 0; step < cardTrack.length; step++) {
        session.notes.push(...playStep(step, start + step * cardTrack.stepTime, cardTrack, false));
    }

    if (record) {
        // video = canvas ki tasveerein + gaane ki awaaz
        const soundOut = audioCtx.createMediaStreamDestination();
        const louder = audioCtx.createGain();   // video mein awaaz thori oonchi (phone par dheemi lagti thi)
        louder.gain.value = 2;
        output.connect(louder);
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
            output.disconnect(louder);
            stream.getTracks().forEach(function (t) { t.stop(); });
            cardDownload.disabled = false;
            cardDownload.textContent = t('download');
            if (session.cancelled) return;  // beech mein band kiya - download nahi
            const blob = new Blob(pieces, { type: recorder.mimeType });
            downloadBlob(blob, recorder.mimeType.includes('mp4') ? 'mp4' : 'webm');
        };
        recorder.start();
        session.recorder = recorder;
        cardDownload.disabled = true;
        cardDownload.textContent = t('recording');
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
    chooseCardTrack(trackIndex);           // shuru mein wahi track jo player mein chal raha tha
    cardPopup.classList.remove('hidden');
});

// ---------- download ke liye track chuno ----------
let cardTrackIndex = 0;
const trackButtons = document.querySelectorAll('#track-buttons button');
function chooseCardTrack(index) {
    stopCard();                            // pehle wala card gaana band
    cardTrackIndex = index;
    trackButtons.forEach(function (button) {
        button.classList.toggle('active', Number(button.dataset.track) === index);
    });
    drawCard();
}
trackButtons.forEach(function (button) {
    button.addEventListener('click', function () {
        if (cardSession && cardSession.recorder) return;   // video ban rahi ho to track mat badlo
        chooseCardTrack(Number(button.dataset.track));
    });
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

cardDownload.addEventListener('click', function () {
    if (typeof MediaRecorder === 'undefined') {
        cardDownload.textContent = t('noVideo');
        return;
    }
    playCard(true);
});
