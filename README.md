# Quem fez isso? Who Did It?

Sistema web de party game com perguntas aleatorias, votacao entre amigos, contagem de votos, pontuacao por rodada, ranking final e administracao de perguntas.

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
- Area admin para cadastrar, editar, ativar e desativar perguntas
- Importacao em lote de perguntas via CSV ou JSON no admin

## Como rodar

```bash
docker compose up --build
```

Servicos:

- Frontend: http://localhost:5173
- Admin: http://localhost:5173/admin
- Backend: http://localhost:8080
- phpMyAdmin: http://localhost:8081
- MySQL: localhost:3307

## Admin

O admin nao aparece na navegacao do jogo. Ele deve ser acessado diretamente por URL:

```txt
http://localhost:5173/admin
```

No MVP, o admin gerencia perguntas e mostra graficos simples por status, categoria e nivel.
Tambem aceita importacao em lote por arquivo CSV/JSON ou por CSV colado no formulario.

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
GET /questions
POST /questions
PATCH /questions/{id}
DELETE /questions/{id}
POST /questions/import
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
  "categoryFilter": "all"
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
```

## Estrutura

```txt
backend/
  public/
  src/
    Controllers/
    DAO/
    Services/
    Models/
    Routes/
  database/
frontend/
  src/
docker-compose.yml
```

## Proximos passos

- Cadastrar categorias/generos pelo admin em vez de usar texto livre.
- Associar perguntas a categorias cadastradas.
- Permitir escolher categorias/generos ao criar a sala.
- Sortear perguntas respeitando as categorias selecionadas na partida.
- Permitir categorias/generos com gestão propria e filtro na criacao da sala.
