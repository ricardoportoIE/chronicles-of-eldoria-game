# Estudo e croqui mobile — formato 9:16

## Diagnóstico

O jogo atual é responsivo apenas na apresentação: o canvas continua sendo uma arena horizontal de `960 × 600`. Em celulares na vertical isso provoca uma destas situações: arena muito baixa, distorção ou recorte de conteúdo. Os controles de toque também disputam espaço com a partida.

A adaptação deve mudar a geometria real do mundo, não somente o CSS.

## Solução

- Desktop e celular em paisagem preservam a arena `960 × 600`.
- Celular em retrato usa uma arena nativa `540 × 960` (`9:16`).
- Entidades mobile usam escala de `75%`, mantendo mais espaço para desviar.
- Velocidade e quantidade inicial de inimigos são ligeiramente reduzidas para compensar a menor largura.
- HUD vira uma faixa compacta sobre a arena.
- Direcional e disparo ficam nas extremidades inferiores, com áreas de toque grandes.
- O jogo inteiro cabe em `100dvh`, respeitando as barras dinâmicas dos navegadores mobile.

## Croqui

```text
┌─────────────────────────────┐
│  CHRONICLES       som  tela │  44 px
├─────────────────────────────┤
│ VIDA ██████ 100   CAP. I  │
│ PONTOS 000120    00:15    │  HUD sobreposto
├─────────────────────────────┤
│                             │
│       chama    ●             │
│                             │
│              ◇ herói         │  arena 540 × 960
│                             │
│   ▲                         │
│ ◀ ▼ ▶                  ( LUZ )│  controles de toque
└─────────────────────────────┘
              proporção 9:16
```

## Escala proposta

| Elemento | Desktop | Mobile retrato |
| --- | ---: | ---: |
| Mundo | 960 × 600 | 540 × 960 |
| Herói | 72 × 72 | 54 × 54 |
| Chama | 92 × 34 | 69 × 25,5 |
| Projétil | raio 8 | raio 6 |
| Inimigos iniciais | 5 | 4 |

## Critérios de aceite

- Nenhum elemento exige rolagem em uma viewport comum de celular.
- Canvas interno e visual mantêm proporção `9:16`, sem esticar sprites.
- Controles permanecem acessíveis com os dois polegares.
- HUD, introdução, pausa e game over ficam legíveis em retrato.
- Regras, fusões e hitboxes continuam proporcionais e dentro dos sprites.
- A experiência desktop não sofre regressão.
