import React, { useEffect, useMemo, useRef, useState } from 'react';
import { EyeOff, MessageCircle, Radio, Send } from 'lucide-react';
import { cn } from '../utils/cn';
import { type AppViewer, type TvChannel, type TvChatBotConfig } from '../data';

type ChatAuthorType = 'bot' | 'user' | 'guest';

interface ChatMessage {
  id: string;
  authorName: string;
  authorHandle: string;
  text: string;
  sentAt: string;
  authorType: ChatAuthorType;
  badge: string;
  isCurrentUser?: boolean;
}

interface LiveTvChatProps {
  channel: TvChannel;
  viewer: AppViewer;
  bot: TvChatBotConfig;
  isDarkMode: boolean;
  onHide: () => void;
}

const authorColorClassNames: Record<ChatAuthorType, string> = {
  bot: 'text-brand',
  user: 'text-sky-600',
  guest: 'text-amber-600'
};

const badgeClassNames: Record<ChatAuthorType, string> = {
  bot: 'border border-brand/15 bg-brand/10 text-brand',
  user: 'border border-sky-500/15 bg-sky-500/10 text-sky-600',
  guest: 'border border-amber-500/15 bg-amber-500/10 text-amber-600'
};

function sanitizeHandle(value: string): string {
  const base = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');

  return base || 'falles360';
}

function viewerBadge(viewer: AppViewer): string {
  return viewer.accessType === 'guest' ? 'INVITADO' : 'REG';
}

function viewerRole(viewer: AppViewer): ChatAuthorType {
  return viewer.accessType === 'guest' ? 'guest' : 'user';
}

export function LiveTvChat({ channel, viewer, bot, isDarkMode, onHide }: LiveTvChatProps) {
  const [draft, setDraft] = useState('');
  const [messagesByChannel, setMessagesByChannel] = useState<Record<string, ChatMessage[]>>({});
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const configuredBotMessages = useMemo(
    () =>
      (bot.messagesByChannel[channel.id] ?? []).map((text, index) => ({
        id: `${channel.id}-bot-${index}`,
        authorName: bot.name,
        authorHandle: bot.handle,
        text,
        sentAt: 'oficial',
        authorType: 'bot' as const,
        badge: bot.badge
      })),
    [bot, channel.id]
  );

  const messages = useMemo(
    () => [...configuredBotMessages, ...(messagesByChannel[channel.id] ?? [])],
    [configuredBotMessages, messagesByChannel, channel.id]
  );

  useEffect(() => {
    const viewport = scrollRef.current;
    if (!viewport) {
      return;
    }

    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior: 'smooth'
    });
  }, [channel.id, messages.length]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedDraft = draft.trim();
    if (!trimmedDraft) {
      return;
    }

    const role = viewerRole(viewer);
    const nextMessage: ChatMessage = {
      id: `${channel.id}-viewer-${Date.now()}`,
      authorName: viewer.name,
      authorHandle: viewer.handle || `@${sanitizeHandle(viewer.name)}`,
      text: trimmedDraft,
      sentAt: 'ahora',
      authorType: role,
      badge: viewerBadge(viewer),
      isCurrentUser: true
    };

    setMessagesByChannel((current) => ({
      ...current,
      [channel.id]: [...(current[channel.id] ?? []).slice(-15), nextMessage]
    }));
    setDraft('');
  };

  return (
    <aside
      className={cn(
        'flex min-h-[360px] flex-col gap-4 rounded-[2.2rem] border p-4 sm:p-5 xl:sticky xl:top-8 xl:h-[min(720px,calc(100vh-11rem))]',
        isDarkMode
          ? 'bg-white/5 border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.28)]'
          : 'bg-white border-gray-100 shadow-[0_24px_60px_rgba(15,23,42,0.08)]'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/15 bg-brand/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-brand">
            <Radio className="h-4 w-4" />
            Chat En Directo
          </div>
          <h3 className="text-xl font-black tracking-tight">Comunidad Fallera</h3>
          <p className={cn('text-sm leading-6', isDarkMode ? 'text-white/62' : 'text-slate-500')}>
            Solo actividad real del canal. Sin mensajes de prueba.
          </p>
        </div>

        <button
          type="button"
          onClick={onHide}
          className={cn(
            'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-colors',
            isDarkMode
              ? 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
              : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
          )}
        >
          <EyeOff className="h-4 w-4" />
          Ocultar
        </button>
      </div>

      <div
        ref={scrollRef}
        className={cn(
          'flex-1 space-y-4 overflow-auto rounded-[1.7rem] border p-3',
          isDarkMode ? 'border-white/10 bg-black/25' : 'border-slate-200 bg-slate-50'
        )}
      >
        {messages.length === 0 ? (
          <div className="flex h-full min-h-[160px] items-center justify-center">
            <div className="max-w-[220px] space-y-3 text-center">
              <MessageCircle className="mx-auto h-7 w-7 text-brand" />
              <p className="text-sm font-black uppercase tracking-[0.18em]">Sin comentarios todavia</p>
              <p className={cn('text-sm leading-6', isDarkMode ? 'text-white/60' : 'text-slate-500')}>
                Este panel se mantendra vacio hasta que haya mensajes reales en el canal.
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn('text-sm font-black tracking-tight', authorColorClassNames[message.authorType])}>
                  {message.authorName}
                </span>
                <span className={cn('text-[11px] font-medium', isDarkMode ? 'text-white/45' : 'text-slate-400')}>
                  {message.authorHandle}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]',
                    badgeClassNames[message.authorType]
                  )}
                >
                  {message.badge}
                </span>
                <span className={cn('text-[10px] font-black uppercase tracking-[0.18em]', isDarkMode ? 'text-white/35' : 'text-slate-400')}>
                  {message.sentAt}
                </span>
              </div>

              <p
                className={cn(
                  'text-sm leading-6',
                  message.isCurrentUser ? 'font-semibold' : '',
                  isDarkMode ? 'text-white/78' : 'text-slate-700'
                )}
              >
                {message.text}
              </p>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div
          className={cn(
            'flex items-center gap-3 rounded-[1.4rem] border px-4 py-3',
            isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'
          )}
        >
          <img src={viewer.avatar} alt={viewer.name} className="h-11 w-11 rounded-[1rem] object-cover" />
          <div className="min-w-0">
            <p className="truncate text-sm font-black tracking-tight">{viewer.name}</p>
            <p className={cn('text-[10px] font-black uppercase tracking-[0.22em]', isDarkMode ? 'text-white/45' : 'text-slate-400')}>
              {viewer.accessType === 'guest' ? 'Modo invitado' : 'Usuario registrado'}
            </p>
          </div>
        </div>

        <div
          className={cn(
            'flex items-center gap-3 rounded-[1.5rem] border px-3 py-3',
            isDarkMode ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50'
          )}
        >
          <MessageCircle className="ml-1 h-5 w-5 shrink-0 text-brand" />
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={`Escribe en el chat de ${channel.name}`}
            className={cn(
              'min-w-0 flex-1 bg-transparent text-sm outline-none',
              isDarkMode ? 'text-white placeholder:text-white/35' : 'text-slate-700 placeholder:text-slate-400'
            )}
          />
          <button
            type="submit"
            disabled={draft.trim().length === 0}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] bg-brand text-white shadow-lg shadow-brand/25 transition-transform hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
          >
            <Send className="h-4.5 w-4.5" />
          </button>
        </div>
      </form>

      <p className={cn('text-[10px] leading-5', isDarkMode ? 'text-white/38' : 'text-slate-400')}>
        No se cargan mensajes ni metricas de prueba. Solo se mostrara actividad real.
      </p>
    </aside>
  );
}
