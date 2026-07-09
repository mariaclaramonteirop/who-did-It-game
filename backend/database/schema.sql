CREATE TABLE rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    max_players INT NOT NULL,
    max_score INT NOT NULL DEFAULT 5,
    status ENUM('waiting_players','ready','in_progress','finished') DEFAULT 'waiting_players',
    game_mode ENUM('classic','no_points','chaos') DEFAULT 'classic',
    vote_visibility ENUM('anonymous','exposed') DEFAULT 'anonymous',
    category_filter VARCHAR(100) DEFAULT 'all',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE players (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    score INT NOT NULL DEFAULT 0,
    is_host BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    UNIQUE (room_id, name)
);

CREATE TABLE questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    text VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'geral',
    level ENUM('leve','medio','pesado','caos') DEFAULT 'leve',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE rounds (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    question_id INT NOT NULL,
    round_number INT NOT NULL,
    status ENUM('waiting_votes','finished') DEFAULT 'waiting_votes',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id),
    UNIQUE (room_id, question_id)
);

CREATE TABLE votes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    round_id INT NOT NULL,
    voter_player_id INT NOT NULL,
    voted_player_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
    FOREIGN KEY (voter_player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (voted_player_id) REFERENCES players(id) ON DELETE CASCADE,
    UNIQUE (round_id, voter_player_id)
);

CREATE TABLE round_winners (
    id INT AUTO_INCREMENT PRIMARY KEY,
    round_id INT NOT NULL,
    player_id INT NOT NULL,
    votes_received INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    UNIQUE (round_id, player_id)
);
