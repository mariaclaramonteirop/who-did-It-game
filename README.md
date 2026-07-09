# Jogo dos Culpados

Sistema web de party game com perguntas aleatorias, votacao entre amigos, contagem de votos, pontuacao por rodada e ranking final.

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

## Como rodar

```bash
docker compose up --build
```

Servicos:

- Frontend: http://localhost:5173
- Backend: http://localhost:8080
- phpMyAdmin: http://localhost:8081
- MySQL: localhost:3307

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
