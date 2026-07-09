<?php

declare(strict_types=1);

namespace App\DAO;

use PDO;

final class CategoryDAO
{
    public function __construct(private readonly PDO $db)
    {
    }

    public function ensureSchema(): void
    {
        $this->db->exec(
            "CREATE TABLE IF NOT EXISTS categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                slug VARCHAR(100) NOT NULL UNIQUE,
                name VARCHAR(100) NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )"
        );

        $defaults = [
            ['slug' => 'amizade', 'name' => 'Amizade'],
            ['slug' => 'cotidiano', 'name' => 'Cotidiano'],
            ['slug' => 'festa', 'name' => 'Festa'],
            ['slug' => 'aventura', 'name' => 'Aventura'],
            ['slug' => 'caos', 'name' => 'Caos'],
            ['slug' => 'geral', 'name' => 'Geral'],
        ];

        $stmt = $this->db->prepare('INSERT IGNORE INTO categories (slug, name) VALUES (:slug, :name)');
        foreach ($defaults as $category) {
            $stmt->execute($category);
        }
    }

    public function list(bool $includeInactive = false): array
    {
        $where = $includeInactive ? '' : 'WHERE is_active = 1';
        return $this->db->query("SELECT * FROM categories {$where} ORDER BY is_active DESC, name ASC")->fetchAll();
    }

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM categories WHERE id = :id');
        $stmt->execute(['id' => $id]);
        return $stmt->fetch() ?: null;
    }

    public function findBySlug(string $slug): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM categories WHERE slug = :slug');
        $stmt->execute(['slug' => $slug]);
        return $stmt->fetch() ?: null;
    }

    public function create(array $data): array
    {
        $stmt = $this->db->prepare('INSERT INTO categories (slug, name) VALUES (:slug, :name)');
        $stmt->execute([
            'slug' => $data['slug'],
            'name' => $data['name'],
        ]);
        return $this->find((int) $this->db->lastInsertId());
    }

    public function update(int $id, array $data): ?array
    {
        $stmt = $this->db->prepare(
            'UPDATE categories SET slug = :slug, name = :name, is_active = :is_active WHERE id = :id'
        );
        $stmt->execute([
            'id' => $id,
            'slug' => $data['slug'],
            'name' => $data['name'],
            'is_active' => $data['isActive'] ? 1 : 0,
        ]);

        return $this->find($id);
    }

    public function setActive(int $id, bool $isActive): ?array
    {
        $stmt = $this->db->prepare('UPDATE categories SET is_active = :is_active WHERE id = :id');
        $stmt->execute(['id' => $id, 'is_active' => $isActive ? 1 : 0]);
        return $this->find($id);
    }
}
