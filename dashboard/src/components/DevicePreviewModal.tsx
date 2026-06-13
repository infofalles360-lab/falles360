import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Monitor, RefreshCw, Smartphone, Tablet, X } from 'lucide-react';
import { cn } from '../utils/cn';
import {
  DEVICE_PREVIEW_OPTIONS,
  getDevicePreviewOption,
  type DevicePreviewMode,
} from '../utils/devicePreview';

interface DevicePreviewModalProps {
  isOpen: boolean;
  isDarkMode: boolean;
  mode: DevicePreviewMode;
  previewUrl: string;
  onClose: () => void;
  onModeChange: (mode: DevicePreviewMode) => void;
}

const DEVICE_PREVIEW_ICONS = {
  mobile: Smartphone,
  tablet: Tablet,
  desktop: Monitor,
} as const;

export function DevicePreviewModal({
  isOpen,
  isDarkMode,
  mode,
  previewUrl,
  onClose,
  onModeChange,
}: DevicePreviewModalProps) {
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [refreshKey, setRefreshKey] = useState(0);
  const [embedStatus, setEmbedStatus] = useState<'loading'|'ok'|'blocked'>('loading');

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') {
      return;
    }

    const updateViewportSize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateViewportSize();
    window.addEventListener('resize', updateViewportSize);

    return () => {
      window.removeEventListener('resize', updateViewportSize);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setRefreshKey((current) => current + 1);
    }
  }, [isOpen, previewUrl]);

  // Additional diagnostic: preflight the iframe URL to determine HTTP status and accessibility
  useEffect(() => {
    let cancelled = false;
    if (!isOpen || !previewUrl) return;
    // reset status to loading on new load
    setEmbedStatus('loading');
    // Try to fetch the preview URL with credentials to emulate browser cookie behavior
    fetch(previewUrl, { method: 'GET', credentials: 'include', mode: 'cors' })
      .then((res) => {
        if (cancelled) return;
        if (res.ok) {
          setEmbedStatus('ok');
        } else {
          setEmbedStatus('blocked');
        }
      })
      .catch(() => {
        if (!cancelled) setEmbedStatus('blocked');
      });
    return () => {
      cancelled = true;
    };
  }, [previewUrl, isOpen, refreshKey]);

  const activeOption = useMemo(() => getDevicePreviewOption(mode), [mode]);
  const ActiveModeIcon = DEVICE_PREVIEW_ICONS[activeOption.family];
  const scale = useMemo(() => {
    const isCompactViewport = viewportSize.width < 640;
    const availableWidth = Math.max(280, viewportSize.width - (isCompactViewport ? 36 : 96));
    const availableHeight = Math.max(240, viewportSize.height - (isCompactViewport ? 254 : 248));

    return Math.min(1, availableWidth / activeOption.width, availableHeight / activeOption.height);
  }, [activeOption.height, activeOption.width, viewportSize.height, viewportSize.width]);
  const scaledWidth = Math.round(activeOption.width * scale);
  const scaledHeight = Math.round(activeOption.height * scale);

  // Determine if iframe URL is the same-origin as the parent (development/local server often uses different ports)
  const [isSameOrigin, setIsSameOrigin] = useState<boolean>(false);
  useEffect(() => {
    try {
      const origin = new URL(previewUrl, window.location.origin);
      setIsSameOrigin(origin.origin === window.location.origin);
    } catch {
      setIsSameOrigin(false);
    }
  }, [previewUrl]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9100] bg-black/55 p-2 backdrop-blur-md sm:p-5"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.985 }}
            transition={{ duration: 0.22 }}
            onClick={(event) => event.stopPropagation()}
            className={cn(
              'mx-auto flex h-full w-full max-w-[1680px] flex-col overflow-hidden rounded-[1.6rem] border shadow-[0_36px_100px_rgba(15,23,42,0.34)] sm:rounded-[2.4rem]',
              isDarkMode ? 'border-white/10 bg-[#090b0f] text-white' : 'border-white bg-[#f8f5ef] text-slate-950'
            )}
          >
            <div className="flex items-start justify-between gap-3 border-b border-white/10 px-3 py-3 sm:px-6 sm:py-5">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Vista por dispositivo</p>
                <h3 className="mt-1 truncate text-lg font-black tracking-tight sm:text-2xl">Previsualizacion responsive real</h3>
                <p className="mt-2 hidden max-w-2xl text-sm font-bold leading-6 opacity-60 sm:block">
                  El dashboard se carga en un iframe con ancho real para activar los breakpoints correctos.
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRefreshKey((current) => current + 1)}
                  className={cn(
                    'inline-flex h-11 w-11 items-center justify-center gap-2 rounded-2xl border text-[11px] font-black uppercase tracking-[0.14em] transition-colors sm:w-auto sm:px-4',
                    isDarkMode ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-slate-200 bg-white hover:bg-slate-50'
                  )}
                  aria-label="Recargar previsualizacion"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span className="hidden sm:inline">Recargar</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-2xl border transition-colors',
                    isDarkMode ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-slate-200 bg-white hover:bg-slate-50'
                  )}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="border-b border-white/10 px-3 py-3 sm:px-6 sm:py-4">
              <div className="flex snap-x items-stretch gap-2 overflow-x-auto pb-1 no-scrollbar sm:flex-wrap sm:gap-3 sm:overflow-visible sm:pb-0">
                {DEVICE_PREVIEW_OPTIONS.map((option) => {
                  const OptionIcon = DEVICE_PREVIEW_ICONS[option.family];
                  const isActive = option.mode === mode;

                  return (
                    <button
                      key={option.mode}
                      type="button"
                      onClick={() => onModeChange(option.mode)}
                      className={cn(
                        'inline-flex min-w-[142px] snap-start items-center gap-2.5 rounded-[1.15rem] border px-3 py-2.5 text-left transition-all sm:min-w-[168px] sm:rounded-[1.4rem] sm:px-4 sm:py-3',
                        isActive
                          ? 'border-brand bg-brand/10 shadow-[0_0_0_3px_rgba(255,99,33,0.12)]'
                          : isDarkMode ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-slate-200 bg-white hover:bg-slate-50'
                      )}
                    >
                      <div className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem]',
                        isActive ? 'bg-brand text-white' : isDarkMode ? 'bg-white/8 text-white/75' : 'bg-slate-100 text-slate-600'
                      )}>
                        <OptionIcon className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-[0.14em] opacity-60">{option.label}</p>
                        <p className="mt-1 text-xs font-black sm:text-sm">{option.width} x {option.height}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 py-3 sm:px-6 sm:py-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-brand">
                  <ActiveModeIcon className="h-3.5 w-3.5" />
                  {activeOption.label}
                </div>
                <p className={cn('hidden text-[11px] font-bold sm:block', isDarkMode ? 'text-white/55' : 'text-slate-500')}>
                  {activeOption.description}
                </p>
              </div>

              <div className="flex min-h-0 flex-1 items-start justify-center overflow-auto rounded-[1.35rem] border border-dashed border-white/10 bg-black/10 p-2 sm:rounded-[2rem] sm:p-4">
                <div className="flex flex-col items-center gap-3 sm:gap-4">
                  <div
                    className={cn(
                      'relative overflow-hidden border shadow-[0_28px_80px_rgba(15,23,42,0.32)]',
                      mode === 'desktop'
                        ? 'rounded-[1.4rem] border-slate-800 bg-slate-950 p-2 sm:rounded-[1.8rem] sm:p-3'
                        : 'rounded-[2.25rem] border-slate-800 bg-slate-950 p-2.5 sm:rounded-[2.75rem] sm:p-3.5'
                    )}
                  >
                    {mode !== 'desktop' ? (
                      <div className="pointer-events-none absolute left-1/2 top-2.5 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-slate-700/90" />
                    ) : null}
                    <div
                      className={cn('overflow-hidden bg-white', mode === 'desktop' ? 'rounded-[1rem] sm:rounded-[1.15rem]' : 'rounded-[1.7rem] sm:rounded-[2rem]')}
                      style={{ height: scaledHeight, width: scaledWidth }}
                    >
                    {/* Render iframe and detect if embedding is allowed.
                        If embedding is blocked by the server, show a fallback with an action to open in a new tab. */}
                    {isSameOrigin && embedStatus === 'blocked' ? (
                      <div className="flex h-full w-full items-center justify-center bg-white/5 p-6 text-sm text-slate-700">
                        <div className="flex-w flex-col items-center gap-3 text-center">
                          <div className="mb-2">La previsualización no puede cargarse debido a políticas de seguridad del servidor (origen cruzado).</div>
                          <button
                            type="button"
                            onClick={() => window.open(previewUrl, '_blank')}
                            className={cn(
                              'inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-[12px] font-black uppercase tracking-[0.14em]',
                              'border-slate-200 bg-white hover:bg-slate-50'
                            )}
                          >
                            Abrir en nueva pestaña
                          </button>
                        </div>
                      </div>
                    ) : (
                      <iframe
                        ref={(el) => {
                          // no-op, but keeps a stable ref for potential future use
                        }}
                        key={`${previewUrl}-${refreshKey}`}
                        src={previewUrl}
                        title="Previsualizacion del dashboard"
                        className="block origin-top-left border-0 bg-white"
                        style={{ height: activeOption.height, transform: `scale(${scale})`, width: activeOption.width }}
                        onLoad={(e) => {
                          try {
                            // Accessing contentDocument may throw for cross-origin iframes
                            // If accessible, embedding is allowed
                            // If not accessible, we catch and treat as blocked
                            // @ts-ignore
                            const doc = (e.target as HTMLIFrameElement).contentDocument;
                            // If we get here, embedding is likely allowed
                            setEmbedStatus('ok');
                          } catch {
                            // If access is blocked, mark as blocked to show fallback
                            setEmbedStatus('blocked');
                          }
                        }}
                      />
                    )}
                    </div>
                  </div>

                  <div
                    className={cn(
                      'rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] sm:px-4 sm:text-[11px] sm:tracking-[0.16em]',
                      isDarkMode ? 'bg-white/6 text-white/75' : 'bg-white text-slate-600'
                    )}
                  >
                    Frame {activeOption.shortLabel} · {activeOption.width} x {activeOption.height}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
