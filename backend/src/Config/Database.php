<?php

declare(strict_types=1);

namespace App\Config;

use PDO;

final class Database
{
    private static ?PDO $connection = null;

    public static function connection(): PDO
    {
        if (self::$connection === null) {
            $host = $_ENV['DB_HOST'] ?? getenv('DB_HOST') ?: 'mysql';
            $name = $_ENV['DB_NAME'] ?? getenv('DB_NAME') ?: 'jogo_dos_culpados';
            $user = $_ENV['DB_USER'] ?? getenv('DB_USER') ?: 'root';
            $password = $_ENV['DB_PASSWORD'] ?? getenv('DB_PASSWORD') ?: 'root';

            self::$connection = new PDO(
                "mysql:host={$host};dbname={$name};charset=utf8mb4",
                $user,
                $password,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                ]
            );
        }

        return self::$connection;
    }
}
