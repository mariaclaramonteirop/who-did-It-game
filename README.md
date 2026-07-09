# Quem fez isso? Who Did It?

![Logo do jogo](frontend/public/logo.png)

Sistema web de party game com perguntas aleatorias, votacao entre amigos, contagem de votos, pontuacao por rodada, ranking final e administracao.

## Stack

- Backend: PHP 8.2, Slim Framework 4, PDO e MySQL 8
- Frontend: React, TypeScript, Vite e Tailwind CSS
- Ambiente: Docker Compose com API, web, MySQL e phpMyAdmin

## Funcionalidades do MVP

- Criar sala com codigo unico
- Cadastrar jogadores manualmente
- Iniciar partida com pelo menos 3 jogadores
- Sortear pergunta ativa sem repetir na mesma sala
- Registrar um voto por jogador
- Bloquear voto em si mesmo
- Fechar resultado somente quando todos votarem
- Dar ponto para o mais votado, incluindo empates
- Finalizar a partida quando alguem atingir a pontuacao maxima
- Exibir ranking atualizado e tela final
- Area admin com login, dashboard, abas dinamicas e permissoes
- Cadastro de admins com usuario, senha, perfil e permissoes
- Gerenciamento de salas, usuarios/jogadores, perguntas e categorias
- Importacao em lote de perguntas via CSV ou JSON no admin
- Cadastro e gerenciamento de categorias no admin
- Selecao de uma ou mais categorias ao criar sala
- Tela inicial com escolha entre jogo online e modo visitante/anonimo
- Modo visitante rodando no navegador, sem login e sem backend
- Camada de sessao para jogadores com login por email ou usuario
- Tela unica de login com link para cadastro
- Salas protegidas por sessao no fluxo online

## Como rodar

```bash
docker compose up --build
```

Servicos:

- Frontend: http://localhost:5173
- Admin: http://localhost:5173/admin
- Login jogador: http://localhost:5173/acesso
- Cadastro jogador: http://localhost:5173/cadastro
- Visitante: http://localhost:5173/visitante
- Backend: http://localhost:8080
- phpMyAdmin: http://localhost:8081
- MySQL: localhost:3307

## Admin

O admin nao aparece na navegacao do jogo. Ele deve ser acessado diretamente por URL:

```txt
http://localhost:5173/admin
```

O admin abre com login e nao aparece na navegacao do jogo. Credencial inicial local:

- Usuario: `admin`
- Senha: `admin123`

No Docker, esses valores podem ser alterados por `ADMIN_USERNAME`, `ADMIN_PASSWORD` e `ADMIN_SECRET`.
O admin tem menu em abas: Dashboard, Perguntas, Categorias, Importar, Salas, Usuarios, Admins e Graficos. A aba Perguntas tem filtros por texto, categoria, nivel e status. Administradores podem ter permissoes para `questions`, `categories`, `rooms`, `players`, `admins` ou `all`.
O modo visitante nao depende de login e salva a sessao localmente no navegador.

## Sessao do jogador

O fluxo online agora exige login antes de acessar as salas.

- Login com `email` ou `nome de usuario`
- Cadastro com `username`, `email`, `name` e `password`
- Token salvo no navegador para manter a sessao
- Rotas de sala protegidas no frontend e no backend
- Ao abrir a sala logado, o player entra automaticamente com o nome da conta
- Modo visitante continua separado e sem login

Credenciais do banco:

- Database: `jogo_dos_culpados`
- User: `root`
- Password: `root`

## Endpoints principais

```http
POST /rooms
GET /rooms/{code}
POST /rooms/{code}/players
POST /rooms/{code}/start
POST /rooms/{code}/rounds
GET /rounds/{id}
POST /rounds/{id}/votes
GET /rounds/{id}/result
GET /rooms/{code}/ranking
POST /admin/login
GET /admin/dashboard
GET /admin/rooms
PATCH /admin/rooms/{id}
DELETE /admin/rooms/{id}
GET /admin/players
PATCH /admin/players/{id}
DELETE /admin/players/{id}
GET /admin/users
POST /admin/users
PATCH /admin/users/{id}
GET /questions
POST /questions
PATCH /questions/{id}
DELETE /questions/{id}
POST /questions/import
GET /categories
POST /categories
PATCH /categories/{id}
DELETE /categories/{id}
```

## Exemplos

Criar sala:

```json
{
  "name": "Noite de Jogos",
  "maxPlayers": 6,
  "maxScore": 5,
  "gameMode": "classic",
  "voteVisibility": "anonymous",
  "categoryFilter": ["festa", "caos"]
}
```

Adicionar jogador:

```json
{
  "name": "Maria"
}
```

Registrar voto:

```json
{
  "voterPlayerId": 1,
  "votedPlayerId": 2
}

Importar perguntas por CSV:

```csv
text,category,level
Quem fez isso no rolê?,festa,leve
Quem fez isso no improviso?,caos,medio
```

O endpoint `POST /questions/import` aceita:

- upload de arquivo `.csv` ou `.json`
- JSON com `questions: []`
- CSV bruto em `csv`

Criar categoria:

```json
{
  "name": "Festa",
  "slug": "festa"
}
```
```
Party game web para criar salas, adicionar jogadores, sortear perguntas, votar, pontuar e acompanhar ranking. O projeto tem:

- Backend em PHP 8.2 com Slim 4 e PDO
- Frontend em React + TypeScript + Vite
- Banco MySQL 8
- Admin protegido por autenticacao, acessado somente por URL direta

## Estrutura

```txt
backend/
  public/
  src/
    Controllers/
    DAO/
    Models/
    Routes/
    Services/
    Utils/
  database/
frontend/
  public/
  src/
docker-compose.yml
```

## Como rodar

```bash
docker compose up --build
```

URLs locais:

- Jogo: http://localhost:5173
- Admin: http://localhost:5173/admin
- API: http://localhost:8080
- phpMyAdmin: http://localhost:8081
- MySQL: localhost:3307

## Credenciais iniciais

Ambiente local via Docker:

- Usuario admin: `admin`
- Senha admin: `admin123`
- Secret admin: `quem-fez-isso-local`

Banco:

- Database: `jogo_dos_culpados`
- User: `root`
- Password: `root`

## Funcionalidades

### Jogo

- Criacao de sala com codigo
- Cadastro de jogadores
- Inicio da partida com validacao minima de participantes
- Sorteio de pergunta por rodada
- Votacao por jogador
- Bloqueio de voto em si mesmo
- Ranking por sala
- Tela final com pontuacao
- Tempo de voto por rodada, com limite maximo de 60 segundos
- Quando um jogador estoura o tempo, apenas ele perde a vez e recebe voto zerado

### Admin

- Login por URL direta
- Dashboard geral
- Gerenciamento de salas
- Gerenciamento de jogadores
- Gerenciamento de perguntas
- Gerenciamento de categorias
- Gerenciamento de admins
- Permissoes por perfil
- Importacao em lote de perguntas
- Filtros por texto, categoria, nivel e status

## Rotas principais da API

```http
GET  /

POST /rooms
GET  /rooms/{code}
POST /rooms/{code}/players
POST /rooms/{code}/start
POST /rooms/{code}/rounds
GET  /rooms/{code}/ranking

GET  /rounds/{id}
POST /rounds/{id}/votes
GET  /rounds/{id}/result

POST /admin/login
GET  /admin/dashboard
GET  /admin/rooms
PATCH /admin/rooms/{id}
DELETE /admin/rooms/{id}
GET  /admin/players
PATCH /admin/players/{id}
DELETE /admin/players/{id}
GET  /admin/users
POST /admin/users
PATCH /admin/users/{id}

GET  /questions
POST /questions
PATCH /questions/{id}
DELETE /questions/{id}
POST /questions/import

GET  /categories
POST /categories
PATCH /categories/{id}
DELETE /categories/{id}
```

## Banco de dados

O schema inicial cria estas tabelas:

- `rooms`
- `players`
- `questions`
- `categories`
- `admin_users`
- `rounds`
- `votes`
- `round_winners`

Os seeds iniciais carregam categorias, perguntas e um admin padrao.

## Importacao de perguntas

O endpoint `POST /questions/import` aceita:

- upload de arquivo `.csv`
- upload de arquivo `.json`
- JSON com `questions: []`
- CSV bruto no campo `csv`

Exemplo de CSV:

```csv
text,category,level
Quem fez isso no role?,festa,leve
Quem fez isso no improviso?,caos,medio
```

## Exemplo de sala

```json
{
  "name": "Noite de Jogos",
  "maxPlayers": 6,
  "maxScore": 5,
  "gameMode": "classic",
  "voteVisibility": "anonymous",
  "voteTimeEnabled": true,
  "voteTimeSeconds": 30,
  "categoryFilter": "festa"
}
```

## Notas de uso

- O admin nao aparece na navegacao principal do jogo.
- O acesso ao admin deve ser feito por URL direta.
- O backend usa autenticao com header `Authorization` nas rotas protegidas do admin.
- O tempo de voto tem limite de 60 segundos para evitar configuracoes exageradas.

- Migrar perguntas antigas para categorias cadastradas quando houver padronizacao final dos nomes.
- Permitir selecionar categorias por checkbox em vez de select multiplo.

