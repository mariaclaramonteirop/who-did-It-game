<?php

declare(strict_types=1);

namespace App\DAO;

use PDO;

final class AdminUserDAO
{
    public function __construct(private readonly PDO $db)
    {
    }

    public function ensureSchema(string $username, string $passwordHash): void
    {
        $this->db->exec(
            "CREATE TABLE IF NOT EXISTS admin_users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(80) NOT NULL UNIQUE,
                name VARCHAR(120) NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role ENUM('owner','manager','viewer') DEFAULT 'manager',
                permissions JSON NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )"
        );

        $stmt = $this->db->query('SELECT COUNT(*) FROM admin_users');
        if ((int) $stmt->fetchColumn() > 0) {
            return;
        }

        $this->create([
            'username' => $username,
            'name' => 'Administrador',
            'passwordHash' => $passwordHash,
            'role' => 'owner',
            'permissions' => ['all'],
            'isActive' => true,
        ]);
    }

    public function create(array $data): array
    {
        $stmt = $this->db->prepare(
            'INSERT INTO admin_users (username, name, password_hash, role, permissions, is_active)
             VALUES (:username, :name, :password_hash, :role, :permissions, :is_active)'
        );
        $stmt->execute([
            'username' => $data['username'],
            'name' => $data['name'],
            'password_hash' => $data['passwordHash'],
            'role' => $data['role'],
            'permissions' => json_encode($data['permissions'], JSON_UNESCAPED_UNICODE),
            'is_active' => $data['isActive'] ? 1 : 0,
        ]);

        return $this->find((int) $this->db->lastInsertId());
    }

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM admin_users WHERE id = :id');
        $stmt->execute(['id' => $id]);
        return $stmt->fetch() ?: null;
    }

    public function findByUsername(string $username): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM admin_users WHERE username = :username');
        $stmt->execute(['username' => $username]);
        return $stmt->fetch() ?: null;
    }

    public function list(): array
    {
        return $this->db->query('SELECT * FROM admin_users ORDER BY is_active DESC, role ASC, username ASC')->fetchAll();
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

        $stmt = $this->db->prepare('UPDATE admin_users SET ' . implode(', ', $sets) . ' WHERE id = :id');
        $stmt->execute($params);
        return $this->find($id);
    }

    public function setActive(int $id, bool $isActive): ?array
    {
        $stmt = $this->db->prepare('UPDATE admin_users SET is_active = :is_active WHERE id = :id');
        $stmt->execute(['is_active' => $isActive ? 1 : 0, 'id' => $id]);
        return $this->find($id);
    }
}
