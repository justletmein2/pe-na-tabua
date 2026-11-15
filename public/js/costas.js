// Boneco do Forma Palavras visto DE COSTAS (pro piloto dentro do carro).
// Usa as mesmas medidas do desenho de frente (caixa 100x100) e as cores do catálogo
// do Forma Palavras. Item novo que ainda não tem versão de costas aparece "genérico"
// (cabeça na cor do cabelo/bicho) em vez de quebrar.

const AVES = { sanhaco: '#a9bfd0', maritaca: '#5bbd4a', sabia: '#8b7860' };
const ASAS = { sanhaco: '#4f8fb8', maritaca: '#2e8b3e', sabia: '#6e5c47' };
const GATOS = {
  laranja: '#f4a259', cinza: '#a3a8b6', preto: '#2f2b3a', branco: '#fbfaf7', frajola: '#2f2b3a', siames: '#f3e6d2',
  rajado: '#c9a27a', tricolor: '#fbfaf7', rosa: '#ffb3d1', lilas: '#c4b0ff', galaxia: '#26305e', dourado: '#e8b923',
};
const COMPR_ORELHA = { curtas: 30, medias: 46, compridas: 56, super: 68, gigantes: 84 };
const escurecer = (hex, f = 0.72) => /^#[0-9a-f]{6}$/i.test(hex) ? '#' + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * f).toString(16).padStart(2, '0')).join('') : hex;

export function costasSVG(CATALOGO, look = {}) {
  const pega = (parte, id) => (CATALOGO[parte] || []).find(x => x.id === id) || (CATALOGO[parte] || [])[0] || {};
  let L = { tipo: 'pessoa', pele: 'p2', cabelo: 'curto', corCabelo: 'castanho', corRoupa: 'azul', chapeu: 'nada', acessorio: 'nada', ...look };
  if (['sanhaco', 'maritaca', 'sabia'].includes(L.tipo)) L = { ...L, tipo: 'passaro', plumagem: L.tipo };
  const pele = pega('pele', L.pele).cor || '#f6c7a1';
  let cab = pega('corCabelo', L.corCabelo).cor || '#6b3f22';
  if (cab.startsWith('url')) cab = '#ff5fa2';
  const roupa = pega('corRoupa', L.corRoupa).cor || '#36b6ff';
  const s = [];
  const t = L.tipo;
  let corCabeca = cab;

  if (t === 'pessoa') {
    s.push(`<path d="M18 100 Q20 76 50 74 Q80 76 82 100 Z" fill="${L.roupa === 'astronauta' ? '#eef1f7' : roupa}"/>`);
    if (L.roupa === 'heroi') s.push(`<path d="M24 100 Q20 80 34 76 L66 76 Q80 80 76 100Z" fill="#e8455b"/>`);
    s.push(`<rect x="44" y="64" width="12" height="12" rx="4" fill="${pele}"/>`);
    s.push(`<ellipse cx="27" cy="50" rx="5" ry="6" fill="${pele}"/><ellipse cx="73" cy="50" rx="5" ry="6" fill="${pele}"/>`);
    const careca = L.cabelo === 'careca' || L.cabelo === 'moicano';
    s.push(`<ellipse cx="50" cy="46" rx="23" ry="24" fill="${careca ? pele : cab}"/>`);
    if (L.cabelo === 'raspado') s.push(`<ellipse cx="50" cy="46" rx="23" ry="24" fill="${pele}" opacity=".45"/>`);
    // nuca (um pouco de pele embaixo, menos pra cabelo comprido)
    const longo = ['longo', 'franja', 'chanel', 'lado', 'trancas', 'dreads', 'blackpower'].includes(L.cabelo);
    if (!careca && !longo) s.push(`<path d="M36 62 Q50 72 64 62 Q60 69 50 70 Q40 69 36 62Z" fill="${pele}"/>`);
    s.push({
      longo: `<path d="M26 46 Q24 82 32 92 L68 92 Q76 82 74 46Z" fill="${cab}"/>`,
      franja: `<path d="M26 46 Q24 82 32 92 L68 92 Q76 82 74 46Z" fill="${cab}"/>`,
      chanel: `<path d="M27 46 Q25 66 32 70 L68 70 Q75 66 73 46Z" fill="${cab}"/>`,
      lado: `<path d="M27 46 Q25 64 32 68 L68 68 Q75 64 73 46Z" fill="${cab}"/>`,
      rabo: `<path d="M44 44 Q38 70 50 86 Q62 70 56 44Z" fill="${cab}"/><rect x="44" y="42" width="12" height="5" rx="2" fill="${roupa}"/>`,
      chiquinha: `<circle cx="22" cy="48" r="9" fill="${cab}"/><circle cx="78" cy="48" r="9" fill="${cab}"/>`,
      coque: `<circle cx="50" cy="24" r="11" fill="${cab}"/>`,
      blackpower: `<circle cx="50" cy="40" r="31" fill="${cab}"/>`,
      cacheado: `<g fill="${cab}"><circle cx="30" cy="40" r="9"/><circle cx="70" cy="40" r="9"/><circle cx="34" cy="56" r="9"/><circle cx="66" cy="56" r="9"/><circle cx="50" cy="60" r="9"/></g>`,
      trancas: `<g fill="${cab}">${[54, 62, 70, 78, 86].map(y => `<circle cx="40" cy="${y}" r="5"/><circle cx="60" cy="${y}" r="5"/>`).join('')}</g>`,
      dreads: `<g stroke="${cab}" stroke-width="6" stroke-linecap="round">${[30, 38, 46, 54, 62, 70].map(x => `<path d="M${x} 44 L${x} 86"/>`).join('')}</g>`,
      espetado: `<path d="M27 40 L30 22 L38 30 L42 14 L50 26 L58 14 L62 30 L70 22 L73 40Z" fill="${cab}"/>`,
      moicano: `<path d="M44 66 Q42 20 50 6 Q58 20 56 66Z" fill="${cab}"/>`,
      topete: `<path d="M30 30 Q40 12 58 14 Q72 20 70 32Z" fill="${cab}"/>`,
    }[L.cabelo] || '');
  } else {
    // bichos: cabeça "de trás", sem olhos nem focinho
    s.push(`<path d="M20 100 Q22 76 50 74 Q78 76 80 100Z" fill="${roupa}"/>`);
    if (t === 'passaro') {
      const c = AVES[L.plumagem] || AVES.sanhaco, a = ASAS[L.plumagem] || ASAS.sanhaco;
      s.push(`<ellipse cx="22" cy="90" rx="9" ry="19" fill="${a}"/><ellipse cx="78" cy="90" rx="9" ry="19" fill="${a}"/><ellipse cx="50" cy="96" rx="28" ry="26" fill="${c}"/>`);
      s.push(`<circle cx="50" cy="46" r="23" fill="${c}"/><path d="M44 26 Q50 12 56 26" fill="${a}"/>`);
      corCabeca = c;
    } else if (t === 'gato') {
      const c = GATOS[L.pelagem] || GATOS.laranja;
      s.push(`<path d="M20 100 Q22 74 50 72 Q78 74 80 100Z" fill="${c}"/><path d="M28 41 L26 11 L47 27Z M72 41 L74 11 L53 27Z" fill="${c}"/><ellipse cx="50" cy="47" rx="24" ry="22" fill="${c}"/>`);
      s.push(`<path d="M50 72 Q58 86 70 84" stroke="${escurecer(c)}" stroke-width="5" fill="none" stroke-linecap="round"/>`);
      corCabeca = c;
    } else if (t === 'maltes') {
      const n = COMPR_ORELHA[L.orelhas] || 46;
      s.push(`<path d="M20 100 Q22 74 50 72 Q78 74 80 100Z" fill="#fbf7ef"/>`);
      s.push(`<ellipse cx="26" cy="${40 + n / 2}" rx="10" ry="${n / 2 + 6}" fill="#f1e9da"/><ellipse cx="74" cy="${40 + n / 2}" rx="10" ry="${n / 2 + 6}" fill="#f1e9da"/>`);
      s.push(`<ellipse cx="50" cy="46" rx="24" ry="23" fill="#fbf7ef"/><path d="M42 24 Q50 18 58 24" stroke="#ff7eb6" stroke-width="5" fill="none" stroke-linecap="round"/>`);
      corCabeca = '#fbf7ef';
    } else if (t === 'caramelo') {
      s.push(`<path d="M33 38 L3 33 Q8 41 33 54 Z M67 38 L97 33 Q92 41 67 54 Z" fill="#d99a4e"/><ellipse cx="50" cy="46" rx="23" ry="22" fill="#d99a4e"/>`);
      corCabeca = '#d99a4e';
    } else if (t === 'morcego') {
      s.push(`<path d="M30 38 L23 7 L45 26Z M70 38 L77 7 L55 26Z" fill="#6b5b8e"/><ellipse cx="50" cy="46" rx="22" ry="21" fill="#6b5b8e"/>`);
      corCabeca = '#6b5b8e';
    } else if (t === 'alien') {
      const c = pega('corAlien', L.corAlien).cor || '#8ee36b', m = L.modeloAlien;
      if (m === 'antenas') s.push(`<g stroke="${c}" stroke-width="2.6" stroke-linecap="round"><path d="M41 25 L33 9"/><path d="M59 25 L67 9"/></g><circle cx="33" cy="8" r="4" fill="${c}"/><circle cx="67" cy="8" r="4" fill="${c}"/>`);
      if (m === 'orelhudo') s.push(`<path d="M31 42 L5 30 L30 56Z M69 42 L95 30 L70 56Z" fill="${c}"/>`);
      if (m === 'tentaculos') s.push(`<g fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"><path d="M38 26 Q30 14 36 8"/><path d="M50 23 Q50 10 56 6"/><path d="M62 26 Q72 16 66 9"/></g>`);
      s.push(`<rect x="44" y="62" width="12" height="14" rx="4" fill="${c}"/>`);
      s.push(m === 'cabecudo' ? `<path d="M50 12 C82 12 84 42 74 56 C68 66 58 71 50 71 C42 71 32 66 26 56 C16 42 18 12 50 12Z" fill="${c}"/>`
        : `<path d="M50 22 C73 22 77 40 73 54 C69 66 58 71 50 71 C42 71 31 66 27 54 C23 40 27 22 50 22Z" fill="${c}"/>`);
      corCabeca = c;
    } else if (t === 'robo') {
      const c = pega('corRobo', L.corRobo).cor || '#c9d1de', sb = escurecer(c), m = L.modeloRobo;
      s.push(`<rect x="22" y="74" width="56" height="32" rx="8" fill="${c}" stroke="${sb}" stroke-width="1.5"/><rect x="44" y="64" width="12" height="12" fill="${sb}"/>`);
      if (m === 'urso') s.push(`<circle cx="31" cy="27" r="8" fill="${c}"/><circle cx="69" cy="27" r="8" fill="${c}"/><circle cx="50" cy="47" r="23" fill="${c}" stroke="${sb}" stroke-width="1.5"/>`);
      else if (m === 'redondo') s.push(`<path d="M50 24 V12" stroke="${sb}" stroke-width="2.4"/><circle cx="50" cy="10" r="4" fill="${roupa}"/><circle cx="50" cy="46" r="23" fill="${c}" stroke="${sb}" stroke-width="1.5"/>`);
      else if (m === 'tv') s.push(`<path d="M44 26 L34 10 M56 26 L66 10" stroke="${sb}" stroke-width="2.2"/><rect x="25" y="25" width="50" height="42" rx="7" fill="${c}" stroke="${sb}" stroke-width="1.5"/>`);
      else if (m === 'visor') s.push(`<rect x="27" y="24" width="46" height="43" rx="16" fill="${c}" stroke="${sb}" stroke-width="1.5"/>`);
      else s.push(`<path d="M50 25 V12" stroke="${sb}" stroke-width="2.4"/><circle cx="50" cy="10" r="4" fill="${roupa}"/><rect x="27" y="25" width="46" height="42" rx="8" fill="${c}" stroke="${sb}" stroke-width="1.5"/>`);
      s.push(`<g fill="${sb}"><circle cx="38" cy="40" r="2"/><circle cx="62" cy="40" r="2"/><circle cx="38" cy="58" r="2"/><circle cx="62" cy="58" r="2"/></g>`);
      corCabeca = c;
    } else {
      s.push(`<ellipse cx="50" cy="46" rx="23" ry="23" fill="#d99a4e"/>`);
    }
  }
  // acessórios que aparecem por trás
  if (L.acessorio === 'fone') s.push(`<path d="M24 46 Q24 16 50 16 Q76 16 76 46" fill="none" stroke="#33334d" stroke-width="4"/><rect x="19" y="42" width="9" height="14" rx="4" fill="#ff5fa2"/><rect x="72" y="42" width="9" height="14" rx="4" fill="#ff5fa2"/>`);
  if (L.acessorio === 'cachecol') s.push(`<path d="M28 70 Q50 82 72 70 L72 77 Q50 89 28 77Z" fill="${roupa}"/>`);
  if (L.acessorio === 'flor') s.push(`<g transform="translate(31 28)">${[0, 72, 144, 216, 288].map(a => `<ellipse cx="0" cy="-5" rx="3.6" ry="5" transform="rotate(${a})" fill="#ff8fbf"/>`).join('')}<circle r="3.2" fill="#ffd23f"/></g>`);
  if (L.acessorio === 'tapaolho') s.push(`<path d="M26 42 Q50 30 74 42" stroke="#26263a" stroke-width="2" fill="none"/>`);
  // chapéu (quase todos são iguais de frente e de costas)
  s.push({
    bone: `<path d="M27 38 Q28 18 50 18 Q72 18 73 38 Z" fill="${roupa}"/><rect x="40" y="33" width="20" height="5" rx="2" fill="${escurecer(roupa)}"/>`,
    laco: `<g transform="translate(50 26)"><path d="M0 0 L-10 -7 L-10 7Z M0 0 L10 -7 L10 7Z" fill="#ff3d7f"/><circle r="3" fill="#ff7eb6"/></g>`,
    gorro: `<path d="M26 38 Q26 12 50 12 Q74 12 74 38 Z" fill="${roupa}"/><rect x="24" y="33" width="52" height="8" rx="4" fill="#fff"/><circle cx="50" cy="10" r="5" fill="#fff"/>`,
    festa: `<path d="M38 28 L50 0 L62 28 Z" fill="#ffd23f"/><path d="M41 21 L59 21 M44 14 L56 14" stroke="#ff5fa2" stroke-width="3"/><circle cx="50" cy="1" r="3" fill="#36b6ff"/>`,
    gatinho: `<path d="M28 30 L30 12 L42 24Z M72 30 L70 12 L58 24Z" fill="${t === 'pessoa' ? cab : corCabeca}"/>`,
    bruxa: `<path d="M20 30 Q50 22 80 30 Q50 36 20 30Z" fill="#3a2a6e"/><path d="M34 29 L56 0 L66 28Z" fill="#3a2a6e"/><path d="M36 26 Q50 22 64 26 L64 29 Q50 26 36 29Z" fill="#ffd23f"/>`,
    cartola: `<rect x="22" y="26" width="56" height="5" rx="2.5" fill="#26263a"/><rect x="34" y="4" width="32" height="24" rx="2" fill="#26263a"/><rect x="34" y="21" width="32" height="5" fill="#e8455b"/>`,
    coroa: `<path d="M32 26 L34 10 L42 18 L50 6 L58 18 L66 10 L68 26 Z" fill="#ffc400" stroke="#d49a00" stroke-width="1.5"/>`,
    aureola: `<ellipse cx="50" cy="12" rx="17" ry="5" fill="none" stroke="#ffd23f" stroke-width="3.5"/>`,
  }[L.chapeu] || '');
  if (t === 'pessoa' && L.roupa === 'astronauta') s.push(`<circle cx="50" cy="46" r="31" fill="rgba(180,220,255,.22)" stroke="#dfe6f2" stroke-width="3"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">${s.join('')}</svg>`;
}
