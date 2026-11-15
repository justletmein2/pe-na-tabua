# Pé na Tábua

Corrida multiplayer pelo celular, estilo jogos de corrida do Super Nintendo: visão de trás do
carro, estrada com curvas e morros, pixel art. O celular deitado vira o volante (inclinação),
e na tela só tem ACELERAR e TURBO.

**Fase atual:** uma pista de praia; corrida de 3 voltas com amigos (salas com código de 4 letras)
ou contra 5 adversários do computador; piloto = boneco do Forma Palavras;
perigos malucos com aviso (lava de vulcão, fogo de dragão, caminhão tombado, onda gigante),
clima sorteado (dia, fim de tarde, noite; chuva ou neve), 4 músicas e cor do carro à escolha.

Para testar no computador dá pra forçar coisas pelo endereço: `?clima=noite-chuva`,
`?perigo=1` (primeiro perigo logo no começo), `?musica=0..3`, `?semente=abc` (sorteios repetíveis).

| Arquivo | O que é |
| --- | --- |
| `public/index.html`, `public/style.css` | Telas e botões |
| `public/js/jogo.js` | Física, desenho da estrada pseudo-3D, fluxo das telas |
| `public/js/volante.js` | Volante por inclinação: sensor, calibração e sensibilidade |
| `public/js/pista.js` | Formato da pista (curvas, morros) e objetos da beira |
| `public/js/sprites.js` | Desenhos em pixel art feitos por código (carro, coqueiros, placas, fundo) |
| `public/js/som.js` | Ronco do motor e efeitos (gerados na hora, sem arquivos de áudio) |
| `public/js/musica.js` | As 4 músicas chiptune (notas escritas no próprio arquivo) |
| `public/js/clima.js` | Hora do dia, chuva/neve, luzes à noite |
| `public/js/perigos.js` | Os perigos com aviso de um lado da pista |
| `public/js/npcs.js` | Adversários do computador |
| `public/js/minimapa.js` | O mapinha da pista |

## Controles

- Celular: incline como um volante; polegar direito em ACELERAR, esquerdo em TURBO.
  Soltar o acelerar faz o carro perder velocidade (não tem freio).
- Computador: ← → viram, ↑ ou Z acelera, Espaço ou X turbo, Esc pausa.
- Turbo: a barra enche enquanto você fica na pista sem bater; usa tudo de uma vez.
