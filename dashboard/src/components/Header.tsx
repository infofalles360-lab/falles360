import React from 'react';
import { LocateFixed, Monitor, MoonStar, Sun, UserRound } from 'lucide-react';
import { cn } from '../utils/cn';
import type { LocationStatus } from '../hooks/useUserLocation';

interface HeaderProps {
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  activeTab: string;
  onNavigate?: (tab: string) => void;
  location: string;
  locationStatus?: LocationStatus;
  onLocate?: () => void;
  profileProgressPercent: number;
  visitedFallasCount: number;
  badgesUnlockedCount: number;
  isCollapsed?: boolean;
  onOpenGamification?: () => void;
  onOpenDevicePreview?: () => void;
  onOpenProfile?: () => void;
  gamificationIconSrc?: string;
  showDevicePreviewButton?: boolean;
  avatarUrl?: string | null;
  variant?: 'default' | 'map';
}

function gpsLabel(status?: LocationStatus): string {
  switch (status) {
    case 'ready':
      return 'GPS listo';
    case 'loading':
      return 'Buscando GPS';
    case 'blocked':
      return 'GPS bloqueado';
    case 'unsupported':
      return 'Sin GPS';
    default:
      return 'GPS';
  }
}

function gpsTone(status: LocationStatus | undefined, isDarkMode: boolean) {
  switch (status) {
    case 'ready':
      return isDarkMode
        ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/14'
        : 'border-emerald-200 bg-[#f3fff7] text-emerald-700 hover:bg-[#ecfff3]';
    case 'loading':
      return isDarkMode
        ? 'border-white/12 bg-white/8 text-white hover:bg-white/12'
        : 'border-black/5 bg-white text-slate-700 hover:bg-slate-50';
    case 'blocked':
      return isDarkMode
        ? 'border-amber-400/20 bg-amber-500/10 text-amber-200 hover:bg-amber-500/14'
        : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100';
    default:
      return isDarkMode
        ? 'border-white/12 bg-white/8 text-white hover:bg-white/12'
        : 'border-black/5 bg-white text-slate-700 hover:bg-slate-50';
  }
}

function PassportShortcutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="3" width="14" height="18" rx="3.2" fill="currentColor" opacity="0.16" />
      <rect x="7" y="5" width="10" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8.1l.78 1.58 1.74.25-1.26 1.23.3 1.73L12 12.07l-1.56.82.3-1.73-1.26-1.23 1.74-.25L12 8.1Z" fill="currentColor" />
      <path d="M9.4 15.8h5.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Header({
  isDarkMode,
  setIsDarkMode,
  activeTab,
  onNavigate,
  location,
  locationStatus,
  onLocate,
  profileProgressPercent,
  visitedFallasCount,
  badgesUnlockedCount,
  isCollapsed = false,
  onOpenGamification,
  onOpenDevicePreview,
  onOpenProfile,
  showDevicePreviewButton = false,
  avatarUrl,
  variant = 'default',
}: HeaderProps) {
  const mapVariantClassName = isDarkMode
    ? 'border-white/10 bg-slate-950/90 text-white'
    : 'border-black/5 bg-white/94 text-slate-950';
  const headerSurfaceClassName = variant === 'map'
    ? cn(
      'pointer-events-auto mx-auto max-w-[1440px] rounded-[1.1rem] border px-2.5 py-2 shadow-[0_16px_38px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:rounded-[1.35rem] sm:px-3.5 sm:py-2.5',
      mapVariantClassName
    )
    : cn(
      'mx-auto max-w-[1840px] rounded-[1.1rem] border px-2.5 py-2 shadow-[0_16px_38px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-all duration-300 sm:rounded-[1.35rem] sm:px-3.5 sm:py-2.5',
      isDarkMode ? 'border-white/10 bg-slate-950/90 text-white' : 'border-black/5 bg-white/94 text-slate-950'
    );

  return (
    <header
      className={cn(
        variant === 'map'
          ? 'pointer-events-none fixed inset-x-2 top-2 z-[2600] sm:inset-x-4 sm:top-4'
          : 'sticky top-0 z-[2100] px-2 pt-2 transition-[padding] duration-300 ease-out sm:px-4 sm:pt-4',
        variant === 'map' ? '' : (isCollapsed ? 'py-1.5' : 'py-2')
      )}
    >
      <div className={cn('flex w-full items-center justify-between gap-1.5 sm:gap-3', headerSurfaceClassName)}>
        <div className="flex min-w-0 items-center gap-3">
          <div
            aria-label="Falles360"
            className="inline-flex min-w-0 items-baseline gap-1 rounded-[10px] px-0.5 py-0.5"
          >
            <span
              className={cn(
                'truncate text-[0.76rem] font-black uppercase leading-none tracking-[0.1em] sm:text-[0.98rem] sm:tracking-[0.2em]',
                isDarkMode ? 'text-white' : 'text-slate-950'
              )}
            >
              Falles
            </span>
            <span className="text-[0.76rem] font-black uppercase leading-none tracking-[0.03em] text-[#f05a28] sm:text-[0.98rem] sm:tracking-[0.06em]">
              360
            </span>
          </div>
        </div>

        <div className="hidden flex-1 xl:block" />

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onOpenGamification}
            className={cn(
              variant === 'map'
                ? 'hidden items-center gap-2 rounded-[0.9rem] border px-2.5 py-1.5 text-left shadow-[0_10px_22px_rgba(15,23,42,0.07)] transition-colors sm:inline-flex'
                : 'hidden min-w-[158px] items-center gap-2 rounded-[10px] border px-2.5 py-1.5 text-left lg:flex',
              isDarkMode
                ? (variant === 'map' ? 'border-emerald-400/20 bg-emerald-500/8 hover:bg-emerald-500/12' : 'border-emerald-400/20 bg-emerald-500/6 hover:bg-emerald-500/10')
                : (variant === 'map' ? 'border-emerald-200 bg-[#f3fff7] hover:bg-[#ecfff3]' : 'border-emerald-200/90 bg-white hover:bg-slate-50')
            )}
            aria-label="Abrir progreso del pasaporte"
          >
            <div
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-[8px]',
                isDarkMode ? 'bg-emerald-400/18 text-emerald-300' : 'bg-emerald-100 text-emerald-600'
              )}
            >
              <PassportShortcutIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className={cn('text-[8px] font-bold', isDarkMode ? 'text-emerald-300' : 'text-emerald-600')}>Pasaporte</p>
                <p className="text-[9px] font-black">{profileProgressPercent}%</p>
              </div>
              <div className={cn('mt-1 h-1 overflow-hidden rounded-full', isDarkMode ? 'bg-white/12' : 'bg-slate-200')}>
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#86efac_0%,#22c55e_100%)]"
                  style={{ width: `${Math.max(6, Math.min(100, profileProgressPercent))}%` }}
                />
              </div>
              <p className={cn('mt-1 text-[8px] font-semibold', isDarkMode ? 'text-white/60' : 'text-slate-500')}>
                {visitedFallasCount} visitas | {badgesUnlockedCount} insignias
              </p>
            </div>
          </button>

          {onLocate ? (
            <button
              type="button"
              onClick={onLocate}
              title={location || 'Valencia'}
              className={cn(
                variant === 'map'
                  ? 'inline-flex h-10 items-center gap-2 rounded-full border px-3 shadow-[0_10px_22px_rgba(15,23,42,0.07)] transition-all sm:px-3.5'
                  : 'inline-flex h-10 items-center gap-2 rounded-full border px-3 shadow-[0_10px_22px_rgba(15,23,42,0.07)] transition-all sm:px-3.5',
                gpsTone(locationStatus, isDarkMode)
              )}
            >
              <LocateFixed className={cn('h-3.5 w-3.5', isDarkMode ? 'text-current' : 'text-brand')} />
              <span className="hidden sm:inline">{gpsLabel(locationStatus)}</span>
              <span className="sm:hidden">GPS</span>
            </button>
          ) : null}

          <button
            onClick={onOpenGamification}
            className={cn(
              variant === 'map'
                ? 'flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border shadow-[0_10px_22px_rgba(15,23,42,0.07)] transition-all sm:hidden'
                : 'flex h-8 w-8 items-center justify-center overflow-hidden rounded-[10px] border transition-all lg:hidden',
              isDarkMode ? 'border-white/10 bg-white/6 hover:bg-white/10' : 'border-slate-200 bg-white hover:bg-slate-50'
            )}
            aria-label="Abrir pasaporte"
            type="button"
          >
            <PassportShortcutIcon className="h-5 w-5 text-brand" />
          </button>

          {showDevicePreviewButton ? (
            <button
              onClick={onOpenDevicePreview}
              className={cn(
                variant === 'map'
                  ? 'inline-flex h-10 w-10 items-center justify-center gap-2 rounded-full border px-0 shadow-[0_10px_22px_rgba(15,23,42,0.07)] transition-all sm:w-auto sm:px-3.5'
                  : 'inline-flex h-8 w-8 items-center justify-center gap-2 rounded-[10px] border px-0 transition-all sm:w-auto sm:px-2.5',
                isDarkMode ? 'border-white/10 bg-white/6 hover:bg-white/10' : 'border-slate-200 bg-white hover:bg-slate-50'
              )}
              aria-label="Abrir vista por dispositivo"
              type="button"
            >
              <Monitor className={cn(variant === 'map' ? 'h-3.5 w-3.5' : 'h-[14px] w-[14px]', isDarkMode ? 'text-white/75' : 'text-slate-500')} />
              <span className={cn(
                'hidden font-black uppercase tracking-[0.14em]',
                variant === 'map' ? 'text-[10px] sm:inline' : 'text-[10px] sm:inline',
                isDarkMode ? 'text-white/75' : 'text-slate-600'
              )}>
                Vista
              </span>
            </button>
          ) : null}

          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={cn(
              variant === 'map'
                ? 'inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-[0_10px_22px_rgba(15,23,42,0.07)] transition-all'
                : 'inline-flex h-8 w-8 items-center justify-center rounded-[10px] border transition-all sm:h-10 sm:w-10 sm:rounded-full sm:shadow-[0_10px_22px_rgba(15,23,42,0.07)]',
              isDarkMode ? 'border-white/10 bg-white/6 hover:bg-white/10' : 'border-slate-200 bg-white hover:bg-slate-50'
            )}
            aria-label={isDarkMode ? 'Activar modo claro' : 'Activar modo oscuro'}
            type="button"
          >
            {isDarkMode ? (
              <Sun className="h-3.5 w-3.5 text-amber-200" />
            ) : (
              <MoonStar className="h-3.5 w-3.5 text-slate-500" />
            )}
          </button>

          {onOpenProfile ? (
            <button
              type="button"
              onClick={onOpenProfile}
              className={cn(
                'inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border shadow-[0_10px_22px_rgba(15,23,42,0.07)] transition-all',
                isDarkMode ? 'border-white/10 bg-white/6 hover:bg-white/10' : 'border-black/5 bg-white hover:bg-slate-50'
              )}
              aria-label="Abrir perfil"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <UserRound className={cn('h-4.5 w-4.5', isDarkMode ? 'text-white/75' : 'text-slate-500')} />
              )}
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
