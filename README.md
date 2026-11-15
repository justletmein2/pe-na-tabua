# Pé na Tábua

Corrida multiplayer pelo celular, estilo jogos de corrida do Super Nintendo: visão de trás do
carro, estrada com curvas e morros, pixel art. O celular deitado vira o volante (inclinação),
e na tela só tem ACELERAR e TURBO.

**Fase atual: teste do volante** (uma pista de praia, corrida sozinho de 3 voltas).

| Arquivo | O que é |
| --- | --- |
| `public/index.html`, `public/style.css` | Telas e botões |
| `public/js/jogo.js` | Física, desenho da estrada pseudo-3D, fluxo das telas |
| `public/js/volante.js` | Volante por inclinação: sensor, calibração e sensibilidade |
| `public/js/pista.js` | Formato da pista (curvas, morros) e objetos da beira |
| `public/js/sprites.js` | Desenhos em pixel art feitos por código (carro, coqueiros, placas, fundo) |
| `public/js/som.js` | Ronco do motor e efeitos (gerados na hora, sem arquivos de áudio) |

## Controles

- Celular: incline como um volante; polegar direito em ACELERAR, esquerdo em TURBO.
  Soltar o acelerar faz o carro perder velocidade (não tem freio).
- Computador: ← → viram, ↑ ou Z acelera, Espaço ou X turbo, Esc pausa.
- Turbo: a barra enche enquanto você fica na pista sem bater; usa tudo de uma vez.
