import { type MouseEvent, type ReactNode } from 'react';
import { Eye, Flame, Heart, MapPin, Route, Trophy, X } from 'lucide-react';
import { cn } from '../utils/cn';
import { type Falla } from '../data';
import { type LocationStatus } from '../hooks/useUserLocation';
import { type MapStyleId } from '../utils/mapThemes';
import { MapErrorBoundary } from './MapErrorBoundary';

function fallaMeta(falla: Falla) {
  return falla.commissionName || falla.artist;
}

interface MapDashboardShowcaseProps {
  activeMonumentRail: 'Todas' | 'Especial' | 'Primera' | 'Infantil';
  activeRouteFallaId: string | null;
  favoriteCount: number;
  favorites: string[];
  focusDistanceLabel: string;
  focusEtaLabel: string;
  focusFalla: Falla | null;
  heatmapEnabled: boolean;
  levelNumber: number;
  levelProgressPercent: number;
  locationStatus: LocationStatus;
  mapCanvas: ReactNode;
  mapSearchQuery: string;
  mapStyleId: MapStyleId;
  nextEventLabel: string;
  nextEventTitle: string;
  onClearSelected: () => void;
  onLocate: () => void;
  onOpenAgenda: () => void;
  onOpenCatalog: () => void;
  onOpenProfile: () => void;
  onPrepareRoute: (falla: Falla) => void;
  onSelectFalla: (falla: Falla) => void;
  onSetHeatmapEnabled: (value: boolean) => void;
  onSetMapSearchQuery: (value: string) => void;
  onSetMapStyleId: (value: MapStyleId) => void;
  onSetMonumentRail: (value: 'Todas' | 'Especial' | 'Primera' | 'Infantil') => void;
  onShowDetail: (falla: Falla) => void;
  onToggleFavorite: (falla: Falla, event?: MouseEvent<HTMLButtonElement>) => void;
  sidebarFallas: Falla[];
  viewerLocation: string;
  visibleCount: number;
  visitedFallasCount: number;
}

export function MapDashboardShowcase({
  activeRouteFallaId,
  favorites,
  focusDistanceLabel,
  focusEtaLabel,
  focusFalla,
  mapCanvas,
  onClearSelected,
  onPrepareRoute,
  onShowDetail,
  onToggleFavorite,
}: MapDashboardShowcaseProps) {
  const isSelectedFavorite = focusFalla ? favorites.includes(focusFalla.id) : false;
  const shouldHideFocusCard = Boolean(focusFalla && activeRouteFallaId === focusFalla.id);

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#edf0ee] text-slate-950">
      <MapErrorBoundary fallback={<div className="absolute inset-0">Error al cargar el mapa. Por favor, recarga la pagina.</div>}>
        {mapCanvas}
      </MapErrorBoundary>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.34),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(148,163,184,0.08))]" />

      {focusFalla && !shouldHideFocusCard ? (
        <div className="pointer-events-none absolute inset-x-2 top-[5.35rem] z-[1242] flex justify-end min-[380px]:inset-x-3 min-[380px]:top-[5.9rem] sm:inset-x-auto sm:right-4 sm:w-[360px] sm:top-[6.6rem] lg:top-[6.35rem] lg:w-[390px] xl:w-[430px]">
          <div className="pointer-events-auto no-scrollbar max-h-[calc(100dvh-6.25rem)] w-full overflow-y-auto rounded-[1.45rem] border border-black/5 bg-white/96 p-3 shadow-[0_24px_54px_rgba(15,23,42,0.18)] backdrop-blur-xl min-[380px]:max-h-[calc(100dvh-7.25rem)] min-[380px]:rounded-[1.85rem] min-[380px]:p-4 sm:max-h-[calc(100dvh-9rem)] lg:max-h-[calc(100dvh-8rem)] lg:rounded-[2rem] lg:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className={cn('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.9rem] border shadow-[0_12px_24px_rgba(15,23,42,0.08)] min-[380px]:h-11 min-[380px]:w-11 min-[380px]:rounded-[1rem]', focusFalla.prize ? 'border-amber-200 bg-[linear-gradient(180deg,#fff2b8_0%,#f4c20d_100%)] text-amber-800' : 'border-orange-200 bg-[linear-gradient(180deg,#ff9a6e_0%,#ff6321_100%)] text-white')}>
                  {focusFalla.prize ? <Trophy className="h-4.5 w-4.5" /> : <Flame className="h-4.5 w-4.5" />}
                </div>
                <div className="min-w-0">
                  <p className="line-clamp-2 text-[14px] font-black leading-tight text-slate-950 min-[380px]:truncate min-[380px]:text-[15px]">{focusFalla.name}</p>
                  <p className="mt-1 truncate text-[11px] font-bold text-slate-600 min-[380px]:text-[12px]">{fallaMeta(focusFalla)}</p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5 min-[380px]:gap-2">
                <button
                  type="button"
                  onClick={(event) => onToggleFavorite(focusFalla, event)}
                  className={cn('inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors min-[380px]:h-10 min-[380px]:w-10', isSelectedFavorite ? 'border-red-200 bg-red-500 text-white' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50')}
                  aria-label="Guardar favorita"
                >
                  <Heart className={cn('h-4 w-4', isSelectedFavorite && 'fill-current')} />
                </button>
                <button
                  type="button"
                  onClick={onClearSelected}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 min-[380px]:h-10 min-[380px]:w-10"
                  aria-label="Cerrar ficha"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5 min-[380px]:mt-4 min-[380px]:gap-2">
              <span className="max-w-full truncate rounded-full bg-slate-950 px-2.5 py-1.5 text-[8px] font-black uppercase tracking-[0.14em] text-white min-[380px]:px-3 min-[380px]:text-[9px] min-[380px]:tracking-[0.16em]">{focusFalla.section}</span>
              <span className="max-w-full truncate rounded-full bg-slate-100 px-2.5 py-1.5 text-[8px] font-black uppercase tracking-[0.14em] text-slate-600 min-[380px]:px-3 min-[380px]:text-[9px] min-[380px]:tracking-[0.16em]">{focusFalla.category}</span>
              {typeof focusFalla.prize === 'number' ? (
                <span className="max-w-full truncate rounded-full bg-amber-100 px-2.5 py-1.5 text-[8px] font-black uppercase tracking-[0.14em] text-amber-700 min-[380px]:px-3 min-[380px]:text-[9px] min-[380px]:tracking-[0.16em]">Premio #{focusFalla.prize}</span>
              ) : null}
              {activeRouteFallaId === focusFalla.id ? (
                <span className="max-w-full truncate rounded-full bg-emerald-100 px-2.5 py-1.5 text-[8px] font-black uppercase tracking-[0.14em] text-emerald-700 min-[380px]:px-3 min-[380px]:text-[9px] min-[380px]:tracking-[0.16em]">Ruta activa</span>
              ) : null}
            </div>

            <div className="mt-3 grid grid-cols-3 gap-1.5 min-[380px]:mt-4 min-[380px]:gap-2">
              <div className="min-w-0 rounded-[0.9rem] border border-slate-200 bg-slate-50/92 px-2 py-2 min-[380px]:rounded-[1rem] min-[380px]:px-3 min-[380px]:py-2.5">
                <p className="truncate text-[8px] font-black uppercase tracking-[0.1em] text-slate-400 min-[380px]:text-[9px] min-[380px]:tracking-[0.16em]">Distancia</p>
                <p className="mt-1 line-clamp-2 break-words text-[11px] font-black leading-tight text-slate-950 min-[380px]:text-[13px]">{focusDistanceLabel}</p>
              </div>
              <div className="min-w-0 rounded-[0.9rem] border border-slate-200 bg-slate-50/92 px-2 py-2 min-[380px]:rounded-[1rem] min-[380px]:px-3 min-[380px]:py-2.5">
                <p className="truncate text-[8px] font-black uppercase tracking-[0.1em] text-slate-400 min-[380px]:text-[9px] min-[380px]:tracking-[0.16em]">ETA</p>
                <p className="mt-1 line-clamp-2 break-words text-[11px] font-black leading-tight text-slate-950 min-[380px]:text-[13px]">{focusEtaLabel}</p>
              </div>
              <div className="min-w-0 rounded-[0.9rem] border border-slate-200 bg-slate-50/92 px-2 py-2 min-[380px]:rounded-[1rem] min-[380px]:px-3 min-[380px]:py-2.5">
                <p className="truncate text-[8px] font-black uppercase tracking-[0.1em] text-slate-400 min-[380px]:text-[9px] min-[380px]:tracking-[0.16em]">Actividad</p>
                <p className="mt-1 line-clamp-2 break-words text-[11px] font-black leading-tight text-slate-950 min-[380px]:text-[13px]">{focusFalla.visitors > 0 ? `${Math.round(focusFalla.visitors)} visitas` : 'Sin dato'}</p>
              </div>
            </div>

            <div className="mt-3 rounded-[1.1rem] border border-slate-200 bg-slate-50/92 p-3 min-[380px]:mt-4 min-[380px]:rounded-[1.25rem] min-[380px]:p-3.5">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Ubicacion</p>
                  <p className="mt-1 line-clamp-2 break-words text-[12px] font-black leading-tight text-slate-950">{focusFalla.address || focusFalla.neighborhood}</p>
                </div>
              </div>
              <div className="mt-3 grid gap-1.5 min-[380px]:gap-2">
                <div className="min-w-0 rounded-[0.95rem] bg-white px-3 py-2.5">
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Artista</p>
                  <p className="mt-1 line-clamp-2 break-words text-[12px] font-black leading-tight text-slate-950">{focusFalla.artist}</p>
                </div>
                <div className="min-w-0 rounded-[0.95rem] bg-white px-3 py-2.5">
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Comision</p>
                  <p className="mt-1 line-clamp-2 break-words text-[12px] font-black leading-tight text-slate-950">{focusFalla.commissionName || focusFalla.name}</p>
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-1.5 min-[380px]:mt-4 min-[380px]:gap-2">
              <button type="button" onClick={() => onShowDetail(focusFalla)} className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-[1rem] border border-slate-200 bg-white px-2 py-3 text-[9px] font-black uppercase tracking-[0.14em] text-slate-900 transition-colors hover:bg-slate-50 min-[380px]:gap-2 min-[380px]:rounded-[1.1rem] min-[380px]:px-3 min-[380px]:text-[10px] min-[380px]:tracking-[0.16em]">
                <Eye className="h-4 w-4" />
                <span className="line-clamp-2 leading-tight">Ver detalle</span>
              </button>
              <button type="button" onClick={() => onPrepareRoute(focusFalla)} className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-[1rem] bg-slate-950 px-2 py-3 text-[9px] font-black uppercase tracking-[0.14em] text-white shadow-[0_14px_28px_rgba(15,23,42,0.18)] transition-colors hover:bg-slate-800 min-[380px]:gap-2 min-[380px]:rounded-[1.1rem] min-[380px]:px-3 min-[380px]:text-[10px] min-[380px]:tracking-[0.16em]">
                <Route className="h-4 w-4 text-brand-light" />
                <span className="line-clamp-2 leading-tight">{activeRouteFallaId === focusFalla.id ? 'Ruta activa' : 'Preparar ruta'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
