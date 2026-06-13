import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bot, LoaderCircle, SendHorizontal, Sparkles, X, MapPin, CalendarDays } from 'lucide-react';
import { cn } from '../utils/cn';

type ChatRole = 'user' | 'assistant';

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

interface AIAssistantProps {
  isDarkMode: boolean;
  activeTab: string;
  selectedDate: string;
  selectedDateLabel: string;
}

const STARTER_SUGGESTIONS = [
  'Recomiendame un plan fallero para esta noche en Valencia.',
  'Dime una ruta corta para ver fallas sin andar demasiado.',
  'Que actos priorizarias hoy si solo tengo 3 horas.',
];

function createMessage(role: ChatRole, content: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
  };
}

export function AIAssistant({ isDarkMode, activeTab, selectedDate, selectedDateLabel }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage(
      'assistant',
      'Soy tu asistente fallero. Puedo proponerte rutas, actos y planes rapidos segun la fecha y la pestana en la que estas.'
    ),
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen || !scrollAreaRef.current) {
      return;
    }

    scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
  }, [isOpen, messages, isLoading]);

  const canSend = inputValue.trim().length > 0 && !isLoading;

  const assistantContext = useMemo(
    () => ({
      activeTab,
      selectedDate,
      selectedDateLabel,
    }),
    [activeTab, selectedDate, selectedDateLabel]
  );

  const sendMessage = async (content: string) => {
    const trimmed = content.trim();

    if (!trimmed || isLoading) {
      return;
    }

    const userMessage = createMessage('user', trimmed);
    const outgoingMessages = [...messages, userMessage];

    setMessages(outgoingMessages);
    setInputValue('');
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: outgoingMessages.map(({ role, content: messageContent }) => ({
            role,
            content: messageContent,
          })),
          context: assistantContext,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.message || 'No se pudo obtener respuesta del asistente.');
      }

      setModelUsed(payload.model || null);
      setMessages((currentMessages) => [
        ...currentMessages,
        createMessage('assistant', payload.content || 'No he podido generar una respuesta util.'),
      ]);
    } catch (requestError) {
      const fallbackMessage =
        requestError instanceof Error ? requestError.message : 'Error inesperado al consultar el asistente.';

      setError(fallbackMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed right-4 bottom-[7.2rem] z-[5200] inline-flex items-center gap-2.5 rounded-[1.1rem] border px-2.5 py-2.5 shadow-[0_14px_30px_rgba(255,99,33,0.2)] transition-all sm:right-5 sm:px-3',
          isDarkMode ? 'border-white/10 bg-[#121212]/94 text-white' : 'border-white/80 bg-white/94 text-slate-950'
        )}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-[0.9rem] bg-brand text-white shadow-[0_10px_20px_rgba(255,99,33,0.24)]">
          <Bot className="h-4.5 w-4.5" />
        </span>
        <span className="hidden sm:block text-left">
          <span className="block text-[11px] font-semibold text-brand">Asistente IA</span>
          <span className={cn('block text-[12px] font-medium', isDarkMode ? 'text-white/68' : 'text-slate-500')}>
            Ayuda rapida
          </span>
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[6000] bg-black/34 backdrop-blur-[10px] p-4 sm:p-6"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 32, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ duration: 0.22 }}
              onClick={(event) => event.stopPropagation()}
              className={cn(
                'mx-auto mt-[6vh] flex w-full max-w-[520px] flex-col overflow-hidden rounded-[2.2rem] border shadow-[0_32px_80px_rgba(15,23,42,0.26)]',
                isDarkMode ? 'border-white/10 bg-[#0d0d0d] text-white' : 'border-white/80 bg-[#fffaf5] text-slate-950'
              )}
            >
              <div
                className={cn(
                  'border-b px-5 py-5',
                  isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-orange-100 bg-[linear-gradient(180deg,#fff8f3_0%,#fff4ec_100%)]'
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-brand">
                      <Sparkles className="h-3.5 w-3.5" />
                      Asistente Fallero
                    </div>
                    <h3 className="mt-3 text-[1.35rem] font-black tracking-tight">Pregunta y te propongo un plan</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em]',
                          isDarkMode ? 'bg-white/8 text-white/74' : 'bg-white text-slate-600'
                        )}
                      >
                        <MapPin className="h-3.5 w-3.5 text-brand" />
                        {activeTab}
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em]',
                          isDarkMode ? 'bg-white/8 text-white/74' : 'bg-white text-slate-600'
                        )}
                      >
                        <CalendarDays className="h-3.5 w-3.5 text-brand" />
                        {selectedDateLabel}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      'flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.2rem] border transition-colors',
                      isDarkMode ? 'border-white/10 bg-white/6 text-white/70 hover:bg-white/10' : 'border-white/80 bg-white text-slate-400 hover:bg-orange-50'
                    )}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div ref={scrollAreaRef} className="max-h-[52vh] min-h-[360px] space-y-4 overflow-y-auto px-5 py-5 custom-scrollbar">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'max-w-[88%] rounded-[1.5rem] px-4 py-3 text-sm leading-6 shadow-sm',
                      message.role === 'assistant'
                        ? isDarkMode
                          ? 'border border-white/8 bg-white/5 text-white/88'
                          : 'border border-orange-50 bg-white text-slate-700'
                        : 'ml-auto bg-brand text-white shadow-[0_14px_30px_rgba(255,99,33,0.22)]'
                    )}
                  >
                    {message.content}
                  </div>
                ))}

                {isLoading && (
                  <div
                    className={cn(
                      'inline-flex items-center gap-3 rounded-[1.4rem] px-4 py-3 text-sm',
                      isDarkMode ? 'border border-white/8 bg-white/5 text-white/70' : 'border border-orange-50 bg-white text-slate-500'
                    )}
                  >
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Pensando una respuesta...
                  </div>
                )}

                {error && (
                  <div className="rounded-[1.2rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
              </div>

              <div className="border-t px-5 py-4">
                <div className="mb-3 flex flex-wrap gap-2">
                  {STARTER_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void sendMessage(suggestion)}
                      disabled={isLoading}
                      className={cn(
                        'rounded-full px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] transition-colors',
                        isDarkMode
                          ? 'bg-white/6 text-white/72 hover:bg-white/10 disabled:opacity-50'
                          : 'bg-orange-50 text-brand hover:bg-orange-100 disabled:opacity-50'
                      )}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>

                <div
                  className={cn(
                    'flex items-end gap-3 rounded-[1.6rem] border p-3',
                    isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-orange-100 bg-white'
                  )}
                >
                  <textarea
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        void sendMessage(inputValue);
                      }
                    }}
                    placeholder="Escribe tu pregunta fallera..."
                    rows={1}
                    className={cn(
                      'max-h-32 min-h-[52px] flex-1 resize-none bg-transparent px-1 py-2 text-sm outline-none',
                      isDarkMode ? 'text-white placeholder:text-white/35' : 'text-slate-700 placeholder:text-slate-400'
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => void sendMessage(inputValue)}
                    disabled={!canSend}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.2rem] bg-brand text-white shadow-[0_12px_24px_rgba(255,99,33,0.24)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <SendHorizontal className="h-5 w-5" />
                  </button>
                </div>

                <div className={cn('mt-3 flex items-center justify-between text-[11px]', isDarkMode ? 'text-white/40' : 'text-slate-400')}>
                  <span>Respuesta breve y util.</span>
                  <span>{modelUsed ? `Modelo: ${modelUsed}` : 'Asistente activo'}</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
