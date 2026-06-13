import React from 'react';
import { ArrowRight, Heart, MapPin, Route, Sparkles, Trophy } from 'lucide-react';
import { cn } from '../utils/cn';
import type { Falla } from '../data';

interface MonumentRailCardProps {
  falla: Falla;
  isDarkMode: boolean;
  isFavorite: boolean;
  onOpenDetail: (falla: Falla) => void;
  onPrepareRoute: (falla: Falla) => void;
  onToggleFavorite: (id: string, event?: React.MouseEvent) => void;
}

const MonumentRailCardComponent: React.FC<MonumentRailCardProps> = ({
  falla,
  isDarkMode,
  isFavorite,
  onOpenDetail,
  onPrepareRoute,
  onToggleFavorite,
}) => {
  return (
    <article
      className={cn(
        'group relative flex h-full min-h-[360px] w-[320px] shrink-0 cursor-pointer flex-col overflow-hidden rounded-[24px] border shadow-[0_32px_80px_rgba(15,23,42,0.18)] backdrop-blur-2xl transition-transform duration-300 hover:-translate-y-1',
        isDarkMode ? 'border-white/12 bg-black/34 text-white' : 'border-white/70 bg-white/72 text-slate-950'
      )}
      onClick={() => onOpenDetail(falla)}
    >
      <div className="relative h-44 overflow-hidden">
        <img
          src={falla.imageUrl}
          alt={falla.name}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.04)_0%,rgba(15,23,42,0.26)_56%,rgba(15,23,42,0.72)_100%)]" />

        <div className="absolute left-4 right-4 top-4 flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#ff6b2c] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white">
              <Sparkles className="h-3.5 w-3.5" />
              {falla.section}
            </span>
            {typeof falla.prize === 'number' ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-300 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-amber-950">
                <Trophy className="h-3.5 w-3.5" />
                #{falla.prize}
              </span>
            ) : null}
          </div>

          <button
            type="button"
            onClick={(event) => onToggleFavorite(falla.id, event)}
            className={cn(
              'inline-flex h-11 w-11 items-center justify-center rounded-[16px] border backdrop-blur-xl transition-colors',
              isFavorite
                ? 'border-red-400 bg-red-500 text-white'
                : 'border-white/20 bg-black/30 text-white hover:bg-black/40'
            )}
            aria-label={isFavorite ? 'Quitar de favoritas' : 'Guardar en favoritas'}
          >
            <Heart className={cn('h-4.5 w-4.5', isFavorite && 'fill-current')} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="min-w-0">
          <h3 className="text-[1.45rem] font-black leading-[1.02] tracking-[-0.04em]">{falla.name}</h3>
          <p className={cn('mt-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em]', isDarkMode ? 'text-white/60' : 'text-slate-500')}>
            <MapPin className="h-3.5 w-3.5 text-[#ff6b2c]" />
            {falla.neighborhood}
          </p>
        </div>

        <p className={cn('mt-4 line-clamp-3 text-sm font-bold leading-6', isDarkMode ? 'text-white/72' : 'text-slate-600')}>
          {falla.description}
        </p>

        <div className={cn('mt-4 grid grid-cols-2 gap-2 rounded-[20px] border p-3', isDarkMode ? 'border-white/10 bg-white/[0.05]' : 'border-slate-100 bg-[#fff5ef]')}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-45">Artista</p>
            <p className="mt-1 line-clamp-2 text-sm font-black leading-5">{falla.artist}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-45">Pulso</p>
            <p className="mt-1 text-sm font-black leading-5">{falla.likes} likes</p>
            <p className="text-[11px] font-bold opacity-60">{falla.visitors} visitas</p>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpenDetail(falla);
            }}
            className={cn(
              'inline-flex items-center justify-center gap-2 rounded-[16px] px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] transition-colors',
              isDarkMode ? 'bg-white text-slate-950 hover:bg-slate-100' : 'bg-slate-950 text-white hover:bg-slate-800'
            )}
          >
            Abrir ficha
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onPrepareRoute(falla);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-[16px] bg-[#ff6b2c] px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#f45518]"
          >
            <Route className="h-4 w-4" />
            Ruta
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpenDetail(falla);
            }}
            className={cn(
              'inline-flex items-center justify-center rounded-[16px] px-4 py-3 transition-colors',
              isDarkMode ? 'bg-white/10 text-white hover:bg-white/14' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
            aria-label="Abrir detalle"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
};

export const MonumentRailCard = React.memo(MonumentRailCardComponent);
MonumentRailCard.displayName = 'MonumentRailCard';
