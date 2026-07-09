import axios from 'axios';
import type { AdminDashboard, AdminPlayer, AdminRoom, AdminUser, Room, Round, RoundResult, Player, Question, Category } from '../types/game';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080',
});

export function apiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? 'Nao foi possivel conectar ao servidor.';
  }
  return 'Algo saiu do esperado.';
}

function auth(token: string) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

export const gameApi = {
  createRoom: (payload: unknown) => api.post<Room>('/rooms', payload).then((r) => r.data),
  getRoom: (code: string) => api.get<Room>(`/rooms/${code}`).then((r) => r.data),
  addPlayer: (code: string, name: string) => api.post<Player>(`/rooms/${code}/players`, { name }).then((r) => r.data),
  startRoom: (code: string) => api.post<Room>(`/rooms/${code}/start`).then((r) => r.data),
  createRound: (code: string) => api.post<Round>(`/rooms/${code}/rounds`).then((r) => r.data),
  getRound: (id: number) => api.get<Round>(`/rounds/${id}`).then((r) => r.data),
  vote: (roundId: number, voterPlayerId: number, votedPlayerId: number) =>
    api.post(`/rounds/${roundId}/votes`, { voterPlayerId, votedPlayerId }).then((r) => r.data),
  result: (roundId: number) => api.get<RoundResult>(`/rounds/${roundId}/result`).then((r) => r.data),
  ranking: (code: string) => api.get<Player[]>(`/rooms/${code}/ranking`).then((r) => r.data),
  listQuestions: (includeInactive = false) =>
    api.get<Question[]>('/questions', { params: includeInactive ? { includeInactive: 1 } : {} }).then((r) => r.data),
  adminLogin: (payload: { username: string; password: string }) =>
    api.post<{ token: string; user: AdminUser }>('/admin/login', payload).then((r) => r.data),
  adminDashboard: (token: string) => api.get<AdminDashboard>('/admin/dashboard', auth(token)).then((r) => r.data),
  adminRooms: (token: string) => api.get<AdminRoom[]>('/admin/rooms', auth(token)).then((r) => r.data),
  updateAdminRoom: (token: string, id: number, payload: Partial<AdminRoom>) =>
    api.patch<AdminRoom>(`/admin/rooms/${id}`, payload, auth(token)).then((r) => r.data),
  deleteAdminRoom: (token: string, id: number) => api.delete(`/admin/rooms/${id}`, auth(token)).then((r) => r.data),
  adminPlayers: (token: string) => api.get<AdminPlayer[]>('/admin/players', auth(token)).then((r) => r.data),
  updateAdminPlayer: (token: string, id: number, payload: Partial<AdminPlayer>) =>
    api.patch<Player>(`/admin/players/${id}`, payload, auth(token)).then((r) => r.data),
  deleteAdminPlayer: (token: string, id: number) => api.delete(`/admin/players/${id}`, auth(token)).then((r) => r.data),
  adminUsers: (token: string) => api.get<AdminUser[]>('/admin/users', auth(token)).then((r) => r.data),
  createAdminUser: (token: string, payload: { username: string; name: string; password: string; role: string; permissions: string[] }) =>
    api.post<AdminUser>('/admin/users', payload, auth(token)).then((r) => r.data),
  updateAdminUser: (token: string, id: number, payload: Partial<AdminUser> & { password?: string }) =>
    api.patch<AdminUser>(`/admin/users/${id}`, payload, auth(token)).then((r) => r.data),
  createQuestion: (token: string, payload: Omit<Question, 'id' | 'isActive'>) => api.post<Question>('/questions', payload, auth(token)).then((r) => r.data),
  updateQuestion: (token: string, id: number, payload: Partial<Omit<Question, 'id'>>) =>
    api.patch<Question>(`/questions/${id}`, payload, auth(token)).then((r) => r.data),
  deactivateQuestion: (token: string, id: number) => api.delete<Question>(`/questions/${id}`, auth(token)).then((r) => r.data),
  importQuestionsFile: (token: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/questions/import', formData, { headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` } }).then((r) => r.data);
  },
  importQuestionsCsv: (token: string, csv: string) => api.post('/questions/import', { csv }, auth(token)).then((r) => r.data),
  listCategories: (includeInactive = false) =>
    api.get<Category[]>('/categories', { params: includeInactive ? { includeInactive: 1 } : {} }).then((r) => r.data),
  createCategory: (token: string, payload: { name: string; slug?: string }) => api.post<Category>('/categories', payload, auth(token)).then((r) => r.data),
  updateCategory: (token: string, id: number, payload: Partial<{ name: string; slug: string; isActive: boolean }>) =>
    api.patch<Category>(`/categories/${id}`, payload, auth(token)).then((r) => r.data),
  deactivateCategory: (token: string, id: number) => api.delete<Category>(`/categories/${id}`, auth(token)).then((r) => r.data),
};
