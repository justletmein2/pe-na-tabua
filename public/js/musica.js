// Músicas chiptune originais, tocadas na hora pelo Web Audio (sem arquivos de áudio).
// Cada música: acordes por compasso, melodia escrita como "nota:duração" (em semicolcheias,
// 16 por compasso), e baixo/arpejo/bateria gerados a partir dos acordes.
import { contexto } from './som.js';

const NOTAS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function midi(n) {
  const m = /^([A-G])(#|b)?(\d)$/.exec(n);
  return 12 * (+m[3] + 1) + NOTAS[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
function acorde(nome) {
  const m = /^([A-G])(#|b)?(m?)$/.exec(nome);
  const raiz = NOTAS[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return { raiz, notas: m[3] ? [0, 3, 7] : [0, 4, 7] };
}
// "E5:2 G5:2 r:4" -> [{passo, nota, dur}]
export function compasso(txt) {
  const out = []; let passo = 0;
  for (const tk of txt.trim().split(/\s+/)) {
    const [n, d] = tk.split(':'); const dur = +d;
    if (n !== 'r') out.push({ passo, nota: midi(n), dur });
    passo += dur;
  }
  out.total = passo;
  return out;
}

const BAIXOS = {
  pop: 'r:2 r:2 o:2 r:2 r:2 o:2 r:2 o:2',
  galope: 'r:1 r:1 o:2 r:1 r:1 o:2 r:1 r:1 o:2 r:1 r:1 o:2',
  swing: 'r:3 r:1 f:2 o:2 r:3 r:1 f:2 o:2',
  oitavas: 'r:1 o:1 r:1 o:1 r:1 o:1 r:1 o:1 r:1 o:1 r:1 o:1 r:1 o:1 r:1 o:1',
};

export const MUSICAS = [
  {
    nome: 'Beira-Mar', bpm: 150, baixo: 'pop',
    bateria: { k: 'x.......x.x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
    secoes: {
      A: { acordes: ['D', 'A', 'Bm', 'G'], lead: [
        'F#5:2 A5:2 D6:3 C#6:1 B5:2 A5:2 F#5:2 A5:2', 'E5:2 A5:2 C#6:3 B5:1 A5:2 E5:2 C#5:4',
        'D5:2 F#5:2 B5:3 A5:1 F#5:2 D5:2 B4:2 D5:2', 'G5:3 F#5:1 E5:2 D5:2 E5:4 r:4'] },
      A2: { acordes: ['D', 'A', 'Bm', 'G'], lead: [
        'F#5:2 A5:2 D6:3 C#6:1 B5:2 A5:2 F#5:2 A5:2', 'E5:2 A5:2 C#6:3 B5:1 A5:2 E5:2 C#5:4',
        'D5:2 F#5:2 B5:3 A5:1 F#5:2 D5:2 B4:2 D5:2', 'G5:2 A5:2 B5:2 C#6:2 D6:6 r:2'] },
      B: { acordes: ['G', 'A', 'F#m', 'Bm', 'G', 'A', 'D', 'D'], arpejo: true, lead: [
        'B5:4 A5:2 G5:2 A5:4 B5:4', 'C#6:4 B5:2 A5:2 E5:8', 'A5:4 F#5:2 E5:2 F#5:4 A5:4', 'B5:6 r:2 F#5:2 B5:2 D6:4',
        'D6:2 B5:2 G5:2 B5:2 D6:2 E6:2 D6:4', 'C#6:2 A5:2 E5:2 A5:2 C#6:2 D6:2 E6:4', 'F#6:4 E6:2 D6:2 A5:4 F#5:4', 'D6:8 r:8'] },
    },
    ordem: ['intro', 'A', 'A2', 'B', 'A2'],
  },
  {
    nome: 'Turbo Noturno', bpm: 160, baixo: 'galope',
    bateria: { k: 'x...x...x...x...', s: '....x.......x...', h: '..x...x...x...x.' },
    secoes: {
      A: { acordes: ['Em', 'C', 'D', 'Em'], lead: [
        'E5:2 G5:2 B5:2 E6:2 D6:2 B5:2 G5:2 B5:2', 'C6:3 B5:1 A5:2 G5:2 E5:4 G5:4',
        'F#5:2 A5:2 D6:2 C6:2 B5:2 A5:2 F#5:2 D5:2', 'E5:6 F#5:2 G5:4 B5:4'] },
      B: { acordes: ['Am', 'C', 'D', 'B'], arpejo: true, lead: [
        'A5:4 C6:4 E6:4 D6:2 C6:2', 'B5:4 G5:4 E5:4 G5:4', 'A5:2 B5:2 C6:2 D6:2 F#6:4 E6:2 D6:2', 'D#6:8 B5:4 F#5:4'] },
    },
    ordem: ['intro', 'A', 'A', 'B', 'B', 'A'],
  },
  {
    nome: 'Serra Acima', bpm: 140, baixo: 'swing',
    bateria: { k: 'x.....x.x.......', s: '....x.......x..x', h: 'x.xxx.xxx.xxx.xx' },
    secoes: {
      A: { acordes: ['G', 'F', 'C', 'G'], lead: [
        'D5:2 G5:2 B5:4 A5:2 G5:2 F5:2 G5:2', 'A5:4 C6:2 A5:2 F5:4 r:4',
        'E5:2 G5:2 C6:4 B5:2 C6:2 D6:4', 'D6:3 C6:1 B5:2 G5:2 D5:8'] },
      B: { acordes: ['Em', 'D', 'C', 'D'], arpejo: true, lead: [
        'G5:4 E5:4 B5:4 G5:4', 'F#5:4 A5:4 D6:8', 'E6:2 D6:2 C6:2 B5:2 C6:2 B5:2 A5:2 G5:2', 'A5:4 F#5:4 D5:4 F#5:2 A5:2'] },
    },
    ordem: ['intro', 'A', 'A', 'B', 'A'],
  },
  {
    nome: 'Chuva de Neon', bpm: 172, baixo: 'oitavas',
    bateria: { k: 'x..x..x.x..x..x.', s: '....x.......x...', h: 'xxxxxxxxxxxxxxxx' },
    secoes: {
      A: { acordes: ['Cm', 'Ab', 'Bb', 'Cm'], lead: [
        'C5:1 Eb5:1 G5:1 C6:1 Bb5:2 G5:2 Eb5:2 G5:2 C6:4', 'C6:2 Eb6:2 C6:2 Ab5:2 Eb5:4 Ab5:4',
        'D6:2 F6:2 D6:2 Bb5:2 F5:2 Bb5:2 D6:4', 'Eb6:4 D6:2 C6:2 G5:8'] },
      B: { acordes: ['Fm', 'Ab', 'Bb', 'G'], arpejo: true, lead: [
        'F5:2 Ab5:2 C6:2 F6:2 Eb6:2 C6:2 Ab5:4', 'Eb6:4 C6:2 Ab5:2 C6:4 Eb6:4',
        'F6:2 D6:2 Bb5:2 D6:2 F6:4 Bb6:4', 'B5:4 D6:4 G6:4 F6:2 D6:2'] },
    },
    ordem: ['intro', 'A', 'A', 'B', 'B'],
  },
];

// transforma a música numa lista de compassos
function montar(m) {
  const lista = [];
  for (const nome of m.ordem) {
    if (nome === 'intro') {
      const a = m.secoes.A.acordes;
      for (let i = 0; i < 2; i++) lista.push({ acorde: acorde(a[i % a.length]), lead: [], arpejo: false, intro: true });
      continue;
    }
    const s = m.secoes[nome];
    s.acordes.forEach((ac, i) => lista.push({ acorde: acorde(ac), lead: compasso(s.lead[i] || 'r:16'), arpejo: !!s.arpejo }));
  }
  return lista;
}

let tocando = null, timer = null, ligada = true;
try { ligada = localStorage.getItem('pnt-musica') !== '0'; } catch {}
export const musicaLigada = () => ligada;
export function ligarMusica(v) {
  ligada = v;
  try { localStorage.setItem('pnt-musica', v ? '1' : '0'); } catch {}
  if (!v) parar();
}

let saida = null, pulso = null;
function prepararSaida(ac) {
  if (saida) return;
  saida = ac.createGain(); saida.gain.value = 0.16; saida.connect(ac.destination);
  // onda "pulso 25%" (o som clássico dos videogames de 8/16 bits)
  const n = 32, re = new Float32Array(n), im = new Float32Array(n);
  for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * 0.25);
  pulso = ac.createPeriodicWave(re, im);
}

function nota(ac, t, freq, dur, tipo, vol, destino) {
  const o = ac.createOscillator(), g = ac.createGain();
  if (tipo === 'pulso') o.setPeriodicWave(pulso); else o.type = tipo;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.008);
  g.gain.setTargetAtTime(vol * 0.65, t + 0.02, 0.08);
  g.gain.setTargetAtTime(0, t + dur * 0.92, 0.02);
  o.connect(g); g.connect(destino); o.start(t); o.stop(t + dur + 0.1);
}
let ruidoBuf = null;
function batida(ac, t, tipo) {
  if (!ruidoBuf) {
    ruidoBuf = ac.createBuffer(1, ac.sampleRate * 0.3, ac.sampleRate);
    const d = ruidoBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (tipo === 'k') {
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    o.connect(g); g.connect(saida); o.start(t); o.stop(t + 0.2);
    return;
  }
  const s = ac.createBufferSource(); s.buffer = ruidoBuf;
  const f = ac.createBiquadFilter(), g = ac.createGain();
  if (tipo === 's') { f.type = 'bandpass'; f.frequency.value = 1800; g.gain.setValueAtTime(0.6, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.13); }
  else { f.type = 'highpass'; f.frequency.value = 7000; g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.04); }
  s.connect(f); f.connect(g); g.connect(saida); s.start(t); s.stop(t + 0.2);
}

export function tocar(indice) {
  parar();
  const ac = contexto();
  if (!ac || !ligada) return;
  prepararSaida(ac);
  saida.gain.setValueAtTime(0.16, ac.currentTime);
  const m = MUSICAS[indice % MUSICAS.length];
  const compassos = montar(m);
  const baixo = compasso(BAIXOS[m.baixo].replace(/[rof]:/g, 'C4:'));
  const baixoTipo = BAIXOS[m.baixo].split(/\s+/).map(t => t[0]);
  const semi = 60 / m.bpm / 4;
  let passoGlobal = 0, proximo = ac.currentTime + 0.1;
  tocando = { m, inicio: proximo };
  timer = setInterval(() => {
    while (proximo < ac.currentTime + 0.15) {
      const c = compassos[Math.floor(passoGlobal / 16) % compassos.length];
      const p = passoGlobal % 16;
      // melodia
      for (const n of c.lead) if (n.passo === p) nota(ac, proximo, hz(n.nota), n.dur * semi, 'pulso', 0.32, saida);
      // baixo
      baixo.forEach((b, i) => {
        if (b.passo !== p) return;
        const tipo = baixoTipo[i];
        const intervalo = tipo === 'o' ? 12 : tipo === 'f' ? 7 : 0;
        nota(ac, proximo, hz(36 + c.acorde.raiz + intervalo), b.dur * semi, 'triangle', 0.55, saida);
        nota(ac, proximo, hz(48 + c.acorde.raiz + intervalo), b.dur * semi * 0.5, 'square', 0.06, saida);
      });
      // arpejo
      if (c.arpejo || c.intro) {
        const ns = c.acorde.notas, oit = c.intro ? 60 : 72;
        nota(ac, proximo, hz(oit + c.acorde.raiz + ns[p % 3] + (p % 6 >= 3 ? 12 : 0)), semi, 'square', 0.05, saida);
      }
      // bateria
      for (const k of ['k', 's', 'h']) if (m.bateria[k][p] === 'x') batida(ac, proximo, k);
      proximo += semi; passoGlobal++;
    }
  }, 25);
}

export function parar() {
  if (timer) clearInterval(timer);
  timer = null; tocando = null;
  const ac = contexto();
  if (ac && saida) saida.gain.setTargetAtTime(0, ac.currentTime, 0.05);
  saida = null;   // notas já agendadas morrem com a saída antiga
}
export const tocandoAgora = () => tocando && tocando.m.nome;
