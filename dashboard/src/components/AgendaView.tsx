import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Bookmark,
  CalendarDays,
  ChevronRight,
  Clock3,
  Compass,
  Crown,
  Map as MapIcon,
  MapPin,
  Navigation2,
  Radio,
  Search,
  Share2,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { addDays, formatShortDateTime, fromIsoDate, getCountdownParts, getNextRecurringEventDate, toIsoDate } from '../utils/date';
import { cn } from '../utils/cn';
import { ExpandedCalendarModal } from './ExpandedCalendarModal';

type AgendaPeriod = 'morning' | 'afternoon' | 'evening';

interface AgendaEvent {
  id: string;
  date: string;
  time: string;
  title: string;
  type: string;
  location: string;
  description: string;
  isLive?: boolean;
}

interface AgendaViewProps {
  isDarkMode: boolean;
  events: AgendaEvent[];
  selectedDate: string;
  seasonStartEvent?: AgendaEvent | null;
  showSeasonCountdown?: boolean;
  dailySignal?: {
    title: string;
    excerpt: string;
    category: string;
    publishedAt?: string | null;
  } | null;
  onDateChange: (date: string) => void;
  onViewMap: () => void;
  onOpenAssistant?: () => void;
  viewer: {
    name: string;
    location: string;
    avatar: string;
  };
}

type EventTone = {
  accent: string;
  chipClass: string;
  dotClass: string;
  label: string;
  mapGlow: string;
};

const WEEKDAY_SHORT = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];
const WEEKDAY_LONG = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MONTH_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const PERIOD_META: Record<
  AgendaPeriod,
  {
    label: string;
    helper: string;
    headline: string;
  }
> = {
  morning: {
    label: 'Manana',
    helper: 'Primera salida del dia',
    headline: 'Madrugada suave y arranque limpio',
  },
  afternoon: {
    label: 'Tarde',
    helper: 'Bloque central con mas pulso',
    headline: 'Momento fuerte de la agenda',
  },
  evening: {
    label: 'Noche',
    helper: 'Ciudad encendida y ritmo alto',
    headline: 'Cierre escenico del dia',
  },
};

const SHOW_AGENDA_FEATURED_MODULES = false;

function timeToMinutes(time: string): number {
  const [hours = '0', minutes = '0'] = time.split(':');
  return Number(hours) * 60 + Number(minutes);
}

function eventToDateTime(event: AgendaEvent): Date {
  const [hours = '0', minutes = '0'] = event.time.split(':');
  const date = fromIsoDate(event.date);

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    Number(hours) || 0,
    Number(minutes) || 0,
    0,
    0
  );
}

function getTimePeriod(time: string): AgendaPeriod {
  const minutes = timeToMinutes(time);
  if (minutes < 12 * 60) {
    return 'morning';
  }
  if (minutes < 18 * 60) {
    return 'afternoon';
  }
  return 'evening';
}

function getDateMeta(date: Date) {
  return {
    day: date.getDate(),
    weekdayShort: WEEKDAY_SHORT[date.getDay()],
    weekdayLong: WEEKDAY_LONG[date.getDay()],
    monthShort: MONTH_SHORT[date.getMonth()],
  };
}

function capitalize(value: string) {
  if (!value) {
    return value;
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function excerpt(text: string, maxLength = 150) {
  const cleanText = text.trim();
  if (cleanText.length <= maxLength) {
    return cleanText;
  }
  return `${cleanText.slice(0, maxLength).trim()}...`;
}

function padNumber(value: number) {
  return String(value).padStart(2, '0');
}

function normalizeBadgeLabel(value: string) {
  return value.trim().replace(/\s+/g, ' ').slice(0, 16).toUpperCase();
}

function resolveEventTone(event: AgendaEvent): EventTone {
  const source = `${event.title} ${event.type}`.toLowerCase();

  if (source.includes('masclet')) {
    return {
      accent: '#ff6321',
      chipClass: 'bg-[#fff0e6] text-[#c55320] dark:bg-[rgba(255,99,33,0.12)] dark:text-[#ffb08b]',
      dotClass: 'bg-[#ff6321]',
      label: 'Mascleta',
      mapGlow: 'rgba(255,99,33,0.24)',
    };
  }

  if (source.includes('castillo') || source.includes('pirotecn')) {
    return {
      accent: '#ff8748',
      chipClass: 'bg-[#fff4ec] text-[#c46a2c] dark:bg-[rgba(255,135,72,0.14)] dark:text-[#ffc29d]',
      dotClass: 'bg-[#ff8748]',
      label: 'Pirotecnia',
      mapGlow: 'rgba(255,135,72,0.24)',
    };
  }

  if (source.includes('cabalg')) {
    return {
      accent: '#ff7b5a',
      chipClass: 'bg-[#fff1ed] text-[#c55b39] dark:bg-[rgba(255,123,90,0.14)] dark:text-[#ffbaa9]',
      dotClass: 'bg-[#ff7b5a]',
      label: 'Cabalgata',
      mapGlow: 'rgba(255,123,90,0.22)',
    };
  }

  if (source.includes('ofrend')) {
    return {
      accent: '#e26f3c',
      chipClass: 'bg-[#fdf1ea] text-[#b4562c] dark:bg-[rgba(226,111,60,0.14)] dark:text-[#f6b28e]',
      dotClass: 'bg-[#e26f3c]',
      label: 'Ofrenda',
      mapGlow: 'rgba(226,111,60,0.2)',
    };
  }

  return {
    accent: '#f28a4b',
    chipClass: 'bg-[#fff5ed] text-[#b7652e] dark:bg-[rgba(242,138,75,0.14)] dark:text-[#f8c39d]',
    dotClass: 'bg-[#f28a4b]',
    label: 'Agenda',
    mapGlow: 'rgba(242,138,75,0.18)',
  };
}

function buildFlowLabel(event: AgendaEvent, zoneCount: number) {
  if (event.isLive) {
    return 'Ahora en foco';
  }

  const period = getTimePeriod(event.time);
  if (period === 'afternoon') {
    return zoneCount > 2 ? 'Afluencia alta' : 'Tramo fuerte';
  }

  if (period === 'evening') {
    return 'Sesion nocturna';
  }

  return 'Ritmo gradual';
}

function buildContextLabel(event: AgendaEvent) {
  const source = `${event.title} ${event.location}`.toLowerCase();
  if (source.includes('ayuntamiento')) {
    return 'Epicentro';
  }
  if (source.includes('centro')) {
    return 'Centro urbano';
  }
  if (source.includes('glorieta')) {
    return 'Eje historico';
  }
  return 'Ruta fallera';
}

function formatUpcomingEventDay(event: AgendaEvent, todayIso: string) {
  if (event.date === todayIso) {
    return 'Hoy';
  }

  const tomorrowIso = toIsoDate(addDays(fromIsoDate(todayIso), 1));
  if (event.date === tomorrowIso) {
    return 'Manana';
  }

  const meta = getDateMeta(fromIsoDate(event.date));
  return `${capitalize(meta.weekdayLong)}, ${meta.day} ${meta.monthShort}`;
}

function resolveUpcomingEventVisual(event: AgendaEvent) {
  const source = `${event.title} ${event.type}`.toLowerCase();

  if (source.includes('masclet')) {
    return {
      icon: Radio,
      helper: 'Ruido en directo',
      surfaceClass: 'bg-[#fff1e8] text-[#ff6321] dark:bg-[rgba(255,99,33,0.14)] dark:text-[#ffb08b]',
    };
  }

  if (source.includes('ofrend')) {
    return {
      icon: Crown,
      helper: 'Recorrido floral',
      surfaceClass: 'bg-[#fff4ec] text-[#e26f3c] dark:bg-[rgba(226,111,60,0.16)] dark:text-[#f6b28e]',
    };
  }

  if (source.includes('castillo') || source.includes('pirotecn')) {
    return {
      icon: Sparkles,
      helper: 'Noche pirotecnica',
      surfaceClass: 'bg-[#fff5ee] text-[#ff8748] dark:bg-[rgba(255,135,72,0.16)] dark:text-[#ffc29d]',
    };
  }

  return {
    icon: CalendarDays,
    helper: 'Parada recomendada',
    surfaceClass: 'bg-[#f4efe8] text-[#a85a2d] dark:bg-white/10 dark:text-[#f6c1a4]',
  };
}

function formatSignalDate(value: string | null | undefined) {
  if (!value) {
    return 'Actualidad fallera';
  }

  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return 'Actualidad fallera';
  }

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
  }).format(date);
}

export function AgendaView({
  isDarkMode,
  events,
  selectedDate,
  seasonStartEvent = null,
  showSeasonCountdown = false,
  dailySignal = null,
  onDateChange,
  onViewMap,
  onOpenAssistant,
}: AgendaViewProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(events[0]?.id ?? null);
  const [now, setNow] = useState(() => new Date());
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);

  const todayIso = useMemo(() => toIsoDate(now), [now]);
  const selectedDateValue = useMemo(() => fromIsoDate(selectedDate), [selectedDate]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const allDateEvents = useMemo(
    () => events
      .filter((event) => event.date === selectedDate)
      .sort((left, right) => timeToMinutes(left.time) - timeToMinutes(right.time)),
    [events, selectedDate]
  );

  useEffect(() => {
    setSelectedEventId((current) => {
      if (current && allDateEvents.some((event) => event.id === current)) {
        return current;
      }
      return allDateEvents.find((event) => event.isLive)?.id ?? allDateEvents[0]?.id ?? null;
    });
  }, [allDateEvents]);

  const selectedEvent = useMemo(
    () => allDateEvents.find((event) => event.id === selectedEventId) ?? allDateEvents[0] ?? null,
    [allDateEvents, selectedEventId]
  );

  const timelineGroups = useMemo(() => {
    const grouped: Record<AgendaPeriod, AgendaEvent[]> = {
      morning: [],
      afternoon: [],
      evening: [],
    };

    allDateEvents.forEach((event) => {
      grouped[getTimePeriod(event.time)].push(event);
    });

    return (Object.entries(grouped) as Array<[AgendaPeriod, AgendaEvent[]]>).filter(([, items]) => items.length > 0);
  }, [allDateEvents]);

  const timelineDateGroups = useMemo(() => {
    const groupedByDate = new Map<string, AgendaEvent[]>();

    events
      .slice()
      .sort((left, right) => {
        if (left.date !== right.date) {
          return left.date.localeCompare(right.date);
        }

        return timeToMinutes(left.time) - timeToMinutes(right.time);
      })
      .forEach((event) => {
        const items = groupedByDate.get(event.date) ?? [];
        items.push(event);
        groupedByDate.set(event.date, items);
      });

    return Array.from(groupedByDate.entries()).map(([date, dateEvents]) => {
      const periodBuckets: Record<AgendaPeriod, AgendaEvent[]> = {
        morning: [],
        afternoon: [],
        evening: [],
      };

      dateEvents.forEach((event) => {
        periodBuckets[getTimePeriod(event.time)].push(event);
      });

      return {
        date,
        meta: getDateMeta(fromIsoDate(date)),
        isSelected: date === selectedDate,
        periods: (Object.entries(periodBuckets) as Array<[AgendaPeriod, AgendaEvent[]]>).filter(([, items]) => items.length > 0),
      };
    });
  }, [events, selectedDate]);

  const calendarDates = useMemo(() => {
    const eventDates = Array.from(new Set(events.map((event) => event.date).filter(Boolean))).sort();

    if (eventDates.length === 0) {
      return Array.from({ length: 8 }, (_, index) => addDays(fromIsoDate(todayIso), index - 2));
    }

    return eventDates.map(fromIsoDate);
  }, [events, todayIso]);

  const selectedDateMeta = getDateMeta(selectedDateValue);
  const isToday = selectedDate === todayIso;
  const nextUpcomingEvent = useMemo(() => {
    return events
      .slice()
      .sort((left, right) => eventToDateTime(left).getTime() - eventToDateTime(right).getTime())
      .find((event) => eventToDateTime(event).getTime() >= now.getTime()) ?? null;
  }, [events, now]);
  const heroEvent = selectedEvent ?? nextUpcomingEvent;
  const heroDateEvents = useMemo(() => {
    if (!heroEvent) {
      return allDateEvents;
    }

    return events
      .filter((event) => event.date === heroEvent.date)
      .sort((left, right) => timeToMinutes(left.time) - timeToMinutes(right.time));
  }, [allDateEvents, events, heroEvent]);
  const heroDateValue = heroEvent ? fromIsoDate(heroEvent.date) : selectedDateValue;
  const heroDateMeta = getDateMeta(heroDateValue);
  const heroIsToday = heroEvent ? heroEvent.date === todayIso : isToday;
  const zoneCount = new Set(heroDateEvents.map((event) => event.location.trim())).size;
  const liveCount = heroDateEvents.filter((event) => event.isLive).length;
  const heroTone = heroEvent ? resolveEventTone(heroEvent) : resolveEventTone({
    id: 'empty',
    date: selectedDate,
    time: '00:00',
    title: 'Agenda',
    type: 'Agenda',
    location: 'Valencia',
    description: '',
  });
  const heroPeriod = heroEvent ? getTimePeriod(heroEvent.time) : 'morning';

  const activeTimeRange = useMemo(() => {
    if (heroDateEvents.length === 0) {
      return 'Sin actos';
    }

    const times = heroDateEvents.map((event) => timeToMinutes(event.time)).sort((left, right) => left - right);
    const startHour = Math.floor(times[0] / 60);
    const endHour = Math.max(startHour + 1, Math.ceil(times[times.length - 1] / 60));
    return `${padNumber(startHour)}-${padNumber(endHour)}h`;
  }, [heroDateEvents]);

  const heroMetrics = heroEvent
    ? [
        { label: 'Franja clave', value: activeTimeRange },
        { label: 'Zonas vivas', value: padNumber(zoneCount) },
        { label: 'Pulso', value: buildFlowLabel(heroEvent, zoneCount) },
      ]
    : [];

  const nextEvents = heroEvent
    ? heroDateEvents.filter((event) => event.id !== heroEvent.id).slice(0, 3)
    : heroDateEvents.slice(0, 3);
  const upcomingFeedEvents = useMemo(() => {
    const sortedEvents = events
      .slice()
      .sort((left, right) => eventToDateTime(left).getTime() - eventToDateTime(right).getTime());

    if (sortedEvents.length === 0) {
      return [];
    }

    if (heroEvent) {
      const heroIndex = sortedEvents.findIndex((event) => event.id === heroEvent.id);
      if (heroIndex >= 0) {
        const eventsAfterHero = sortedEvents.slice(heroIndex + 1);
        if (eventsAfterHero.length > 0) {
          return eventsAfterHero.slice(0, 3);
        }
      }
    }

    return sortedEvents
      .filter((event) => eventToDateTime(event).getTime() >= now.getTime())
      .slice(0, 3);
  }, [events, heroEvent, now]);
  const heroCountdownUnits = useMemo(() => {
    if (!heroEvent || heroEvent.time.includes('-')) {
      return [
        { value: '00', label: 'Dias' },
        { value: '00', label: 'Horas' },
        { value: '00', label: 'Min' },
        { value: '00', label: 'Seg' },
      ];
    }

    const eventDate = new Date(`${heroEvent.date}T${heroEvent.time}:00`);
    const countdown = getCountdownParts(eventDate, now);

    return [
      { value: String(countdown.days).padStart(2, '0'), label: 'Dias' },
      { value: String(countdown.hours).padStart(2, '0'), label: 'Horas' },
      { value: String(countdown.minutes).padStart(2, '0'), label: 'Min' },
      { value: String(countdown.seconds).padStart(2, '0'), label: 'Seg' },
    ];
  }, [heroEvent, now]);
  const nextSeasonStart = useMemo(() => {
    if (!seasonStartEvent) {
      return null;
    }

    return getNextRecurringEventDate(seasonStartEvent.date, seasonStartEvent.time, now);
  }, [now, seasonStartEvent]);
  const seasonCountdown = useMemo(() => {
    if (!nextSeasonStart) {
      return null;
    }

    return getCountdownParts(nextSeasonStart, now);
  }, [nextSeasonStart, now]);
  const seasonCountdownUnits = seasonCountdown
    ? [
        { value: seasonCountdown.days, label: 'Dias' },
        { value: seasonCountdown.hours, label: 'Horas' },
        { value: seasonCountdown.minutes, label: 'Min' },
        { value: seasonCountdown.seconds, label: 'Seg' },
      ]
    : [];
  const subtleTextClassName = isDarkMode ? 'text-white/62' : 'text-slate-500';
  const shellClassName = isDarkMode
    ? 'border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.065),rgba(255,255,255,0.035))] text-white shadow-[0_12px_28px_rgba(2,6,23,0.24)]'
    : 'border-white/85 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.84),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.985),rgba(248,250,252,0.99))] text-[#0f172a] shadow-[0_10px_24px_rgba(15,23,42,0.05)]';
  const softPanelClassName = isDarkMode
    ? 'border-white/10 bg-white/[0.045]'
    : 'border-[#ece4db] bg-[linear-gradient(180deg,#fffaf6_0%,#fffdfb_100%)]';
  const elevatedPanelClassName = isDarkMode
    ? 'border-white/10 bg-white/[0.055]'
    : 'border-[#ebe6df] bg-white';
  const actionButtonClassName = isDarkMode
    ? 'border-white/12 bg-white/6 text-white hover:bg-white/10'
    : 'border-[#e8e2da] bg-white text-[#162033] hover:bg-[#fbf8f4]';
  const dividerClassName = isDarkMode ? 'border-white/10' : 'border-[#ece5dd]';

  const emptyState = (
    <div className={cn('rounded-[1.4rem] border p-5', softPanelClassName)}>
      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-brand">Agenda vacia</p>
      <h3 className="mt-2 text-[1.15rem] font-black tracking-tight">No hay actos programados en esta fecha.</h3>
      <p className={cn('mt-2 max-w-[34rem] text-[12px] leading-5', subtleTextClassName)}>
        Cambia de dia en la franja superior o vuelve al mapa para explorar actividad cercana.
      </p>
      <button
        type="button"
        onClick={onViewMap}
        className={cn(
          'mt-4 inline-flex items-center gap-2 rounded-[0.9rem] border px-3 py-2 text-[9px] font-black uppercase tracking-[0.12em] transition-colors',
          actionButtonClassName
        )}
      >
        <MapIcon className="h-3 w-3" />
        Ver mapa
      </button>
    </div>
  );
  const selectedDayAgendaCard = allDateEvents.length > 0 ? (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 }}
      className="overflow-hidden rounded-[1.55rem] border border-white bg-white px-3.5 py-4 text-slate-950 shadow-[0_18px_46px_rgba(15,23,42,0.08)]"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[1.05rem] font-black tracking-[-0.02em]">Mi plan</h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff1e8] px-2.5 py-1 text-[9px] font-black text-brand">
          <Bookmark className="h-3 w-3" />
          Guardado
        </span>
      </div>

      <div className="mt-3 rounded-[1rem] border border-slate-200 bg-white px-3.5 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-[0.8rem] bg-slate-50 text-slate-500">
            <CalendarDays className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[12px] font-black">
              {isToday ? 'Hoy' : capitalize(selectedDateMeta.weekdayLong)}, {selectedDateMeta.day} de {MONTH_LONG[selectedDateValue.getMonth()]}
            </p>
            <p className="mt-0.5 text-[10px] font-bold text-slate-400">Mi plan fallero</p>
          </div>
        </div>
      </div>

      <div className="relative mt-4 space-y-3">
        <div className="pointer-events-none absolute left-[1.55rem] top-9 h-[calc(100%-3.5rem)] border-l border-dashed border-brand/35" />

        {allDateEvents.map((event, index) => {
          const tone = resolveEventTone(event);
          const isSelected = event.id === selectedEventId || (!selectedEventId && index === 0);
          const [hour = '--', minute = '--'] = event.time.split(':');

          return (
            <button
              key={`selected-day-${event.id}`}
              type="button"
              onClick={() => setSelectedEventId(event.id)}
              className={cn(
                'relative grid w-full grid-cols-[3.25rem_minmax(0,1fr)] items-stretch gap-2.5 text-left transition-transform hover:-translate-y-0.5',
                isSelected ? 'rounded-[1.15rem] border border-brand/70 bg-[#fff7f1] shadow-[0_14px_30px_rgba(255,99,33,0.12)]' : ''
              )}
            >
              <span className={cn(
                'relative z-10 ml-0.5 mt-4 inline-flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-full text-[10px] font-black leading-none text-white shadow-[0_12px_22px_rgba(255,99,33,0.24)]',
                isSelected ? 'bg-brand' : 'bg-[#ff7f45]'
              )}>
                <span>{hour}</span>
                <span className="mt-0.5 text-[8px] opacity-80">{minute}</span>
              </span>

              <span className="flex min-w-0 items-center gap-3 rounded-[1.05rem] bg-white px-3 py-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fff1e8] text-brand">
                  <Sparkles className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-black leading-4">{event.title}</span>
                  <span className="mt-0.5 block truncate text-[10px] font-bold leading-4 text-slate-400">
                    {event.location}
                  </span>
                  <span className={cn(
                    'mt-2 inline-flex rounded-full px-2.5 py-1 text-[8px] font-black',
                    isSelected ? 'bg-brand text-white' : tone.chipClass
                  )}>
                    {isSelected ? '¡Ahí estaré!' : 'Ver detalles'}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => document.getElementById('agenda-timeline')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[1rem] border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-black text-slate-500 transition-colors hover:bg-slate-50"
      >
        <span className="text-base leading-none">+</span>
        Añadir actividad
      </button>
    </motion.section>
  ) : emptyState;

  return (
    <div className="min-h-[calc(100vh-6.5rem)] overflow-x-hidden pb-8 sm:pb-10">
      <div className="w-full px-4 sm:px-5 lg:px-4 xl:px-5 2xl:px-6">
        <motion.section
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 lg:mb-6"
        >
          <div className={cn('relative overflow-hidden rounded-[1.65rem] border px-4 py-4 sm:px-5 sm:py-5', isDarkMode ? 'border-white/10 bg-slate-950/72 shadow-[0_18px_42px_rgba(2,6,23,0.32)]' : 'border-white/80 bg-[linear-gradient(180deg,#fffaf7_0%,#ffffff_56%,#f7f9fc_100%)] shadow-[0_18px_40px_rgba(15,23,42,0.08)]')}>
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute left-[30%] top-10 h-36 w-36 rounded-full bg-brand/10 blur-3xl" />
              <div className="absolute left-[46%] top-4 hidden h-48 w-56 rounded-full border border-brand/10 bg-[radial-gradient(circle_at_center,rgba(255,99,33,0.08),transparent_68%)] lg:block" />
              <div className="absolute left-[38%] top-0 hidden h-full w-[28rem] opacity-35 lg:block">
                <div className="absolute bottom-2 left-14 h-28 w-16 rounded-t-full border-x-4 border-t-4 border-brand/25" />
                <div className="absolute bottom-2 left-32 h-40 w-20 rounded-t-full border-x-4 border-t-4 border-brand/25" />
                <div className="absolute bottom-2 left-52 h-24 w-28 rounded-t-full border-x-4 border-t-4 border-brand/20" />
              </div>
            </div>

            <div className="relative">
              <div className="min-w-0 pt-1">
                <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-brand">
                  <Crown className="h-3.5 w-3.5" />
                  Agenda oficial
                </div>
                <h1 className={cn('mt-2 text-[2rem] font-black leading-none tracking-[-0.035em] sm:text-[2.55rem]', isDarkMode ? 'text-white' : 'text-[#061127]')}>
                  Agenda Fallas 2027
                </h1>
                <p className={cn('mt-2 max-w-[30rem] text-[13px] font-bold leading-5 sm:text-[14px] sm:leading-6', isDarkMode ? 'text-white/68' : 'text-slate-500')}>
                  Elige un dia y mira rapidamente que actos hay, a que hora son y donde encontrarlos.
                </p>

                <div className="hidden">
                  {[
                    { label: 'Monumentos oficiales', icon: CalendarDays },
                    { label: 'Rutas recomendadas', icon: MapPin },
                    { label: 'Premios y secciones', icon: Sparkles },
                    { label: 'Toda la actualidad', icon: Radio },
                  ].map((item) => {
                    const Icon = item.icon;

                    return (
                      <span
                        key={item.label}
                        className={cn('inline-flex min-h-9 items-center justify-center gap-2 rounded-[0.85rem] border px-3 text-[9px] font-black text-slate-500 shadow-[0_10px_24px_rgba(15,23,42,0.04)] sm:justify-start', isDarkMode ? 'border-white/10 bg-white/6 text-white/70' : 'border-slate-100 bg-white/82')}
                      >
                        <Icon className="h-3.5 w-3.5 text-brand" />
                        <span className="truncate">{item.label}</span>
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className={cn('hidden relative overflow-hidden rounded-[1.45rem] border p-4 text-white shadow-[0_18px_42px_rgba(15,23,42,0.22)] sm:p-5', isDarkMode ? 'border-white/10 bg-slate-950' : 'border-slate-900/5 bg-[#111827]')}>
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_34%,rgba(255,122,53,0.5),transparent_26%),radial-gradient(circle_at_66%_18%,rgba(255,255,255,0.18),transparent_18%),linear-gradient(90deg,rgba(2,6,23,0.96)_0%,rgba(15,23,42,0.9)_43%,rgba(67,22,12,0.88)_100%)]" />
                <div className="pointer-events-none absolute right-0 top-0 h-full w-[48%] bg-[radial-gradient(circle_at_54%_45%,rgba(255,220,180,0.35),transparent_0.4rem),radial-gradient(circle_at_50%_45%,rgba(248,113,45,0.58),transparent_38%),linear-gradient(135deg,transparent_0%,rgba(255,99,33,0.42)_100%)] opacity-90" />
                <div className="pointer-events-none absolute right-8 top-5 hidden h-32 w-32 rounded-full border border-white/12 bg-[radial-gradient(circle_at_45%_35%,rgba(255,255,255,0.45),rgba(255,99,33,0.24)_34%,transparent_66%)] sm:block" />

                <div className="relative">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-brand-light">Proximo acto</p>
                      <h2 className="mt-2 truncate text-[1.45rem] font-black leading-none tracking-[-0.03em] sm:text-[1.75rem]">
                        {heroEvent ? heroEvent.title : 'Agenda fallera'}
                      </h2>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {heroEvent?.isLive ? (
                        <span className="rounded-full bg-brand px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-white">
                          En directo
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/12 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-white/82">
                        <Users className="h-3 w-3" />
                        {padNumber(Math.max(liveCount, 1))}.{padNumber(zoneCount)}K
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-[12px] font-bold text-white/82">
                    <p className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-brand-light" />
                      {heroEvent ? heroEvent.location : 'Valencia'}
                    </p>
                    <p className="flex items-center gap-2">
                      <Clock3 className="h-3.5 w-3.5 text-brand-light" />
                      {heroIsToday ? 'Hoy' : capitalize(heroDateMeta.weekdayLong)}, {heroDateMeta.day} {heroDateMeta.monthShort} - {heroEvent ? heroEvent.time : '--:--'}
                    </p>
                  </div>

                  <div className="mt-5 grid max-w-[19rem] grid-cols-4 gap-2">
                    {heroCountdownUnits.map((unit) => (
                      <div key={unit.label} className="rounded-[0.85rem] bg-white/10 px-2 py-2.5 text-center backdrop-blur-md">
                        <p className="text-[1.1rem] font-black leading-none sm:text-[1.35rem]">{unit.value}</p>
                        <p className="mt-1 text-[7px] font-black uppercase tracking-[0.12em] text-white/55">{unit.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={onViewMap}
                      className="inline-flex items-center gap-2 rounded-[0.95rem] bg-brand px-4 py-2.5 text-[10px] font-black text-white shadow-[0_12px_24px_rgba(255,99,33,0.28)] transition-colors hover:bg-[#ea5a1c]"
                    >
                      <MapIcon className="h-3.5 w-3.5" />
                      Ver detalle del acto
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-[0.95rem] border border-white/20 bg-white/8 px-4 py-2.5 text-[10px] font-black text-white transition-colors hover:bg-white/14"
                    >
                      <Bookmark className="h-3.5 w-3.5" />
                      Anadir a mi agenda
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative mt-5">
              <div className={cn('flex min-w-0 items-stretch gap-2 overflow-x-auto rounded-[1.45rem] border p-2 no-scrollbar md:hidden', isDarkMode ? 'border-white/10 bg-white/6' : 'border-slate-100 bg-white/74 shadow-[0_16px_34px_rgba(15,23,42,0.06)]')}>
                {calendarDates.map((date) => {
                  const dateKey = toIsoDate(date);
                  const dateMeta = getDateMeta(date);
                  const isDateSelected = dateKey === selectedDate;

                  return (
                    <button
                      key={`mobile-${dateKey}`}
                      type="button"
                      onClick={() => onDateChange(dateKey)}
                      className={cn(
                        'w-[72px] shrink-0 rounded-[1rem] px-2.5 py-2.5 text-center transition-all sm:w-[82px]',
                        isDateSelected
                          ? 'bg-[linear-gradient(180deg,#ff7f45_0%,#ff6321_100%)] text-white shadow-[0_14px_26px_rgba(255,99,33,0.24)]'
                          : isDarkMode
                            ? 'text-white/82 hover:bg-white/8'
                            : 'text-[#162033] hover:bg-[#fff7f0]'
                      )}
                    >
                      <div className="text-[8px] font-black uppercase tracking-[0.12em] opacity-70">{dateMeta.weekdayShort}</div>
                      <div className="mt-1 text-[1.45rem] font-black leading-none">{dateMeta.day}</div>
                      <div className="mt-1 text-[7px] font-black uppercase tracking-[0.1em] opacity-65">{dateMeta.monthShort}</div>
                    </button>
                  );
                })}
              </div>

              <div
                className={cn(
                  'hidden min-w-0 rounded-[1.45rem] border p-2 md:grid',
                  isDarkMode ? 'border-white/10 bg-white/6' : 'border-slate-100 bg-white/74 shadow-[0_16px_34px_rgba(15,23,42,0.06)]'
                )}
                style={{ gridTemplateColumns: `repeat(${Math.max(calendarDates.length, 1)}, minmax(0, 1fr))` }}
              >
                {calendarDates.map((date) => {
                  const dateKey = toIsoDate(date);
                  const dateMeta = getDateMeta(date);
                  const isDateSelected = dateKey === selectedDate;

                  return (
                    <button
                      key={`desktop-${dateKey}`}
                      type="button"
                      onClick={() => onDateChange(dateKey)}
                      className={cn(
                        'min-w-0 rounded-[0.85rem] px-1 py-2 text-center transition-all lg:px-1.5 xl:px-2',
                        isDateSelected
                          ? 'bg-[linear-gradient(180deg,#ff7f45_0%,#ff6321_100%)] text-white shadow-[0_14px_26px_rgba(255,99,33,0.24)]'
                          : isDarkMode
                            ? 'text-white/82 hover:bg-white/8'
                            : 'text-[#162033] hover:bg-[#fff7f0]'
                      )}
                    >
                      <div className="truncate text-[6px] font-black uppercase tracking-[0.08em] opacity-70 lg:text-[7px] xl:text-[8px]">{dateMeta.weekdayShort}</div>
                      <div className="mt-1 text-[0.95rem] font-black leading-none lg:text-[1.05rem] xl:text-[1.25rem]">{dateMeta.day}</div>
                      <div className="mt-1 truncate text-[6px] font-black uppercase tracking-[0.06em] opacity-65 xl:text-[7px]">{dateMeta.monthShort}</div>
                    </button>
                  );
                })}
              </div>

              <div className="hidden">
                <div className={cn('flex min-h-12 items-center gap-3 rounded-full border px-4', isDarkMode ? 'border-white/10 bg-white/6 text-white/70' : 'border-slate-100 bg-white text-slate-400 shadow-[0_14px_28px_rgba(15,23,42,0.05)]')}>
                  <Search className="h-4 w-4 shrink-0" />
                  <span className="truncate text-[12px] font-semibold">Buscar monumento o falla</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCalendarModalOpen(true)}
                  className={cn('inline-flex min-h-12 items-center justify-center gap-2 rounded-[1rem] border px-4 text-[10px] font-black', actionButtonClassName)}
                  title="Abrir calendario ampliado"
                >
                  <CalendarDays className="h-4 w-4" />
                  <span className="hidden sm:inline">Calendario</span>
                </button>
                <button
                  type="button"
                  onClick={onViewMap}
                  className={cn('inline-flex min-h-12 items-center justify-center gap-2 rounded-[1rem] border px-4 text-[10px] font-black', actionButtonClassName)}
                >
                  <MapIcon className="h-4 w-4" />
                  Ver mapa
                </button>
                <button
                  type="button"
                  className={cn('inline-flex min-h-12 items-center justify-center rounded-[1rem] border px-4', actionButtonClassName)}
                  aria-label="Filtros"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.section>

        {dailySignal ? (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.03 }}
            className={cn('mb-6 overflow-hidden rounded-[1.7rem] border p-5 sm:p-6', shellClassName)}
          >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-brand">
                    <Radio className="h-3.5 w-3.5" />
                    Senal del dia
                  </span>
                  <span className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em]', softPanelClassName)}>
                    <Clock3 className="h-3.5 w-3.5 text-brand" />
                    {formatSignalDate(dailySignal.publishedAt)}
                  </span>
                </div>

                <h2 className={cn('mt-3 max-w-3xl text-[1.5rem] font-black leading-[1.02] tracking-[-0.03em] sm:text-[2rem]', isDarkMode ? 'text-white' : 'text-[#122033]')}>
                  {dailySignal.title}
                </h2>
                <p className={cn('mt-3 max-w-3xl text-[13px] leading-6 sm:text-[14px]', subtleTextClassName)}>
                  {dailySignal.excerpt}
                </p>
                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.16em] text-brand">
                  {dailySignal.category || 'Actualidad fallera'}
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {onOpenAssistant ? (
                  <button
                    type="button"
                    onClick={onOpenAssistant}
                    className="inline-flex items-center gap-2 rounded-[0.95rem] bg-brand px-4 py-2.5 text-[10px] font-black text-white shadow-[0_12px_24px_rgba(255,99,33,0.22)] transition-colors hover:bg-[#ea5a1c]"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Preguntar a Fallerito
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={onViewMap}
                  className={cn('inline-flex items-center gap-2 rounded-[0.95rem] border px-4 py-2.5 text-[10px] font-black transition-colors', actionButtonClassName)}
                >
                  <MapIcon className="h-3.5 w-3.5" />
                  Ver mapa
                </button>
              </div>
            </div>
          </motion.section>
        ) : null}

        {showSeasonCountdown && seasonStartEvent && nextSeasonStart ? (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.02 }}
            className={cn('mb-6 overflow-hidden rounded-[1.95rem] border p-5 sm:p-6 xl:p-7', shellClassName)}
          >
            <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.76fr)] 2xl:items-end">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-brand">
                  <Sparkles className="h-3.5 w-3.5" />
                  Cuenta atras a La Crida
                </div>
                <h2 className={cn('mt-3 max-w-full break-words text-[clamp(1.45rem,7.4vw,2rem)] font-black leading-[0.98] tracking-[-0.025em] sm:text-[clamp(1.7rem,2.35vw,2.35rem)] sm:tracking-[-0.04em]', isDarkMode ? 'text-white' : 'text-[#122033]')}>
                  Hoy no hay actos en directo. La temporada vuelve con {seasonStartEvent.title}.
                </h2>
                <p className={cn('mt-3 max-w-[58rem] break-words text-[13px] leading-6', subtleTextClassName)}>
                  La agenda se reordena desde el primer gran hito fallero para que tengas una referencia clara incluso fuera de semana grande.
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-2.5">
                  <div className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em]', softPanelClassName)}>
                    <MapPin className="h-3.5 w-3.5 text-brand" />
                    {seasonStartEvent.location}
                  </div>
                  <div className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em]', softPanelClassName)}>
                    <Clock3 className="h-3.5 w-3.5 text-brand" />
                    {formatShortDateTime(nextSeasonStart)}
                  </div>
                  <button
                    type="button"
                    onClick={() => onDateChange(seasonStartEvent.date)}
                    className="inline-flex items-center gap-2 rounded-[0.95rem] border border-brand bg-brand px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#ea5a1c]"
                  >
                    <CalendarDays className="h-3.5 w-3.5" />
                    Abrir La Crida
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 2xl:grid-cols-2">
                {seasonCountdownUnits.map((unit) => (
                  <div
                    key={unit.label}
                    className={cn('rounded-[1.2rem] border px-4 py-3.5', elevatedPanelClassName)}
                  >
                    <p className={cn('text-[9px] font-black uppercase tracking-[0.16em]', subtleTextClassName)}>{unit.label}</p>
                    <p className={cn('mt-2 text-[1.55rem] font-black leading-none tracking-[-0.04em]', isDarkMode ? 'text-white' : 'text-[#122033]')}>
                      {String(unit.value).padStart(unit.label === 'Dias' ? 3 : 2, '0')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.section>
        ) : null}

        <div className="grid gap-6">
          <div className="min-w-0 space-y-6">
            {SHOW_AGENDA_FEATURED_MODULES && heroEvent ? (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
                className={cn('overflow-hidden rounded-[2rem] border', shellClassName)}
              >
                <div className="grid lg:grid-cols-[minmax(0,1.24fr)_340px] xl:grid-cols-[minmax(0,1.62fr)_390px] 2xl:grid-cols-[minmax(0,1.9fr)_440px]">
                  <div className="relative overflow-hidden p-5 sm:p-6 xl:p-8">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,112,68,0.12),transparent_28%),linear-gradient(180deg,rgba(255,247,241,0.7),transparent)] dark:bg-[radial-gradient(circle_at_top_left,rgba(255,112,68,0.12),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent)]" />
                    <div className="relative">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-brand">Evento destacado</p>
                          <h2 className={cn('mt-2 text-[clamp(1.75rem,2.8vw,2.4rem)] font-black leading-[0.96] tracking-[-0.04em]', isDarkMode ? 'text-white' : 'text-[#122033]')}>
                            {isToday ? 'Hoy' : capitalize(selectedDateMeta.weekdayLong)}, {selectedDateMeta.day} {selectedDateMeta.monthShort}
                          </h2>
                          <p className={cn('mt-2 text-[12px] font-semibold uppercase tracking-[0.14em]', subtleTextClassName)}>
                            {allDateEvents.length} actos · {zoneCount} zonas activas · {liveCount} live
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span className={cn('rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em]', heroTone.chipClass)}>
                            {heroTone.label}
                          </span>
                          <span className={cn('rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em]', isDarkMode ? 'bg-white/8 text-white/70' : 'bg-[#f4efe8] text-slate-500')}>
                            {PERIOD_META[heroPeriod].label}
                          </span>
                          {heroEvent.isLive ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white">
                              <Radio className="h-3 w-3" />
                              Ahora
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-7 grid gap-6 lg:grid-cols-[98px_minmax(0,1fr)]">
                        <div className="border-b border-[#ece4db] pb-4 dark:border-white/10 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-5">
                          <p className={cn('text-[3rem] font-black leading-none tracking-[-0.04em]', isDarkMode ? 'text-white' : 'text-[#122033]')}>
                            {heroEvent.time}
                          </p>
                          <p className={cn('mt-3 text-[10px] font-black uppercase tracking-[0.18em]', subtleTextClassName)}>
                            {PERIOD_META[heroPeriod].headline}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <h3 className={cn('text-[1.6rem] font-black leading-[1] tracking-[-0.03em]', isDarkMode ? 'text-white' : 'text-[#122033]')}>
                            {heroEvent.title}
                          </h3>

                          <div className={cn('mt-4 flex flex-wrap gap-3 text-[12px] font-semibold', subtleTextClassName)}>
                            <span className="inline-flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5 text-brand" />
                              {heroEvent.location}
                            </span>
                            <span className="inline-flex items-center gap-2">
                              <Compass className="h-3.5 w-3.5 text-brand" />
                              {buildContextLabel(heroEvent)}
                            </span>
                            <span className="inline-flex items-center gap-2">
                              <TrendingUp className="h-3.5 w-3.5 text-brand" />
                              {buildFlowLabel(heroEvent, zoneCount)}
                            </span>
                          </div>

                          <p className={cn('mt-4 max-w-[62rem] text-[13px] leading-6', isDarkMode ? 'text-white/78' : 'text-slate-700')}>
                            {excerpt(heroEvent.description, 220)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 grid gap-2.5 sm:grid-cols-3">
                        {heroMetrics.map((metric) => (
                          <div key={metric.label} className={cn('rounded-[1.15rem] border px-4 py-3', softPanelClassName)}>
                            <p className={cn('text-[10px] font-black uppercase tracking-[0.14em]', subtleTextClassName)}>{metric.label}</p>
                            <p className="mt-1.5 text-[1.1rem] font-black tracking-[-0.02em]">{metric.value}</p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-6 flex flex-wrap gap-2.5">
                        {[
                          { label: 'Como llegar', icon: Navigation2, action: onViewMap },
                          { label: 'Ver en mapa', icon: MapIcon, action: onViewMap },
                          { label: 'Guardar', icon: Bookmark, action: undefined },
                        ].map((item) => {
                          const Icon = item.icon;

                          return (
                            <button
                              key={item.label}
                              type="button"
                              onClick={item.action}
                              className={cn(
                                'inline-flex items-center gap-2 rounded-[0.95rem] border px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.14em] transition-colors',
                                item.label === 'Como llegar'
                                  ? 'border-brand bg-brand text-white hover:bg-[#ea5a1c]'
                                  : actionButtonClassName
                              )}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className={cn('border-t p-5 sm:p-6 lg:border-l lg:border-t-0 xl:p-7', dividerClassName)}>
                    <div
                      className={cn('relative overflow-hidden rounded-[1.6rem] border p-3.5', elevatedPanelClassName)}
                      style={{
                        boxShadow: `0 12px 24px ${heroTone.mapGlow}`,
                      }}
                    >
                      <div
                        className="pointer-events-none absolute inset-0 opacity-[0.8]"
                        style={{
                          backgroundImage:
                            'radial-gradient(circle at 18% 18%, rgba(255,110,62,0.16), transparent 24%), radial-gradient(circle at 82% 24%, rgba(14,165,233,0.10), transparent 26%), linear-gradient(135deg, rgba(255,255,255,0.34) 0%, transparent 60%)',
                        }}
                      />
                      <div
                        className="pointer-events-none absolute inset-0 opacity-[0.11]"
                        style={{
                          backgroundImage:
                            'linear-gradient(rgba(148,163,184,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.9) 1px, transparent 1px)',
                          backgroundSize: '28px 28px',
                        }}
                      />
                      <div className="pointer-events-none absolute left-[10%] top-[20%] h-px w-[52%] rotate-[12deg] bg-slate-400/40" />
                      <div className="pointer-events-none absolute left-[24%] top-[32%] h-px w-[58%] -rotate-[18deg] bg-slate-400/35" />
                      <div className="pointer-events-none absolute left-[14%] top-[56%] h-px w-[62%] rotate-[6deg] bg-slate-400/35" />
                      <div className="pointer-events-none absolute left-[60%] top-[42%]">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-[0_14px_32px_rgba(15,23,42,0.12)]">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white shadow-[0_10px_20px_rgba(255,99,33,0.28)]">
                            <MapPin className="h-4 w-4" />
                          </span>
                        </div>
                      </div>
                      <div className="relative flex h-[210px] flex-col justify-end">
                        <div className={cn('rounded-[1rem] border px-3.5 py-3 backdrop-blur-md', isDarkMode ? 'border-white/10 bg-slate-950/64' : 'border-white/80 bg-white/78')}>
                          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-brand">Preview cartografico</p>
                          <p className="mt-1.5 text-sm font-black">{heroEvent.location}</p>
                          <p className={cn('mt-1 text-[11px] font-semibold', subtleTextClassName)}>
                            Pin listo para abrir ruta, mapa y acciones de guardado.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2.5">
                      <p className={cn('text-[10px] font-black uppercase tracking-[0.14em]', subtleTextClassName)}>
                        Siguientes hitos del dia
                      </p>
                      {nextEvents.length > 0 ? nextEvents.map((event) => {
                        const tone = resolveEventTone(event);

                        return (
                          <button
                            key={event.id}
                            type="button"
                            onClick={() => setSelectedEventId(event.id)}
                            className={cn(
                              'flex w-full items-start gap-3 rounded-[1rem] border p-3 text-left transition-colors',
                              event.id === selectedEventId
                                ? 'border-brand bg-[#fff4ec] dark:bg-[rgba(255,99,33,0.12)]'
                                : elevatedPanelClassName
                            )}
                          >
                            <div className="pt-0.5">
                              <span className={cn('block h-2.5 w-2.5 rounded-full', tone.dotClass)} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-3">
                                <p className="truncate text-[11px] font-black uppercase tracking-[0.14em] text-brand">{event.time}</p>
                                <span className={cn('rounded-full px-2 py-1 text-[7px] font-black uppercase tracking-[0.12em]', tone.chipClass)}>
                                  {tone.label}
                                </span>
                              </div>
                              <p className="mt-1 truncate text-[13px] font-black">{event.title}</p>
                              <p className={cn('mt-1 truncate text-[10px] font-semibold', subtleTextClassName)}>{event.location}</p>
                            </div>
                          </button>
                        );
                      }) : (
                        <div className={cn('rounded-[1rem] border p-3', softPanelClassName)}>
                          <p className={cn('text-[12px] font-semibold', subtleTextClassName)}>No hay mas eventos para hoy.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.section>
            ) : (
              selectedDayAgendaCard
            )}

            <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={cn('hidden rounded-[1.95rem] border p-5 sm:p-6 xl:p-7', shellClassName)}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-brand">Proximos eventos</p>
                  <h3 className={cn('mt-2 text-[1.45rem] font-black tracking-[-0.03em]', isDarkMode ? 'text-white' : 'text-[#122033]')}>
                    Un bloque rapido para seguir lo que viene a continuacion.
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => document.getElementById('agenda-timeline')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className={cn('inline-flex items-center justify-center rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em]', actionButtonClassName)}
                >
                  Ver todos
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {upcomingFeedEvents.length > 0 ? upcomingFeedEvents.map((event) => {
                  const tone = resolveEventTone(event);
                  const visual = resolveUpcomingEventVisual(event);
                  const Icon = visual.icon;
                  const isSelected = event.id === selectedEventId;

                  return (
                    <button
                      key={`upcoming-${event.id}`}
                      type="button"
                      onClick={() => {
                        setSelectedEventId(event.id);
                        onDateChange(event.date);
                      }}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-[1.35rem] border p-3.5 text-left transition-colors sm:p-4',
                        isSelected
                          ? 'border-brand bg-[#fff4ec] dark:bg-[rgba(255,99,33,0.12)]'
                          : elevatedPanelClassName
                      )}
                    >
                      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem]', visual.surfaceClass)}>
                        <Icon className="h-4.5 w-4.5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className={cn('truncate text-[0.98rem] font-black tracking-[-0.015em]', isDarkMode ? 'text-white' : 'text-[#122033]')}>
                              {event.title}
                            </p>
                            <p className={cn('mt-1 truncate text-[11px] font-semibold', subtleTextClassName)}>
                              {event.location}
                            </p>
                          </div>

                          <div className="shrink-0 text-right">
                            <span className={cn('inline-flex rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em]', tone.chipClass)}>
                              {event.time}
                            </span>
                            <p className={cn('mt-1 text-[10px] font-semibold', subtleTextClassName)}>
                              {formatUpcomingEventDay(event, todayIso)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em]', tone.chipClass)}>
                            {tone.label}
                          </span>
                          <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em]', isDarkMode ? 'bg-white/8 text-white/70' : 'bg-[#f4efe8] text-slate-500')}>
                            {visual.helper}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                }) : (
                  <div className={cn('rounded-[1.2rem] border p-4', softPanelClassName)}>
                    <p className={cn('text-[12px] font-semibold', subtleTextClassName)}>
                      No hay mas eventos programados por ahora.
                    </p>
                  </div>
                )}
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 }}
              className={cn('hidden rounded-[1.95rem] border p-5 sm:p-6 xl:p-7', shellClassName)}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-brand">Timeline fallero</p>
                  <h3 className={cn('mt-2 text-[1.45rem] font-black tracking-[-0.03em]', isDarkMode ? 'text-white' : 'text-[#122033]')}>
                    Todos los actos, agrupados por fecha y en orden real.
                  </h3>
                </div>
                <p className={cn('max-w-[24rem] text-[12px] leading-5 sm:text-right', subtleTextClassName)}>
                  Mantiene el foco en el dia seleccionado, pero sin esconder el resto de la semana fallera.
                </p>
              </div>

              <div id="agenda-timeline" className="mt-6 space-y-6 lg:space-y-7">
                {timelineDateGroups.length === 0 ? (
                  emptyState
                ) : (
                  timelineDateGroups.map((dateGroup) => (
                    <section key={dateGroup.date} id={`agenda-day-${dateGroup.date}`}>
                      <div className={cn('mb-4 rounded-[1.25rem] border px-4 py-3', dateGroup.isSelected ? (isDarkMode ? 'border-white/12 bg-white/[0.07]' : 'border-[#f2cab4] bg-[#fff7f1]') : softPanelClassName)}>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-brand">{dateGroup.meta.weekdayShort}</span>
                          <h4 className={cn('text-[1.1rem] font-black tracking-[-0.02em]', isDarkMode ? 'text-white' : 'text-[#122033]')}>
                            {dateGroup.meta.day} {dateGroup.meta.monthShort}
                          </h4>
                          {dateGroup.isSelected ? (
                            <span className="rounded-full bg-brand px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-white">Dia activo</span>
                          ) : null}
                        </div>
                      </div>

                      <div className="space-y-6">
                        {dateGroup.periods.map(([period, periodEvents]) => (
                          <div key={`${dateGroup.date}-${period}`}>
                            <div className="mb-3 flex items-center gap-3">
                              <span className={cn('rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em]', isDarkMode ? 'bg-white/10 text-white/72' : 'bg-[#f4efe8] text-slate-500')}>
                                {PERIOD_META[period].label}
                              </span>
                              <span className={cn('text-[9px] font-black uppercase tracking-[0.14em]', subtleTextClassName)}>
                                {PERIOD_META[period].helper}
                              </span>
                            </div>

                            <div className="relative">
                              <div className={cn('absolute left-[78px] top-0 hidden h-full w-px md:block xl:left-[88px]', isDarkMode ? 'bg-white/10' : 'bg-[#e8e1d8]')} />
                              <div className="space-y-3">
                                {periodEvents.map((event) => {
                                  const isActive = event.id === selectedEventId;
                                  const tone = resolveEventTone(event);

                                  return (
                                    <motion.button
                                      key={event.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedEventId(event.id);
                                        onDateChange(event.date);
                                      }}
                                      whileHover={{ y: -2 }}
                                      className="grid w-full items-start gap-3 text-left md:grid-cols-[70px_18px_minmax(0,1fr)] xl:grid-cols-[80px_18px_minmax(0,1fr)]"
                                    >
                                      <div className="pt-1 md:text-right">
                                        <p className={cn('text-[1.3rem] font-black leading-none tracking-[-0.03em]', isDarkMode ? 'text-white' : 'text-[#122033]')}>
                                          {event.time}
                                        </p>
                                      </div>

                                      <div className="relative hidden md:flex md:justify-center">
                                        <span className={cn('mt-3 block h-3 w-3 rounded-full ring-4', tone.dotClass, isDarkMode ? 'ring-[rgba(15,23,42,0.84)]' : 'ring-[#fffaf6]')} />
                                      </div>

                                      <div
                                        className={cn(
                                          'rounded-[1.3rem] border p-4 transition-all sm:p-5',
                                          isActive
                                            ? (isDarkMode
                                              ? 'border-white/12 bg-white/[0.09] shadow-[0_12px_24px_rgba(255,99,33,0.08)]'
                                              : 'border-[#f2cab4] bg-[linear-gradient(180deg,#fff7f1_0%,#fffdfb_100%)] shadow-[0_12px_24px_rgba(255,99,33,0.08)]')
                                            : elevatedPanelClassName
                                        )}
                                      >
                                        <div className="flex items-start gap-3">
                                          <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                              <h4 className={cn('text-[1rem] font-black tracking-[-0.015em]', isDarkMode ? 'text-white' : 'text-[#122033]')}>
                                                {event.title}
                                              </h4>
                                              <span className={cn('rounded-full px-2 py-1 text-[7px] font-black uppercase tracking-[0.12em]', tone.chipClass)}>
                                                {tone.label}
                                              </span>
                                              {event.isLive ? (
                                                <span className="rounded-full bg-brand px-2 py-1 text-[7px] font-black uppercase tracking-[0.12em] text-white">
                                                  Live
                                                </span>
                                              ) : null}
                                            </div>

                                            <div className={cn('mt-2 flex flex-wrap gap-3 text-[11px] font-semibold', subtleTextClassName)}>
                                              <span className="inline-flex items-center gap-1.5">
                                                <MapPin className="h-3 w-3 text-brand" />
                                                {event.location}
                                              </span>
                                              <span className="inline-flex items-center gap-1.5">
                                                <Compass className="h-3 w-3 text-brand" />
                                                {buildContextLabel(event)}
                                              </span>
                                            </div>

                                            <p className={cn('mt-2.5 text-[12px] leading-5', isDarkMode ? 'text-white/78' : 'text-slate-700')}>
                                              {excerpt(event.description, 125)}
                                            </p>
                                          </div>

                                          <span
                                            className={cn(
                                              'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.8rem] border',
                                              actionButtonClassName
                                            )}
                                            aria-hidden="true"
                                          >
                                            <Bookmark className="h-3.5 w-3.5" />
                                          </span>
                                        </div>
                                      </div>
                                    </motion.button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))
                )}
              </div>
            </motion.section>
          </div>

          {SHOW_AGENDA_FEATURED_MODULES ? <motion.aside
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.12 }}
            className="min-w-0 xl:self-start"
          >
            <div className="space-y-4 xl:sticky xl:top-[5.8rem]">
              <section className={cn('overflow-hidden rounded-[1.9rem] border', shellClassName)}>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-brand">En foco</p>
                      <h3 className={cn('mt-2 text-[1.35rem] font-black leading-[1] tracking-[-0.03em]', isDarkMode ? 'text-white' : 'text-[#122033]')}>
                        {heroEvent ? heroEvent.title : 'Sin evento destacado'}
                      </h3>
                    </div>
                    {heroEvent?.isLive ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-white">
                        <Radio className="h-3 w-3" />
                        Live
                      </span>
                    ) : null}
                  </div>

                  {heroEvent ? (
                    <>
                      <div className={cn('mt-4 flex flex-wrap gap-2 text-[11px] font-semibold', subtleTextClassName)}>
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 text-brand" />
                          {heroEvent.location}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 className="h-3 w-3 text-brand" />
                          {heroEvent.time}
                        </span>
                      </div>

                      <div className={cn('relative mt-4 overflow-hidden rounded-[1.4rem] border p-3', softPanelClassName)}>
                        <div
                          className="pointer-events-none absolute inset-0 opacity-[0.8]"
                          style={{
                            backgroundImage:
                              'radial-gradient(circle at 20% 20%, rgba(255,110,62,0.16), transparent 24%), radial-gradient(circle at 82% 30%, rgba(14,165,233,0.10), transparent 22%), linear-gradient(135deg, rgba(255,255,255,0.26) 0%, transparent 60%)',
                          }}
                        />
                        <div
                          className="pointer-events-none absolute inset-0 opacity-[0.1]"
                          style={{
                            backgroundImage:
                              'linear-gradient(rgba(148,163,184,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.9) 1px, transparent 1px)',
                            backgroundSize: '24px 24px',
                          }}
                        />
                        <div className="relative flex h-[180px] flex-col justify-end rounded-[1.05rem] border border-dashed border-white/50 bg-white/40 p-3 backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
                          <div className="absolute left-[58%] top-[34%] flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-[0_12px_24px_rgba(15,23,42,0.12)]">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white">
                              <MapPin className="h-3.5 w-3.5" />
                            </span>
                          </div>
                          <div className={cn('rounded-[0.95rem] border px-3 py-2.5 backdrop-blur-md', isDarkMode ? 'border-white/10 bg-slate-950/58' : 'border-white/80 bg-white/76')}>
                            <p className="text-[8px] font-black uppercase tracking-[0.14em] text-brand">Mini mapa</p>
                            <p className="mt-1 text-[12px] font-black">{heroEvent.location}</p>
                            <p className={cn('mt-1 text-[10px] font-semibold', subtleTextClassName)}>Pin preparado para abrir ruta y contexto visual.</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        {[
                          { label: 'Como llegar', icon: Navigation2, action: onViewMap },
                          { label: 'Ver en mapa', icon: Map, action: onViewMap },
                          { label: 'Guardar ruta', icon: Bookmark, action: undefined },
                          { label: 'Compartir', icon: Share2, action: undefined },
                        ].map((item) => {
                          const Icon = item.icon;

                          return (
                            <button
                              key={item.label}
                              type="button"
                              onClick={item.action}
                              className={cn(
                                'inline-flex items-center justify-center gap-2 rounded-[0.95rem] border px-3 py-2.5 text-[9px] font-black uppercase tracking-[0.12em] transition-colors',
                                actionButtonClassName
                              )}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <p className={cn('mt-3 text-[12px] leading-5', subtleTextClassName)}>
                      Selecciona un acto para verlo aqui con mas contexto.
                    </p>
                  )}
                </div>

                <div className={cn('border-t', dividerClassName)}>
                  <div className="p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-brand">Proximos eventos</p>
                        <p className={cn('mt-1 text-[12px] font-semibold', subtleTextClassName)}>Lo siguiente en la agenda del dia.</p>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2">
                      {nextEvents.length > 0 ? nextEvents.map((event) => (
                        <button
                          key={`side-${event.id}`}
                          type="button"
                          onClick={() => setSelectedEventId(event.id)}
                          className={cn(
                            'flex w-full items-start gap-3 rounded-[1rem] border p-3 text-left transition-colors',
                            event.id === selectedEventId
                              ? 'border-brand bg-[#fff5ee] dark:bg-[rgba(255,99,33,0.1)]'
                              : elevatedPanelClassName
                          )}
                        >
                          <div className="pt-0.5 text-[11px] font-black uppercase tracking-[0.14em] text-brand">
                            {event.time}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12px] font-black">{event.title}</p>
                            <p className={cn('mt-1 truncate text-[10px] font-semibold', subtleTextClassName)}>{event.location}</p>
                          </div>
                        </button>
                      )) : (
                        <div className={cn('rounded-[1rem] border p-3', softPanelClassName)}>
                          <p className={cn('text-[12px] font-semibold', subtleTextClassName)}>No hay mas hitos por mostrar.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </motion.aside> : null}
        </div>
      </div>

      {/* Calendar Modal */}
      <ExpandedCalendarModal
        isDarkMode={isDarkMode}
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        selectedDate={selectedDate}
        onDateSelect={onDateChange}
        dayEvents={allDateEvents.map((e) => ({
          id: e.id,
          time: e.time,
          title: e.title,
          location: e.location,
          description: e.description,
        }))}
      />
    </div>
  );
}
