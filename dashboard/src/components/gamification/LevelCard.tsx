import { Sparkles, Trophy } from 'lucide-react';
import type { GamificationProfile } from '../../utils/gamification';
import { cn } from '../../utils/cn';
import { ProgressBar } from './ProgressBar';

interface LevelCardProps {
  profile: GamificationProfile;
  isDarkMode: boolean;
}

export function LevelCard({ profile, isDarkMode }: LevelCardProps) {
  return (
    <article
      className={cn(
        'rounded-[2rem] border p-5',
        isDarkMode
          ? 'border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(255,99,33,0.2),transparent_36%),rgba(255,255,255,0.05)]'
          : 'border-[#ffe1d3] bg-[radial-gradient(circle_at_top_right,rgba(255,99,33,0.14),transparent_36%),#ffffff]'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Nivel actual</p>
          <h3 className="mt-2 text-[1.8rem] font-black leading-none tracking-tight">{profile.level.name}</h3>
          <p className="mt-2 text-sm font-bold opacity-65">Nivel {profile.level.number} del pasaporte fallero.</p>
        </div>
        <div className={cn('flex h-14 w-14 items-center justify-center rounded-[1.3rem]', isDarkMode ? 'bg-white/10 text-brand' : 'bg-brand/10 text-brand')}>
          <Trophy className="h-6 w-6" />
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className={cn('rounded-[1.3rem] p-4', isDarkMode ? 'bg-white/8' : 'bg-[#fff7f1]')}>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-45">XP acumulada</p>
          <p className="mt-2 text-[1.7rem] font-black leading-none">{profile.xpTotal}</p>
        </div>
        <div className={cn('rounded-[1.3rem] p-4', isDarkMode ? 'bg-white/8' : 'bg-[#fff7f1]')}>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-45">Insignias</p>
          <p className="mt-2 text-[1.7rem] font-black leading-none">{profile.totals.badgesUnlocked}</p>
        </div>
      </div>

      <div className="mt-5">
        <ProgressBar value={profile.level.progressPercent} isDarkMode={isDarkMode} label="Progreso al siguiente nivel" />
      </div>

      <div className="mt-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-brand">
        <Sparkles className="h-4 w-4" />
        {profile.level.nextLevelXp !== null
          ? `${Math.max(0, profile.level.nextLevelXp - profile.xpTotal)} XP para el siguiente rango`
          : 'Nivel máximo actual alcanzado'}
      </div>
    </article>
  );
}
