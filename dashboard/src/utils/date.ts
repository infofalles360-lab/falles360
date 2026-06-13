const SHORT_MONTH_FORMATTER = new Intl.DateTimeFormat('es-ES', { month: 'short' });
const SHORT_WEEKDAY_FORMATTER = new Intl.DateTimeFormat('es-ES', { weekday: 'short' });
const LONG_DATE_FORMATTER = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const MONTH_YEAR_FORMATTER = new Intl.DateTimeFormat('es-ES', {
  month: 'long',
  year: 'numeric',
});
const SHORT_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const WEEKDAY_LABELS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

function cleanShortLabel(value: string) {
  return value.replace('.', '').toUpperCase();
}

function cloneDate(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), value.getHours(), value.getMinutes(), value.getSeconds(), value.getMilliseconds());
}

export function getWeekdayLabels() {
  return WEEKDAY_LABELS;
}

export function toIsoDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fromIsoDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function parseEventDateTime(dateValue: string, timeValue: string) {
  const [hours = '0', minutes = '0'] = timeValue.split(':');
  const baseDate = fromIsoDate(dateValue);
  return new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    Number(hours),
    Number(minutes),
    0,
    0
  );
}

export function getNextRecurringEventDate(dateValue: string, timeValue: string, now = new Date()) {
  const template = parseEventDateTime(dateValue, timeValue);
  let candidate = new Date(
    now.getFullYear(),
    template.getMonth(),
    template.getDate(),
    template.getHours(),
    template.getMinutes(),
    0,
    0
  );

  if (candidate.getTime() <= now.getTime()) {
    candidate = new Date(
      now.getFullYear() + 1,
      template.getMonth(),
      template.getDate(),
      template.getHours(),
      template.getMinutes(),
      0,
      0
    );
  }

  return candidate;
}

export function getCountdownParts(targetDate: Date, now = new Date()) {
  const diff = Math.max(0, targetDate.getTime() - now.getTime());
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds };
}

export function formatLongDate(value: Date) {
  return LONG_DATE_FORMATTER.format(value);
}

export function formatMonthYear(value: Date) {
  return MONTH_YEAR_FORMATTER.format(value);
}

export function formatShortMonth(value: Date) {
  return cleanShortLabel(SHORT_MONTH_FORMATTER.format(value));
}

export function formatShortWeekday(value: Date) {
  return cleanShortLabel(SHORT_WEEKDAY_FORMATTER.format(value));
}

export function formatShortDateTime(value: Date) {
  return SHORT_DATE_TIME_FORMATTER.format(value).replace('.', '');
}

export function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

export function endOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth() + 1, 0);
}

export function addDays(value: Date, amount: number) {
  const next = cloneDate(value);
  next.setDate(next.getDate() + amount);
  return next;
}

export function addMonths(value: Date, amount: number) {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1);
}

export function isSameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

export function isSameMonth(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth();
}

export function getCompactDateStrip(selectedDate: Date, size = 5) {
  const startOffset = Math.floor(size / 2);
  return Array.from({ length: size }, (_, index) => addDays(selectedDate, index - startOffset));
}

export function getMonthGrid(visibleMonth: Date) {
  const firstDay = startOfMonth(visibleMonth);
  const lastDay = endOfMonth(visibleMonth);
  const leadingEmptyCells = (firstDay.getDay() + 6) % 7;
  const cells: Array<Date | null> = [];
  const TOTAL_MONTH_CELLS = 42;

  for (let index = 0; index < leadingEmptyCells; index += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    cells.push(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day));
  }

  while (cells.length < TOTAL_MONTH_CELLS) {
    cells.push(null);
  }

  return cells;
}
