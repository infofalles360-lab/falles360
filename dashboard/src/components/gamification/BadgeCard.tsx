import type { FC } from 'react';
import { Lock, Sparkles } from 'lucide-react';
import type { GamificationBadge } from '../../utils/gamification';
import { cn } from '../../utils/cn';

interface BadgeCardProps {
  badge: GamificationBadge;
  isDarkMode: boolean;
  compact?: boolean;
}

const rarityClasses: Record<GamificationBadge['rarity'], string> = {
  common: 'bg-slate-100 text-slate-600',
  special: 'bg-amber-100 text-amber-700',
  epic: 'bg-[#ffe9df] text-brand',
  legendary: 'bg-slate-950 text-white',
};

const rarityLabels: Record<GamificationBadge['rarity'], string> = {
  common: 'Comun',
  special: 'Especial',
  epic: 'Epica',
  legendary: 'Legendaria',
};

function formatUnlockedDate(value: string | null): string {
  if (!value) {
    return 'Pendiente';
  }

  const parsed = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) {
    return 'Pendiente';
  }

  return parsed.toLocaleDateString('es-ES');
}

export const BadgeCard: FC<BadgeCardProps> = ({ badge, isDarkMode, compact = false }) => {
  return (
    <article
      className={cn(
        compact
          ? 'relative overflow-hidden rounded-[0.95rem] border p-3 transition-all duration-300'
          : 'relative overflow-hidden rounded-[1.8rem] border p-4 transition-all duration-300 sm:p-5',
        badge.isUnlocked
          ? isDarkMode
            ? 'border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] shadow-[0_20px_44px_rgba(0,0,0,0.22)]'
            : 'border-[#ffe1d3] bg-white'
          : isDarkMode
            ? 'border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] opacity-90'
            : 'border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]'
      )}
    >
      <div className={cn('pointer-events-none absolute inset-x-0 top-0 bg-[radial-gradient(circle_at_top,rgba(255,99,33,0.18),transparent_70%)]', compact ? 'h-14' : 'h-24', badge.isUnlocked ? 'opacity-100' : 'opacity-0')} />

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={cn(
                compact
                  ? 'flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[0.8rem] border'
                  : 'flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[1.25rem] border',
                badge.isUnlocked
                  ? isDarkMode
                    ? 'border-white/12 bg-white/[0.08]'
                    : 'border-[#ffdcca] bg-[#fff6f0]'
                  : isDarkMode
                    ? 'border-white/10 bg-white/[0.06]'
                    : 'border-slate-200 bg-white'
              )}
            >
              {badge.iconUrl ? (
                <img src={badge.iconUrl} alt={badge.name} className="h-full w-full object-cover" />
              ) : badge.isUnlocked ? (
                <Sparkles className="h-5 w-5 text-brand" />
              ) : (
                <Lock className="h-5 w-5 opacity-45" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em]',
                    compact && 'px-2 py-0.5 text-[8px]',
                    badge.isUnlocked ? 'bg-brand text-white' : isDarkMode ? 'bg-white/10 text-white/72' : 'bg-slate-100 text-slate-600'
                  )}
                >
                  {badge.category || 'Insignia'}
                </span>
                <span className={cn('rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em]', compact && 'px-2 py-0.5 text-[8px]', rarityClasses[badge.rarity])}>
                  {rarityLabels[badge.rarity]}
                </span>
              </div>
              <h4 className={cn('mt-3 text-[1.08rem] font-black leading-tight', compact && 'mt-2 text-[0.98rem]')}>{badge.name}</h4>
            </div>
          </div>

          <div
            className={cn(
              'shrink-0 rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em]',
              compact && 'hidden',
              badge.isUnlocked
                ? isDarkMode
                  ? 'border-emerald-400/30 bg-emerald-400/12 text-emerald-300'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : isDarkMode
                  ? 'border-white/10 bg-white/[0.06] text-white/62'
                  : 'border-slate-200 bg-white text-slate-500'
            )}
          >
            {badge.isUnlocked ? 'Activa' : 'Pendiente'}
          </div>
        </div>

        <p className={cn('mt-4 text-sm font-bold leading-6 opacity-75', compact && 'mt-3 line-clamp-2 text-xs leading-5')}>{badge.description}</p>

        {!compact ? (
          <div
            className={cn(
              'mt-4 rounded-[1.3rem] border px-4 py-4',
              isDarkMode ? 'border-white/10 bg-black/10' : 'border-white/80 bg-white/90'
            )}
          >
            <p className="text-[9px] font-black uppercase tracking-[0.16em] opacity-45">Condicion</p>
            <p className="mt-2 text-sm font-black leading-6">{badge.unlockConditionText}</p>
          </div>
        ) : null}

        <div className={cn('mt-4 flex flex-wrap items-center gap-2', compact && 'mt-3')}>
          <span
            className={cn(
              'rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em]',
              badge.isUnlocked
                ? isDarkMode
                  ? 'bg-emerald-500/18 text-emerald-300'
                  : 'bg-emerald-50 text-emerald-700'
                : isDarkMode
                  ? 'bg-white/8 text-white/62'
                  : 'bg-slate-100 text-slate-600'
            )}
          >
            {badge.isUnlocked ? 'Desbloqueada' : 'Bloqueada'}
          </span>
          <span
            className={cn(
              'rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em]',
              isDarkMode ? 'bg-white/8 text-white/62' : 'bg-white text-slate-500'
            )}
          >
            {formatUnlockedDate(badge.unlockedAt)}
          </span>
        </div>
      </div>
    </article>
  );
};
