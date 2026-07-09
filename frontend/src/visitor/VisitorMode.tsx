import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Copy, Plus, RotateCcw, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, ErrorMessage, Field, Input, Select } from '../components/ui';
import { Ranking } from '../components/Ranking';
import { CASUAL_QUESTIONS } from './localQuestions';
import type { Player } from '../types/game';

type VisitorPhase = 'setup' | 'playing' | 'result' | 'final';

type VisitorPlayer = Player;

type VisitorRound = {
  roundNumber: number;
  question: { id: number; text: string; category: string; level: string };
  votes: Array<{ voterId: number; votedId: number }>;
  results?: Array<{ playerId: number; name: string; votesReceived: number; score: number }>;
  winners?: Array<{ playerId: number; name: string; votesReceived: number }>;
};

type VisitorSession = {
  code: string;
  name: string;
  maxPlayers: number;
  maxScore: number;
  categoryFilter: string[];
  players: VisitorPlayer[];
  phase: VisitorPhase;
  roundNumber: number;
  round?: VisitorRound;
  usedQuestionIds: number[];
};

const CURRENT_SESSION_KEY = 'jdc-visitor-current';

function sessionKey(code: string) {
  return `jdc-visitor-${code}`;
}

function generateCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function loadSession(): VisitorSession | null {
  try {
    const code = localStorage.getItem(CURRENT_SESSION_KEY);
    if (!code) return null;
    const raw = localStorage.getItem(sessionKey(code));
    return raw ? (JSON.parse(raw) as VisitorSession) : null;
  } catch {
    return null;
  }
}

function pickQuestion(usedIds: number[], categories: string[]) {
  const pool = CASUAL_QUESTIONS.filter((question) => {
    const categoryMatch = categories.length === 0 || categories.includes(question.category);
    return categoryMatch && !usedIds.includes(question.id);
  });
  const fallback = CASUAL_QUESTIONS.filter((question) => categories.length === 0 || categories.includes(question.category));
  const source = pool.length > 0 ? pool : fallback.length > 0 ? fallback : CASUAL_QUESTIONS;
  return source[Math.floor(Math.random() * source.length)];
}

function formatDateTime(value?: string | null) {
  if (!value) return 'local';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function VisitorMode() {
  const navigate = useNavigate();
  const [session, setSession] = useState<VisitorSession | null>(() => loadSession());
  const [error, setError] = useState('');
  const [roomForm, setRoomForm] = useState({
    name: 'Mesa dos visitantes',
    maxPlayers: 6,
    maxScore: 5,
    categoryFilter: [] as string[],
  });
  const [playerName, setPlayerName] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [addedAt] = useState(() => new Date().toISOString());

  const categories = useMemo(() => {
    return Array.from(new Set(CASUAL_QUESTIONS.map((question) => question.category))).sort();
  }, []);

  useEffect(() => {
    if (!session) return;
    localStorage.setItem(CURRENT_SESSION_KEY, session.code);
    localStorage.setItem(sessionKey(session.code), JSON.stringify(session));
  }, [session]);

  function createSession(event: FormEvent) {
    event.preventDefault();
    setError('');
    const code = generateCode();
    const nextSession: VisitorSession = {
      code,
      name: roomForm.name.trim() || 'Mesa dos visitantes',
      maxPlayers: Math.max(3, Math.min(20, roomForm.maxPlayers)),
      maxScore: Math.max(1, Math.min(30, roomForm.maxScore)),
      categoryFilter: roomForm.categoryFilter,
      players: [],
      phase: 'setup',
      roundNumber: 0,
      usedQuestionIds: [],
    };
    setSession(nextSession);
    setPlayerName('');
  }

  function persist(nextSession: VisitorSession) {
    setSession(nextSession);
  }

  function resetSession() {
    if (session) {
      localStorage.removeItem(sessionKey(session.code));
    }
    localStorage.removeItem(CURRENT_SESSION_KEY);
    setSession(null);
    setError('');
    setSelected(null);
  }

  function addPlayer(event: FormEvent) {
    event.preventDefault();
    if (!session) return;
    const trimmed = playerName.trim();
    if (!trimmed) {
      setError('Informe o nome do jogador.');
      return;
    }
    if (session.players.some((player) => player.name.toLowerCase() === trimmed.toLowerCase())) {
      setError('Ja existe um jogador com esse nome.');
      return;
    }
    if (session.players.length >= session.maxPlayers) {
      setError('Limite de jogadores atingido.');
      return;
    }
    const nextSession: VisitorSession = {
      ...session,
      players: [...session.players, { id: Date.now(), name: trimmed, score: 0 }],
    };
    persist(nextSession);
    setPlayerName('');
    setError('');
  }

  function startGame() {
    if (!session) return;
    if (session.players.length < 3) {
      setError('Adicione pelo menos 3 jogadores.');
      return;
    }
    const question = pickQuestion(session.usedQuestionIds, session.categoryFilter);
    if (!question) {
      setError('Nao ha perguntas disponiveis para esta configuracao.');
      return;
    }
    persist({
      ...session,
      phase: 'playing',
      roundNumber: session.roundNumber + 1,
      usedQuestionIds: [...session.usedQuestionIds, question.id],
      round: {
        roundNumber: session.roundNumber + 1,
        question,
        votes: [],
      },
    });
  }

  function submitVote() {
    if (!session?.round) return;
    const voter = session.players[session.round.votes.length];
    if (!voter || selected === null) return;

    const votes = [...session.round.votes, { voterId: voter.id, votedId: selected }];
    if (votes.length < session.players.length) {
      persist({
        ...session,
        round: { ...session.round, votes },
      });
      setSelected(null);
      return;
    }

    const tallyBase = session.players.map((player) => {
      const votesReceived = votes.filter((vote) => vote.votedId === player.id).length;
      return { playerId: player.id, name: player.name, votesReceived, score: player.score };
    });
    const maxVotes = Math.max(...tallyBase.map((row) => row.votesReceived), 0);
    const winners = tallyBase.filter((row) => row.votesReceived === maxVotes && maxVotes > 0).map((row) => ({
      playerId: row.playerId,
      name: row.name,
      votesReceived: row.votesReceived,
    }));
    const updatedPlayers = session.players.map((player) => ({
      ...player,
      score: player.score + (winners.some((winner) => winner.playerId === player.id) ? 1 : 0),
    }));

    persist({
      ...session,
      players: updatedPlayers,
      phase: 'result',
        round: {
          ...session.round,
          votes,
          results: tallyBase.map((row) => ({
            ...row,
            score: updatedPlayers.find((player) => player.id === row.playerId)?.score ?? row.score,
          })),
          winners,
        },
      });
    setSelected(null);
  }

  function nextRound() {
    if (!session) return;
    const hasWinner = session.players.some((player) => player.score >= session.maxScore);
    if (hasWinner) {
      persist({ ...session, phase: 'final' });
      return;
    }

    const question = pickQuestion(session.usedQuestionIds, session.categoryFilter);
    if (!question) {
      persist({ ...session, phase: 'final' });
      return;
    }
    persist({
      ...session,
      phase: 'playing',
      roundNumber: session.roundNumber + 1,
      usedQuestionIds: [...session.usedQuestionIds, question.id],
      round: {
        roundNumber: session.roundNumber + 1,
        question,
        votes: [],
      },
    });
  }

  const voter = session?.round ? session.players[session.round.votes.length] : undefined;
  const options = useMemo(() => {
    if (!session?.round || !voter) return [];
    return session.players.filter((player) => player.id !== voter.id);
  }, [session, voter]);

  if (!session) {
    return (
      <main className="mx-auto grid min-h-screen w-full max-w-3xl content-start gap-5 px-4 py-5 sm:py-8">
        <header className="flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="Quem fez isso?" className="h-12 w-auto" />
          </Link>
          <Button type="button" variant="ghost" onClick={() => navigate('/')}>Voltar</Button>
        </header>
        <Card className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-black">Modo visitante</h1>
              <p className="mt-2 font-bold">Sem login, sem backend, com perguntas locais no navegador.</p>
            </div>
            <Users size={36} className="text-tomato" />
          </div>
          <form onSubmit={createSession} className="grid gap-4">
            <Field label="Nome da mesa">
              <Input value={roomForm.name} onChange={(event) => setRoomForm({ ...roomForm, name: event.target.value })} />
            </Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Jogadores">
                <Input type="number" min={3} max={20} value={roomForm.maxPlayers} onChange={(event) => setRoomForm({ ...roomForm, maxPlayers: Number(event.target.value) })} />
              </Field>
              <Field label="Pontos para vencer">
                <Input type="number" min={1} max={30} value={roomForm.maxScore} onChange={(event) => setRoomForm({ ...roomForm, maxScore: Number(event.target.value) })} />
              </Field>
            </div>
            <Field label="Categorias">
              <Select
                multiple
                value={roomForm.categoryFilter}
                onChange={(event) => setRoomForm({ ...roomForm, categoryFilter: Array.from(event.target.selectedOptions).map((option) => option.value) })}
                className="min-h-32"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </Select>
            </Field>
            <Button type="submit">Criar modo visitante</Button>
          </form>
        </Card>
      </main>
    );
  }

  const ranking = [...session.players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-3xl content-start gap-5 px-4 py-5 sm:py-8">
      <header className="flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo.png" alt="Quem fez isso?" className="h-12 w-auto" />
        </Link>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={() => navigator.clipboard?.writeText(session.code)}><Copy size={18} /></Button>
          <Button type="button" variant="ghost" onClick={() => navigate('/')}><ArrowLeft size={18} /></Button>
        </div>
      </header>
      <ErrorMessage message={error} />
      <Card className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black">{session.name}</h1>
            <p className="font-bold">Sala {session.code} · criado em {formatDateTime(addedAt)}</p>
          </div>
          <span className="rounded-md bg-ink px-3 py-1 font-black text-white">{session.phase.toUpperCase()}</span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-md border-2 border-ink bg-paper p-3 font-black">Jogadores: {session.players.length}/{session.maxPlayers}</div>
          <div className="rounded-md border-2 border-ink bg-paper p-3 font-black">Pontos: {session.maxScore}</div>
          <div className="rounded-md border-2 border-ink bg-paper p-3 font-black">Rodada: {session.roundNumber}</div>
        </div>
        {session.phase === 'setup' ? (
          <div className="grid gap-4">
            <form onSubmit={addPlayer} className="grid gap-3 md:grid-cols-[1fr_auto]">
              <Field label="Jogador">
                <Input value={playerName} onChange={(event) => setPlayerName(event.target.value)} placeholder="Nome do jogador" />
              </Field>
              <Button className="self-end" type="submit"><Plus size={18} /></Button>
            </form>
            <div className="grid gap-2">
              {session.players.map((player) => (
                <div key={player.id} className="rounded-md border-2 border-ink bg-white px-3 py-2 font-black">{player.name}</div>
              ))}
            </div>
            <Button disabled={session.players.length < 3} onClick={startGame}>
              <Check className="mr-2 inline" size={18} /> Iniciar jogo
            </Button>
            <Button type="button" variant="ghost" onClick={resetSession}>Reiniciar mesa</Button>
          </div>
        ) : null}
        {session.phase === 'playing' && session.round ? (
          <div className="grid gap-4">
            <div className="rounded-md border-2 border-ink bg-gold p-3 font-black">
              Vez de {voter?.name ?? 'jogador'}
            </div>
            <h2 className="text-2xl font-black leading-tight">{session.round.question.text}</h2>
            <div className="grid gap-2">
              {options.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => setSelected(player.id)}
                  className={`min-h-14 rounded-md border-2 border-ink px-4 text-left text-lg font-black ${selected === player.id ? 'bg-teal text-white' : 'bg-paper'}`}
                >
                  {player.name}
                </button>
              ))}
            </div>
            <Button disabled={selected === null} onClick={submitVote}>
              <Check className="mr-2 inline" size={18} /> Confirmar voto
            </Button>
          </div>
        ) : null}
        {session.phase === 'result' && session.round ? (
          <div className="grid gap-4">
            <h2 className="text-2xl font-black">Resultado da rodada</h2>
            <p className="font-bold">{session.round.question.text}</p>
            <div className="grid gap-2">
              {session.round.results?.map((row) => (
                <div key={row.playerId} className="flex items-center justify-between rounded-md border-2 border-ink bg-white px-3 py-2 font-black">
                  <span>{row.name}</span>
                  <span>{row.votesReceived} voto(s)</span>
                </div>
              ))}
            </div>
            <div className="rounded-md border-2 border-ink bg-gold p-3 font-black">
              Culpado(s): {(session.round.winners ?? []).map((winner) => winner.name).join(', ') || 'ninguem'}
            </div>
            <Button onClick={nextRound}>Proxima rodada</Button>
          </div>
        ) : null}
        {session.phase === 'final' ? (
          <div className="grid gap-4">
            <h2 className="text-2xl font-black">Ranking final</h2>
            <Ranking players={ranking} />
            <Button onClick={resetSession}>Nova mesa visitante</Button>
          </div>
        ) : null}
      </Card>
    </main>
  );
}
