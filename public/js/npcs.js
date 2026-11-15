// Adversários do computador. Cada um tem um "jeito" de pilotar (velocidade e quanto troca
// de faixa) e um elástico leve: quem está muito na frente alivia, quem ficou pra trás aperta.
import { carroImg, CORES_CARRO } from './sprites.js';

const PILOTOS = [
  { nome: 'Zé Turbina', pele: '#c07f55', cabelo: '#1d1d1d' },
  { nome: 'Tia Cleide', pele: '#f6c7a1', cabelo: '#c9ced6' },
  { nome: 'Biba Veloz', pele: '#8d5a3b', cabelo: '#2a1408' },
  { nome: 'Juca Pneu', pele: '#ffe0c7', cabelo: '#e0a030' },
  { nome: 'Nina Faísca', pele: '#e0a47a', cabelo: '#d8312f' },
];
const FAIXAS = [-0.6, 0, 0.6];

export function criarNpcs(corJogador, rand, COMPR, SEG) {
  const cores = CORES_CARRO.filter(c => c.id !== corJogador).sort(() => rand() - 0.5);
  return PILOTOS.map((p, k) => {
    const cor = cores[k % cores.length].c;
    const fila = Math.floor(k / 2), col = k % 2;
    return {
      ...p, cor: cores[k % cores.length].id,
      imgs: [-1, 0, 1].map(v => carroImg(cor, v, p.pele, p.cabelo)),
      // largada: em filas de 2 na frente do jogador
      dist: (5 - fila * 2 - col) * SEG * 1.6 + (k === 4 ? 0 : 0),
      x: col ? 0.5 : -0.5, alvoX: col ? 0.5 : -0.5,
      vel: 0, ritmo: 0.88 + rand() * 0.08, troca: 2 + rand() * 4, girando: 0, virar: 0,
      desviaDe: null, terminou: null, ultimaMudanca: 0,
    };
  });
}

export function atualizarNpcs(npcs, dt, ctx) {
  const { segs, SEG, COMPR, V_MAX, distJog, correndo, perigos, t, rand, VOLTAS, tempo } = ctx;
  const N = segs.length;
  for (const n of npcs) {
    const pos = ((n.dist % COMPR) + COMPR) % COMPR;
    const i = Math.floor(pos / SEG) % N;
    const seg = segs[i];
    // velocidade alvo: ritmo próprio, mais lento em curva, elástico em relação ao jogador
    let alvo = n.ritmo * V_MAX * (1 - 0.035 * Math.abs(seg.curva));
    const dif = (n.dist - distJog) / SEG;   // em fatias: + na frente, - atrás
    if (dif > 60) alvo *= 0.93; else if (dif > 25) alvo *= 0.97;
    if (dif < -60) alvo *= 1.1; else if (dif < -25) alvo *= 1.05;
    if (!correndo && n.terminou == null) alvo = 0;
    if (n.terminou != null) alvo = V_MAX * 0.5;
    if (n.girando > 0) { n.girando -= dt; alvo = V_MAX * 0.2; }
    const ac = alvo > n.vel ? V_MAX / 4.5 : V_MAX / 2;
    n.vel += Math.sign(alvo - n.vel) * Math.min(Math.abs(alvo - n.vel), ac * dt);

    // escolher faixa: às vezes troca à toa; desvia de perigo à frente; desvia de carro lento
    n.troca -= dt;
    if (n.troca <= 0) { n.alvoX = FAIXAS[Math.floor(rand() * 3)]; n.troca = 2 + rand() * 4; }
    const p = perigos.aFrente(i, 120);
    if (p && n.desviaDe !== p.h) {
      n.desviaDe = p.h;
      n.vaiDesviar = rand() < 0.85;            // às vezes eles também se dão mal
      if (n.vaiDesviar) n.alvoX = -p.h.lado * (0.45 + rand() * 0.35);
    }
    if (p && n.desviaDe === p.h && n.vaiDesviar) n.alvoX = Math.sign(n.alvoX) === -p.h.lado ? n.alvoX : -p.h.lado * 0.6;
    for (const o of npcs) {
      if (o === n) continue;
      const dz = o.dist - n.dist;
      if (dz > 0 && dz < SEG * 8 && Math.abs(o.x - n.x) < 0.35 && o.vel < n.vel) {
        n.alvoX = FAIXAS.reduce((a, b) => Math.abs(b - o.x) > Math.abs(a - o.x) ? b : a, FAIXAS[0]);
        n.troca = 1.5;
      }
    }
    const dx = n.alvoX - n.x;
    const passo = Math.min(Math.abs(dx), 0.9 * dt);
    n.x += Math.sign(dx) * passo;
    n.virar = Math.abs(dx) > 0.05 ? Math.sign(dx) : 0;

    // perigo pegou?
    if (n.girando > 0 && t < (n.imuneAte || 0)) n.x += n.fugir * 1.1 * dt;
    if (n.girando <= 0 && t > (n.imuneAte || 0)) {
      const h = perigos.bateu(i, n.x, 0.24, t);
      if (h) { n.girando = 0.9; n.vel *= 0.3; n.imuneAte = t + 2; n.fugir = -h.lado; n.alvoX = -h.lado * 0.6; }
    }
    n.dist += n.vel * dt;
    if (n.terminou == null && n.dist >= VOLTAS * COMPR) n.terminou = tempo;
  }
}
