const grid = document.getElementById('grid');
const playBtn = document.getElementById('play-btn');
const micBtn = document.getElementById('mic-btn');
const liveBpmLabel = document.getElementById('live-bpm');
const loopLabel = document.getElementById('current-loop');

let audioCtx;
let isPlaying = false;
let currentStep = 0;
let currentLoop = 0;
let nextNoteTime = 0.0;
let timerID;

// Estado do App
let config = {
    bpm: 100,
    loops: 4,
    bpmStep: 0,
    sequence: Array(16).fill(0) // 0 = vazio, 1 = semínima, 2 = colcheia, 4 = semicolcheia
};

// --- INICIALIZAÇÃO DA GRADE ---
function initGrid() {
    grid.innerHTML = '';
    for (let i = 0; i < 16; i++) {
        const div = document.createElement('div');
        div.classList.add('block');
        div.dataset.index = i;
        div.onclick = () => toggleBlock(i);
        grid.appendChild(div);
    }
    loadLocal();
}

function toggleBlock(index) {
    const cycles = [0, 1, 2, 4];
    let currentType = config.sequence[index];
    let nextIndex = (cycles.indexOf(currentType) + 1) % cycles.length;
    config.sequence[index] = cycles[nextIndex];
    updateVisuals();
}

function updateVisuals() {
    document.querySelectorAll('.block').forEach((block, i) => {
        block.className = 'block';
        if (config.sequence[i] > 0) block.classList.add(`selected-${config.sequence[i]}`);
        block.innerText = config.sequence[i] === 0 ? '' : config.sequence[i] === 1 ? '●' : config.sequence[i] === 2 ? '••' : '••••';
    });
}

// --- LÓGICA DE ÁUDIO E LOOP ---
function playClick(time, pitch = 440) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.setValueAtTime(pitch, time);
    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(time); osc.stop(time + 0.1);
}

function scheduler() {
    while (nextNoteTime < audioCtx.currentTime + 0.1) {
        scheduleNote(currentStep, nextNoteTime);
        advanceNote();
    }
    timerID = requestAnimationFrame(scheduler);
}

function scheduleNote(step, time) {
    const type = config.sequence[step];
    if (type > 0) {
        // Tocar subdivisões
        const subDuration = (60 / config.bpm) / type;
        for (let i = 0; i < type; i++) {
            playClick(time + (i * subDuration), step % 4 === 0 ? 880 : 440);
        }
    }
    
    // Feedback visual
    drawVisualStep(step);
}

function drawVisualStep(step) {
    document.querySelectorAll('.block').forEach(b => b.classList.remove('active'));
    document.getElementById('grid').children[step].classList.add('active');
}

function advanceNote() {
    const secondsPerBeat = 60.0 / config.bpm;
    nextNoteTime += secondsPerBeat;
    currentStep++;

    if (currentStep >= 16) {
        currentStep = 0;
        currentLoop++;
        config.bpm += parseInt(document.getElementById('bpm-step').value);
        
        // Atualiza labels
        loopLabel.innerText = currentLoop;
        liveBpmLabel.innerText = config.bpm;

        if (currentLoop >= document.getElementById('loop-limit').value) {
            stopEngine();
        }
    }
}

// --- DETECÇÃO DE MICROFONE ---
async function setupMic() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioCtx = audioCtx || new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyzer = audioCtx.createAnalyser();
        analyzer.fftSize = 256;
        source.connect(analyzer);

        const bufferLength = analyzer.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        function detect() {
            analyzer.getByteFrequencyData(dataArray);
            let sum = dataArray.reduce((a, b) => a + b, 0);
            let avg = sum / bufferLength;
            
            if (avg > 50) { // Limiar de sensibilidade
                document.getElementById('mic-indicator').style.color = 'red';
                setTimeout(() => document.getElementById('mic-indicator').style.color = 'black', 100);
            }
            requestAnimationFrame(detect);
        }
        detect();
        micBtn.classList.add('active');
        micBtn.innerText = "Mic Ativo";
    } catch (e) { alert("Acesso ao microfone negado."); }
}

// --- BOTÕES E PERSISTÊNCIA ---
function stopEngine() {
    isPlaying = false;
    cancelAnimationFrame(timerID);
    playBtn.innerText = "Iniciar Sequência";
    currentLoop = 0;
}

playBtn.onclick = () => {
    if (!audioCtx) audioCtx = new AudioContext();
    if (isPlaying) {
        stopEngine();
    } else {
        isPlaying = true;
        config.bpm = parseInt(document.getElementById('bpm-input').value);
        currentStep = 0;
        currentLoop = 0;
        nextNoteTime = audioCtx.currentTime;
        playBtn.innerText = "Parar";
        scheduler();
    }
};

micBtn.onclick = setupMic;

document.getElementById('save-btn').onclick = () => {
    localStorage.setItem('beatBlockSeq', JSON.stringify(config.sequence));
    alert("Ritmo salvo!");
};

document.getElementById('clear-btn').onclick = () => {
    config.sequence = Array(16).fill(0);
    updateVisuals();
};

function loadLocal() {
    const saved = localStorage.getItem('beatBlockSeq');
    if (saved) {
        config.sequence = JSON.parse(saved);
        updateVisuals();
    }
}

initGrid();
