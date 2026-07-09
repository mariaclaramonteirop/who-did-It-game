<?php

declare(strict_types=1);

namespace App\Models;

final class Room
{
    public const WAITING_PLAYERS = 'waiting_players';
    public const READY = 'ready';
    public const IN_PROGRESS = 'in_progress';
    public const FINISHED = 'finished';
}
