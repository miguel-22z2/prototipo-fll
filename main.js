const humStart = document.getElementById('humStart');
const tempStart = document.getElementById('tempStart');
const humEnd = document.getElementById('humEnd');
const tempEnd = document.getElementById('tempEnd');
const duration = document.getElementById('duration');

const humStartVal = document.getElementById('humStartVal');
const tempStartVal = document.getElementById('tempStartVal');
const humEndVal = document.getElementById('humEndVal');
const tempEndVal = document.getElementById('tempEndVal');
const durVal = document.getElementById('durVal');

const humStartNum = document.getElementById('humStartNum');
const tempStartNum = document.getElementById('tempStartNum');
const humEndNum = document.getElementById('humEndNum');
const tempEndNum = document.getElementById('tempEndNum');
const durationNum = document.getElementById('durationNum');

const tempNow = document.getElementById('tempNow');
const humNow = document.getElementById('humNow');
const progressBar = document.getElementById('progressBar');
const timeLabel = document.getElementById('timeLabel');
const statusBadge = document.getElementById('statusBadge');
const logEl = document.getElementById('log');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');

let timer = null;
let simHour = 0;
const stepHours = 0.25; // resolução da simulação
const RISK_RATE_HUM = 12; // %/hora considerado brusco
const RISK_RATE_TEMP = 6; // °C/hora considerado brusco

function syncLabels(){
  humStartVal.textContent = humStart.value;
  tempStartVal.textContent = tempStart.value;
  humEndVal.textContent = humEnd.value;
  tempEndVal.textContent = tempEnd.value;
  durVal.textContent = duration.value;

  humStartNum.value = humStart.value;
  tempStartNum.value = tempStart.value;
  humEndNum.value = humEnd.value;
  tempEndNum.value = tempEnd.value;
  durationNum.value = duration.value;
}
[humStart, tempStart, humEnd, tempEnd, duration].forEach(el => el.addEventListener('input', syncLabels));

// campo numérico -> slider (com respeito aos limites min/max)
function clamp(val, min, max){
  return Math.min(Math.max(val, min), max);
}
const pairs = [
  [humStartNum, humStart],
  [tempStartNum, tempStart],
  [humEndNum, humEnd],
  [tempEndNum, tempEnd],
  [durationNum, duration]
];
pairs.forEach(([numInput, rangeInput]) => {
  numInput.addEventListener('input', () => {
    if(numInput.value === '') return;
    const min = parseFloat(rangeInput.min);
    const max = parseFloat(rangeInput.max);
    const clamped = clamp(parseFloat(numInput.value), min, max);
    rangeInput.value = clamped;
    syncLabels();
  });
  numInput.addEventListener('blur', () => {
    numInput.value = rangeInput.value;
  });
});

syncLabels();

function log(msg, warn=false){
  const line = document.createElement('div');
  if(warn) line.className = 'warn';
  const t = new Date().toLocaleTimeString();
  line.textContent = `[${t}] ${msg}`;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
}

// curva suave (ease-in-out) para simular ajuste gradual controlado, não linear abrupto
function easeInOut(t){
  return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2;
}

function resetSim(){
  clearInterval(timer);
  timer = null;
  simHour = 0;
  tempNow.textContent = '--';
  humNow.textContent = '--';
  progressBar.style.width = '0%';
  timeLabel.textContent = 'Tempo simulado: 0h / 0h';
  statusBadge.textContent = 'Aguardando início';
  statusBadge.className = 'status idle';
  logEl.innerHTML = '';
  startBtn.disabled = false;
}

function startSim(){
  const hs = parseFloat(humStart.value);
  const ts = parseFloat(tempStart.value);
  const he = parseFloat(humEnd.value);
  const te = parseFloat(tempEnd.value);
  const totalH = parseFloat(duration.value);

  resetSim();
  startBtn.disabled = true;
  statusBadge.textContent = 'Aclimatando...';
  statusBadge.className = 'status running';

  log(`Sistema iniciado. Sensor DHT22 detectou: ${ts.toFixed(1)}°C / ${hs.toFixed(0)}% RH`);
  log(`Meta ambiente externo: ${te.toFixed(1)}°C / ${he.toFixed(0)}% RH em ${totalH}h`);

  timer = setInterval(() => {
    simHour += stepHours;
    const frac = Math.min(simHour / totalH, 1);
    const eased = easeInOut(frac);

    const curTemp = ts + (te - ts) * eased;
    const curHum = hs + (he - hs) * eased;

    tempNow.textContent = curTemp.toFixed(1);
    humNow.textContent = curHum.toFixed(0);
    progressBar.style.width = (frac*100).toFixed(0) + '%';
    timeLabel.textContent = `Tempo simulado: ${simHour.toFixed(2)}h / ${totalH}h`;

    // taxa instantânea de variação (checagem de choque)
    const rateHum = Math.abs((he - hs) * (eased - easeInOut(Math.max(0,(simHour-stepHours))/totalH))) / stepHours;
    const rateTemp = Math.abs((te - ts) * (eased - easeInOut(Math.max(0,(simHour-stepHours))/totalH))) / stepHours;

    if(simHour % 1 < stepHours){
      log(`Leitura: ${curTemp.toFixed(1)}°C / ${curHum.toFixed(0)}% RH — cooler e umidificador ajustando...`);
    }
    if(rateHum > RISK_RATE_HUM || rateTemp > RISK_RATE_TEMP){
      log(`Atenção: taxa de variação acima do ideal — risco de choque térmico/umidade!`, true);
      statusBadge.textContent = 'Risco detectado';
      statusBadge.className = 'status risk';
    } else if(statusBadge.textContent === 'Risco detectado'){
      statusBadge.textContent = 'Aclimatando...';
      statusBadge.className = 'status running';
    }

    if(frac >= 1){
      clearInterval(timer);
      timer = null;
      log(`Aclimatação concluída. Artefato estabilizado em ${te.toFixed(1)}°C / ${he.toFixed(0)}% RH.`);
      statusBadge.textContent = 'Concluído — pronto para transporte';
      statusBadge.className = 'status done';
      startBtn.disabled = false;
    }
  }, 300); // velocidade da simulação (ms por passo de 0.25h simulada)
}

startBtn.addEventListener('click', startSim);
resetBtn.addEventListener('click', resetSim);