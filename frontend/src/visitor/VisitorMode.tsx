import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Copy, Plus, Trash2, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, ErrorMessage, Field, Input, Select } from '../components/ui';
import { Ranking } from '../components/Ranking';
import { CASUAL_QUESTIONS } from './localQuestions';
import type { Player } from '../types/game';

type VisitorPhase = 'setup' | 'lobby' | 'playing' | 'result' | 'final';

type VisitorPlayer = Player;

type VisitorRound = {
  roundNumber: number;
  question: { id: number; text: string; category: string; level: string };
  votes: Array<{ voterId: number; votedId: number }>;
  voteDeadlineAt?: string | null;
  results?: Array<{ playerId: number; name: string; votesReceived: number; score: number }>;
  winners?: Array<{ playerId: number; name: string; votesReceived: number }>;
};

type VisitorSession = {
  code: string;
  name: string;
  createdAt: string;
  maxPlayers: number;
  maxScore: number;
  voteTimeEnabled: boolean;
  voteTimeSeconds: number;
  categoryFilter: string[];
  players: VisitorPlayer[];
  phase: VisitorPhase;
  roundNumber: number;
  round?: VisitorRound;
  usedQuestionIds: number[];
};

const CURRENT_SESSION_KEY = 'jdc-visitor-current';
const VISITOR_NAME_KEY = 'jdc-visitor-username';

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
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<VisitorSession>;
    return {
      code: parsed.code ?? code,
      name: parsed.name ?? 'Mesa dos visitantes',
      createdAt: parsed.createdAt ?? new Date().toISOString(),
      maxPlayers: parsed.maxPlayers ?? 6,
      maxScore: parsed.maxScore ?? 5,
      voteTimeEnabled: parsed.voteTimeEnabled ?? false,
      voteTimeSeconds: parsed.voteTimeSeconds ?? 30,
      categoryFilter: parsed.categoryFilter ?? [],
      players: parsed.players ?? [],
      phase: parsed.phase ?? 'setup',
      roundNumber: parsed.roundNumber ?? 0,
      round: parsed.round,
      usedQuestionIds: parsed.usedQuestionIds ?? [],
    };
  } catch {
    return null;
  }
}

function loadSessionByCode(code: string): VisitorSession | null {
  try {
    const raw = localStorage.getItem(sessionKey(code));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<VisitorSession>;
    return {
      code: parsed.code ?? code,
      name: parsed.name ?? 'Mesa dos visitantes',
      createdAt: parsed.createdAt ?? new Date().toISOString(),
      maxPlayers: parsed.maxPlayers ?? 6,
      maxScore: parsed.maxScore ?? 5,
      voteTimeEnabled: parsed.voteTimeEnabled ?? false,
      voteTimeSeconds: parsed.voteTimeSeconds ?? 30,
      categoryFilter: parsed.categoryFilter ?? [],
      players: parsed.players ?? [],
      phase: parsed.phase ?? 'setup',
      roundNumber: parsed.roundNumber ?? 0,
      round: parsed.round,
      usedQuestionIds: parsed.usedQuestionIds ?? [],
    };
  } catch {
    return null;
  }
}

function loadVisitorName(): string {
  return localStorage.getItem(VISITOR_NAME_KEY) ?? '';
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
  const [visitorName, setVisitorName] = useState(() => loadVisitorName());
  const [visitorFlow, setVisitorFlow] = useState<'create' | 'join'>(() => 'create');
  const [joinCode, setJoinCode] = useState('');
  const [roomForm, setRoomForm] = useState({
    name: 'Mesa dos visitantes',
    maxPlayers: 6,
    maxScore: 5,
    voteTimeEnabled: false,
    voteTimeSeconds: 30,
    categoryFilter: [] as string[],
  });
  const [playerName, setPlayerName] = useState('');
  const [selected, setSelected] = useState<number | null>(null);

  const categories = useMemo(() => {
    return Array.from(new Set(CASUAL_QUESTIONS.map((question) => question.category))).sort();
  }, []);

  useEffect(() => {
    localStorage.setItem(VISITOR_NAME_KEY, visitorName);
  }, [visitorName]);

  useEffect(() => {
    if (!session) return;
    if (session.phase === 'final') {
      localStorage.removeItem(sessionKey(session.code));
      localStorage.removeItem(CURRENT_SESSION_KEY);
      return;
    }
    localStorage.setItem(CURRENT_SESSION_KEY, session.code);
    localStorage.setItem(sessionKey(session.code), JSON.stringify(session));
  }, [session]);

  function saveVisitorIdentity(event: FormEvent) {
    event.preventDefault();
    if (!visitorName.trim()) {
      setError('Informe seu nome de usuario.');
      return;
    }
    setError('');
    setVisitorName(visitorName.trim());
    if (visitorFlow === 'join') {
      return;
    }
  }

  function ensureVisitorInSession(nextSession: VisitorSession): VisitorSession {
    const trimmed = visitorName.trim();
    if (!trimmed) return nextSession;
    const hasVisitor = nextSession.players.some((player) => player.name.toLowerCase() === trimmed.toLowerCase());
    if (hasVisitor) return nextSession;
    return {
      ...nextSession,
      players: [...nextSession.players, { id: Date.now(), name: trimmed, score: 0 }],
    };
  }

  function voteDeadlineForSession() {
    const enabled = session?.voteTimeEnabled ?? roomForm.voteTimeEnabled;
    const secondsSource = session?.voteTimeSeconds ?? roomForm.voteTimeSeconds;
    if (!enabled) return null;
    const seconds = Math.max(10, Math.min(60, secondsSource));
    return new Date(Date.now() + seconds * 1000).toISOString();
  }

  function createSession(event: FormEvent) {
    event.preventDefault();
    setError('');
    const code = generateCode();
    const nextSession: VisitorSession = ensureVisitorInSession({
      code,
      name: roomForm.name.trim() || 'Mesa dos visitantes',
      createdAt: new Date().toISOString(),
      maxPlayers: Math.max(3, Math.min(20, roomForm.maxPlayers)),
      maxScore: Math.max(1, Math.min(30, roomForm.maxScore)),
      voteTimeEnabled: roomForm.voteTimeEnabled,
      voteTimeSeconds: roomForm.voteTimeEnabled ? Math.max(10, Math.min(60, roomForm.voteTimeSeconds)) : 30,
      categoryFilter: roomForm.categoryFilter,
      players: [],
      phase: 'lobby',
      roundNumber: 0,
      usedQuestionIds: [],
    });
    setSession(nextSession);
    setPlayerName('');
    setVisitorFlow('create');
  }

  function openExistingSession(event: FormEvent) {
    event.preventDefault();
    setError('');
    const code = joinCode.trim();
    if (!code) {
      setError('Informe o codigo da sala.');
      return;
    }
    const nextSession = loadSessionByCode(code);
    if (!nextSession) {
      setError('Sala nao encontrada neste navegador.');
      return;
    }
    setSession(ensureVisitorInSession(nextSession));
    setJoinCode('');
    setVisitorFlow('join');
  }

  function persist(nextSession: VisitorSession) {
    setSession(nextSession);
  }

  async function copyRoomCode(code: string) {
    try {
      if (!navigator.clipboard?.writeText) {
        setError('Copie manualmente o codigo da sala.');
        return;
      }
      await navigator.clipboard.writeText(code);
      setError('');
    } catch {
      setError('Nao foi possivel copiar o codigo da sala.');
    }
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

  function leaveRoom() {
    localStorage.removeItem(CURRENT_SESSION_KEY);
    setSession(null);
    setError('');
    setSelected(null);
    setJoinCode('');
    setVisitorFlow('create');
  }

  function restartSession() {
    if (!session) return;
    const nextSession: VisitorSession = {
      ...session,
      players: session.players.map((player) => ({ ...player, score: 0 })),
      phase: 'lobby',
      roundNumber: 0,
      round: undefined,
      usedQuestionIds: [],
    };
    persist(nextSession);
    setSelected(null);
    setError('');
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

  function removePlayer(playerId: number) {
    if (!session) return;
    const nextSession = {
      ...session,
      players: session.players.filter((player) => player.id !== playerId),
    };
    if (nextSession.players.length < 3 && (nextSession.phase === 'setup' || nextSession.phase === 'lobby')) {
      nextSession.phase = 'lobby';
    }
    persist(nextSession);
    setError('');
  }

  function resolveVote(votedId: number | null = null) {
    if (!session) return;
    if (!session.round) return;
    const voter = session.players[session.round.votes.length];
    if (!voter) return;

    const votes = [...session.round.votes, { voterId: voter.id, votedId: votedId ?? 0 }];
    if (votes.length < session.players.length) {
      persist({
        ...session,
        round: {
          ...session.round,
          votes,
          voteDeadlineAt: voteDeadlineForSession(),
        },
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
        voteDeadlineAt: voteDeadlineForSession(),
      },
    });
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
        voteDeadlineAt: voteDeadlineForSession(),
      },
    });
  }

  const voter = session?.round ? session.players[session.round.votes.length] : undefined;
  const secondsLeft = session?.round?.voteDeadlineAt ? Math.max(0, Math.ceil((Date.parse(session.round.voteDeadlineAt) - Date.now()) / 1000)) : null;
  const options = useMemo(() => {
    if (!session?.round || !voter) return [];
    return session.players.filter((player) => player.id !== voter.id);
  }, [session, voter]);

  useEffect(() => {
    if (!session?.round?.voteDeadlineAt || session.phase !== 'playing') return undefined;
    const deadline = Date.parse(session.round.voteDeadlineAt);
    if (Number.isNaN(deadline)) return undefined;
    const timeout = window.setTimeout(() => resolveVote(0), Math.max(0, deadline - Date.now()));
    return () => window.clearTimeout(timeout);
  }, [session?.round?.voteDeadlineAt, session?.phase, session?.round?.votes.length]);

  if (!session) {
    return (
      <main className="mx-auto grid min-h-screen w-full max-w-3xl content-start gap-5 px-4 py-5 sm:py-8">
        <header className="flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="Quem fez isso?" className="h-12 w-auto" />
          </Link>
          <Button type="button" variant="ghost" onClick={() => navigate('/')} title="Voltar">Voltar</Button>
        </header>
        <Card className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-black">Modo visitante</h1>
              <p className="mt-2 font-bold">Tela local para criar uma mesa ou entrar em uma já existente.</p>
            </div>
            <Users size={36} className="text-tomato" />
          </div>
          <form
            onSubmit={visitorFlow === 'create' ? createSession : openExistingSession}
            className="grid gap-4"
          >
            <Field label="Seu nome de usuario">
              <Input
                value={visitorName}
                onChange={(event) => setVisitorName(event.target.value)}
                placeholder="Maria"
              />
            </Field>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant={visitorFlow === 'create' ? 'primary' : 'secondary'}
                onClick={() => setVisitorFlow('create')}
              >
                Criar sala
              </Button>
              <Button
                type="button"
                variant={visitorFlow === 'join' ? 'primary' : 'secondary'}
                onClick={() => setVisitorFlow('join')}
              >
                Entrar na sala
              </Button>
            </div>
            {visitorFlow === 'create' ? (
              <>
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
                <div className="grid gap-3 md:grid-cols-[1fr_160px]">
                  <label className="flex items-center gap-3 rounded-md border-2 border-ink bg-paper px-3 py-3 font-black">
                    <input
                      type="checkbox"
                      checked={roomForm.voteTimeEnabled}
                      onChange={(event) => setRoomForm({ ...roomForm, voteTimeEnabled: event.target.checked })}
                      className="h-5 w-5 accent-black"
                    />
                    Tempo de voto
                  </label>
                  <Field label="Max. segundos">
                    <Input
                      type="number"
                      min={10}
                      max={60}
                      disabled={!roomForm.voteTimeEnabled}
                      value={roomForm.voteTimeSeconds}
                      onChange={(event) => setRoomForm({ ...roomForm, voteTimeSeconds: Number(event.target.value) })}
                    />
                  </Field>
                </div>
                <Field label="Categorias">
                  <Select
                    value={roomForm.categoryFilter[0] ?? 'all'}
                    onChange={(event) => setRoomForm({ ...roomForm, categoryFilter: event.target.value === 'all' ? [] : [event.target.value] })}
                  >
                    <option value="all">Todas</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </Select>
                </Field>
              </>
            ) : (
              <Field label="Codigo da sala">
                <Input value={joinCode} onChange={(event) => setJoinCode(event.target.value)} placeholder="4821" />
              </Field>
            )}
            <ErrorMessage message={error} />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="primary">
                {visitorFlow === 'create' ? 'Criar modo visitante' : 'Entrar na sala'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setVisitorName('');
                  setJoinCode('');
                  localStorage.removeItem(VISITOR_NAME_KEY);
                }}
              >
                Limpar
              </Button>
            </div>
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
          <Button type="button" variant="ghost" onClick={() => copyRoomCode(session.code)}><Copy size={18} /></Button>
          <Button type="button" variant="ghost" onClick={leaveRoom} title="Sair da sala" aria-label="Sair da sala">
            Sair
          </Button>
          <Button type="button" variant="ghost" onClick={() => navigate('/')} title="Voltar" aria-label="Voltar"><ArrowLeft size={18} /></Button>
        </div>
      </header>
      <ErrorMessage message={error} />
      <Card className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black">{session.name}</h1>
            <p className="font-bold">Sala {session.code} foi criado em {formatDateTime(session.createdAt)}</p>
          </div>
          <span className="rounded-md bg-ink px-3 py-1 font-black text-white">{session.phase.toUpperCase()}</span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-md border-2 border-ink bg-paper p-3 font-black">Jogadores: {session.players.length}/{session.maxPlayers}</div>
          <div className="rounded-md border-2 border-ink bg-paper p-3 font-black">Pontos: {session.maxScore}</div>
          <div className="rounded-md border-2 border-ink bg-paper p-3 font-black">Rodada: {session.roundNumber}</div>
        </div>
        {session.phase === 'setup' || session.phase === 'lobby' ? (
          <div className="grid gap-4">
            <div className="rounded-md border-2 border-ink bg-gold p-3 font-black">
              {session.phase === 'lobby' ? 'Lobby pronto. Adicione jogadores e inicie quando quiser.' : 'Mesa em preparação. Adicione jogadores e depois leve para o lobby.'}
            </div>
            <form onSubmit={addPlayer} className="grid gap-3 md:grid-cols-[1fr_auto]">
              <Field label="Jogador">
                <Input value={playerName} onChange={(event) => setPlayerName(event.target.value)} placeholder="Nome do jogador" />
              </Field>
              <Button className="self-end" type="submit"><Plus size={18} /></Button>
            </form>
            <div className="grid gap-2">
              {session.players.map((player) => (
                <div key={player.id} className="flex items-center justify-between gap-3 rounded-md border-2 border-ink bg-white px-3 py-2 font-black">
                  <span className="min-w-0 truncate">{player.name}</span>
                  <Button type="button" variant="ghost" className="flex h-10 w-10 shrink-0 items-center justify-center px-0" onClick={() => removePlayer(player.id)} aria-label={`Remover ${player.name}`}>
                    <Trash2 size={16} className="shrink-0" />
                  </Button>
                </div>
              ))}
            </div>
            <Button disabled={session.players.length < 3} onClick={startGame}>
              <Check className="mr-2 inline" size={18} /> Iniciar jogo
            </Button>
            {session.phase === 'setup' ? (
              <Button type="button" variant="secondary" onClick={() => persist({ ...session, phase: 'lobby' })}>
                Ir para o lobby
              </Button>
            ) : null}
            <Button type="button" variant="ghost" onClick={resetSession}>Reiniciar mesa</Button>
          </div>
        ) : null}
        {session.phase === 'playing' && session.round ? (
          <div className="grid gap-4">
            <div className="rounded-md border-2 border-ink bg-gold p-3 font-black">
              Vez de {voter?.name ?? 'jogador'}
            </div>
            {secondsLeft !== null ? (
              <div className="rounded-md border-2 border-ink bg-teal px-3 py-2 font-black text-white">
                Tempo restante: {secondsLeft}s
              </div>
            ) : null}
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
            <Button disabled={selected === null} onClick={() => resolveVote(selected)}>
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
            <div className="grid gap-2 sm:grid-cols-2">
              <Button onClick={restartSession}>Jogar de novo</Button>
              <Button type="button" variant="ghost" onClick={resetSession}>Nova mesa visitante</Button>
            </div>
          </div>
        ) : null}
      </Card>
    </main>
  );
}

