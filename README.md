# Chronicles of Eldoria

Um pequeno survival game 2D feito com JavaScript moderno e Canvas. Você assume o papel do último guardião de Eldoria: precisa desviar das sentinelas de fogo e usar a luz arcana para converter seus ataques em energia vital.

O projeto nasceu como atividade acadêmica no curso de TSI do IFSul Pelotas e foi modernizado para demonstrar organização de código, regras testáveis, animação em tempo real, interface responsiva e integração com bibliotecas.

## O que há no jogo

- Movimentação por WASD ou setas, com diagonais normalizadas.
- Disparo de luz arcana com a barra de espaço.
- Dificuldade progressiva por capítulos: mais inimigos, velocidade e dano.
- Fusão vetorial de sentinelas: chamas que se encontram crescem e seguem a direção da força resultante.
- Cura, pontuação, combo, tempo de sobrevivência e recorde local.
- Pausa, reinício, tela cheia e controle de som sem diálogos bloqueantes.
- Arena mobile nativa em `9:16`, redimensionada sem distorcer sprites ou hitboxes.
- Controle touch direto na arena por gesto de arrastar, com joystick visual.
- Direcional touch alternativo e botão de disparo, com HUD compacto sobre a arena.
- Interface acessível com foco visível, regiões semânticas e suporte a movimento reduzido.
- Globo renderizado com Three.js e carregado sob demanda.

## Executar localmente

Requer Node.js 20.19 ou superior.

```bash
npm install
npm run dev
```

Abra a URL exibida pelo Vite, normalmente `http://localhost:5173`.

## Comandos

```bash
npm run dev       # servidor de desenvolvimento
npm test          # testes unitários das regras
npm run test:e2e  # jornada real em navegador Chromium/Edge
npm run build     # build de produção
npm run preview   # visualiza o build localmente
```

O teste E2E procura Edge ou Chrome nos caminhos padrão do Windows. Em outro ambiente, defina `ELDORIA_BROWSER` com o caminho do executável Chromium.

## Arquitetura

```text
src/
├── main.js                 interface e orquestração
├── realmMark.js            integração Three.js sob demanda
└── game/
    ├── CanvasGame.js       game loop, colisões e renderização
    ├── GameSession.js      estado e ciclo da partida
    ├── entities.js         herói, inimigos, projéteis e partículas
    ├── InputController.js  teclado e entrada virtual
    ├── AudioManager.js     trilha e efeitos
    ├── AssetLoader.js      carregamento de imagens
    ├── rules.js            regras puras e testáveis
    ├── config.js           balanceamento centralizado
    └── storage.js          recorde local resiliente
```

O loop usa `requestAnimationFrame` com delta de tempo limitado. A simulação fica consistente em diferentes taxas de atualização e não avança enquanto a partida está pausada. As regras independentes do Canvas são cobertas com Vitest, e a jornada principal é verificada com Playwright Core usando o navegador já instalado.

## Tecnologias

- JavaScript ES Modules
- Canvas 2D
- Three.js
- Vite
- Vitest
- Playwright Core

## Autoria

Projeto original e assets: Ricardo Porto de Oliveira, IFSul Câmpus Pelotas — TSI, 2024.

Modernização mantida na mesma proposta narrativa e visual do jogo original.
