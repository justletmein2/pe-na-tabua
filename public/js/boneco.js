// O boneco do Forma Palavras dentro do Pé na Tábua.
// O desenho de frente vem direto do arquivo do Forma Palavras (avatar.js), então qualquer
// roupinha nova de lá aparece aqui sozinha. O desenho de costas fica em costas.js.
import { costasSVG } from './costas.js';

let AV = null;
export async function carregarAvatar() {
  if (AV) return AV;
  try { AV = await import(new URL('../../forma-palavras/js/avatar.js', import.meta.url).href); }
  catch { AV = null; }      // sem internet no treino: fica o piloto provisório
  return AV;
}
export const av = () => AV;

export function frenteSVG(look, tam = 64, semFundo = false) {
  if (!AV) return '';
  return AV.avatarSVG(look, tam, { semFundo });
}

// SVG -> canvas pequeno (vira "pixel art" quando o jogo amplia sem suavizar)
function svgCanvas(svg, w, h, recorte = [0, 0, 100, 100]) {
  const txt = svg.includes('xmlns=') ? svg : svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  const img = new Image();
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  return new Promise(res => {
    img.onload = () => { const g = c.getContext('2d'); g.drawImage(img, recorte[0], recorte[1], recorte[2], recorte[3], 0, 0, w, h); res(c); };
    img.onerror = () => res(null);
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(txt.replace(/width="\d+" height="\d+"/, 'width="100" height="100"'));
  });
}

// cabeça + ombros do piloto, de costas e de frente, no tamanho do carro (16x18 "pixels do carro")
const RECORTE = [14, 0, 72, 81];
const cache = new Map();
export async function cabecas(look) {
  if (!AV || !look) return null;
  const k = JSON.stringify(look);
  if (cache.has(k)) return cache.get(k);
  const p = Promise.all([
    svgCanvas(costasSVG(AV.CATALOGO, AV.normalizar ? AV.normalizar(look) : look), 16, 18, RECORTE),
    svgCanvas(AV.avatarSVG(look, 100, { semFundo: true }), 16, 18, RECORTE),
  ]).then(([costas, frente]) => (costas && frente ? { costas, frente } : null));
  cache.set(k, p);
  return p;
}

// boneco aleatório pros adversários do computador
export function lookAleatorio(rand = Math.random) {
  if (!AV) return null;
  const L = AV.lookPadrao();
  const r = rand();
  if (r < 0.35) {
    const bichos = AV.CATALOGO.tipo.filter(t => t.id !== 'pessoa' && !t.lvl);
    L.tipo = bichos[Math.floor(rand() * bichos.length)].id;
  }
  return L;
}

export const nivelDe = xp => (AV ? AV.nivelDe(xp || 0) : 1);

// ---------- editor simples (pra quem nunca jogou o Forma Palavras) ----------
const FORA = ['comemora', 'frase', 'fundo'];
export function montarEditor(box, look, nivel, ach, aoMudar) {
  if (!AV) { box.innerHTML = '<p>Não deu pra carregar os bonecos agora. Tente com internet.</p>'; return; }
  const nomes = Object.fromEntries(AV.PARTES);
  const desenhar = () => {
    const partes = AV.partesDe(look).filter(p => !FORA.includes(p));
    box.innerHTML = partes.map(p => {
      const lista = AV.CATALOGO[p] || [];
      const atual = lista.find(i => i.id === look[p]) || lista[0];
      const rot = p === 'corRoupa' && look.tipo && look.tipo !== 'pessoa' ? AV.rotuloCor(look.tipo) : nomes[p];
      return `<div class="parte"><span>${rot}</span><button data-p="${p}" data-d="-1">◀</button><b>${atual ? atual.nome : '–'}</b><button data-p="${p}" data-d="1">▶</button></div>`;
    }).join('');
    box.querySelectorAll('button').forEach(b => b.onclick = () => {
      const p = b.dataset.p, d = +b.dataset.d;
      const lista = (AV.CATALOGO[p] || []).filter(i => AV.liberado(i, nivel, ach || {}));
      if (!lista.length) return;
      let i = lista.findIndex(x => x.id === look[p]);
      i = (i + d + lista.length) % lista.length;
      look[p] = lista[i].id;
      aoMudar(look);
      desenhar();
    });
  };
  desenhar();
}
