import axios from 'axios';
import type { Room, Round, RoundResult, Player } from '../types/game';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080',
});

export function apiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? 'Nao foi possivel conectar ao servidor.';
  }
  return 'Algo saiu do esperado.';
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
};
