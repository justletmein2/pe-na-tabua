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
