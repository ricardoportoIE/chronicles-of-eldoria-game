# Qualidade e testes

O projeto usa uma barreira local de qualidade executada por `npm run test:quality`.

## Critérios automatizados

- **Cobertura:** 100% de statements, branches, functions e lines em `src/game`.
- **Controles:** teclado, pausa, foco, disparo, direcional touch, joystick na arena e cancelamento de toque.
- **Acessibilidade:** axe-core em estados pronto e pausado, nos layouts desktop e mobile, com WCAG 2 A/AA, 2.1 A/AA e 2.2 AA.
- **Desempenho:** build de produção medido por 120 quadros em desktop 1440×1000 e mobile 390×844.
- **Segurança:** CSP, ausência de execução dinâmica/handlers inline, bloqueio de origens externas inesperadas e auditoria de dependências.

## Orçamentos de desempenho

| Métrica | Limite |
| --- | ---: |
| Carregamento local | 2500 ms |
| Quadro médio | 24 ms |
| Quadro p95 | 34 ms |
| Tarefas longas | 2 |
| Transferência inicial | 4,5 MB |
| Heap JavaScript | 128 MB |

Os limites são deliberadamente conservadores para evitar falsos positivos no navegador headless. Os números medidos são exibidos a cada execução e uma ultrapassagem encerra o teste com erro.

## Comandos

```bash
npm run test:coverage
npm run test:e2e
npm run test:performance
npm run test:security
npm run test:quality
```
