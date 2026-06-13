import React, { useEffect, useMemo, useState } from 'react';
import { MapPin, Play, Sparkles } from 'lucide-react';
import { cn } from '../utils/cn';
import { formatShortDateTime, getCountdownParts, getNextRecurringEventDate } from '../utils/date';

interface CountdownEvent {
  title: string;
  time: string;
  location: string;
  date: string;
}

interface CountdownCardProps {
  compact?: boolean;
  isDarkMode: boolean;
  event: CountdownEvent | null;
}

export function CountdownCard({ isDarkMode, event, compact = false }: CountdownCardProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const nextOccurrence = useMemo(() => {
    if (!event) {
      return null;
    }

    return getNextRecurringEventDate(event.date, event.time, now);
  }, [event, now]);

  const countdown = useMemo(() => {
    if (!nextOccurrence) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    return getCountdownParts(nextOccurrence, now);
  }, [nextOccurrence, now]);

  const countdownUnits = [
    { value: countdown.days, label: 'Dias' },
    { value: countdown.hours, label: 'Horas' },
    { value: countdown.minutes, label: 'Min' },
    { value: countdown.seconds, label: 'Seg' },
  ];

  return (
    <section className="relative h-full">
      <div
        className={cn(
          'relative h-full overflow-hidden border shadow-[0_30px_80px_rgba(15,23,42,0.12)] transition-all duration-500',
          compact ? 'rounded-[2.1rem] p-5 sm:p-6' : 'rounded-[2.6rem] p-6 sm:p-7',
          isDarkMode
            ? 'border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(255,99,33,0.14),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.04))]'
            : 'border-white/80 bg-[radial-gradient(circle_at_top_right,rgba(255,152,94,0.18),transparent_22%),linear-gradient(180deg,#ffffff_0%,#fff7f0_100%)]'
        )}
      >
        <div className="pointer-events-none absolute -left-8 top-10 h-24 w-24 rounded-full bg-brand/10 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '18px 18px' }} />

        <div className={cn('relative z-10 flex h-full flex-col justify-between', compact ? 'gap-4' : 'gap-6')}>
          <div className={cn(compact ? 'space-y-4' : 'space-y-5')}>
            <div className="flex items-start justify-between gap-4">
              <div className={cn(compact ? 'space-y-2.5' : 'space-y-3')}>
                <span className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-brand">
                  <Sparkles className="h-3.5 w-3.5" />
                  Cuenta atras
                </span>
                <div>
                  <h3 className={cn('font-black leading-[0.95] tracking-[-0.05em]', compact ? 'text-[1.7rem] sm:text-[2rem]' : 'text-[2.1rem] sm:text-[2.5rem]')}>
                    {event?.title ?? 'Proximo acto'}
                  </h3>
                  <p className={cn('font-bold opacity-55', compact ? 'mt-1.5 text-[12px]' : 'mt-2 text-[13px]')}>
                    {nextOccurrence ? formatShortDateTime(nextOccurrence) : 'Fecha pendiente'}
                  </p>
                </div>
              </div>

              <div
                className={cn(
                  'hidden shrink-0 border text-right sm:block',
                  compact ? 'rounded-[1.2rem] px-3 py-2' : 'rounded-[1.4rem] px-3 py-2',
                  isDarkMode ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-white/80'
                )}
              >
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-brand">Ubicacion</p>
                <div className="mt-2 flex items-center gap-2 text-[11px] font-bold opacity-60">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="max-w-[10rem] truncate">{event?.location ?? 'Sin ubicacion'}</span>
                </div>
              </div>
            </div>

            <p className={cn('max-w-2xl font-bold opacity-60', compact ? 'text-[13px] leading-5' : 'text-sm leading-6')}>
              Un bloque rapido para ver cuanto queda hasta el siguiente momento clave sin salir del mapa.
            </p>
          </div>

          <div className={cn('relative z-10 flex flex-col', compact ? 'gap-3' : 'gap-4')}>
            <div className={cn('grid grid-cols-2 sm:grid-cols-4', compact ? 'gap-2.5' : 'gap-3')}>
              {countdownUnits.map((unit) => (
                <div
                  key={unit.label}
                  className={cn(
                    'border',
                    compact ? 'rounded-[1.2rem] p-3' : 'rounded-[1.5rem] p-3 sm:p-4',
                    isDarkMode ? 'border-white/10 bg-white/6' : 'border-white/80 bg-white/88'
                  )}
                >
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] opacity-40">{unit.label}</p>
                  <div className={cn('flex items-end gap-2', compact ? 'mt-2.5' : 'mt-3')}>
                    <span className={cn('font-black leading-none tracking-[-0.04em]', compact ? 'text-[1.65rem] sm:text-[1.9rem]' : 'text-[2rem] sm:text-[2.25rem]')}>
                      {String(unit.value).padStart(unit.label === 'Dias' ? 3 : 2, '0')}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">En foco</p>
                <p className={cn('font-bold opacity-60', compact ? 'text-[13px] leading-5' : 'text-sm')}>
                  {event?.location ?? 'Acto pendiente de ubicacion'}
                </p>
              </div>

              <button className={cn('inline-flex items-center gap-3 rounded-full bg-brand text-white shadow-[0_18px_38px_rgba(255,99,33,0.34)] transition-transform hover:scale-[1.02]', compact ? 'h-12 px-4' : 'h-14 px-5')}>
                <span className={cn('flex items-center justify-center rounded-full bg-white/16', compact ? 'h-8 w-8' : 'h-9 w-9')}>
                  <Play className="h-4 w-4 fill-current" />
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.18em]">Acto en foco</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
