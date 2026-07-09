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

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM questions WHERE id = :id');
        $stmt->execute(['id' => $id]);
        return $stmt->fetch() ?: null;
    }

    public function list(): array
    {
        return $this->db->query('SELECT * FROM questions WHERE is_active = 1 ORDER BY category, text')->fetchAll();
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
