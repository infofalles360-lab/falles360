import React, { useEffect, useMemo, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  ArrowLeft,
  Captions,
  ChevronRight,
  ExternalLink,
  Flame,
  Globe,
  LayoutGrid,
  MapPin,
  MessageCircle,
  Play,
  Radio,
  Search,
  ShieldCheck,
  Tv,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { type AppViewer, type TvChannel, type TvChatBotConfig } from '../data';
import { TV_SUBTITLE_OPTIONS, getTvSubtitleLines, type TvSubtitleLanguage } from '../utils/tvSubtitles';
import { LiveTvChat } from './LiveTvChat';

interface TVGuideProps {
  isDarkMode: boolean;
  channels: TvChannel[];
  viewer: AppViewer;
  chatBot: TvChatBotConfig;
  onStartWatching?: (channel: TvChannel) => void;
  onStopWatching?: () => void;
}

type TvChannelCategory = 'official' | 'local' | 'webapp';
type TvChannelFilter = 'all' | 'live' | 'official' | 'local' | 'webapp';

interface ChannelPresentation {
  logoText: string;
  category: TvChannelCategory;
  categoryLabel: string;
  currentShow: string;
  audience: string;
  heroHeadline: string;
  heroSupport: string;
  visualGradient: string;
  logoBackground: string;
  logoTextColor: string;
}

const TV_SUBTITLE_STORAGE_KEY = 'falles360.tv.subtitle-language';

const CHANNEL_PRESENTATIONS: Record<string, ChannelPresentation> = {
  apunt: {
    logoText: 'à',
    category: 'official',
    categoryLabel: 'Oficial',
    currentShow: 'Ofrenda en directo',
    audience: '2.4K espectadores',
    heroHeadline: 'Canal destacado',
    heroSupport: 'Cobertura institucional con los grandes actos y la señal mas estable para seguir la fiesta.',
    visualGradient: 'linear-gradient(140deg, #7aa5dd 0%, #446b9f 38%, #243b5c 100%)',
    logoBackground: 'rgba(8,14,24,0.9)',
    logoTextColor: '#ffffff',
  },
  '7televalencia': {
    logoText: '7',
    category: 'local',
    categoryLabel: 'Local',
    currentShow: 'Mascleta en directo',
    audience: '1.3K espectadores',
    heroHeadline: 'Canal destacado',
    heroSupport: 'Especializada en Valencia y l Horta, con programacion muy centrada en la calle y el directo.',
    visualGradient: 'linear-gradient(140deg, #fff2e7 0%, #ffb57b 34%, #ff6d2e 100%)',
    logoBackground: '#fff7f1',
    logoTextColor: '#ff6d2e',
  },
  la8: {
    logoText: '8',
    category: 'local',
    categoryLabel: 'Local',
    currentShow: 'Ofrenda a la Virgen',
    audience: '940 espectadores',
    heroHeadline: 'Canal destacado',
    heroSupport: 'Emision metropolitana con especiales falleros y señal propia integrada dentro de la app.',
    visualGradient: 'linear-gradient(140deg, #ffe8e9 0%, #ff9aa0 35%, #c41222 100%)',
    logoBackground: '#fff4f4',
    logoTextColor: '#d91c2b',
  },
  'levante-tv': {
    logoText: 'ltv',
    category: 'webapp',
    categoryLabel: 'Web/App',
    currentShow: 'Especial Fallas 2024',
    audience: '820 espectadores',
    heroHeadline: 'Canal destacado',
    heroSupport: 'Acceso rapido a las piezas de Levante TV con enfoque de actualidad y resumen audiovisual.',
    visualGradient: 'linear-gradient(140deg, #233a6c 0%, #16274b 44%, #0d162b 100%)',
    logoBackground: '#102144',
    logoTextColor: '#ffffff',
  },
  intercomarcal: {
    logoText: 'itv',
    category: 'webapp',
    categoryLabel: 'Web/App',
    currentShow: 'Preselecciones falleras',
    audience: '640 espectadores',
    heroHeadline: 'Canal destacado',
    heroSupport: 'Ventana util para seguir la vertiente fallera de otras comarcas con acceso desde cualquier dispositivo.',
    visualGradient: 'linear-gradient(140deg, #5267f7 0%, #3044d2 42%, #1a2277 100%)',
    logoBackground: '#2a3cca',
    logoTextColor: '#ffffff',
  },
};

const FILTER_OPTIONS: Array<{ id: TvChannelFilter; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'live', label: 'En directo' },
  { id: 'official', label: 'Oficiales' },
  { id: 'local', label: 'Locales' },
  { id: 'webapp', label: 'Web/App' },
];

function channelMonogram(name: string): string {
  const compactName = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((token) => token.replace(/[^A-Za-z0-9]/g, '').slice(0, 1).toUpperCase())
    .join('');

  return compactName || 'TV';
}

function playerTypeBadge(channel: TvChannel): string {
  switch (channel.playerType) {
    case 'hls':
      return 'HLS';
    case 'web':
      return 'WEB';
    default:
      return 'LIVE';
  }
}

function playerSurfaceLabel(channel: TvChannel): string {
  switch (channel.playerType) {
    case 'hls':
      return 'Streaming propio';
    case 'web':
      return 'Web integrada';
    default:
      return 'Directo web';
  }
}

function shouldShowChatByDefault(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.innerWidth >= 1680;
}

function readStoredSubtitleLanguage(): TvSubtitleLanguage {
  if (typeof window === 'undefined') {
    return 'es';
  }

  const storedLanguage = window.localStorage.getItem(TV_SUBTITLE_STORAGE_KEY);

  if (TV_SUBTITLE_OPTIONS.some((option) => option.id === storedLanguage)) {
    return storedLanguage as TvSubtitleLanguage;
  }

  return 'es';
}

function fallbackCategory(channel: TvChannel): TvChannelCategory {
  return channel.playerType === 'web' ? 'webapp' : 'local';
}

function categoryLabel(category: TvChannelCategory): string {
  switch (category) {
    case 'official':
      return 'Oficial';
    case 'local':
      return 'Local';
    default:
      return 'Web/App';
  }
}

function getChannelPresentation(channel: TvChannel): ChannelPresentation {
  const configured = CHANNEL_PRESENTATIONS[channel.id];

  if (configured) {
    return configured;
  }

  const category = fallbackCategory(channel);

  return {
    logoText: channelMonogram(channel.name),
    category,
    categoryLabel: categoryLabel(category),
    currentShow: channel.focus,
    audience: 'Emision activa',
    heroHeadline: 'Canal destacado',
    heroSupport: channel.note,
    visualGradient: 'linear-gradient(140deg, #f5f7fb 0%, #dbe4f1 42%, #94a3b8 100%)',
    logoBackground: '#ffffff',
    logoTextColor: '#0f172a',
  };
}

function matchesFilter(channel: TvChannel, filter: TvChannelFilter): boolean {
  const presentation = getChannelPresentation(channel);

  switch (filter) {
    case 'live':
      return true;
    case 'official':
      return presentation.category === 'official';
    case 'local':
      return presentation.category === 'local';
    case 'webapp':
      return presentation.category === 'webapp';
    default:
      return true;
  }
}

function matchesSearch(channel: TvChannel, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  const searchable = [channel.name, channel.area, channel.focus, channel.note, getChannelPresentation(channel).currentShow]
    .join(' ')
    .toLowerCase();

  return searchable.includes(normalizedQuery);
}

function filterIcon(filter: TvChannelFilter) {
  switch (filter) {
    case 'live':
      return Radio;
    case 'official':
      return ShieldCheck;
    case 'local':
      return MapPin;
    case 'webapp':
      return Globe;
    default:
      return LayoutGrid;
  }
}

function categoryIcon(category: TvChannelCategory) {
  switch (category) {
    case 'official':
      return ShieldCheck;
    case 'local':
      return MapPin;
    default:
      return Globe;
  }
}

export function TVGuide({ isDarkMode, channels, viewer, chatBot, onStartWatching, onStopWatching }: TVGuideProps) {
  const [selectedChannelId, setSelectedChannelId] = useState(channels[0]?.id ?? '');
  const [isWatching, setIsWatching] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(() => shouldShowChatByDefault());
  const [subtitleLanguage, setSubtitleLanguage] = useState<TvSubtitleLanguage>(() => readStoredSubtitleLanguage());
  const [subtitleCueIndex, setSubtitleCueIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<TvChannelFilter>('all');
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const selectedChannel = useMemo(
    () => channels.find((channel) => channel.id === selectedChannelId) ?? channels[0] ?? null,
    [channels, selectedChannelId]
  );
  const activeSubtitleOption = useMemo(
    () => TV_SUBTITLE_OPTIONS.find((option) => option.id === subtitleLanguage) ?? TV_SUBTITLE_OPTIONS[0],
    [subtitleLanguage]
  );
  const activeSubtitleLines = useMemo(
    () => (selectedChannel ? getTvSubtitleLines(selectedChannel, subtitleLanguage) : []),
    [selectedChannel, subtitleLanguage]
  );
  const activeSubtitleCue = activeSubtitleLines[subtitleCueIndex] ?? '';
  const browseChannels = useMemo(
    () => channels.filter((channel) => matchesFilter(channel, activeFilter) && matchesSearch(channel, searchQuery)),
    [activeFilter, channels, searchQuery]
  );
  const featuredChannel = useMemo(
    () => browseChannels.find((channel) => channel.id === selectedChannelId) ?? browseChannels[0] ?? null,
    [browseChannels, selectedChannelId]
  );
  const featuredPresentation = featuredChannel ? getChannelPresentation(featuredChannel) : null;
  const sideChannels = useMemo(
    () => browseChannels.filter((channel) => channel.id !== featuredChannel?.id).slice(0, 3),
    [browseChannels, featuredChannel]
  );

  useEffect(() => {
    if (!selectedChannel) {
      return;
    }

    setSelectedChannelId((current) => current || selectedChannel.id);
  }, [selectedChannel]);

  useEffect(() => {
    const videoElement = videoRef.current;
    const activeChannel = selectedChannel;

    if (!videoElement || !isWatching || !activeChannel || activeChannel.playerType !== 'hls') {
      return;
    }

    const source = activeChannel.embedUrl ?? activeChannel.watchUrl;

    if (!source) {
      return;
    }

    if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      videoElement.src = source;
      void videoElement.play().catch(() => undefined);

      return () => {
        videoElement.pause();
        videoElement.removeAttribute('src');
        videoElement.load();
      };
    }

    if (!Hls.isSupported()) {
      return;
    }

    const hls = new Hls({ enableWorker: true });
    hls.loadSource(source);
    hls.attachMedia(videoElement);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      void videoElement.play().catch(() => undefined);
    });

    return () => {
      hls.destroy();
      videoElement.pause();
      videoElement.removeAttribute('src');
      videoElement.load();
    };
  }, [isWatching, selectedChannel]);

  useEffect(() => {
    setSubtitleCueIndex(0);
  }, [selectedChannel?.id, subtitleLanguage]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(TV_SUBTITLE_STORAGE_KEY, subtitleLanguage);
  }, [subtitleLanguage]);

  useEffect(() => {
    if (!isWatching || subtitleLanguage === 'off' || activeSubtitleLines.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setSubtitleCueIndex((current) => (current + 1) % activeSubtitleLines.length);
    }, 4600);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeSubtitleLines, isWatching, subtitleLanguage]);

  useEffect(() => {
    if (!(isWatching && selectedChannel)) {
      return;
    }

    onStartWatching?.(selectedChannel);
  }, [isWatching, onStartWatching, selectedChannel]);

  if (!selectedChannel) {
    return null;
  }

  const selectedPresentation = getChannelPresentation(selectedChannel);
  const panelClassName = isDarkMode
    ? 'border-white/10 bg-white/[0.045] shadow-[0_24px_60px_rgba(0,0,0,0.26)]'
    : 'border-slate-200/85 bg-white/95 shadow-[0_24px_60px_rgba(15,23,42,0.08)]';
  const insetPanelClassName = isDarkMode
    ? 'border-white/10 bg-black/20'
    : 'border-slate-200 bg-slate-50/90';

  const handleOpenChannel = (channel: TvChannel) => {
    setSelectedChannelId(channel.id);
    setIsWatching(true);
    setIsChatVisible(shouldShowChatByDefault());
  };

  const handleBackToChannels = () => {
    setIsWatching(false);
    onStopWatching?.();
  };

  const renderSubtitleOverlay = () => {
    if (subtitleLanguage === 'off' || !activeSubtitleCue) {
      return null;
    }

    return (
      <div className="pointer-events-none absolute inset-x-4 bottom-16 z-[30] flex justify-center">
        <div
          aria-live="polite"
          className="max-w-[min(92%,820px)] rounded-[1.6rem] border border-white/12 bg-black/72 px-4 py-3 text-center shadow-[0_24px_60px_rgba(0,0,0,0.36)] backdrop-blur-md"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/78">
            <Captions className="h-3.5 w-3.5" />
            {activeSubtitleOption.shortLabel}
          </span>
          <p className="mt-2 text-sm font-semibold leading-6 text-white sm:text-base">{activeSubtitleCue}</p>
        </div>
      </div>
    );
  };

  const renderSubtitleButtons = () => (
    <div className="flex flex-wrap items-center gap-2">
      {TV_SUBTITLE_OPTIONS.map((option) => {
        const isActive = option.id === subtitleLanguage;

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => setSubtitleLanguage(option.id)}
            className={cn(
              'inline-flex items-center rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition-colors',
              isActive
                ? 'border-brand bg-brand text-white shadow-[0_18px_36px_rgba(255,109,46,0.24)]'
                : isDarkMode
                  ? 'border-white/10 bg-white/5 text-white/75 hover:bg-white/10'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-brand/30 hover:bg-brand/[0.06]'
            )}
            aria-pressed={isActive}
          >
            {option.shortLabel}
          </button>
        );
      })}
    </div>
  );

  const renderPlayer = (channel: TvChannel) => {
    const source = channel.embedUrl ?? channel.watchUrl;

    if (!source) {
      return (
        <div
          className={cn(
            'flex aspect-video items-center justify-center rounded-[2rem] border px-6 text-center',
            isDarkMode ? 'border-white/10 bg-white/5 text-white/70' : 'border-slate-200 bg-slate-50 text-slate-500'
          )}
        >
          No hay reproductor integrado disponible para este canal.
        </div>
      );
    }

    if (channel.playerType === 'hls') {
      return (
        <div className="relative aspect-video overflow-hidden rounded-[2rem] bg-black">
          <video
            ref={videoRef}
            controls
            playsInline
            autoPlay
            muted
            className="h-full w-full bg-black object-cover"
          />
          {renderSubtitleOverlay()}
        </div>
      );
    }

    return (
      <div className="relative aspect-video overflow-hidden rounded-[2rem] bg-black">
        <iframe
          title={`Directo de ${channel.name}`}
          src={source}
          className="h-full w-full border-0"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
        {renderSubtitleOverlay()}
      </div>
    );
  };

  return (
    <div className="w-full space-y-4 pb-28 sm:space-y-5 sm:pb-32 xl:space-y-6">
      {isWatching ? (
        <div className="space-y-4 sm:space-y-5">
          <section className={cn('rounded-[2.15rem] border p-3.5 sm:rounded-[2.35rem] sm:p-4 xl:p-5', panelClassName)}>
            <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={handleBackToChannels}
                  className={cn(
                    'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors',
                    isDarkMode
                      ? 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  )}
                  aria-label="Volver a tarjetas"
                >
                  <ArrowLeft className="h-4.5 w-4.5" />
                </button>

                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.1rem] text-lg font-black shadow-[0_14px_30px_rgba(15,23,42,0.08)]"
                  style={{ background: selectedPresentation.logoBackground, color: selectedPresentation.logoTextColor }}
                >
                  {selectedPresentation.logoText}
                </div>

                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em]',
                        isDarkMode ? 'bg-red-500/20 text-red-200' : 'bg-red-50 text-red-600'
                      )}
                    >
                      En directo
                    </span>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em]',
                        isDarkMode ? 'bg-white/8 text-white/72' : 'bg-slate-100 text-slate-500'
                      )}
                    >
                      {playerSurfaceLabel(selectedChannel)}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-brand/15 bg-brand/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-brand">
                      {selectedChannel.area}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-[1.5rem] font-black tracking-tight sm:text-[1.9rem]">{selectedChannel.name}</h3>
                    <p className={cn('mt-1 text-sm font-semibold', isDarkMode ? 'text-white/72' : 'text-slate-600')}>
                      Ahora: {selectedPresentation.currentShow}
                    </p>
                    <p className={cn('mt-1 text-sm leading-6', isDarkMode ? 'text-white/56' : 'text-slate-500')}>
                      {selectedChannel.note}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap 2xl:justify-end">
                <button
                  type="button"
                  onClick={() => setIsChatVisible((current) => !current)}
                  className={cn(
                    'inline-flex items-center justify-center gap-2 rounded-[1rem] border px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] transition-colors',
                    isDarkMode
                      ? 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  )}
                >
                  <MessageCircle className="h-4 w-4" />
                  {isChatVisible ? 'Ocultar chat' : 'Mostrar chat'}
                </button>

                <a
                  href={selectedChannel.watchUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-[1rem] bg-brand px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-[0_16px_34px_rgba(255,109,46,0.24)] transition-transform hover:scale-[1.02]"
                >
                  Web oficial
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className={cn('mt-4 border-t pt-4', isDarkMode ? 'border-white/10' : 'border-slate-200')}>
              <div className="flex items-center gap-2">
                <span className={cn('text-[10px] font-black uppercase tracking-[0.22em]', isDarkMode ? 'text-white/42' : 'text-brand')}>
                  Cambio rapido
                </span>
                <div className={cn('h-px flex-1', isDarkMode ? 'bg-white/10' : 'bg-slate-200')} />
              </div>

              <div className="-mx-3 mt-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
                <div className="flex gap-2.5">
                  {channels.map((channel) => {
                    const isActive = channel.id === selectedChannel.id;
                    const presentation = getChannelPresentation(channel);

                    return (
                      <button
                        key={channel.id}
                        type="button"
                        onClick={() => setSelectedChannelId(channel.id)}
                        className={cn(
                          'flex w-[200px] shrink-0 items-center gap-3 rounded-[1.45rem] border px-3 py-2.5 text-left transition-all',
                          isActive
                            ? 'border-brand bg-brand text-white shadow-[0_18px_40px_rgba(255,109,46,0.24)]'
                            : isDarkMode
                              ? 'border-white/10 bg-white/5 text-white/78 hover:bg-white/10'
                              : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-brand/30 hover:bg-brand/[0.06]'
                        )}
                      >
                        <div
                          className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.95rem] text-sm font-black tracking-[0.08em]',
                            isActive ? 'bg-white/14 text-white' : ''
                          )}
                          style={isActive ? undefined : { background: presentation.logoBackground, color: presentation.logoTextColor }}
                        >
                          {presentation.logoText}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-black tracking-tight">{channel.name}</p>
                            <span
                              className={cn(
                                'inline-flex items-center rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em]',
                                isActive
                                  ? 'bg-white/16 text-white'
                                  : isDarkMode
                                    ? 'bg-white/8 text-white/72'
                                    : 'bg-brand/10 text-brand'
                              )}
                            >
                              {playerTypeBadge(channel)}
                            </span>
                          </div>
                          <p
                            className={cn(
                              'mt-1 truncate text-[10px] font-black uppercase tracking-[0.18em]',
                              isActive ? 'text-white/70' : isDarkMode ? 'text-white/44' : 'text-slate-400'
                            )}
                          >
                            {channel.area}
                          </p>
                          <p className={cn('mt-1 truncate text-[11px]', isActive ? 'text-white/84' : isDarkMode ? 'text-white/62' : 'text-slate-500')}>
                            {presentation.currentShow}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <div
            className={cn(
              'grid gap-4 2xl:items-start',
              isChatVisible ? '2xl:grid-cols-[minmax(0,1fr)_320px]' : 'grid-cols-1'
            )}
          >
            <section className="min-w-0">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className={cn('rounded-[2.15rem] border p-3 sm:p-4', panelClassName)}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn('text-[10px] font-black uppercase tracking-[0.22em]', isDarkMode ? 'text-white/42' : 'text-brand')}>
                        Canal activo
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em]',
                          isDarkMode ? 'bg-white/8 text-white/72' : 'bg-slate-100 text-slate-500'
                        )}
                      >
                        {selectedChannel.availability}
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em]',
                          subtitleLanguage === 'off'
                            ? isDarkMode
                              ? 'bg-white/8 text-white/60'
                              : 'bg-slate-100 text-slate-500'
                            : 'border border-brand/15 bg-brand/10 text-brand'
                        )}
                      >
                        {subtitleLanguage === 'off' ? 'Sub OFF' : `Sub ${activeSubtitleOption.shortLabel}`}
                      </span>
                    </div>
                    <p className={cn('text-xs font-semibold', isDarkMode ? 'text-white/52' : 'text-slate-500')}>
                      {selectedPresentation.currentShow}
                    </p>
                  </div>

                  <div className="mt-3">{renderPlayer(selectedChannel)}</div>
                </div>

                <aside className="space-y-4">
                  <div className={cn('rounded-[2rem] border p-4', panelClassName)}>
                    <p className={cn('text-[10px] font-black uppercase tracking-[0.18em]', isDarkMode ? 'text-white/42' : 'text-brand')}>
                      Ahora
                    </p>
                    <h4 className="mt-2 text-[1.35rem] font-black tracking-tight">{selectedPresentation.currentShow}</h4>
                    <p className={cn('mt-3 text-sm leading-6', isDarkMode ? 'text-white/68' : 'text-slate-600')}>
                      {selectedChannel.focus}
                    </p>
                  </div>

                  <div className={cn('rounded-[2rem] border p-4', panelClassName)}>
                    <div className="flex items-center gap-2 text-brand">
                      <Captions className="h-4 w-4" />
                      <p className="text-[10px] font-black uppercase tracking-[0.18em]">Subtitulos</p>
                    </div>
                    <p className={cn('mt-3 text-sm leading-6', isDarkMode ? 'text-white/78' : 'text-slate-700')}>
                      {subtitleLanguage === 'off'
                        ? 'Activa un idioma para ver subtitulos sobre la emision.'
                        : activeSubtitleCue}
                    </p>
                    <p className={cn('mt-2 text-[10px] font-black uppercase tracking-[0.14em]', isDarkMode ? 'text-white/42' : 'text-slate-400')}>
                      {subtitleLanguage === 'off' ? 'Desactivados' : `${activeSubtitleOption.label} activo`}
                    </p>
                    <div className="mt-4">{renderSubtitleButtons()}</div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                    <div className={cn('rounded-[1.4rem] border p-4', insetPanelClassName)}>
                      <div className="flex items-center gap-2 text-brand">
                        <MapPin className="h-4 w-4" />
                        <p className="text-[10px] font-black uppercase tracking-[0.18em]">Zona</p>
                      </div>
                      <p className={cn('mt-2 text-sm leading-6', isDarkMode ? 'text-white/76' : 'text-slate-600')}>
                        {selectedChannel.area}
                      </p>
                    </div>

                    <div className={cn('rounded-[1.4rem] border p-4', insetPanelClassName)}>
                      <div className="flex items-center gap-2 text-brand">
                        <Radio className="h-4 w-4" />
                        <p className="text-[10px] font-black uppercase tracking-[0.18em]">Estado</p>
                      </div>
                      <p className={cn('mt-2 text-sm leading-6', isDarkMode ? 'text-white/76' : 'text-slate-600')}>
                        {selectedChannel.availability}
                      </p>
                    </div>

                    <div className={cn('rounded-[1.4rem] border p-4', insetPanelClassName)}>
                      <div className="flex items-center gap-2 text-brand">
                        <Flame className="h-4 w-4" />
                        <p className="text-[10px] font-black uppercase tracking-[0.18em]">Cobertura</p>
                      </div>
                      <p className={cn('mt-2 text-sm leading-6', isDarkMode ? 'text-white/76' : 'text-slate-600')}>
                        {selectedChannel.focus}
                      </p>
                    </div>
                  </div>
                </aside>
              </div>
            </section>

            {isChatVisible ? (
              <LiveTvChat
                channel={selectedChannel}
                viewer={viewer}
                bot={chatBot}
                isDarkMode={isDarkMode}
                onHide={() => setIsChatVisible(false)}
              />
            ) : null}
          </div>
        </div>
      ) : (
        <>
          <section className={cn('rounded-[1.95rem] border px-3.5 py-4 sm:rounded-[2.2rem] sm:px-5 sm:py-5 xl:px-6 xl:py-6', panelClassName)}>
            <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.82fr)] lg:items-center xl:grid-cols-[minmax(0,1.02fr)_minmax(420px,0.9fr)] 2xl:grid-cols-[minmax(0,1.08fr)_minmax(470px,0.92fr)]">
              <div className="max-w-[42rem] space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-brand/15 bg-brand/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-brand">
                  <Tv className="h-4 w-4" />
                  Fallas En TV
                </div>
                <div className="space-y-2.5">
                  <h2 className="max-w-[20ch] text-[1.55rem] font-black leading-[0.94] tracking-[-0.05em] sm:text-[2.15rem] xl:text-[2.8rem]">
                    Televisiones valencianas con cobertura fallera
                  </h2>
                  <p className={cn('max-w-[36rem] text-[13px] leading-6 sm:text-sm', isDarkMode ? 'text-white/68' : 'text-slate-600')}>
                    Sigue directos y especiales desde cualquier dispositivo con una portada mas compacta y rapida de usar.
                  </p>
                </div>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <div className={cn('rounded-[1.35rem] border p-3.5', insetPanelClassName)}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500 shadow-[0_10px_24px_rgba(239,68,68,0.18)]">
                      <Radio className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[15px] font-black tracking-tight">{channels.length} canales en directo ahora</p>
                      <p className={cn('mt-1 text-xs', isDarkMode ? 'text-white/58' : 'text-slate-500')}>
                        Actualizado hace 1 min
                      </p>
                    </div>
                  </div>
                </div>

                <label className={cn('flex items-center gap-3 rounded-[1.35rem] border px-3.5 py-3', insetPanelClassName)}>
                  <Search className={cn('h-4.5 w-4.5 shrink-0', isDarkMode ? 'text-white/45' : 'text-slate-400')} />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Buscar canal"
                    aria-label="Buscar canal"
                    className={cn(
                      'w-full bg-transparent text-[13px] font-semibold outline-none placeholder:font-medium sm:text-sm',
                      isDarkMode ? 'text-white placeholder:text-white/38' : 'text-slate-900 placeholder:text-slate-400'
                    )}
                  />
                </label>
              </div>
            </div>

            <div className="-mx-3.5 mt-4 overflow-x-auto px-3.5 pb-1 sm:mx-0 sm:px-0">
              <div className="flex min-w-max gap-3 sm:flex-wrap">
                {FILTER_OPTIONS.map((option) => {
                  const Icon = filterIcon(option.id);
                  const isActive = option.id === activeFilter;
                  const count = channels.filter((channel) => matchesFilter(channel, option.id)).length;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setActiveFilter(option.id)}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[11px] font-black tracking-[0.01em] transition-colors',
                        isActive
                          ? 'border-brand/15 bg-brand/10 text-brand'
                          : isDarkMode
                            ? 'border-white/10 bg-white/5 text-white/72 hover:bg-white/8'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                      )}
                      aria-pressed={isActive}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {option.label}
                      {(option.id === 'live' || option.id === 'all') ? (
                        <span
                          className={cn(
                            'ml-1 inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-black',
                            isActive ? 'bg-white text-brand' : isDarkMode ? 'bg-white/10 text-white/82' : 'bg-slate-100 text-brand'
                          )}
                        >
                          {count}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {featuredChannel && featuredPresentation ? (
            <section
              className={cn(
                'grid gap-5',
                sideChannels.length > 0 ? '2xl:grid-cols-[minmax(0,1.72fr)_400px]' : 'grid-cols-1'
              )}
            >
              <article className={cn('rounded-[2.1rem] border p-4 sm:rounded-[2.4rem] sm:p-5 xl:p-6', panelClassName)}>
                <div className="grid gap-5 xl:grid-cols-[minmax(360px,1.08fr)_minmax(0,1.18fr)] xl:items-center 2xl:grid-cols-[minmax(440px,1.18fr)_minmax(0,1.08fr)]">
                  <div
                    className="relative min-h-[260px] overflow-hidden rounded-[1.8rem] p-4 text-white sm:min-h-[340px] sm:rounded-[2rem] sm:p-6 xl:min-h-[420px]"
                    style={{ background: featuredPresentation.visualGradient }}
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.34),transparent_26%),radial-gradient(circle_at_84%_12%,rgba(255,255,255,0.22),transparent_20%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(0,0,0,0.14))]" />
                    <div className="absolute -bottom-10 right-[-12px] h-44 w-44 rounded-full bg-white/12 blur-3xl" />
                    <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-end justify-between gap-3">
                      <span className="inline-flex items-center gap-2 rounded-full bg-red-500 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-[0_16px_32px_rgba(239,68,68,0.28)]">
                        <Radio className="h-3.5 w-3.5" />
                        En directo
                      </span>
                      <span className="rounded-full bg-black/28 px-3 py-1.5 text-xs font-bold text-white/92 backdrop-blur-sm">
                        {featuredPresentation.audience}
                      </span>
                    </div>
                    <div
                      className="absolute right-4 top-4 flex h-16 w-16 items-center justify-center rounded-[1.35rem] text-[1.85rem] font-black shadow-[0_18px_34px_rgba(15,23,42,0.18)] sm:h-20 sm:w-20 sm:text-[2.2rem]"
                      style={{ background: featuredPresentation.logoBackground, color: featuredPresentation.logoTextColor }}
                    >
                      {featuredPresentation.logoText}
                    </div>
                    <div className="relative z-10 flex h-full max-w-full flex-col justify-between pr-20 sm:max-w-[68%] sm:pr-0">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/75">
                          {featuredPresentation.heroHeadline}
                        </p>
                        <h3 className="mt-3 text-[1.45rem] font-black tracking-tight sm:text-[2.4rem] xl:text-[2.7rem]">{featuredChannel.name}</h3>
                        <p className="mt-3 max-w-[18rem] text-[13px] leading-6 text-white/84 sm:text-[15px] xl:max-w-[22rem]">
                          {featuredPresentation.heroSupport}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="flex flex-wrap items-center gap-3">
                      <div
                        className="flex h-16 w-16 items-center justify-center rounded-[1.35rem] text-[1.8rem] font-black shadow-[0_14px_30px_rgba(15,23,42,0.08)]"
                        style={{ background: featuredPresentation.logoBackground, color: featuredPresentation.logoTextColor }}
                      >
                        {featuredPresentation.logoText}
                      </div>
                      <div className="min-w-0">
                        <p className={cn('text-[10px] font-black uppercase tracking-[0.22em]', isDarkMode ? 'text-white/42' : 'text-brand')}>
                          Canal destacado
                        </p>
                        <h3 className="mt-1 text-[1.9rem] font-black tracking-tight">{featuredChannel.name}</h3>
                        <p className={cn('mt-1 text-sm font-semibold', isDarkMode ? 'text-white/62' : 'text-slate-500')}>
                          {featuredChannel.area}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const CategoryIcon = categoryIcon(featuredPresentation.category);

                        return (
                          <span className="inline-flex items-center gap-2 rounded-full border border-brand/15 bg-brand/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-brand">
                            <CategoryIcon className="h-4 w-4" />
                            {featuredPresentation.categoryLabel}
                          </span>
                        );
                      })()}
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em]',
                          isDarkMode ? 'bg-white/8 text-white/72' : 'bg-slate-100 text-slate-500'
                        )}
                      >
                        {playerTypeBadge(featuredChannel)}
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em]',
                          isDarkMode ? 'bg-white/8 text-white/72' : 'bg-slate-100 text-slate-500'
                        )}
                      >
                        {featuredChannel.availability}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">Ahora</p>
                        <p className="mt-2 text-[1.35rem] font-black tracking-tight">{featuredPresentation.currentShow}</p>
                      </div>
                      <p className={cn('text-sm leading-7 sm:text-[15px]', isDarkMode ? 'text-white/70' : 'text-slate-600')}>
                        {featuredChannel.note}
                      </p>
                      <div className={cn('rounded-[1.5rem] border px-4 py-3', insetPanelClassName)}>
                        <p className={cn('text-[10px] font-black uppercase tracking-[0.18em]', isDarkMode ? 'text-white/42' : 'text-brand')}>
                          Cobertura
                        </p>
                        <p className={cn('mt-2 text-sm leading-6', isDarkMode ? 'text-white/72' : 'text-slate-600')}>
                          {featuredChannel.focus}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleOpenChannel(featuredChannel)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-[1.1rem] bg-brand px-5 py-3 text-sm font-black tracking-tight text-white shadow-[0_18px_40px_rgba(255,109,46,0.28)] transition-transform hover:scale-[1.02] sm:w-auto"
                      >
                        <Play className="h-4 w-4" />
                        Ver en directo
                      </button>

                      <a
                        href={featuredChannel.watchUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(
                          'inline-flex w-full items-center justify-center gap-2 rounded-[1.1rem] border px-5 py-3 text-sm font-black tracking-tight transition-colors sm:w-auto',
                          isDarkMode
                            ? 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        )}
                      >
                        Web oficial
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </div>
              </article>

              {sideChannels.length > 0 ? (
                <aside className="space-y-3 2xl:space-y-4">
                  {sideChannels.map((channel) => {
                    const presentation = getChannelPresentation(channel);

                    return (
                      <button
                        key={channel.id}
                        type="button"
                        onClick={() => setSelectedChannelId(channel.id)}
                        className={cn(
                          'flex w-full items-center justify-between gap-3 rounded-[2rem] border p-4 text-left transition-colors',
                          panelClassName,
                          isDarkMode ? 'hover:bg-white/[0.08]' : 'hover:border-slate-300 hover:bg-white'
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.2rem] text-lg font-black shadow-[0_14px_30px_rgba(15,23,42,0.08)]"
                            style={{ background: presentation.logoBackground, color: presentation.logoTextColor }}
                          >
                            {presentation.logoText}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-base font-black tracking-tight">{channel.name}</p>
                            <p className={cn('mt-1 truncate text-sm font-semibold', isDarkMode ? 'text-white/58' : 'text-slate-500')}>
                              {channel.area}
                            </p>
                            <p className={cn('mt-2 truncate text-sm', isDarkMode ? 'text-white/72' : 'text-slate-600')}>
                              <span className="font-black">Ahora:</span> {presentation.currentShow}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <span className="hidden items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-red-500 sm:inline-flex">
                            <span className="h-2 w-2 rounded-full bg-red-500" />
                            En directo
                          </span>
                          <ChevronRight className={cn('h-4 w-4', isDarkMode ? 'text-white/34' : 'text-slate-300')} />
                        </div>
                      </button>
                    );
                  })}
                </aside>
              ) : null}
            </section>
          ) : (
            <section className={cn('rounded-[2.3rem] border p-8 text-center', panelClassName)}>
              <p className="text-xl font-black tracking-tight">No hay canales con ese filtro.</p>
              <p className={cn('mt-2 text-sm', isDarkMode ? 'text-white/62' : 'text-slate-500')}>
                Prueba otra busqueda o vuelve a `Todos`.
              </p>
            </section>
          )}

          {browseChannels.length > 0 ? (
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
              {browseChannels.map((channel) => {
                const presentation = getChannelPresentation(channel);
                const CategoryIcon = categoryIcon(presentation.category);

                return (
                  <article key={channel.id} className={cn('rounded-[1.75rem] border p-4 sm:rounded-[2rem] sm:p-5 xl:p-5', panelClassName)}>
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.25rem] text-[1.55rem] font-black shadow-[0_14px_30px_rgba(15,23,42,0.08)]"
                        style={{ background: presentation.logoBackground, color: presentation.logoTextColor }}
                      >
                        {presentation.logoText}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-[1.45rem] font-black tracking-tight">{channel.name}</h3>
                        <p className={cn('mt-1 text-sm font-semibold', isDarkMode ? 'text-white/58' : 'text-slate-500')}>
                          {channel.area}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full border border-brand/15 bg-brand/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-brand">
                        <CategoryIcon className="h-4 w-4" />
                        {presentation.categoryLabel}
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em]',
                          isDarkMode ? 'bg-white/8 text-white/72' : 'bg-slate-100 text-slate-500'
                        )}
                      >
                        {playerTypeBadge(channel)}
                      </span>
                    </div>

                    <p className={cn('mt-4 text-sm leading-7', isDarkMode ? 'text-white/68' : 'text-slate-600')}>
                      {channel.note}
                    </p>

                    <div className={cn('mt-4 rounded-[1.4rem] border px-4 py-3', insetPanelClassName)}>
                      <p className={cn('text-[10px] font-black uppercase tracking-[0.18em]', isDarkMode ? 'text-white/42' : 'text-brand')}>
                        Ahora
                      </p>
                      <p className="mt-2 text-sm font-semibold leading-6">{presentation.currentShow}</p>
                    </div>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleOpenChannel(channel)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-[1rem] bg-brand px-4 py-2.5 text-sm font-black tracking-tight text-white shadow-[0_16px_34px_rgba(255,109,46,0.24)] transition-transform hover:scale-[1.02] sm:w-auto"
                      >
                        <Play className="h-4 w-4" />
                        Ver en directo
                      </button>

                      <a
                        href={channel.watchUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(
                          'inline-flex w-full items-center justify-center gap-2 rounded-[1rem] border px-4 py-2.5 text-sm font-black tracking-tight transition-colors sm:w-auto',
                          isDarkMode
                            ? 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        )}
                      >
                        Web oficial
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </article>
                );
              })}
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
