import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Bookmark, Eye, Heart, MapPin, Share2 } from 'lucide-react';
import { type Falla } from '../data';

export interface FallaCardProps {
  falla: Falla;
  onClick: () => void;
  isFavorite?: boolean;
  isDarkMode?: boolean;
  onFavorite?: (event: React.MouseEvent) => void;
  onShare?: (event: React.MouseEvent) => void;
}

export const FallaCard: React.FC<FallaCardProps> = ({ falla, onClick, isFavorite = false, isDarkMode = false, onFavorite, onShare }) => {
  const isInfantil = falla.category === 'Infantil';
  const prizeLabel = typeof falla.prize === 'number' ? `${falla.prize} premio` : 'Novedad';
  const moneyLabel = falla.budgetLabel || (typeof falla.budgetEur === 'number' ? `${new Intl.NumberFormat('es-ES').format(falla.budgetEur)} EUR` : `${Math.max(12, Math.round((falla.visitors || 0) / 60))}.000 EUR`);

  return (
    <motion.div
      whileHover={{ y: -3 }}
      onClick={onClick}
      className={`group relative cursor-pointer overflow-hidden rounded-[1rem] border shadow-[0_12px_24px_rgba(15,23,42,0.08)] sm:rounded-[0.7rem] ${isDarkMode ? 'bg-slate-950 text-white shadow-[0_18px_38px_rgba(2,6,23,0.28)]' : 'bg-white'} ${isInfantil ? (isDarkMode ? 'border-emerald-400/24 ring-1 ring-emerald-400/12' : 'border-emerald-200/90 ring-1 ring-emerald-100') : (isDarkMode ? 'border-white/10' : 'border-slate-200/80')}`}
    >
      <div className="relative h-[166px] overflow-hidden sm:h-[202px]">
        <img
          src={falla.imageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.02)_0%,rgba(15,23,42,0.2)_35%,rgba(15,23,42,0.84)_100%)]" />

        <div className="absolute left-2.5 right-2.5 top-2.5 flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <div className={`${isInfantil ? 'bg-emerald-500' : 'bg-brand'} rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-white shadow-lg sm:text-[9px]`}>
              {prizeLabel}
            </div>
            <div className="max-w-[150px] truncate rounded-full border border-white/24 bg-slate-950/62 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-white backdrop-blur-md sm:max-w-none">
              {falla.section}
            </div>
          </div>
          <div className={`${isInfantil ? 'border-emerald-200/45 bg-emerald-500/82' : 'border-white/20 bg-slate-950/64'} rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-white backdrop-blur-md`}>
            {falla.category}
          </div>
        </div>

        <div className="absolute inset-x-3 bottom-3 text-white sm:inset-x-4 sm:bottom-3.5">
          <h4 className="line-clamp-2 text-[0.98rem] font-black leading-tight tracking-tight sm:text-[1.05rem]">{falla.name}</h4>
          <p className="mt-1 line-clamp-1 text-[11px] font-semibold text-white/76">{falla.jcfNum ? `JCF ${falla.jcfNum} | ` : ''}{falla.commissionName || `Comision de ${falla.neighborhood}`}</p>
          <div className="mt-2.5 flex items-center justify-between gap-3 sm:mt-3">
            <div className="flex min-w-0 items-center gap-2 text-[11px] font-black text-white/86">
              <MapPin className={`h-3.5 w-3.5 shrink-0 ${isInfantil ? 'text-emerald-300' : 'text-brand'}`} />
              <span className="truncate">{falla.address || falla.neighborhood}</span>
            </div>
            <span className="hidden shrink-0 text-[11px] font-black text-white min-[390px]:inline">{moneyLabel}</span>
          </div>
        </div>
      </div>

      <div className={`grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-0 border-t ${isDarkMode ? 'border-white/10' : 'border-slate-100'}`}>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onFavorite?.(event);
          }}
          className={`inline-flex h-11 min-w-0 items-center justify-center gap-1 border-r px-1.5 text-[9px] font-black transition-colors sm:h-10 sm:gap-1.5 sm:px-2 sm:text-[10px] ${isDarkMode ? 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07]' : 'border-slate-100 bg-white hover:bg-slate-50'} ${isFavorite ? 'text-brand' : isDarkMode ? 'text-white/68' : 'text-slate-500'}`}
          aria-pressed={isFavorite}
        >
          <Bookmark className={`h-3.5 w-3.5 ${isFavorite ? 'fill-current' : ''}`} />
          <span>{isFavorite ? 'Guardada' : 'Guardar'}</span>
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClick();
          }}
          className={`inline-flex h-11 min-w-0 items-center justify-center gap-1 border-r px-1.5 text-[9px] font-black transition-colors sm:h-10 sm:gap-1.5 sm:px-2 sm:text-[10px] ${isDarkMode ? 'border-white/10 bg-white/[0.03] text-white/68 hover:bg-white/[0.07]' : 'border-slate-100 bg-white text-slate-500 hover:bg-slate-50'}`}
        >
          <Eye className="h-3.5 w-3.5" />
          <span>Ver</span>
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onShare?.(event);
          }}
          className={`inline-flex h-11 min-w-0 items-center justify-center gap-1 border-r px-1.5 text-[9px] font-black transition-colors sm:h-10 sm:gap-1.5 sm:px-2 sm:text-[10px] ${isDarkMode ? 'border-white/10 bg-white/[0.03] text-white/68 hover:bg-white/[0.07]' : 'border-slate-100 bg-white text-slate-500 hover:bg-slate-50'}`}
        >
          <Share2 className="h-3.5 w-3.5" />
          <span className="max-[360px]:hidden">Compartir</span>
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClick();
          }}
          className={`flex h-11 w-10 items-center justify-center transition-colors sm:h-10 sm:w-11 ${isDarkMode ? 'bg-white/[0.03] text-white/68 hover:bg-white/[0.07]' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
          aria-label="Abrir detalle"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div className={`flex items-center justify-between border-t px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] ${isDarkMode ? 'border-white/10 text-white/44' : 'border-slate-100 text-slate-400'}`}>
        <span className="inline-flex items-center gap-1.5"><Eye className="h-3.5 w-3.5 text-brand" />{falla.visitors}</span>
        <span className="inline-flex items-center gap-1.5"><Heart className="h-3.5 w-3.5 fill-current text-red-500" />{falla.likes}</span>
      </div>
    </motion.div>
  );
};
