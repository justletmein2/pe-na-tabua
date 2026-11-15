# Instruções para o Claude neste repositório

- Fale em português com o Lucas. Ele não é programador: explique em termos simples
  e diga o que ele precisa fazer, se houver algo. Ele prefere que você discorde com franqueza.
- Pé na Tábua é um jogo de corrida multiplayer pelo navegador (estilo corrida de Super Nintendo,
  tudo original). Usa o MESMO projeto Firebase do Forma Palavras (`caca-palavras-6cd16`), num
  caminho próprio do banco, e o mesmo perfil/boneco. Não quebre nada do Forma Palavras
  (`justletmein2/forma-palavras`); mudanças lá precisam ser explicadas ao Lucas antes.
- Nunca mexa no Aura Battle (`duels-game`) nem no Firebase dele.
- `main` é o que está no ar: todo push em `main` publica o site no GitHub Pages.

## Testar

- `cd public && python3 -m http.server` e abra `index.html`. No computador joga pelo teclado.
- O volante (sensor de movimento) só funciona em HTTPS, então o teste de verdade é no celular,
  pelo site publicado.

## Multiplayer e perfil

- O login e o perfil (gamertag, boneco, XP) são os do Forma Palavras: mesmo projeto Firebase,
  mesmo nome de app (`cacapalavras`) e mesmo endereço (justletmein2.github.io), então quem já
  entrou lá chega aqui logado. O boneco de frente vem de `/forma-palavras/js/avatar.js`;
  o de costas está em `public/js/costas.js` (item novo sem versão de costas aparece genérico).
- Os dados da corrida ficam em `penatabua/rooms/...` (veja `public/js/rede.js`).
- `database.rules.json` daqui tem as regras do projeto INTEIRO (Forma Palavras + Pé na Tábua).
  O Firebase só tem um arquivo de regras: ao mudar, mantenha a parte `cacapalavras` igual à do
  Forma Palavras e peça pro Lucas colar no Console (Realtime Database → Regras).
- Testar multiplayer sem Firebase: sirva uma pasta com `pe-na-tabua/` (= public) e
  `forma-palavras/` (= public do outro repo) lado a lado e abra `?local=1` em duas abas.
