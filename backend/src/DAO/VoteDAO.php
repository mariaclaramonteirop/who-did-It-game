<?php

declare(strict_types=1);

namespace App\DAO;

use PDO;

final class VoteDAO
{
    public function __construct(private readonly PDO $db)
    {
    }

    public function ensureSchema(): void
    {
        $this->db->exec('ALTER TABLE votes MODIFY voted_player_id INT NULL');
    }

    public function create(int $roundId, int $voterId, ?int $votedId): void
    {
        $stmt = $this->db->prepare(
            'INSERT INTO votes (round_id, voter_player_id, voted_player_id)
             VALUES (:round_id, :voter_id, :voted_id)'
        );
        $stmt->execute(['round_id' => $roundId, 'voter_id' => $voterId, 'voted_id' => $votedId]);
    }

    public function countByRound(int $roundId): int
    {
        $stmt = $this->db->prepare('SELECT COUNT(*) FROM votes WHERE round_id = :round_id');
        $stmt->execute(['round_id' => $roundId]);
        return (int) $stmt->fetchColumn();
    }

    public function resultsByRound(int $roundId): array
    {
        $stmt = $this->db->prepare(
            'SELECT p.id AS player_id, p.name, p.score, COUNT(v.id) AS votes_received
             FROM rounds r
             JOIN players p ON p.room_id = r.room_id
             LEFT JOIN votes v ON v.round_id = r.id AND v.voted_player_id = p.id
             WHERE r.id = :round_id
             GROUP BY p.id, p.name, p.score
             ORDER BY votes_received DESC, p.name ASC'
        );
        $stmt->execute(['round_id' => $roundId]);
        return $stmt->fetchAll();
    }

    public function storeWinner(int $roundId, int $playerId, int $votesReceived): void
    {
        $stmt = $this->db->prepare(
            'INSERT IGNORE INTO round_winners (round_id, player_id, votes_received)
             VALUES (:round_id, :player_id, :votes_received)'
        );
        $stmt->execute(['round_id' => $roundId, 'player_id' => $playerId, 'votes_received' => $votesReceived]);
    }

    public function winnersByRound(int $roundId): array
    {
        $stmt = $this->db->prepare(
            'SELECT rw.player_id, p.name, rw.votes_received
             FROM round_winners rw JOIN players p ON p.id = rw.player_id
             WHERE rw.round_id = :round_id
             ORDER BY rw.votes_received DESC, p.name ASC'
        );
        $stmt->execute(['round_id' => $roundId]);
        return $stmt->fetchAll();
    }

    public function votedPlayerIdsByRound(int $roundId): array
    {
        $stmt = $this->db->prepare('SELECT voter_player_id FROM votes WHERE round_id = :round_id');
        $stmt->execute(['round_id' => $roundId]);
        return array_map(fn (array $row) => (int) $row['voter_player_id'], $stmt->fetchAll());
    }
}
