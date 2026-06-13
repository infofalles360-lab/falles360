import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Flame, Maximize2, Minimize2, CalendarDays } from 'lucide-react';
import { cn } from '../utils/cn';
import {
  addMonths,
  formatLongDate,
  formatMonthYear,
  formatShortMonth,
  formatShortWeekday,
  fromIsoDate,
  getCompactDateStrip,
  getMonthGrid,
  getWeekdayLabels,
  isSameDay,
  isSameMonth,
  startOfMonth,
  toIsoDate,
} from '../utils/date';

interface DateSelectorProps {
  compact?: boolean;
  isDarkMode: boolean;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
}

const FALLAS_MONTH_INDEX = 2;
const FALLAS_WEEK_START_DAY = 15;
const FALLAS_WEEK_END_DAY = 19;

export function DateSelector({ isDarkMode, selectedDate, setSelectedDate, compact = false }: DateSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const selectedDateValue = useMemo(() => fromIsoDate(selectedDate), [selectedDate]);
  const today = useMemo(() => fromIsoDate(toIsoDate(new Date())), []);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(selectedDateValue));

  useEffect(() => {
    setVisibleMonth((currentMonth) => (
      isSameMonth(currentMonth, selectedDateValue) ? currentMonth : startOfMonth(selectedDateValue)
    ));
  }, [selectedDateValue]);

  useEffect(() => {
    if (!isExpanded) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsExpanded(false);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExpanded]);

  const compactDates = useMemo(() => getCompactDateStrip(selectedDateValue), [selectedDateValue]);
  const monthGrid = useMemo(() => getMonthGrid(visibleMonth), [visibleMonth]);
  const monthWeeks = useMemo(
    () => Array.from({ length: monthGrid.length / 7 }, (_, index) => monthGrid.slice(index * 7, index * 7 + 7)),
    [monthGrid]
  );
  const weekdayLabels = useMemo(() => getWeekdayLabels(), []);
  const isFallasMonth = visibleMonth.getMonth() === FALLAS_MONTH_INDEX;

  const isFallasDate = (date: Date) => (
    date.getMonth() === FALLAS_MONTH_INDEX
    && date.getDate() >= FALLAS_WEEK_START_DAY
    && date.getDate() <= FALLAS_WEEK_END_DAY
  );

  const fallasWeekIndex = useMemo(
    () => monthWeeks.findIndex((week) => week.some((date) => date && isFallasDate(date))),
    [monthWeeks]
  );

  const getDayButtonClassName = (date: Date) => {
    const selected = isSameDay(date, selectedDateValue);
    const isCurrentDay = isSameDay(date, today);

    if (selected) {
      return 'bg-brand border-brand text-white shadow-[0_22px_48px_rgba(255,99,33,0.34)] scale-[1.02]';
    }

    if (isCurrentDay) {
      return isDarkMode
        ? 'bg-brand/12 border-brand/40 text-white'
        : 'bg-[#fff0e4] border-[#ffb287] text-brand';
    }

    if (isFallasDate(date)) {
      return isDarkMode
        ? 'bg-[linear-gradient(180deg,rgba(255,138,76,0.22),rgba(255,90,40,0.16))] border-orange-300/35 text-white shadow-[0_16px_28px_rgba(255,98,53,0.16)]'
        : 'bg-[linear-gradient(180deg,#fff7f2_0%,#fff1ea_100%)] border-[#ffc59f] text-[#a8431f] shadow-[0_16px_28px_rgba(255,98,53,0.12)]';
    }

    if (isFallasMonth) {
      return isDarkMode
        ? 'bg-white/5 border-white/8 text-white/56 hover:bg-white/10'
        : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(249,247,245,0.98))] border-white/80 text-slate-400 shadow-[0_8px_18px_rgba(148,163,184,0.08)] hover:bg-white';
    }

    return isDarkMode
      ? 'bg-white/5 border-transparent text-white/42 hover:bg-white/10'
      : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100';
  };

  const expandedCalendar =
    isExpanded && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[7000] flex items-center justify-center bg-[rgba(15,23,42,0.34)] backdrop-blur-[12px] p-4 sm:p-6"
            onClick={() => setIsExpanded(false)}
          >
            <div
              className={cn(
                'relative w-full max-w-[920px] overflow-hidden rounded-[2.6rem] border p-6 shadow-[0_32px_100px_rgba(15,23,42,0.22)] sm:p-8',
                isDarkMode ? 'border-white/10 bg-[#111]/95 text-white' : 'border-white/80 bg-[linear-gradient(180deg,#fffaf5_0%,#fff5ec_100%)] text-[#111111]'
              )}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-brand/12 blur-3xl" />
              <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '18px 18px' }} />

              <div className="relative z-10 mb-6 flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-brand">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Calendario completo
                  </div>
                  <h3 className="mt-4 text-[1.5rem] font-black tracking-tight sm:text-[1.7rem]">Calendario Fallero</h3>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] opacity-45">
                    {formatMonthYear(visibleMonth)}
                  </p>
                  {isFallasMonth && (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-brand">
                      <Flame className="h-3.5 w-3.5" />
                      Mes Fallero
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setVisibleMonth((currentMonth) => addMonths(currentMonth, -1))}
                    className={cn(
                      'flex h-11 w-11 items-center justify-center rounded-[1.2rem] border transition-colors',
                      isDarkMode ? 'border-white/10 bg-white/6 hover:bg-white/10' : 'border-white/80 bg-white/92 hover:bg-white'
                    )}
                    aria-label="Mes anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibleMonth((currentMonth) => addMonths(currentMonth, 1))}
                    className={cn(
                      'flex h-11 w-11 items-center justify-center rounded-[1.2rem] border transition-colors',
                      isDarkMode ? 'border-white/10 bg-white/6 hover:bg-white/10' : 'border-white/80 bg-white/92 hover:bg-white'
                    )}
                    aria-label="Mes siguiente"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsExpanded(false)}
                    className="inline-flex items-center gap-2 rounded-[1.2rem] bg-brand px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-[0_16px_32px_rgba(255,99,33,0.26)]"
                  >
                    <Minimize2 className="h-3.5 w-3.5" />
                    Cerrar
                  </button>
                </div>
              </div>

              <div className="relative z-10 space-y-4">
                <div className="grid grid-cols-7 gap-2">
                  {weekdayLabels.map((label) => (
                    <div key={label} className="py-1 text-center text-[10px] font-black uppercase tracking-[0.18em] opacity-40">
                      {label}
                    </div>
                  ))}
                </div>

                <div className="space-y-2 sm:space-y-3">
                  {monthWeeks.map((week, weekIndex) => {
                    const isFallasWeek = isFallasMonth && weekIndex === fallasWeekIndex;

                    return (
                      <div
                        key={`week-${weekIndex}`}
                        className={cn(
                          'grid grid-cols-7 gap-2 rounded-[1.6rem] sm:gap-3',
                          isFallasWeek && (
                            isDarkMode
                              ? 'border border-orange-300/15 bg-[linear-gradient(90deg,rgba(255,117,79,0.12),rgba(255,170,122,0.06))] p-2'
                              : 'border border-[#ffc59f] bg-[linear-gradient(90deg,#fff0e5_0%,#fff7f2_100%)] p-2 shadow-[0_12px_24px_rgba(255,99,33,0.08)]'
                          )
                        )}
                      >
                        {week.map((date, index) => {
                          if (!date) {
                            return <div key={`empty-${weekIndex}-${index}`} className="aspect-square rounded-[1.2rem]" aria-hidden="true" />;
                          }

                          return (
                            <button
                              key={toIsoDate(date)}
                              type="button"
                              onClick={() => {
                                setSelectedDate(toIsoDate(date));
                                setIsExpanded(false);
                              }}
                              className={cn(
                                'aspect-square rounded-[1.25rem] border transition-all flex flex-col items-center justify-center',
                                getDayButtonClassName(date)
                              )}
                            >
                              <span className="text-[1rem] font-black leading-none sm:text-[1.15rem]">{date.getDate()}</span>
                              <span className="mt-1 text-[8px] font-black opacity-55 sm:text-[9px]">{formatShortMonth(date)}</span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <section className="h-full">
        <div
          className={cn(
            'relative h-full overflow-hidden border shadow-[0_16px_34px_rgba(15,23,42,0.1)] transition-all duration-500',
            compact ? 'rounded-[1.35rem] p-4 sm:p-5' : 'rounded-[1.6rem] p-5 sm:p-6',
            isDarkMode
              ? 'border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(255,99,33,0.14),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.04))]'
              : 'border-white/80 bg-[radial-gradient(circle_at_top_right,rgba(255,176,120,0.18),transparent_24%),linear-gradient(180deg,#fffaf5_0%,#fff4ea_100%)]'
          )}
        >
          <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '18px 18px' }} />

          <div className={cn('relative z-10 flex h-full flex-col justify-between', compact ? 'gap-4' : 'gap-6')}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1.5 text-[11px] font-semibold text-brand">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Calendario Fallero
                </div>
                <h3 className={cn('font-black tracking-tight', compact ? 'mt-3 text-[1.2rem]' : 'mt-4 text-[1.35rem]')}>Fecha en foco</h3>
                <p className="mt-1 text-[12px] font-medium opacity-65">
                  {formatLongDate(selectedDateValue)}
                </p>
                {selectedDateValue.getMonth() === FALLAS_MONTH_INDEX && (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1.5 text-[11px] font-semibold text-brand">
                    <Flame className="h-3.5 w-3.5" />
                    Semana Fallera
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-[0.9rem] bg-brand text-[11px] font-semibold text-white shadow-[0_12px_24px_rgba(255,99,33,0.24)]',
                  compact ? 'px-3.5 py-2.5' : 'px-4 py-3'
                )}
              >
                <Maximize2 className="h-3.5 w-3.5" />
                Ver mes
              </button>
            </div>

            <div className={cn('grid grid-cols-5', compact ? 'gap-2.5' : 'gap-3')}>
              {compactDates.map((date) => (
                <button
                  key={toIsoDate(date)}
                  type="button"
                  onClick={() => setSelectedDate(toIsoDate(date))}
                  className={cn(
                    'border transition-all flex flex-col items-center justify-center',
                    compact ? 'aspect-[5/6] rounded-[1.2rem]' : 'aspect-[5/7] rounded-[1.55rem]',
                    getDayButtonClassName(date)
                  )}
                >
                  <span className={cn('font-black opacity-60', compact ? 'mb-0.5 text-[8px]' : 'mb-1 text-[9px]')}>{formatShortWeekday(date)}</span>
                  <span className={cn('font-black leading-none', compact ? 'text-[1.5rem]' : 'text-[1.85rem]')}>{date.getDate()}</span>
                  <span className={cn('font-black opacity-60', compact ? 'mt-0.5 text-[8px]' : 'mt-1 text-[9px]')}>{formatShortMonth(date)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
      {expandedCalendar}
    </>
  );
}
