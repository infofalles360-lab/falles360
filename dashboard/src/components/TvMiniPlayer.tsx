import React, { useEffect, useMemo, useRef } from 'react';
import Hls from 'hls.js';
import { ExternalLink, Minimize2, Tv, X } from 'lucide-react';
import { cn } from '../utils/cn';
import type { TvChannel } from '../data';

interface TvMiniPlayerProps {
  channel: TvChannel;
  isDarkMode: boolean;
  onClose: () => void;
  onOpenTv: () => void;
}

export function TvMiniPlayer({ channel, isDarkMode, onClose, onOpenTv }: TvMiniPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const source = useMemo(() => channel.embedUrl ?? channel.watchUrl, [channel.embedUrl, channel.watchUrl]);

  useEffect(() => {
    const videoElement = videoRef.current;

    if (!videoElement || !source || channel.playerType !== 'hls') {
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
  }, [channel.playerType, source]);

  const renderPlayer = () => {
    if (!source) {
      return (
        <div className="flex aspect-video items-center justify-center bg-slate-950 px-4 text-center text-sm font-bold text-white/68">
          Este canal no ofrece reproductor embebido.
        </div>
      );
    }

    if (channel.playerType === 'hls') {
      return (
        <video
          ref={videoRef}
          controls
          playsInline
          autoPlay
          muted
          className="h-full w-full bg-black object-cover"
        />
      );
    }

    return (
      <iframe
        title={`Mini player de ${channel.name}`}
        src={source}
        className="h-full w-full border-0"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    );
  };

  return (
    <div className="pointer-events-none fixed bottom-24 right-4 z-[5100] w-[min(360px,calc(100vw-2rem))] sm:bottom-28 sm:right-6">
      <div
        className={cn(
          'pointer-events-auto overflow-hidden rounded-[24px] border shadow-[0_32px_90px_rgba(15,23,42,0.28)] backdrop-blur-2xl',
          isDarkMode ? 'border-white/12 bg-[#071120]/90 text-white' : 'border-white/80 bg-white/88 text-slate-950'
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-500/14 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-sky-400">
              <Tv className="h-3.5 w-3.5" />
              TV flotante
            </div>
            <p className="mt-2 truncate text-sm font-black">{channel.name}</p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onOpenTv}
              className={cn(
                'inline-flex h-10 w-10 items-center justify-center rounded-[14px] transition-colors',
                isDarkMode ? 'bg-white/10 text-white hover:bg-white/14' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              )}
              aria-label="Abrir seccion TV"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className={cn(
                'inline-flex h-10 w-10 items-center justify-center rounded-[14px] transition-colors',
                isDarkMode ? 'bg-white/10 text-white hover:bg-white/14' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              )}
              aria-label="Cerrar mini player"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="aspect-video overflow-hidden bg-black">
          {renderPlayer()}
        </div>

        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-400">En directo</p>
            <p className={cn('truncate text-xs font-bold', isDarkMode ? 'text-white/70' : 'text-slate-500')}>
              Sigue la emision mientras consultas el mapa.
            </p>
          </div>

          <a
            href={channel.watchUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-[16px] bg-sky-500 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white transition-colors hover:bg-sky-600"
          >
            Abrir
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
