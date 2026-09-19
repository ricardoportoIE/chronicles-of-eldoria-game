# Plano de modernização — Chronicles of Eldoria

## Objetivo

Transformar o protótipo original em uma demonstração pequena, moderna e bem acabada de JavaScript, Canvas 2D e Three.js, preservando a narrativa: o guardião de Eldoria resiste a uma chuva crescente de fogo e converte projéteis atingidos em energia vital.

## Diagnóstico inicial

- O projeto compila, mas usa uma versão antiga do Vite com vulnerabilidades conhecidas.
- O texto em português está com caracteres corrompidos em vários arquivos.
- Relógio, dificuldade, animação e recarga dependem de timers independentes, o que causa inconsistência quando a aba perde foco.
- O estado é global e o fim da partida usa `confirm()`, dificultando reinício, pausa e testes.
- O canvas e os controles foram pensados apenas para desktop em 800 × 600.
- Não existem testes automatizados para regras de jogo.
- A apresentação usa uma biblioteca carregada por CDN, embora a animação possa ser feita de forma nativa.

## Etapas e critérios de aceite

### 1. Auditoria e roteiro

- Registrar o comportamento existente, riscos e escopo.
- Criar uma branch de trabalho sem alterar o repositório remoto.
- Confirmar que o projeto original instala e compila.

### 2. Fundação técnica

- Atualizar dependências vulneráveis.
- Separar regras puras, configuração e persistência do renderizador.
- Usar um único game loop com delta de tempo.
- Adicionar testes automatizados para progressão, dano, cura e pontuação.

### 3. Jogabilidade

- Corrigir movimentação diagonal e limites do mapa.
- Adicionar pontuação, combo e recorde local.
- Balancear a progressão de velocidade, quantidade de inimigos, dano e recarga.
- Permitir pausar, reiniciar e finalizar a partida sem diálogos bloqueantes.

### 4. Experiência e apresentação

- Preservar a identidade medieval e os recursos visuais originais.
- Criar telas de introdução, pausa e fim de jogo integradas à interface.
- Tornar o layout responsivo e adicionar controles de toque.
- Oferecer controles de som, foco visível, texto legível e preferência por menos movimento.

### 5. Qualidade e documentação

- Executar testes, auditoria de dependências e build de produção.
- Testar a jornada principal no navegador em viewport desktop e mobile.
- Atualizar o README com arquitetura, comandos, controles e decisões técnicas.
- Manter todo o histórico apenas local até a aprovação do autor.

## Fora de escopo

- Backend, cadastro de usuário e placar online.
- Substituição da narrativa ou dos assets autorais.
- Publicação ou push para qualquer repositório remoto.
