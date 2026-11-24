// Pé na Tábua — corrida contra o computador: uma pista, 3 voltas, perigos malucos, clima.
import { SEG, LARG, criarPista } from './pista.js';
import { tema as temaDe, PISTAS, nomePista } from './temas.js';
import { criarExtras, desenharCarro, carroImg, CARRO_W, CARRO_H, CORES_CARRO, corPorId } from './sprites.js';
import { volante, ligar, calibrar, atualizar as atualizarVolante, giroAtual, salvar as salvarVolante, restaurarPadrao } from './volante.js';
import * as som from './som.js';
import * as musica from './musica.js';
import { Clima, sortearClima, NOMES as NOMES_CLIMA } from './clima.js';
import { Perigos, TIPOS as TIPOS_PERIGO } from './perigos.js';
import { criarNpcs, atualizarNpcs, PILOTOS } from './npcs.js';
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

const EXTRAS = criarExtras();
const LARGADA = Math.floor(Z_JOG / SEG);
const clima = new Clima();
// pista atual (troca quando escolhe outra)
let segs = [], N = 1, COMPR = SEG, SPR = {}, TEMA = null, CORES_T = null, CORES_NEVE_T = null, perigos = null, pistaAtual = null;
let minimapa = null;
function carregarPista(id) {
  if (!PISTAS.includes(id)) id = 'praia';
  if (pistaAtual === id) return;
  TEMA = temaDe(id);
  segs = criarPista(id, TEMA); N = segs.length; COMPR = N * SEG; SPR = TEMA.sprites;
  CORES_T = TEMA.cores;
  CORES_NEVE_T = { ...CORES_T, calcadao: false, claro: { ...CORES_T.claro, chao: '#f4f8ff' }, escuro: { ...CORES_T.escuro, chao: '#e1e9f5' } };
  fundo = TEMA.fundo;
  perigos = new Perigos(segs, EXTRAS, TEMA);
  minimapa = new Minimapa($('minimapa'), segs);
  pistaAtual = id; gradCache = null;
  prepararNpcsTema();
}
// bonecos dos adversários de acordo com o tema (ex.: vampirinhos na floresta)
function lookVampiro(r) {
  const AV = boneco.av(); if (!AV) return null;
  if (r() < 0.35) return { ...AV.lookPadrao(), tipo: 'morcego', corRoupa: 'preto' };
  const um = a => a[Math.floor(r() * a.length)];
  return { ...AV.lookPadrao(), tipo: 'pessoa', pele: 'p1', cabelo: um(['curto', 'longo', 'topete', 'franja', 'lado', 'espetado']), corCabelo: r() < 0.75 ? 'preto' : 'castanho',
    roupa: r() < 0.7 ? 'heroi' : 'smoking', corRoupa: 'preto', olhos: 'normal', boca: 'dentuco', barba: 'nada', chapeu: 'nada', acessorio: 'nada' };
}
function lookLobisomem(r) {
  const AV = boneco.av(); if (!AV) return null;
  return { ...AV.lookPadrao(), tipo: 'pessoa', pele: r() < 0.5 ? 'p3' : 'p4', cabelo: r() < 0.5 ? 'blackpower' : 'cacheado', corCabelo: r() < 0.5 ? 'castanho' : 'preto',
    barba: 'cheia', roupa: 'camiseta', corRoupa: 'laranja', chapeu: 'gatinho', olhos: 'normal', boca: 'risada', acessorio: 'nada' };
}
function prepararNpcsTema() {
  if (!TEMA || TEMA._looks || !boneco.av() || TEMA.id !== 'vampiros') return;
  const r = Math.random;
  TEMA._looks = TEMA.timesNpc.map(t => (t === 'lobo' ? lookLobisomem(r) : lookVampiro(r)));
  Promise.all(TEMA._looks.map(l => boneco.cabecas(l))).then(c => { TEMA._cabecas = c; });
}
const looksNpc = () => (TEMA && TEMA._looks) || npcLooks;
const cabecasDoTema = () => (TEMA && TEMA._cabecas) || cabecasNpc;
const infoNomes = () => (TEMA && TEMA.nomesNpc ? TEMA.nomesNpc.map(nome => ({ nome })) : null);
let rand = Math.random;

let W = 384, H = 216, CW = 384, CH = 216, MX = 0, MY = 0, ESC_CSS = 1;
let fundo = null;

// ---------- preferências ----------
const pref = { cor: 'vermelho', nivelar: true, bolinhas: false, pista: 'praia', ajuda: true, time: 'lobo' };
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
  online: false, remotos: [], bots: [], ajuda: true, ar: null, loop: null, loopAng: 0, padAte: 0, vacuo: false, ajudaK: 0,
};
// os carros que aparecem na pista: adversários do computador (sozinho) ou os amigos (online)
const carros = () => (E.online ? E.remotos.concat(E.bots) : E.npcs);
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
  clima.preparar(CW, CH);
  gradCache = null;
  if (minimapa) minimapa.ajustar();
}
let gradCache = null;
carregarPista(pref.pista);
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
  const pisca = Math.floor(E.t * 10) % 2;
  for (let y = topo; y <= base; y++) {
    const t = (y1 - y) / (y1 - y2);
    const cx = a.x + (b.x - a.x) * t, w = a.w + (b.w - a.w) * t;
    const zeb = w / 6;
    g.fillStyle = c.chao; g.fillRect(-MX, y, CW, 1);
    if (cores.calcadao) {
      // calçadão de ondinhas pretas e brancas do lado esquerdo
      const ond = Math.floor(s.i / 2 + Math.sin((s.i + t) * 0.9) * 1.5) % 2;
      g.fillStyle = ond ? '#2a2a2a' : '#f4f4f4'; g.fillRect(Math.round(cx - w * 1.9), y, Math.round(w * 0.75), 1);
    }
    g.fillStyle = c.zebra; g.fillRect(Math.round(cx - w - zeb), y, Math.round(zeb), 1); g.fillRect(Math.round(cx + w), y, Math.round(zeb), 1);
    if (s.i === LARGADA) {
      const n = 10, lw = (2 * w) / n, linha = t < 0.5 ? 0 : 1;
      for (let k = 0; k < n; k++) { g.fillStyle = (k + linha) % 2 ? '#111' : '#fff'; g.fillRect(Math.round(cx - w + k * lw), y, Math.ceil(lw), 1); }
    } else {
      if (s.rampa) {
        // rampa listrada de amarelo e preto
        const n = 8, lw = (2 * w) / n;
        for (let k = 0; k < n; k++) { g.fillStyle = (k + (s.i % 2)) % 2 ? '#222' : '#ffd23f'; g.fillRect(Math.round(cx - w + k * lw), y, Math.ceil(lw), 1); }
      } else {
        g.fillStyle = s.loop ? '#3a6fd8' : c.estrada; g.fillRect(Math.round(cx - w), y, Math.round(2 * w), 1);
        if (c.faixa) { const fw = Math.max(1, w / 40); g.fillStyle = c.faixa; g.fillRect(Math.round(cx - fw / 2), y, Math.round(fw), 1); }
      }
      if (s.turbo != null) {
        // setas de turbo: "^" no chão
        const meio = cx + s.turbo * w, aw = w * 0.22 * t, ew = Math.max(1, w * 0.07);
        g.fillStyle = pisca ? '#ffd23f' : '#ff7a1a';
        g.fillRect(Math.round(meio - aw - ew / 2), y, Math.round(ew), 1); g.fillRect(Math.round(meio + aw - ew / 2), y, Math.round(ew), 1);
      }
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
  const cores = clima.neve ? CORES_NEVE_T : CORES_T;
  // tremida (batidas e velocidade alta)
  const tx = E.tremor > 0 ? Math.round((Math.random() - 0.5) * E.tremor * 6) : 0;
  const ty = E.tremor > 0 ? Math.round((Math.random() - 0.5) * E.tremor * 6) : (E.vel > V_MAX * 0.97 && Math.random() < 0.3 ? 1 : 0);
  g.setTransform(1, 0, 0, 1, MX + tx, MY + ty);
  g.fillStyle = cores.claro.chao; g.fillRect(-MX - 8, hz, CW + 16, H + MY - hz + 8);
  const ceu = ((clima.hora === 'dia' || TEMA.id === 'ia') && clima.tempo === 'limpo') ? [CORES_T.ceuTopo, CORES_T.ceuBaixo] : clima.ceu();
  const chave = ceu.join() + MY;
  if (!gradCache || gradCache.chave !== chave) {
    const gr = g.createLinearGradient(0, -MY, 0, hz);
    gr.addColorStop(0, ceu[0]); gr.addColorStop(1, ceu[1]);
    gradCache = { chave, gr };
  }
  g.fillStyle = gradCache.gr; g.fillRect(-MX - 8, -MY - 8, CW + 16, hz + MY + 8);
  if (clima.hora === 'dia' && clima.tempo === 'limpo') { g.fillStyle = '#fff6b0'; g.fillRect(W - 70, 18, 22, 22); g.fillStyle = '#ffffff'; g.fillRect(W - 66, 22, 14, 14); }
  if (clima.hora === 'tarde' && clima.tempo === 'limpo') { g.fillStyle = '#ff7a3a'; g.fillRect(W - 90, hz - 40, 30, 30); g.fillStyle = '#ffc070'; g.fillRect(W - 86, hz - 36, 22, 22); }
  if (TEMA.lua) luaCheia(hz);
  if (TEMA.fogos) fogosArtificio(hz);
  if (fundo.ceu && (clima.tempo !== 'chuva' || clima.intens < 0.5)) camadaFundo(fundo.ceu, E.ceu, 0);
  perigos.fundo(g, W, H, E.t);
  camadaFundo(fundo.longe, E.morros, hz - fundo.longe.height + 2);
  if (fundo.faixa) camadaFundo(fundo.faixa, E.morros * 0.5, hz - 4);

  const base = segEm(E.pos), basePct = (E.pos % SEG) / SEG;
  const jSeg = segEm(E.pos + Z_JOG), jPct = ((E.pos + Z_JOG) % SEG) / SEG;
  let jY = jSeg.p1.mundo.y + (jSeg.p2.mundo.y - jSeg.p1.mundo.y) * jPct;
  if (E.ar) jY = Math.max(jY, E.ar.y);     // voando: a câmera sobe junto com o carro
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

  if (TEMA.neblina) neblina(hz);   // neblina atrás dos objetos (eles aparecem por cima dela)
  // objetos que se mexem: adversários e perigos, agrupados por fatia
  const dinamicos = new Map();
  const juntar = o => { const i = ((o.i % N) + N) % N; if (!dinamicos.has(i)) dinamicos.set(i, []); dinamicos.get(i).push(o); };
  for (const o of perigos.objetos(E.t)) juntar(o);
  const lc = largCarro();
  if (TEMA.lobos && E.lobos) for (const l of E.lobos) {
    const z = l.dist + Z_JOG, p = ((z % COMPR) + COMPR) % COMPR;
    juntar({ i: Math.floor(p / SEG), pct: (p % SEG) / SEG, x: l.x, img: (l.maromba ? TEMA.lobisomem : TEMA.lobo)[Math.floor(l.fase * 8) % 2], mundo: l.maromba ? 0.26 : 0.24, alt: 0 });
  }
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
        const sx = s.p1.tela.x + esc * sp.offset * LARG * W / 2 + (sp.centro ? -dw / 2 : sp.offset < 0 ? -dw : 0);
        const sy = s.p1.tela.y - dh;
        if (sy >= s.limite || sx > W + MX || sx + dw < -MX) continue;
        g.save(); g.beginPath(); g.rect(-MX, -MY, CW, s.limite + MY); g.clip();
        g.drawImage(tipo.img, Math.round(sx), Math.round(sy), Math.round(dw), Math.round(dh));
        g.restore();
        if (tipo.img.luz) luzes.push([sx + tipo.img.luz.x * dw, sy + tipo.img.luz.y * dh, dw * 0.9, tipo.img.luz.cor || 'rgba(255,240,180,A)']);
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
        if (o.npc && TEMA.brilho && clima.tempo === 'limpo' && clima.hora !== 'noite') brilhar(sx + dw * 0.18, sy, dw * 0.3, dh * 0.4);
        if (o.npc && o.npc.posando > 0) { brilhar(sx, sy - dh * 0.2, dw, dh * 0.8); brilhar(sx, sy - dh * 0.2, dw, dh * 0.8); legenda('✨ posando ✨', sx + dw / 2, sy - dh * 0.25, dw); }
        if (o.npc) { const ly = sy + dh * 25.5 / 44; luzes.push([sx + dw * 9 / 56, ly, dw * 0.16, 'rgba(255,40,30,A)'], [sx + dw * 47 / 56, ly, dw * 0.16, 'rgba(255,40,30,A)']); }
        if (o.luz) luzes.push([sx + dw / 2, sy + dh / 2, dw * 0.7, o.luz]);
      }
    }
  }
  desenharJogador();
  for (const [lx, ly] of E.luzesCarro) luzes.push([lx, ly, 14, 'rgba(255,40,30,A)']);

  // hora do dia, luzes, chuva/neve
  clima.pintar(g, -MX - 8, -MY - 8, CW + 16, CH + 16);
  clima.estrelasELua(g, W, -MX, -MY, CW, hz - 40, !!TEMA.lua);
  if (TEMA.lua) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.75; luaCheia(hz, true); g.restore(); }
  if (TEMA.lanternasCeu) lanternasNoCeu(hz);
  clima.farois(g, W, H, H - CARRO_H * escalaCarro());
  clima.acender(g, luzes);
  clima.particulasDesenhar(g, -MX, -MY, CW, CH, dt);
  if (TEMA.cinzas) cinzas();
  linhasVelocidade();
}

// vampirinho no sol: a pele brilha (pontinhos piscando na cabeça)
function brilhar(x, y, w, h) {
  for (let k = 0; k < 4; k++) {
    if (Math.random() < 0.4) continue;
    const px = Math.round(x + Math.random() * w), py = Math.round(y + Math.random() * h), t = Math.max(1, Math.round(w / 14));
    g.fillStyle = k % 2 ? '#ffffff' : '#bff4ff';
    g.fillRect(px - t, py, t * 3, t); g.fillRect(px, py - t, t, t * 3);
  }
}
function legenda(txt, x, y, larg) {
  const t = Math.max(6, Math.min(11, Math.round(larg / 5)));
  g.font = `bold ${t}px sans-serif`; g.textAlign = 'center';
  g.fillStyle = '#000'; g.fillText(txt, Math.round(x) + 1, Math.round(y) + 1);
  g.fillStyle = '#ffe9ff'; g.fillText(txt, Math.round(x), Math.round(y));
}
// neblina perto do horizonte
let gradNeblina = null;
function neblina(hz) {
  if (!gradNeblina || gradNeblina.hz !== hz) { const gr = g.createLinearGradient(0, hz - 30, 0, hz + 40); gr.addColorStop(0, 'rgba(225,232,238,0)'); gr.addColorStop(0.45, 'rgba(225,232,238,.75)'); gr.addColorStop(1, 'rgba(225,232,238,0)'); gradNeblina = { hz, gr }; }
  g.fillStyle = gradNeblina.gr; g.fillRect(-MX, hz - 30, CW, 70);
}
// lua cheia enorme
function luaCheia(hz, soDisco) {
  const cx = W * 0.72, cy = hz * 0.42, r = hz * 0.3;
  if (soDisco) { g.fillStyle = '#c9b88a'; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill(); return; }
  const gr = g.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 2);
  gr.addColorStop(0, 'rgba(255,240,190,.35)'); gr.addColorStop(1, 'rgba(255,240,190,0)');
  g.fillStyle = gr; g.fillRect(cx - r * 2, cy - r * 2, r * 4, r * 4);
  g.fillStyle = '#fff3c8'; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ecdca8'; for (const [dx, dy, rr] of [[-0.3, -0.2, 0.18], [0.25, 0.1, 0.22], [-0.05, 0.4, 0.12], [0.35, -0.35, 0.1]]) { g.beginPath(); g.arc(cx + dx * r, cy + dy * r, rr * r, 0, Math.PI * 2); g.fill(); }
}
// lanternas de papel subindo no céu
function lanternasNoCeu(hz) {
  for (let i = 0; i < 18; i++) {
    const ciclo = (E.t * 0.04 + i * 0.137) % 1;
    const x = ((i * 113.7 + Math.sin(E.t * 0.5 + i) * 6) % (W + 2 * MX)) - MX, y = hz - ciclo * (hz + MY);
    g.fillStyle = '#ff9a3a'; g.fillRect(Math.round(x), Math.round(y), 3, 4); g.fillStyle = '#ffe9a0'; g.fillRect(Math.round(x) + 1, Math.round(y) + 1, 1, 2);
  }
}
// fogos de artifício no céu do festival
const fogos = [];
function fogosArtificio(hz) {
  if (Math.random() < 0.03 && fogos.length < 4) fogos.push({ x: Math.random() * W, y: 10 + Math.random() * (hz * 0.5), t: 0, cor: ['#ff5fa2', '#ffd23f', '#36b6ff', '#2fd47a', '#ff7a1a'][Math.floor(Math.random() * 5)] });
  for (let i = fogos.length - 1; i >= 0; i--) {
    const f = fogos[i]; f.t += 1 / 60;
    if (f.t > 1.2) { fogos.splice(i, 1); continue; }
    g.fillStyle = f.cor; g.globalAlpha = Math.max(0, 1 - f.t / 1.2);
    for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2, r = 4 + f.t * 26; g.fillRect(Math.round(f.x + Math.cos(a) * r), Math.round(f.y + Math.sin(a) * r + f.t * f.t * 8), 2, 2); }
    g.globalAlpha = 1;
  }
}
// cinzas caindo na cidade destruída
function cinzas() {
  g.fillStyle = 'rgba(200,190,190,.7)';
  for (let i = 0; i < 40; i++) {
    const x = ((i * 97 + E.t * (20 + i % 7 * 6)) % (CW)) - MX, y = ((i * 53 + E.t * (30 + i % 5 * 9)) % CH) - MY;
    g.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
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
  // rampa: no topo o carro voa (a pista despenca embaixo dele)
  const yChao = jSeg.p1.mundo.y + (jSeg.p2.mundo.y - jSeg.p1.mundo.y) * (((E.pos + Z_JOG) % SEG) / SEG);
  if (!E.ar && jSeg.salto && E.vel > V_MAX * 0.25) { E.ar = { y: yChao, vy: E.vel * 0.34 }; som.turboSom(); if (correndo) reclamar(null, ['Uhuuul!', 'Eu tô voando!', 'Segura peão!', 'Aperta o cinto!']); }
  if (E.ar) {
    E.ar.vy -= 9000 * dt; E.ar.y += E.ar.vy * dt;
    if (E.ar.vy < 0 && E.ar.y <= yChao) { E.ar = null; E.tremor = 0.8; som.batida(); }
  }
  const noAr = !!E.ar;
  // loop: a tela dá uma volta inteira enquanto o carro passa
  if (jSeg.loop && !E.loop && iJog - jSeg.loop.ini < 4 && E.vel > V_MAX * 0.35) E.loop = { t0: E.t, dur: (jSeg.loop.n * SEG) / E.vel };
  if (E.loop) {
    const f = (E.t - E.loop.t0) / E.loop.dur;
    if (f >= 1) { E.loop = null; E.loopAng = 0; } else E.loopAng = 360 * (0.5 - Math.cos(f * Math.PI) / 2);
  }
  if (E.girando > 0) { E.girando -= dt; E.x += (E.t < E.imuneAte ? E.fugir * 1.1 : -Math.sign(E.x) * 0.6) * dt; }
  else if (E.loop) E.x -= E.x * Math.min(1, dt * 3);
  else E.x += dx * dir * (noAr ? 0.5 : 1);
  if (!noAr && !E.loop) E.x -= dx * pct * jSeg.curva * CENTRIFUGA * clima.aderencia;
  // setas de turbo no chão
  if (!noAr && jSeg.turbo != null && Math.abs(E.x - jSeg.turbo) < 0.4) { if (E.t > E.padAte) som.turboSom(); E.padAte = E.t + 1.2; }
  const pad = E.t < E.padAte;
  // vácuo: colado atrás de outro carro, anda um pouco mais e enche o turbo mais rápido
  E.vacuo = false;
  if (!noAr && correndo) for (const n of carros()) { if (n.oculto) continue; const dz = n.dist - distJog(); if (dz > 300 && dz < 3000 && Math.abs(n.x - E.x) < 0.3) { E.vacuo = true; break; } }
  // ajuda pra quem ficou pra trás (deixa a corrida apertada)
  E.ajudaK = 0;
  if (E.ajuda && correndo && E.terminouEm == null) {
    let lider = distJog(); for (const n of carros()) if (!n.oculto && n.terminou == null) lider = Math.max(lider, n.dist);
    const gap = (lider - distJog()) / SEG;
    if (gap > 25) E.ajudaK = Math.min(1, (gap - 25) / 200);
  }

  // abertura da câmera: mais rápido = visão mais aberta (sensação de velocidade)
  const fov = FOV_BASE + 10 * Math.min(1.2, pct) + (turboAtivo ? 6 : 0);
  E.prof += (1 / Math.tan(fov / 2 * Math.PI / 180) - E.prof) * Math.min(1, dt * 3);

  const vmax = V_MAX * (turboAtivo ? TURBO_V : 1) * (pad ? 1.2 : 1) * (E.vacuo ? 1.06 : 1) * (1 + 0.08 * E.ajudaK);
  if (E.girando > 0) E.vel += AREIA_DESACEL * dt;
  else if (acel || turboAtivo || pad) E.vel += (turboAtivo || pad ? ACEL * 2 : ACEL) * dt;
  else if (!noAr) E.vel += SOLTO * dt;
  const fora = !noAr && (E.x < -1 || E.x > 1);
  if (fora && E.vel > AREIA_LIMITE) E.vel += AREIA_DESACEL * dt;
  if (E.vel > vmax) E.vel = Math.max(vmax, E.vel + SOLTO * dt * 2);
  E.vel = Math.max(0, E.vel);

  const lc = largCarro() * 0.9;
  // batidas nos objetos da beira
  if (fora && E.girando <= 0) {
    for (const sp of jSeg.sprites) {
      const tipo = SPR[sp.tipo];
      if (sp.centro || !tipo.bate) continue;
      const centro = sp.offset < 0 ? sp.offset - tipo.mundo / 2 : sp.offset + tipo.mundo / 2;
      if (sobrepoe(E.x, lc, centro, tipo.mundo * tipo.bate)) { rodar(0.25, 1); reclamar('batida'); break; }
    }
  }
  // perigos
  if (E.girando <= 0 && correndo && E.t > E.imuneAte && !noAr) {
    const h = perigos.bateu(iJog, E.x, lc, E.t);
    if (h) {
      // fica invencível por 2 segundos e é empurrado pro lado livre, pra conseguir sair
      E.imuneAte = E.t + 2; E.fugir = -h.lado;
      if (h.tipo === 'onda') { E.vel *= 0.45; E.x += h.lado * 0.5; E.tremor = 0.8; som.batida(); }
      else rodar(h.tipo === 'caminhao' ? 0.15 : 0.3, 1.2);
      reclamar(null, perigos.info(h.tipo).frases);
    }
  }
  if (fora && correndo) { if (!E.areiaDesde) E.areiaDesde = E.t; else if (E.t - E.areiaDesde > 1.2) reclamar('areia'); }
  else E.areiaDesde = 0;

  // adversários
  const dj = distJog();
  if (!E.online) atualizarNpcs(E.npcs, dt, { segs, SEG, COMPR, V_MAX, distJog: E.terminouEm != null ? -1e12 : dj, correndo: correndo || E.fase === 'fim', perigos, t: E.t, rand, VOLTAS, tempo: E.tempo });
  else {
    atualizarRemotos(dt);
    // o anfitrião é quem "pilota" os carros do computador e manda pra todo mundo
    if (M.host && E.npcs.length) {
      let lider = E.terminouEm != null ? -1e12 : dj;
      for (const r of E.remotos) if (!r.oculto && r.terminou == null) lider = Math.max(lider, r.dist);
      atualizarNpcs(E.npcs, dt, { segs, SEG, COMPR, V_MAX, distJog: lider, correndo: correndo || E.fase === 'fim', perigos, t: E.t, rand, VOLTAS, tempo: E.tempo });
    }
  }
  for (const n of carros()) {
    if (E.terminouEm != null || noAr) break;
    if (n.oculto || (E.online && n.terminou != null)) continue;
    const dz = n.dist - dj;
    if (Math.abs(dz) < 280 && Math.abs(n.x - E.x) < lc && E.t > (n.bateuEm || 0) + 0.6) {
      // batida "macia": os dois perdem um pouco e se afastam
      n.bateuEm = E.t;
      E.vel *= 0.85;
      const lado = Math.sign(E.x - n.x) || 1;
      E.x += lado * 0.18;
      if (!n.uid && n.alvoX !== undefined) { n.vel *= 0.85; n.x -= lado * 0.18; n.alvoX = n.x; }
      E.tremor = 0.5; som.batida(); reclamar('carro');
    }
  }
  atualizarLobos(dt, dj, correndo, noAr, lc);
  if (!E.online || M.host) atualizarGala(dt, dj, correndo);
  E.x = Math.max(-3, Math.min(3, E.x));

  // turbo: enche quando fica na pista sem bater
  if (correndo && !turboAtivo) {
    if (!fora && E.girando <= 0 && pct > 0.3) E.turbo = Math.min(1, E.turbo + dt / TURBO_ENCHE * (1 + (E.vacuo ? 1 : 0) + 2 * E.ajudaK));
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

// o vampiro galã às vezes para no meio da pista pra posar no sol (desvie dele!)
function atualizarGala(dt, dj, correndo) {
  if (!TEMA.rivalidade || !E.npcs.length || !correndo) return;
  const gala = E.npcs[0];
  if (gala.proxPose == null) gala.proxPose = 10 + Math.random() * 8;
  if (gala.posando > 0) {
    gala.posando -= dt;
    gala.vel = Math.max(0, gala.vel - V_MAX * 2.5 * dt);
    gala.dist -= gala.vel * dt * 0.5;
    gala.alvoX = 0; gala.x += (0 - gala.x) * Math.min(1, dt * 3);
    if (gala.posando <= 0) gala.proxPose = E.tempo + 14 + Math.random() * 10;
  } else if (E.tempo > gala.proxPose && gala.terminou == null) {
    const dz = (gala.dist - dj) / SEG;
    if (dz > 25 && dz < 140) gala.posando = 3.2;
  }
}
function atualizarLobos(dt, dj, correndo, noAr, lc) {
  if (!TEMA.lobos) return;
  E.lobos = E.lobos || [];
  if (correndo && E.tempo > E.proxLobos) {
    E.proxLobos = E.tempo + 7 + Math.random() * 6;
    const n = 3 + Math.floor(Math.random() * 3), base = dj + 90 * SEG;
    for (let k = 0; k < n; k++) {
      const fora = Math.random() < 0.45;
      E.lobos.push({ dist: base + k * 260 + Math.random() * 300, x: fora ? (Math.random() < 0.5 ? -1 : 1) * (1.4 + Math.random() * 2) : (Math.random() * 1.6 - 0.8),
        fase: Math.random() * 6, vel: V_MAX * (0.42 + Math.random() * 0.12), fora });
    }
    // de vez em quando vem junto o lobisomem marombeiro, sem camisa, no meio da pista
    if (TEMA.lobisomem && Math.random() < 0.6) E.lobos.push({ dist: base + 200, x: Math.random() * 1.2 - 0.6, fase: 0, vel: V_MAX * 0.5, fora: false, maromba: true });
    uivo();
  }
  for (const l of E.lobos) {
    l.dist += l.vel * dt; l.fase += dt;
    if (!l.fora) l.x += Math.sin(l.fase * 2.2) * dt * 0.6;
    if (l.pulou) l.x += l.pulou * dt * 2.5;
    // encostou num lobo: susto e perde velocidade (o lobo pula pro lado)
    if (!l.fora && !noAr && E.girando <= 0 && Math.abs(l.dist - dj) < 230 && Math.abs(l.x - E.x) < lc * 0.8) {
      E.vel *= 0.6; E.tremor = 0.7; som.batida(); l.fora = true; l.pulou = l.x > E.x ? 1 : -1;
      reclamar(null, l.maromba ? ['Bota uma camisa, rapaz!', 'Que tanquinho é esse?!', 'Vai malhar em outro lugar!', 'Isso é corrida, não academia!'] : ['Sai da frente, lobo!', 'Tem lobo na pista!', 'Auuuu!', 'Que bicho peludo!']);
    }
  }
  E.lobos = E.lobos.filter(l => l.dist > dj - 30 * SEG && l.dist < dj + 300 * SEG && Math.abs(l.x) < 6);
}
function uivo() {
  const ac = som.contexto(); if (!ac || !som.somLigado()) return;
  const o = ac.createOscillator(), g = ac.createGain(), v = ac.createOscillator(), vg = ac.createGain();
  const t = ac.currentTime;
  o.type = 'sine'; o.frequency.setValueAtTime(320, t); o.frequency.linearRampToValueAtTime(620, t + 0.5); o.frequency.linearRampToValueAtTime(480, t + 1.4);
  v.frequency.value = 6; vg.gain.value = 12; v.connect(vg); vg.connect(o.frequency);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12, t + 0.2); g.gain.linearRampToValueAtTime(0, t + 1.5);
  o.connect(g); g.connect(ac.destination); o.start(t); v.start(t); o.stop(t + 1.6); v.stop(t + 1.6);
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
  const extra = [E.ar ? '✈️ VOANDO!' : '', E.loop ? '🌀 LOOP!' : '', E.t < E.padAte ? '⚡ TURBO!' : '', E.vacuo ? '💨 VÁCUO' : '', E.ajudaK > 0.05 ? '🚀 AJUDA' : ''].filter(Boolean).join(' ');
  if ($('hudExtra').textContent !== extra) $('hudExtra').textContent = extra;
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
    const tp = perigos.info(p.h.tipo);
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
// clima combinando com a pista
function climaDaPista(c, r = Math.random) {
  c = { ...c };
  if (TEMA.noite) c.hora = 'noite';
  if (TEMA.id === 'ia') { c.hora = 'dia'; if (c.tempo === 'neve') c.tempo = 'limpo'; }
  if (TEMA.chuvaExtra && c.tempo === 'limpo' && r() < TEMA.chuvaExtra) c.tempo = 'chuva';
  if ((TEMA.id === 'rio' || TEMA.id === 'festival' || TEMA.id === 'lua') && c.tempo === 'neve' && r() < 0.7) c.tempo = 'limpo';
  if (TEMA.id === 'vampiros' && c.hora === 'noite' && r() < 0.6) c.hora = 'dia';
  return c;
}
function musicaDaPista(c, r = Math.random) {
  const lista = TEMA.musicas;
  if (r() < 0.8) return lista[Math.floor(r() * lista.length)];
  return Math.floor(r() * 8);
}
function zerarCorrida() {
  Object.assign(E, { ar: null, loop: null, loopAng: 0, padAte: 0, vacuo: false, ajudaK: 0 });
  Object.assign(E, { pos: 0, x: 0, vel: 0, volta: 1, tempo: 0, tempoVolta: 0, voltas: [], turbo: 0, turboAte: 0, girando: 0, rostoAte: 0, pausado: false, tremor: 0, terminouEm: null, t: 0, reclamouEm: -9, imuneAte: -9, fugir: 0, giroFiltro: 0, acel: false });
}
function novaCorrida() {
  clearInterval(contTimer);
  musica.parar();
  rand = params.get('semente') ? aleatorio(sementeDe(params.get('semente'))) : Math.random;
  zerarCorrida();
  carregarPista(pref.pista);
  perigos.aoCriar = null;
  E.online = false; E.remotos = []; E.bots = []; E.lobos = [];
  E.npcs = criarNpcs(pref.cor, rand, COMPR, SEG, cabecasDoTema(), infoNomes());
  E.lobos = []; E.proxLobos = 6;
  E.posicao = E.npcs.length + 1;
  perigos.reiniciar();
  // clima: sorteado (ou forçado pelo endereço, pra teste: ?clima=noite-chuva)
  carregarPista(pref.pista);
  E.ajuda = pref.ajuda;
  let c = climaDaPista(sortearClima(rand), rand);
  if (params.get('clima')) { const [h, t] = params.get('clima').split('-'); c = { hora: h || 'dia', tempo: t || 'limpo' }; }
  clima.definir(c, CW, CH);
  E.musica = params.get('musica') != null ? +params.get('musica') : musicaDaPista(c, rand);
  mostrar(null);
  $('hud').hidden = false; $('controles').hidden = !TOQUE && E.modo === 'teclado';
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
  const lista = [{ nome: PERFIL.tag || 'Você', tempo: E.tempo, eu: true, cor: pref.cor, look: PERFIL.look, time: TEMA.rivalidade ? pref.time : null }];
  E.npcs.forEach((n, k) => {
    const tempo = n.terminou != null ? n.terminou : E.tempo + Math.max(0, VOLTAS * COMPR - n.dist) / Math.max(n.vel, V_MAX * 0.6);
    lista.push({ nome: n.nome, tempo, cor: n.cor, look: looksNpc()[k], time: TEMA.timesNpc ? TEMA.timesNpc[k] : null });
  });
  lista.sort((a, b) => a.tempo - b.tempo);
  const minha = lista.findIndex(l => l.eu) + 1;
  const medalha = ['🥇', '🥈', '🥉'];
  $('fimTitulo').textContent = minha === 1 ? '🏆 Você venceu!' : `🏁 Você chegou em ${minha}º`;
  $('fimLista').innerHTML = lista.map((l, i) => `<li class="${l.eu ? 'eu' : ''}"><span>${medalha[i] || (i + 1) + 'º'}</span><i style="background:${corPorId(l.cor).c[0]}"></i><b>${l.nome}</b><em>${fmt(l.tempo)}</em></li>`).join('');
  podio(lista.slice(0, 3).map(l => ({ nome: l.nome, look: l.look })));
  placarTimes(lista);
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
  $('cfgAjuda').checked = pref.ajuda;
}
for (const [id, k, f] of CAMPOS) {
  $(id).oninput = () => { volante.cfg[k] = +$(id).value; $('v' + id.slice(3)).textContent = f(volante.cfg[k]); salvarVolante(); };
}
$('cfgInverter').onchange = () => { volante.cfg.inverter = $('cfgInverter').checked; salvarVolante(); };
$('cfgSom').onchange = () => { som.ligarSom($('cfgSom').checked); };
$('cfgMusica').onchange = () => { musica.ligarMusica($('cfgMusica').checked); };
$('cfgAjuda').onchange = () => { pref.ajuda = $('cfgAjuda').checked; salvarPref(); if (!E.online) E.ajuda = pref.ajuda; };
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
  const ang = -E.angCena + (E.loopAng || 0);
  tela.style.transform = Math.abs(ang) > 0.05 ? `rotate(${ang.toFixed(2)}deg)` : '';
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
    prepararNpcsTema();
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
// a tela de personalizar é a MESMA do portal e dos outros jogos (forma-palavras/js/boneco-editor.js):
// o boneco é um só, mudou aqui muda em todos. Se ela não carregar, usa o editor antigo daqui.
async function abrirEditor(depois) {
  let ed = null;
  try { ed = await import(new URL('../../forma-palavras/js/boneco-editor.js', import.meta.url).href); } catch {}
  if (ed) {
    const r = await ed.abrirEditorBoneco({ perfil: PERFIL, pedirNome: true, salvar: async ({ look, tag }) => {
      if (rede.conectado()) {
        if (tag !== PERFIL.tag && !(await rede.reservarTag(tag, PERFIL.tag))) return 'Esse nome já tem dono, escolha outro 🙂';
        await rede.salvarPerfil({ tag, look });
      }
      PERFIL.tag = tag; PERFIL.look = { ...look };
      try { localStorage.setItem('pnt-look', JSON.stringify(PERFIL.look)); } catch {}
      return null;
    } });
    if (!r) return;
    await atualizarCabeca(); desenharPiloto();
    if (M.code) rede.atualizarEu(M.code, publico()).catch(() => {});
    if (depois) depois();
    return;
  }
  abrirEditorAntigo(depois);
}
function abrirEditorAntigo(depois) {
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
const publico = () => ({ name: PERFIL.tag, look: PERFIL.look || null, lvl: boneco.nivelDe(PERFIL.xp), cor: pref.cor, time: pref.time });
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
  E.fase = 'inicio'; E.loopAng = 0; E.ar = null;
  carregarPista(pref.pista);
  $('hud').hidden = true; $('controles').hidden = true; $('contagem').hidden = true;
  montarCores(); desenharPiloto(); mostrar('telaInicio');
}
$('btnSairSala').onclick = irInicio;
$('btnComoJogar').onclick = () => mostrar('telaComo');
const nomeTime = t => (t === 'vampiro' ? '🧛 Time Vampiros' : '🐺 Time Lobos');
function mostrarPista() {
  $('pistaNome').textContent = nomePista(pref.pista);
  $('timeSel').hidden = pref.pista !== 'vampiros';
  $('btnTime').textContent = nomeTime(pref.time);
}
$('btnTime').onclick = () => { pref.time = pref.time === 'lobo' ? 'vampiro' : 'lobo'; salvarPref(); mostrarPista(); };
$('btnTimeSala').onclick = () => { pref.time = pref.time === 'lobo' ? 'vampiro' : 'lobo'; salvarPref(); if (M.code) rede.atualizarEu(M.code, { time: pref.time }); };
// placar da rivalidade: pontos por posição (1º ganha mais)
function placarTimes(lista) {
  const el = $('placarTimes');
  if (!TEMA.rivalidade) { el.hidden = true; return; }
  const pts = { vampiro: 0, lobo: 0 }, n = lista.length;
  lista.forEach((l, i) => { if (l.time) pts[l.time] += n - i; });
  const v = pts.vampiro, lb = pts.lobo;
  el.hidden = false;
  el.innerHTML = `🧛 Vampiros <b>${v}</b> × <b>${lb}</b> Lobos 🐺<br><small>${v === lb ? 'Empate! A floresta continua dividida.' : v > lb ? 'Os vampiros dominam a floresta! ✨' : 'Os lobos dominam a floresta! 🌕'}</small>`;
}
function trocarPista(d) { const i = PISTAS.indexOf(pref.pista); pref.pista = PISTAS[(i + d + PISTAS.length) % PISTAS.length]; salvarPref(); carregarPista(pref.pista); mostrarPista(); }
$('pistaAnt').onclick = () => trocarPista(-1);
$('pistaProx').onclick = () => trocarPista(1);
mostrarPista();
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
  const emojiTime = p => (M.meta && M.meta.pista === 'vampiros' ? (p.time === 'vampiro' ? ' 🧛' : ' 🐺') : '');
  $('salaJogadores').innerHTML = lista.map(([id, p]) => `<li>${p.look ? boneco.frenteSVG(p.look, 44) : '<span class="semB">🙂</span>'}<i style="background:${corPorId(p.cor).c[0]}"></i><b>${esc(p.name || '?')}${emojiTime(p)}</b>${M.meta && id === M.meta.host ? '<small>anfitrião</small>' : ''}${id === rede.meuId() ? '<small>você</small>' : ''}</li>`).join('') || '<li>Entrando…</li>';
  $('btnComecar').hidden = !M.host || (M.meta && M.meta.status !== 'lobby' && msg);
  const m = M.meta || {};
  $('salaPista').textContent = nomePista(m.pista || 'praia');
  $('salaBots').textContent = (m.bots ?? 3) === 0 ? 'nenhum' : (m.bots ?? 3);
  $('salaAjuda').textContent = m.ajuda === false ? 'desligada' : 'ligada';
  document.querySelectorAll('.soAnfitriao').forEach(b => { b.hidden = !M.host; });
  $('btnTimeSala').hidden = m.pista !== 'vampiros';
  $('btnTimeSala').textContent = 'Meu time: ' + nomeTime(pref.time);
  $('salaEspera').textContent = msg || (M.host
    ? (lista.length < 2 ? 'Mande o link pros amigos! (Dá pra começar sozinho pra testar.)' : 'Todo mundo dentro? Pode começar!')
    : 'Esperando o anfitrião começar a corrida…');
}
const mudarMeta = d => { if (M.host && M.code) rede.atualizarMeta(M.code, d).catch(() => {}); };
$('salaPistaAnt').onclick = () => { const i = PISTAS.indexOf(M.meta.pista || 'praia'); mudarMeta({ pista: PISTAS[(i - 1 + PISTAS.length) % PISTAS.length] }); };
$('salaPistaProx').onclick = () => { const i = PISTAS.indexOf(M.meta.pista || 'praia'); mudarMeta({ pista: PISTAS[(i + 1) % PISTAS.length] }); };
$('salaBotsMenos').onclick = () => mudarMeta({ bots: Math.max(0, (M.meta.bots ?? 3) - 1) });
$('salaBotsMais').onclick = () => mudarMeta({ bots: Math.min(5, (M.meta.bots ?? 3) + 1) });
$('salaAjudaBtn').onclick = () => mudarMeta({ ajuda: M.meta.ajuda === false });
$('btnComecar').onclick = async () => {
  if (!M.host || !M.code) return;
  $('btnComecar').disabled = true;
  try {
    await rede.limparCorrida(M.code);
    const pista = M.meta.pista || 'praia';
    carregarPista(pista);
    const c = climaDaPista(sortearClima(Math.random));
    const mus = musicaDaPista(c);
    // carros do computador: nomes, cores (diferentes das dos amigos) e bonecos
    const usadas = Object.values(M.players).filter(p => p.online).map(p => p.cor);
    const livres = CORES_CARRO.filter(k => !usadas.includes(k.id));
    const nomes = TEMA.nomesNpc || PILOTOS.map(p => p.nome);
    const botsInfo = Array.from({ length: M.meta.bots ?? 3 }, (_, j) => ({ nome: nomes[j], cor: (livres[j] || CORES_CARRO[j]).id, look: looksNpc()[j] || null, time: TEMA.timesNpc ? TEMA.timesNpc[j] : null }));
    await rede.atualizarMeta(M.code, { pista, botsInfo, ajuda: M.meta.ajuda !== false, status: 'contagem', rodada: ((M.meta && M.meta.rodada) || 0) + 1, inicio: rede.agora() + 6000, clima: c, musica: mus, semente: Math.random().toString(36).slice(2, 8) });
  } catch (e) { toast('Não deu pra começar: ' + (e.message || e), 3000); }
  finally { $('btnComecar').disabled = false; }
};
$('btnNovaRodada').onclick = () => { if (M.host) rede.atualizarMeta(M.code, { status: 'lobby' }); };

function iniciarOnline(meta) {
  clearInterval(contTimer); musica.parar();
  rand = aleatorio(sementeDe(meta.semente || 'x'));
  zerarCorrida();
  carregarPista(meta.pista || 'praia');
  E.online = true; E.npcs = []; E.bots = []; E.ajuda = meta.ajuda !== false; E.lobos = []; E.proxLobos = 6;
  M.perigosVistos = new Set(); M.calibrado = false; M.xpDado = false; M.enviadoEm = 0; M.botsEm = 0;
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
  // largada: os amigos na frente, lado a lado; os carros do computador atrás
  const ids = Object.keys(M.players).sort();
  const k = Math.max(0, ids.indexOf(rede.meuId()));
  const lugar = j => ({ x: j % 2 ? 0.5 : -0.5, d: 900 - Math.floor(j / 2) * 360 });
  E.x = lugar(k).x; E.pos = lugar(k).d;
  const info = meta.botsInfo || [];
  if (M.host) {
    E.npcs = criarNpcs(pref.cor, rand, COMPR, SEG, info.map((b, i) => cabecasDoTema()[i] || null), info);
    E.npcs.forEach((n, j) => { const L = lugar(ids.length + j); n.dist = L.d; n.x = n.alvoX = L.x; });
    E.bots = E.npcs;
  } else E.bots = info.map((b, j) => ({ uid: null, botId: 'b' + j, nome: b.nome, cor: b.cor, look: b.look, dist: lugar(ids.length + j).d, x: lugar(ids.length + j).x, virar: 0, oculto: true, terminou: null, imgs: null }));
  for (const b of E.bots) if (!b.imgs || !E.npcs.length) montarImgs(b, b.look);
  E.posicao = ids.length + E.bots.length;
  mostrar(null);
  $('hud').hidden = false; $('controles').hidden = !TOQUE && E.modo === 'teclado';
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
    if (M.host && E.npcs.length) {
      const ts = Math.round(rede.agora()), b = {};
      E.npcs.forEach((n, j) => { b['b' + j] = { d: Math.round(n.dist), x: +n.x.toFixed(3), v: Math.round(n.vel), vi: n.virar, ts, ...(n.terminou != null ? { fim: +n.terminou.toFixed(2) } : {}) }; });
      rede.enviarBots(M.code, b).catch(() => {});
    }
  }
}
function montarImgs(r, look) {
  const chave = r.cor + JSON.stringify(look || null);
  if (r.chave === chave) return;
  r.chave = chave;
  const cor = corPorId(r.cor).c;
  r.imgs = [-1, 0, 1].map(v => carroImg(cor, v));
  boneco.cabecas(look).then(cab => { if (cab && r.chave === chave) r.imgs = [-1, 0, 1].map(v => carroImg(cor, v, null, null, cab)); });
}
function montarRemotos() {
  const eu = rede.meuId();
  const lista = [];
  for (const [id, p] of Object.entries(M.players)) {
    if (id === eu) continue;
    let r = E.remotos.find(x => x.uid === id);
    if (!r) r = { uid: id, dist: 0, x: 0, virar: 0, imgs: null, oculto: true, terminou: null };
    r.nome = p.name; r.cor = p.cor || 'azul'; r.online = p.online; r.look = p.look;
    montarImgs(r, p.look);
    lista.push(r);
  }
  E.remotos = lista;
}
function atualizarRemotos(dt) {
  const est = M.corrida.estado || {}, res = M.corrida.resultado || {};
  if (!M.host) {
    const bs = M.corrida.bots || {};
    for (const r of E.bots) {
      const e = bs[r.botId];
      if (!e) { r.oculto = true; continue; }
      r.terminou = e.fim != null ? e.fim : null;
      const idade = Math.max(0, Math.min(0.5, (rede.agora() - e.ts) / 1000));
      const alvo = e.d + e.v * idade;
      if (r.oculto || Math.abs(alvo - r.dist) > 4000) r.dist = alvo; else r.dist += (alvo - r.dist) * Math.min(1, dt * 8);
      r.x += (e.x - r.x) * Math.min(1, dt * 10); r.virar = e.vi || 0; r.oculto = false;
    }
  }
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
  const lugar = Object.keys(M.corrida.resultado || {}).length + 1 + E.bots.filter(b => b.terminou != null && b.terminou < E.tempo).length;
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
  // carros do computador entram na classificação como "jogadores" de mentira
  const pl = { ...M.players };
  const info = (M.meta && M.meta.botsInfo) || [];
  E.bots.forEach((b, j) => { const id = 'bot' + j; pl[id] = { name: b.nome + ' 🤖', cor: b.cor, look: b.look, online: true, time: (info[j] || {}).time }; if (b.terminou != null) res[id] = { tempo: b.terminou, melhor: 999, nome: b.nome }; });
  const chegaram = Object.entries(res).sort((a, b) => a[1].tempo - b[1].tempo);
  const est = M.corrida.estado || {};
  const faltam = Object.entries(pl).filter(([id]) => !res[id] && (est[id] || id.startsWith('bot')));
  const med = ['🥇', '🥈', '🥉'];
  const minha = chegaram.findIndex(([id]) => id === eu) + 1;
  const quem = (id, r) => (pl[id] || {}).name || (r && r.nome) || '?';
  $('fimTitulo').textContent = minha === 1 ? '🏆 Você venceu!' : minha ? `🏁 Você chegou em ${minha}º` : '🏁 Fim!';
  podio(chegaram.slice(0, 3).map(([id, r]) => ({ nome: quem(id, r), look: (pl[id] || {}).look })));
  $('fimLista').innerHTML = chegaram.map(([id, r], i) => `<li class="${id === eu ? 'eu' : ''}"><span>${med[i] || (i + 1) + 'º'}</span><i style="background:${corPorId((pl[id] || {}).cor).c[0]}"></i><b>${esc(quem(id, r))}</b><em>${fmt(r.tempo)}</em></li>`).join('')
    + faltam.map(([id, p]) => `<li><span>…</span><i style="background:${corPorId(p.cor).c[0]}"></i><b>${esc(p.name || '?')}</b><em>${p.online ? 'correndo…' : 'saiu'}</em></li>`).join('');
  const rapida = chegaram.filter(([id]) => !id.startsWith('bot')).reduce((a, [id, r]) => (!a || r.melhor < a.r.melhor ? { id, r } : a), null);
  $('fimMelhor').textContent = rapida ? `${fmt(rapida.r.melhor)} (${quem(rapida.id, rapida.r)})` : '–';
  $('fimVoltas').textContent = 'Suas voltas: ' + E.voltas.map((v, i) => `${i + 1}ª ${fmt(v)}`).join(' · ');
  placarTimes(chegaram.map(([id]) => ({ time: (pl[id] || {}).time })).concat(faltam.map(([id]) => ({ time: (pl[id] || {}).time }))));
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

window.__pnt = { E, volante, V_MAX, novaCorrida, irCalibrar, clima, pref, M, PERFIL: () => PERFIL, carregarPista,
  get segs() { return segs; }, get COMPR() { return COMPR; }, get perigos() { return perigos; }, get N() { return N; } };

prepararInicio();
carregarPerfil();
requestAnimationFrame(quadro);

// cores dos menus (Céu, Areia ou Doce): a mesma escolha do portal
(async () => {
  let P = null;
  try { P = await import(new URL('../../forma-palavras/js/paleta.js', import.meta.url).href); } catch {}
  if (!P) { const r = document.querySelector('.rotCores'); if (r) r.hidden = true; return; }
  P.aplicarPaleta();
  P.montarSeletor($('seletorCores'));
})();
