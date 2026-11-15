// Temas das pistas: cores, fundo, objetos da beira, perigos e músicas.
// Toda a arte é pixel art feita por código, original (nada copiado de outros jogos).
import { novo, aleatorio, coqueiro, guardaSol, placaSeta, quiosque, pedra, poste, criarFundo } from './sprites.js';

// ---------- objetos comuns ----------
function placaRampa() {
  const [c, p] = novo(24, 30);
  p('#7a7f87', 5, 16, 2, 14); p('#7a7f87', 17, 16, 2, 14);
  p('#222', 0, 0, 24, 18); p('#ff7a1a', 1, 1, 22, 16);
  for (let i = 0; i < 6; i++) p('#111', 12 - i, 3 + i, i * 2 + 1, 1);
  p('#111', 10, 9, 5, 6);
  return c;
}
function arco(cor1, cor2) {
  // anel do loop (a pista passa por dentro)
  const W = 120, H = 96;
  const [c, p] = novo(W, H);
  const cx = 60, cy = 52, R = 50, r = 40;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot(x - cx, (y - cy) * 1.05);
    if (d <= R && d >= r && y < 92) {
      const ang = Math.atan2(y - cy, x - cx);
      p(Math.floor((ang + Math.PI) * 6) % 2 ? cor1 : cor2, x, y);
    }
  }
  p('#555', 6, 80, 8, 16); p('#555', 106, 80, 8, 16);
  return c;
}
const COMUNS = () => ({
  setaDir: { img: placaSeta(1), mundo: 0.42, bate: 0.8 },
  setaEsq: { img: placaSeta(-1), mundo: 0.42, bate: 0.8 },
  placaRampa: { img: placaRampa(), mundo: 0.4, bate: 0.8 },
  posteE: { img: poste(-1), mundo: 0.3, bate: 0.25 },
  posteD: { img: poste(1), mundo: 0.3, bate: 0.25 },
  pedra: { img: pedra(), mundo: 0.4, bate: 0.9 },
});

// ---------- cidade ----------
function predio(sem, ruina = false) {
  const r = aleatorio(sem);
  const W = 40, H = 70 + Math.floor(r() * 40);
  const [c, p] = novo(W, H);
  const cores = ruina ? ['#3a3438', '#4a4246', '#2e2a2e'] : ['#b8b2a6', '#8d99a8', '#c9a27a', '#7c8794', '#d8cfc0'];
  const base = cores[Math.floor(r() * cores.length)];
  p(base, 0, 6, W, H - 6); p('rgba(0,0,0,.25)', W - 6, 6, 6, H - 6);
  p('rgba(255,255,255,.18)', 0, 6, 2, H - 6);
  for (let y = 12; y < H - 8; y += 8) for (let x = 4; x < W - 6; x += 7) {
    if (ruina && r() < 0.3) { p('#120e10', x - 1, y - 1, 6, 6); continue; }
    p(r() < (ruina ? 0.15 : 0.45) ? (ruina ? '#ff7a1a' : '#ffe9a0') : '#2b3240', x, y, 4, 5);
  }
  if (!ruina) { p('#555', 18, 0, 2, 6); p('#d8312f', 17, 0, 4, 2); }
  else { for (let x = 0; x < W; x += 3) p('rgba(0,0,0,0)', x, 6, 3, Math.floor(r() * 10)); p('#1b1416', 0, 6, W, 2); for (let x = 0; x < W; x += 4) p('#1b1416', x, 6, 4, 2 + Math.floor(r() * 12)); }
  p('#3a3a44', 0, H - 8, W, 8); p('#9fd8ff', 12, H - 7, 16, 6);
  return c;
}
function ipe(cor, sem) {
  const r = aleatorio(sem);
  const [c, p] = novo(40, 56);
  p('#6b4532', 18, 26, 4, 30); p('#6b4532', 14, 30, 4, 2); p('#6b4532', 22, 32, 5, 2);
  const esc = cor === '#ffd23f' ? '#e0a800' : '#d64f9a';
  for (let i = 0; i < 70; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 16; p(r() < 0.3 ? esc : cor, 20 + Math.cos(a) * d - 2, 18 + Math.sin(a) * d * 0.8 - 2, 4, 4); }
  return c;
}
function semaforo() {
  const [c, p] = novo(12, 54);
  p('#3a3f47', 5, 14, 2, 40); p('#222', 2, 0, 8, 16); p('#ff3b30', 4, 2, 4, 3); p('#553', 4, 6, 4, 3); p('#353', 4, 10, 4, 3);
  c.luz = { x: 0.5, y: 3.5 / 54, cor: 'rgba(255,60,40,A)' };
  return c;
}
function pontoOnibus() {
  const [c, p] = novo(48, 32);
  p('#2e86de', 0, 0, 48, 4); p('#9fd8ff88', 2, 4, 44, 16); p('#555', 2, 4, 2, 28); p('#555', 44, 4, 2, 28);
  p('#8a5a2e', 8, 22, 32, 3); p('#ffd23f', 34, 6, 8, 10); p('#222', 36, 8, 4, 2);
  return c;
}
function muroGrafite(sem) {
  const r = aleatorio(sem);
  const [c, p] = novo(60, 24);
  p('#9a9a96', 0, 0, 60, 24); p('#7d7d7a', 0, 20, 60, 4);
  const cores = ['#ff5fa2', '#36b6ff', '#ffd23f', '#2fd47a', '#8f6bff', '#ff7a1a'];
  for (let i = 0; i < 9; i++) { const x = r() * 52, y = 2 + r() * 14, w = 6 + r() * 10; p(cores[i % cores.length], x, y, w, 4 + r() * 4); p('#222', x, y + 7, w, 1); }
  return c;
}
function skyline(alt, ruina, sem) {
  const r = aleatorio(sem);
  const [c, p] = novo(512, alt);
  for (const [camada, cor, janela] of [[0, ruina ? '#3a1c22' : '#7d8db0', ruina ? '#ff7a1a' : '#c8d6f0'], [1, ruina ? '#24121a' : '#55607e', ruina ? '#ffb347' : '#ffe9a0']]) {
    let x = 0;
    while (x < 512) {
      const w = 14 + Math.floor(r() * 26), h = Math.floor(alt * (0.25 + r() * (camada ? 0.6 : 0.75)));
      p(cor, x, alt - h, w, h);
      for (let y = alt - h + 4; y < alt - 3; y += 5) for (let xx = x + 2; xx < x + w - 2; xx += 4) if (r() < 0.25) p(janela, xx, y, 2, 2);
      if (ruina && r() < 0.5) for (let k = 0; k < 5; k++) p('#000', x + r() * w, alt - h, 3, 2 + r() * 6);
      if (!ruina && r() < 0.15) { p(cor, x + w / 2, alt - h - 14, 2, 14); p('#d8312f', x + w / 2 - 1, alt - h - 15, 4, 2); }
      x += w + (camada ? 2 : 6);
    }
  }
  if (ruina) for (let i = 0; i < 40; i++) p(r() < 0.5 ? '#ff7a1a' : '#ffd23f', r() * 512, alt - r() * alt * 0.5, 2, 2);
  return c;
}

// ---------- Rio ----------
function morrosRio() {
  const H = 72;
  const [c, p, g] = novo(512, H);
  const r = aleatorio(31);
  const morro = (cx, h, w, cor, topo, pao) => {
    for (let x = Math.floor(cx - w); x < cx + w; x++) {
      const u = Math.abs(x - cx) / w;
      const f = pao ? Math.sqrt(Math.max(0, 1 - Math.pow(u, 3))) : Math.cos(u * Math.PI / 2);
      const t = Math.round(H - h * f);
      const xx = ((x % 512) + 512) % 512;
      p(cor, xx, t, 1, H - t); p(topo, xx, t, 1, 2);
    }
  };
  morro(80, 50, 30, '#4d7a5a', '#6fa07a', true); morro(130, 34, 26, '#4d7a5a', '#6fa07a', true);
  morro(300, 66, 60, '#3f6b4c', '#5e9068', false); morro(420, 40, 50, '#4a7656', '#6a9a74', false);
  // estátua de braços abertos no morro mais alto
  p('#e9eef5', 298, 0, 4, 12); p('#e9eef5', 291, 3, 18, 2); p('#e9eef5', 297, 12, 6, 3);
  // casinhas coloridas no pé dos morros
  const cs = ['#ff5fa2', '#ffd23f', '#36b6ff', '#ff7a1a', '#ffffff', '#2fd47a'];
  for (let i = 0; i < 140; i++) { const x = 230 + r() * 260, y = H - 4 - r() * 26; p(cs[Math.floor(r() * cs.length)], x % 512, y, 3, 3); }
  return c;
}

// ---------- Japão / festival ----------
function sakura(sem) {
  const r = aleatorio(sem);
  const [c, p] = novo(44, 54);
  p('#4a2f2a', 20, 24, 4, 30); p('#4a2f2a', 12, 24, 8, 2); p('#4a2f2a', 24, 20, 8, 2);
  for (let i = 0; i < 90; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 18; p(r() < 0.35 ? '#ff9ac8' : r() < 0.5 ? '#ffd3e6' : '#ffb6d5', 22 + Math.cos(a) * d - 2, 16 + Math.sin(a) * d * 0.7 - 2, 3, 3); }
  return c;
}
function torii() {
  const [c, p] = novo(140, 80);
  const v = '#d8312f', e = '#8a1c14';
  p(v, 22, 16, 8, 64); p(v, 110, 16, 8, 64); p(e, 28, 16, 2, 64); p(e, 116, 16, 2, 64);
  p('#222', 0, 2, 140, 6); for (let x = 0; x < 140; x++) { const curva = Math.round(Math.pow((x - 70) / 70, 2) * -5); p('#222', x, 2 + curva, 1, 3); }
  p(v, 4, 8, 132, 6); p(v, 14, 24, 112, 5); p(e, 66, 14, 8, 10);
  p('#222', 20, 76, 12, 4); p('#222', 108, 76, 12, 4);
  return c;
}
function lanternaPedra() {
  const [c, p] = novo(16, 28);
  p('#8b8f99', 2, 2, 12, 4); p('#a9adb6', 4, 6, 8, 8); p('#ffe9a0', 6, 8, 4, 4); p('#8b8f99', 6, 14, 4, 8); p('#7a7f87', 3, 22, 10, 6);
  c.luz = { x: 0.5, y: 10 / 28, cor: 'rgba(255,220,140,A)' };
  return c;
}
function bambu(sem) {
  const r = aleatorio(sem);
  const [c, p] = novo(20, 64);
  for (let k = 0; k < 4; k++) { const x = 2 + k * 4 + Math.floor(r() * 2); p(k % 2 ? '#4caf50' : '#3a8f3e', x, Math.floor(r() * 8), 3, 64); for (let y = 6; y < 64; y += 10) p('#2e6b30', x, y, 3, 1); }
  for (let i = 0; i < 10; i++) p('#58d27a', r() * 18, r() * 30, 4, 2);
  return c;
}
function pagode() {
  const [c, p] = novo(40, 70);
  for (let k = 0; k < 4; k++) { const y = 8 + k * 15, w = 22 + k * 5; p('#2b2a3a', 20 - w / 2 - 3, y, w + 6, 3); p('#8a1c14', 20 - w / 2 + 2, y + 3, w - 4, 12); p('#ffe9a0', 18, y + 6, 4, 5); }
  p('#c9a227', 19, 0, 2, 8);
  return c;
}
function fuji() {
  const H = 80;
  const [c, p] = novo(512, H);
  for (let x = 0; x < 512; x++) {
    const u = Math.abs(x - 256) / 200;
    if (u < 1) {
      const t = Math.round(H - 74 * (1 - u) - (u < 0.08 ? -4 * (1 - u / 0.08) : 0));
      p('#5b6fa8', x, t, 1, H - t);
      const neve = Math.round(26 * (1 - u * 1.4) + Math.sin(x * 0.7) * 3);
      if (neve > 0) p('#f4f8ff', x, t, 1, Math.min(neve, H - t));
    }
    const m = Math.round(H - 18 - 10 * Math.sin(x / 40) - 6 * Math.sin(x / 13));
    p('#4c8c5c', x, m, 1, H - m);
  }
  return c;
}
function taiko(sem) {
  const r = aleatorio(sem);
  const [c, p] = novo(32, 34);
  p('#5a3420', 4, 26, 3, 8); p('#5a3420', 25, 26, 3, 8); p('#5a3420', 2, 24, 28, 3);
  p('#9c5a2c', 4, 4, 24, 20); p('#b8743f', 2, 8, 28, 12); p('#7a4220', 4, 22, 24, 2);
  p('#f4e6c8', 6, 4, 20, 3); p('#d8312f', 4, 3, 24, 1);
  for (let x = 4; x < 28; x += 3) p('#222', x, 7, 1, 1);
  p('#ffd23f', 12, 12, 8, 4); p('#d8312f', 14, 13, 4, 2);
  if (r() < 0.5) { p('#c99a6a', 26, 0, 2, 8); p('#c99a6a', 4, 0, 2, 8); }
  return c;
}
function yatai(sem) {
  const r = aleatorio(sem);
  const [c, p] = novo(50, 42);
  for (let x = 0; x < 50; x += 6) p(Math.floor(x / 6) % 2 ? '#ffffff' : '#d8312f', x, 0, 6, 8);
  p('#6b4532', 2, 8, 3, 34); p('#6b4532', 45, 8, 3, 34); p('#8a5a2e', 0, 26, 50, 16); p('#b8743f', 0, 26, 50, 3);
  const cor = ['#ffd23f', '#ff9ac8', '#9fe6ff'][Math.floor(r() * 3)];
  p(cor, 8, 12, 12, 8); p('#ff3b30', 30, 10, 8, 10); p('#ffe9a0', 32, 12, 4, 6);
  c.luz = { x: 0.68, y: 15 / 42, cor: 'rgba(255,120,80,A)' };
  return c;
}
function postesLanternas(lado) {
  const [c, p] = novo(18, 60);
  const x = lado < 0 ? 3 : 13;
  p('#4a2f22', x, 6, 2, 54);
  for (let k = 0; k < 3; k++) { const y = 8 + k * 9; p('#d8312f', lado < 0 ? x + 2 : x - 8, y, 8, 7); p('#ffb347', lado < 0 ? x + 4 : x - 6, y + 2, 4, 3); }
  c.luz = { x: (lado < 0 ? x + 6 : x - 4) / 18, y: 20 / 60, cor: 'rgba(255,140,80,A)' };
  return c;
}
function colinasNoite() {
  const H = 60;
  const [c, p] = novo(512, H);
  for (let x = 0; x < 512; x++) { const t = Math.round(H - 20 - 12 * Math.sin(x / 50) - 6 * Math.sin(x / 17)); p('#26304a', x, t, 1, H - t); }
  // templo
  for (let k = 0; k < 3; k++) { const w = 30 - k * 8, y = 6 + k * 10; p('#141826', 380 - w / 2, y, w, 4); p('#3a1c22', 380 - w / 2 + 3, y + 4, w - 6, 6); }
  for (let i = 0; i < 30; i++) p(i % 2 ? '#ff7a3a' : '#ffd23f', (i * 37) % 512, H - 14 - (i * 13) % 20, 2, 2);
  return c;
}

// ---------- revolução das máquinas ----------
function robo(sem) {
  const r = aleatorio(sem);
  const [c, p] = novo(28, 50);
  const m = r() < 0.5 ? '#8a93a1' : '#5c6470';
  p(m, 8, 0, 12, 10); p('#ff2a2a', 9, 4, 10, 2); p('#3a3f47', 12, 10, 4, 3);
  p(m, 5, 13, 18, 16); p('#3a3f47', 9, 16, 10, 6); p('#ff2a2a', 13, 18, 2, 2);
  p(m, 1, 14, 4, 14); p(m, 23, 14, 4, 14); p(m, 7, 29, 5, 19); p(m, 16, 29, 5, 19); p('#222', 6, 47, 7, 3); p('#222', 15, 47, 7, 3);
  c.luz = { x: 0.5, y: 5 / 50, cor: 'rgba(255,40,40,A)' };
  return c;
}
function carcaca(sem) {
  const r = aleatorio(sem);
  const [c, p] = novo(52, 26);
  p('#2a2628', 2, 10, 48, 10); p('#3a3438', 10, 4, 28, 8); p('#120e10', 14, 6, 20, 4);
  p('#111', 6, 18, 9, 8); p('#111', 36, 18, 9, 8);
  for (let i = 0; i < 8; i++) p(r() < 0.5 ? '#ff7a1a' : '#ffd23f', 6 + r() * 40, 8 + r() * 10, 2, 2);
  c.luz = { x: 0.5, y: 0.5, cor: 'rgba(255,120,40,A)' };
  return c;
}
function torreTorta() {
  const [c, p] = novo(34, 74);
  for (let y = 0; y < 74; y++) {
    const torto = y < 30 ? Math.round((30 - y) * 0.4) : 0;
    const w = 4 + Math.round(y * 0.3);
    p('#4a4246', 17 - w / 2 + torto, y, 2, 1); p('#4a4246', 17 + w / 2 + torto, y, 2, 1);
    if (y % 8 === 0) p('#4a4246', 17 - w / 2 + torto, y, w + 2, 1);
  }
  p('#ff2a2a', 26, 0, 3, 3);
  return c;
}
function telao(sem) {
  const r = aleatorio(sem);
  const [c, p] = novo(48, 44);
  p('#3a3f47', 22, 30, 4, 14); p('#222', 0, 0, 48, 30); p('#5a0d12', 2, 2, 44, 26);
  for (let y = 4; y < 26; y += 3) p('#ff2a2a', 4 + r() * 8, y, 10 + r() * 26, 1);
  p('#ffd0d0', 18, 8, 12, 12); p('#5a0d12', 20, 10, 3, 3); p('#5a0d12', 25, 10, 3, 3); p('#5a0d12', 20, 16, 8, 2);
  c.luz = { x: 0.5, y: 0.3, cor: 'rgba(255,40,40,A)' };
  return c;
}
function drone(f) {
  const [c, p] = novo(44, 22);
  p('#5c6470', 10, 8, 24, 8); p('#3a3f47', 14, 14, 16, 4); p('#ff2a2a', 19, 15, 6, 2);
  p('#3a3f47', 2, 6, 10, 2); p('#3a3f47', 32, 6, 10, 2);
  const h = f ? 6 : 2;
  p('#aab3c0', 7 - h, 3, h * 2, 2); p('#aab3c0', 37 - h, 3, h * 2, 2);
  return c;
}

// ---------- floresta dos vampiros ----------
function pinheiro(sem) {
  const r = aleatorio(sem);
  const H = 64 + Math.floor(r() * 16);
  const [c, p] = novo(34, H);
  p('#4a3326', 15, H - 14, 4, 14);
  for (let k = 0; k < 5; k++) {
    const y0 = 2 + k * (H - 16) / 5, larg = 6 + k * 3;
    for (let y = 0; y < (H - 16) / 5 + 4; y++) { const w = Math.round(larg * (y + 2) / ((H - 16) / 5 + 4)); p(k % 2 ? '#1e4a33' : '#24573c', 17 - w, y0 + y, w * 2, 1); p('#173a28', 17 + w - 2, y0 + y, 2, 1); }
  }
  for (let i = 0; i < 8; i++) p('rgba(200,220,210,.35)', 6 + r() * 22, 6 + r() * (H - 24), 2, 1);
  return c;
}
function samambaia(sem) {
  const r = aleatorio(sem);
  const [c, p] = novo(26, 14);
  for (let k = 0; k < 6; k++) { const a = -Math.PI * (0.15 + k * 0.14); for (let t = 0; t < 12; t++) p(t % 2 ? '#3f8a4c' : '#2f6b3a', 13 + Math.cos(a) * t, 13 + Math.sin(a) * t * 0.9, 2, 2); }
  return c;
}
function casaVelha() {
  const [c, p] = novo(56, 44);
  for (let y = 0; y < 16; y++) p('#3a2a22', 28 - y * 1.7, y, y * 3.4, 1);
  p('#5a4030', 4, 16, 48, 28); for (let y = 18; y < 44; y += 4) p('#4a3326', 4, y, 48, 1);
  p('#ffe9a0', 12, 22, 8, 7); p('#ffe9a0', 36, 22, 8, 7); p('#2a1c16', 25, 30, 7, 14);
  c.luz = { x: 0.3, y: 0.58, cor: 'rgba(255,220,140,A)' };
  return c;
}
function lobo(f) {
  // visto de trás, correndo: orelhas em pé, rabo peludo e patas alternando
  const [c, p] = novo(26, 24);
  const a = f ? 3 : 0, b = f ? 0 : 3;
  p('#2a2c33', 5, 7, 16, 11); p('#5f6470', 6, 8, 14, 9); p('#8a909c', 8, 8, 10, 3);      // corpo
  p('#2a2c33', 7, 0, 12, 8); p('#5f6470', 8, 1, 10, 6);                                   // cabeça
  p('#2a2c33', 7, -1, 3, 4); p('#2a2c33', 16, -1, 3, 4); p('#d8a0a8', 8, 1, 1, 2); p('#d8a0a8', 17, 1, 1, 2); // orelhas
  p('#2a2c33', 11, 10 - a, 4, 10); p('#9aa0ac', 12, 11 - a, 2, 7); p('#ffffff', 12, 17 - a, 2, 2);          // rabo
  p('#2a2c33', 6, 17, 4, 7 - b); p('#2a2c33', 16, 17, 4, 7 - a); p('#2a2c33', 9, 17, 3, 6 - a); p('#2a2c33', 14, 17, 3, 6 - b); // patas
  return c;
}
function lobisomem(f) {
  // lobisomem marombeiro (visto de trás): costas peludas, sem camisa, bermuda jeans, braços pra cima
  const [c, p] = novo(30, 40);
  const a = f ? 2 : 0, b = f ? 0 : 2;
  p('#5a3a26', 8, 10, 14, 14); p('#7a5236', 9, 11, 12, 10); p('#8a6040', 11, 12, 8, 3);          // costas
  p('#5a3a26', 10, 1, 10, 10); p('#7a5236', 11, 2, 8, 7);                                      // cabeça
  p('#5a3a26', 10, -2, 3, 5); p('#5a3a26', 17, -2, 3, 5);                                       // orelhas
  p('#5a3a26', 2, 2 + a, 6, 4); p('#5a3a26', 1, 4 + a, 4, 9); p('#5a3a26', 22, 2 + b, 6, 4); p('#5a3a26', 25, 4 + b, 4, 9); // braços (bíceps!)
  p('#2e5aa8', 8, 24, 14, 7); p('#3f6fd8', 9, 24, 12, 2);                                       // bermuda
  p('#5a3a26', 9, 31, 4, 9 - a * 2); p('#5a3a26', 17, 31, 4, 9 - b * 2);                         // pernas
  return c;
}
function florestaLonge() {
  const H = 70;
  const [c, p] = novo(512, H);
  const r = aleatorio(77);
  for (const [cor, alt, dens] of [['#6f8296', 46, 9], ['#4f6474', 34, 7], ['#2f4a3e', 22, 5]]) {
    for (let x = 0; x < 512; x += dens) {
      const h = alt - r() * 14, w = dens * 0.9;
      for (let y = 0; y < h; y++) { const ww = Math.round(w * (y / h)); p(cor, x - ww + dens / 2, H - h + y, ww * 2 + 1, 1); }
    }
  }
  return c;
}

// ---------- festival da lua ----------
function lanternaCoelho(sem) {
  const r = aleatorio(sem);
  const [c, p] = novo(22, 30);
  p('#6b4532', 10, 14, 2, 16);
  p('#fff6ea', 4, 6, 14, 9); p('#fff6ea', 6, 4, 10, 2); p('#fff6ea', 6, 0, 3, 5); p('#fff6ea', 12, 0, 3, 5);
  p('#ff9ac8', 7, 1, 1, 3); p('#ff9ac8', 13, 1, 1, 3); p('#d8312f', 13, 8, 2, 2); p('#ffd23f', 4, 13, 14, 2);
  if (r() < 0.5) p('#ffb347', 2, 10, 2, 2);
  c.luz = { x: 0.5, y: 0.3, cor: 'rgba(255,230,180,A)' };
  return c;
}
function osmanto(sem) {
  const r = aleatorio(sem);
  const [c, p] = novo(40, 52);
  p('#5a3a2a', 18, 26, 4, 26);
  for (let i = 0; i < 80; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 17; p(r() < 0.2 ? '#ffc94d' : r() < 0.5 ? '#2f7a3e' : '#3c9450', 20 + Math.cos(a) * d - 2, 18 + Math.sin(a) * d * 0.8 - 2, 3, 3); }
  return c;
}
function barracaLua(sem) {
  const r = aleatorio(sem);
  const [c, p] = novo(50, 42);
  for (let x = 0; x < 50; x += 6) p(Math.floor(x / 6) % 2 ? '#ffc94d' : '#c41e1e', x, 0, 6, 8);
  p('#6b2a1a', 2, 8, 3, 34); p('#6b2a1a', 45, 8, 3, 34); p('#8a2a1a', 0, 26, 50, 16); p('#c9a227', 0, 26, 50, 2);
  for (let k = 0; k < 4; k++) { p('#c98a3a', 6 + k * 10, 20, 8, 6); p('#e8b45a', 7 + k * 10, 21, 6, 2); }
  p('#ff3b30', 22, 9, 6, 8); p('#ffd23f', 24, 11, 2, 4);
  c.luz = { x: 0.5, y: 0.3, cor: 'rgba(255,140,80,A)' };
  return c;
}
function lanternasVermelhas(lado) {
  const [c, p] = novo(18, 60);
  const x = lado < 0 ? 3 : 13;
  p('#6b2a1a', x, 6, 2, 54); p('#6b2a1a', lado < 0 ? x : x - 10, 6, 12, 2);
  const lx = lado < 0 ? x + 6 : x - 8;
  p('#c41e1e', lx, 8, 8, 10); p('#ff4a3a', lx + 1, 9, 6, 8); p('#ffc94d', lx + 2, 18, 4, 3); p('#ffc94d', lx + 2, 7, 4, 1);
  c.luz = { x: (lx + 4) / 18, y: 13 / 60, cor: 'rgba(255,90,60,A)' };
  return c;
}
function cidadeLua() {
  const H = 64;
  const [c, p] = novo(512, H);
  const r = aleatorio(8);
  for (let x = 0; x < 512; x++) { const t = Math.round(H - 24 - 10 * Math.sin(x / 60) - 5 * Math.sin(x / 19)); p('#1e2440', x, t, 1, H - t); }
  for (const cx of [90, 260, 420]) for (let k = 0; k < 4; k++) { const w = 26 - k * 5, y = 6 + k * 9; p('#141826', cx - w / 2 - 2, y, w + 4, 3); p('#5a1414', cx - w / 2 + 2, y + 3, w - 4, 6); p('#ffc94d', cx - 1, y + 4, 2, 3); }
  for (let i = 0; i < 60; i++) p(r() < 0.5 ? '#ffc94d' : '#ff6a3a', r() * 512, H - 4 - r() * 18, 2, 2);
  return c;
}

// ---------- o catálogo de temas ----------
function mar() { return criarFundo(108).mar; }

let cache = {};
export function tema(id) {
  if (cache[id]) return cache[id];
  const base = COMUNS();
  const f = criarFundo(108);
  const T = {
    praia: {
      nome: 'Praia', icone: '🏖️',
      cores: { ceuTopo: '#2f8fe8', ceuBaixo: '#bfe9ff', claro: { estrada: '#70747e', chao: '#f2d391', zebra: '#ffffff', faixa: '#ffffff' }, escuro: { estrada: '#686c76', chao: '#e9c77f', zebra: '#d8312f', faixa: null } },
      fundo: { ceu: f.nuvens, longe: f.morros, faixa: f.mar },
      sprites: { coqueiro1: { img: coqueiro(1), mundo: 0.9, bate: 0.25 }, coqueiro2: { img: coqueiro(7), mundo: 1, bate: 0.25 }, coqueiro3: { img: coqueiro(13), mundo: 0.85, bate: 0.25 },
        guardaSol1: { img: guardaSol('#ff5a4e'), mundo: 0.7, bate: 0.15 }, guardaSol2: { img: guardaSol('#2e86de'), mundo: 0.7, bate: 0.15 }, quiosque: { img: quiosque(), mundo: 1.3, bate: 0.9 } },
      beira: [{ tipo: ['coqueiro1', 'coqueiro2', 'coqueiro3'], cada: 5, lado: -1, min: 1.35, max: 3.7 }, { tipo: ['coqueiro1', 'coqueiro2', 'coqueiro3'], cada: 8, lado: 1, min: 1.35, max: 3.7 },
        { tipo: ['guardaSol1', 'guardaSol2'], cada: 11, lado: -1, min: 3.2, max: 5.2 }, { tipo: 'quiosque', cada: 160, min: 1.8 }, { tipo: 'posteE', cada: 16, lado: -1, min: 1.22, desde: 14 }, { tipo: 'posteD', cada: 16, lado: 1, min: 1.22, desde: 22 }, { tipo: 'pedra', cada: 37, min: 1.4, max: 2.9 }],
      perigos: ['lava', 'fogo', 'caminhao', 'onda'], skins: {}, musicas: [0, 2],
    },
    rio: {
      nome: 'Rio de Janeiro', icone: '🌴',
      cores: { ceuTopo: '#3a9cf0', ceuBaixo: '#d6f1ff', claro: { estrada: '#6a6e78', chao: '#f4dfa8', zebra: '#ffffff', faixa: '#ffd23f' }, escuro: { estrada: '#62666f', chao: '#ecd396', zebra: '#2fa84f', faixa: null }, calcadao: true },
      fundo: { ceu: f.nuvens, longe: morrosRio(), faixa: mar() },
      sprites: { coqueiro1: { img: coqueiro(3), mundo: 0.95, bate: 0.25 }, coqueiro2: { img: coqueiro(9), mundo: 1, bate: 0.25 }, guardaSol1: { img: guardaSol('#ffd23f'), mundo: 0.7, bate: 0.15 }, guardaSol2: { img: guardaSol('#2fa84f'), mundo: 0.7, bate: 0.15 }, quiosque: { img: quiosque(), mundo: 1.3, bate: 0.9 }, predio1: { img: predio(5), mundo: 1.6, bate: 0.9 }, predio2: { img: predio(8), mundo: 1.6, bate: 0.9 } },
      beira: [{ tipo: ['coqueiro1', 'coqueiro2'], cada: 6, lado: -1, min: 1.6, max: 3.5 }, { tipo: ['guardaSol1', 'guardaSol2'], cada: 9, lado: -1, min: 3.6, max: 5.5 }, { tipo: ['predio1', 'predio2'], cada: 7, lado: 1, min: 2.2, max: 3.2 }, { tipo: 'coqueiro2', cada: 14, lado: 1, min: 1.4 }, { tipo: 'quiosque', cada: 120, lado: -1, min: 1.7 }, { tipo: 'posteD', cada: 18, lado: 1, min: 1.22 }],
      perigos: ['onda', 'caminhao', 'fogo'], skins: { fogo: { nome: 'BALÃO PEGANDO FOGO!', icone: '🎈' } }, musicas: [0, 3],
    },
    sp: {
      nome: 'São Paulo', icone: '🏙️',
      cores: { ceuTopo: '#7d93b8', ceuBaixo: '#cfd8e6', claro: { estrada: '#55585f', chao: '#a3a7b0', zebra: '#ffd23f', faixa: '#ffffff' }, escuro: { estrada: '#4f5258', chao: '#989ca6', zebra: '#222222', faixa: null } },
      fundo: { ceu: f.nuvens, longe: skyline(70, false, 4), faixa: null },
      sprites: { predio1: { img: predio(1), mundo: 1.7, bate: 0.95 }, predio2: { img: predio(2), mundo: 1.6, bate: 0.95 }, predio3: { img: predio(3), mundo: 1.8, bate: 0.95 }, predio4: { img: predio(4), mundo: 1.5, bate: 0.95 },
        ipeA: { img: ipe('#ffd23f', 1), mundo: 0.9, bate: 0.2 }, ipeR: { img: ipe('#ff7ec0', 2), mundo: 0.9, bate: 0.2 }, semaforo: { img: semaforo(), mundo: 0.26, bate: 0.3 }, ponto: { img: pontoOnibus(), mundo: 0.9, bate: 0.9 }, muro1: { img: muroGrafite(1), mundo: 1.3, bate: 0.95 }, muro2: { img: muroGrafite(2), mundo: 1.3, bate: 0.95 } },
      beira: [{ tipo: ['predio1', 'predio2', 'predio3', 'predio4'], cada: 4, lado: -1, min: 2.4, max: 3.4 }, { tipo: ['predio1', 'predio2', 'predio3', 'predio4'], cada: 4, lado: 1, min: 2.4, max: 3.4, desde: 2 },
        { tipo: ['ipeA', 'ipeR'], cada: 9, min: 1.35, max: 1.7 }, { tipo: 'semaforo', cada: 40, min: 1.2 }, { tipo: 'ponto', cada: 70, min: 1.3 }, { tipo: ['muro1', 'muro2'], cada: 23, min: 1.5, max: 2 }],
      perigos: ['onda', 'caminhao'], skins: { onda: { nome: 'ALAGAMENTO!', icone: '🌧️' } }, musicas: [3, 1], chuvaExtra: 0.25,
    },
    japao: {
      nome: 'Japão', icone: '🗻',
      cores: { ceuTopo: '#6fb2f0', ceuBaixo: '#ffe3ef', claro: { estrada: '#6d6b75', chao: '#8fca6a', zebra: '#ffffff', faixa: '#ffffff' }, escuro: { estrada: '#66646e', chao: '#84bf60', zebra: '#d8312f', faixa: null } },
      fundo: { ceu: f.nuvens, longe: fuji(), faixa: null },
      sprites: { sakura1: { img: sakura(1), mundo: 1, bate: 0.2 }, sakura2: { img: sakura(5), mundo: 1.1, bate: 0.2 }, bambu: { img: bambu(3), mundo: 0.5, bate: 0.5 }, lanterna: { img: lanternaPedra(), mundo: 0.3, bate: 0.8 }, pagode: { img: pagode(), mundo: 1.3, bate: 0.9 }, torii: { img: torii(), mundo: 2.9, bate: 0 } },
      beira: [{ tipo: ['sakura1', 'sakura2'], cada: 5, min: 1.4, max: 3.5 }, { tipo: 'bambu', cada: 7, min: 1.5, max: 4 }, { tipo: 'lanterna', cada: 12, min: 1.25 }, { tipo: 'pagode', cada: 150, min: 2.6 }],
      portal: { tipo: 'torii', cada: 90 },
      perigos: ['fogo', 'onda', 'caminhao'], skins: { fogo: { nome: 'DRAGÃO!', icone: '🐲' } }, musicas: [4],
    },
    festival: {
      nome: 'Festival dos Tambores', icone: '🥁',
      cores: { ceuTopo: '#1a1440', ceuBaixo: '#5a2a6a', claro: { estrada: '#5a5560', chao: '#5a4636', zebra: '#ffd23f', faixa: '#ffffff' }, escuro: { estrada: '#54505a', chao: '#4e3c2e', zebra: '#d8312f', faixa: null } },
      fundo: { ceu: null, longe: colinasNoite(), faixa: null }, noite: true, fogos: true,
      sprites: { taiko1: { img: taiko(1), mundo: 0.55, bate: 0.8 }, taiko2: { img: taiko(2), mundo: 0.5, bate: 0.8 }, yatai1: { img: yatai(1), mundo: 1.1, bate: 0.9 }, yatai2: { img: yatai(2), mundo: 1.1, bate: 0.9 },
        lantE: { img: postesLanternas(-1), mundo: 0.34, bate: 0.25 }, lantD: { img: postesLanternas(1), mundo: 0.34, bate: 0.25 }, torii: { img: torii(), mundo: 2.9, bate: 0 } },
      beira: [{ tipo: ['taiko1', 'taiko2'], cada: 6, min: 1.3, max: 2 }, { tipo: ['yatai1', 'yatai2'], cada: 9, min: 2.4, max: 4 }, { tipo: 'lantE', cada: 10, lado: -1, min: 1.2 }, { tipo: 'lantD', cada: 10, lado: 1, min: 1.2, desde: 5 }],
      portal: { tipo: 'torii', cada: 120 },
      perigos: ['fogo', 'caminhao'], skins: { fogo: { nome: 'DRAGÃO DO FESTIVAL!', icone: '🐉' }, caminhao: { nome: 'CAMINHÃO DE FOGOS TOMBADO!', icone: '🎆' } }, musicas: [6],
    },
    ia: {
      nome: 'Revolução das Máquinas', icone: '🤖',
      cores: { ceuTopo: '#2a0a12', ceuBaixo: '#c2401c', claro: { estrada: '#3e3a3e', chao: '#5a4a44', zebra: '#d8312f', faixa: '#ff7a1a' }, escuro: { estrada: '#383438', chao: '#4e403b', zebra: '#111111', faixa: null } },
      fundo: { ceu: null, longe: skyline(76, true, 9), faixa: null }, cinzas: true,
      sprites: { robo1: { img: robo(1), mundo: 0.5, bate: 0.8 }, robo2: { img: robo(4), mundo: 0.55, bate: 0.8 }, carcaca: { img: carcaca(2), mundo: 0.9, bate: 0.9 }, torre: { img: torreTorta(), mundo: 0.9, bate: 0.3 }, telao: { img: telao(3), mundo: 1, bate: 0.3 },
        ruina1: { img: predio(11, true), mundo: 1.7, bate: 0.95 }, ruina2: { img: predio(12, true), mundo: 1.6, bate: 0.95 } },
      beira: [{ tipo: ['ruina1', 'ruina2'], cada: 6, min: 2.6, max: 4 }, { tipo: ['robo1', 'robo2'], cada: 9, min: 1.35, max: 2.2 }, { tipo: 'carcaca', cada: 17, min: 1.4, max: 2.4 }, { tipo: 'torre', cada: 31, min: 1.6, max: 2.5 }, { tipo: 'telao', cada: 47, min: 1.5 }],
      perigos: ['fogo', 'lava', 'caminhao'], skins: { fogo: { nome: 'LASER DE DRONE!', icone: '🛸', voador: 'drone', chama: 'laser' }, lava: { nome: 'METAL DERRETIDO!', icone: '🔥' }, caminhao: { nome: 'TANQUE-ROBÔ CAÍDO!', icone: '🤖' } }, musicas: [5],
    },
    vampiros: {
      nome: 'Floresta dos Vampiros', icone: '🧛',
      cores: { ceuTopo: '#7d8ea3', ceuBaixo: '#dfe6ec', claro: { estrada: '#5d6066', chao: '#3f6b48', zebra: '#e9eef5', faixa: '#e9eef5' }, escuro: { estrada: '#575a60', chao: '#38613f', zebra: '#3a3a44', faixa: null } },
      fundo: { ceu: f.nuvens, longe: florestaLonge(), faixa: null }, neblina: true, lobos: true, brilho: true,
      sprites: { pinheiro1: { img: pinheiro(1), mundo: 1, bate: 0.25 }, pinheiro2: { img: pinheiro(2), mundo: 1.15, bate: 0.25 }, pinheiro3: { img: pinheiro(3), mundo: 0.9, bate: 0.25 },
        samambaia: { img: samambaia(4), mundo: 0.5, bate: 0 }, casa: { img: casaVelha(), mundo: 1.4, bate: 0.9 } },
      beira: [{ tipo: ['pinheiro1', 'pinheiro2', 'pinheiro3'], cada: 3, lado: -1, min: 1.4, max: 4.5 }, { tipo: ['pinheiro1', 'pinheiro2', 'pinheiro3'], cada: 3, lado: 1, min: 1.4, max: 4.5, desde: 1 },
        { tipo: 'samambaia', cada: 4, min: 1.15, max: 1.8 }, { tipo: 'pedra', cada: 23, min: 1.3, max: 2.2 }, { tipo: 'casa', cada: 220, min: 2.4 }],
      perigos: ['caminhao', 'onda', 'fogo'], skins: { onda: { nome: 'ENXURRADA!', icone: '🌊' }, fogo: { nome: 'MORCEGÃO GIGANTE!', icone: '🦇' }, caminhao: { nome: 'ÁRVORE CAÍDA!', icone: '🌲' } },
      musicas: [1, 5], chuvaExtra: 0.45, rivalidade: true,
      // dois times: vampiros x lobos (o primeiro é o vampiro galã que para pra posar no sol)
      nomesNpc: ['Conde Purpurina', 'Vampirinha Lu', 'Dona Morcega', 'Lobo Marombeiro', 'Uivinha'],
      timesNpc: ['vampiro', 'vampiro', 'vampiro', 'lobo', 'lobo'],
    },
    lua: {
      nome: 'Festival da Lua', icone: '🥮',
      cores: { ceuTopo: '#0e1030', ceuBaixo: '#2c2a6a', claro: { estrada: '#4e4a58', chao: '#2f3a4a', zebra: '#ffc94d', faixa: '#ffc94d' }, escuro: { estrada: '#48445a', chao: '#2a3442', zebra: '#c41e1e', faixa: null } },
      fundo: { ceu: null, longe: cidadeLua(), faixa: null }, noite: true, lua: true, lanternasCeu: true,
      sprites: { coelho1: { img: lanternaCoelho(1), mundo: 0.38, bate: 0.6 }, coelho2: { img: lanternaCoelho(2), mundo: 0.34, bate: 0.6 }, osmanto1: { img: osmanto(1), mundo: 1, bate: 0.2 }, osmanto2: { img: osmanto(3), mundo: 0.9, bate: 0.2 },
        barraca1: { img: barracaLua(1), mundo: 1.1, bate: 0.9 }, barraca2: { img: barracaLua(2), mundo: 1.1, bate: 0.9 }, lantE: { img: lanternasVermelhas(-1), mundo: 0.34, bate: 0.25 }, lantD: { img: lanternasVermelhas(1), mundo: 0.34, bate: 0.25 }, pagode: { img: pagode(), mundo: 1.3, bate: 0.9 } },
      beira: [{ tipo: 'lantE', cada: 8, lado: -1, min: 1.2 }, { tipo: 'lantD', cada: 8, lado: 1, min: 1.2, desde: 4 }, { tipo: ['coelho1', 'coelho2'], cada: 5, min: 1.5, max: 2.4 },
        { tipo: ['osmanto1', 'osmanto2'], cada: 6, min: 2.4, max: 4.5 }, { tipo: ['barraca1', 'barraca2'], cada: 14, min: 2.6, max: 3.8 }, { tipo: 'pagode', cada: 180, min: 3 }],
      perigos: ['fogo', 'caminhao', 'onda'], skins: { fogo: { nome: 'DRAGÃO DA LUA!', icone: '🐉' }, caminhao: { nome: 'CARROÇA DE BOLO-LUA TOMBADA!', icone: '🥮' }, onda: { nome: 'ONDA DO RIO!', icone: '🌊' } },
      musicas: [7],
    },
  }[id] || null;
  if (!T) return tema('praia');
  T.id = id;
  T.sprites = { ...base, ...T.sprites, arco: { img: arco(id === 'ia' ? '#ff2a2a' : '#ffd23f', id === 'ia' ? '#222' : '#d8312f'), mundo: 2.6, bate: 0 } };
  T.drone = [drone(0), drone(1)];
  T.lobo = [lobo(0), lobo(1)];
  T.lobisomem = [lobisomem(0), lobisomem(1)];
  cache[id] = T;
  return T;
}

export const PISTAS = ['praia', 'rio', 'sp', 'japao', 'festival', 'ia', 'vampiros', 'lua'];
export const nomePista = id => ({ praia: '🏖️ Praia', rio: '🌴 Rio de Janeiro', sp: '🏙️ São Paulo', japao: '🗻 Japão', festival: '🥁 Festival dos Tambores', ia: '🤖 Revolução das Máquinas', vampiros: '🧛 Floresta dos Vampiros', lua: '🥮 Festival da Lua' }[id] || id);
