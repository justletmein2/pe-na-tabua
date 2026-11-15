// Sons gerados na hora (Web Audio): ronco do motor que muda com a velocidade, batida e bipes.
let ac = null, motorG = null, o1 = null, o2 = null, filtro = null;
let ligado = true;
try { ligado = localStorage.getItem('pnt-som') !== '0'; } catch {}

export const somLigado = () => ligado;
export function ligarSom(v) {
  ligado = v;
  try { localStorage.setItem('pnt-som', v ? '1' : '0'); } catch {}
  if (motorG && ac) motorG.gain.setTargetAtTime(v ? 0.05 : 0, ac.currentTime, 0.05);
}

// precisa ser chamada a partir de um toque/clique
export function iniciarSom() {
  try {
    if (!ac) {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      filtro = ac.createBiquadFilter(); filtro.type = 'lowpass'; filtro.frequency.value = 600; filtro.Q.value = 4;
      motorG = ac.createGain(); motorG.gain.value = 0;
      o1 = ac.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 50;
      o2 = ac.createOscillator(); o2.type = 'square'; o2.frequency.value = 25;
      const g2 = ac.createGain(); g2.gain.value = 0.5;
      o1.connect(filtro); o2.connect(g2); g2.connect(filtro); filtro.connect(motorG); motorG.connect(ac.destination);
      o1.start(); o2.start();
    }
    if (ac.state === 'suspended') ac.resume();
  } catch {}
}

const MARCHAS = [0, 0.18, 0.36, 0.54, 0.72, 0.9, 1.4];
export function motor(pct, acelerando, turbo) {
  if (!ac || !ligado) return;
  let m = 0;
  while (m < MARCHAS.length - 2 && pct >= MARCHAS[m + 1]) m++;
  const frac = Math.min(1, (pct - MARCHAS[m]) / (MARCHAS[m + 1] - MARCHAS[m]));
  const f = 42 + frac * 62 + m * 9 + (turbo ? 25 : 0);
  const t = ac.currentTime;
  o1.frequency.setTargetAtTime(f, t, 0.04);
  o2.frequency.setTargetAtTime(f / 2, t, 0.04);
  filtro.frequency.setTargetAtTime(350 + pct * 1300 + (acelerando ? 500 : 0), t, 0.08);
  motorG.gain.setTargetAtTime(acelerando ? 0.07 : 0.04, t, 0.1);
}

export function silenciarMotor() { if (ac && motorG) motorG.gain.setTargetAtTime(0, ac.currentTime, 0.05); }

function ruido(dur, vol, freq) {
  const n = Math.floor(ac.sampleRate * dur), buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = ac.createBufferSource(); s.buffer = buf;
  const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
  const g = ac.createGain(); g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(ac.destination); s.start();
}

export function batida() { if (ac && ligado) ruido(0.45, 0.6, 900); }
export function turboSom() { if (ac && ligado) ruido(0.6, 0.25, 3000); }

export function bip(freq = 660, dur = 0.15) {
  if (!ac || !ligado) return;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = 'square'; o.frequency.value = freq; g.gain.value = 0.12;
  g.gain.setTargetAtTime(0, ac.currentTime + dur * 0.7, 0.03);
  o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + dur + 0.2);
}
