import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Check, Copy, Play, Plus, RotateCcw, Users } from 'lucide-react';
import { apiError, gameApi } from './api/client';
import { Button, Card, ErrorMessage, Field, Input, Loading, Select } from './components/ui';
import { Ranking } from './components/Ranking';
import type { Player, Room, Round, RoundResult } from './types/game';

const roundKey = (code: string) => `jdc-round-${code}`;

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto grid min-h-screen w-full max-w-3xl content-start gap-5 px-4 py-5 sm:py-8">
      <header className="flex items-center justify-between gap-3">
        <Link to="/" className="text-xl font-black text-ink sm:text-2xl">Jogo dos Culpados</Link>
        <div className="h-10 w-10 rounded-md border-2 border-ink bg-teal shadow-crisp" aria-hidden />
      </header>
      {children}
    </main>
  );
}

function Home() {
  const [code, setCode] = useState('');
  const navigate = useNavigate();

  function enterRoom(event: FormEvent) {
    event.preventDefault();
    if (code.trim()) navigate(`/room/${code.trim()}/lobby`);
  }

  return (
    <Shell>
      <section className="grid gap-4">
        <div className="rounded-lg border-2 border-ink bg-gold p-5 shadow-crisp">
          <h1 className="text-4xl font-black leading-none sm:text-5xl">Jogo dos Culpados</h1>
          <p className="mt-3 max-w-xl text-lg font-bold">Pergunta na mesa, voto secreto e ranking sem misericordia.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="grid content-between gap-4">
            <Users size={36} className="text-tomato" />
            <h2 className="text-2xl font-black">Nova sala</h2>
            <Button onClick={() => navigate('/create-room')}>
              Criar <ArrowRight className="ml-2 inline" size={18} />
            </Button>
          </Card>
          <Card>
            <form onSubmit={enterRoom} className="grid gap-4">
              <h2 className="text-2xl font-black">Entrar</h2>
              <Field label="Codigo">
                <Input value={code} onChange={(event) => setCode(event.target.value)} placeholder="4821" />
              </Field>
              <Button type="submit" variant="secondary">Abrir sala</Button>
            </form>
          </Card>
        </div>
      </section>
    </Shell>
  );
}

function CreateRoom() {
  const [form, setForm] = useState({
    name: 'Noite de Jogos',
    maxPlayers: 6,
    maxScore: 5,
    gameMode: 'classic',
    voteVisibility: 'anonymous',
    categoryFilter: 'all',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const room = await gameApi.createRoom(form);
      navigate(`/room/${room.code}/setup-players`);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell>
      <Card>
        <form onSubmit={submit} className="grid gap-4">
          <h1 className="text-3xl font-black">Criar sala</h1>
          <ErrorMessage message={error} />
          <Field label="Nome">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Jogadores">
              <Input type="number" min={3} max={20} value={form.maxPlayers} onChange={(e) => setForm({ ...form, maxPlayers: Number(e.target.value) })} />
            </Field>
            <Field label="Pontos">
              <Input type="number" min={1} max={30} value={form.maxScore} onChange={(e) => setForm({ ...form, maxScore: Number(e.target.value) })} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Modo">
              <Select value={form.gameMode} onChange={(e) => setForm({ ...form, gameMode: e.target.value })}>
                <option value="classic">Classico</option>
                <option value="no_points">Sem pontos</option>
                <option value="chaos">Caos</option>
              </Select>
            </Field>
            <Field label="Votos">
              <Select value={form.voteVisibility} onChange={(e) => setForm({ ...form, voteVisibility: e.target.value })}>
                <option value="anonymous">Anonimos</option>
                <option value="exposed">Expostos</option>
              </Select>
            </Field>
            <Field label="Categoria">
              <Select value={form.categoryFilter} onChange={(e) => setForm({ ...form, categoryFilter: e.target.value })}>
                <option value="all">Todas</option>
                <option value="amizade">Amizade</option>
                <option value="cotidiano">Cotidiano</option>
                <option value="festa">Festa</option>
                <option value="aventura">Aventura</option>
                <option value="caos">Caos</option>
              </Select>
            </Field>
          </div>
          <Button disabled={loading}>{loading ? 'Criando...' : 'Criar sala'}</Button>
        </form>
      </Card>
    </Shell>
  );
}

function useRoom(code?: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!code) return;
    setLoading(true);
    setError('');
    try {
      setRoom(await gameApi.getRoom(code));
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [code]);

  return { room, error, loading, reload: load };
}

function SetupPlayers() {
  const { code = '' } = useParams();
  const { room, error, loading, reload } = useRoom(code);
  const [name, setName] = useState('');
  const [localError, setLocalError] = useState('');
  const navigate = useNavigate();

  async function addPlayer(event: FormEvent) {
    event.preventDefault();
    setLocalError('');
    const trimmed = name.trim();
    if (!trimmed) return setLocalError('Informe um nome.');
    if (room?.players?.some((player) => player.name.toLowerCase() === trimmed.toLowerCase())) {
      return setLocalError('Nome repetido na sala.');
    }
    try {
      await gameApi.addPlayer(code, trimmed);
      setName('');
      reload();
    } catch (err) {
      setLocalError(apiError(err));
    }
  }

  if (loading) return <Shell><Loading /></Shell>;
  const players = room?.players ?? [];

  return (
    <Shell>
      <ErrorMessage message={error || localError} />
      <Card className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black">{room?.name}</h1>
            <p className="font-bold">Codigo {code}</p>
          </div>
          <Button type="button" variant="ghost" onClick={() => navigator.clipboard?.writeText(code)}>
            <Copy size={18} />
          </Button>
        </div>
        <form onSubmit={addPlayer} className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Field label="Jogador">
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome" />
          </Field>
          <Button className="self-end" type="submit"><Plus size={18} /></Button>
        </form>
        <div className="grid gap-2">
          {players.map((player) => (
            <div key={player.id} className="rounded-md border-2 border-ink bg-paper px-3 py-2 font-black">{player.name}</div>
          ))}
        </div>
        <Button disabled={players.length < 3} onClick={() => navigate(`/room/${code}/lobby`)}>
          Ir para lobby
        </Button>
      </Card>
    </Shell>
  );
}

function Lobby() {
  const { code = '' } = useParams();
  const { room, error, loading, reload } = useRoom(code);
  const [actionError, setActionError] = useState('');
  const navigate = useNavigate();

  async function start() {
    setActionError('');
    try {
      await gameApi.startRoom(code);
      localStorage.removeItem(roundKey(code));
      navigate(`/room/${code}/game`);
    } catch (err) {
      setActionError(apiError(err));
      reload();
    }
  }

  if (loading) return <Shell><Loading /></Shell>;
  const players = room?.players ?? [];

  return (
    <Shell>
      <ErrorMessage message={error || actionError} />
      <Card className="grid gap-4">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black">{room?.name}</h1>
            <p className="font-bold">Sala {code} · {players.length}/{room?.maxPlayers}</p>
          </div>
          <Button variant="ghost" onClick={() => navigate(`/room/${code}/setup-players`)}><Plus size={18} /></Button>
        </div>
        <div className="grid gap-2">
          {players.map((player) => (
            <div key={player.id} className="flex justify-between rounded-md border-2 border-ink bg-paper px-3 py-2 font-black">
              <span>{player.name}</span>
              {player.isHost ? <span>Anfitriao</span> : null}
            </div>
          ))}
        </div>
        <Button disabled={players.length < 3} onClick={start}>
          <Play className="mr-2 inline" size={18} /> Iniciar
        </Button>
      </Card>
    </Shell>
  );
}

function Game() {
  const { code = '' } = useParams();
  const [round, setRound] = useState<Round | null>(null);
  const [voterIndex, setVoterIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  async function loadRound() {
    setLoading(true);
    setError('');
    try {
      const stored = Number(localStorage.getItem(roundKey(code)));
      const current = stored ? await gameApi.getRound(stored) : await gameApi.createRound(code);
      localStorage.setItem(roundKey(code), String(current.roundId));
      setRound(current);
      setVoterIndex(Math.min(current.votesReceived, current.players.length - 1));
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRound();
  }, [code]);

  const voter = round?.players[voterIndex];
  const options = useMemo(() => round?.players.filter((player) => player.id !== voter?.id) ?? [], [round, voter]);

  async function vote() {
    if (!round || !voter || !selected) return;
    setError('');
    try {
      const progress = await gameApi.vote(round.roundId, voter.id, selected);
      setSelected(null);
      if (progress.allVotesReceived) {
        navigate(`/room/${code}/result`);
      } else {
        const updated = await gameApi.getRound(round.roundId);
        setRound(updated);
        setVoterIndex(progress.votesReceived);
      }
    } catch (err) {
      setError(apiError(err));
    }
  }

  if (loading) return <Shell><Loading /></Shell>;
  if (!round) return <Shell><ErrorMessage message={error} /></Shell>;

  return (
    <Shell>
      <ErrorMessage message={error} />
      <Card className="grid gap-4">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-md bg-violet px-3 py-1 font-black text-white">Rodada {round.roundNumber}</span>
          <span className="font-black">{round.votesReceived}/{round.totalPlayers}</span>
        </div>
        <h1 className="text-3xl font-black leading-tight">{round.question.text}</h1>
        <div className="rounded-md border-2 border-ink bg-gold px-3 py-2 font-black">
          Vez de {voter?.name}
        </div>
        <div className="grid gap-3">
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
        <Button disabled={!selected} onClick={vote}>
          <Check className="mr-2 inline" size={18} /> Confirmar voto
        </Button>
      </Card>
    </Shell>
  );
}

function Result() {
  const { code = '' } = useParams();
  const [result, setResult] = useState<RoundResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const roundId = Number(localStorage.getItem(roundKey(code)));
        if (!roundId) throw new Error('Rodada nao encontrada.');
        setResult(await gameApi.result(roundId));
      } catch (err) {
        setError(apiError(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [code]);

  async function nextRound() {
    localStorage.removeItem(roundKey(code));
    if (result?.gameFinished) {
      navigate(`/room/${code}/final`);
    } else {
      navigate(`/room/${code}/game`);
    }
  }

  if (loading) return <Shell><Loading /></Shell>;

  return (
    <Shell>
      <ErrorMessage message={error} />
      {result ? (
        <section className="grid gap-4">
          <Card className="grid gap-4">
            <h1 className="text-3xl font-black">Resultado</h1>
            <p className="text-xl font-black">{result.question}</p>
            <div className="grid gap-2">
              {result.results.map((row) => (
                <div key={row.playerId} className="flex justify-between rounded-md border-2 border-ink bg-paper px-3 py-2 font-black">
                  <span>{row.name}</span>
                  <span>{row.votesReceived} voto(s)</span>
                </div>
              ))}
            </div>
            <div className="rounded-md border-2 border-ink bg-gold p-3 font-black">
              Culpado(s): {result.winners.map((winner) => winner.name).join(', ')}
            </div>
          </Card>
          <Card className="grid gap-3">
            <h2 className="text-2xl font-black">Ranking</h2>
            <Ranking players={result.ranking} />
            <Button onClick={nextRound}>
              {result.gameFinished ? 'Ver final' : 'Proxima rodada'}
            </Button>
          </Card>
        </section>
      ) : null}
    </Shell>
  );
}

function Final() {
  const { code = '' } = useParams();
  const { room, error, loading } = useRoom(code);
  const ranking = room?.players ?? [];
  const winner = ranking[0];

  if (loading) return <Shell><Loading /></Shell>;

  return (
    <Shell>
      <ErrorMessage message={error} />
      <section className="grid gap-4">
        <div className="rounded-lg border-2 border-ink bg-tomato p-5 text-white shadow-crisp">
          <h1 className="text-4xl font-black leading-none">Caso encerrado</h1>
          <p className="mt-3 text-2xl font-black">{winner?.name} saiu oficialmente marcado.</p>
        </div>
        <Card className="grid gap-3">
          <h2 className="text-2xl font-black">Ranking final</h2>
          <Ranking players={ranking} />
          <Button variant="secondary" onClick={() => window.location.assign('/')}>
            <RotateCcw className="mr-2 inline" size={18} /> Jogar novamente
          </Button>
        </Card>
      </section>
    </Shell>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/create-room" element={<CreateRoom />} />
      <Route path="/room/:code/setup-players" element={<SetupPlayers />} />
      <Route path="/room/:code/lobby" element={<Lobby />} />
      <Route path="/room/:code/game" element={<Game />} />
      <Route path="/room/:code/result" element={<Result />} />
      <Route path="/room/:code/final" element={<Final />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
