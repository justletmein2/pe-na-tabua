// A pista é uma lista de "segmentos" (fatias de estrada). Cada um tem curva (pra que lado a
// estrada vai virando) e altura (morros). O desenho pseudo-3D projeta essas fatias na tela.

export const SEG = 200;         // comprimento de cada fatia
export const LARG = 2000;       // meia largura da estrada
export const LISTRA = 3;        // fatias por listra (zebra e faixa)

export const CORES_PRAIA = {
  ceuTopo: '#2f8fe8', ceuBaixo: '#bfe9ff',
  claro: { estrada: '#70747e', chao: '#f2d391', zebra: '#ffffff', faixa: '#ffffff' },
  escuro: { estrada: '#686c76', chao: '#e9c77f', zebra: '#d8312f', faixa: null },
};

const facilIn = (a, b, t) => a + (b - a) * Math.pow(t, 2);
const suave = (a, b, t) => a + (b - a) * ((-Math.cos(t * Math.PI) / 2) + 0.5);

function aleatorio(semente) {
  let s = semente >>> 0;
  return () => { s += 0x6D2B79F5; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

export function criarPistaPraia() {
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
  };
  // entra (vai apertando a curva), fica, sai (vai soltando). altura em "fatias".
  const trecho = (entra, fica, sai, curva, altura = 0) => {
    const y0 = ultimoY(), y1 = y0 + altura * SEG, total = entra + fica + sai;
    for (let n = 0; n < entra; n++) add(facilIn(0, curva, n / entra), suave(y0, y1, n / total));
    for (let n = 0; n < fica; n++) add(curva, suave(y0, y1, (entra + n) / total));
    for (let n = 0; n < sai; n++) add(suave(curva, 0, n / sai), suave(y0, y1, (entra + fica + n) / total));
  };
  const reta = (n, altura = 0) => trecho(0, n, 0, 0, altura);

  // Curvas: 1.5 leve, 2.2 média, 3 forte (dá pra fazer só aliviando o acelerador, sem freio)
  reta(70);
  trecho(25, 25, 25, 0, 20);              // subidinha saindo da largada
  trecho(40, 60, 40, 1.5, 0);             // curva longa à direita, beira-mar
  trecho(25, 50, 25, 0, -20);
  trecho(30, 30, 30, -2.2, 20);           // S
  trecho(30, 30, 30, 2.2, -10);
  reta(80);
  trecho(50, 100, 50, -1.5, 30);          // curva longa à esquerda subindo
  trecho(30, 40, 30, 0, -40);             // descidona
  for (let k = 0; k < 4; k++) { trecho(12, 12, 12, 0, 8); trecho(12, 12, 12, 0, -8); } // lombadinhas
  trecho(25, 50, 25, 3, 0);               // curva forte à direita
  reta(50);
  trecho(25, 50, 25, -3, 0);              // curva forte à esquerda
  trecho(50, 50, 50, 1, 40);              // subida com curva leve
  trecho(25, 25, 25, -2.2, -20);
  trecho(25, 25, 25, 2.2, -20);
  reta(100);
  trecho(40, 80, 40, 2.2, 0);
  trecho(30, 60, 30, -1, 0);
  for (let k = 0; k < 3; k++) trecho(20, 20, 20, k % 2 ? -1.5 : 1.5, 0);
  trecho(40, 40, 40, 0, -ultimoY() / SEG);  // volta pra altura zero antes da chegada
  reta(60);

  // ---------- objetos na beira ----------
  const r = aleatorio(2026);
  const por = (i, tipo, offset) => { if (i > 12 && i < segs.length - 4) segs[i].sprites.push({ tipo, offset }); };
  const coqs = ['coqueiro1', 'coqueiro2', 'coqueiro3'];
  for (let i = 0; i < segs.length; i += 5) por(i, coqs[Math.floor(r() * 3)], -(1.35 + r() * 2.4));
  for (let i = 3; i < segs.length; i += 8) por(i, coqs[Math.floor(r() * 3)], 1.35 + r() * 2.4);
  for (let i = 7; i < segs.length; i += 11) por(i, r() < 0.5 ? 'guardaSol1' : 'guardaSol2', -(3.2 + r() * 2));
  for (let i = 60; i < segs.length; i += 160) por(i, 'quiosque', (i / 160) % 2 ? 1.8 : -1.9);
  // postes bem perto da pista: dão a sensação de velocidade (e acendem à noite)
  for (let i = 14; i < segs.length; i += 16) { por(i, 'posteE', -1.22); por(i + 8, 'posteD', 1.22); }
  for (let i = 30; i < segs.length; i += 37) por(i, 'pedra', (r() < 0.5 ? -1 : 1) * (1.4 + r() * 1.5));
  // placas de curva do lado de fora, antes de cada curva
  for (let i = 1; i < segs.length; i++) {
    const c = segs[i].curva, antes = segs[i - 1].curva;
    if (Math.abs(c) > 0.05 && Math.abs(antes) <= 0.05 && Math.abs(segs[Math.min(i + 30, segs.length - 1)].curva) >= 1) {
      const dir = Math.sign(segs[Math.min(i + 30, segs.length - 1)].curva);
      for (const k of [-24, -14, -4, 6, 16]) {
        const j = i + k;
        if (j > 12) { segs[j].sprites = segs[j].sprites.filter(s => Math.abs(s.offset) > 2.2); por(j, dir > 0 ? 'setaDir' : 'setaEsq', dir > 0 ? -1.3 : 1.3); }
      }
    }
  }
  return segs;
}
