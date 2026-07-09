<?php

declare(strict_types=1);

namespace App\DAO;

use PDO;

final class PlayerAccountDAO
{
    public function __construct(private readonly PDO $db)
    {
    }

    public function ensureSchema(): void
    {
        $this->db->exec(
            "CREATE TABLE IF NOT EXISTS player_accounts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(80) NOT NULL UNIQUE,
                email VARCHAR(120) NOT NULL UNIQUE,
                name VARCHAR(120) NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )"
        );
    }

    public function create(array $data): array
    {
        $stmt = $this->db->prepare(
            'INSERT INTO player_accounts (username, email, name, password_hash, is_active)
             VALUES (:username, :email, :name, :password_hash, :is_active)'
        );
        $stmt->execute([
            'username' => $data['username'],
            'email' => $data['email'],
            'name' => $data['name'],
            'password_hash' => $data['passwordHash'],
            'is_active' => $data['isActive'] ? 1 : 0,
        ]);

        return $this->find((int) $this->db->lastInsertId());
    }

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM player_accounts WHERE id = :id');
        $stmt->execute(['id' => $id]);
        return $stmt->fetch() ?: null;
    }

    public function findByIdentifier(string $identifier): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT * FROM player_accounts
             WHERE username = :identifier OR email = :identifier
             LIMIT 1'
        );
        $stmt->execute(['identifier' => $identifier]);
        return $stmt->fetch() ?: null;
    }

    public function findByIdentifierExceptId(string $identifier, int $excludeId): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT * FROM player_accounts
             WHERE (username = :identifier OR email = :identifier)
               AND id != :exclude_id
             LIMIT 1'
        );
        $stmt->execute([
            'identifier' => $identifier,
            'exclude_id' => $excludeId,
        ]);
        return $stmt->fetch() ?: null;
    }

    public function update(int $id, array $data): ?array
    {
        $sets = [];
        $params = ['id' => $id];

        foreach ($data as $column => $value) {
            $sets[] = "{$column} = :{$column}";
            $params[$column] = $value;
        }

        if ($sets === []) {
            return $this->find($id);
        }

        $stmt = $this->db->prepare('UPDATE player_accounts SET ' . implode(', ', $sets) . ' WHERE id = :id');
        $stmt->execute($params);
        return $this->find($id);
    }
}
