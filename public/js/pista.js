// As pistas. Cada pista é uma lista de "segmentos" (fatias de estrada) com curva (pra que lado
// a estrada vira) e altura (morros). Também podem ter:
//   rampa  -> fatias listradas que sobem; no topo (salto) o carro voa
//   loop   -> a tela dá uma volta inteira enquanto o carro passa
//   turbo  -> setas no chão que dão um empurrão
// O tema (cores, objetos da beira, fundo, perigos, músicas) fica em temas.js.

export const SEG = 200;         // comprimento de cada fatia
export const LARG = 2000;       // meia largura da estrada
export const LISTRA = 3;        // fatias por listra (zebra e faixa)

const facilIn = (a, b, t) => a + (b - a) * Math.pow(t, 2);
const suave = (a, b, t) => a + (b - a) * ((-Math.cos(t * Math.PI) / 2) + 0.5);

export function aleatorio(semente) {
  let s = semente >>> 0;
  return () => { s += 0x6D2B79F5; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

// ---------- montador de pista ----------
function montador() {
  const segs = [];
  const ultimoY = () => (segs.length ? segs[segs.length - 1].p2.mundo.y : 0);
  const add = (curva, y) => {
    const n = segs.length;
    segs.push({
      i: n, curva, sprites: [],
      escuro: Math.floor(n / LISTRA) % 2 === 1,
      p1: { mundo: { y: ultimoY(), z: n * SEG }, cam: {}, tela: {} },
      p2: { mundo: { y, z: (n + 1) * SEG }, cam: {}, tela: {} },
    });
    return segs[n];
  };
  const T = {
    segs, ultimoY,
    trecho(entra, fica, sai, curva, altura = 0) {
      const y0 = ultimoY(), y1 = y0 + altura * SEG, total = entra + fica + sai;
      for (let n = 0; n < entra; n++) add(facilIn(0, curva, n / entra), suave(y0, y1, n / total));
      for (let n = 0; n < fica; n++) add(curva, suave(y0, y1, (entra + n) / total));
      for (let n = 0; n < sai; n++) add(suave(curva, 0, n / sai), suave(y0, y1, (entra + fica + n) / total));
      return T;
    },
    reta(n, altura = 0) { return T.trecho(0, n, 0, 0, altura); },
    curva(n, c, altura = 0) { return T.trecho(Math.round(n * 0.25), Math.round(n * 0.5), Math.round(n * 0.25), c, altura); },
    // rampa: sobe reta e listrada; depois do topo a pista despenca (o carro voa por cima)
    rampa() {
      T.reta(30);
      const y0 = ultimoY();
      for (let n = 0; n < 22; n++) { const s = add(0, y0 + 14 * SEG * Math.pow((n + 1) / 22, 1.6)); s.rampa = true; }
      segs[segs.length - 1].salto = true;
      const y1 = ultimoY();
      for (let n = 0; n < 10; n++) add(0, suave(y1, y0, (n + 1) / 10));
      T.reta(70);
      return T;
    },
    // loop: entra por um arco; enquanto passa, a tela dá uma volta
    loop() {
      T.reta(25);
      const ini = segs.length;
      for (let n = 0; n < 50; n++) { const s = add(0, ultimoY()); s.loop = { ini, n: 50 }; }
      segs[ini].sprites.push({ tipo: 'arco', offset: 0, centro: true });
      segs[ini + 49].sprites.push({ tipo: 'arco', offset: 0, centro: true });
      T.reta(25);
      return T;
    },
    // setas de turbo no chão (x = posição na pista, -1 a 1)
    turbo(x = 0, n = 6) {
      const ini = segs.length;
      T.reta(n + 4);
      for (let k = 0; k < n; k++) segs[ini + 2 + k].turbo = x;
      return T;
    },
    fechar() {
      T.trecho(40, 40, 40, 0, -ultimoY() / SEG);
      T.reta(60);
      return T;
    },
  };
  return T;
}

// ---------- traçados ----------
const LAYOUTS = {
  praia(T) {
    T.reta(70).trecho(25, 25, 25, 0, 20).trecho(40, 60, 40, 1.5, 0).trecho(25, 50, 25, 0, -20)
      .turbo(-0.4).trecho(30, 30, 30, -2.2, 20).trecho(30, 30, 30, 2.2, -10).rampa()
      .trecho(50, 100, 50, -1.5, 30).trecho(30, 40, 30, 0, -40);
    for (let k = 0; k < 4; k++) T.trecho(12, 12, 12, 0, 8).trecho(12, 12, 12, 0, -8);
    T.trecho(25, 50, 25, 3, 0).turbo(0.4).trecho(25, 50, 25, -3, 0).trecho(50, 50, 50, 1, 40)
      .trecho(25, 25, 25, -2.2, -20).trecho(25, 25, 25, 2.2, -20).loop().trecho(40, 80, 40, 2.2, 0)
      .trecho(30, 60, 30, -1, 0);
    for (let k = 0; k < 3; k++) T.trecho(20, 20, 20, k % 2 ? -1.5 : 1.5, 0);
    T.fechar();
  },
  rio(T) {
    T.reta(60).curva(120, 1.2).turbo(0).curva(100, -2, 10).trecho(20, 40, 20, 0, -10).rampa()
      .curva(140, 2.4).reta(40).curva(80, -3).turbo(-0.5).curva(80, 3, 20).trecho(40, 40, 40, 0, -20)
      .loop().curva(160, -1.5).curva(60, 2.2).curva(60, -2.2).turbo(0.5).reta(80, 30).rampa()
      .curva(120, 1.8, -30).curva(90, -2.6);
    T.fechar();
  },
  sp(T) {
    // avenidas retas com esquinas fechadas, viaduto (rampa) e túnel de loop
    T.reta(80).curva(60, 3).reta(100).turbo(-0.5).curva(60, -3).reta(60, 10).rampa().reta(80)
      .curva(60, 3).turbo(0.5).reta(90, -10).curva(70, -2.8).loop().reta(70).curva(60, 3).reta(50)
      .trecho(20, 30, 20, 0, 25).trecho(20, 30, 20, 0, -25).curva(70, -3).turbo(0).reta(100).rampa()
      .curva(60, 2.6).reta(60).curva(60, -2.6);
    T.fechar();
  },
  japao(T) {
    // estrada de montanha: subidas, curvas em S e uma rampa no alto
    T.reta(60).trecho(40, 40, 40, 1.2, 40).curva(80, -2.2, 20).curva(80, 2.2, 20).turbo(0).reta(40)
      .rampa().curva(120, -1.6, -30).curva(70, 2.8).curva(70, -2.8).trecho(30, 60, 30, 0, -40).loop()
      .curva(110, 2).turbo(-0.4).curva(90, -1.4, 30).trecho(20, 30, 20, 0, -20);
    for (let k = 0; k < 4; k++) T.curva(50, k % 2 ? -2.4 : 2.4);
    T.reta(60).rampa();
    T.fechar();
  },
  festival(T) {
    // muitas setas de turbo (no ritmo dos tambores) e dois loops
    T.reta(50).turbo(-0.5).turbo(0.5).curva(90, 1.8).turbo(0).curva(90, -1.8).loop().reta(40)
      .turbo(-0.5).turbo(0.5).curva(120, 2.4, 20).trecho(30, 30, 30, 0, -20).rampa().curva(80, -2.6)
      .turbo(0.3).turbo(-0.3).curva(100, 1.4).loop().curva(80, -2).turbo(0).reta(60).curva(80, 2.8)
      .curva(80, -1.2);
    T.fechar();
  },
  vampiros(T) {
    // estrada de floresta: curvas fechadas, subidas na neblina, ponte (rampa) sobre o rio
    T.reta(60).curva(80, 2, 20).curva(80, -2.4, 10).trecho(30, 40, 30, 0, -30).turbo(0).curva(100, 1.6)
      .rampa().curva(70, -2.8, 20).curva(70, 2.8, -20).reta(50).loop().curva(120, -1.8, 30)
      .trecho(20, 20, 20, 0, -15).trecho(20, 20, 20, 0, -15).turbo(-0.5).curva(90, 2.6).curva(60, -1.2).rampa()
      .curva(80, -2.2).curva(80, 2.2);
    T.fechar();
  },
  lua(T) {
    // margens de rio com pontes em arco (rampas) e lanternas
    T.reta(60).turbo(0).curva(100, -1.6).trecho(25, 25, 25, 0, 15).trecho(25, 25, 25, 0, -15).rampa()
      .curva(90, 2.4).curva(90, -2.4).turbo(0.5).turbo(-0.5).loop().curva(140, 1.4, 20).trecho(30, 40, 30, 0, -20)
      .rampa().curva(70, -3).reta(40).curva(70, 3).turbo(0).curva(120, -1.2).curva(60, 2);
    T.fechar();
  },
  ia(T) {
    // cidade destruída: zigue-zague, buracos (rampas) e um loop dentro da fábrica
    T.reta(60).curva(60, -2.6).curva(60, 2.6).rampa().curva(80, 1.6, -10).turbo(0).reta(60, 20)
      .curva(70, -3).curva(70, 3).loop().trecho(40, 40, 40, 0, -10).turbo(-0.5).curva(110, -2)
      .rampa().curva(90, 2.4).reta(50).trecho(15, 15, 15, 0, 10).trecho(15, 15, 15, 0, -10)
      .curva(70, -2.8).turbo(0.5).curva(140, 1.5).rampa().curva(60, -2);
    T.fechar();
  },
};

// enfeita a pista com os objetos do tema
function decorar(segs, tema, rand) {
  const N = segs.length;
  const livre = i => i > 12 && i < N - 4 && !segs[i].rampa && !segs[i].loop;
  const por = (i, tipo, offset, centro) => { if (livre(i)) segs[i].sprites.push({ tipo, offset, centro }); };
  for (const r of tema.beira) {
    for (let i = r.desde || 0; i < N; i += r.cada) {
      const lado = r.lado || (rand() < 0.5 ? -1 : 1);
      const tipo = Array.isArray(r.tipo) ? r.tipo[Math.floor(rand() * r.tipo.length)] : r.tipo;
      const d = r.min + rand() * ((r.max || r.min) - r.min);
      por(i, tipo, lado * d, false);
    }
  }
  if (tema.portal) for (let i = 120; i < N - 20; i += tema.portal.cada) if (livre(i) && Math.abs(segs[i].curva) < 0.5) segs[i].sprites.push({ tipo: tema.portal.tipo, offset: 0, centro: true });
  // placas: antes de curvas fortes e de rampas
  for (let i = 1; i < N; i++) {
    const c = segs[i].curva, antes = segs[i - 1].curva;
    const frente = segs[Math.min(i + 30, N - 1)].curva;
    if (Math.abs(c) > 0.05 && Math.abs(antes) <= 0.05 && Math.abs(frente) >= 1) {
      const dir = Math.sign(frente);
      for (const k of [-24, -14, -4, 6, 16]) {
        const j = i + k;
        if (j > 12 && livre(j)) { segs[j].sprites = segs[j].sprites.filter(s => s.centro || Math.abs(s.offset) > 2.2); por(j, dir > 0 ? 'setaDir' : 'setaEsq', dir > 0 ? -1.3 : 1.3); }
      }
    }
    if (segs[i].rampa && !segs[i - 1].rampa) for (const k of [-20, -10]) { const j = i + k; if (j > 12) { por(j, 'placaRampa', -1.3); por(j, 'placaRampa', 1.3); } }
  }
}

export function criarPista(id, tema) {
  const T = montador();
  (LAYOUTS[id] || LAYOUTS.praia)(T);
  const segs = T.segs;
  decorar(segs, tema, aleatorio(id.length * 977 + 2026));
  return segs;
}
