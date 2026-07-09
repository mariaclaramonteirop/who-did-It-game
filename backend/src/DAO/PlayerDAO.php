<?php

declare(strict_types=1);

namespace App\DAO;

use PDO;

final class PlayerDAO
{
    public function __construct(private readonly PDO $db)
    {
    }

    public function create(int $roomId, string $name, bool $isHost): array
    {
        $stmt = $this->db->prepare('INSERT INTO players (room_id, name, is_host) VALUES (:room_id, :name, :is_host)');
        $stmt->execute(['room_id' => $roomId, 'name' => $name, 'is_host' => $isHost ? 1 : 0]);
        return $this->find((int) $this->db->lastInsertId());
    }

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM players WHERE id = :id');
        $stmt->execute(['id' => $id]);
        return $stmt->fetch() ?: null;
    }

    public function findInRoom(int $playerId, int $roomId): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM players WHERE id = :id AND room_id = :room_id');
        $stmt->execute(['id' => $playerId, 'room_id' => $roomId]);
        return $stmt->fetch() ?: null;
    }

    public function listByRoom(int $roomId): array
    {
        $stmt = $this->db->prepare('SELECT * FROM players WHERE room_id = :room_id ORDER BY score DESC, name ASC');
        $stmt->execute(['room_id' => $roomId]);
        return $stmt->fetchAll();
    }

    public function listAll(): array
    {
        return $this->db->query(
            'SELECT p.*, r.code AS room_code, r.name AS room_name
             FROM players p
             JOIN rooms r ON r.id = p.room_id
             ORDER BY p.created_at DESC'
        )->fetchAll();
    }

    public function update(int $id, array $data): ?array
    {
        $stmt = $this->db->prepare(
            'UPDATE players
             SET name = :name, score = :score, is_host = :is_host
             WHERE id = :id'
        );
        $stmt->execute([
            'id' => $id,
            'name' => $data['name'],
            'score' => $data['score'],
            'is_host' => $data['isHost'] ? 1 : 0,
        ]);

        return $this->find($id);
    }

    public function countByRoom(int $roomId): int
    {
        $stmt = $this->db->prepare('SELECT COUNT(*) FROM players WHERE room_id = :room_id');
        $stmt->execute(['room_id' => $roomId]);
        return (int) $stmt->fetchColumn();
    }

    public function addPoint(int $playerId): void
    {
        $stmt = $this->db->prepare('UPDATE players SET score = score + 1 WHERE id = :id');
        $stmt->execute(['id' => $playerId]);
    }

    public function delete(int $id): void
    {
        $stmt = $this->db->prepare('DELETE FROM players WHERE id = :id');
        $stmt->execute(['id' => $id]);
    }
}
