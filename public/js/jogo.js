// Pé na Tábua — protótipo do volante: uma pista, corrida sozinho de 3 voltas.
import { SEG, LARG, LISTRA, CORES_PRAIA, criarPistaPraia } from './pista.js';
import { criarSprites, criarFundo, desenharCarro, CARRO_W, CARRO_H } from './sprites.js';
import { volante, ligar, calibrar, atualizar as atualizarVolante, giroAtual, salvar as salvarVolante, restaurarPadrao } from './volante.js';
import * as som from './som.js';

const $ = id => document.getElementById(id);
const tela = $('tela');
const g = tela.getContext('2d');

// ---------- constantes ----------
const PASSO = 1 / 60;
const VOLTAS = 3;
const ALT_CAM = 1000;
const FOV = 100;
const PROF_CAM = 1 / Math.tan((FOV / 2) * Math.PI / 180);
const Z_JOG = ALT_CAM * PROF_CAM;          // distância da câmera até o carro
const DISTANCIA = 260;                     // quantas fatias desenhar
const V_MAX = SEG / PASSO;                 // velocidade máxima
const ACEL = V_MAX / 5;
const SOLTO = -V_MAX / 5;                  // soltou o acelerador
const AREIA_DESACEL = -V_MAX / 1.6;
const AREIA_LIMITE = V_MAX * 0.35;
const CENTRIFUGA = 0.25;
const TURBO_V = 1.3, TURBO_ENCHE = 14;     // 14 s sem bater e sem sair pra encher tudo
const KMH = 240;                           // velocidade máxima mostrada

const cores = CORES_PRAIA;
const segs = criarPistaPraia();
const COMPR = segs.length * SEG;
const SPR = criarSprites();
const LARGADA = Math.floor(Z_JOG / SEG);

let W = 384, H = 216, fundo = null, gradCeu = null;

// ---------- estado ----------
const E = {
  modo: null,          // 'sensor' | 'teclado'
  fase: 'inicio',      // inicio, calibrando, contagem, correndo, fim
  pausado: false,
  pos: 0, x: 0, vel: 0,
  volta: 1, tempo: 0, tempoVolta: 0, voltas: [],
  turbo: 0, turboAte: 0, girando: 0,
  acel: false, botaoTurbo: false,
  ceu: 0, morros: 0,
  t: 0, areiaDesde: 0,
  rostoAte: 0, reclamouEm: -9, cabeca: { x: 0, y: 0 },
  virar: 0, roda: 0,
};

// ---------- tamanho da tela (pixels "grandes" estilo Super Nintendo) ----------
function redimensionar() {
  const asp = innerWidth / innerHeight;
  H = 216;
  W = Math.max(216, Math.min(520, Math.round(H * asp)));
  tela.width = W; tela.height = H;
  g.imageSmoothingEnabled = false;
  fundo = criarFundo(Math.round(H / 2));
  gradCeu = g.createLinearGradient(0, 0, 0, H / 2);
  gradCeu.addColorStop(0, cores.ceuTopo); gradCeu.addColorStop(1, cores.ceuBaixo);
}
addEventListener('resize', redimensionar);
redimensionar();

// ---------- projeção ----------
function projetar(p, camX, camY, camZ) {
  p.cam.x = -camX;
  p.cam.y = p.mundo.y - camY;
  p.cam.z = p.mundo.z - camZ;
  p.tela.escala = PROF_CAM / p.cam.z;
  p.tela.x = W / 2 + p.tela.escala * p.cam.x * W / 2;
  p.tela.y = H / 2 - p.tela.escala * p.cam.y * H / 2;
  p.tela.w = p.tela.escala * LARG * W / 2;
}
const segEm = z => segs[Math.floor(z / SEG) % segs.length];

// estrada desenhada linha por linha (fica nítida, igual aos jogos antigos)
function desenharFatia(s, limite) {
  const a = s.p1.tela, b = s.p2.tela;
  const y1 = a.y, y2 = b.y;
  const topo = Math.max(0, Math.ceil(y2)), base = Math.min(H - 1, Math.floor(Math.min(y1, limite)));
  if (base < topo) return;
  const c = s.escuro ? cores.escuro : cores.claro;
  for (let y = topo; y <= base; y++) {
    const t = (y1 - y) / (y1 - y2);
    const cx = a.x + (b.x - a.x) * t, w = a.w + (b.w - a.w) * t;
    const zeb = w / 6;
    g.fillStyle = c.chao; g.fillRect(0, y, W, 1);
    g.fillStyle = c.zebra; g.fillRect(Math.round(cx - w - zeb), y, Math.round(zeb), 1); g.fillRect(Math.round(cx + w), y, Math.round(zeb), 1);
    if (s.i === LARGADA) {
      const n = 10, lw = (2 * w) / n, linha = t < 0.5 ? 0 : 1;
      for (let k = 0; k < n; k++) { g.fillStyle = (k + linha) % 2 ? '#111' : '#fff'; g.fillRect(Math.round(cx - w + k * lw), y, Math.ceil(lw), 1); }
    } else {
      g.fillStyle = c.estrada; g.fillRect(Math.round(cx - w), y, Math.round(2 * w), 1);
      if (c.faixa) { const fw = Math.max(1, w / 40); g.fillStyle = c.faixa; g.fillRect(Math.round(cx - fw / 2), y, Math.round(fw), 1); }
    }
  }
}

function camadaFundo(img, desloc, y) {
  const w = img.width, x0 = -(((desloc % 1) + 1) % 1) * w;
  for (let x = x0; x < W; x += w) g.drawImage(img, Math.round(x), y);
}

function desenhar() {
  const hz = Math.round(H / 2);
  g.fillStyle = cores.claro.chao; g.fillRect(0, hz, W, H - hz);
  g.fillStyle = gradCeu; g.fillRect(0, 0, W, hz);
  // sol
  g.fillStyle = '#fff6b0'; g.fillRect(W - 70, 18, 22, 22); g.fillStyle = '#ffffff'; g.fillRect(W - 66, 22, 14, 14);
  camadaFundo(fundo.nuvens, E.ceu, 0);
  camadaFundo(fundo.morros, E.morros, hz - fundo.morros.height + 2);
  camadaFundo(fundo.mar, E.morros * 0.5, hz - 4);

  const base = segEm(E.pos), basePct = (E.pos % SEG) / SEG;
  const jSeg = segEm(E.pos + Z_JOG), jPct = ((E.pos + Z_JOG) % SEG) / SEG;
  const jY = jSeg.p1.mundo.y + (jSeg.p2.mundo.y - jSeg.p1.mundo.y) * jPct;
  let limite = H, x = 0, dx = -(base.curva * basePct);
  const vistos = [];
  for (let n = 0; n < DISTANCIA; n++) {
    const s = segs[(base.i + n) % segs.length];
    const volta = s.i < base.i ? COMPR : 0;
    s.limite = limite;
    projetar(s.p1, E.x * LARG - x, jY + ALT_CAM, E.pos - volta);
    projetar(s.p2, E.x * LARG - x - dx, jY + ALT_CAM, E.pos - volta);
    x += dx; dx += s.curva;
    vistos.push(s);
    if (s.p1.cam.z <= PROF_CAM || s.p2.tela.y >= s.p1.tela.y || s.p2.tela.y >= limite) continue;
    desenharFatia(s, limite);
    limite = Math.min(limite, s.p2.tela.y);
  }
  // objetos, do mais longe pro mais perto
  for (let n = vistos.length - 1; n > 0; n--) {
    const s = vistos[n];
    if (s.p1.cam.z <= PROF_CAM || !s.sprites.length) continue;
    const esc = s.p1.tela.escala;
    for (const sp of s.sprites) {
      const tipo = SPR[sp.tipo];
      const dw = tipo.mundo * LARG * esc * W / 2;
      if (dw < 1) continue;
      const dh = dw * tipo.img.height / tipo.img.width;
      const sx = s.p1.tela.x + esc * sp.offset * LARG * W / 2 + (sp.offset < 0 ? -dw : 0);
      const sy = s.p1.tela.y - dh;
      if (sy >= s.limite || sx > W || sx + dw < 0) continue;
      g.save(); g.beginPath(); g.rect(0, 0, W, s.limite); g.clip();
      g.drawImage(tipo.img, Math.round(sx), Math.round(sy), Math.round(dw), Math.round(dh));
      g.restore();
    }
  }
  desenharJogador();
}

function desenharJogador() {
  const s = Math.max(1, Math.round((W * 0.27) / CARRO_W));
  const largura = CARRO_W * s;
  let ox = Math.round(W / 2 - largura / 2), oy = H - CARRO_H * s - 2;
  const fora = Math.abs(E.x) > 1;
  if (fora && E.vel > 0) oy += Math.round(Math.random() * 2) - 1;          // sacode na areia
  else if (E.vel > V_MAX * 0.5 && Math.random() < 0.15) oy -= 1;
  g.save();
  if (E.girando > 0) {
    // rodando: espelha de um lado pro outro (efeito de giro)
    const fase = Math.cos(E.girando * 22);
    g.translate(W / 2, 0); g.scale(Math.abs(fase) < 0.25 ? 0.25 * Math.sign(fase || 1) : fase, 1); g.translate(-W / 2, 0);
  }
  E.cabeca = desenharCarro(g, ox, oy, s, {
    virar: E.virar, roda: E.roda | 0, freando: !E.acel && E.vel > 10,
    chama: E.t < E.turboAte ? Math.floor(E.t * 20) : 0,
    rosto: E.t < E.rostoAte,
  });
  g.restore();
}

// ---------- reclamações do piloto ----------
const FRASES = {
  batida: ['Ai, minha nuca!', 'Olha a placa!', 'Quem te deu carta?', 'Tá maluco?!', 'Eu vi minha vida passar!'],
  areia: ['Isso é areia, não pista!', 'Volta pro asfalto!', 'Tá achando que é praia?', 'Sujou meu carro!'],
};
function reclamar(tipo) {
  if (E.t - E.reclamouEm < 2.5) return;
  const l = FRASES[tipo];
  E.reclamouEm = E.t; E.rostoAte = E.t + 1.8;
  $('balao').textContent = l[Math.floor(Math.random() * l.length)];
  $('balao').hidden = false;
}
function posicionarBalao() {
  if (E.t >= E.rostoAte) { $('balao').hidden = true; return; }
  const k = innerWidth / W;
  $('balao').style.left = (E.cabeca.x * k) + 'px';
  $('balao').style.top = (E.cabeca.y * k - 8) + 'px';
}

// ---------- física ----------
function sobrepoe(a, aw, b, bw) { return Math.abs(a - b) * 2 < aw + bw; }

let teclaVol = 0;
const teclas = {};
function atualizar(dt) {
  E.t += dt;
  // direção
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

  const jSeg = segEm(E.pos + Z_JOG);
  const pct = E.vel / V_MAX;
  const dx = dt * 2 * pct;
  if (E.girando > 0) {
    E.girando -= dt;
    E.x -= Math.sign(E.x) * dt * 0.6;     // empurra de volta pra pista
  } else {
    E.x += dx * dir;
  }
  E.x -= dx * pct * jSeg.curva * CENTRIFUGA;

  // velocidade
  const vmax = turboAtivo ? V_MAX * TURBO_V : V_MAX;
  if (E.girando > 0) E.vel += AREIA_DESACEL * dt;
  else if (acel || turboAtivo) E.vel += (turboAtivo ? ACEL * 2 : ACEL) * dt;
  else E.vel += SOLTO * dt;
  const fora = E.x < -1 || E.x > 1;
  if (fora && E.vel > AREIA_LIMITE) E.vel += AREIA_DESACEL * dt;
  E.vel = Math.max(0, Math.min(E.vel, vmax));
  if (!turboAtivo && E.vel > V_MAX) E.vel += SOLTO * dt * 2;

  // batidas nos objetos da beira
  const largCarro = (CARRO_W * Math.max(1, Math.round((W * 0.27) / CARRO_W))) / W * 0.9;
  if (fora && E.girando <= 0) {
    for (const sp of jSeg.sprites) {
      const tipo = SPR[sp.tipo];
      const centro = sp.offset < 0 ? sp.offset - tipo.mundo / 2 : sp.offset + tipo.mundo / 2;
      if (sobrepoe(E.x, largCarro, centro, tipo.mundo * tipo.bate)) {
        E.vel *= 0.25; E.girando = 0.9; E.turbo = 0; E.turboAte = 0;
        som.batida(); reclamar('batida');
        if (navigator.vibrate) try { navigator.vibrate(120); } catch {}
        break;
      }
    }
  }
  // areia por muito tempo
  if (fora && correndo) { if (!E.areiaDesde) E.areiaDesde = E.t; else if (E.t - E.areiaDesde > 1.2) reclamar('areia'); }
  else E.areiaDesde = 0;

  E.x = Math.max(-3, Math.min(3, E.x));

  // turbo: enche quando fica na pista sem bater
  if (correndo && !turboAtivo) {
    if (!fora && E.girando <= 0 && pct > 0.3) E.turbo = Math.min(1, E.turbo + dt / TURBO_ENCHE);
    else if (fora) E.turbo = Math.max(0, E.turbo - dt / 10);
  }
  if (E.botaoTurbo || teclas.Space || teclas.KeyX) usarTurbo();

  // andar
  const antes = E.pos;
  E.pos += E.vel * dt;
  if (E.pos >= COMPR) E.pos -= COMPR;
  if (correndo) {
    E.tempo += dt; E.tempoVolta += dt;
    if (E.pos < antes) completouVolta();
  }
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
}

// ---------- HUD ----------
const fmt = s => { const m = Math.floor(s / 60), r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(1); };
function hud() {
  $('hudVolta').textContent = Math.min(E.volta, VOLTAS) + '/' + VOLTAS;
  $('hudTempo').textContent = fmt(E.tempo);
  $('hudMelhor').textContent = E.voltas.length ? fmt(Math.min(...E.voltas)) : '–';
  $('hudVel').textContent = Math.round(E.vel / V_MAX * KMH);
  $('barraTurboCheia').style.width = (E.t < E.turboAte ? 100 : E.turbo * 100) + '%';
  $('btnTurbo').classList.toggle('pronto', E.turbo >= 0.2 && E.t >= E.turboAte);
  const giro = E.modo === 'sensor' ? volante.valor : teclaVol;
  $('ponteiro').style.transform = `rotate(${giro * 90}deg)`;
  posicionarBalao();
}

let toastTimer = 0;
function toast(t, ms = 1400) {
  $('toast').textContent = t; $('toast').hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, ms);
}

// ---------- telas e fluxo ----------
const telas = ['telaInicio', 'telaAviso', 'telaGire', 'telaCalibra', 'telaAjustes', 'telaFim'];
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

function prepararInicio() {
  if (!TOQUE) {
    $('txtInicio').textContent = 'No computador não tem sensor de movimento: dá pra jogar pelo teclado.';
    $('btnTeclado').hidden = false; $('dicaTeclado').hidden = false;
    $('btnLigar').textContent = 'Ligar volante (celular)';
    $('btnLigar').classList.replace('grande', 'sec');
  }
  mostrar('telaInicio');
  if (EMBUTIDO) avisoEmbutido();
}

function telaCheia() {
  // Android: tela cheia e trava na horizontal. iPhone ignora (lá o jeito é "Adicionar à Tela de Início").
  try {
    const el = document.documentElement;
    const p = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : null;
    if (p && p.then) p.then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {});
  } catch {}
  try { navigator.wakeLock && navigator.wakeLock.request('screen').catch(() => {}); } catch {}
}

$('btnLigar').onclick = () => {
  const pedido = ligar();          // primeiro de tudo (o iPhone exige que seja direto do toque)
  som.iniciarSom();
  if (TOQUE) telaCheia();
  pedido.then(r => {
    if (r === 'ok') { E.modo = 'sensor'; irCalibrar(); }
    else if (r === 'negado') aviso('Volante bloqueado', IOS
      ? 'O iPhone não deixou o jogo usar o sensor de movimento. Para liberar: <b>feche esta aba</b> do Safari, abra o link de novo e toque em <b>Permitir</b>. Se não aparecer a pergunta: Ajustes › Apps › Safari › Avançado › Dados dos Sites, apague <b>justletmein2.github.io</b> e tente de novo.'
      : 'O navegador não deixou usar o sensor de movimento. Toque no cadeado ao lado do endereço › Permissões › libere <b>Sensores de movimento</b>, e recarregue a página.',
      { tentar: () => mostrar('telaInicio') });
    else aviso('Sem sensor', 'Não chegou nenhum dado do sensor de movimento. Se estiver dentro de outro app (WhatsApp, Instagram), abra no Chrome ou Safari. Se for computador, use o teclado.',
      { copiar: true, tentar: () => mostrar('telaInicio') });
  });
};
$('btnTeclado').onclick = () => { som.iniciarSom(); E.modo = 'teclado'; novaCorrida(); };

let calibrarDepois = 'corrida';
function irCalibrar(depois = 'corrida') {
  calibrarDepois = depois;
  if (depois === 'corrida') E.fase = 'calibrando';
  calibrar();                      // referência provisória, só pro ponteiro mexer
  mostrar('telaCalibra');
}
$('btnPronto').onclick = () => {
  calibrar();
  if (calibrarDepois === 'ajustes') { mostrar('telaAjustes'); return; }
  mostrar(null);
  if (E.pausado) { E.pausado = false; return; }
  novaCorrida();
};

function novaCorrida() {
  Object.assign(E, { pos: 0, x: 0, vel: 0, volta: 1, tempo: 0, tempoVolta: 0, voltas: [], turbo: 0, turboAte: 0, girando: 0, rostoAte: 0, pausado: false });
  mostrar(null);
  $('hud').hidden = false; $('controles').hidden = !TOQUE && E.modo === 'teclado';
  E.fase = 'contagem';
  let n = 3;
  $('contagem').hidden = false; $('contagem').textContent = n; som.bip(440);
  const tick = setInterval(() => {
    n--;
    if (n > 0) { $('contagem').textContent = n; som.bip(440); }
    else {
      clearInterval(tick);
      $('contagem').textContent = 'VAI!'; som.bip(880, 0.35);
      E.fase = 'correndo';
      setTimeout(() => { $('contagem').hidden = true; }, 700);
    }
  }, 800);
}

function terminar() {
  E.fase = 'fim';
  E.acel = false;
  $('fimTempo').textContent = fmt(E.tempo);
  $('fimMelhor').textContent = fmt(Math.min(...E.voltas));
  $('fimVoltas').textContent = E.voltas.map((v, i) => `Volta ${i + 1}: ${fmt(v)}`).join(' · ');
  setTimeout(() => mostrar('telaFim'), 900);
}
$('btnDeNovo').onclick = () => novaCorrida();
$('btnFimAjustes').onclick = () => abrirAjustes();

// ---------- ajustes ----------
const CAMPOS = [['cfgAngulo', 'angulo', v => v + '°'], ['cfgMorta', 'morta', v => v + '°'], ['cfgSuave', 'suave', v => Math.round(v * 100) + '%'], ['cfgCentro', 'centro', v => (+v).toFixed(1)]];
function preencherAjustes() {
  for (const [id, k, f] of CAMPOS) { $(id).value = volante.cfg[k]; $('v' + id.slice(3)).textContent = f(volante.cfg[k]); }
  $('cfgInverter').checked = volante.cfg.inverter;
  $('cfgSom').checked = som.somLigado();
}
for (const [id, k, f] of CAMPOS) {
  $(id).oninput = () => { volante.cfg[k] = +$(id).value; $('v' + id.slice(3)).textContent = f(volante.cfg[k]); salvarVolante(); };
}
$('cfgInverter').onchange = () => { volante.cfg.inverter = $('cfgInverter').checked; salvarVolante(); };
$('cfgSom').onchange = () => { som.ligarSom($('cfgSom').checked); };
$('btnPadrao').onclick = () => { restaurarPadrao(); preencherAjustes(); toast('Ajustes de fábrica'); };
$('btnCopiarAjustes').onclick = async () => {
  const txt = 'Ajustes do volante Pé na Tábua: ' + JSON.stringify(volante.cfg);
  try { await navigator.clipboard.writeText(txt); toast('Copiado! Cole na conversa com o Claude'); }
  catch { toast(txt, 6000); }
};
$('btnRecalibrar').onclick = () => { if (E.modo === 'sensor') irCalibrar('ajustes'); else toast('No teclado não precisa calibrar'); };
$('btnReiniciar').onclick = () => novaCorrida();
$('btnContinuar').onclick = () => {
  if (E.fase === 'fim') { mostrar('telaFim'); return; }
  mostrar(null); E.pausado = false;
};
function abrirAjustes() {
  if (E.fase === 'inicio') return;
  E.pausado = E.fase === 'correndo' || E.fase === 'contagem';
  E.acel = false;
  preencherAjustes();
  mostrar('telaAjustes');
}
$('btnPausa').onclick = abrirAjustes;

// ---------- botões de toque (vários dedos ao mesmo tempo) ----------
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
document.addEventListener('visibilitychange', () => { if (document.hidden) { som.silenciarMotor(); if (E.fase === 'correndo') abrirAjustes(); } });

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

// ---------- laço principal ----------
let ultimo = performance.now(), acum = 0;
function quadro(agora) {
  const dt = Math.min(0.1, (agora - ultimo) / 1000); ultimo = agora;
  const emPe = conferirDeitado();
  const parado = E.pausado || emPe || E.fase === 'inicio' || E.fase === 'calibrando';
  if (!parado) {
    acum += dt;
    while (acum >= PASSO) { atualizar(PASSO); acum -= PASSO; }
  } else {
    acum = 0;
    if (E.modo === 'sensor') atualizarVolante(dt);
    som.silenciarMotor();
  }
  desenhar();
  if (!$('hud').hidden) hud();
  // ponteiros das telas de calibração e de ajustes
  if (!$('telaCalibra').hidden) $('calibPonteiro').style.transform = `rotate(${Math.max(-90, Math.min(90, giroAtual()))}deg)`;
  if (!$('telaAjustes').hidden) {
    const v = E.modo === 'sensor' ? volante.valor : teclaVol;
    $('previaPonteiro').style.transform = `rotate(${v * 90}deg)`;
    $('previaTxt').textContent = E.modo === 'sensor' ? `girou ${Math.round(volante.graus)}° → vira ${Math.round(Math.abs(v) * 100)}%` : 'teclado';
  }
  requestAnimationFrame(quadro);
}

// usado nos testes automáticos
window.__pnt = { E, volante, segs, COMPR, V_MAX, novaCorrida, irCalibrar };

prepararInicio();
requestAnimationFrame(quadro);
