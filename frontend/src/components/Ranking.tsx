import { Trophy } from 'lucide-react';
import type { Player } from '../types/game';

export function Ranking({ players }: { players: Player[] }) {
  return (
    <div className="grid gap-2">
      {players.map((player, index) => (
        <div key={player.id} className="flex items-center justify-between rounded-md border-2 border-ink bg-paper px-3 py-2">
          <span className="flex items-center gap-2 font-black">
            {index === 0 ? <Trophy size={18} className="text-tomato" /> : <span className="w-[18px] text-center">{index + 1}</span>}
            {player.name}
          </span>
          <span className="rounded-md bg-ink px-2 py-1 text-sm font-black text-white">{player.score}</span>
        </div>
      ))}
    </div>
  );
}
