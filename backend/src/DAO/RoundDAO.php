<?php

declare(strict_types=1);

namespace App\DAO;

use PDO;

final class RoundDAO
{
    public function __construct(private readonly PDO $db)
    {
    }

    public function create(int $roomId, int $questionId, int $roundNumber): array
    {
        $stmt = $this->db->prepare(
            'INSERT INTO rounds (room_id, question_id, round_number) VALUES (:room_id, :question_id, :round_number)'
        );
        $stmt->execute(['room_id' => $roomId, 'question_id' => $questionId, 'round_number' => $roundNumber]);
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
}
