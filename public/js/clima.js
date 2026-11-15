// Hora do dia (dia, fim de tarde, noite) e tempo (limpo, chuva, neve).
// O jogo desenha a cena normalmente e depois "pinta por cima" com a cor do horário;
// em seguida acende as luzes (faróis, postes, lanternas) e desenha chuva/neve.

export const HORAS = {
  dia: { ceu: ['#2f8fe8', '#bfe9ff'], tinta: null },
  tarde: { ceu: ['#5a3a9a', '#ffb070'], tinta: '#ffd2b0' },
  noite: { ceu: ['#4a5ab8', '#9fb0ff'], tinta: '#3f4590' },
};

export function sortearClima(rand = Math.random) {
  const r1 = rand(), r2 = rand();
  const hora = r1 < 0.45 ? 'dia' : r1 < 0.72 ? 'tarde' : 'noite';
  const tempo = r2 < 0.55 ? 'limpo' : r2 < 0.82 ? 'chuva' : 'neve';
  return { hora, tempo };
}

export const NOMES = {
  dia: 'Dia de sol', tarde: 'Fim de tarde', noite: 'Noite',
  limpo: '', chuva: 'com chuva', neve: 'com NEVE na praia!',
};

export class Clima {
  constructor() {
    this.hora = 'dia'; this.tempo = 'limpo';
    this.intens = 0; this.alvo = 0;       // intensidade de chuva/neve (0..1)
    this.particulas = [];
    this.estrelas = [];
  }
  definir({ hora, tempo }, W, H) {
    this.hora = hora; this.tempo = tempo;
    this.intens = this.alvo = tempo === 'limpo' ? 0 : 1;
    this.preparar(W, H);
  }
  // no meio da corrida a chuva pode começar ou parar (a neve fica até o fim)
  mudarTempo(tempo) {
    if (this.tempo === 'neve' || tempo === 'neve') return false;
    if (tempo === 'chuva') { this.tempo = 'chuva'; this.alvo = 1; }
    else { this.alvo = 0; }
    return true;
  }
  preparar(W, H) {
    this.particulas = [];
    for (let i = 0; i < 160; i++) this.particulas.push({ x: Math.random() * W, y: Math.random() * H, v: 0.7 + Math.random() * 0.6, f: Math.random() * 6 });
    this.estrelas = [];
    for (let i = 0; i < 70; i++) this.estrelas.push({ fx: Math.random(), fy: Math.random(), b: Math.random() });
  }
  // pista mais lisa com chuva/neve: a curva puxa mais pra fora
  get aderencia() { return 1 + this.intens * (this.tempo === 'neve' ? 0.35 : 0.22); }
  get neve() { return this.tempo === 'neve'; }
  ceu() {
    if (this.tempo === 'chuva' && this.intens > 0.5) return ['#6d7a8e', '#aab4c4'];
    if (this.tempo === 'neve') return ['#8d9ab0', '#dfe6f0'];
    return HORAS[this.hora].ceu;
  }
  atualizar(dt, vel) {
    this.intens += (this.alvo - this.intens) * Math.min(1, dt * 0.5);
    if (this.intens < 0.02 && this.alvo === 0 && this.tempo !== 'neve') this.tempo = 'limpo';
    this.vel = vel;
  }
  // tinta por cima da cena (x0,y0,w,h = área inteira do canvas)
  pintar(g, x0, y0, w, h) {
    const t = HORAS[this.hora].tinta;
    g.save();
    g.globalCompositeOperation = 'multiply';
    if (t) { g.fillStyle = t; g.fillRect(x0, y0, w, h); }
    if (this.tempo === 'chuva' && this.intens > 0.01) { g.globalAlpha = this.intens; g.fillStyle = '#9aa4b8'; g.fillRect(x0, y0, w, h); }
    g.restore();
  }
  // estrelas só na parte de cima do céu (x0,y0,w = área do canvas; teto = até onde vão)
  estrelasELua(g, W, x0, y0, w, teto) {
    if (this.hora !== 'noite' || this.tempo !== 'limpo') return;
    for (const e of this.estrelas) { g.fillStyle = e.b > 0.7 ? '#ffffff' : '#9fb0ff'; g.fillRect(Math.round(x0 + e.fx * w), Math.round(y0 + e.fy * (teto - y0)), 1, 1); }
    g.fillStyle = '#fffbe0'; g.fillRect(W - 64, 16, 16, 16); g.fillStyle = '#c9c6a8'; g.fillRect(W - 60, 20, 3, 3); g.fillRect(W - 54, 26, 2, 2);
  }
  // luzes: lista de [x, y, raio, cor]
  acender(g, luzes) {
    const escuro = this.hora === 'noite' ? 1 : this.hora === 'tarde' ? 0.45 : (this.tempo === 'chuva' ? 0.35 * this.intens : 0);
    if (escuro <= 0.01) return;
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (let [x, y, r, cor] of luzes) {
      r = Math.min(r, 42);
      if (r < 0.5) continue;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, cor.replace('A', (0.42 * escuro).toFixed(2))); gr.addColorStop(1, cor.replace('A', '0'));
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    g.restore();
  }
  farois(g, W, H, yCarro) {
    const escuro = this.hora === 'noite' ? 1 : this.hora === 'tarde' ? 0.3 : 0;
    if (!escuro) return;
    g.save();
    g.globalCompositeOperation = 'lighter';
    const gr = g.createLinearGradient(0, yCarro, 0, H * 0.55);
    gr.addColorStop(0, `rgba(255,236,170,${0.32 * escuro})`); gr.addColorStop(1, 'rgba(255,236,170,0)');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(W / 2 - W * 0.12, yCarro); g.lineTo(W / 2 + W * 0.12, yCarro); g.lineTo(W / 2 + W * 0.3, H * 0.55); g.lineTo(W / 2 - W * 0.3, H * 0.55); g.closePath(); g.fill();
    g.restore();
  }
  particulasDesenhar(g, x0, y0, w, h, dt) {
    if (this.intens < 0.02) return;
    const n = Math.round(this.particulas.length * this.intens);
    const v = this.vel || 0;
    g.save();
    if (this.tempo === 'neve') {
      g.fillStyle = '#ffffff';
      for (let i = 0; i < n; i++) {
        const p = this.particulas[i];
        p.y += (40 + 30 * p.v) * dt * (1 + v); p.f += dt * 2;
        p.x += Math.sin(p.f) * 12 * dt + (p.x - (x0 + w / 2)) * dt * v * 1.2;
        if (p.y > y0 + h || p.x < x0 || p.x > x0 + w) { p.y = y0 + Math.random() * h * 0.3; p.x = x0 + Math.random() * w; }
        g.fillRect(Math.round(p.x), Math.round(p.y), p.v > 1 ? 2 : 1, p.v > 1 ? 2 : 1);
      }
    } else {
      g.strokeStyle = 'rgba(200,220,255,.55)'; g.lineWidth = 1;
      g.beginPath();
      for (let i = 0; i < n; i++) {
        const p = this.particulas[i];
        p.y += 380 * p.v * dt; p.x -= 60 * dt;
        if (p.y > y0 + h) { p.y = y0 - 10; p.x = x0 + Math.random() * (w + 60); }
        g.moveTo(p.x, p.y); g.lineTo(p.x - 3, p.y + 9 + v * 6);
      }
      g.stroke();
    }
    g.restore();
  }
}
