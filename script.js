let audioCtx;
let isPlaying = false;
let currentStep = 0;
let nextNoteTime = 0.0;
let timerID;

// Pontuação
let totalHits = 0;
let attempts = 0;
let sequence = Array(16).fill(0);
let currentBPM = 100;

const tapZone = document.getElementById('tap-zone');
const feedbackText = document.getElementById('feedback-text');
const hitLabel = document.getElementById('hit-count');
const accLabel = document.getElementById('accuracy-pct');

// Inicializar Grid
function init() {
    const grid = document.getElementById('grid');
    for (let i = 0; i < 16; i++) {
        const div = document.createElement('div');
        div.classList.add('block');
        div.onclick = () => {
            const types = [0, 1, 2, 4];
            sequence[i] = types[(types.indexOf(sequence[i]) + 1) % types.length];
            updateGrid();
        };
        grid.appendChild(div);
    }
}

function updateGrid() {
    document.querySelectorAll('.block').forEach((b, i) => {
        b.className = 'block' + (sequence[i] ? ` selected-${sequence[i]}` : '');
        b.innerText = sequence[i] > 0 ? (sequence[i] === 1 ? '●' : '••') : '';
    });
}

// Lógica de Tap e Feedback
tapZone.addEventListener('touchstart', (e) => { e.preventDefault(); handleTap(); });
tapZone.addEventListener('mousedown', handleTap);

function handleTap() {
    if (!isPlaying) return;
    
    attempts++;
    const now = audioCtx.currentTime;
    const diff = Math.abs(now - nextNoteTime);
    
    // Janelas de tempo (em segundos)
    if (diff < 0.08) {
        showFeedback('PERFECT', 'tap-perfect');
        totalHits += 1;
    } else if (diff < 0.18) {
        showFeedback('NEAR', 'tap-near');
        totalHits += 0.5;
    } else {
        showFeedback('MISS', 'tap-miss');
    }
    
    updateScore();
}

function showFeedback(text, cssClass) {
    feedbackText.innerText = text;
    tapZone.classList.add(cssClass);
    setTimeout(() => tapZone.classList.remove(cssClass), 100);
}

function updateScore() {
    hitLabel.innerText = Math.floor(totalHits);
    const pct = ((totalHits / attempts) * 100).toFixed(0);
    accLabel.innerText = pct + "%";
}

// Motor de Áudio
function playSound(time, freq) {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.frequency.setValueAtTime(freq, time);
    g.gain.setValueAtTime(0.1, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
    osc.connect(g); g.connect(audioCtx.destination);
    osc.start(time); osc.stop(time + 0.1);
}

function scheduler() {
    while (nextNoteTime < audioCtx.currentTime + 0.1) {
        if (sequence[currentStep] > 0) {
            playSound(nextNoteTime, currentStep % 4 === 0 ? 880 : 440);
        }
        
        // Visual step
        document.querySelectorAll('.block').forEach(b => b.classList.remove('active'));
        document.getElementById('grid').children[currentStep].classList.add('active');
        
        advanceNote();
    }
    timerID = requestAnimationFrame(scheduler);
}

function advanceNote() {
    const secondsPerBeat = 60.0 / currentBPM;
    nextNoteTime += secondsPerBeat;
    currentStep = (currentStep + 1) % 16;
    
    if (currentStep === 0) {
        currentBPM += parseInt(document.getElementById('bpm-step').value || 0);
    }
}

document.getElementById('play-btn').onclick = () => {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (isPlaying) {
        isPlaying = false;
        cancelAnimationFrame(timerID);
    } else {
        isPlaying = true;
        currentBPM = parseInt(document.getElementById('bpm-input').value);
        currentStep = 0;
        nextNoteTime = audioCtx.currentTime;
        scheduler();
    }
};

// Microfone (Visual)
document.getElementById('mic-btn').onclick = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = audioCtx.createMediaStreamSource(stream);
    const analyzer = audioCtx.createAnalyser();
    source.connect(analyzer);
    alert("Microfone monitorando ambiente!");
};

document.getElementById('clear-btn').onclick = () => {
    sequence = Array(16).fill(0);
    updateGrid();
    totalHits = 0; attempts = 0; updateScore();
};

init();
