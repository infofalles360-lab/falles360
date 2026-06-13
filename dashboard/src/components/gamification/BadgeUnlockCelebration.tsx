import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Sparkles, Trophy } from 'lucide-react';
import type { QueuedGamificationCelebration } from '../../hooks/useGamification';
import { cn } from '../../utils/cn';

interface BadgeUnlockCelebrationProps {
  item: QueuedGamificationCelebration | null;
  isDarkMode: boolean;
  onDismiss: (id: string) => void;
}

export function BadgeUnlockCelebration({ item, isDarkMode, onDismiss }: BadgeUnlockCelebrationProps) {
  const animationVariant = item ? Math.abs((item.sortOrder || item.badgeId || 0) % 3) : 0;
  const cardInitialStates = [
    { opacity: 0, scale: 0.82, y: 40, rotate: -2 },
    { opacity: 0, scale: 0.9, x: -44, rotate: -6 },
    { opacity: 0, scale: 0.86, x: 44, y: 18, rotate: 6 },
  ];
  const iconAnimations = [
    { scale: [1, 1.08, 1], rotate: [0, 6, -4, 0] },
    { scale: [1, 1.14, 1], y: [0, -8, 0], rotate: [0, -8, 5, 0] },
    { scale: [1, 1.06, 1.1, 1], rotate: [0, 12, -10, 0] },
  ];

  useEffect(() => {
    if (!item) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onDismiss(item.id);
    }, 4800);

    return () => window.clearTimeout(timeoutId);
  }, [item, onDismiss]);

  return (
    <AnimatePresence>
      {item ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9300] flex items-center justify-center bg-[rgba(15,23,42,0.58)] p-4 backdrop-blur-md"
          onClick={() => onDismiss(item.id)}
        >
          <motion.div
            initial={cardInitialStates[animationVariant]}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            onClick={(event) => event.stopPropagation()}
            className={cn(
              'relative w-full max-w-[420px] overflow-hidden rounded-[2.6rem] border px-6 pb-7 pt-8 text-center shadow-[0_40px_120px_rgba(15,23,42,0.36)]',
              isDarkMode
                ? 'border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,99,33,0.28),transparent_34%),linear-gradient(180deg,#0f172a,#111827)] text-white'
                : 'border-white/80 bg-[radial-gradient(circle_at_top,rgba(255,99,33,0.18),transparent_34%),linear-gradient(180deg,#fffaf6,#ffffff)] text-slate-950'
            )}
          >
            <motion.div
              animate={animationVariant === 1 ? { scale: [1, 1.12, 1], rotate: [0, 180, 360] } : { rotate: 360 }}
              transition={{ duration: animationVariant === 1 ? 5.5 : 12, repeat: Infinity, ease: 'linear' }}
              className={cn(
                'pointer-events-none absolute left-1/2 top-10 h-40 w-40 -translate-x-1/2 rounded-full border border-brand/20',
                animationVariant === 2 && 'rounded-[2.4rem]'
              )}
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),transparent)]" />

            <div className="relative">
              <motion.div
                initial={{ scale: 0.7, rotate: -12 }}
                animate={iconAnimations[animationVariant]}
                transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 1.2 }}
                className="mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] border border-brand/30 bg-[linear-gradient(180deg,#ff8a4c,#ff6321)] text-white shadow-[0_24px_60px_rgba(255,99,33,0.34)]"
              >
                {item.iconUrl ? (
                  <img src={item.iconUrl} alt={item.name} className="h-full w-full rounded-[2rem] object-cover" />
                ) : (
                  <Trophy className="h-10 w-10" />
                )}
              </motion.div>

              <div className="mt-6 flex items-center justify-center gap-2">
                <span className="rounded-full bg-brand px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                  Nueva insignia
                </span>
                <span
                  className={cn(
                    'rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]',
                    item.rarity === 'legendary'
                      ? 'bg-slate-900 text-white'
                      : item.rarity === 'epic'
                        ? 'bg-[#ffe7db] text-brand'
                        : item.rarity === 'special'
                          ? 'bg-amber-100 text-amber-700'
                          : isDarkMode
                            ? 'bg-white/10 text-white/70'
                            : 'bg-slate-100 text-slate-600'
                  )}
                >
                  {item.rarity}
                </span>
              </div>

              <h3 className="mt-4 text-[2rem] font-black leading-[0.92] tracking-tight">
                {item.name}
              </h3>
              <p className="mt-3 text-sm font-bold leading-6 opacity-72">
                {item.description}
              </p>

              <div className={cn('mt-5 rounded-[1.6rem] border px-4 py-4', isDarkMode ? 'border-white/10 bg-white/[0.05]' : 'border-slate-100 bg-[#fff7f1]')}>
                <div className="flex items-center justify-center gap-2 text-brand">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-[11px] font-black uppercase tracking-[0.16em]">
                    Ya forma parte de tu pasaporte fallero
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onDismiss(item.id)}
                className="mt-6 inline-flex items-center justify-center rounded-[1.2rem] bg-brand px-5 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-white shadow-[0_18px_40px_rgba(255,99,33,0.28)]"
              >
                Seguir explorando
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
