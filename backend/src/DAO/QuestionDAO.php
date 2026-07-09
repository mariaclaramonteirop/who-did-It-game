<?php

declare(strict_types=1);

namespace App\DAO;

use PDO;

final class QuestionDAO
{
    public function __construct(private readonly PDO $db)
    {
    }

    public function create(array $data): array
    {
        $stmt = $this->db->prepare('INSERT INTO questions (text, category, level) VALUES (:text, :category, :level)');
        $stmt->execute([
            'text' => $data['text'],
            'category' => $data['category'] ?? 'geral',
            'level' => $data['level'] ?? 'leve',
        ]);
        return $this->find((int) $this->db->lastInsertId());
    }

    public function createMany(array $questions): int
    {
        $stmt = $this->db->prepare('INSERT INTO questions (text, category, level) VALUES (:text, :category, :level)');
        $count = 0;
        foreach ($questions as $question) {
            $stmt->execute([
                'text' => $question['text'],
                'category' => $question['category'] ?? 'geral',
                'level' => $question['level'] ?? 'leve',
            ]);
            $count++;
        }

        return $count;
    }

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM questions WHERE id = :id');
        $stmt->execute(['id' => $id]);
        return $stmt->fetch() ?: null;
    }

    public function list(bool $includeInactive = false): array
    {
        $where = $includeInactive ? '' : 'WHERE is_active = 1';
        return $this->db->query("SELECT * FROM questions {$where} ORDER BY is_active DESC, category, text")->fetchAll();
    }

    public function update(int $id, array $data): ?array
    {
        $stmt = $this->db->prepare(
            'UPDATE questions
             SET text = :text, category = :category, level = :level, is_active = :is_active
             WHERE id = :id'
        );
        $stmt->execute([
            'id' => $id,
            'text' => $data['text'],
            'category' => $data['category'],
            'level' => $data['level'],
            'is_active' => $data['isActive'] ? 1 : 0,
        ]);

        return $this->find($id);
    }

    public function setActive(int $id, bool $isActive): ?array
    {
        $stmt = $this->db->prepare('UPDATE questions SET is_active = :is_active WHERE id = :id');
        $stmt->execute(['id' => $id, 'is_active' => $isActive ? 1 : 0]);
        return $this->find($id);
    }

    public function randomUnusedForRoom(int $roomId, string $categoryFilter): ?array
    {
        $categorySql = $categoryFilter === 'all' ? '' : 'AND q.category = :category';
        $stmt = $this->db->prepare(
            "SELECT q.* FROM questions q
             WHERE q.is_active = 1
             {$categorySql}
             AND q.id NOT IN (SELECT question_id FROM rounds WHERE room_id = :room_id)
             ORDER BY RAND()
             LIMIT 1"
        );
        $params = ['room_id' => $roomId];
        if ($categoryFilter !== 'all') {
            $params['category'] = $categoryFilter;
        }
        $stmt->execute($params);
        return $stmt->fetch() ?: null;
    }
}
