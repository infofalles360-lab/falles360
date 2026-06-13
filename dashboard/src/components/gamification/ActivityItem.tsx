import type { FC } from 'react';
import { CalendarDays, Compass, Heart, Route, Sparkles, Trophy } from 'lucide-react';
import type { GamificationActivityItem } from '../../utils/gamification';
import { cn } from '../../utils/cn';

interface ActivityItemProps {
  item: GamificationActivityItem;
  isDarkMode: boolean;
}

function resolveIcon(eventType: string) {
  if (eventType.includes('badge')) {
    return Trophy;
  }
  if (eventType.includes('route')) {
    return Route;
  }
  if (eventType.includes('favorite')) {
    return Heart;
  }
  if (eventType.includes('navigation')) {
    return Compass;
  }
  if (eventType.includes('visit')) {
    return Sparkles;
  }

  return CalendarDays;
}

export const ActivityItem: FC<ActivityItemProps> = ({ item, isDarkMode }) => {
  const Icon = resolveIcon(item.eventType);

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-[1.3rem] border px-4 py-3',
        isDarkMode ? 'border-white/10 bg-white/[0.045]' : 'border-slate-100 bg-white'
      )}
    >
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem]', isDarkMode ? 'bg-brand/16 text-brand' : 'bg-brand/10 text-brand')}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black leading-5">{item.title}</p>
        <p className="mt-1 text-sm font-bold leading-6 opacity-65">{item.body}</p>
      </div>
      <span className="shrink-0 text-[10px] font-black uppercase tracking-[0.16em] opacity-45">
        {item.occurredAt ? new Date(item.occurredAt.replace(' ', 'T')).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : ''}
      </span>
    </div>
  );
};
