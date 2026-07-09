<?php

declare(strict_types=1);

namespace App\Services;

use App\DAO\AdminUserDAO;
use App\DAO\PlayerDAO;
use App\DAO\CategoryDAO;
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
    private const ADMIN_PERMISSIONS = ['questions', 'categories', 'rooms', 'players', 'admins'];

    private AdminUserDAO $adminUsers;
    private RoomDAO $rooms;
    private PlayerDAO $players;
    private CategoryDAO $categories;
    private QuestionDAO $questions;
    private RoundDAO $rounds;
    private VoteDAO $votes;

    public function __construct(private readonly PDO $db)
    {
        $this->adminUsers = new AdminUserDAO($db);
        $this->adminUsers->ensureSchema(
            $this->env('ADMIN_USERNAME', 'admin'),
            password_hash($this->env('ADMIN_PASSWORD', 'admin123'), PASSWORD_DEFAULT)
        );
        $this->rooms = new RoomDAO($db);
        $this->players = new PlayerDAO($db);
        $this->categories = new CategoryDAO($db);
        $this->categories->ensureSchema();
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
            'categoryFilter' => $this->normalizeCategoryFilter($payload['categoryFilter'] ?? 'all'),
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

    public function adminLogin(array $payload): array
    {
        $username = trim((string) ($payload['username'] ?? ''));
        $password = (string) ($payload['password'] ?? '');
        if ($username === '' || $password === '') {
            throw new HttpException(422, 'Informe usuario e senha.');
        }

        $admin = $this->adminUsers->findByUsername($username);
        if ($admin === null || !(bool) $admin['is_active'] || !password_verify($password, $admin['password_hash'])) {
            throw new HttpException(401, 'Credenciais invalidas.');
        }

        $formatted = $this->formatAdminUser($admin);
        return [
            'token' => $this->createAdminToken((int) $admin['id']),
            'user' => $formatted,
        ];
    }

    public function requireAdmin(string $authorization, string $permission): array
    {
        if (!preg_match('/^Bearer\s+(.+)$/i', trim($authorization), $matches)) {
            throw new HttpException(401, 'Login de admin obrigatorio.');
        }

        $payload = $this->decodeAdminToken($matches[1]);
        $admin = $this->adminUsers->find((int) ($payload['id'] ?? 0));
        if ($admin === null || !(bool) $admin['is_active']) {
            throw new HttpException(401, 'Sessao de admin invalida.');
        }

        $permissions = $this->adminPermissions($admin);
        if ($permission !== 'dashboard' && !in_array('all', $permissions, true) && !in_array($permission, $permissions, true)) {
            throw new HttpException(403, 'Sem permissao para acessar este recurso.');
        }

        return $admin;
    }

    public function adminDashboard(): array
    {
        $rooms = $this->rooms->listAll();
        $players = $this->players->listAll();
        $questions = $this->questions->list(true);
        $admins = $this->adminUsers->list();
        $winners = $this->recentWinners();

        return [
            'totals' => [
                'rooms' => count($rooms),
                'activeRooms' => count(array_filter($rooms, fn (array $room) => $room['status'] !== Room::FINISHED)),
                'players' => count($players),
                'questions' => count($questions),
                'activeQuestions' => count(array_filter($questions, fn (array $question) => (bool) $question['is_active'])),
                'categories' => count($this->categories->list(true)),
                'admins' => count($admins),
                'winners' => count($winners),
            ],
            'roomsByStatus' => $this->countByKey($rooms, 'status'),
            'questionsByCategory' => $this->countByKey($questions, 'category'),
            'questionsByLevel' => $this->countByKey($questions, 'level'),
            'adminsByRole' => $this->countByKey($admins, 'role'),
            'adminsByStatus' => array_map(
                fn (array $item) => [
                    'label' => $item['label'] === '1' ? 'Ativo' : 'Inativo',
                    'value' => $item['value'],
                ],
                $this->countByKey($admins, 'is_active')
            ),
            'playersByRoom' => array_slice(array_map(fn (array $room) => [
                'label' => $room['code'] . ' - ' . $room['name'],
                'value' => (int) $room['players_count'],
            ], $rooms), 0, 8),
            'roomsByDate' => $this->countCreatedByDate('rooms'),
            'playersByDate' => $this->countCreatedByDate('players'),
            'questionsByDate' => $this->countCreatedByDate('questions'),
            'winnersByDate' => $this->countCreatedByDate('round_winners'),
            'adminsByDate' => $this->countCreatedByDate('admin_users'),
            'recentRooms' => $this->recentRows('rooms', 8),
            'recentPlayers' => $this->recentRows('players', 8),
            'recentQuestions' => $this->recentRows('questions', 8),
            'recentAdmins' => $this->recentRows('admin_users', 8),
            'recentWinners' => $winners,
        ];
    }

    public function adminListRooms(): array
    {
        return array_map(fn (array $room) => [
            ...$this->formatRoom($room),
            'playersCount' => (int) ($room['players_count'] ?? 0),
            'createdAt' => $room['created_at'] ?? null,
            'updatedAt' => $room['updated_at'] ?? null,
        ], $this->rooms->listAll());
    }

    public function adminUpdateRoom(int $id, array $payload): array
    {
        $current = $this->rooms->find($id);
        if ($current === null) {
            throw new HttpException(404, 'Sala nao encontrada.');
        }

        $name = trim((string) ($payload['name'] ?? $current['name']));
        $status = (string) ($payload['status'] ?? $current['status']);
        $maxPlayers = (int) ($payload['maxPlayers'] ?? $current['max_players']);
        $maxScore = (int) ($payload['maxScore'] ?? $current['max_score']);
        if ($name === '') {
            throw new HttpException(422, 'Informe o nome da sala.');
        }
        if (!in_array($status, [Room::WAITING_PLAYERS, Room::READY, Room::IN_PROGRESS, Room::FINISHED], true)) {
            throw new HttpException(422, 'Status de sala invalido.');
        }

        return $this->formatRoom($this->rooms->update($id, [
            'name' => $name,
            'maxPlayers' => max(3, min(20, $maxPlayers)),
            'maxScore' => max(1, min(30, $maxScore)),
            'status' => $status,
            'categoryFilter' => $this->normalizeCategoryFilter($payload['categoryFilter'] ?? $current['category_filter']),
        ]));
    }

    public function adminDeleteRoom(int $id): array
    {
        if ($this->rooms->find($id) === null) {
            throw new HttpException(404, 'Sala nao encontrada.');
        }
        $this->rooms->delete($id);
        return ['deleted' => true];
    }

    public function adminListPlayers(): array
    {
        return array_map(fn (array $player) => $this->formatAdminPlayer($player), $this->players->listAll());
    }

    public function adminUpdatePlayer(int $id, array $payload): array
    {
        $current = $this->players->find($id);
        if ($current === null) {
            throw new HttpException(404, 'Usuario nao encontrado.');
        }

        $name = trim((string) ($payload['name'] ?? $current['name']));
        if ($name === '') {
            throw new HttpException(422, 'Informe o nome do usuario.');
        }

        return $this->formatPlayer($this->players->update($id, [
            'name' => $name,
            'score' => max(0, (int) ($payload['score'] ?? $current['score'])),
            'isHost' => array_key_exists('isHost', $payload) ? (bool) $payload['isHost'] : (bool) $current['is_host'],
        ]));
    }

    public function adminDeletePlayer(int $id): array
    {
        if ($this->players->find($id) === null) {
            throw new HttpException(404, 'Usuario nao encontrado.');
        }
        $this->players->delete($id);
        return ['deleted' => true];
    }

    public function adminListUsers(): array
    {
        return array_map(fn (array $admin) => $this->formatAdminUser($admin), $this->adminUsers->list());
    }

    public function adminCreateUser(array $payload): array
    {
        $username = $this->normalizeUsername($payload['username'] ?? '');
        $name = trim((string) ($payload['name'] ?? $username));
        $password = (string) ($payload['password'] ?? '');
        if ($username === '' || $name === '' || strlen($password) < 6) {
            throw new HttpException(422, 'Informe nome, usuario e senha com pelo menos 6 caracteres.');
        }
        if ($this->adminUsers->findByUsername($username) !== null) {
            throw new HttpException(409, 'Ja existe um admin com esse usuario.');
        }

        return $this->formatAdminUser($this->adminUsers->create([
            'username' => $username,
            'name' => $name,
            'passwordHash' => password_hash($password, PASSWORD_DEFAULT),
            'role' => $this->normalizeRole($payload['role'] ?? 'manager'),
            'permissions' => $this->normalizePermissions($payload['permissions'] ?? ['questions', 'categories']),
            'isActive' => true,
        ]));
    }

    public function adminUpdateUser(int $id, array $payload): array
    {
        $current = $this->adminUsers->find($id);
        if ($current === null) {
            throw new HttpException(404, 'Admin nao encontrado.');
        }

        $data = [];
        if (array_key_exists('name', $payload)) {
            $name = trim((string) $payload['name']);
            if ($name === '') {
                throw new HttpException(422, 'Informe o nome do admin.');
            }
            $data['name'] = $name;
        }
        if (array_key_exists('role', $payload)) {
            $data['role'] = $this->normalizeRole($payload['role']);
        }
        if (array_key_exists('permissions', $payload)) {
            $data['permissions'] = json_encode($this->normalizePermissions($payload['permissions']), JSON_UNESCAPED_UNICODE);
        }
        if (array_key_exists('isActive', $payload)) {
            $data['is_active'] = (bool) $payload['isActive'] ? 1 : 0;
        }
        if (!empty($payload['password'])) {
            if (strlen((string) $payload['password']) < 6) {
                throw new HttpException(422, 'A senha precisa ter pelo menos 6 caracteres.');
            }
            $data['password_hash'] = password_hash((string) $payload['password'], PASSWORD_DEFAULT);
        }

        return $this->formatAdminUser($this->adminUsers->update($id, $data));
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

    public function importQuestions(array $questions): array
    {
        $normalized = [];
        foreach ($questions as $index => $question) {
            if (!is_array($question)) {
                throw new HttpException(422, 'Formato invalido na linha ' . ($index + 1) . '.');
            }

            $text = trim((string) ($question['text'] ?? ''));
            if ($text === '') {
                throw new HttpException(422, 'Pergunta vazia na linha ' . ($index + 1) . '.');
            }

            $normalized[] = [
                'text' => $text,
                'category' => trim((string) ($question['category'] ?? 'geral')) ?: 'geral',
                'level' => in_array(($question['level'] ?? 'leve'), ['leve', 'medio', 'pesado', 'caos'], true) ? $question['level'] : 'leve',
            ];
        }

        if ($normalized === []) {
            throw new HttpException(422, 'Envie pelo menos uma pergunta para importacao.');
        }

        $count = $this->questions->createMany($normalized);
        return [
            'imported' => $count,
        ];
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

    public function listCategories(bool $includeInactive = false): array
    {
        return array_map(fn (array $category) => $this->formatCategory($category), $this->categories->list($includeInactive));
    }

    public function createCategory(array $payload): array
    {
        $name = trim((string) ($payload['name'] ?? ''));
        $slug = $this->slugify((string) ($payload['slug'] ?? $name));
        if ($name === '') {
            throw new HttpException(422, 'Informe o nome da categoria.');
        }
        if ($slug === '') {
            throw new HttpException(422, 'Informe um identificador valido para a categoria.');
        }
        if ($this->categories->findBySlug($slug) !== null) {
            throw new HttpException(409, 'Ja existe uma categoria com esse identificador.');
        }

        return $this->formatCategory($this->categories->create([
            'slug' => $slug,
            'name' => $name,
        ]));
    }

    public function updateCategory(int $id, array $payload): array
    {
        $current = $this->categories->find($id);
        if ($current === null) {
            throw new HttpException(404, 'Categoria nao encontrada.');
        }

        $name = trim((string) ($payload['name'] ?? $current['name']));
        $slug = $this->slugify((string) ($payload['slug'] ?? $current['slug']));
        if ($name === '') {
            throw new HttpException(422, 'Informe o nome da categoria.');
        }
        if ($slug === '') {
            throw new HttpException(422, 'Informe um identificador valido para a categoria.');
        }

        $conflict = $this->categories->findBySlug($slug);
        if ($conflict !== null && (int) $conflict['id'] !== $id) {
            throw new HttpException(409, 'Ja existe uma categoria com esse identificador.');
        }

        $category = $this->categories->update($id, [
            'slug' => $slug,
            'name' => $name,
            'isActive' => array_key_exists('isActive', $payload) ? (bool) $payload['isActive'] : (bool) $current['is_active'],
        ]);

        return $this->formatCategory($category);
    }

    public function deactivateCategory(int $id): array
    {
        $current = $this->categories->find($id);
        if ($current === null) {
            throw new HttpException(404, 'Categoria nao encontrada.');
        }

        return $this->formatCategory($this->categories->setActive($id, false));
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
            'createdAt' => $question['created_at'] ?? null,
            'updatedAt' => $question['updated_at'] ?? null,
        ];
    }

    private function formatCategory(array $category): array
    {
        return [
            'id' => (int) $category['id'],
            'slug' => $category['slug'],
            'name' => $category['name'],
            'isActive' => (bool) $category['is_active'],
            'createdAt' => $category['created_at'] ?? null,
            'updatedAt' => $category['updated_at'] ?? null,
        ];
    }

    private function formatAdminUser(array $admin): array
    {
        return [
            'id' => (int) $admin['id'],
            'username' => $admin['username'],
            'name' => $admin['name'],
            'role' => $admin['role'],
            'permissions' => $this->adminPermissions($admin),
            'isActive' => (bool) $admin['is_active'],
            'createdAt' => $admin['created_at'] ?? null,
            'updatedAt' => $admin['updated_at'] ?? null,
        ];
    }

    private function formatAdminPlayer(array $player): array
    {
        return [
            ...$this->formatPlayer($player),
            'roomId' => (int) $player['room_id'],
            'roomCode' => $player['room_code'],
            'roomName' => $player['room_name'],
            'createdAt' => $player['created_at'] ?? null,
            'updatedAt' => $player['updated_at'] ?? null,
        ];
    }

    private function createAdminToken(int $adminId): string
    {
        $payload = [
            'id' => $adminId,
            'exp' => time() + 86400,
        ];
        $body = $this->base64UrlEncode(json_encode($payload, JSON_UNESCAPED_UNICODE));
        $signature = hash_hmac('sha256', $body, $this->adminSecret());
        return $body . '.' . $signature;
    }

    private function decodeAdminToken(string $token): array
    {
        [$body, $signature] = array_pad(explode('.', $token, 2), 2, '');
        if ($body === '' || !hash_equals(hash_hmac('sha256', $body, $this->adminSecret()), $signature)) {
            throw new HttpException(401, 'Sessao de admin invalida.');
        }

        $payload = json_decode(base64_decode(strtr($body, '-_', '+/')) ?: '', true);
        if (!is_array($payload) || (int) ($payload['exp'] ?? 0) < time()) {
            throw new HttpException(401, 'Sessao de admin expirada.');
        }

        return $payload;
    }

    private function adminSecret(): string
    {
        return $this->env('ADMIN_SECRET', 'quem-fez-isso-admin-secret');
    }

    private function env(string $key, string $fallback): string
    {
        $value = $_ENV[$key] ?? getenv($key);
        return is_string($value) && $value !== '' ? $value : $fallback;
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private function adminPermissions(array $admin): array
    {
        $decoded = json_decode((string) ($admin['permissions'] ?? '[]'), true);
        return is_array($decoded) ? array_values(array_filter(array_map('strval', $decoded))) : [];
    }

    private function normalizeUsername(mixed $username): string
    {
        return strtolower(trim((string) $username));
    }

    private function normalizeRole(mixed $role): string
    {
        $role = (string) $role;
        return in_array($role, ['owner', 'manager', 'viewer'], true) ? $role : 'manager';
    }

    private function normalizePermissions(mixed $permissions): array
    {
        $items = is_array($permissions) ? $permissions : explode(',', (string) $permissions);
        $normalized = array_values(array_unique(array_filter(array_map('strval', $items))));
        if (in_array('all', $normalized, true)) {
            return ['all'];
        }

        return array_values(array_intersect($normalized, self::ADMIN_PERMISSIONS));
    }

    private function countByKey(array $rows, string $key): array
    {
        $stats = [];
        foreach ($rows as $row) {
            $label = (string) ($row[$key] ?? 'sem valor');
            $stats[$label] = ($stats[$label] ?? 0) + 1;
        }

        return array_map(fn (string $label, int $value) => compact('label', 'value'), array_keys($stats), $stats);
    }

    private function countCreatedByDate(string $table): array
    {
        if (!in_array($table, ['rooms', 'players', 'questions', 'round_winners', 'admin_users'], true)) {
            throw new HttpException(500, 'Serie de dashboard invalida.');
        }

        $stmt = $this->db->query(
            "SELECT DATE(created_at) AS label, COUNT(*) AS value
             FROM {$table}
             GROUP BY DATE(created_at)
             ORDER BY label ASC
             LIMIT 30"
        );

        return array_map(fn (array $row) => [
            'label' => (string) $row['label'],
            'value' => (int) $row['value'],
        ], $stmt->fetchAll());
    }

    private function recentRows(string $table, int $limit): array
    {
        if (!in_array($table, ['rooms', 'players', 'questions', 'admin_users'], true)) {
            throw new HttpException(500, 'Serie recente invalida.');
        }

        $stmt = $this->db->query(
            "SELECT * FROM {$table}
             ORDER BY created_at DESC
             LIMIT " . max(1, min(20, $limit))
        );

        return array_map(function (array $row) use ($table) {
            return match ($table) {
                'rooms' => [
                    'label' => $row['code'] . ' - ' . $row['name'],
                    'createdAt' => $row['created_at'] ?? null,
                    'updatedAt' => $row['updated_at'] ?? null,
                    'meta' => $row['status'] . ' | ' . $row['max_players'] . ' max',
                ],
                'players' => [
                    'label' => $row['name'],
                    'createdAt' => $row['created_at'] ?? null,
                    'updatedAt' => $row['updated_at'] ?? null,
                    'meta' => 'Sala #' . $row['room_id'] . ' | score ' . $row['score'],
                ],
                'questions' => [
                    'label' => $row['text'],
                    'createdAt' => $row['created_at'] ?? null,
                    'updatedAt' => $row['updated_at'] ?? null,
                    'meta' => $row['category'] . ' | ' . $row['level'],
                ],
                'admin_users' => [
                    'label' => $row['username'],
                    'createdAt' => $row['created_at'] ?? null,
                    'updatedAt' => $row['updated_at'] ?? null,
                    'meta' => $row['role'] . ' | ' . ((bool) $row['is_active'] ? 'ativo' : 'inativo'),
                ],
            };
        }, $stmt->fetchAll());
    }

    private function recentWinners(): array
    {
        $stmt = $this->db->query(
            'SELECT p.id AS player_id, p.name, p.score, r.code AS room_code, r.name AS room_name
             FROM players p
             JOIN rooms r ON r.id = p.room_id
             WHERE p.score > 0
             ORDER BY p.score DESC, p.updated_at DESC
             LIMIT 10'
        );

        return array_map(fn (array $row) => [
            'playerId' => (int) $row['player_id'],
            'name' => $row['name'],
            'score' => (int) $row['score'],
            'roomCode' => $row['room_code'],
            'roomName' => $row['room_name'],
        ], $stmt->fetchAll());
    }

    public function parseQuestionsCsv(string $csv): array
    {
        $lines = preg_split('/\r\n|\n|\r/', trim($csv));
        if (!$lines || count($lines) < 2) {
            throw new HttpException(422, 'CSV precisa ter cabecalho e ao menos uma linha.');
        }

        $header = array_map('trim', str_getcsv(array_shift($lines)));
        $questions = [];
        foreach ($lines as $lineNumber => $line) {
            if (trim($line) === '') {
                continue;
            }

            $row = array_map('trim', str_getcsv($line));
            $assoc = [];
            foreach ($header as $index => $column) {
                $assoc[$column] = $row[$index] ?? '';
            }

            $questions[] = $assoc;
        }

        return $questions;
    }

    private function normalizeCategoryFilter(mixed $value): string
    {
        if (is_array($value)) {
            $items = array_values(array_filter(array_map('trim', $value), fn (string $item) => $item !== ''));
            return $items === [] ? 'all' : implode(',', $items);
        }

        $filter = trim((string) $value);
        return $filter === '' ? 'all' : $filter;
    }

    private function slugify(string $value): string
    {
        $slug = strtolower(trim($value));
        $slug = preg_replace('/[^a-z0-9]+/u', '-', $slug) ?? '';
        return trim($slug, '-');
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
