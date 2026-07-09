<?php

declare(strict_types=1);

namespace App\DAO;

use PDO;

final class RoomDAO
{
    public function __construct(private readonly PDO $db)
    {
    }

    public function ensureSchema(): void
    {
        $this->addColumnIfMissing(
            'rooms',
            'vote_time_enabled',
            "ALTER TABLE rooms ADD COLUMN vote_time_enabled BOOLEAN NOT NULL DEFAULT FALSE AFTER vote_visibility"
        );
        $this->addColumnIfMissing(
            'rooms',
            'vote_time_seconds',
            "ALTER TABLE rooms ADD COLUMN vote_time_seconds INT NULL AFTER vote_time_enabled"
        );
    }

    public function create(array $data, string $code): array
    {
        $stmt = $this->db->prepare(
            'INSERT INTO rooms (code, name, max_players, max_score, game_mode, vote_visibility, vote_time_enabled, vote_time_seconds, category_filter)
             VALUES (:code, :name, :max_players, :max_score, :game_mode, :vote_visibility, :vote_time_enabled, :vote_time_seconds, :category_filter)'
        );
        $stmt->execute([
            'code' => $code,
            'name' => $data['name'],
            'max_players' => $data['maxPlayers'],
            'max_score' => $data['maxScore'],
            'game_mode' => $data['gameMode'],
            'vote_visibility' => $data['voteVisibility'],
            'vote_time_enabled' => $data['voteTimeEnabled'] ? 1 : 0,
            'vote_time_seconds' => $data['voteTimeSeconds'],
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

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM rooms WHERE id = :id');
        $stmt->execute(['id' => $id]);
        return $stmt->fetch() ?: null;
    }

    public function listAll(): array
    {
        return $this->db->query(
            'SELECT r.*, COUNT(p.id) AS players_count
             FROM rooms r
             LEFT JOIN players p ON p.room_id = r.id
             GROUP BY r.id
             ORDER BY r.created_at DESC'
        )->fetchAll();
    }

    public function update(int $id, array $data): ?array
    {
        $stmt = $this->db->prepare(
            'UPDATE rooms
             SET name = :name,
                 max_players = :max_players,
                 max_score = :max_score,
                 status = :status,
                 category_filter = :category_filter
             WHERE id = :id'
        );
        $stmt->execute([
            'id' => $id,
            'name' => $data['name'],
            'max_players' => $data['maxPlayers'],
            'max_score' => $data['maxScore'],
            'status' => $data['status'],
            'category_filter' => $data['categoryFilter'],
        ]);

        return $this->find($id);
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

    public function delete(int $id): void
    {
        $stmt = $this->db->prepare('DELETE FROM rooms WHERE id = :id');
        $stmt->execute(['id' => $id]);
    }

    private function addColumnIfMissing(string $table, string $column, string $sql): void
    {
        if ($this->columnExists($table, $column)) {
            return;
        }

        $this->db->exec($sql);
    }

    private function columnExists(string $table, string $column): bool
    {
        $stmt = $this->db->prepare(
            'SELECT COUNT(*)
             FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = :table_name
               AND COLUMN_NAME = :column_name'
        );
        $stmt->execute([
            'table_name' => $table,
            'column_name' => $column,
        ]);

        return (int) $stmt->fetchColumn() > 0;
    }
}
