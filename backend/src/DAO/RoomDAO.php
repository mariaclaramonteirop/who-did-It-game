<?php

declare(strict_types=1);

namespace App\DAO;

use PDO;

final class RoomDAO
{
    public function __construct(private readonly PDO $db)
    {
    }

    public function create(array $data, string $code): array
    {
        $stmt = $this->db->prepare(
            'INSERT INTO rooms (code, name, max_players, max_score, game_mode, vote_visibility, category_filter)
             VALUES (:code, :name, :max_players, :max_score, :game_mode, :vote_visibility, :category_filter)'
        );
        $stmt->execute([
            'code' => $code,
            'name' => $data['name'],
            'max_players' => $data['maxPlayers'],
            'max_score' => $data['maxScore'],
            'game_mode' => $data['gameMode'],
            'vote_visibility' => $data['voteVisibility'],
            'category_filter' => $data['categoryFilter'],
        ]);

        return $this->findByCode($code);
    }

    public function findByCode(string $code): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM rooms WHERE code = :code');
        $stmt->execute(['code' => $code]);
        return $stmt->fetch() ?: null;
    }

    public function updateStatus(int $roomId, string $status): void
    {
        $stmt = $this->db->prepare('UPDATE rooms SET status = :status WHERE id = :id');
        $stmt->execute(['status' => $status, 'id' => $roomId]);
    }

    public function codeExists(string $code): bool
    {
        $stmt = $this->db->prepare('SELECT 1 FROM rooms WHERE code = :code');
        $stmt->execute(['code' => $code]);
        return (bool) $stmt->fetchColumn();
    }
}
