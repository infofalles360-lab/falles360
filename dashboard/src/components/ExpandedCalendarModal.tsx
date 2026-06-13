import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { addMonths, fromIsoDate, toIsoDate } from '../utils/date';

const WEEKDAY_LABELS = ['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SA'];
const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

interface ExpandedCalendarModalProps {
  isDarkMode: boolean;
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  onDateSelect: (date: string) => void;
  dayEvents?: {
    id: string;
    time: string;
    title: string;
    location?: string;
    description?: string;
  }[];
}

export function ExpandedCalendarModal({
  isDarkMode,
  isOpen,
  onClose,
  selectedDate,
  onDateSelect,
  dayEvents = [],
}: ExpandedCalendarModalProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => fromIsoDate(toIsoDate(new Date())));

  // El calendario siempre abre en el mes real de hoy; la selección de eventos se mantiene aparte.
  useEffect(() => {
    if (isOpen) {
      setCurrentMonth(fromIsoDate(toIsoDate(new Date())));
    }
  }, [isOpen]);

  const goToday = () => {
    const todayIso = toIsoDate(new Date());
    const todayDate = fromIsoDate(todayIso);
    setCurrentMonth(todayDate);
    onDateSelect(todayIso);
  };

  const monthYear = useMemo(() => {
    return {
      month: currentMonth.getMonth(),
      year: currentMonth.getFullYear(),
      monthName: MONTH_NAMES[currentMonth.getMonth()],
    };
  }, [currentMonth]);

  const firstDayOfMonth = useMemo(() => {
    return new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  }, [currentMonth]);

  const lastDayOfMonth = useMemo(() => {
    return new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  }, [currentMonth]);

  const daysInMonth = useMemo(() => {
    return lastDayOfMonth.getDate();
  }, [lastDayOfMonth]);

  const startingDayOfWeek = useMemo(() => {
    return firstDayOfMonth.getDay();
  }, [firstDayOfMonth]);

  const calendarDays = useMemo(() => {
    const days: Array<{ date: Date | null; isCurrentMonth: boolean; isoDate: string }> = [];

    // Días del mes anterior
    const prevMonthLastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, prevMonthLastDay - i);
      days.push({
        date,
        isCurrentMonth: false,
        isoDate: toIsoDate(date),
      });
    }

    // Días del mes actual
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
      days.push({
        date,
        isCurrentMonth: true,
        isoDate: toIsoDate(date),
      });
    }

    // Días del mes siguiente
    const remainingDays = 42 - days.length; // 6 filas × 7 días
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, i);
      days.push({
        date,
        isCurrentMonth: false,
        isoDate: toIsoDate(date),
      });
    }

    return days;
  }, [currentMonth, daysInMonth, startingDayOfWeek]);

  const handlePrevMonth = () => {
    setCurrentMonth(addMonths(currentMonth, -1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleDateClick = (isoDate: string) => {
    onDateSelect(isoDate);
    onClose();
  };

  const selectedDateObj = useMemo(() => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    return { year, month, day };
  }, [selectedDate]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-4 right-4 top-1/2 z-50 w-auto max-w-2xl -translate-y-1/2 sm:left-auto sm:right-auto"
          >
            <div
              className={cn(
                'rounded-[1.8rem] border p-5 shadow-2xl sm:p-7',
                isDarkMode
                  ? 'border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.84))]'
                  : 'border-slate-200/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.95))]'
              )}
            >
              {/* Header */}
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className={cn('text-[10px] font-black uppercase tracking-[0.16em]', isDarkMode ? 'text-white/70' : 'text-slate-500')}>
                    Selecciona una fecha
                  </p>
                  <h3 className={cn('mt-1 text-[1.6rem] font-black tracking-[-0.02em]', isDarkMode ? 'text-white' : 'text-[#122033]')}>
                    {monthYear.monthName} {monthYear.year}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className={cn(
                      'rounded-[0.9rem] border p-2.5 transition-colors',
                      isDarkMode
                        ? 'border-white/12 text-white/70 hover:bg-white/8'
                        : 'border-slate-200/85 text-slate-500 hover:bg-slate-100'
                    )}
                    aria-label="Cerrar"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={goToday}
                    className={cn(
                      'rounded-[0.9rem] border px-3 py-2 text-[9px] font-black uppercase tracking-[0.14em]',
                      isDarkMode ? 'border-white/12 text-white/70' : 'border-slate-200/85 text-slate-600 hover:bg-slate-100'
                    )}
                    aria-label="Hoy"
                    title="Hoy"
                  >
                    Hoy
                  </button>
                </div>
              </div>

              {dayEvents.length > 0 ? (
                <div className={cn('mt-4 rounded-[1.2rem] border p-4', isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200/70 bg-white/60')}>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-brand">Actos del dia</p>
                  <div className="mt-3 space-y-2.5">
                    {dayEvents.map((ev) => (
                      <div key={ev.id} className={cn('rounded-[0.95rem] border p-3', isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200/70 bg-white')}>
                        <div className="flex items-start gap-2">
                          <span className="min-w-[3rem] font-mono text-[11px] font-black text-brand">{ev.time}</span>
                          <div className="min-w-0 flex-1">
                            <p className={cn('text-[13px] font-black', isDarkMode ? 'text-white' : 'text-[#122033]')}>{ev.title}</p>
                            {ev.location ? (
                              <p className={cn('mt-1 text-[11px] font-semibold', isDarkMode ? 'text-white/65' : 'text-slate-600')}>{ev.location}</p>
                            ) : null}
                            {ev.description ? (
                              <p className={cn('mt-1.5 text-[11px] leading-5', isDarkMode ? 'text-white/72' : 'text-slate-700')}>{ev.description}</p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Calendar */}
              <div className={cn('rounded-[1.4rem] border p-5', isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-200/70 bg-white/50')}>
                {/* Navigation */}
                <div className="mb-5 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className={cn(
                      'rounded-[0.8rem] border p-2 transition-colors',
                      isDarkMode
                        ? 'border-white/12 text-white/70 hover:bg-white/8'
                        : 'border-slate-200/85 text-slate-600 hover:bg-slate-100'
                    )}
                    aria-label="Mes anterior"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  <h4 className={cn('text-[1.1rem] font-black tracking-[-0.02em]', isDarkMode ? 'text-white' : 'text-[#122033]')}>
                    {monthYear.monthName} {monthYear.year}
                  </h4>

                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className={cn(
                      'rounded-[0.8rem] border p-2 transition-colors',
                      isDarkMode
                        ? 'border-white/12 text-white/70 hover:bg-white/8'
                        : 'border-slate-200/85 text-slate-600 hover:bg-slate-100'
                    )}
                    aria-label="Próximo mes"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                {/* Weekday headers */}
                <div className="mb-3 grid grid-cols-7 gap-2">
                  {WEEKDAY_LABELS.map((label) => (
                    <div
                      key={label}
                      className={cn(
                        'rounded-[0.8rem] border px-2 py-2 text-center text-[9px] font-black uppercase tracking-[0.12em]',
                        isDarkMode ? 'border-white/10 text-white/60' : 'border-slate-200/70 text-slate-500'
                      )}
                    >
                      {label}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-2">
                  {calendarDays.map((day) => {
                    const isSelected =
                      day.isCurrentMonth &&
                      day.date?.getFullYear() === selectedDateObj.year &&
                      day.date?.getMonth() === selectedDateObj.month - 1 &&
                      day.date?.getDate() === selectedDateObj.day;

                    const isToday =
                      day.isCurrentMonth &&
                      day.date?.toDateString() === new Date().toDateString();

                    return (
                      <button
                        key={day.isoDate}
                        type="button"
                        onClick={() => day.isCurrentMonth && handleDateClick(day.isoDate)}
                        disabled={!day.isCurrentMonth}
                        className={cn(
                          'aspect-square rounded-[0.9rem] border text-center font-black transition-all',
                          day.isCurrentMonth
                            ? isSelected
                              ? 'border-brand bg-brand text-white shadow-[0_8px_16px_rgba(255,99,33,0.24)]'
                              : isToday
                                ? isDarkMode
                                  ? 'border-brand/50 bg-brand/20 text-brand'
                                  : 'border-brand/30 bg-brand/10 text-brand'
                                : isDarkMode
                                  ? 'border-white/10 text-white/82 hover:border-white/20 hover:bg-white/8'
                                  : 'border-slate-200/85 text-[#122033] hover:border-slate-300 hover:bg-slate-100'
                            : isDarkMode
                              ? 'border-transparent text-white/20'
                              : 'border-transparent text-slate-300'
                        )}
                      >
                        {day.date?.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer info */}
              <div className="mt-5 flex items-center justify-between text-[11px]">
                <p className={cn('font-semibold', isDarkMode ? 'text-white/60' : 'text-slate-600')}>
                  Click en un día para seleccionar
                </p>
                <p className={cn('font-black text-brand')}>
                  {monthYear.monthName.substring(0, 3)} {selectedDateObj.day}/{selectedDateObj.month}
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
