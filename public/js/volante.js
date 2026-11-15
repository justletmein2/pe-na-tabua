// Volante por inclinação: lê a gravidade pelo sensor de movimento e transforma o quanto o
// celular está girado (como um volante, em torno do eixo que atravessa a tela) num valor
// de -1 (tudo pra esquerda) a +1 (tudo pra direita).
//
// Por que usar a gravidade e não os ângulos alpha/beta/gamma: com o celular deitado os ângulos
// "travam" (gimbal lock) e pulam; a direção da gravidade projetada na tela é estável, não depende
// de qual lado o celular foi deitado e nem de quanto ele está inclinado pra trás.

const CHAVE = 'pnt-volante';
export const PADRAO = { angulo: 20, morta: 1.5, suave: 0.35, centro: 1.3, inverter: false };

export const volante = {
  cfg: carregar(),
  temSensor: false,     // chegou algum dado do sensor
  bruto: null,          // ângulo atual da gravidade na tela (graus)
  ref: null,            // ângulo do "reto" (calibração)
  graus: 0,             // giro em relação ao reto, já suavizado
  valor: 0,             // -1..1
  deitado: true,        // gravidade aponta pro lado comprido do celular?
};

function carregar() {
  try { return { ...PADRAO, ...JSON.parse(localStorage.getItem(CHAVE) || '{}') }; }
  catch { return { ...PADRAO }; }
}
export function salvar() { try { localStorage.setItem(CHAVE, JSON.stringify(volante.cfg)); } catch {} }
export function restaurarPadrao() { volante.cfg = { ...PADRAO }; salvar(); }

const embrulhar = a => ((a + 540) % 360) - 180;

function aoMover(e) {
  const g = e.accelerationIncludingGravity;
  if (!g || g.x == null || g.y == null) return;
  volante.temSensor = true;
  // celular quase deitado numa mesa: a gravidade fica "fora" da tela e o ângulo não vale
  if (Math.hypot(g.x, g.y) < 3) return;
  volante.deitado = Math.abs(g.x) > Math.abs(g.y);
  volante.bruto = Math.atan2(g.y, g.x) * 180 / Math.PI;
}

let ouvindo = false;
function ouvir() { if (!ouvindo) { addEventListener('devicemotion', aoMover); ouvindo = true; } }

// Tem que ser chamada direto do toque no botão (o iPhone exige isso).
// Devolve 'ok', 'negado' ou 'semdados'.
export function ligar() {
  let pedido = null;
  try {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      pedido = DeviceMotionEvent.requestPermission();
    }
  } catch { return Promise.resolve('negado'); }
  return (pedido || Promise.resolve('granted'))
    .catch(() => 'denied')
    .then(r => {
      if (r === 'denied') return 'negado';   // 'granted' ou (Chrome novo) 'prompt': segue e vê se chegam dados
      ouvir();
      return new Promise(res => {
        const t0 = performance.now();
        (function ver() {
          if (volante.temSensor) res('ok');
          else if (performance.now() - t0 > 1500) res('semdados');
          else setTimeout(ver, 80);
        })();
      });
    });
}

export function calibrar() {
  volante.ref = volante.bruto;
  volante.graus = 0;
  volante.valor = 0;
}

// giro "cru" (sem suavizar), em graus, já com o inverter aplicado
export function giroAtual() {
  if (volante.bruto == null || volante.ref == null) return 0;
  const d = embrulhar(volante.bruto - volante.ref);
  return volante.cfg.inverter ? -d : d;
}

// Chamada a cada quadro do jogo
export function atualizar(dt) {
  const c = volante.cfg;
  const alvo = giroAtual();
  const k = 1 - Math.pow(c.suave, dt * 60);
  volante.graus += (alvo - volante.graus) * (c.suave <= 0 ? 1 : k);
  volante.valor = mapear(volante.graus, c);
  return volante.valor;
}

export function mapear(graus, c = volante.cfg) {
  const a = Math.abs(graus);
  const m = Math.min(1, Math.max(0, a - c.morta) / Math.max(1, c.angulo - c.morta));
  return Math.sign(graus) * Math.pow(m, c.centro);
}
