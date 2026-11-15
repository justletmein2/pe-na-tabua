// Desenhos em pixel art feitos por código (nada de imagens copiadas de outros jogos).
// Cada objeto da beira da pista vira um canvas pequeno, que o jogo amplia sem suavizar.

function novo(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  return [c, (cor, x, y, lw = 1, lh = 1) => { g.fillStyle = cor; g.fillRect(x | 0, y | 0, lw, lh); }, g];
}

// semente fixa: os desenhos saem sempre iguais
function aleatorio(semente) {
  let s = semente >>> 0;
  return () => { s += 0x6D2B79F5; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

function coqueiro(semente) {
  const W = 40, H = 64;
  const [c, p] = novo(W, H);
  const r = aleatorio(semente);
  const curva = (r() - 0.5) * 10;
  // tronco
  let topo = { x: 20, y: 16 };
  for (let y = H - 1; y >= 16; y--) {
    const t = (H - 1 - y) / (H - 17);
    const x = 18 + curva * t * t;
    const faixa = Math.floor(y / 4) % 2;
    p(faixa ? '#a8743f' : '#8a5a2e', x - 2, y, 5, 1);
    p('#c99566', x - 2, y, 1, 1);
    p('#5e3b1c', x + 2, y, 1, 1);
    if (y === 16) topo = { x: x + 0.5, y };
  }
  // folhas
  const folhas = [-2.9, -2.4, -1.8, -1.2, -0.6, -0.15, 0.2];
  for (const base of folhas) {
    const a = base + (r() - 0.5) * 0.25;
    const L = 15 + r() * 5, cai = 0.5 + r() * 0.4;
    for (let t = 0; t <= 1; t += 0.04) {
      const x = topo.x + Math.cos(a) * t * L;
      const y = topo.y + Math.sin(a) * t * L * 0.7 + cai * t * t * L;
      const larg = Math.max(1, Math.round(3 * (1 - t) + 1));
      p('#1f7a34', x - 1, y, 2, larg);
      p('#36a852', x - 1, y - 1, 2, 1);
      if (t > 0.2 && Math.floor(t * 25) % 2) p('#2b9145', x, y + larg, 1, 2);
    }
  }
  // cocos
  p('#6b4220', topo.x - 3, topo.y + 1, 3, 3); p('#6b4220', topo.x + 1, topo.y + 2, 3, 3);
  p('#8f5c30', topo.x - 3, topo.y + 1, 1, 1); p('#8f5c30', topo.x + 1, topo.y + 2, 1, 1);
  return c;
}

function guardaSol(cor1) {
  const W = 34, H = 30;
  const [c, p] = novo(W, H);
  p('#eeeeee', 16, 8, 2, 22);
  for (let y = 0; y < 10; y++) {
    const meia = Math.round(16 * Math.sqrt(1 - Math.pow((10 - y) / 10.5, 2)));
    for (let x = 17 - meia; x < 17 + meia; x++) {
      const fatia = Math.floor(((x - 17) / (meia || 1) + 1) * 3) % 2;
      p(fatia ? cor1 : '#ffffff', x, y);
    }
  }
  p('rgba(0,0,0,.25)', 2, 9, 30, 1);
  // cadeirinha
  p('#2e86de', 21, 24, 9, 2); p('#2e86de', 27, 19, 2, 6); p('#555', 21, 26, 1, 4); p('#555', 29, 26, 1, 4);
  return c;
}

function placaSeta(dir) {
  const W = 26, H = 28;
  const [c, p] = novo(W, H);
  p('#7a7f87', 5, 14, 2, 14); p('#7a7f87', 19, 14, 2, 14);
  p('#222', 0, 0, 26, 16); p('#ffd23f', 1, 1, 24, 14);
  // setas ">>" ou "<<"
  for (let k = 0; k < 2; k++) {
    for (let i = 0; i < 6; i++) {
      const bx = 5 + k * 8 + (dir > 0 ? i : 5 - i);
      p('#111', bx, 2 + i, 3, 1); p('#111', bx, 13 - i, 3, 1);
    }
  }
  return c;
}

function quiosque() {
  const W = 52, H = 40;
  const [c, p] = novo(W, H);
  // telhado de palha
  for (let y = 0; y < 14; y++) {
    const m = 6 + y * 1.6;
    for (let x = Math.round(26 - m); x < Math.round(26 + m); x++) p((x + y) % 3 ? '#d9a441' : '#b8832c', x, y);
  }
  p('#8a5a2e', 0, 13, 52, 2);
  // colunas
  p('#8a5a2e', 6, 15, 3, 25); p('#8a5a2e', 43, 15, 3, 25);
  // balcão
  p('#2a9d8f', 4, 26, 44, 14); p('#38c3b2', 4, 26, 44, 2); p('#ffffff', 4, 31, 44, 2);
  // cocos e placa
  p('#3a8f2f', 12, 22, 5, 4); p('#3a8f2f', 19, 22, 5, 4); p('#ffd23f', 30, 18, 12, 6); p('#d8312f', 32, 20, 8, 2);
  return c;
}

function pedra() {
  const [c, p] = novo(22, 12);
  p('#8b8f99', 3, 3, 16, 9); p('#8b8f99', 6, 1, 10, 2); p('#a9adb6', 6, 2, 8, 3); p('#5f636b', 3, 10, 16, 2);
  return c;
}

// Tipos: mundo = largura na pista (1 = meia pista); bate = parte "sólida" (pra batida)
export function criarSprites() {
  return {
    coqueiro1: { img: coqueiro(1), mundo: 0.9, bate: 0.25 },
    coqueiro2: { img: coqueiro(7), mundo: 1.0, bate: 0.25 },
    coqueiro3: { img: coqueiro(13), mundo: 0.85, bate: 0.25 },
    guardaSol1: { img: guardaSol('#ff5a4e'), mundo: 0.7, bate: 0.15 },
    guardaSol2: { img: guardaSol('#2e86de'), mundo: 0.7, bate: 0.15 },
    setaDir: { img: placaSeta(1), mundo: 0.42, bate: 0.8 },
    setaEsq: { img: placaSeta(-1), mundo: 0.42, bate: 0.8 },
    quiosque: { img: quiosque(), mundo: 1.3, bate: 0.9 },
    pedra: { img: pedra(), mundo: 0.4, bate: 0.9 },
    posteE: { img: poste(-1), mundo: 0.3, bate: 0.25 },
    posteD: { img: poste(1), mundo: 0.3, bate: 0.25 },
  };
}

// ---------- fundo (céu, nuvens, morros, mar) ----------
export function criarFundo(alturaHorizonte) {
  const nuvens = (() => {
    const [c, p] = novo(512, alturaHorizonte);
    const r = aleatorio(42);
    for (let i = 0; i < 9; i++) {
      const x = r() * 512, y = 8 + r() * (alturaHorizonte * 0.45), w = 22 + r() * 40;
      for (let k = 0; k < 4; k++) {
        const bx = x + k * w / 4, bw = w / 2.2, bh = 6 + r() * 6;
        p('#ffffff', bx, y - bh / 2, bw, bh);
        p('#dff3ff', bx, y + bh / 2 - 2, bw, 2);
      }
    }
    return c;
  })();
  const morros = (() => {
    const H = 60;
    const [c, p] = novo(512, H);
    const r = aleatorio(9);
    // morros ao fundo (azulados) e da frente (verdes), formatos inventados
    const camada = (cor, topoCor, n, altMin, altMax, larg) => {
      const picos = [];
      for (let i = 0; i < n; i++) picos.push({ x: r() * 512, h: altMin + r() * (altMax - altMin), w: larg * (0.6 + r() * 0.8), pao: r() < 0.3 });
      for (let x = 0; x < 512; x++) {
        let topo = H;
        for (const k of picos) {
          for (const dx of [x - k.x, x - k.x - 512, x - k.x + 512]) {
            const u = Math.abs(dx) / k.w;
            if (u < 1) {
              // alguns morros são "pães" (lados retos e topo arredondado)
              const f = k.pao ? Math.min(1, Math.sqrt(Math.max(0, 1 - Math.pow(u, 4)))) : Math.cos(u * Math.PI / 2);
              topo = Math.min(topo, H - k.h * f);
            }
          }
        }
        const t = Math.round(topo);
        if (t < H) { p(cor, x, t, 1, H - t); p(topoCor, x, t, 1, 2); }
      }
    };
    camada('#6f8fc7', '#8eaee0', 7, 18, 42, 46);
    camada('#2f8f4e', '#4fb86c', 9, 8, 26, 34);
    return c;
  })();
  const mar = (() => {
    const [c, p] = novo(512, 10);
    p('#1f7fc8', 0, 0, 512, 10); p('#2a96e0', 0, 0, 512, 3);
    const r = aleatorio(5);
    for (let i = 0; i < 70; i++) p('#cdeeff', r() * 512, 1 + r() * 8, 3 + r() * 5, 1);
    return c;
  })();
  return { nuvens, morros, mar };
}

// ---------- o carro (visto de trás, conversível) ----------
// Desenha direto no canvas do jogo em blocos de "s" pixels. Medidas em pixels de sprite (56x36).
export const CARRO_W = 56, CARRO_H = 36;
export function desenharCarro(g, ox, oy, s, o) {
  const p = (cor, x, y, w = 1, h = 1) => { g.fillStyle = cor; g.fillRect(ox + Math.round(x * s), oy + Math.round(y * s), Math.round(w * s), Math.round(h * s)); };
  const cor = o.cor || ['#e8382f', '#a8221d', '#ff8a7a'];
  const v = o.virar || 0;           // -1, 0, 1
  const vt = v * 2;                 // a parte de cima "inclina" pra curva
  // sombra
  p('rgba(0,0,0,.35)', 2, 32, 52, 3);
  // pneus (com listras que andam)
  const pneu = x => {
    p('#151515', x, 22, 10, 12);
    for (let y = 0; y < 12; y += 3) p('#3a3a3a', x + 1, 22 + ((y + o.roda) % 12), 8, 1);
  };
  pneu(3 - v); pneu(43 - v);
  // carroceria de baixo
  p(cor[1], 2, 19, 52, 9); p(cor[1], 1, 21, 54, 6);
  // carroceria de cima (tampa do porta-malas)
  p(cor[0], 3 + vt / 2, 12, 50, 9); p(cor[0], 2, 15, 52, 6);
  p(cor[2], 4 + vt / 2, 12, 48, 1);
  // lanternas (acendem mais quando solta o acelerador)
  const lanterna = o.freando ? '#ffd0c8' : '#ff3b30';
  p('#4a0d0a', 4, 15, 10, 5); p(lanterna, 5, 16, 8, 3);
  p('#4a0d0a', 42, 15, 10, 5); p(lanterna, 43, 16, 8, 3);
  // placa
  p('#222', 21, 20, 14, 6); p('#f4f4f4', 22, 21, 12, 4); p('#2e4fa3', 22, 21, 12, 1);
  p('#333', 24, 23, 1, 1); p('#333', 26, 23, 2, 1); p('#333', 29, 23, 1, 1); p('#333', 31, 23, 1, 1);
  // para-choque
  p('#c9ced6', 2, 27, 52, 2); p('#ffffff', 2, 27, 52, 1);
  // escapamento e turbo
  p('#555', 39, 28, 4, 3); p('#222', 40, 29, 2, 2);
  if (o.chama) {
    const f = o.chama % 2;
    p('#ff9f1c', 39, 31, 4, 3 + f); p('#ffd23f', 40, 31, 2, 2 + f); p('#ffffff', 40, 31, 2, 1);
  }
  // cabine aberta: encostos dos bancos, interior e para-brisa
  p('#222', 7 + vt, 9, 42, 4);
  p('#9fd8ff', 9 + vt, 4, 38, 2); p('#5c6470', 8 + vt, 4, 1, 6); p('#5c6470', 47 + vt, 4, 1, 6);
  p('#4a2f22', 10 + vt, 5, 15, 7); p('#4a2f22', 31 + vt, 5, 15, 7);
  p('#6b4532', 11 + vt, 5, 13, 2); p('#6b4532', 32 + vt, 5, 13, 2);
  // piloto (banco da esquerda). Por enquanto um boneco provisório;
  // depois vira o boneco do Forma Palavras (de costas, ou de frente quando reclama)
  const hx = 13 + vt + (o.rosto ? 0 : v), hy = 0;
  const pele = o.pele || '#f0c39b', cabelo = o.cabelo || '#4a2c17';
  if (!o.rosto) {
    p(pele, hx - 1, hy + 4, 2, 2); p(pele, hx + 10, hy + 4, 2, 2);          // orelhas
    p(cabelo, hx + 1, hy, 8, 1); p(cabelo, hx, hy + 1, 10, 7); p(cabelo, hx + 1, hy + 8, 8, 1);
    p('rgba(255,255,255,.18)', hx + 2, hy + 1, 4, 1);
  } else {
    p(pele, hx, hy + 1, 10, 8); p(pele, hx + 1, hy + 9, 8, 1);
    p(cabelo, hx, hy, 10, 2); p(cabelo, hx - 1, hy + 1, 2, 3); p(cabelo, hx + 9, hy + 1, 2, 3);
    p('#111', hx + 2, hy + 3, 2, 1); p('#111', hx + 6, hy + 3, 2, 1);          // sobrancelhas bravas
    p('#111', hx + 2, hy + 4, 1, 2); p('#111', hx + 7, hy + 4, 1, 2);          // olhos
    p('#7a1a1a', hx + 3, hy + 7, 4, 2); p('#ffffff', hx + 3, hy + 7, 4, 1);    // boca aberta
  }
  return {
    x: ox + (hx + 5) * s, y: oy + hy * s,
    luzes: [[ox + 9 * s, oy + 17.5 * s], [ox + 47 * s, oy + 17.5 * s]],
  };
}

// cores do carro: [principal, sombra, brilho]
export const CORES_CARRO = [
  { id: 'vermelho', nome: 'Vermelho', c: ['#e8382f', '#a8221d', '#ff8a7a'] },
  { id: 'azul', nome: 'Azul', c: ['#2e7fe8', '#1c4fa0', '#8cc4ff'] },
  { id: 'amarelo', nome: 'Amarelo', c: ['#ffcc1f', '#c58f00', '#fff1a0'] },
  { id: 'verde', nome: 'Verde', c: ['#2fbf5a', '#1b7a37', '#9cf0b4'] },
  { id: 'laranja', nome: 'Laranja', c: ['#ff8a1f', '#c25500', '#ffc58a'] },
  { id: 'rosa', nome: 'Rosa', c: ['#ff6fb5', '#c23d80', '#ffc2e0'] },
  { id: 'roxo', nome: 'Roxo', c: ['#8f5bff', '#5a2fc2', '#cdb6ff'] },
  { id: 'preto', nome: 'Preto', c: ['#33363f', '#17181d', '#6d7280'] },
  { id: 'branco', nome: 'Branco', c: ['#f2f4f7', '#b8bfca', '#ffffff'] },
  { id: 'prata', nome: 'Prata', c: ['#aab3c0', '#6d7686', '#e3e8ef'] },
];
export const corPorId = id => (CORES_CARRO.find(k => k.id === id) || CORES_CARRO[0]);

// carro pronto num canvas (pros adversários)
export function carroImg(cor, virar, pele, cabelo) {
  const [c, , g] = novo(CARRO_W, CARRO_H);
  desenharCarro(g, 0, 0, 1, { cor, virar, roda: 0, pele, cabelo });
  return c;
}

// ---------- objetos dos perigos e da beira ----------
function poste(lado) {
  // lado = de que lado da pista ele fica; o braço aponta pra pista
  const [c, p] = novo(16, 60);
  const bx = lado < 0 ? 3 : 11;
  p('#5c6470', bx, 6, 2, 54); p('#8a93a1', bx, 6, 1, 54);
  const ax = lado < 0 ? bx : 2;
  p('#5c6470', ax, 4, 11, 2);
  const lx = lado < 0 ? 11 : 1;
  p('#333', lx, 5, 5, 2); p('#fff6c4', lx + 1, 7, 3, 1);
  c.luz = { x: (lx + 2.5) / 16, y: 7.5 / 60 };
  return c;
}
function cone() {
  const [c, p] = novo(10, 12);
  for (let y = 0; y < 10; y++) { const m = Math.ceil(1 + y * 0.4); p(y > 3 && y < 6 ? '#ffffff' : '#ff7a1a', 5 - m, y, m * 2, 1); }
  p('#222', 0, 10, 10, 2);
  return c;
}
function caminhao() {
  // caminhão tombado de lado, com as rodas pra cima
  const [c, p] = novo(72, 34);
  p('rgba(0,0,0,.35)', 2, 30, 68, 4);
  p('#e9eef5', 2, 10, 48, 21); p('#b8c2d0', 2, 27, 48, 4); p('#2e7fe8', 2, 16, 48, 4);
  p('#ffd23f', 6, 22, 14, 3);
  p('#d8312f', 50, 12, 20, 19); p('#ff7a6b', 50, 12, 20, 2); p('#9fd8ff', 60, 16, 7, 6);
  for (const x of [8, 22, 40, 56]) { p('#151515', x, 4, 9, 7); p('#777', x + 3, 6, 3, 3); }
  p('#c0c6cf', 0, 12, 2, 18);
  return c;
}
function bolaFogo() {
  const [c, p] = novo(12, 12);
  p('#b31d0b', 2, 0, 8, 12); p('#b31d0b', 0, 2, 12, 8);
  p('#ff7a1a', 2, 2, 8, 8); p('#ffd23f', 4, 3, 4, 5); p('#ffffff', 5, 4, 2, 2);
  return c;
}
function chama(f) {
  const [c, p] = novo(14, 22);
  const alt = f ? 22 : 19;
  for (let y = 0; y < alt; y++) {
    const t = y / alt, m = Math.max(1, Math.round(Math.sin(t * Math.PI * 0.95) * 6 + (f ? (y % 3) - 1 : 0)));
    const yy = 22 - alt + y;
    p('#e8380f', 7 - m, yy, m * 2, 1);
    if (m > 2) p('#ff9f1c', 7 - m + 2, yy, (m - 2) * 2, 1);
    if (m > 4 && t > 0.4) p('#ffe066', 7 - m + 4, yy, (m - 4) * 2, 1);
  }
  return c;
}
function onda() {
  const [c, p] = novo(64, 48);
  for (let x = 0; x < 64; x++) {
    const topo = Math.round(14 + 18 * Math.pow(Math.abs(x - 40) / 40, 1.5) - (x > 40 ? 0 : 6 * Math.sin(x / 40 * Math.PI)));
    p('#1f7fc8', x, topo, 1, 48 - topo); p('#2a96e0', x, topo, 1, 6); p('#e8f8ff', x, topo, 1, 2);
  }
  // crista enrolando
  p('#e8f8ff', 34, 4, 14, 3); p('#e8f8ff', 46, 6, 4, 6); p('#2a96e0', 36, 7, 10, 5); p('#e8f8ff', 44, 12, 4, 2);
  for (let i = 0; i < 12; i++) p('#ffffff', 4 + i * 5, 40 + (i % 3), 3, 1);
  return c;
}
function dragao(asa) {
  const [c, p] = novo(52, 30);
  // corpo
  p('#2fa84f', 12, 14, 26, 9); p('#1d7a37', 12, 21, 26, 2); p('#ffb347', 16, 19, 18, 3);
  // cauda
  for (let i = 0; i < 12; i++) p('#2fa84f', 12 - i, 16 + Math.round(Math.sin(i / 3) * 2), 2, 3);
  p('#d8312f', 0, 15, 3, 3);
  // cabeça
  p('#2fa84f', 38, 10, 12, 9); p('#2fa84f', 46, 14, 6, 5); p('#ffffff', 44, 12, 3, 3); p('#111', 45, 13, 2, 2);
  p('#1d7a37', 49, 17, 3, 1); p('#ffd23f', 40, 8, 2, 3); p('#ffd23f', 44, 7, 2, 4);
  // asas
  if (asa) { for (let i = 0; i < 10; i++) p('#58d27a', 18 + i, 4 + i, 12 - i, 1); p('#1d7a37', 18, 4, 1, 10); }
  else { for (let i = 0; i < 9; i++) p('#58d27a', 18 + i, 22 + i, 12 - i, 1); }
  // pernas
  p('#1d7a37', 18, 23, 3, 3); p('#1d7a37', 30, 23, 3, 3);
  return c;
}
function vulcao() {
  const [c, p] = novo(110, 56);
  for (let y = 0; y < 56; y++) {
    const m = Math.round(12 + y * 0.9);
    p(y < 4 ? '#3a1a10' : '#5a3424', 55 - m, y, m * 2, 1);
    p('#7a4a34', 55 - m, y, 3, 1);
  }
  // lava escorrendo
  for (const [x0, l] of [[50, 30], [58, 22], [46, 14]]) for (let y = 0; y < l; y++) p(y % 5 ? '#ff6a1a' : '#ffd23f', x0 + Math.round(Math.sin(y / 4) * 2), y, 2, 1);
  p('#ff6a1a', 44, 0, 22, 2);
  return c;
}

export function criarExtras() {
  return {
    posteE: poste(-1), posteD: poste(1),
    cone: cone(), caminhao: caminhao(), bolaFogo: bolaFogo(),
    chama: [chama(0), chama(1)], onda: onda(), dragao: [dragao(0), dragao(1)], vulcao: vulcao(),
  };
}
