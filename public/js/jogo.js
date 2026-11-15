// Pé na Tábua — corrida contra o computador: uma pista, 3 voltas, perigos malucos, clima.
import { SEG, LARG, CORES_PRAIA, criarPistaPraia } from './pista.js';
import { criarSprites, criarFundo, criarExtras, desenharCarro, carroImg, CARRO_W, CARRO_H, CORES_CARRO, corPorId } from './sprites.js';
import { volante, ligar, calibrar, atualizar as atualizarVolante, giroAtual, salvar as salvarVolante, restaurarPadrao } from './volante.js';
import * as som from './som.js';
import * as musica from './musica.js';
import { Clima, sortearClima, NOMES as NOMES_CLIMA } from './clima.js';
import { Perigos, TIPOS as TIPOS_PERIGO } from './perigos.js';
import { criarNpcs, atualizarNpcs } from './npcs.js';
import { Minimapa } from './minimapa.js';
import * as boneco from './boneco.js';
import * as rede from './rede.js';

const $ = id => document.getElementById(id);
const tela = $('tela');
const g = tela.getContext('2d');
const params = new URLSearchParams(location.search);

// ---------- constantes ----------
const PASSO = 1 / 60;
const VOLTAS = 3;
const ALT_CAM = 1250;                       // altura da câmera (mais alto = vê mais pista)
const FOV_BASE = 100;
const PROF_BASE = 1 / Math.tan((FOV_BASE / 2) * Math.PI / 180);
const Z_JOG = ALT_CAM * PROF_BASE;          // distância da câmera até o carro
const DISTANCIA = 260;                      // quantas fatias desenhar
const V_MAX = SEG / PASSO;
const ACEL = V_MAX / 5;
const SOLTO = -V_MAX / 5;                   // soltou o acelerador
const AREIA_DESACEL = -V_MAX / 1.6;
const AREIA_LIMITE = V_MAX * 0.35;
const CENTRIFUGA = 0.25;
const TURBO_V = 1.3, TURBO_ENCHE = 14;
const KMH = 240;
const GIRO_MAX = 35;                        // até quantos graus o cenário compensa o giro

const CORES_NEVE = {
  ...CORES_PRAIA,
  claro: { estrada: '#8a8f9a', chao: '#f4f8ff', zebra: '#ffffff', faixa: '#ffffff' },
  escuro: { estrada: '#838893', chao: '#e1e9f5', zebra: '#d8312f', faixa: null },
};

const segs = criarPistaPraia();
const N = segs.length;
const COMPR = N * SEG;
const SPR = criarSprites();
const EXTRAS = criarExtras();
const LARGADA = Math.floor(Z_JOG / SEG);
const clima = new Clima();
const perigos = new Perigos(segs, EXTRAS);
let minimapa = null;
let rand = Math.random;

let W = 384, H = 216, CW = 384, CH = 216, MX = 0, MY = 0, ESC_CSS = 1;
let fundo = null;

// ---------- preferências ----------
const pref = { cor: 'vermelho', nivelar: true, bolinhas: false };
try { Object.assign(pref, JSON.parse(localStorage.getItem('pnt-pref') || '{}')); } catch {}
const salvarPref = () => { try { localStorage.setItem('pnt-pref', JSON.stringify(pref)); } catch {} };

// ---------- estado ----------
const E = {
  modo: null, fase: 'inicio', pausado: false,
  pos: 0, x: 0, vel: 0,
  volta: 1, tempo: 0, tempoVolta: 0, voltas: [],
  turbo: 0, turboAte: 0, girando: 0,
  acel: false, botaoTurbo: false,
  ceu: 0, morros: 0, t: 0, areiaDesde: 0,
  rostoAte: 0, reclamouEm: -9, cabeca: { x: 0, y: 0 }, luzesCarro: [],
  virar: 0, roda: 0, prof: PROF_BASE, tremor: 0, angCena: 0, giroFiltro: 0, imuneAte: -9, fugir: 0,
  npcs: [], posicao: 6, musica: 0, terminouEm: null,
  online: false, remotos: [],
};
// os carros que aparecem na pista: adversários do computador (sozinho) ou os amigos (online)
const carros = () => (E.online ? E.remotos : E.npcs);
// perfil do Forma Palavras (gamertag, boneco, XP)
let PERFIL = { tag: '', look: null, xp: 0, ach: {} };
let cabecaJog = null, cabecasNpc = [];
const distJog = () => (E.terminouEm != null ? VOLTAS * COMPR + E.pos : (E.volta - 1) * COMPR + E.pos);
const escalaCarro = () => Math.max(1, Math.floor((W * 0.25) / CARRO_W));   // carro ~1/4 da largura da tela
const largCarro = () => (CARRO_W * escalaCarro()) / W;     // em "meias pistas"

// ---------- tamanho da tela ----------
function cenaNivelada() { return pref.nivelar && E.modo === 'sensor'; }
function redimensionar() {
  H = 240;
  W = Math.max(240, Math.min(580, Math.round(H * innerWidth / innerHeight)));
  if (cenaNivelada()) {
    // área maior que a tela, pra que girada ela continue cobrindo tudo
    const a = GIRO_MAX * Math.PI / 180;
    MX = Math.ceil((W * Math.cos(a) + H * Math.sin(a) - W) / 2) + 1;
    MY = Math.ceil((W * Math.sin(a) + H * Math.cos(a) - H) / 2) + 1;
  } else { MX = 0; MY = 0; }
  CW = W + 2 * MX; CH = H + 2 * MY;
  tela.width = CW; tela.height = CH;
  ESC_CSS = Math.max(innerWidth / W, innerHeight / H);
  Object.assign(tela.style, {
    width: CW * ESC_CSS + 'px', height: CH * ESC_CSS + 'px',
    left: (innerWidth - CW * ESC_CSS) / 2 + 'px', top: (innerHeight - CH * ESC_CSS) / 2 + 'px',
  });
  g.imageSmoothingEnabled = false;
  fundo = criarFundo(Math.round(H / 2));
  clima.preparar(CW, CH);
  gradCache = null;
  if (minimapa) minimapa.ajustar();
}
let gradCache = null;
addEventListener('resize', redimensionar);
redimensionar();

// ---------- projeção ----------
function projetar(p, camX, camY, camZ) {
  p.cam.x = -camX;
  p.cam.y = p.mundo.y - camY;
  p.cam.z = p.mundo.z - camZ;
  p.tela.escala = E.prof / p.cam.z;
  p.tela.x = W / 2 + p.tela.escala * p.cam.x * W / 2;
  p.tela.y = H / 2 - p.tela.escala * p.cam.y * H / 2;
  p.tela.w = p.tela.escala * LARG * W / 2;
}
const segEm = z => segs[Math.floor((((z % COMPR) + COMPR) % COMPR) / SEG) % N];

function desenharFatia(s, limite, cores) {
  const a = s.p1.tela, b = s.p2.tela;
  const y1 = a.y, y2 = b.y;
  const topo = Math.max(-MY, Math.ceil(y2)), base = Math.min(H + MY - 1, Math.floor(Math.min(y1, limite)));
  if (base < topo) return;
  const c = s.escuro ? cores.escuro : cores.claro;
  const corPerigo = s.perigo ? perigos.cor(s.perigo, s, E.t) : null;
  for (let y = topo; y <= base; y++) {
    const t = (y1 - y) / (y1 - y2);
    const cx = a.x + (b.x - a.x) * t, w = a.w + (b.w - a.w) * t;
    const zeb = w / 6;
    g.fillStyle = c.chao; g.fillRect(-MX, y, CW, 1);
    g.fillStyle = c.zebra; g.fillRect(Math.round(cx - w - zeb), y, Math.round(zeb), 1); g.fillRect(Math.round(cx + w), y, Math.round(zeb), 1);
    if (s.i === LARGADA) {
      const n = 10, lw = (2 * w) / n, linha = t < 0.5 ? 0 : 1;
      for (let k = 0; k < n; k++) { g.fillStyle = (k + linha) % 2 ? '#111' : '#fff'; g.fillRect(Math.round(cx - w + k * lw), y, Math.ceil(lw), 1); }
    } else {
      g.fillStyle = c.estrada; g.fillRect(Math.round(cx - w), y, Math.round(2 * w), 1);
      if (c.faixa) { const fw = Math.max(1, w / 40); g.fillStyle = c.faixa; g.fillRect(Math.round(cx - fw / 2), y, Math.round(fw), 1); }
    }
    if (corPerigo) {
      const h = s.perigo;
      const xa = Math.max(cx + h.xmin * w, cx - w * 1.6), xb = Math.min(cx + h.xmax * w, cx + w * 1.6);
      g.fillStyle = corPerigo; g.fillRect(Math.round(xa), y, Math.round(xb - xa), 1);
    }
  }
}

function camadaFundo(img, desloc, y) {
  const w = img.width, x0 = -MX - (((desloc % 1) + 1) % 1) * w;
  for (let x = x0; x < W + MX; x += w) g.drawImage(img, Math.round(x), y);
}

function desenhar(dt) {
  const hz = Math.round(H / 2);
  const cores = clima.neve ? CORES_NEVE : CORES_PRAIA;
  // tremida (batidas e velocidade alta)
  const tx = E.tremor > 0 ? Math.round((Math.random() - 0.5) * E.tremor * 6) : 0;
  const ty = E.tremor > 0 ? Math.round((Math.random() - 0.5) * E.tremor * 6) : (E.vel > V_MAX * 0.97 && Math.random() < 0.3 ? 1 : 0);
  g.setTransform(1, 0, 0, 1, MX + tx, MY + ty);
  g.fillStyle = cores.claro.chao; g.fillRect(-MX - 8, hz, CW + 16, H + MY - hz + 8);
  const ceu = clima.ceu();
  const chave = ceu.join() + MY;
  if (!gradCache || gradCache.chave !== chave) {
    const gr = g.createLinearGradient(0, -MY, 0, hz);
    gr.addColorStop(0, ceu[0]); gr.addColorStop(1, ceu[1]);
    gradCache = { chave, gr };
  }
  g.fillStyle = gradCache.gr; g.fillRect(-MX - 8, -MY - 8, CW + 16, hz + MY + 8);
  if (clima.hora === 'dia' && clima.tempo === 'limpo') { g.fillStyle = '#fff6b0'; g.fillRect(W - 70, 18, 22, 22); g.fillStyle = '#ffffff'; g.fillRect(W - 66, 22, 14, 14); }
  if (clima.hora === 'tarde' && clima.tempo === 'limpo') { g.fillStyle = '#ff7a3a'; g.fillRect(W - 90, hz - 40, 30, 30); g.fillStyle = '#ffc070'; g.fillRect(W - 86, hz - 36, 22, 22); }
  if (clima.tempo !== 'chuva' || clima.intens < 0.5) camadaFundo(fundo.nuvens, E.ceu, 0);
  perigos.fundo(g, W, H, E.t);
  camadaFundo(fundo.morros, E.morros, hz - fundo.morros.height + 2);
  camadaFundo(fundo.mar, E.morros * 0.5, hz - 4);

  const base = segEm(E.pos), basePct = (E.pos % SEG) / SEG;
  const jSeg = segEm(E.pos + Z_JOG), jPct = ((E.pos + Z_JOG) % SEG) / SEG;
  const jY = jSeg.p1.mundo.y + (jSeg.p2.mundo.y - jSeg.p1.mundo.y) * jPct;
  let limite = H + MY, x = 0, dx = -(base.curva * basePct);
  const vistos = [];
  for (let n = 0; n < DISTANCIA; n++) {
    const s = segs[(base.i + n) % N];
    const volta = s.i < base.i ? COMPR : 0;
    s.limite = limite;
    projetar(s.p1, E.x * LARG - x, jY + ALT_CAM, E.pos - volta);
    projetar(s.p2, E.x * LARG - x - dx, jY + ALT_CAM, E.pos - volta);
    x += dx; dx += s.curva;
    vistos.push(s);
    if (s.p1.cam.z <= E.prof || s.p2.tela.y >= s.p1.tela.y || s.p2.tela.y >= limite) continue;
    desenharFatia(s, limite, cores);
    limite = Math.min(limite, s.p2.tela.y);
  }

  // objetos que se mexem: adversários e perigos, agrupados por fatia
  const dinamicos = new Map();
  const juntar = o => { const i = ((o.i % N) + N) % N; if (!dinamicos.has(i)) dinamicos.set(i, []); dinamicos.get(i).push(o); };
  for (const o of perigos.objetos(E.t)) juntar(o);
  const lc = largCarro();
  for (const n of carros()) {
    if (n.oculto) continue;
    const z = n.dist + Z_JOG, p = ((z % COMPR) + COMPR) % COMPR;
    juntar({ i: Math.floor(p / SEG), pct: (p % SEG) / SEG, x: n.x, img: n.imgs[n.virar + 1], mundo: lc, alt: 0, npc: n });
  }

  const luzes = [];
  for (let n = vistos.length - 1; n > 0; n--) {
    const s = vistos[n];
    if (s.p1.cam.z <= E.prof) continue;
    const esc = s.p1.tela.escala;
    if (s.sprites.length) {
      for (const sp of s.sprites) {
        const tipo = SPR[sp.tipo];
        const dw = tipo.mundo * LARG * esc * W / 2;
        if (dw < 1) continue;
        const dh = dw * tipo.img.height / tipo.img.width;
        const sx = s.p1.tela.x + esc * sp.offset * LARG * W / 2 + (sp.offset < 0 ? -dw : 0);
        const sy = s.p1.tela.y - dh;
        if (sy >= s.limite || sx > W + MX || sx + dw < -MX) continue;
        g.save(); g.beginPath(); g.rect(-MX, -MY, CW, s.limite + MY); g.clip();
        g.drawImage(tipo.img, Math.round(sx), Math.round(sy), Math.round(dw), Math.round(dh));
        g.restore();
        if (tipo.img.luz) luzes.push([sx + tipo.img.luz.x * dw, sy + tipo.img.luz.y * dh, dw * 0.9, 'rgba(255,240,180,A)']);
      }
    }
    const dyn = dinamicos.get(s.i);
    if (dyn) {
      dyn.sort((a, b) => (b.pct || 0) - (a.pct || 0));
      for (const o of dyn) {
        const k = o.pct || 0;
        const e2 = s.p2.cam.z > E.prof ? s.p2.tela.escala : esc;
        const e = esc + (e2 - esc) * k;
        const bx = s.p1.tela.x + (s.p2.tela.x - s.p1.tela.x) * k, by = s.p1.tela.y + (s.p2.tela.y - s.p1.tela.y) * k;
        const dw = o.mundo * LARG * e * W / 2;
        if (dw < 1) continue;
        const dh = dw * o.img.height / o.img.width;
        const sx = bx + e * o.x * LARG * W / 2 - dw / 2;
        const sy = by - dh - (o.alt || 0) * e * H / 2;
        if (sy >= s.limite) continue;
        g.save(); g.beginPath(); g.rect(-MX, -MY, CW, s.limite + MY); g.clip();
        if (o.espelhar) { g.translate(Math.round(sx + dw), 0); g.scale(-1, 1); g.drawImage(o.img, 0, Math.round(sy), Math.round(dw), Math.round(dh)); }
        else g.drawImage(o.img, Math.round(sx), Math.round(sy), Math.round(dw), Math.round(dh));
        g.restore();
        if (o.npc) { const ly = sy + dh * 25.5 / 44; luzes.push([sx + dw * 9 / 56, ly, dw * 0.16, 'rgba(255,40,30,A)'], [sx + dw * 47 / 56, ly, dw * 0.16, 'rgba(255,40,30,A)']); }
        if (o.luz) luzes.push([sx + dw / 2, sy + dh / 2, dw * 0.7, o.luz]);
      }
    }
  }
  desenharJogador();
  for (const [lx, ly] of E.luzesCarro) luzes.push([lx, ly, 14, 'rgba(255,40,30,A)']);

  // hora do dia, luzes, chuva/neve
  clima.pintar(g, -MX - 8, -MY - 8, CW + 16, CH + 16);
  clima.estrelasELua(g, W, -MX, -MY, CW, hz - 40);
  clima.farois(g, W, H, H - CARRO_H * escalaCarro());
  clima.acender(g, luzes);
  clima.particulasDesenhar(g, -MX, -MY, CW, CH, dt);
  linhasVelocidade();
}

function linhasVelocidade() {
  const turbo = E.t < E.turboAte;
  const pct = E.vel / V_MAX;
  if (!turbo && pct < 0.9) return;
  const n = turbo ? 26 : Math.round((pct - 0.9) * 120);
  const cx = W / 2, cy = H * 0.48;
  g.save(); g.strokeStyle = turbo ? 'rgba(255,240,200,.75)' : 'rgba(255,255,255,.5)'; g.lineWidth = 1;
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, r1 = W * (0.32 + Math.random() * 0.3), r2 = r1 + W * (0.08 + Math.random() * 0.15);
    g.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1 * 0.6); g.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2 * 0.6);
  }
  g.stroke(); g.restore();
}

function desenharJogador() {
  const s = escalaCarro();
  const largura = CARRO_W * s;
  let ox = Math.round(W / 2 - largura / 2), oy = H - CARRO_H * s - 2;
  const fora = Math.abs(E.x) > 1;
  if (fora && E.vel > 0) oy += Math.round(Math.random() * 2) - 1;
  else if (E.vel > V_MAX * 0.5 && Math.random() < 0.15) oy -= 1;
  g.save();
  if (E.t < E.imuneAte && Math.floor(E.t * 12) % 2) g.globalAlpha = 0.45;
  if (E.girando > 0) {
    const fase = Math.cos(E.girando * 22);
    g.translate(W / 2, 0); g.scale(Math.abs(fase) < 0.25 ? 0.25 * Math.sign(fase || 1) : fase, 1); g.translate(-W / 2, 0);
  }
  const r = desenharCarro(g, ox, oy, s, {
    cor: corPorId(pref.cor).c, cabeca: cabecaJog,
    virar: E.virar, roda: E.roda | 0, freando: !E.acel && E.vel > 10,
    chama: E.t < E.turboAte ? Math.floor(E.t * 20) : 0,
    rosto: E.t < E.rostoAte,
  });
  g.restore();
  E.cabeca = r; E.luzesCarro = r.luzes;
}

// ---------- reclamações do piloto ----------
const FRASES = {
  batida: ['Ai, minha nuca!', 'Olha a placa!', 'Quem te deu carta?', 'Tá maluco?!', 'Eu vi minha vida passar!'],
  areia: ['Isso é areia, não pista!', 'Volta pro asfalto!', 'Tá achando que é praia?', 'Sujou meu carro!'],
  carro: ['Olha a lataria!', 'Encostou, pagou!', 'Sai da frente!'],
  ultrapassado: ['Volta aqui!', 'Isso não vai ficar assim!', 'Ultrapassou na faixa dupla?!', 'Acelera, criatura!'],
};
function reclamar(tipo, lista) {
  if (E.t - E.reclamouEm < 2.5) return;
  const l = lista || FRASES[tipo];
  E.reclamouEm = E.t; E.rostoAte = E.t + 1.8;
  $('balao').textContent = l[Math.floor(Math.random() * l.length)];
  $('balao').hidden = false;
}
// posição na tela de um ponto do canvas (levando em conta o giro do cenário)
function naTela(x, y) {
  const L = parseFloat(tela.style.left), T = parseFloat(tela.style.top);
  const cx = (MX + x) * ESC_CSS + L, cy = (MY + y) * ESC_CSS + T;
  const a = -E.angCena * Math.PI / 180;
  if (!a) return [cx, cy];
  const ox = L + CW * ESC_CSS / 2, oy = T + CH * ESC_CSS / 2;
  const dx = cx - ox, dy = cy - oy;
  return [ox + dx * Math.cos(a) - dy * Math.sin(a), oy + dx * Math.sin(a) + dy * Math.cos(a)];
}
function posicionarBalao() {
  if (E.t >= E.rostoAte) { $('balao').hidden = true; return; }
  const [x, y] = naTela(E.cabeca.x, E.cabeca.y);
  $('balao').style.left = x + 'px';
  $('balao').style.top = (y - 8) + 'px';
}

// ---------- física ----------
function sobrepoe(a, aw, b, bw) { return Math.abs(a - b) * 2 < aw + bw; }

let teclaVol = 0;
const teclas = {};
function rodar(vel, tremor) {
  E.vel *= vel; E.girando = 0.9; E.turbo = 0; E.turboAte = 0; E.tremor = tremor;
  som.batida();
  if (navigator.vibrate) try { navigator.vibrate(120); } catch {}
}

function atualizar(dt) {
  E.t += dt;
  E.tremor = Math.max(0, E.tremor - dt * 2);
  let dir;
  if (E.modo === 'sensor') dir = atualizarVolante(dt);
  else {
    const alvo = (teclas.ArrowRight ? 1 : 0) - (teclas.ArrowLeft ? 1 : 0);
    teclaVol += (alvo - teclaVol) * Math.min(1, dt * 8);
    dir = teclaVol;
  }
  E.virar = dir > 0.3 ? 1 : dir < -0.3 ? -1 : 0;
  const correndo = E.fase === 'correndo';
  const acel = correndo && (E.acel || teclas.ArrowUp || teclas.KeyZ);
  const turboAtivo = E.t < E.turboAte;

  const iJog = Math.floor(((E.pos + Z_JOG) % COMPR) / SEG) % N;
  const jSeg = segs[iJog];
  const pct = E.vel / V_MAX;
  const dx = dt * 2 * pct;
  if (E.girando > 0) { E.girando -= dt; E.x += (E.t < E.imuneAte ? E.fugir * 1.1 : -Math.sign(E.x) * 0.6) * dt; }
  else E.x += dx * dir;
  E.x -= dx * pct * jSeg.curva * CENTRIFUGA * clima.aderencia;

  // abertura da câmera: mais rápido = visão mais aberta (sensação de velocidade)
  const fov = FOV_BASE + 10 * Math.min(1.2, pct) + (turboAtivo ? 6 : 0);
  E.prof += (1 / Math.tan(fov / 2 * Math.PI / 180) - E.prof) * Math.min(1, dt * 3);

  const vmax = turboAtivo ? V_MAX * TURBO_V : V_MAX;
  if (E.girando > 0) E.vel += AREIA_DESACEL * dt;
  else if (acel || turboAtivo) E.vel += (turboAtivo ? ACEL * 2 : ACEL) * dt;
  else E.vel += SOLTO * dt;
  const fora = E.x < -1 || E.x > 1;
  if (fora && E.vel > AREIA_LIMITE) E.vel += AREIA_DESACEL * dt;
  E.vel = Math.max(0, Math.min(E.vel, vmax));
  if (!turboAtivo && E.vel > V_MAX) E.vel += SOLTO * dt * 2;

  const lc = largCarro() * 0.9;
  // batidas nos objetos da beira
  if (fora && E.girando <= 0) {
    for (const sp of jSeg.sprites) {
      const tipo = SPR[sp.tipo];
      const centro = sp.offset < 0 ? sp.offset - tipo.mundo / 2 : sp.offset + tipo.mundo / 2;
      if (sobrepoe(E.x, lc, centro, tipo.mundo * tipo.bate)) { rodar(0.25, 1); reclamar('batida'); break; }
    }
  }
  // perigos
  if (E.girando <= 0 && correndo && E.t > E.imuneAte) {
    const h = perigos.bateu(iJog, E.x, lc, E.t);
    if (h) {
      // fica invencível por 2 segundos e é empurrado pro lado livre, pra conseguir sair
      E.imuneAte = E.t + 2; E.fugir = -h.lado;
      if (h.tipo === 'onda') { E.vel *= 0.45; E.x += h.lado * 0.5; E.tremor = 0.8; som.batida(); }
      else rodar(h.tipo === 'caminhao' ? 0.15 : 0.3, 1.2);
      reclamar(null, TIPOS_PERIGO[h.tipo].frases);
    }
  }
  if (fora && correndo) { if (!E.areiaDesde) E.areiaDesde = E.t; else if (E.t - E.areiaDesde > 1.2) reclamar('areia'); }
  else E.areiaDesde = 0;

  // adversários
  const dj = distJog();
  if (!E.online) atualizarNpcs(E.npcs, dt, { segs, SEG, COMPR, V_MAX, distJog: E.terminouEm != null ? -1e12 : dj, correndo: correndo || E.fase === 'fim', perigos, t: E.t, rand, VOLTAS, tempo: E.tempo });
  else atualizarRemotos(dt);
  for (const n of carros()) {
    if (E.terminouEm != null) break;
    if (n.oculto || (E.online && n.terminou != null)) continue;
    const dz = n.dist - dj;
    if (Math.abs(dz) < 280 && Math.abs(n.x - E.x) < lc && E.t > (n.bateuEm || 0) + 0.6) {
      // batida "macia": os dois perdem um pouco e se afastam
      n.bateuEm = E.t;
      E.vel *= 0.85;
      const lado = Math.sign(E.x - n.x) || 1;
      E.x += lado * 0.18;
      if (!E.online) { n.vel *= 0.85; n.x -= lado * 0.18; n.alvoX = n.x; }
      E.tremor = 0.5; som.batida(); reclamar('carro');
    }
  }
  E.x = Math.max(-3, Math.min(3, E.x));

  // turbo: enche quando fica na pista sem bater
  if (correndo && !turboAtivo) {
    if (!fora && E.girando <= 0 && pct > 0.3) E.turbo = Math.min(1, E.turbo + dt / TURBO_ENCHE);
    else if (fora) E.turbo = Math.max(0, E.turbo - dt / 10);
  }
  if (E.botaoTurbo || teclas.Space || teclas.KeyX) usarTurbo();

  const antes = E.pos;
  E.pos += E.vel * dt;
  if (E.pos >= COMPR) E.pos -= COMPR;
  if (correndo) {
    E.tempo += dt; E.tempoVolta += dt;
    if (E.pos < antes) completouVolta();
  }
  if (E.fase === 'correndo') {
    const minha = distJog();
    const pos = 1 + carros().filter(n => !n.oculto && ((E.online && n.terminou != null) || n.dist > minha)).length;
    if (pos > E.posicao && E.tempo > 6 && Math.random() < 0.4) reclamar('ultrapassado');
    E.posicao = pos;
  }
  if (E.online) {
    // o anfitrião sorteia os perigos à frente de quem está liderando
    let lider = dj; for (const n of E.remotos) if (!n.oculto && n.terminou == null) lider = Math.max(lider, n.dist);
    perigos.atualizar(E.t, iJog, correndo && M.host, rand, Math.floor((((lider + Z_JOG) % COMPR) + COMPR) % COMPR / SEG));
  } else perigos.atualizar(E.t, iJog, correndo, rand);
  clima.atualizar(dt, pct);
  E.ceu += 0.0004 * jSeg.curva * pct;
  E.morros += 0.0009 * jSeg.curva * pct;
  E.roda += E.vel * dt / 300;
  som.motor(Math.min(1.3, pct), acel, turboAtivo);
}

function usarTurbo() {
  if (E.fase !== 'correndo' || E.t < E.turboAte || E.turbo < 0.2 || E.girando > 0) return;
  E.turboAte = E.t + 3 * E.turbo;
  E.turbo = 0;
  som.turboSom();
}

function completouVolta() {
  E.voltas.push(E.tempoVolta);
  E.tempoVolta = 0;
  if (E.volta >= VOLTAS) return terminar();
  E.volta++;
  som.bip(880, 0.2);
  toast(E.volta === VOLTAS ? 'Última volta!' : 'Volta ' + E.volta);
  // o tempo pode virar no meio da corrida
  if (E.volta === 2 && rand() < 0.4) {
    const muda = clima.tempo === 'chuva' ? 'limpo' : 'chuva';
    if (clima.mudarTempo(muda)) setTimeout(() => toast(muda === 'chuva' ? 'Começou a chover! 🌧️' : 'A chuva parou ☀️', 1800), 1500);
  }
}

// ---------- HUD ----------
const fmt = s => { const m = Math.floor(s / 60), r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(1); };
function hud() {
  $('hudVolta').textContent = Math.min(E.volta, VOLTAS) + '/' + VOLTAS;
  $('hudTempo').textContent = fmt(E.tempo);
  $('hudMelhor').textContent = E.voltas.length ? fmt(Math.min(...E.voltas)) : '–';
  $('hudVel').textContent = Math.round(E.vel / V_MAX * KMH);
  $('hudPos').textContent = E.posicao + 'º';
  $('hudPosTotal').textContent = '/' + (carros().filter(n => !n.oculto).length + 1);
  $('barraTurboCheia').style.width = (E.t < E.turboAte ? 100 : E.turbo * 100) + '%';
  $('btnTurbo').classList.toggle('pronto', E.turbo >= 0.2 && E.t >= E.turboAte);
  const giro = E.modo === 'sensor' ? volante.valor : teclaVol;
  $('ponteiro').style.transform = `rotate(${giro * 90}deg)`;
  posicionarBalao();
  // aviso de perigo
  const iJog = Math.floor(((E.pos + Z_JOG) % COMPR) / SEG) % N;
  const p = E.fase === 'correndo' ? perigos.aFrente(iJog, 260) : null;
  const el = $('perigo');
  if (p) {
    const tp = TIPOS_PERIGO[p.h.tipo];
    el.hidden = false;
    el.className = p.h.lado < 0 ? 'esq' : 'dir';
    $('perigoIcone').textContent = tp.icone;
    $('perigoNome').textContent = tp.nome;
    $('perigoDica').textContent = p.h.lado < 0 ? 'vá pela DIREITA ➜' : '⬅ vá pela ESQUERDA';
  } else el.hidden = true;
  if (minimapa) {
    const pts = carros().filter(n => !n.oculto).map(n => ({ i: Math.floor(((((n.dist + Z_JOG) % COMPR) + COMPR) % COMPR) / SEG), cor: corPorId(n.cor).c[0] }));
    pts.push({ i: iJog, cor: corPorId(pref.cor).c[0], eu: true });
    minimapa.desenhar(pts, perigos.lista, LARGADA);
  }
}

let toastTimer = 0;
function toast(t, ms = 1400) {
  $('toast').textContent = t; $('toast').hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, ms);
}

// ---------- telas e fluxo ----------
const telas = ['telaInicio', 'telaAviso', 'telaGire', 'telaCalibra', 'telaAjustes', 'telaFim', 'telaPerfil', 'telaSala', 'telaComo'];
function mostrar(id) { for (const t of telas) $(t).hidden = t !== id; }

const UA = navigator.userAgent || '';
const IOS = /iPhone|iPad|iPod/i.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const EMBUTIDO = !navigator.standalone && (/FBAN|FBAV|FB_IAB|Instagram|WhatsApp|Line\/|LinkedInApp|Snapchat|TikTok|musical_ly|Telegram|; wv\)|GSA\//i.test(UA)
  || (/iPhone|iPad|iPod/i.test(UA) && !/Safari\//.test(UA) && !/CriOS|FxiOS|EdgiOS/.test(UA)));
const TOQUE = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

function aviso(titulo, html, { copiar = false, chrome = false, tentar = null } = {}) {
  $('avisoTitulo').textContent = titulo;
  $('avisoTxt').innerHTML = html;
  $('btnAvisoCopiar').hidden = !copiar;
  $('btnAvisoChrome').hidden = !chrome;
  $('btnAvisoTentar').hidden = !tentar;
  $('btnAvisoTentar').onclick = tentar;
  mostrar('telaAviso');
}
$('btnAvisoCopiar').onclick = async () => {
  try { await navigator.clipboard.writeText(location.href); toast('Link copiado! Cole no navegador 👍'); }
  catch { toast(location.href, 4000); }
};
$('btnAvisoChrome').onclick = () => { location.href = `intent://${location.host}${location.pathname}${location.search}#Intent;scheme=https;package=com.android.chrome;end`; };

function avisoEmbutido() {
  aviso('Abra no navegador 🌐', IOS
    ? 'Dentro do WhatsApp/Instagram o volante (sensor de movimento) pode não funcionar. Toque em <b>•••</b> ou no ícone de compartilhar e escolha <b>Abrir no Safari</b>.'
    : 'Dentro do WhatsApp/Instagram o volante (sensor de movimento) pode não funcionar. Abra o jogo no <b>Chrome</b>.',
  { copiar: true, chrome: !IOS, tentar: () => mostrar('telaInicio') });
}

function montarCores() {
  const box = $('cores');
  box.innerHTML = '';
  for (const c of CORES_CARRO) {
    const b = document.createElement('button');
    b.className = 'cor' + (c.id === pref.cor ? ' sel' : '');
    b.style.background = c.c[0]; b.title = c.nome; b.setAttribute('aria-label', c.nome);
    b.onclick = () => { pref.cor = c.id; salvarPref(); montarCores(); };
    box.appendChild(b);
  }
  const pv = $('previaCarro'), pg = pv.getContext('2d');
  pg.clearRect(0, 0, pv.width, pv.height);
  pv.height = 44; pg.imageSmoothingEnabled = false;
  desenharCarro(pg, 0, 8, 1, { cor: corPorId(pref.cor).c, virar: 0, roda: 0, cabeca: cabecaJog });
}

function prepararInicio() {
  if (!TOQUE) {
    $('txtInicio').textContent = 'No computador não tem sensor de movimento: dá pra jogar pelo teclado.'; $('txtInicio').hidden = false;
    $('dicaTeclado').hidden = false;
  }
  montarCores();
  desenharPiloto();
  mostrar('telaInicio');
  if (EMBUTIDO) avisoEmbutido();
  const sala = (params.get('sala') || '').toUpperCase();
  if (/^[A-Z]{4}$/.test(sala)) { $('codigoSala').value = sala; $('btnEntrarConvite').hidden = false; $('btnEntrarConvite').textContent = `Entrar na sala ${sala}`; }
}

function telaCheia() {
  try {
    const el = document.documentElement;
    const p = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : null;
    if (p && p.then) p.then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {});
  } catch {}
  try { navigator.wakeLock && navigator.wakeLock.request('screen').catch(() => {}); } catch {}
}

function avisoSensor(r) {
  if (r === 'negado') aviso('Volante bloqueado', IOS
    ? 'O iPhone não deixou o jogo usar o sensor de movimento. Para liberar: <b>feche esta aba</b> do Safari, abra o link de novo e toque em <b>Permitir</b>. Se não aparecer a pergunta: Ajustes › Apps › Safari › Avançado › Dados dos Sites, apague <b>justletmein2.github.io</b> e tente de novo.'
    : 'O navegador não deixou usar o sensor de movimento. Toque no cadeado ao lado do endereço › Permissões › libere <b>Sensores de movimento</b>, e recarregue a página.',
    { tentar: () => mostrar('telaInicio') });
  else aviso('Sem sensor', 'Não chegou nenhum dado do sensor de movimento. Se estiver dentro de outro app (WhatsApp, Instagram), abra no Chrome ou Safari. Se for computador, use o teclado.',
    { copiar: true, tentar: () => mostrar('telaInicio') });
}
// Liga o controle (volante no celular, teclado no computador).
// Tem que ser chamada logo no começo do toque no botão: o iPhone exige isso pra pedir o sensor.
function prepararControle() {
  if (!TOQUE) { som.iniciarSom(); E.modo = 'teclado'; redimensionar(); return Promise.resolve(true); }
  if (E.modo === 'sensor' && volante.temSensor) { som.iniciarSom(); return Promise.resolve(true); }
  const pedido = ligar();
  som.iniciarSom();
  telaCheia();
  return pedido.then(r => {
    if (r === 'ok') { E.modo = 'sensor'; redimensionar(); return true; }
    avisoSensor(r); return false;
  });
}
$('btnSolo').onclick = () => {
  prepararControle().then(ok => { if (ok) { if (E.modo === 'sensor') irCalibrar(); else novaCorrida(); } });
};
$('btnCriarSala').onclick = () => {
  const pc = prepararControle();
  pc.then(ok => { if (!ok) return; if (!PERFIL.tag) abrirEditor(criarSalaAgora); else criarSalaAgora(); });
};
$('btnEntrarSala').onclick = () => entrarClique($('codigoSala').value);
$('btnEntrarConvite').onclick = () => entrarClique($('codigoSala').value);
$('codigoSala').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4); });

let calibrarDepois = 'corrida';
function irCalibrar(depois = 'corrida') {
  calibrarDepois = depois;
  if (depois === 'corrida') E.fase = 'calibrando';
  calibrar();
  mostrar('telaCalibra');
}
$('btnPronto').onclick = () => {
  calibrar();
  if (calibrarDepois === 'ajustes') { mostrar('telaAjustes'); return; }
  novaCorrida();
};

function sementeDe(s) { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
function aleatorio(semente) {
  let s = semente >>> 0;
  return () => { s += 0x6D2B79F5; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

let contTimer = null;
function zerarCorrida() {
  Object.assign(E, { pos: 0, x: 0, vel: 0, volta: 1, tempo: 0, tempoVolta: 0, voltas: [], turbo: 0, turboAte: 0, girando: 0, rostoAte: 0, pausado: false, tremor: 0, terminouEm: null, t: 0, reclamouEm: -9, imuneAte: -9, fugir: 0, giroFiltro: 0, acel: false });
}
function novaCorrida() {
  clearInterval(contTimer);
  musica.parar();
  rand = params.get('semente') ? aleatorio(sementeDe(params.get('semente'))) : Math.random;
  zerarCorrida();
  perigos.aoCriar = null;
  E.online = false; E.remotos = [];
  E.npcs = criarNpcs(pref.cor, rand, COMPR, SEG, cabecasNpc);
  E.posicao = E.npcs.length + 1;
  perigos.reiniciar();
  // clima: sorteado (ou forçado pelo endereço, pra teste: ?clima=noite-chuva)
  let c = sortearClima(rand);
  if (params.get('clima')) { const [h, t] = params.get('clima').split('-'); c = { hora: h || 'dia', tempo: t || 'limpo' }; }
  clima.definir(c, CW, CH);
  E.musica = params.get('musica') != null ? +params.get('musica')
    : rand() < 0.65 ? (c.hora === 'noite' ? 1 : c.tempo === 'chuva' ? 3 : c.tempo === 'neve' ? 2 : 0) : Math.floor(rand() * 4);
  mostrar(null);
  $('hud').hidden = false; $('controles').hidden = !TOQUE && E.modo === 'teclado';
  if (!minimapa) minimapa = new Minimapa($('minimapa'), segs);
  minimapa.ajustar();
  E.fase = 'contagem';
  let n = 3;
  toast([NOMES_CLIMA[c.hora], NOMES_CLIMA[c.tempo]].filter(Boolean).join(' '), 2200);
  $('contagem').hidden = false; $('contagem').textContent = n; som.bip(440);
  contTimer = setInterval(() => {
    n--;
    if (n > 0) { $('contagem').textContent = n; som.bip(440); }
    else {
      clearInterval(contTimer);
      $('contagem').textContent = 'VAI!'; som.bip(880, 0.35);
      E.fase = 'correndo';
      perigos.proximo = E.t + (params.get('perigo') ? 2 : 8);
      musica.tocar(E.musica);
      setTimeout(() => { $('contagem').hidden = true; }, 700);
    }
  }, 800);
}

function terminar() {
  E.fase = 'fim';
  E.terminouEm = E.tempo;
  E.acel = false;
  musica.parar();
  som.bip(660, 0.15); setTimeout(() => som.bip(880, 0.15), 160); setTimeout(() => som.bip(1320, 0.4), 320);
  if (E.online) return terminarOnline();
  const lista = [{ nome: PERFIL.tag || 'Você', tempo: E.tempo, eu: true, cor: pref.cor, look: PERFIL.look }];
  E.npcs.forEach((n, k) => {
    const tempo = n.terminou != null ? n.terminou : E.tempo + Math.max(0, VOLTAS * COMPR - n.dist) / Math.max(n.vel, V_MAX * 0.6);
    lista.push({ nome: n.nome, tempo, cor: n.cor, look: npcLooks[k] });
  });
  lista.sort((a, b) => a.tempo - b.tempo);
  const minha = lista.findIndex(l => l.eu) + 1;
  const medalha = ['🥇', '🥈', '🥉'];
  $('fimTitulo').textContent = minha === 1 ? '🏆 Você venceu!' : `🏁 Você chegou em ${minha}º`;
  $('fimLista').innerHTML = lista.map((l, i) => `<li class="${l.eu ? 'eu' : ''}"><span>${medalha[i] || (i + 1) + 'º'}</span><i style="background:${corPorId(l.cor).c[0]}"></i><b>${l.nome}</b><em>${fmt(l.tempo)}</em></li>`).join('');
  podio(lista.slice(0, 3).map(l => ({ nome: l.nome, look: l.look })));
  $('fimMelhor').textContent = fmt(Math.min(...E.voltas));
  $('fimVoltas').textContent = E.voltas.map((v, i) => `Volta ${i + 1}: ${fmt(v)}`).join(' · ');
  modoFim(false);
  ganharXP(5 + (minha === 1 ? 5 : 0));
  setTimeout(() => mostrar('telaFim'), 900);
}
$('btnDeNovo').onclick = () => novaCorrida();
$('btnFimAjustes').onclick = () => abrirAjustes();
$('btnFimInicio').onclick = () => irInicio();

// ---------- ajustes ----------
const CAMPOS = [['cfgAngulo', 'angulo', v => v + '°'], ['cfgMorta', 'morta', v => v + '°'], ['cfgSuave', 'suave', v => Math.round(v * 100) + '%'], ['cfgCentro', 'centro', v => (+v).toFixed(1)]];
function preencherAjustes() {
  for (const [id, k, f] of CAMPOS) { $(id).value = volante.cfg[k]; $('v' + id.slice(3)).textContent = f(volante.cfg[k]); }
  $('cfgInverter').checked = volante.cfg.inverter;
  $('cfgSom').checked = som.somLigado();
  $('cfgMusica').checked = musica.musicaLigada();
  $('cfgNivelar').checked = pref.nivelar;
  $('cfgBolinhas').checked = pref.bolinhas;
}
for (const [id, k, f] of CAMPOS) {
  $(id).oninput = () => { volante.cfg[k] = +$(id).value; $('v' + id.slice(3)).textContent = f(volante.cfg[k]); salvarVolante(); };
}
$('cfgInverter').onchange = () => { volante.cfg.inverter = $('cfgInverter').checked; salvarVolante(); };
$('cfgSom').onchange = () => { som.ligarSom($('cfgSom').checked); };
$('cfgMusica').onchange = () => { musica.ligarMusica($('cfgMusica').checked); };
$('cfgBolinhas').onchange = () => { pref.bolinhas = $('cfgBolinhas').checked; salvarPref(); };
$('cfgNivelar').onchange = () => { pref.nivelar = $('cfgNivelar').checked; salvarPref(); redimensionar(); };
$('btnPadrao').onclick = () => { restaurarPadrao(); preencherAjustes(); toast('Ajustes de fábrica'); };
$('btnCopiarAjustes').onclick = async () => {
  const txt = 'Ajustes do volante Pé na Tábua: ' + JSON.stringify({ ...volante.cfg, nivelar: pref.nivelar });
  try { await navigator.clipboard.writeText(txt); toast('Copiado! Cole na conversa com o Claude'); }
  catch { toast(txt, 6000); }
};
$('btnRecalibrar').onclick = () => { if (E.modo === 'sensor') irCalibrar('ajustes'); else toast('No teclado não precisa calibrar'); };
$('btnReiniciar').onclick = () => novaCorrida();
$('btnContinuar').onclick = () => {
  if (E.fase === 'fim') { mostrar('telaFim'); return; }
  if (E.fase === 'sala') { mostrar('telaSala'); return; }
  if (E.fase === 'inicio') { mostrar('telaInicio'); return; }
  mostrar(null);
  if (E.pausado && E.fase === 'correndo') musica.tocar(E.musica);
  E.pausado = false;
};
function abrirAjustes() {
  if (E.fase === 'inicio') return;
  E.pausado = !E.online && (E.fase === 'correndo' || E.fase === 'contagem');
  E.acel = false;
  if (!E.online) musica.parar();
  $('btnReiniciar').hidden = E.online;
  preencherAjustes();
  mostrar('telaAjustes');
}
$('btnPausa').onclick = abrirAjustes;

// ---------- botões de toque ----------
function botao(el, aoMudar) {
  const dedos = new Set();
  const mudar = () => { el.classList.toggle('ativo', dedos.size > 0); aoMudar(dedos.size > 0); };
  el.addEventListener('pointerdown', e => { e.preventDefault(); dedos.add(e.pointerId); try { el.setPointerCapture(e.pointerId); } catch {} mudar(); });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) el.addEventListener(ev, e => { dedos.delete(e.pointerId); mudar(); });
  el.addEventListener('contextmenu', e => e.preventDefault());
}
botao($('btnAcel'), v => { E.acel = v; });
botao($('btnTurbo'), v => { E.botaoTurbo = v; });

addEventListener('keydown', e => {
  teclas[e.code] = true;
  if (e.code === 'Escape' || e.code === 'KeyP') { if ($('telaAjustes').hidden) abrirAjustes(); else $('btnContinuar').onclick(); }
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', e => { teclas[e.code] = false; });
addEventListener('blur', () => { for (const k in teclas) teclas[k] = false; });
document.addEventListener('visibilitychange', () => { if (document.hidden && !E.online) { som.silenciarMotor(); musica.parar(); if (E.fase === 'correndo') abrirAjustes(); } });

// ---------- celular em pé / trava de rotação ----------
function conferirDeitado() {
  if (E.modo !== 'sensor' || E.fase === 'inicio') return false;
  const emPe = innerHeight > innerWidth;
  if (emPe) {
    $('txtGire').innerHTML = volante.deitado
      ? 'Parece que a <b>trava de rotação</b> está ligada: o celular está deitado, mas a tela não girou. Desligue a trava (iPhone: puxe a Central de Controle e toque no cadeado com a setinha; Android: ative "Girar automaticamente") e volte.'
      : 'Segure o celular na horizontal, como um volante.';
    $('telaGire').hidden = false;
  } else $('telaGire').hidden = true;
  return emPe;
}

// ---------- cenário nivelado: gira ao contrário do celular ----------
function girarCena(dt) {
  let alvo = 0;
  if (cenaNivelada() && volante.ref != null) alvo = Math.max(-GIRO_MAX, Math.min(GIRO_MAX, giroAtual()));
  const k = Math.min(1, dt * 9);
  E.giroFiltro += (alvo - E.giroFiltro) * k;
  E.angCena += (E.giroFiltro - E.angCena) * k;
  tela.style.transform = Math.abs(E.angCena) > 0.05 ? `rotate(${(-E.angCena).toFixed(2)}deg)` : '';
}

// ---------- perfil do Forma Palavras ----------
const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const TAG_OK = /^[\p{L}\p{N}_]{3,14}$/u;     // a mesma regra de nome do Forma Palavras
let npcLooks = [];
async function carregarPerfil() {
  // o que o Forma Palavras guardou neste aparelho (mesmo site)
  try { const l = JSON.parse(localStorage.getItem('cp_perfil2') || 'null'); if (l && l.tag) PERFIL = { ...PERFIL, tag: l.tag, look: l.look, xp: l.xp || 0, ach: l.ach || {} }; } catch {}
  await boneco.carregarAvatar();
  if (boneco.av()) {
    npcLooks = [0, 1, 2, 3, 4].map(() => boneco.lookAleatorio());
    cabecasNpc = await Promise.all(npcLooks.map(l => boneco.cabecas(l)));
  }
  await atualizarCabeca(); desenharPiloto();
  try {
    await rede.conectar();
    const p = await rede.lerPerfil();
    if (p && p.tag) PERFIL = { ...PERFIL, ...p };
  } catch (e) { console.warn('Sem conexão com o servidor', e); }
  if (!PERFIL.look) { try { PERFIL.look = JSON.parse(localStorage.getItem('pnt-look') || 'null'); } catch {} }
  await atualizarCabeca(); desenharPiloto();
}
async function atualizarCabeca() { cabecaJog = PERFIL.look ? await boneco.cabecas(PERFIL.look) : null; if (E.fase === 'inicio') montarCores(); }
function desenharPiloto() {
  const box = $('piloto');
  const svg = PERFIL.look ? boneco.frenteSVG(PERFIL.look, 56) : '';
  box.innerHTML = `<div class="rosto">${svg || '🙂'}</div><div class="nomeP"><b>${esc(PERFIL.tag || 'Seu piloto')}</b><small>${PERFIL.tag ? 'Nível ' + boneco.nivelDe(PERFIL.xp) : 'Toque em Editar pra montar'}</small></div><button id="btnEditarPiloto" class="sec mini">Editar</button>`;
  $('btnEditarPiloto').onclick = () => abrirEditor();
}
let rascunho = null, depoisEditor = null;
function abrirEditor(depois) {
  depoisEditor = depois || null;
  if (!boneco.av()) { toast('Precisa de internet pra carregar os bonecos', 2500); return; }
  rascunho = { ...(PERFIL.look || boneco.av().lookPadrao()) };
  $('nomePiloto').value = PERFIL.tag || '';
  const prev = () => { $('previaBoneco').innerHTML = boneco.frenteSVG(rascunho, 110); };
  prev();
  boneco.montarEditor($('partesBoneco'), rascunho, boneco.nivelDe(PERFIL.xp), PERFIL.ach, prev);
  $('dicaLogin').hidden = !!PERFIL.tag;
  mostrar('telaPerfil');
}
$('btnSalvarPiloto').onclick = async () => {
  const tag = $('nomePiloto').value.trim();
  if (!TAG_OK.test(tag)) { toast('Nome com 3 a 14 letras ou números (sem espaço)', 2500); return; }
  $('btnSalvarPiloto').disabled = true;
  try {
    if (rede.conectado()) {
      if (tag !== PERFIL.tag && !(await rede.reservarTag(tag, PERFIL.tag))) { toast('Esse nome já tem dono, escolha outro 🙂', 2500); return; }
      await rede.salvarPerfil({ tag, look: rascunho });
    }
    PERFIL.tag = tag; PERFIL.look = { ...rascunho };
    try { localStorage.setItem('pnt-look', JSON.stringify(PERFIL.look)); } catch {}
    await atualizarCabeca(); desenharPiloto();
    if (M.code) rede.atualizarEu(M.code, publico()).catch(() => {});
    const d = depoisEditor; depoisEditor = null;
    if (d) d(); else mostrar(M.code ? 'telaSala' : 'telaInicio');
  } catch (e) { toast('Não deu pra salvar: ' + (e.message || e), 3000); }
  finally { $('btnSalvarPiloto').disabled = false; }
};
$('btnCancelarPiloto').onclick = () => { depoisEditor = null; mostrar(M.code ? 'telaSala' : 'telaInicio'); };

// XP vai pro mesmo nível do Forma Palavras
async function ganharXP(n) {
  if (!PERFIL.tag || !rede.conectado()) return;
  try {
    const p = await rede.lerPerfil();
    const xp = ((p && p.xp) || 0) + n;
    await rede.salvarPerfil({ xp });
    PERFIL.xp = xp;
    setTimeout(() => toast(`+${n} XP pro seu boneco ⭐`, 2000), 1200);
  } catch {}
}

function podio(top) {
  const med = ['🥇', '🥈', '🥉'];
  const ordem = [1, 0, 2].filter(i => top[i]);
  $('podio').innerHTML = ordem.map(i => `<div class="degrau d${i + 1}"><div class="pula" style="animation-delay:${i * 0.15}s">${top[i].look ? boneco.frenteSVG(top[i].look, i === 0 ? 72 : 56) : '<span class="semB">🙂</span>'}</div><b>${esc(top[i].nome)}</b><div class="bloco">${med[i]}</div></div>`).join('');
}
function modoFim(online) {
  $('btnDeNovo').hidden = online; $('btnFimAjustes').hidden = online; $('btnFimInicio').hidden = online;
  $('btnNovaRodada').hidden = !(online && M.host);
  $('btnSairSala2').hidden = !online;
  $('fimEspera').hidden = !online || M.host;
}

// ---------- salas (multiplayer) ----------
const M = { code: null, host: false, meta: null, players: {}, corrida: { estado: {}, resultado: {}, perigos: {} }, sairSala: null, sairCorrida: null, rodada: -1, enviadoEm: 0, perigosVistos: new Set(), calibrado: false, xpDado: false };
const publico = () => ({ name: PERFIL.tag, look: PERFIL.look || null, lvl: boneco.nivelDe(PERFIL.xp), cor: pref.cor });
const linkSala = code => location.origin + location.pathname + '?sala=' + code + (rede.LOCAL ? '&local=1' : '');

async function criarSalaAgora() {
  try { await rede.conectar(); const code = await rede.criarSala(); await entrarNaSala(code); }
  catch (e) { console.warn(e); toast('Não deu pra criar a sala: ' + (e.message || e), 3500); mostrar('telaInicio'); }
}
function entrarClique(code) {
  code = (code || '').toUpperCase().trim();
  if (!/^[A-Z]{4}$/.test(code)) { toast('O código da sala tem 4 letras'); return; }
  prepararControle().then(ok => {
    if (!ok) return;
    const ir = () => entrarNaSala(code).catch(e => { console.warn(e); toast('Não deu pra entrar: ' + (e.message || e), 3500); mostrar('telaInicio'); });
    if (!PERFIL.tag) abrirEditor(ir); else ir();
  });
}
async function entrarNaSala(code) {
  await rede.conectar();
  const meta = await rede.lerMeta(code);
  if (!meta) { toast('Não achei a sala ' + code, 2500); mostrar('telaInicio'); return; }
  sairDaSala();
  M.code = code; M.rodada = -1; M.meta = meta; M.players = {};
  E.fase = 'sala'; E.online = false;
  $('hud').hidden = true; $('controles').hidden = true;
  try { history.replaceState(null, '', '?sala=' + code + (rede.LOCAL ? '&local=1' : '')); } catch {}
  desenharSala();
  mostrar('telaSala');
  M.sairSala = await rede.entrarSala(code, publico(), st => { M.meta = st.meta; M.players = st.players; aoMudarSala(); });
  M.sairCorrida = rede.ouvirCorrida(code, (st, k) => {
    M.corrida = st;
    if (k === 'perigos') receberPerigos();
    if (k === 'resultado' && E.online && E.fase === 'fim') desenharFimOnline();
  });
}
function sairDaSala() {
  if (M.sairSala) M.sairSala();
  if (M.sairCorrida) M.sairCorrida();
  M.sairSala = M.sairCorrida = null; M.code = null; M.meta = null; E.online = false; E.remotos = [];
  try { history.replaceState(null, '', location.pathname + (rede.LOCAL ? '?local=1' : '')); } catch {}
}
function irInicio() {
  sairDaSala(); musica.parar();
  E.fase = 'inicio';
  $('hud').hidden = true; $('controles').hidden = true; $('contagem').hidden = true;
  montarCores(); desenharPiloto(); mostrar('telaInicio');
}
$('btnSairSala').onclick = irInicio;
$('btnComoJogar').onclick = () => mostrar('telaComo');
$('btnFecharComo').onclick = () => mostrar('telaInicio');
$('btnAjustesMenu').onclick = () => { preencherAjustes(); $('btnReiniciar').hidden = true; mostrar('telaAjustes'); };
$('btnSairSala2').onclick = irInicio;
$('btnConvidar').onclick = async () => {
  const url = linkSala(M.code);
  try { if (navigator.share) { await navigator.share({ title: 'Pé na Tábua', text: `Bora correr? Sala ${M.code}`, url }); return; } } catch { return; }
  try { await navigator.clipboard.writeText(url); toast('Link copiado! Mande pros amigos 👍'); } catch { toast(url, 5000); }
};
$('btnCorSala').onclick = () => { const i = CORES_CARRO.findIndex(c => c.id === pref.cor); pref.cor = CORES_CARRO[(i + 1) % CORES_CARRO.length].id; salvarPref(); rede.atualizarEu(M.code, { cor: pref.cor }); };
$('btnPilotoSala').onclick = () => abrirEditor();

function aoMudarSala() {
  const meta = M.meta;
  if (!meta || !M.code) return;
  const eu = rede.meuId();
  M.host = meta.host === eu;
  // o anfitrião saiu? quem entrou primeiro (e está online) assume
  const online = Object.entries(M.players).filter(([, p]) => p.online).sort((a, b) => (a[1].entrou || 0) - (b[1].entrou || 0));
  if (online.length && !online.find(([id]) => id === meta.host) && online[0][0] === eu) rede.atualizarMeta(M.code, { host: eu }).catch(() => {});
  if (E.online) montarRemotos();
  if ((meta.status === 'contagem' || meta.status === 'correndo') && meta.rodada !== M.rodada && E.fase === 'sala') {
    if (meta.status === 'contagem' && meta.inicio - rede.agora() > 800) { M.rodada = meta.rodada; iniciarOnline(meta); return; }
    desenharSala('Tem uma corrida acontecendo agora. Você entra na próxima! 🏁');
    return;
  }
  if (meta.status === 'lobby' && E.online && E.fase !== 'sala') { voltarPraSala(); return; }
  if (E.fase === 'sala') desenharSala();
  if (E.online && E.fase === 'fim') { modoFim(true); desenharFimOnline(); }
}
function desenharSala(msg) {
  $('salaCodigo').textContent = M.code || '';
  const lista = Object.entries(M.players).filter(([, p]) => p.online);
  $('salaJogadores').innerHTML = lista.map(([id, p]) => `<li>${p.look ? boneco.frenteSVG(p.look, 44) : '<span class="semB">🙂</span>'}<i style="background:${corPorId(p.cor).c[0]}"></i><b>${esc(p.name || '?')}</b>${M.meta && id === M.meta.host ? '<small>anfitrião</small>' : ''}${id === rede.meuId() ? '<small>você</small>' : ''}</li>`).join('') || '<li>Entrando…</li>';
  $('btnComecar').hidden = !M.host || (M.meta && M.meta.status !== 'lobby' && msg);
  $('salaEspera').textContent = msg || (M.host
    ? (lista.length < 2 ? 'Mande o link pros amigos! (Dá pra começar sozinho pra testar.)' : 'Todo mundo dentro? Pode começar!')
    : 'Esperando o anfitrião começar a corrida…');
}
$('btnComecar').onclick = async () => {
  if (!M.host || !M.code) return;
  $('btnComecar').disabled = true;
  try {
    await rede.limparCorrida(M.code);
    const c = sortearClima(Math.random);
    const mus = Math.random() < 0.65 ? (c.hora === 'noite' ? 1 : c.tempo === 'chuva' ? 3 : c.tempo === 'neve' ? 2 : 0) : Math.floor(Math.random() * 4);
    await rede.atualizarMeta(M.code, { status: 'contagem', rodada: ((M.meta && M.meta.rodada) || 0) + 1, inicio: rede.agora() + 6000, clima: c, musica: mus, semente: Math.random().toString(36).slice(2, 8) });
  } catch (e) { toast('Não deu pra começar: ' + (e.message || e), 3000); }
  finally { $('btnComecar').disabled = false; }
};
$('btnNovaRodada').onclick = () => { if (M.host) rede.atualizarMeta(M.code, { status: 'lobby' }); };

function iniciarOnline(meta) {
  clearInterval(contTimer); musica.parar();
  rand = aleatorio(sementeDe(meta.semente || 'x'));
  zerarCorrida();
  E.online = true; E.npcs = [];
  E.posicao = Object.values(M.players).filter(p => p.online).length || 1;
  M.perigosVistos = new Set(); M.calibrado = false; M.xpDado = false; M.enviadoEm = 0;
  perigos.reiniciar();
  perigos.proximo = 1e9;
  perigos.aoCriar = h => {
    if (!M.host || !E.online) return;
    const id = 'p' + Date.now().toString(36);
    M.perigosVistos.add(id);
    rede.publicarPerigo(M.code, id, { tipo: h.tipo, lado: h.lado, s0: h.s0, tc: +E.tempo.toFixed(2) }).catch(() => {});
  };
  const c = meta.clima || { hora: 'dia', tempo: 'limpo' };
  clima.definir(c, CW, CH);
  E.musica = meta.musica || 0;
  montarRemotos();
  // largada lado a lado: cada um num lugar
  const ids = Object.keys(M.players).sort();
  const k = Math.max(0, ids.indexOf(rede.meuId()));
  E.x = [-0.5, 0.5, 0, -0.5, 0.5, 0][k % 6];
  E.pos = Math.max(0, 600 - Math.floor(k / 2) * 320) % COMPR;
  mostrar(null);
  $('hud').hidden = false; $('controles').hidden = !TOQUE && E.modo === 'teclado';
  if (!minimapa) minimapa = new Minimapa($('minimapa'), segs);
  minimapa.ajustar();
  E.fase = 'contagem';
  $('contagem').hidden = false; $('contagem').textContent = '';
  toast([NOMES_CLIMA[c.hora], NOMES_CLIMA[c.tempo]].filter(Boolean).join(' '), 2200);
}
function tickOnline() {
  if (!M.meta) return;
  if (E.fase === 'contagem') {
    const falta = (M.meta.inicio - rede.agora()) / 1000;
    const txt = falta > 3 ? (E.modo === 'sensor' ? 'Segure reto!' : 'Prepare-se!') : falta > 0 ? String(Math.ceil(falta)) : 'VAI!';
    if ($('contagem').textContent !== txt) { $('contagem').textContent = txt; if (falta <= 3 && falta > 0) som.bip(440); }
    if (falta <= 0.6 && !M.calibrado && E.modo === 'sensor') { calibrar(); M.calibrado = true; }
    if (falta <= 0) {
      E.fase = 'correndo'; E.tempo = Math.min(1, -falta);
      perigos.proximo = E.t + 8;
      som.bip(880, 0.35); musica.tocar(E.musica);
      setTimeout(() => { if (E.fase !== 'contagem') $('contagem').hidden = true; }, 700);
    }
  }
  // manda a posição ~8 vezes por segundo
  const t = performance.now();
  if ((E.fase === 'correndo' || E.fase === 'fim') && t - M.enviadoEm > 120) {
    M.enviadoEm = t;
    rede.enviarEstado(M.code, { d: Math.round(distJog()), x: +E.x.toFixed(3), v: Math.round(E.vel), vi: E.virar, ts: Math.round(rede.agora()) }).catch(() => {});
  }
}
function montarRemotos() {
  const eu = rede.meuId();
  const lista = [];
  for (const [id, p] of Object.entries(M.players)) {
    if (id === eu) continue;
    let r = E.remotos.find(x => x.uid === id);
    if (!r) r = { uid: id, dist: 0, x: 0, virar: 0, imgs: null, oculto: true, terminou: null };
    r.nome = p.name; r.cor = p.cor || 'azul'; r.online = p.online; r.look = p.look;
    const chave = r.cor + JSON.stringify(p.look || null);
    if (r.chave !== chave) {
      r.chave = chave;
      const cor = corPorId(r.cor).c;
      r.imgs = [-1, 0, 1].map(v => carroImg(cor, v));
      boneco.cabecas(p.look).then(cab => { if (cab && r.chave === chave) r.imgs = [-1, 0, 1].map(v => carroImg(cor, v, null, null, cab)); });
    }
    lista.push(r);
  }
  E.remotos = lista;
}
function atualizarRemotos(dt) {
  const est = M.corrida.estado || {}, res = M.corrida.resultado || {};
  for (const r of E.remotos) {
    const e = est[r.uid];
    r.terminou = res[r.uid] ? res[r.uid].tempo : null;
    if (!e || (!r.online && r.terminou == null)) { r.oculto = true; continue; }
    const idade = Math.max(0, Math.min(0.5, (rede.agora() - e.ts) / 1000));
    const alvo = e.d + e.v * idade;
    if (r.oculto || Math.abs(alvo - r.dist) > 4000) r.dist = alvo;
    else r.dist += (alvo - r.dist) * Math.min(1, dt * 8);
    r.x += (e.x - r.x) * Math.min(1, dt * 10);
    r.virar = e.vi || 0;
    r.oculto = false;
  }
}
function receberPerigos() {
  if (!E.online) return;
  for (const [id, h] of Object.entries(M.corrida.perigos || {})) {
    if (M.perigosVistos.has(id)) continue;
    M.perigosVistos.add(id);
    if (M.host) continue;
    perigos.criar(h.tc + (E.t - E.tempo), 0, Math.random, h.tipo, h.lado, h.s0);
  }
}
function terminarOnline() {
  const melhor = Math.min(...E.voltas);
  const lugar = Object.keys(M.corrida.resultado || {}).length + 1;
  rede.enviarResultado(M.code, { tempo: +E.tempo.toFixed(2), melhor: +melhor.toFixed(2), nome: PERFIL.tag }).catch(() => {});
  if (!M.xpDado) {
    M.xpDado = true;
    const n = 1 + E.remotos.filter(r => !r.oculto || r.terminou != null).length;
    ganharXP(10 + (n >= 2 ? ([25, 15, 10][lugar - 1] || 0) : 0));
  }
  modoFim(true);
  desenharFimOnline(true);
  setTimeout(() => mostrar('telaFim'), 900);
}
function desenharFimOnline(eu1) {
  const res = { ...(M.corrida.resultado || {}) };
  const eu = rede.meuId();
  if (eu1 && !res[eu]) res[eu] = { tempo: E.tempo, melhor: Math.min(...E.voltas), nome: PERFIL.tag };
  const chegaram = Object.entries(res).sort((a, b) => a[1].tempo - b[1].tempo);
  const est = M.corrida.estado || {};
  const faltam = Object.entries(M.players).filter(([id]) => !res[id] && est[id]);
  const med = ['🥇', '🥈', '🥉'];
  const minha = chegaram.findIndex(([id]) => id === eu) + 1;
  const quem = (id, r) => (M.players[id] || {}).name || (r && r.nome) || '?';
  $('fimTitulo').textContent = minha === 1 ? '🏆 Você venceu!' : minha ? `🏁 Você chegou em ${minha}º` : '🏁 Fim!';
  podio(chegaram.slice(0, 3).map(([id, r]) => ({ nome: quem(id, r), look: (M.players[id] || {}).look })));
  $('fimLista').innerHTML = chegaram.map(([id, r], i) => `<li class="${id === eu ? 'eu' : ''}"><span>${med[i] || (i + 1) + 'º'}</span><i style="background:${corPorId((M.players[id] || {}).cor).c[0]}"></i><b>${esc(quem(id, r))}</b><em>${fmt(r.tempo)}</em></li>`).join('')
    + faltam.map(([id, p]) => `<li><span>…</span><i style="background:${corPorId(p.cor).c[0]}"></i><b>${esc(p.name || '?')}</b><em>${p.online ? 'correndo…' : 'saiu'}</em></li>`).join('');
  const rapida = chegaram.reduce((a, [id, r]) => (!a || r.melhor < a.r.melhor ? { id, r } : a), null);
  $('fimMelhor').textContent = rapida ? `${fmt(rapida.r.melhor)} (${quem(rapida.id, rapida.r)})` : '–';
  $('fimVoltas').textContent = 'Suas voltas: ' + E.voltas.map((v, i) => `${i + 1}ª ${fmt(v)}`).join(' · ');
}
function voltarPraSala() {
  musica.parar();
  E.online = false; E.fase = 'sala'; E.remotos = [];
  perigos.reiniciar();
  $('hud').hidden = true; $('controles').hidden = true; $('contagem').hidden = true;
  desenharSala();
  mostrar('telaSala');
}

// ---------- bolinhas anti-enjoo ----------
// Pontinhos nas bordas da tela que ficam nivelados com o horizonte e escorregam pro lado
// contrário das curvas e das aceleradas, como os "sinais de movimento" do celular.
const cues = $('bolinhas'), cg = cues.getContext('2d');
const B = { x: 0, y: 0, velAntes: 0 };
function bolinhas(dt) {
  const ligar = pref.bolinhas && E.fase !== 'inicio';
  cues.hidden = !ligar;
  if (!ligar) return;
  const dpr = Math.min(2, devicePixelRatio || 1), w = innerWidth, h = innerHeight;
  if (cues.width !== Math.round(w * dpr) || cues.height !== Math.round(h * dpr)) { cues.width = Math.round(w * dpr); cues.height = Math.round(h * dpr); }
  if (dt > 0) {
    const pct = E.vel / V_MAX;
    const curva = segs[Math.floor(((E.pos + Z_JOG) % COMPR) / SEG) % N].curva;
    const acel = (E.vel - B.velAntes) / V_MAX / dt; B.velAntes = E.vel;
    B.x += (-curva * pct * 14 - B.x) * Math.min(1, dt * 4);
    B.y += (Math.max(-1, Math.min(1, acel)) * 22 - B.y) * Math.min(1, dt * 4);
  }
  cg.setTransform(dpr, 0, 0, dpr, 0, 0);
  cg.clearRect(0, 0, w, h);
  const a = -E.angCena * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a), cx = w / 2, cy = h / 2;
  cg.fillStyle = 'rgba(255,255,255,.8)'; cg.strokeStyle = 'rgba(0,0,0,.6)'; cg.lineWidth = 1.5;
  for (const lado of [-1, 1]) for (const col of [0.035, 0.085]) for (let y = -h; y <= h; y += 46) {
    const px = lado * (w / 2 - w * col) + B.x, py = y + B.y;
    const sx = cx + px * ca - py * sa, sy = cy + px * sa + py * ca;
    if (sx < -10 || sx > w + 10 || sy < -10 || sy > h + 10) continue;
    cg.beginPath(); cg.arc(sx, sy, 5, 0, Math.PI * 2); cg.fill(); cg.stroke();
  }
}

// ---------- laço principal ----------
let ultimo = performance.now(), acum = 0;
function quadro(agora) {
  const dt = Math.min(0.1, (agora - ultimo) / 1000); ultimo = agora;
  const emPe = conferirDeitado();
  if (E.online) tickOnline();
  const parado = E.pausado || (emPe && !E.online) || E.fase === 'inicio' || E.fase === 'calibrando' || E.fase === 'sala';
  if (!parado) {
    acum += dt;
    while (acum >= PASSO) { atualizar(PASSO); acum -= PASSO; }
  } else {
    acum = 0;
    if (E.modo === 'sensor') atualizarVolante(dt);
    som.silenciarMotor();
  }
  girarCena(dt);
  desenhar(parado ? 0 : dt);
  bolinhas(parado ? 0 : dt);
  if (!$('hud').hidden) hud();
  if (!$('telaCalibra').hidden) $('calibPonteiro').style.transform = `rotate(${Math.max(-90, Math.min(90, giroAtual()))}deg)`;
  if (!$('telaAjustes').hidden) {
    const v = E.modo === 'sensor' ? volante.valor : teclaVol;
    $('previaPonteiro').style.transform = `rotate(${v * 90}deg)`;
    $('previaTxt').textContent = E.modo === 'sensor' ? `girou ${Math.round(volante.graus)}° → vira ${Math.round(Math.abs(v) * 100)}%` : 'teclado';
  }
  requestAnimationFrame(quadro);
}

window.__pnt = { E, volante, segs, COMPR, V_MAX, novaCorrida, irCalibrar, perigos, clima, pref, M, PERFIL: () => PERFIL };

prepararInicio();
carregarPerfil();
requestAnimationFrame(quadro);
