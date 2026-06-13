import { X } from 'lucide-react';
import type { QueuedGamificationNotification } from '../../hooks/useGamification';
import { cn } from '../../utils/cn';

interface UnlockToastProps {
  item: QueuedGamificationNotification;
  isDarkMode: boolean;
  onDismiss: (id: string) => void;
}

export function UnlockToast({ item, isDarkMode, onDismiss }: UnlockToastProps) {
  return (
    <div className={cn('pointer-events-auto w-full max-w-[360px] rounded-[1.6rem] border p-4 shadow-[0_30px_70px_rgba(15,23,42,0.2)] backdrop-blur-2xl', isDarkMode ? 'border-white/12 bg-slate-950/90 text-white' : 'border-white/80 bg-white/96 text-slate-950')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-brand">{item.type.replaceAll('_', ' ')}</p>
          <h4 className="mt-1 text-[1rem] font-black leading-tight">{item.title}</h4>
          <p className="mt-2 text-sm font-bold leading-6 opacity-70">{item.message}</p>
        </div>
        <button
          type="button"
          onClick={() => onDismiss(item.id)}
          className={cn('inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors', isDarkMode ? 'bg-white/10 text-white hover:bg-white/14' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}
          aria-label="Cerrar aviso"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
