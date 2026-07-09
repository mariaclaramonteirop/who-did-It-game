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
  voteTimeEnabled?: boolean;
  voteTimeSeconds?: number | null;
  categoryFilter: string;
  players?: Player[];
};

export type Round = {
  roundId: number;
  roundNumber: number;
  status: 'waiting_votes' | 'finished';
  voteDeadlineAt?: string | null;
  voteTimeEnabled?: boolean;
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
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type Category = {
  id: number;
  slug: string;
  name: string;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type AdminUser = {
  id: number;
  username: string;
  name: string;
  role: 'owner' | 'manager' | 'viewer';
  permissions: string[];
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type PlayerAccount = {
  id: number;
  username: string;
  email: string;
  name: string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type PlayerSession = {
  token: string;
  user: PlayerAccount;
};

export type AdminRoom = Room & {
  playersCount: number;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type AdminPlayer = Player & {
  roomId: number;
  roomCode: string;
  roomName: string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type AdminPlayerAccount = {
  id: number;
  username: string;
  email: string;
  name: string;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type AdminDashboard = {
  totals: Record<string, number>;
  roomsByStatus: Array<{ label: string; value: number }>;
  questionsByCategory: Array<{ label: string; value: number }>;
  questionsByLevel: Array<{ label: string; value: number }>;
  adminsByRole: Array<{ label: string; value: number }>;
  adminsByStatus: Array<{ label: string; value: number }>;
  playersByRoom: Array<{ label: string; value: number }>;
  roomsByDate: Array<{ label: string; value: number }>;
  playersByDate: Array<{ label: string; value: number }>;
  questionsByDate: Array<{ label: string; value: number }>;
  adminsByDate: Array<{ label: string; value: number }>;
  winnersByDate: Array<{ label: string; value: number }>;
  recentRooms: Array<{ label: string; createdAt?: string | null; updatedAt?: string | null; meta: string }>;
  recentPlayers: Array<{ label: string; createdAt?: string | null; updatedAt?: string | null; meta: string }>;
  recentQuestions: Array<{ label: string; createdAt?: string | null; updatedAt?: string | null; meta: string }>;
  recentAdmins: Array<{ label: string; createdAt?: string | null; updatedAt?: string | null; meta: string }>;
  recentWinners: Array<{ playerId: number; name: string; score: number; roomCode: string; roomName: string }>;
};
