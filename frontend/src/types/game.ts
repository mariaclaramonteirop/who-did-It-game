export type Player = {
  id: number;
  name: string;
  score: number;
  isHost?: boolean;
};

export type Room = {
  roomId: number;
  code: string;
  name: string;
  status: 'waiting_players' | 'ready' | 'in_progress' | 'finished';
  maxPlayers: number;
  maxScore: number;
  gameMode: string;
  voteVisibility: string;
  categoryFilter: string;
  players?: Player[];
};

export type Round = {
  roundId: number;
  roundNumber: number;
  status: 'waiting_votes' | 'finished';
  question: {
    id: number;
    text: string;
    category: string;
    level: string;
  };
  players: Player[];
  votesReceived: number;
  totalPlayers: number;
};

export type RoundResult = {
  roundId: number;
  roundNumber: number;
  question: string;
  results: Array<Player & { playerId: number; votesReceived: number }>;
  winners: Array<{ playerId: number; name: string; votesReceived: number }>;
  gameFinished: boolean;
  ranking: Player[];
};

export type Question = {
  id: number;
  text: string;
  category: string;
  level: string;
  isActive: boolean;
};
