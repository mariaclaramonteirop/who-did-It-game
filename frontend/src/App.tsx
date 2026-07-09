import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Check, Coffee, Crown, Copy, Edit3, Eye, EyeOff, Play, Plus, RotateCcw, Save, ShieldCheck, Users, UserRound } from 'lucide-react';
import { apiError, gameApi } from './api/client';
import { Button, Card, ErrorMessage, Field, Input, Loading, Select } from './components/ui';
import { Ranking } from './components/Ranking';
import { VisitorMode } from './visitor/VisitorMode';
import type { AdminDashboard, AdminPlayer, AdminRoom, AdminUser, Category, Player, PlayerAccount, Question, Room, Round, RoundResult } from './types/game';

const roundKey = (code: string) => `jdc-round-${code}`;
const PLAYER_TOKEN_KEY = 'jdc-player-token';
const PLAYER_USER_KEY = 'jdc-player-user';

function loadPlayerToken() {
  return localStorage.getItem(PLAYER_TOKEN_KEY) ?? '';
}

function loadPlayerUser() {
  const raw = localStorage.getItem(PLAYER_USER_KEY);
  return raw ? (JSON.parse(raw) as PlayerAccount) : null;
}

function savePlayerSession(token: string, user: PlayerAccount) {
  localStorage.setItem(PLAYER_TOKEN_KEY, token);
  localStorage.setItem(PLAYER_USER_KEY, JSON.stringify(user));
}

function clearPlayerSession() {
  localStorage.removeItem(PLAYER_TOKEN_KEY);
  localStorage.removeItem(PLAYER_USER_KEY);
}

function buildNextPath(pathname: string, search: string) {
  return encodeURIComponent(`${pathname}${search}`);
}

function RequirePlayerSession({ children }: { children: ReactNode }) {
  const location = useLocation();
  const token = loadPlayerToken();
  if (!token) {
    return <Navigate to={`/acesso?next=${buildNextPath(location.pathname, location.search)}`} replace />;
  }
  return <>{children}</>;
}

function Shell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const showBack = location.pathname !== '/';

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-3xl content-start gap-5 px-4 py-5 sm:py-8">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {showBack ? (
            <Button type="button" variant="ghost" className="h-11 w-11 shrink-0 px-0" onClick={() => navigate(-1)}>
              <ArrowLeft size={18} />
            </Button>
          ) : null}
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <img src="/logo.png" alt="Quem fez isso?" className="h-11 w-11 shrink-0 rounded-md border-2 border-ink bg-white object-contain" />
            <div className="min-w-0">
              <p className="truncate text-xl font-black text-ink sm:text-2xl">Quem fez isso?</p>
              <p className="truncate text-xs font-black uppercase tracking-wide text-zinc-600">Who Did It?</p>
            </div>
          </Link>
        </div>
        <div className="h-10 w-10 rounded-md border-2 border-ink bg-teal shadow-crisp" aria-hidden />
      </header>
      {children}
      <footer className="mt-2 flex items-center gap-2 border-t-2 border-ink pt-3 text-xs font-bold text-zinc-600">
        <Coffee size={14} className="text-zinc-500" />
        <span>Desenvolvido por Maria Clara.</span>
      </footer>
    </main>
  );
}

function Home() {
  const [code, setCode] = useState('');
  const navigate = useNavigate();
  const token = loadPlayerToken();
  const user = loadPlayerUser();

  function enterRoom(event: FormEvent) {
    event.preventDefault();
    if (!code.trim()) return;
    if (!token) {
      navigate(`/acesso?next=${encodeURIComponent(`/room/${code.trim()}/lobby`)}`);
      return;
    }
    navigate(`/room/${code.trim()}/lobby`);
  }

  return (
    <Shell>
      <section className="grid gap-4">
        <div className="grid gap-4 rounded-lg border-2 border-ink bg-gold p-5 shadow-crisp">
          <div className="flex flex-wrap items-center gap-4">
            <img src="/logo.png" alt="Quem fez isso?" className="h-24 w-auto" />
            <div className="grid gap-1">
              <h1 className="text-4xl font-black leading-none sm:text-5xl">Quem fez isso?</h1>
              <p className="text-xl font-black">Who Did It?</p>
            </div>
          </div>
          <p className="max-w-xl text-lg font-bold">Pergunta na mesa, voto secreto e ranking sem misericordia.</p>
          {token && user ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => navigate('/painel')}>Abrir painel</Button>
              <Button type="button" onClick={() => navigate('/create-room')}>Criar sala</Button>
              <Button type="button" variant="ghost" onClick={() => { clearPlayerSession(); navigate('/'); }}>Sair</Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => navigate('/acesso')}>Entrar</Button>
              <Button type="button" variant="secondary" onClick={() => navigate('/cadastro')}>Cadastrar</Button>
            </div>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <form onSubmit={enterRoom} className="grid gap-4">
              <h2 className="text-2xl font-black">Entrar na sala</h2>
              <Field label="Numero da sala">
                <Input value={code} onChange={(event) => setCode(event.target.value)} placeholder="4821" />
              </Field>
              <Button type="submit" variant="secondary">Abrir sala</Button>
            </form>
          </Card>
          {!token ? (
            <Card className="grid content-between gap-4">
              <div className="grid gap-2">
                <Users size={36} className="text-tomato" />
                <h2 className="text-2xl font-black">Modo visitante</h2>
                <p className="font-bold">Sem login e sem backend, com jogo local no navegador.</p>
              </div>
              <Button onClick={() => navigate('/visitante')}>
                Entrar <ArrowRight className="ml-2 inline" size={18} />
              </Button>
            </Card>
          ) : null}
        </div>
        <div className="pt-1">
          <Link to="/help" className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-wide text-ink underline decoration-2 underline-offset-4">
            <BookOpen size={16} />
            Ajuda e regras
          </Link>
        </div>
      </section>
    </Shell>
  );
}

function HelpPage() {
  const navigate = useNavigate();

  return (
    <Shell>
      <section className="grid gap-4">
        <div className="grid gap-4 rounded-lg border-2 border-ink bg-gold p-5 shadow-crisp">
          <div className="flex flex-wrap items-center gap-4">
            <img src="/logo.png" alt="Quem fez isso?" className="h-24 w-24 shrink-0 rounded-md border-2 border-ink bg-white object-contain" />
            <div className="grid gap-2">
              <p className="text-sm font-black uppercase tracking-wide text-zinc-700">Guia do jogo</p>
              <h1 className="text-4xl font-black leading-none sm:text-5xl">Ajuda, regras e funções</h1>
              <p className="max-w-2xl text-lg font-bold">Tudo o que você precisa para jogar, criar sala e controlar a rodada sem sair da tela.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border-2 border-ink bg-white p-3">
              <p className="text-xs font-black uppercase tracking-wide text-zinc-600">Passo 1</p>
              <p className="mt-1 text-sm font-bold">Crie a sala e ajuste regras, categorias e tempo.</p>
            </div>
            <div className="rounded-md border-2 border-ink bg-teal p-3 text-white">
              <p className="text-xs font-black uppercase tracking-wide opacity-90">Passo 2</p>
              <p className="mt-1 text-sm font-bold">Os jogadores entram, acompanham a vez e votam.</p>
            </div>
            <div className="rounded-md border-2 border-ink bg-tomato p-3 text-white">
              <p className="text-xs font-black uppercase tracking-wide opacity-90">Passo 3</p>
              <p className="mt-1 text-sm font-bold">Veja o resultado, o ranking e siga para a próxima rodada.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="grid gap-4 bg-white">
            <div className="flex items-center gap-3">
              <BookOpen className="text-tomato" size={28} />
              <div>
                <h2 className="text-2xl font-black">Manual</h2>
                <p className="text-sm font-bold text-zinc-600">Fluxo básico de uso.</p>
              </div>
            </div>
            <ol className="grid gap-3">
              <li className="rounded-md border-2 border-ink bg-paper p-3 font-bold">1. Crie a sala e configure nome, pontos, categorias e tempo de voto.</li>
              <li className="rounded-md border-2 border-ink bg-paper p-3 font-bold">2. Adicione os jogadores e comece a partida no momento certo.</li>
              <li className="rounded-md border-2 border-ink bg-paper p-3 font-bold">3. Em cada rodada, a pergunta aparece e os jogadores votam no culpado.</li>
              <li className="rounded-md border-2 border-ink bg-paper p-3 font-bold">4. Veja o resultado e siga para a próxima rodada ou final da partida.</li>
            </ol>
          </Card>

          <Card className="grid gap-4 bg-white">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-teal" size={28} />
              <div>
                <h2 className="text-2xl font-black">Regras</h2>
                <p className="text-sm font-bold text-zinc-600">O que o jogo espera de cada rodada.</p>
              </div>
            </div>
            <div className="grid gap-3">
              <div className="rounded-md border-2 border-ink bg-tomato p-3 text-white">
                Se o tempo de voto acabar, a vez é pulada e o voto fica vazio.
              </div>
              <div className="rounded-md border-2 border-ink bg-gold p-3 font-bold">
                Cada jogador pode votar uma vez por rodada. Ninguém vota em si mesmo.
              </div>
              <div className="rounded-md border-2 border-ink bg-paper p-3 font-bold">
                A partida termina quando alguém alcança a pontuação máxima da sala.
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="grid gap-4 bg-teal text-white">
            <div className="flex items-center gap-3">
              <UserRound size={28} />
              <div>
                <h2 className="text-2xl font-black">Opções do jogador</h2>
                <p className="text-sm font-bold opacity-90">O que aparece para quem está jogando.</p>
              </div>
            </div>
            <ul className="grid gap-2 text-sm font-bold">
              <li>Entrar na sala pelo código.</li>
              <li>Ver sua vez na rodada atual.</li>
              <li>Escolher um suspeito para votar.</li>
              <li>Acompanhar o placar e o resultado.</li>
            </ul>
          </Card>

          <Card className="grid gap-4 bg-paper">
            <div className="flex items-center gap-3">
              <Crown className="text-tomato" size={28} />
              <div>
                <h2 className="text-2xl font-black">Opções do anfitrião</h2>
                <p className="text-sm font-bold text-zinc-600">Controle da sala e da rodada.</p>
              </div>
            </div>
            <ul className="grid gap-2 text-sm font-bold">
              <li>Criar a sala e escolher o tempo de voto.</li>
              <li>Filtrar perguntas por categoria.</li>
              <li>Adicionar jogadores antes de iniciar.</li>
              <li>Gerenciar a partida até o fim.</li>
            </ul>
          </Card>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 inline" size={18} /> Voltar
          </Button>
          <Button variant="secondary" onClick={() => navigate('/')}>
            <Users className="mr-2 inline" size={18} /> Ir para a home
          </Button>
        </div>
      </section>
    </Shell>
  );
}

function PlayerPanel() {
  const navigate = useNavigate();
  const token = loadPlayerToken();
  const storedUser = loadPlayerUser();
  const [user, setUser] = useState<PlayerAccount | null>(storedUser);
  const [profile, setProfile] = useState({
    username: storedUser?.username ?? '',
    email: storedUser?.email ?? '',
    name: storedUser?.name ?? '',
    password: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    if (user) {
      setProfile({
        username: user.username,
        email: user.email,
        name: user.name,
        password: '',
      });
    }
  }, [token, user?.id]);

  useEffect(() => {
    if (!token) {
      navigate('/acesso', { replace: true });
    }
  }, [token, navigate]);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const updated = await gameApi.updatePlayerProfile(token, profile);
      savePlayerSession(token, updated);
      setUser(updated);
      setProfile((current) => ({ ...current, password: '' }));
      setSuccess('Perfil atualizado.');
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  if (!token || !user) {
    return <Shell><Loading /></Shell>;
  }

  return (
    <Shell>
      <section className="grid gap-4">
        <Card className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase text-zinc-600">Painel do jogador</p>
              <h1 className="text-3xl font-black">Ola, {user.name}</h1>
              <p className="font-bold">{user.username} · {user.email}</p>
            </div>
            <Button type="button" variant="ghost" onClick={() => navigate('/')}>Voltar</Button>
          </div>
          <form onSubmit={saveProfile} className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Usuario">
                <Input value={profile.username} onChange={(event) => setProfile({ ...profile, username: event.target.value })} />
              </Field>
              <Field label="Email">
                <Input type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} />
              </Field>
            </div>
            <Field label="Nome">
              <Input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} />
            </Field>
            <Field label="Nova senha">
              <Input type="password" value={profile.password} onChange={(event) => setProfile({ ...profile, password: event.target.value })} placeholder="Deixe vazio para manter a senha" />
            </Field>
            <ErrorMessage message={error} />
            {success ? <p className="font-bold text-teal">{success}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar perfil'}</Button>
              <Button type="button" onClick={() => navigate('/create-room')}>Criar sala</Button>
              <Button type="button" variant="secondary" onClick={() => navigate('/acesso')}>Entrar na sala</Button>
              <Button type="button" variant="ghost" onClick={() => { clearPlayerSession(); navigate('/'); }}>Sair</Button>
            </div>
          </form>
        </Card>
      </section>
    </Shell>
  );
}

function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const next = new URLSearchParams(location.search).get('next') ?? '/';
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const session = await gameApi.login(form);
      savePlayerSession(session.token, session.user);
      navigate(next, { replace: true });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell>
      <Card className="grid gap-4">
        <div className="grid gap-2">
          <h1 className="text-3xl font-black">Entrar</h1>
          <p className="font-bold">Use email ou nome de usuario para acessar as salas.</p>
        </div>
        <ErrorMessage message={error} />
        <form onSubmit={submit} className="grid gap-4">
          <Field label="Email ou usuario">
            <Input value={form.identifier} onChange={(event) => setForm({ ...form, identifier: event.target.value })} />
          </Field>
          <Field label="Senha">
            <Input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          </Field>
          <Button disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</Button>
        </form>
        <p className="font-bold">
          Nao tem conta?{' '}
          <button type="button" className="underline" onClick={() => navigate(`/cadastro?next=${encodeURIComponent(next)}`)}>
            Cadastrar
          </button>
        </p>
      </Card>
    </Shell>
  );
}

function RegisterPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const next = new URLSearchParams(location.search).get('next') ?? '/';
  const [form, setForm] = useState({ username: '', email: '', name: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const session = await gameApi.register(form);
      savePlayerSession(session.token, session.user);
      navigate(next, { replace: true });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell>
      <Card className="grid gap-4">
        <div className="grid gap-2">
          <h1 className="text-3xl font-black">Cadastrar</h1>
          <p className="font-bold">Crie sua conta para acessar as salas com sessao.</p>
        </div>
        <ErrorMessage message={error} />
        <form onSubmit={submit} className="grid gap-4">
          <Field label="Nome de usuario">
            <Input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </Field>
          <Field label="Nome">
            <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </Field>
          <Field label="Senha">
            <Input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          </Field>
          <Button disabled={loading}>{loading ? 'Cadastrando...' : 'Cadastrar'}</Button>
        </form>
        <p className="font-bold">
          Ja tem conta?{' '}
          <button type="button" className="underline" onClick={() => navigate(`/acesso?next=${encodeURIComponent(next)}`)}>
            Entrar
          </button>
        </p>
      </Card>
    </Shell>
  );
}

function CreateRoom() {
  const [categories, setCategories] = useState<Category[]>([]);
  const token = loadPlayerToken();
  const [form, setForm] = useState({
    name: 'Noite de Jogos',
    maxPlayers: 6,
    maxScore: 5,
    gameMode: 'classic',
    voteVisibility: 'anonymous',
    voteTimeEnabled: false,
    voteTimeSeconds: 30,
    categoryFilter: 'all',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    gameApi.listCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const room = await gameApi.createRoom(token, form);
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
                {categories.filter((category) => category.isActive).map((category) => (
                  <option key={category.id} value={category.slug}>{category.name}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
            <label className="flex items-center gap-3 rounded-md border-2 border-ink bg-paper px-3 py-3 font-black">
              <input
                type="checkbox"
                checked={form.voteTimeEnabled}
                onChange={(e) => setForm({ ...form, voteTimeEnabled: e.target.checked })}
                className="h-5 w-5 accent-black"
              />
              Tempo de voto
            </label>
            <Field label="Max. segundos">
              <Input
                type="number"
                min={10}
                max={60}
                disabled={!form.voteTimeEnabled}
                value={form.voteTimeSeconds}
                onChange={(e) => setForm({ ...form, voteTimeSeconds: Number(e.target.value) })}
              />
            </Field>
          </div>
          <p className="text-sm font-bold">Sem seleção específica, a sala usa todas as categorias.</p>
          <p className="text-sm font-bold">Se o tempo acabar sem voto, a vez pula e conta como voto vazio.</p>          <Button disabled={loading}>{loading ? 'Criando...' : 'Criar sala'}</Button>
        </form>
      </Card>
    </Shell>
  );
}

function Admin() {
  const emptyForm = { text: '', category: 'geral', level: 'leve' };
  const [token, setToken] = useState(() => localStorage.getItem('adminToken') ?? '');
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(() => {
    const stored = localStorage.getItem('adminUser');
    return stored ? JSON.parse(stored) as AdminUser : null;
  });
  const [login, setLogin] = useState({ username: 'admin', password: '' });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [filters, setFilters] = useState({ search: '', category: 'all', level: 'all', status: 'all' });
  const [importCsv, setImportCsv] = useState('text,category,level\nQuem fez isso no rolÃª?,festa,leve\nQuem fez isso no improviso?,caos,medio');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editing, setEditing] = useState(emptyForm);
  const [categoryForm, setCategoryForm] = useState({ name: '', slug: '' });
  const [categoryEditingId, setCategoryEditingId] = useState<number | null>(null);
  const [categoryEditing, setCategoryEditing] = useState({ name: '', slug: '' });
  const [adminForm, setAdminForm] = useState({ username: '', name: '', password: '', role: 'manager', permissions: ['questions', 'categories'] });
  const [adminPasswords, setAdminPasswords] = useState<Record<number, string>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const activeCount = questions.filter((question) => question.isActive).length;
  const inactiveCount = questions.length - activeCount;
  const categoryStats = buildStats(questions.map((question) => question.category));
  const levelStats = buildStats(questions.map((question) => question.level));
  const permissions = currentUser?.permissions ?? [];
  const can = (permission: string) => permissions.includes('all') || permissions.includes(permission);
  const filteredQuestions = questions.filter((question) => {
    const search = filters.search.trim().toLowerCase();
    const matchesSearch = !search || question.text.toLowerCase().includes(search);
    const matchesCategory = filters.category === 'all' || question.category === filters.category;
    const matchesLevel = filters.level === 'all' || question.level === filters.level;
    const matchesStatus = filters.status === 'all' || (filters.status === 'active' ? question.isActive : !question.isActive);
    return matchesSearch && matchesCategory && matchesLevel && matchesStatus;
  });

  async function load(nextToken = token) {
    if (!nextToken) return;
    setLoading(true);
    setError('');
    try {
      const [loadedQuestions, loadedCategories, loadedDashboard, loadedRooms, loadedPlayers, loadedAdmins] = await Promise.all([
        gameApi.listQuestions(true),
        gameApi.listCategories(true),
        gameApi.adminDashboard(nextToken),
        can('rooms') ? gameApi.adminRooms(nextToken) : Promise.resolve([]),
        can('players') ? gameApi.adminPlayers(nextToken) : Promise.resolve([]),
        can('admins') ? gameApi.adminUsers(nextToken) : Promise.resolve([]),
      ]);
      setQuestions(loadedQuestions);
      setCategories(loadedCategories);
      setDashboard(loadedDashboard);
      setRooms(loadedRooms);
      setPlayers(loadedPlayers);
      setAdminUsers(loadedAdmins);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [token]);

  async function submitLogin(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      const session = await gameApi.adminLogin(login);
      localStorage.setItem('adminToken', session.token);
      localStorage.setItem('adminUser', JSON.stringify(session.user));
      setToken(session.token);
      setCurrentUser(session.user);
      setLogin({ username: session.user.username, password: '' });
      setActiveTab('dashboard');
    } catch (err) {
      setError(apiError(err));
    }
  }

  function logout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setToken('');
    setCurrentUser(null);
  }

  async function createQuestion(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!form.text.trim()) return setError('Informe a pergunta.');
    try {
      await gameApi.createQuestion(token, { ...form, text: form.text.trim() });
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(apiError(err));
    }
  }

  async function importFromCsv(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await gameApi.importQuestionsCsv(token, importCsv);
      load();
    } catch (err) {
      setError(apiError(err));
    }
  }

  async function importFromFile(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!importFile) {
      setError('Escolha um arquivo CSV ou JSON.');
      return;
    }
    try {
      await gameApi.importQuestionsFile(token, importFile);
      setImportFile(null);
      load();
    } catch (err) {
      setError(apiError(err));
    }
  }

  function startEdit(question: Question) {
    setEditingId(question.id);
    setEditing({ text: question.text, category: question.category, level: question.level });
  }

  async function saveEdit(question: Question) {
    setError('');
    if (!editing.text.trim()) return setError('Informe a pergunta.');
    try {
      await gameApi.updateQuestion(token, question.id, { ...editing, text: editing.text.trim(), isActive: question.isActive });
      setEditingId(null);
      load();
    } catch (err) {
      setError(apiError(err));
    }
  }

  async function toggleQuestion(question: Question) {
    setError('');
    try {
      if (question.isActive) {
        await gameApi.deactivateQuestion(token, question.id);
      } else {
        await gameApi.updateQuestion(token, question.id, { isActive: true });
      }
      load();
    } catch (err) {
      setError(apiError(err));
    }
  }

  async function createCategory(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!categoryForm.name.trim()) return setError('Informe o nome da categoria.');
    try {
      await gameApi.createCategory(token, { name: categoryForm.name.trim(), slug: categoryForm.slug.trim() || undefined });
      setCategoryForm({ name: '', slug: '' });
      load();
    } catch (err) {
      setError(apiError(err));
    }
  }

  function startCategoryEdit(category: Category) {
    setCategoryEditingId(category.id);
    setCategoryEditing({ name: category.name, slug: category.slug });
  }

  async function saveCategoryEdit(category: Category) {
    setError('');
    if (!categoryEditing.name.trim()) return setError('Informe o nome da categoria.');
    try {
      await gameApi.updateCategory(token, category.id, {
        name: categoryEditing.name.trim(),
        slug: categoryEditing.slug.trim(),
      });
      setCategoryEditingId(null);
      load();
    } catch (err) {
      setError(apiError(err));
    }
  }

  async function toggleCategory(category: Category) {
    setError('');
    try {
      if (category.isActive) {
        await gameApi.deactivateCategory(token, category.id);
      } else {
        await gameApi.updateCategory(token, category.id, { isActive: true });
      }
      load();
    } catch (err) {
      setError(apiError(err));
    }
  }

  async function updateRoom(room: AdminRoom) {
    setError('');
    try {
      await gameApi.updateAdminRoom(token, room.roomId, room);
      load();
    } catch (err) {
      setError(apiError(err));
    }
  }

  async function deleteRoom(room: AdminRoom) {
    setError('');
    try {
      await gameApi.deleteAdminRoom(token, room.roomId);
      load();
    } catch (err) {
      setError(apiError(err));
    }
  }

  async function updatePlayer(player: AdminPlayer) {
    setError('');
    try {
      await gameApi.updateAdminPlayer(token, player.id, player);
      load();
    } catch (err) {
      setError(apiError(err));
    }
  }

  async function deletePlayer(player: AdminPlayer) {
    setError('');
    try {
      await gameApi.deleteAdminPlayer(token, player.id);
      load();
    } catch (err) {
      setError(apiError(err));
    }
  }

  async function createAdmin(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await gameApi.createAdminUser(token, adminForm);
      setAdminForm({ username: '', name: '', password: '', role: 'manager', permissions: ['questions', 'categories'] });
      load();
    } catch (err) {
      setError(apiError(err));
    }
  }

  async function updateAdmin(admin: AdminUser, payload: Partial<AdminUser> & { password?: string }) {
    setError('');
    try {
      await gameApi.updateAdminUser(token, admin.id, payload);
      load();
    } catch (err) {
      setError(apiError(err));
    }
  }

  function toggleAdminFormPermission(permission: string) {
    const hasPermission = adminForm.permissions.includes(permission);
    setAdminForm({
      ...adminForm,
      permissions: hasPermission
        ? adminForm.permissions.filter((item) => item !== permission)
        : [...adminForm.permissions, permission],
    });
  }

  function toggleAdminPermission(admin: AdminUser, permission: string) {
    const hasPermission = admin.permissions.includes(permission);
    setAdminUsers(adminUsers.map((item) => item.id === admin.id ? {
      ...item,
      permissions: hasPermission
        ? item.permissions.filter((current) => current !== permission)
        : [...item.permissions, permission],
    } : item));
  }

  if (!token) {
    return (
      <Shell>
        <Card className="grid gap-4">
          <h1 className="text-3xl font-black">Admin</h1>
          <form onSubmit={submitLogin} className="grid gap-3">
            <Field label="Usuario">
              <Input value={login.username} onChange={(event) => setLogin({ ...login, username: event.target.value })} />
            </Field>
            <Field label="Senha">
              <Input type="password" value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} />
            </Field>
            <Button type="submit">Entrar</Button>
          </form>
          <ErrorMessage message={error} />
        </Card>
      </Shell>
    );
  }

  const tabs = [
    ['dashboard', 'Dashboard', true],
    ['questions', 'Perguntas', can('questions')],
    ['categories', 'Categorias', can('categories')],
    ['import', 'Importar', can('questions')],
    ['rooms', 'Salas', can('rooms')],
    ['players', 'Usuarios', can('players')],
    ['admins', 'Admins', can('admins')],
    ['stats', 'Graficos', true],
  ] as const;

  return (
    <Shell>
      <section className="grid gap-4">
        <div className="rounded-lg border-2 border-ink bg-gold p-5 shadow-crisp">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-black">Admin</h1>
              <p className="mt-2 font-bold">Quem fez isso? Who Did It?</p>
            </div>
            <Button type="button" variant="ghost" onClick={logout}>Sair</Button>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-4">
          {tabs.filter(([, , visible]) => visible).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`rounded-md border-2 border-ink px-3 py-2 text-sm font-black ${activeTab === id ? 'bg-teal text-white' : 'bg-paper'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <ErrorMessage message={error} />
        {loading ? <Loading /> : null}
        {activeTab === 'dashboard' && dashboard ? (
          <Card className="grid gap-4">
            <h2 className="text-2xl font-black">Dashboard</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatBox label="Salas" value={dashboard.totals.rooms ?? 0} tone="bg-gold" />
              <StatBox label="Jogadores" value={dashboard.totals.players ?? 0} tone="bg-teal text-white" />
              <StatBox label="Perguntas" value={dashboard.totals.questions ?? 0} tone="bg-zinc-700 text-white" />
              <StatBox label="Categorias" value={dashboard.totals.categories ?? 0} tone="bg-paper" />
              <StatBox label="Salas ativas" value={dashboard.totals.activeRooms ?? 0} tone="bg-paper" />
              <StatBox label="Vencedores" value={dashboard.totals.winners ?? 0} tone="bg-paper" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <BarChart title="Salas por status" stats={dashboard.roomsByStatus} total={Math.max(1, dashboard.totals.rooms ?? 0)} />
              <BarChart title="Jogadores por sala" stats={dashboard.playersByRoom} total={Math.max(1, dashboard.totals.players ?? 0)} />
              <BarChart title="Perguntas por categoria" stats={dashboard.questionsByCategory} total={Math.max(1, dashboard.totals.questions ?? 0)} />
              <BarChart title="Perguntas por nivel" stats={dashboard.questionsByLevel} total={Math.max(1, dashboard.totals.questions ?? 0)} />
              <BarChart title="Admins por perfil" stats={dashboard.adminsByRole} total={Math.max(1, dashboard.totals.admins ?? 0)} />
              <BarChart title="Admins por status" stats={dashboard.adminsByStatus} total={Math.max(1, dashboard.totals.admins ?? 0)} />
            </div>
            <div className="grid gap-2">
              <h3 className="text-xl font-black">Atividade por data</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <BarChart title="Salas criadas" stats={dashboard.roomsByDate} total={Math.max(1, maxStatValue(dashboard.roomsByDate))} />
                <BarChart title="Usuarios cadastrados" stats={dashboard.playersByDate} total={Math.max(1, maxStatValue(dashboard.playersByDate))} />
                <BarChart title="Perguntas cadastradas" stats={dashboard.questionsByDate} total={Math.max(1, maxStatValue(dashboard.questionsByDate))} />
                <BarChart title="Admins cadastrados" stats={dashboard.adminsByDate} total={Math.max(1, maxStatValue(dashboard.adminsByDate))} />
                <BarChart title="Vencedores por data" stats={dashboard.winnersByDate} total={Math.max(1, maxStatValue(dashboard.winnersByDate))} />
              </div>
            </div>
            <div className="grid gap-2">
              <h3 className="text-xl font-black">Cadastros recentes</h3>
              <div className="grid gap-4 lg:grid-cols-2">
                <RecentList title="Salas" items={dashboard.recentRooms} />
                <RecentList title="Usuarios" items={dashboard.recentPlayers} />
                <RecentList title="Perguntas" items={dashboard.recentQuestions} />
                <RecentList title="Admins" items={dashboard.recentAdmins} />
              </div>
            </div>
            <div className="grid gap-2">
              <h3 className="text-xl font-black">Vencedores recentes</h3>
              {dashboard.recentWinners.length === 0 ? <p className="font-bold">Nenhum vencedor ainda.</p> : null}
              {dashboard.recentWinners.map((winner) => (
                <div key={`${winner.playerId}-${winner.roomCode}`} className="rounded-md border-2 border-ink bg-paper p-3 font-bold">
                  {winner.name} fez {winner.score} ponto(s) na sala {winner.roomCode} - {winner.roomName}
                </div>
              ))}
            </div>
          </Card>
        ) : null}
        {activeTab === 'questions' ? (
        <Card id="admin-questions">
          <form onSubmit={createQuestion} className="grid gap-4">
            <h2 className="text-2xl font-black">Nova pergunta</h2>
            <Field label="Pergunta">
              <Input value={form.text} onChange={(event) => setForm({ ...form, text: event.target.value })} placeholder="Quem mais provavelmente..." />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Categoria">
                {categories.filter((category) => category.isActive).length > 0 ? (
                  <Select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
                    {categories.filter((category) => category.isActive).map((category) => (
                      <option key={category.id} value={category.slug}>{category.name}</option>
                    ))}
                  </Select>
                ) : (
                  <Input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
                )}
              </Field>
              <Field label="Nivel">
                <Select value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })}>
                  <option value="leve">Leve</option>
                  <option value="medio">Medio</option>
                  <option value="pesado">Pesado</option>
                  <option value="caos">Caos</option>
                </Select>
              </Field>
            </div>
            <Button type="submit"><Plus className="mr-2 inline" size={18} /> Adicionar</Button>
          </form>
        </Card>
        ) : null}
        {activeTab === 'categories' ? (
        <Card id="admin-categories" className="grid gap-4">
          <h2 className="text-2xl font-black">Categorias</h2>
          <form onSubmit={createCategory} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <Field label="Nome">
              <Input
                value={categoryForm.name}
                onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })}
                placeholder="Ex: Festa"
              />
            </Field>
            <Field label="Slug (opcional)">
              <Input
                value={categoryForm.slug}
                onChange={(event) => setCategoryForm({ ...categoryForm, slug: event.target.value })}
                placeholder="Ex: festa"
              />
            </Field>
            <Button type="submit" className="self-end"><Plus className="mr-2 inline" size={18} /> Adicionar</Button>
          </form>
          <div className="grid gap-3">
            {categories.map((category) => (
              <div
                key={category.id}
                className={`grid gap-3 rounded-md border-2 border-ink p-3 ${category.isActive ? 'bg-paper' : 'bg-zinc-200 opacity-75'}`}
              >
                {categoryEditingId === category.id ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      value={categoryEditing.name}
                      onChange={(event) => setCategoryEditing({ ...categoryEditing, name: event.target.value })}
                    />
                    <Input
                      value={categoryEditing.slug}
                      onChange={(event) => setCategoryEditing({ ...categoryEditing, slug: event.target.value })}
                    />
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-lg font-black leading-snug">{category.name}</p>
                      <p className="text-sm font-bold text-zinc-700">slug: {category.slug}</p>
                      <p className="text-xs font-bold text-zinc-600">Criada em {formatAdminDate(category.createdAt)} Â· Atualizada em {formatAdminDate(category.updatedAt)}</p>
                    </div>
                    <span className={`rounded-md px-2 py-1 text-sm font-black ${category.isActive ? 'bg-teal text-white' : 'bg-zinc-500 text-white'}`}>
                      {category.isActive ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2">
                  {categoryEditingId === category.id ? (
                    <Button type="button" onClick={() => saveCategoryEdit(category)}><Save size={18} /></Button>
                  ) : (
                    <Button type="button" variant="ghost" onClick={() => startCategoryEdit(category)}><Edit3 size={18} /></Button>
                  )}
                  <Button type="button" variant="secondary" onClick={() => toggleCategory(category)}>
                    {category.isActive ? <EyeOff size={18} /> : <Eye size={18} />}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setCategoryEditingId(null);
                      setCategoryEditing({ name: '', slug: '' });
                    }}
                  >
                    OK
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
        ) : null}
        {activeTab === 'import' ? (
        <Card id="admin-import" className="grid gap-4">
          <h2 className="text-2xl font-black">Importar perguntas</h2>
          <p className="font-bold">Formato aceito no CSV: `text,category,level`.</p>
          <form onSubmit={importFromFile} className="grid gap-3">
            <Field label="Arquivo CSV ou JSON">
              <Input type="file" accept=".csv,.json" onChange={(event) => setImportFile(event.target.files?.[0] ?? null)} />
            </Field>
            <Button type="submit" variant="secondary">Importar arquivo</Button>
          </form>
          <form onSubmit={importFromCsv} className="grid gap-3">
            <Field label="CSV bruto">
              <textarea
                value={importCsv}
                onChange={(event) => setImportCsv(event.target.value)}
                rows={6}
                className="min-h-32 rounded-md border-2 border-ink bg-white px-3 py-2 text-base"
              />
            </Field>
            <Button type="submit">Importar CSV</Button>
          </form>
        </Card>
        ) : null}
        {activeTab === 'rooms' ? (
        <Card className="grid gap-3">
          <h2 className="text-2xl font-black">Salas</h2>
          {rooms.length === 0 ? <p className="font-bold">Nenhuma sala encontrada.</p> : null}
          {rooms.map((room) => (
            <div key={room.roomId} className="grid gap-3 rounded-md border-2 border-ink bg-paper p-3">
              <div className="flex flex-wrap justify-between gap-2 font-black">
                <span>{room.code} - {room.name}</span>
                <span>{room.playersCount} jogador(es)</span>
              </div>
              <p className="text-xs font-bold text-zinc-600">Criada em {formatAdminDate(room.createdAt)} Â· Atualizada em {formatAdminDate(room.updatedAt)}</p>
              <div className="grid gap-2 sm:grid-cols-4">
                <Input value={room.name} onChange={(event) => setRooms(rooms.map((item) => item.roomId === room.roomId ? { ...item, name: event.target.value } : item))} />
                <Input type="number" value={room.maxPlayers} onChange={(event) => setRooms(rooms.map((item) => item.roomId === room.roomId ? { ...item, maxPlayers: Number(event.target.value) } : item))} />
                <Input type="number" value={room.maxScore} onChange={(event) => setRooms(rooms.map((item) => item.roomId === room.roomId ? { ...item, maxScore: Number(event.target.value) } : item))} />
                <Select value={room.status} onChange={(event) => setRooms(rooms.map((item) => item.roomId === room.roomId ? { ...item, status: event.target.value as Room['status'] } : item))}>
                  <option value="waiting_players">Aguardando</option>
                  <option value="ready">Pronta</option>
                  <option value="in_progress">Em jogo</option>
                  <option value="finished">Finalizada</option>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" onClick={() => updateRoom(room)}>Salvar</Button>
                <Button type="button" variant="ghost" onClick={() => deleteRoom(room)}>Excluir</Button>
              </div>
            </div>
          ))}
        </Card>
        ) : null}
        {activeTab === 'players' ? (
        <Card className="grid gap-3">
          <h2 className="text-2xl font-black">Usuarios do jogo</h2>
          {players.length === 0 ? <p className="font-bold">Nenhum usuario encontrado.</p> : null}
          {players.map((player) => (
            <div key={player.id} className="grid gap-3 rounded-md border-2 border-ink bg-paper p-3">
              <p className="font-black">Sala {player.roomCode} - {player.roomName}</p>
              <p className="text-xs font-bold text-zinc-600">Cadastrado em {formatAdminDate(player.createdAt)} Â· Atualizado em {formatAdminDate(player.updatedAt)}</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <Input value={player.name} onChange={(event) => setPlayers(players.map((item) => item.id === player.id ? { ...item, name: event.target.value } : item))} />
                <Input type="number" value={player.score} onChange={(event) => setPlayers(players.map((item) => item.id === player.id ? { ...item, score: Number(event.target.value) } : item))} />
                <label className="flex items-center gap-2 rounded-md border-2 border-ink bg-white px-3 py-2 font-black">
                  <input type="checkbox" checked={!!player.isHost} onChange={(event) => setPlayers(players.map((item) => item.id === player.id ? { ...item, isHost: event.target.checked } : item))} />
                  Host
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" onClick={() => updatePlayer(player)}>Salvar</Button>
                <Button type="button" variant="ghost" onClick={() => deletePlayer(player)}>Excluir</Button>
              </div>
            </div>
          ))}
        </Card>
        ) : null}
        {activeTab === 'admins' ? (
        <Card className="grid gap-4">
          <h2 className="text-2xl font-black">Administradores</h2>
          <form onSubmit={createAdmin} className="grid gap-3">
              <div className="grid gap-3 md:grid-cols-3 items-start">
                <Field label="Usuario"><Input value={adminForm.username} onChange={(event) => setAdminForm({ ...adminForm, username: event.target.value })} /></Field>
                <Field label="Nome"><Input value={adminForm.name} onChange={(event) => setAdminForm({ ...adminForm, name: event.target.value })} /></Field>
                <Field label="Senha"><Input type="password" value={adminForm.password} onChange={(event) => setAdminForm({ ...adminForm, password: event.target.value })} /></Field>
              </div>
            <Field label="Perfil">
              <Select value={adminForm.role} onChange={(event) => setAdminForm({ ...adminForm, role: event.target.value })}>
                <option value="owner">Owner</option>
                <option value="manager">Manager</option>
                <option value="viewer">Viewer</option>
              </Select>
            </Field>
            <div className="grid gap-2 sm:grid-cols-5">
              {['questions', 'categories', 'rooms', 'players', 'admins'].map((permission) => (
                <label key={permission} className="flex items-center gap-2 rounded-md border-2 border-ink bg-white px-3 py-2 font-black">
                  <input type="checkbox" checked={adminForm.permissions.includes(permission)} onChange={() => toggleAdminFormPermission(permission)} />
                  {permission}
                </label>
              ))}
            </div>
            <Button type="submit">Cadastrar admin</Button>
          </form>
          {adminUsers.map((admin) => (
            <div key={admin.id} className="grid gap-2 rounded-md border-2 border-ink bg-paper p-3">
              <div className="flex flex-wrap justify-between gap-2 font-black">
                <span>{admin.username}</span>
                <span>{admin.isActive ? 'Ativo' : 'Inativo'}</span>
              </div>
              <div className="grid gap-3 md:grid-cols-3 items-start">
                <Field label="Nome">
                  <Input value={admin.name} onChange={(event) => setAdminUsers(adminUsers.map((item) => item.id === admin.id ? { ...item, name: event.target.value } : item))} />
                </Field>
                <Field label="Perfil">
                  <Select value={admin.role} onChange={(event) => setAdminUsers(adminUsers.map((item) => item.id === admin.id ? { ...item, role: event.target.value as AdminUser['role'] } : item))}>
                    <option value="owner">Owner</option>
                    <option value="manager">Manager</option>
                    <option value="viewer">Viewer</option>
                  </Select>
                </Field>
                <Field label="Nova senha">
                  <Input
                    type="password"
                    value={adminPasswords[admin.id] ?? ''}
                    onChange={(event) => setAdminPasswords({ ...adminPasswords, [admin.id]: event.target.value })}
                    placeholder="Opcional"
                  />
                </Field>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {['questions', 'categories', 'rooms', 'players', 'admins'].map((permission) => (
                  <label key={permission} className="flex items-center gap-2 rounded-md border-2 border-ink bg-white px-3 py-2 font-black">
                    <input type="checkbox" checked={admin.permissions.includes(permission) || admin.permissions.includes('all')} onChange={() => toggleAdminPermission(admin, permission)} />
                    {permission}
                  </label>
                ))}
              </div>
              <p className="text-xs font-bold text-zinc-600">Criado em {formatAdminDate(admin.createdAt)} Â· Atualizado em {formatAdminDate(admin.updatedAt)}</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  onClick={() => updateAdmin(admin, {
                    name: admin.name,
                    role: admin.role,
                    permissions: admin.permissions,
                    password: adminPasswords[admin.id] || undefined,
                  })}
                >
                  Salvar
                </Button>
                <Button type="button" variant="secondary" onClick={() => updateAdmin(admin, { isActive: !admin.isActive })}>
                  {admin.isActive ? 'Desativar' : 'Ativar'}
                </Button>
              </div>
            </div>
          ))}
        </Card>
        ) : null}
        {activeTab === 'stats' ? (
        <Card id="admin-stats" className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-black">Graficos</h2>
            <span className="rounded-md bg-ink px-3 py-1 text-sm font-black text-white">{questions.length} perguntas</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatBox label="Total" value={questions.length} tone="bg-gold" />
            <StatBox label="Ativas" value={activeCount} tone="bg-teal text-white" />
            <StatBox label="Inativas" value={inactiveCount} tone="bg-zinc-500 text-white" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <BarChart title="Por categoria" stats={categoryStats} total={questions.length} />
            <BarChart title="Por nivel" stats={levelStats} total={questions.length} />
          </div>
        </Card>
        ) : null}
        {activeTab === 'questions' ? (
        <Card className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-black">Perguntas</h2>
            <span className="rounded-md bg-ink px-3 py-1 text-sm font-black text-white">{filteredQuestions.length}/{questions.length}</span>
          </div>
          <div className="grid gap-3 md:grid-cols-4 items-start">
            <Field label="Buscar">
              <Input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Texto" />
            </Field>
            <Field label="Categoria">
              <Select value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })}>
                <option value="all">Todas</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.slug}>{category.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Nivel">
              <Select value={filters.level} onChange={(event) => setFilters({ ...filters, level: event.target.value })}>
                <option value="all">Todos</option>
                <option value="leve">Leve</option>
                <option value="medio">Medio</option>
                <option value="pesado">Pesado</option>
                <option value="caos">Caos</option>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
                <option value="all">Todos</option>
                <option value="active">Ativas</option>
                <option value="inactive">Inativas</option>
              </Select>
            </Field>
          </div>
          <div className="grid gap-3">
            {filteredQuestions.map((question) => (
              <div key={question.id} className={`grid gap-3 rounded-md border-2 border-ink p-3 ${question.isActive ? 'bg-paper' : 'bg-zinc-200 opacity-75'}`}>
                {editingId === question.id ? (
                  <>
                    <Input value={editing.text} onChange={(event) => setEditing({ ...editing, text: event.target.value })} />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input value={editing.category} onChange={(event) => setEditing({ ...editing, category: event.target.value })} />
                      <Select value={editing.level} onChange={(event) => setEditing({ ...editing, level: event.target.value })}>
                        <option value="leve">Leve</option>
                        <option value="medio">Medio</option>
                        <option value="pesado">Pesado</option>
                        <option value="caos">Caos</option>
                      </Select>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-black leading-snug">{question.text}</p>
                    <p className="text-xs font-bold text-zinc-600">Criada em {formatAdminDate(question.createdAt)} Â· Atualizada em {formatAdminDate(question.updatedAt)}</p>
                    <div className="flex flex-wrap gap-2 text-sm font-black">
                      <span className="rounded-md bg-white px-2 py-1">{question.category}</span>
                      <span className="rounded-md bg-white px-2 py-1">{question.level}</span>
                      <span className={`rounded-md px-2 py-1 ${question.isActive ? 'bg-teal text-white' : 'bg-zinc-500 text-white'}`}>
                        {question.isActive ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>
                  </>
                )}
                <div className="grid grid-cols-3 gap-2">
                  {editingId === question.id ? (
                    <Button type="button" onClick={() => saveEdit(question)}><Save size={18} /></Button>
                  ) : (
                    <Button type="button" variant="ghost" onClick={() => startEdit(question)}><Edit3 size={18} /></Button>
                  )}
                  <Button type="button" variant="secondary" onClick={() => toggleQuestion(question)}>
                    {question.isActive ? <EyeOff size={18} /> : <Eye size={18} />}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setEditingId(null)}>OK</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
        ) : null}
      </section>
    </Shell>
  );
}

function buildStats(items: string[]) {
  return Object.entries(
    items.reduce<Record<string, number>>((acc, item) => {
      const key = item || 'sem categoria';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

function formatAdminDate(value?: string | null) {
  if (!value) return 'Sem data';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function maxStatValue(stats: Array<{ value: number }>) {
  return Math.max(0, ...stats.map((stat) => stat.value));
}

function StatBox({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`rounded-md border-2 border-ink p-3 ${tone}`}>
      <p className="text-sm font-black uppercase">{label}</p>
      <p className="text-3xl font-black">{value}</p>
    </div>
  );
}

function BarChart({ title, stats, total }: { title: string; stats: Array<{ label: string; value: number }>; total: number }) {
  return (
    <div className="grid gap-3 rounded-md border-2 border-ink bg-paper p-3">
      <h3 className="text-lg font-black">{title}</h3>
      {stats.length === 0 ? <p className="font-bold">Sem dados.</p> : null}
      {stats.map((item) => {
        const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;
        return (
          <div key={item.label} className="grid gap-1">
            <div className="flex justify-between gap-3 text-sm font-black">
              <span className="truncate">{item.label}</span>
              <span>{item.value} Â· {percent}%</span>
            </div>
            <div className="h-4 overflow-hidden rounded-sm border-2 border-ink bg-white">
              <div className="h-full bg-tomato" style={{ width: `${percent}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RecentList({ title, items }: { title: string; items: Array<{ label: string; createdAt?: string | null; updatedAt?: string | null; meta: string }> }) {
  return (
    <div className="grid gap-2 rounded-md border-2 border-ink bg-paper p-3">
      <h4 className="text-lg font-black">{title}</h4>
      <div className="grid gap-2">
        {items.length === 0 ? <p className="text-sm font-bold">Sem registros recentes.</p> : null}
        {items.map((item) => (
          <div key={`${title}-${item.label}-${item.createdAt ?? 'na'}`} className="rounded-md border border-ink bg-white p-2 text-sm font-bold">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="truncate">{item.label}</span>
              <span className="text-zinc-600">{item.meta}</span>
            </div>
            <p className="mt-1 text-xs text-zinc-600">
              Criado em {formatAdminDate(item.createdAt)} Â· Atualizado em {formatAdminDate(item.updatedAt)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function useRoom(code?: string) {
  const token = loadPlayerToken();
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!code) return;
    setLoading(true);
    setError('');
    try {
      setRoom(await gameApi.getRoom(token, code));
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
  const navigate = useNavigate();
  const user = loadPlayerUser();

  if (loading) return <Shell><Loading /></Shell>;
  const players = room?.players ?? [];

  return (
    <Shell>
      <ErrorMessage message={error} />
      <Card className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black">{room?.name}</h1>
            <p className="font-bold">Codigo {code}</p>
            {user ? <p className="font-bold">Voce entrou como {user.name}.</p> : null}
          </div>
          <Button type="button" variant="ghost" onClick={() => navigator.clipboard?.writeText(code)}>
            <Copy size={18} />
          </Button>
        </div>
        <div className="grid gap-2">
          {players.map((player) => (
            <div key={player.id} className="rounded-md border-2 border-ink bg-paper px-3 py-2 font-black">{player.name}</div>
          ))}
        </div>
        <Button variant="secondary" type="button" onClick={() => reload()}>
          Atualizar lista
        </Button>
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
  const token = loadPlayerToken();
  const [actionError, setActionError] = useState('');
  const navigate = useNavigate();

  async function start() {
    setActionError('');
    try {
      await gameApi.startRoom(token, code);
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
            <p className="font-bold">Sala {code} Â· {players.length}/{room?.maxPlayers}</p>
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
  const token = loadPlayerToken();
  const [round, setRound] = useState<Round | null>(null);
  const [voterIndex, setVoterIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const navigate = useNavigate();

  async function loadRound() {
    setLoading(true);
    setError('');
    try {
      const stored = Number(localStorage.getItem(roundKey(code)));
      const current = stored ? await gameApi.getRound(token, stored) : await gameApi.createRound(token, code);
      localStorage.setItem(roundKey(code), String(current.roundId));
      if (current.status === 'finished') {
        navigate(`/room/${code}/result`);
        return;
      }
      setRound(current);
      setNow(Date.now());
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

  useEffect(() => {
    if (!round?.voteDeadlineAt || round.status !== 'waiting_votes') return undefined;

    const timer = window.setInterval(() => {
      setNow(Date.now());
      if (Date.parse(round.voteDeadlineAt ?? '') <= Date.now()) {
        loadRound();
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [round?.voteDeadlineAt, round?.status]);

  const voter = round?.players[voterIndex];
  const options = useMemo(() => round?.players.filter((player) => player.id !== voter?.id) ?? [], [round, voter]);
  const secondsLeft = round?.voteDeadlineAt ? Math.max(0, Math.ceil((Date.parse(round.voteDeadlineAt) - now) / 1000)) : null;

  async function vote() {
    if (!round || !voter || !selected) return;
    setError('');
    try {
      const progress = await gameApi.vote(token, round.roundId, voter.id, selected);
      setSelected(null);
      if (progress.allVotesReceived) {
        navigate(`/room/${code}/result`);
      } else {
        const updated = await gameApi.getRound(token, round.roundId);
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
        {secondsLeft !== null ? (
          <div className="rounded-md border-2 border-ink bg-teal px-3 py-2 font-black">
            Tempo restante: {secondsLeft}s
          </div>
        ) : null}
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
  const token = loadPlayerToken();
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
        setResult(await gameApi.result(token, roundId));
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
      <Route path="/acesso" element={<AuthPage />} />
      <Route path="/cadastro" element={<RegisterPage />} />
      <Route path="/painel" element={<RequirePlayerSession><PlayerPanel /></RequirePlayerSession>} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/visitante" element={<VisitorMode />} />
      <Route path="/create-room" element={<RequirePlayerSession><CreateRoom /></RequirePlayerSession>} />
      <Route path="/room/:code/setup-players" element={<RequirePlayerSession><SetupPlayers /></RequirePlayerSession>} />
      <Route path="/room/:code/lobby" element={<RequirePlayerSession><Lobby /></RequirePlayerSession>} />
      <Route path="/room/:code/game" element={<RequirePlayerSession><Game /></RequirePlayerSession>} />
      <Route path="/room/:code/result" element={<RequirePlayerSession><Result /></RequirePlayerSession>} />
      <Route path="/room/:code/final" element={<RequirePlayerSession><Final /></RequirePlayerSession>} />
      <Route path="/help" element={<HelpPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

