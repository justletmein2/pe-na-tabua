// Perigos malucos: aparece um aviso de um lado da pista e, logo depois, aquele lado vira
// perigo (lava, fogo de dragão, caminhão tombado, onda gigante). Quem passar por ali roda.
// Sempre sobra o outro lado livre: os carros têm que se espremer.

export const TIPOS = {
  lava: { icone: '🌋', nome: 'LAVA!', comp: 50, frases: ['Tá quente! Tá quente!', 'Derreteu meu pneu!', 'Quem pôs um vulcão aqui?!'] },
  fogo: { icone: '🐉', nome: 'DRAGÃO!', comp: 60, frases: ['Queimou minha sobrancelha!', 'Dragão folgado!', 'Cheiro de churrasco!'] },
  caminhao: { icone: '🚚', nome: 'CAMINHÃO TOMBADO!', comp: 26, frases: ['Quem deixou isso aqui?!', 'Cadê o guincho?!', 'Olha a carga!'] },
  onda: { icone: '🌊', nome: 'ONDA GIGANTE!', comp: 45, frases: ['Molhou tudo!', 'Entrou água no ouvido!', 'Glub glub!'] },
};
const LISTA = Object.keys(TIPOS);
const AVISO = 1.5;  // segundos de aviso antes do perigo valer

export class Perigos {
  constructor(segs, extras) {
    this.segs = segs; this.N = segs.length; this.ex = extras;
    this.lista = []; this.proximo = 8; this.marcados = [];
  }
  reiniciar() { this.lista = []; this.proximo = 8; this.limparMarcas(); }
  dentro(h, i) { return ((i - h.s0) % this.N + this.N) % this.N < h.n; }
  ativo(h, t) { return t >= h.tAtivo; }

  // s0Fixo: usado quando o perigo veio do anfitrião (multiplayer)
  criar(t, segJog, rand, tipo, lado, s0Fixo) {
    tipo = tipo || LISTA[Math.floor(rand() * LISTA.length)];
    lado = lado || (rand() < 0.5 ? -1 : 1);
    const n = TIPOS[tipo].comp;
    const s0 = s0Fixo != null ? s0Fixo : (segJog + 170 + Math.floor(rand() * 40)) % this.N;
    const h = { tipo, lado, s0, n, t0: t, tAtivo: t + AVISO, xmin: lado < 0 ? -4 : -0.1, xmax: lado < 0 ? 0.1 : 4, bolas: [], chamas: [] };
    if (tipo === 'lava') for (let k = 0; k < 12; k++) h.bolas.push({ k: Math.floor(rand() * n), x: lado * (0.15 + rand() * 0.8), tp: t + 0.3 + rand() * (AVISO + 0.4) });
    if (tipo === 'fogo') for (let k = 0; k < n; k += 3) h.chamas.push({ k, x: lado * (0.12 + rand() * 0.85), f: Math.floor(rand() * 2) });
    this.lista.push(h);
    return h;
  }

  // podeCriar: só quem sorteia (sozinho: sempre; multiplayer: o anfitrião), à frente de segRef (o líder)
  atualizar(t, segJog, podeCriar, rand, segRef = segJog) {
    if (podeCriar && t > this.proximo && !this.lista.length) {
      const h = this.criar(t, segRef, rand);
      this.proximo = t + 9 + rand() * 6;
      if (this.aoCriar) this.aoCriar(h);
    }
    // some depois que o jogador passou (ou depois de um tempo)
    this.lista = this.lista.filter(h => {
      const passou = ((segJog - h.s0) % this.N + this.N) % this.N;
      const jaPassou = passou >= h.n + 8 && passou < this.N / 2;
      return !(t > h.t0 + 25 || (jaPassou && t > h.tAtivo + 1));
    });
    this.limparMarcas();
    for (const h of this.lista) for (let k = 0; k < h.n; k++) {
      const s = this.segs[(h.s0 + k) % this.N];
      s.perigo = h; this.marcados.push(s);
    }
  }
  limparMarcas() { for (const s of this.marcados) s.perigo = null; this.marcados = []; }

  // cor do pedaço da pista em perigo (por linha)
  cor(h, seg, t) {
    if (!this.ativo(h, t) || h.tipo === 'caminhao') {
      const pisca = Math.floor(t * 6) % 2;
      return (seg.i + pisca) % 2 ? 'rgba(255,210,63,.6)' : 'rgba(216,49,47,.6)';
    }
    const f = Math.floor(t * 8);
    if (h.tipo === 'lava') return (seg.i + f) % 3 === 0 ? '#ffd23f' : (seg.i + f) % 3 === 1 ? '#ff7a1a' : '#e8380f';
    if (h.tipo === 'fogo') return (seg.i + f) % 4 === 0 ? '#ff7a1a' : '#4a1f12';
    if (h.tipo === 'onda') return (seg.i + f) % 5 === 0 ? '#e8f8ff' : '#2a96e0';
    return null;
  }

  // objetos que aparecem na pista: { i: segmento, x: centro, img, mundo, alt }
  objetos(t) {
    const out = [];
    for (const h of this.lista) {
      const at = this.ativo(h, t), N = this.N;
      if (h.tipo === 'lava') for (const b of h.bolas) if (t < b.tp) out.push({ i: (h.s0 + b.k) % N, x: b.x, img: this.ex.bolaFogo, mundo: 0.28, alt: (b.tp - t) * 5000, luz: 'rgba(255,140,40,A)' });
      if (h.tipo === 'fogo' && at) for (const c of h.chamas) out.push({ i: (h.s0 + c.k) % N, x: c.x, img: this.ex.chama[(c.f + Math.floor(t * 10)) % 2], mundo: 0.4, alt: 0, luz: 'rgba(255,140,40,A)' });
      if (h.tipo === 'caminhao') {
        if (at) out.push({ i: (h.s0 + 8) % N, x: h.lado * 0.55, img: this.ex.caminhao, mundo: 1.25, alt: 0 });
        for (let k = 0; k < h.n; k += 4) out.push({ i: (h.s0 + k) % N, x: h.lado * 0.08, img: this.ex.cone, mundo: 0.14, alt: 0 });
      }
      if (h.tipo === 'onda') {
        const cresce = Math.min(1, (t - h.t0) / AVISO);
        out.push({ i: (h.s0 + Math.floor(h.n / 2)) % N, x: h.lado * (at ? 1.6 : 2.6), img: this.ex.onda, mundo: 1 + 1.4 * cresce, alt: 0, espelhar: h.lado > 0 });
      }
    }
    return out;
  }

  // bateu? (só quando o perigo já vale)
  bateu(i, x, larg, t) {
    for (const h of this.lista) {
      if (!this.ativo(h, t) || !this.dentro(h, i)) continue;
      if (h.tipo === 'caminhao') { const k = ((i - h.s0) % this.N + this.N) % this.N; if (k < 2) continue; }
      if (x + larg / 2 > h.xmin && x - larg / 2 < h.xmax) return h;
    }
    return null;
  }

  // o perigo mais próximo à frente (pro aviso na tela e pros adversários)
  aFrente(i, ate = 260) {
    let melhor = null, dist = 1e9;
    for (const h of this.lista) {
      const d = ((h.s0 - i) % this.N + this.N) % this.N;
      const dentro = this.dentro(h, i);
      const dd = dentro ? 0 : d;
      if ((dentro || d < ate) && dd < dist) { melhor = h; dist = dd; }
    }
    return melhor ? { h: melhor, dist } : null;
  }

  // coisas no céu/horizonte (vulcão, dragão), em coordenadas de tela
  fundo(g, W, H, t) {
    const hz = Math.round(H / 2);
    for (const h of this.lista) {
      if (h.tipo === 'lava') {
        const v = this.ex.vulcao, x = Math.round(W / 2 + h.lado * W * 0.28 - v.width / 2);
        const sobe = Math.min(1, (t - h.t0) / 0.6);
        g.drawImage(v, x, Math.round(hz - v.height * sobe + 2));
        if (sobe >= 1) for (let k = 0; k < 14; k++) {
          const fase = (t * 1.3 + k / 14) % 1;
          const px = x + v.width / 2 + Math.sin(k * 7.3) * 30 * fase, py = hz - v.height - fase * 50 + fase * fase * 40;
          g.fillStyle = k % 3 ? '#ff7a1a' : '#ffd23f'; g.fillRect(Math.round(px), Math.round(py), 3, 3);
        }
      }
      if (h.tipo === 'fogo') {
        const voo = Math.min(1, (t - h.t0) / AVISO);
        const x = W / 2 - h.lado * W * 0.6 + h.lado * W * (0.6 + 0.25) * voo;
        const y = H * 0.16 + Math.sin(t * 4) * 6;
        const d = this.ex.dragao[Math.floor(t * 6) % 2];
        g.save();
        if (h.lado < 0) { g.translate(Math.round(x), 0); g.scale(-1, 1); g.drawImage(d, -d.width, Math.round(y)); }
        else g.drawImage(d, Math.round(x - d.width), Math.round(y));
        g.restore();
        if (this.ativo(h, t)) {
          const bx = h.lado > 0 ? x : x;
          for (let k = 0; k < 18; k++) {
            const f = (t * 3 + k / 18) % 1;
            g.fillStyle = k % 2 ? '#ff9f1c' : '#ffd23f';
            g.fillRect(Math.round(bx + h.lado * f * 10), Math.round(y + 18 + f * (hz - y)), 3 + Math.round(f * 3), 3);
          }
        }
      }
    }
  }
}
