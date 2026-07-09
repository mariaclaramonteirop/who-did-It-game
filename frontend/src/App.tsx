import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Check, Copy, Edit3, Eye, EyeOff, Play, Plus, RotateCcw, Save, Users } from 'lucide-react';
import { apiError, gameApi } from './api/client';
import { Button, Card, ErrorMessage, Field, Input, Loading, Select } from './components/ui';
import { Ranking } from './components/Ranking';
import type { AdminDashboard, AdminPlayer, AdminRoom, AdminUser, Category, Player, Question, Room, Round, RoundResult } from './types/game';

const roundKey = (code: string) => `jdc-round-${code}`;

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto grid min-h-screen w-full max-w-3xl content-start gap-5 px-4 py-5 sm:py-8">
      <header className="flex items-center justify-between gap-3">
        <Link to="/" className="text-xl font-black text-ink sm:text-2xl">Quem fez isso?</Link>
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
          <h1 className="text-4xl font-black leading-none sm:text-5xl">Quem fez isso?</h1>
          <p className="mt-1 text-xl font-black">Who Did It?</p>
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    name: 'Noite de Jogos',
    maxPlayers: 6,
    maxScore: 5,
    gameMode: 'classic',
    voteVisibility: 'anonymous',
    categoryFilter: [] as string[],
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
              <Select
                multiple
                value={form.categoryFilter}
                onChange={(e) => setForm({ ...form, categoryFilter: Array.from(e.target.selectedOptions).map((option) => option.value) })}
                className="min-h-32"
              >
                {categories.filter((category) => category.isActive).map((category) => (
                  <option key={category.id} value={category.slug}>{category.name}</option>
                ))}
              </Select>
            </Field>
          </div>
          <p className="text-sm font-bold">Sem seleção, a sala usa todas as categorias.</p>
          <Button disabled={loading}>{loading ? 'Criando...' : 'Criar sala'}</Button>
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
  const [importCsv, setImportCsv] = useState('text,category,level\nQuem fez isso no rolê?,festa,leve\nQuem fez isso no improviso?,caos,medio');
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
                      <p className="text-xs font-bold text-zinc-600">Criada em {formatAdminDate(category.createdAt)} · Atualizada em {formatAdminDate(category.updatedAt)}</p>
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
              <p className="text-xs font-bold text-zinc-600">Criada em {formatAdminDate(room.createdAt)} · Atualizada em {formatAdminDate(room.updatedAt)}</p>
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
              <p className="text-xs font-bold text-zinc-600">Cadastrado em {formatAdminDate(player.createdAt)} · Atualizado em {formatAdminDate(player.updatedAt)}</p>
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
              <p className="text-xs font-bold text-zinc-600">Criado em {formatAdminDate(admin.createdAt)} · Atualizado em {formatAdminDate(admin.updatedAt)}</p>
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
                    <p className="text-xs font-bold text-zinc-600">Criada em {formatAdminDate(question.createdAt)} · Atualizada em {formatAdminDate(question.updatedAt)}</p>
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
              <span>{item.value} · {percent}%</span>
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
              Criado em {formatAdminDate(item.createdAt)} · Atualizado em {formatAdminDate(item.updatedAt)}
            </p>
          </div>
        ))}
      </div>
    </div>
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
      <Route path="/admin" element={<Admin />} />
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
