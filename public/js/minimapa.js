// Minimapa: o formato da pista é calculado a partir das curvas. Como uma pista pseudo-3D não
// "fecha" sozinha no mapa, o desenho é corrigido aos poucos pra virar um circuito fechado.
export class Minimapa {
  constructor(canvas, segs) {
    this.c = canvas; this.g = canvas.getContext('2d'); this.segs = segs;
    const N = segs.length, k = 0.0045;
    let soma = 0; for (const s of segs) soma += s.curva * k;
    const extra = (2 * Math.PI - soma) / N;          // completa uma volta inteira
    let ang = -Math.PI / 2, x = 0, y = 0;
    const pts = [];
    for (const s of segs) { pts.push([x, y]); ang += s.curva * k + extra; x += Math.cos(ang); y += Math.sin(ang); }
    pts.forEach((p, i) => { p[0] -= x * i / N; p[1] -= y * i / N; });   // fecha o desenho
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const [a, b] of pts) { x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, b); y1 = Math.max(y1, b); }
    this.pts = pts; this.caixa = { x0, x1, y0, y1 };
    this.ajustar();
  }
  ajustar() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    const w = this.c.clientWidth || 120, h = this.c.clientHeight || 80;
    this.c.width = w * dpr; this.c.height = h * dpr; this.dpr = dpr;
    const { x0, x1, y0, y1 } = this.caixa, m = 8 * dpr;
    this.esc = Math.min((w * dpr - 2 * m) / (x1 - x0), (h * dpr - 2 * m) / (y1 - y0));
    this.ox = (w * dpr - (x1 - x0) * this.esc) / 2 - x0 * this.esc;
    this.oy = (h * dpr - (y1 - y0) * this.esc) / 2 - y0 * this.esc;
  }
  ponto(i) { const p = this.pts[((i % this.pts.length) + this.pts.length) % this.pts.length]; return [this.ox + p[0] * this.esc, this.oy + p[1] * this.esc]; }
  desenhar(carros, perigos, largada) {
    const g = this.g, d = this.dpr;
    g.clearRect(0, 0, this.c.width, this.c.height);
    g.lineJoin = 'round';
    const linha = (cor, larg, de, ate) => {
      g.strokeStyle = cor; g.lineWidth = larg * d; g.beginPath();
      for (let i = de; i <= ate; i += 4) { const [x, y] = this.ponto(i); i === de ? g.moveTo(x, y) : g.lineTo(x, y); }
      g.stroke();
    };
    const N = this.pts.length;
    linha('rgba(0,0,0,.55)', 6, 0, N); linha('#ffffff', 2.5, 0, N);
    for (const h of perigos) linha('#ff3b30', 4, h.s0, h.s0 + h.n);
    const [lx, ly] = this.ponto(largada); g.fillStyle = '#ffd23f'; g.fillRect(lx - 2 * d, ly - 2 * d, 4 * d, 4 * d);
    for (const c of carros) {
      const [x, y] = this.ponto(c.i);
      g.fillStyle = c.cor; g.strokeStyle = c.eu ? '#fff' : '#000'; g.lineWidth = (c.eu ? 2 : 1) * d;
      g.beginPath(); g.arc(x, y, (c.eu ? 4.5 : 3) * d, 0, Math.PI * 2); g.fill(); g.stroke();
    }
  }
}
