<?php

declare(strict_types=1);

namespace App\Services;

use App\DAO\PlayerDAO;
use App\DAO\QuestionDAO;
use App\DAO\RoomDAO;
use App\DAO\RoundDAO;
use App\DAO\VoteDAO;
use App\Exceptions\HttpException;
use App\Models\Room;
use App\Models\Round;
use PDO;
use Throwable;

final class GameService
{
    private RoomDAO $rooms;
    private PlayerDAO $players;
    private QuestionDAO $questions;
    private RoundDAO $rounds;
    private VoteDAO $votes;

    public function __construct(private readonly PDO $db)
    {
        $this->rooms = new RoomDAO($db);
        $this->players = new PlayerDAO($db);
        $this->questions = new QuestionDAO($db);
        $this->rounds = new RoundDAO($db);
        $this->votes = new VoteDAO($db);
    }

    public function createRoom(array $payload): array
    {
        $name = trim((string) ($payload['name'] ?? ''));
        $maxPlayers = (int) ($payload['maxPlayers'] ?? 6);
        $maxScore = (int) ($payload['maxScore'] ?? 5);

        if ($name === '') {
            throw new HttpException(422, 'Informe o nome da sala.');
        }
        if ($maxPlayers < 3 || $maxPlayers > 20) {
            throw new HttpException(422, 'A sala deve permitir entre 3 e 20 jogadores.');
        }
        if ($maxScore < 1 || $maxScore > 30) {
            throw new HttpException(422, 'A pontuacao final deve ficar entre 1 e 30.');
        }

        $data = [
            'name' => $name,
            'maxPlayers' => $maxPlayers,
            'maxScore' => $maxScore,
            'gameMode' => $payload['gameMode'] ?? 'classic',
            'voteVisibility' => $payload['voteVisibility'] ?? 'anonymous',
            'categoryFilter' => $payload['categoryFilter'] ?? 'all',
        ];

        return $this->formatRoom($this->rooms->create($data, $this->generateCode()));
    }

    public function getRoom(string $code): array
    {
        $room = $this->requireRoom($code);
        return [
            ...$this->formatRoom($room),
            'players' => $this->formatPlayers($this->players->listByRoom((int) $room['id'])),
        ];
    }

    public function addPlayer(string $code, array $payload): array
    {
        $room = $this->requireRoom($code);
        if ($room['status'] !== Room::WAITING_PLAYERS && $room['status'] !== Room::READY) {
            throw new HttpException(409, 'Nao e possivel adicionar jogadores com a partida em andamento.');
        }

        $name = trim((string) ($payload['name'] ?? ''));
        if ($name === '') {
            throw new HttpException(422, 'Informe o nome do jogador.');
        }

        $currentPlayers = $this->players->listByRoom((int) $room['id']);
        if (count($currentPlayers) >= (int) $room['max_players']) {
            throw new HttpException(409, 'A sala ja atingiu o limite de jogadores.');
        }
        foreach ($currentPlayers as $player) {
            if (strtolower($player['name']) === strtolower($name)) {
                throw new HttpException(409, 'Ja existe um jogador com esse nome na sala.');
            }
        }

        $player = $this->players->create((int) $room['id'], $name, count($currentPlayers) === 0);
        $newCount = count($currentPlayers) + 1;
        if ($newCount >= 3 && $room['status'] === Room::WAITING_PLAYERS) {
            $this->rooms->updateStatus((int) $room['id'], Room::READY);
        }

        return $this->formatPlayer($player);
    }

    public function startRoom(string $code): array
    {
        $room = $this->requireRoom($code);
        if ($room['status'] === Room::FINISHED) {
            throw new HttpException(409, 'Esta partida ja foi finalizada.');
        }
        if ($this->players->countByRoom((int) $room['id']) < 3) {
            throw new HttpException(422, 'A sala precisa de pelo menos 3 jogadores para iniciar.');
        }

        $this->rooms->updateStatus((int) $room['id'], Room::IN_PROGRESS);
        return $this->getRoom($code);
    }

    public function createRound(string $code): array
    {
        $room = $this->requireRoom($code);
        if ($room['status'] !== Room::IN_PROGRESS) {
            throw new HttpException(409, 'A partida precisa estar em andamento para criar rodada.');
        }

        $question = $this->questions->randomUnusedForRoom((int) $room['id'], $room['category_filter']);
        if ($question === null) {
            throw new HttpException(409, 'Nao ha perguntas disponiveis para esta sala.');
        }

        $round = $this->rounds->create(
            (int) $room['id'],
            (int) $question['id'],
            $this->rounds->nextNumber((int) $room['id'])
        );

        return $this->formatRound($this->rounds->find((int) $round['id']));
    }

    public function getRound(int $roundId): array
    {
        return $this->formatRound($this->requireRound($roundId));
    }

    public function registerVote(int $roundId, array $payload): array
    {
        $round = $this->requireRound($roundId);
        if ($round['status'] !== Round::WAITING_VOTES) {
            throw new HttpException(409, 'Esta rodada nao esta recebendo votos.');
        }

        $voterId = (int) ($payload['voterPlayerId'] ?? 0);
        $votedId = (int) ($payload['votedPlayerId'] ?? 0);
        if ($voterId <= 0 || $votedId <= 0) {
            throw new HttpException(422, 'Informe o jogador votante e o jogador votado.');
        }
        if ($voterId === $votedId) {
            throw new HttpException(422, 'Um jogador nao pode votar em si mesmo.');
        }
        if (!$this->players->findInRoom($voterId, (int) $round['room_id']) || !$this->players->findInRoom($votedId, (int) $round['room_id'])) {
            throw new HttpException(422, 'Os jogadores precisam pertencer a mesma sala da rodada.');
        }

        try {
            $this->votes->create($roundId, $voterId, $votedId);
        } catch (Throwable) {
            throw new HttpException(409, 'Este jogador ja votou nesta rodada.');
        }

        $votesReceived = $this->votes->countByRound($roundId);
        $totalPlayers = $this->players->countByRoom((int) $round['room_id']);

        return [
            'message' => 'Voto registrado.',
            'votesReceived' => $votesReceived,
            'totalPlayers' => $totalPlayers,
            'allVotesReceived' => $votesReceived >= $totalPlayers,
        ];
    }

    public function getRoundResult(int $roundId): array
    {
        $round = $this->requireRound($roundId);
        $totalPlayers = $this->players->countByRoom((int) $round['room_id']);
        $votesReceived = $this->votes->countByRound($roundId);
        if ($votesReceived < $totalPlayers) {
            throw new HttpException(409, 'O resultado so pode ser fechado quando todos os jogadores votarem.');
        }

        if ($round['status'] !== Round::FINISHED) {
            $this->closeRound($round, $roundId);
        }

        $updatedRound = $this->requireRound($roundId);
        $room = $this->roomById((int) $updatedRound['room_id']);
        $results = $this->votes->resultsByRound($roundId);
        $winners = $this->votes->winnersByRound($roundId);

        return [
            'roundId' => (int) $updatedRound['id'],
            'roundNumber' => (int) $updatedRound['round_number'],
            'question' => $updatedRound['question_text'],
            'results' => array_map(fn (array $row) => [
                'playerId' => (int) $row['player_id'],
                'name' => $row['name'],
                'votesReceived' => (int) $row['votes_received'],
                'score' => (int) $row['score'],
            ], $results),
            'winners' => array_map(fn (array $row) => [
                'playerId' => (int) $row['player_id'],
                'name' => $row['name'],
                'votesReceived' => (int) $row['votes_received'],
            ], $winners),
            'gameFinished' => $room['status'] === Room::FINISHED,
            'ranking' => $this->ranking($room['code']),
        ];
    }

    public function ranking(string $code): array
    {
        $room = $this->requireRoom($code);
        return $this->formatPlayers($this->players->listByRoom((int) $room['id']));
    }

    public function listQuestions(bool $includeInactive = false): array
    {
        return array_map(fn (array $question) => [
            'id' => (int) $question['id'],
            'text' => $question['text'],
            'category' => $question['category'],
            'level' => $question['level'],
            'isActive' => (bool) $question['is_active'],
        ], $this->questions->list($includeInactive));
    }

    public function createQuestion(array $payload): array
    {
        $text = trim((string) ($payload['text'] ?? ''));
        if ($text === '') {
            throw new HttpException(422, 'Informe o texto da pergunta.');
        }
        return $this->formatQuestion($this->questions->create([
            'text' => $text,
            'category' => trim((string) ($payload['category'] ?? 'geral')) ?: 'geral',
            'level' => $payload['level'] ?? 'leve',
        ]));
    }

    public function updateQuestion(int $id, array $payload): array
    {
        $current = $this->questions->find($id);
        if ($current === null) {
            throw new HttpException(404, 'Pergunta nao encontrada.');
        }

        $text = trim((string) ($payload['text'] ?? $current['text']));
        if ($text === '') {
            throw new HttpException(422, 'Informe o texto da pergunta.');
        }

        $question = $this->questions->update($id, [
            'text' => $text,
            'category' => trim((string) ($payload['category'] ?? $current['category'])) ?: 'geral',
            'level' => $payload['level'] ?? $current['level'],
            'isActive' => array_key_exists('isActive', $payload) ? (bool) $payload['isActive'] : (bool) $current['is_active'],
        ]);

        return $this->formatQuestion($question);
    }

    public function setQuestionActive(int $id, bool $isActive): array
    {
        if ($this->questions->find($id) === null) {
            throw new HttpException(404, 'Pergunta nao encontrada.');
        }

        return $this->formatQuestion($this->questions->setActive($id, $isActive));
    }

    private function closeRound(array $round, int $roundId): void
    {
        $this->db->beginTransaction();
        try {
            $results = $this->votes->resultsByRound($roundId);
            $maxVotes = max(array_map(fn (array $row) => (int) $row['votes_received'], $results));
            $winners = array_filter($results, fn (array $row) => (int) $row['votes_received'] === $maxVotes);

            foreach ($winners as $winner) {
                $this->players->addPoint((int) $winner['player_id']);
                $this->votes->storeWinner($roundId, (int) $winner['player_id'], (int) $winner['votes_received']);
            }
            $this->rounds->finish($roundId);

            $room = $this->roomById((int) $round['room_id']);
            $ranking = $this->players->listByRoom((int) $round['room_id']);
            if ((int) $ranking[0]['score'] >= (int) $room['max_score']) {
                $this->rooms->updateStatus((int) $room['id'], Room::FINISHED);
            }

            $this->db->commit();
        } catch (Throwable $exception) {
            $this->db->rollBack();
            throw $exception;
        }
    }

    private function generateCode(): string
    {
        do {
            $code = (string) random_int(1000, 9999);
        } while ($this->rooms->codeExists($code));

        return $code;
    }

    private function requireRoom(string $code): array
    {
        $room = $this->rooms->findByCode(strtoupper(trim($code)));
        if ($room === null) {
            throw new HttpException(404, 'Sala nao encontrada.');
        }
        return $room;
    }

    private function requireRound(int $roundId): array
    {
        $round = $this->rounds->find($roundId);
        if ($round === null) {
            throw new HttpException(404, 'Rodada nao encontrada.');
        }
        return $round;
    }

    private function roomById(int $roomId): array
    {
        $stmt = $this->db->prepare('SELECT * FROM rooms WHERE id = :id');
        $stmt->execute(['id' => $roomId]);
        return $stmt->fetch();
    }

    private function formatRoom(array $room): array
    {
        return [
            'roomId' => (int) $room['id'],
            'code' => $room['code'],
            'name' => $room['name'],
            'status' => $room['status'],
            'maxPlayers' => (int) $room['max_players'],
            'maxScore' => (int) $room['max_score'],
            'gameMode' => $room['game_mode'],
            'voteVisibility' => $room['vote_visibility'],
            'categoryFilter' => $room['category_filter'],
        ];
    }

    private function formatPlayer(array $player): array
    {
        return [
            'id' => (int) $player['id'],
            'name' => $player['name'],
            'score' => (int) $player['score'],
            'isHost' => (bool) $player['is_host'],
        ];
    }

    private function formatQuestion(array $question): array
    {
        return [
            'id' => (int) $question['id'],
            'text' => $question['text'],
            'category' => $question['category'],
            'level' => $question['level'],
            'isActive' => (bool) $question['is_active'],
        ];
    }

    private function formatPlayers(array $players): array
    {
        return array_map(fn (array $player) => $this->formatPlayer($player), $players);
    }

    private function formatRound(array $round): array
    {
        $players = $this->players->listByRoom((int) $round['room_id']);
        return [
            'roundId' => (int) $round['id'],
            'roundNumber' => (int) $round['round_number'],
            'status' => $round['status'],
            'question' => [
                'id' => (int) $round['question_id'],
                'text' => $round['question_text'],
                'category' => $round['question_category'],
                'level' => $round['question_level'],
            ],
            'players' => array_map(fn (array $player) => [
                'id' => (int) $player['id'],
                'name' => $player['name'],
                'score' => (int) $player['score'],
            ], $players),
            'votesReceived' => $this->votes->countByRound((int) $round['id']),
            'totalPlayers' => count($players),
        ];
    }
}
