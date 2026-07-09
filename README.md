# Quem fez isso? Who Did It?

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

