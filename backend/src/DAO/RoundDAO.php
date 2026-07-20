<?php

declare(strict_types=1);

namespace App\DAO;

use PDO;

final class RoundDAO
{
    public function __construct(private readonly PDO $db)
    {
    }

    public function ensureSchema(): void
    {
        $this->db->exec(
            "CREATE TABLE IF NOT EXISTS rounds (
                id INT AUTO_INCREMENT PRIMARY KEY,
                room_id INT NOT NULL,
                question_id INT NOT NULL,
                round_number INT NOT NULL,
                vote_deadline_at DATETIME NULL,
                status ENUM('waiting_votes','finished') DEFAULT 'waiting_votes',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
                FOREIGN KEY (question_id) REFERENCES questions(id),
                UNIQUE (room_id, question_id)
            )"
        );

        $this->addColumnIfMissing(
            'rounds',
            'vote_deadline_at',
            "ALTER TABLE rounds ADD COLUMN vote_deadline_at DATETIME NULL AFTER round_number"
        );
    }

    public function create(int $roomId, int $questionId, int $roundNumber, ?string $voteDeadlineAt = null): array
    {
        $stmt = $this->db->prepare(
            'INSERT INTO rounds (room_id, question_id, round_number, vote_deadline_at)
             VALUES (:room_id, :question_id, :round_number, :vote_deadline_at)'
        );
        $stmt->execute([
            'room_id' => $roomId,
            'question_id' => $questionId,
            'round_number' => $roundNumber,
            'vote_deadline_at' => $voteDeadlineAt,
        ]);
        return $this->find((int) $this->db->lastInsertId());
    }

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT r.*, q.text AS question_text, q.category AS question_category, q.level AS question_level
             FROM rounds r JOIN questions q ON q.id = r.question_id WHERE r.id = :id'
        );
        $stmt->execute(['id' => $id]);
        return $stmt->fetch() ?: null;
    }

    public function nextNumber(int $roomId): int
    {
        $stmt = $this->db->prepare('SELECT COALESCE(MAX(round_number), 0) + 1 FROM rounds WHERE room_id = :room_id');
        $stmt->execute(['room_id' => $roomId]);
        return (int) $stmt->fetchColumn();
    }

    public function finish(int $roundId): void
    {
        $stmt = $this->db->prepare("UPDATE rounds SET status = 'finished' WHERE id = :id");
        $stmt->execute(['id' => $roundId]);
    }

    public function updateVoteDeadline(int $roundId, ?string $voteDeadlineAt): void
    {
        $stmt = $this->db->prepare('UPDATE rounds SET vote_deadline_at = :vote_deadline_at WHERE id = :id');
        $stmt->execute([
            'id' => $roundId,
            'vote_deadline_at' => $voteDeadlineAt,
        ]);
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
