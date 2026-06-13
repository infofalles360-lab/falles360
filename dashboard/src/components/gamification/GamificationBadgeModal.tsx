import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Lock, Sparkles, X } from 'lucide-react';
import type { GamificationBadge, GamificationProfile } from '../../utils/gamification';
import { cn } from '../../utils/cn';
import { BadgeCard } from './BadgeCard';

interface GamificationBadgeModalProps {
  isOpen: boolean;
  isDarkMode: boolean;
  isGuest: boolean;
  isLoading: boolean;
  profile: GamificationProfile | null;
  badges: GamificationBadge[];
  onClose: () => void;
  onReplayUnlockedBadges?: () => void;
}

function sortBadges(items: GamificationBadge[]): GamificationBadge[] {
  return [...items].sort((left, right) => {
    if (left.isUnlocked !== right.isUnlocked) {
      return left.isUnlocked ? -1 : 1;
    }

    return left.sortOrder - right.sortOrder;
  });
}

export function GamificationBadgeModal({
  isOpen,
  isDarkMode,
  isGuest,
  isLoading,
  profile,
  badges,
  onClose,
  onReplayUnlockedBadges,
}: GamificationBadgeModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const sortedBadges = sortBadges(badges);
  const unlockedBadges = profile?.totals.badgesUnlocked ?? sortedBadges.filter((badge) => badge.isUnlocked).length;
  const totalBadges = profile?.catalogTotals.totalBadges ?? sortedBadges.length;
  const lockedBadges = Math.max(0, totalBadges - unlockedBadges);
  const completionPercent = totalBadges > 0 ? Math.round((unlockedBadges / totalBadges) * 100) : 0;
  const unlockedItems = sortedBadges.filter((badge) => badge.isUnlocked);
  const lockedItems = sortedBadges.filter((badge) => !badge.isUnlocked);

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9200] flex items-center justify-center bg-[rgba(15,23,42,0.48)] p-4 backdrop-blur-md sm:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 22, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            onClick={(event) => event.stopPropagation()}
            className={cn(
              'flex max-h-[min(90vh,860px)] w-full max-w-[920px] flex-col overflow-hidden rounded-[1.6rem] border shadow-[0_30px_80px_rgba(15,23,42,0.28)]',
              isDarkMode ? 'border-white/10 bg-slate-950 text-white' : 'border-white/90 bg-white text-slate-950'
            )}
          >
            <div className={cn('border-b px-5 py-5 sm:px-6', isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-100 bg-[#fffaf7]')}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Pasaporte fallero</p>
                  <h2 className="mt-2 text-[1.55rem] font-black leading-tight sm:text-[2rem]">Insignias Fallas 360</h2>
                  <p className={cn('mt-2 text-sm font-bold leading-5', isDarkMode ? 'text-white/62' : 'text-slate-500')}>
                    {unlockedBadges} de {totalBadges} insignias desbloqueadas.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className={cn(
                    'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors',
                    isDarkMode ? 'border-white/10 bg-white/8 hover:bg-white/12' : 'border-slate-200 bg-white hover:bg-slate-50'
                  )}
                  aria-label="Cerrar insignias"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {!isGuest ? (
                <div className="mt-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-brand px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white">
                        {completionPercent}% completado
                      </span>
                      <span className={cn('rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em]', isDarkMode ? 'bg-white/8 text-white/72' : 'bg-slate-100 text-slate-600')}>
                        {lockedBadges} pendientes
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {unlockedItems.length > 0 && onReplayUnlockedBadges ? (
                        <button
                          type="button"
                          onClick={onReplayUnlockedBadges}
                          className={cn(
                            'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] transition-colors',
                            isDarkMode ? 'bg-brand/18 text-brand hover:bg-brand/24' : 'bg-brand/10 text-brand hover:bg-brand/15'
                          )}
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          Ver animacion
                        </button>
                      ) : null}
                      <span className={cn('text-[11px] font-black uppercase tracking-[0.14em]', isDarkMode ? 'text-white/48' : 'text-slate-400')}>
                        Nivel {profile?.level.name ?? 'Curioso'}
                      </span>
                    </div>
                  </div>
                  <div className={cn('mt-3 h-2.5 overflow-hidden rounded-full', isDarkMode ? 'bg-white/10' : 'bg-slate-100')}>
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#ff8a4c_0%,#ff6321_100%)] transition-[width] duration-500"
                      style={{ width: `${completionPercent}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
              {isGuest ? (
                <section className={cn('rounded-[1rem] border p-5', isDarkMode ? 'border-white/10 bg-white/[0.05]' : 'border-slate-200 bg-slate-50')}>
                  <div className="flex items-start gap-4">
                    <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-[0.9rem]', isDarkMode ? 'bg-brand/18 text-brand' : 'bg-brand/10 text-brand')}>
                      <Lock className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-[1.25rem] font-black leading-tight">Activa tu pasaporte fallero</h3>
                      <p className={cn('mt-2 text-sm font-bold leading-6', isDarkMode ? 'text-white/62' : 'text-slate-500')}>
                        Inicia sesion para guardar tus insignias y ver tu progreso real.
                      </p>
                    </div>
                  </div>
                </section>
              ) : isLoading && sortedBadges.length === 0 ? (
                <div className="rounded-[1rem] border border-dashed border-brand/30 px-4 py-10 text-center text-sm font-bold opacity-70">
                  Cargando insignias...
                </div>
              ) : sortedBadges.length === 0 ? (
                <div className="rounded-[1rem] border border-dashed border-brand/30 px-4 py-10 text-center text-sm font-bold opacity-70">
                  No hay insignias disponibles todavia.
                </div>
              ) : (
                <div className="space-y-6">
                  {unlockedItems.length > 0 ? (
                    <section>
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h3 className="text-sm font-black uppercase tracking-[0.16em]">Desbloqueadas</h3>
                        <span className={cn('rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em]', isDarkMode ? 'bg-emerald-500/16 text-emerald-300' : 'bg-emerald-50 text-emerald-700')}>
                          {unlockedItems.length}
                        </span>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {unlockedItems.map((badge) => (
                          <BadgeCard key={badge.slug} badge={badge} isDarkMode={isDarkMode} compact />
                        ))}
                      </div>
                    </section>
                  ) : null}

                  <section>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="text-sm font-black uppercase tracking-[0.16em]">Pendientes</h3>
                      <span className={cn('rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em]', isDarkMode ? 'bg-white/8 text-white/70' : 'bg-slate-100 text-slate-600')}>
                        {lockedItems.length}
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {lockedItems.map((badge) => (
                        <BadgeCard key={badge.slug} badge={badge} isDarkMode={isDarkMode} compact />
                      ))}
                    </div>
                  </section>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
