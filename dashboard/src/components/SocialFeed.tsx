import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import {
  Heart, MessageCircle, Share2, Plus, Flame, MapPin,
  MoreHorizontal, Star, Camera, Image as ImageIcon, Smile,
  Send, X, ChevronLeft, ChevronRight
} from 'lucide-react';
import { cn } from '../utils/cn';
import { type AppViewer, type SocialPost } from '../data';

interface SocialFeedProps {
  isDarkMode: boolean;
  posts: SocialPost[];
  viewer: AppViewer;
}

type ComposerMode = 'photo' | 'live' | 'location';

interface FeedComment {
  id: string;
  user: string;
  userImage: string;
  content: string;
  time: string;
}

interface FeedPost extends Omit<SocialPost, 'image'> {
  image?: string | null;
  comments: FeedComment[];
  commentCount: number;
}

interface StoryItem {
  id: number;
  user: string;
  img: string;
  content: string;
  caption?: string;
  createdAt?: string;
  isMe?: boolean;
  active?: boolean;
}

const TRENDING_TAGS = ['#Fallas2026', '#Mascleta', '#Ofrenda', '#NitDelFoc'];
const EMOJI_OPTIONS = ['🔥', '🎆', '🎉', '😍', '👏', '🥳', '📸', '🧡'];
const COMMENT_COUNTS: Record<string, number> = { p1: 12, p2: 8, p3: 5, p4: 7, p5: 4 };
const COMMENT_PREVIEWS: Record<string, FeedComment[]> = {
  p1: [{ id: 'p1-c1', user: 'Carlos_VLC', userImage: 'https://i.pravatar.cc/100?u=12', content: 'Que pasada de monumento. Manana voy a verlo sin falta.', time: '18m' }],
  p2: [{ id: 'p2-c1', user: 'Ana_Pla', userImage: 'https://i.pravatar.cc/100?u=13', content: 'Guardame sitio, que esa mascleta promete muchisimo.', time: '9m' }],
  p3: [{ id: 'p3-c1', user: 'JoanR', userImage: 'https://i.pravatar.cc/100?u=14', content: 'Ruzafa de noche nunca falla, planazo total.', time: '41m' }],
  p4: [{ id: 'p4-c1', user: 'Mireia', userImage: 'https://i.pravatar.cc/100?u=15', content: 'Ese remate merece una visita con calma.', time: '11m' }],
  p5: [{ id: 'p5-c1', user: 'Pau', userImage: 'https://i.pravatar.cc/100?u=16', content: 'La luz de esa calle le queda brutal.', time: '6m' }],
};

const EXTRA_POSTS: SocialPost[] = [
  { id: 'p4', user: 'Clara M.', userImage: 'https://i.pravatar.cc/150?u=clara', content: 'Acabo de salir de una visita por Seccion Especial y el nivel esta muy arriba este ano.', image: 'https://picsum.photos/seed/post4/600/800', likes: 63, time: '1h' },
  { id: 'p5', user: 'Vicent G.', userImage: 'https://i.pravatar.cc/150?u=vicent', content: 'Las calles ya tienen ambiente de noche grande. Hoy toca ruta larga por el centro.', image: 'https://picsum.photos/seed/post5/600/800', likes: 34, time: '3h' },
];

const COMPOSER_OPTIONS: Array<{
  id: ComposerMode;
  label: string;
  icon: typeof ImageIcon;
  iconClassName: string;
  activeClassName: string;
  helperText: string;
  defaultText: (viewer: AppViewer) => string;
  imageUrl: string;
}> = [
  { id: 'photo', label: 'FOTO', icon: ImageIcon, iconClassName: 'text-emerald-500', activeClassName: 'bg-emerald-500/12 text-emerald-600', helperText: 'Foto lista para acompanar tu publicacion.', defaultText: () => 'Nuevo momento fallero compartido desde mi ruta.', imageUrl: 'https://picsum.photos/seed/composer-photo/600/800' },
  { id: 'live', label: 'VIVO', icon: Camera, iconClassName: 'text-brand', activeClassName: 'bg-brand/12 text-brand', helperText: 'Modo en vivo activado para publicar al instante.', defaultText: () => 'Estoy en directo disfrutando del ambiente fallero.', imageUrl: 'https://picsum.photos/seed/composer-live/600/800' },
  { id: 'location', label: 'UBICACION', icon: MapPin, iconClassName: 'text-blue-500', activeClassName: 'bg-blue-500/12 text-blue-600', helperText: 'Ubicacion anadida a esta publicacion.', defaultText: (viewer) => `Estoy ahora mismo por ${viewer.location}.`, imageUrl: 'https://picsum.photos/seed/composer-location/600/800' },
];

function decoratePosts(posts: SocialPost[]): FeedPost[] {
  return posts.map((post) => ({
    ...post,
    comments: COMMENT_PREVIEWS[post.id] ?? [],
    commentCount: COMMENT_COUNTS[post.id] ?? COMMENT_PREVIEWS[post.id]?.length ?? 0,
  }));
}

function buildPostCopy(draft: string, mode: ComposerMode | null, viewer: AppViewer): string {
  const trimmedDraft = draft.trim();
  const selectedOption = COMPOSER_OPTIONS.find((option) => option.id === mode);

  if (trimmedDraft && selectedOption?.id === 'location' && !trimmedDraft.toLowerCase().includes(viewer.location.toLowerCase())) {
    return `${trimmedDraft} • ${viewer.location}`;
  }

  if (trimmedDraft) {
    return trimmedDraft;
  }

  return selectedOption?.defaultText(viewer) ?? 'Nuevo momento compartido en Falles360.';
}

function getComposerImage(mode: ComposerMode | null): string {
  return COMPOSER_OPTIONS.find((option) => option.id === mode)?.imageUrl ?? 'https://picsum.photos/seed/composer-default/600/800';
}

function buildStoryCaption(draft: string, mode: ComposerMode | null, viewer: AppViewer): string {
  const copy = buildPostCopy(draft, mode, viewer).trim();
  return copy || `Nuevo momento desde ${viewer.location}`;
}

export function SocialFeed({ isDarkMode, posts, viewer }: SocialFeedProps) {
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>(() => decoratePosts(posts));
  const [likedPosts, setLikedPosts] = useState<string[]>([]);
  const [likedStories, setLikedStories] = useState<number[]>([]);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number | null>(null);
  const [storyProgress, setStoryProgress] = useState(0);
  const [storyMessage, setStoryMessage] = useState('');
  const [storyFeedback, setStoryFeedback] = useState<string | null>(null);
  const [composerText, setComposerText] = useState('');
  const [composerMode, setComposerMode] = useState<ComposerMode | null>(null);
  const [feedFeedback, setFeedFeedback] = useState<string | null>(null);
  const [expandedCommentsPostId, setExpandedCommentsPostId] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [hasLoadedMore, setHasLoadedMore] = useState(false);
  const [openPostMenuId, setOpenPostMenuId] = useState<string | null>(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const [stories, setStories] = useState<StoryItem[]>(() => [
    { id: 1, user: 'Tu historia', img: viewer.avatar, content: 'https://images.unsplash.com/photo-1558431382-27e303142255?auto=format&fit=crop&w=1080&q=80', isMe: true },
    { id: 2, user: 'Falla Cuba', img: 'https://picsum.photos/seed/falla1/200/300', content: 'https://images.unsplash.com/photo-1599739291060-4578e77dac5d?auto=format&fit=crop&w=1080&q=80', active: true },
    { id: 3, user: 'Pirotecnia', img: 'https://picsum.photos/seed/fire/200/300', content: 'https://images.unsplash.com/photo-1533230393619-bcad81548223?auto=format&fit=crop&w=1080&q=80', active: true },
    { id: 4, user: 'Valencia', img: 'https://picsum.photos/seed/vlc/200/300', content: 'https://images.unsplash.com/photo-1512753360424-7382482666a7?auto=format&fit=crop&w=1080&q=80', active: false },
    { id: 5, user: 'Fallero99', img: 'https://picsum.photos/seed/user/200/300', content: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1080&q=80', active: true },
  ]);

  const showTemporaryFeedback = (
    setFeedback: React.Dispatch<React.SetStateAction<string | null>>,
    message: string | null
  ) => {
    setFeedback(message);

    if (message !== null) {
      window.setTimeout(() => {
        setFeedback((current) => (current === message ? null : current));
      }, 1800);
    }
  };

  const toggleLike = (id: string) => {
    setLikedPosts((prev) => (prev.includes(id) ? prev.filter((postId) => postId !== id) : [...prev, id]));
  };

  const setStoryNotice = (message: string | null) => {
    showTemporaryFeedback(setStoryFeedback, message);
  };

  const setFeedNotice = (message: string | null) => {
    showTemporaryFeedback(setFeedFeedback, message);
  };

  const toggleStoryLike = (storyId: number) => {
    const wasLiked = likedStories.includes(storyId);

    setLikedStories(prev =>
      wasLiked ? prev.filter(id => id !== storyId) : [...prev, storyId]
    );
    setStoryNotice(wasLiked ? 'Me gusta quitado' : 'Te gusta esta historia');
  };

  const nextStory = () => {
    if (selectedStoryIndex === null) {
      return;
    }

    if (selectedStoryIndex < stories.length - 1) {
      openStory(selectedStoryIndex + 1);
      return;
    }

    setSelectedStoryIndex(null);
  };

  const prevStory = () => {
    if (selectedStoryIndex === null) {
      return;
    }

    if (selectedStoryIndex > 0) {
      openStory(selectedStoryIndex - 1);
      return;
    }

    setSelectedStoryIndex(null);
  };

  React.useEffect(() => {
    let intervalId: number | null = null;
    if (selectedStoryIndex !== null) {
      intervalId = window.setInterval(() => {
        setStoryProgress((prev) => {
          if (prev >= 100) {
            nextStory();
            return 0;
          }
          return prev + 1;
        });
      }, 50);
    }
    return () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [selectedStoryIndex]);

  React.useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    if (selectedStoryIndex !== null) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedStoryIndex]);

  React.useEffect(() => {
    setStoryMessage('');
    setStoryFeedback(null);
  }, [selectedStoryIndex]);

  React.useEffect(() => {
    setStories((prev) => prev.map((story, index) => (index === 0 ? { ...story, img: viewer.avatar } : story)));
  }, [viewer.avatar]);

  const activeStory = selectedStoryIndex !== null ? stories[selectedStoryIndex] : null;
  const selectedComposerOption = COMPOSER_OPTIONS.find((option) => option.id === composerMode) ?? null;
  const canPublish = composerText.trim().length > 0 || composerMode !== null;

  const openStory = (storyIndex: number) => {
    setStories((prev) =>
      prev.map((story, index) => (
        index === storyIndex && !story.isMe ? { ...story, active: false } : story
      ))
    );
    setSelectedStoryIndex(storyIndex);
    setStoryProgress(0);
  };

  const deletePost = (postId: string) => {
    setFeedPosts((prev) => prev.filter((post) => post.id !== postId));
    setLikedPosts((prev) => prev.filter((id) => id !== postId));
    setCommentDrafts((prev) => {
      const nextDrafts = { ...prev };
      delete nextDrafts[postId];
      return nextDrafts;
    });
    setExpandedCommentsPostId((current) => (current === postId ? null : current));
    setOpenPostMenuId((current) => (current === postId ? null : current));
    setFeedNotice('Publicación eliminada.');
  };

  const focusComposer = () => {
    window.setTimeout(() => {
      composerRef.current?.focus();
    }, 0);
  };

  const toggleComposerMode = (mode: ComposerMode) => {
    const nextMode = composerMode === mode ? null : mode;
    setComposerMode(nextMode);
    setFeedNotice(nextMode ? COMPOSER_OPTIONS.find((option) => option.id === nextMode)?.helperText ?? null : 'Accion desactivada.');
    focusComposer();
  };

  const appendTagToComposer = (tag: string) => {
    setComposerText((current) => {
      if (current.includes(tag)) {
        return current;
      }

      const prefix = current.trim();
      return prefix ? `${prefix} ${tag}` : tag;
    });

    focusComposer();
    setFeedNotice(`${tag} anadido al texto.`);
  };

  const insertEmoji = (emoji: string) => {
    setComposerText((current) => `${current}${emoji}`);
    focusComposer();
  };

  const publishPost = () => {
    if (!canPublish) {
      return;
    }

    const newPost: FeedPost = {
      id: `local-${Date.now()}`,
      user: viewer.name,
      userImage: viewer.avatar,
      content: buildPostCopy(composerText, composerMode, viewer),
      image: composerMode ? getComposerImage(composerMode) : null,
      likes: 0,
      time: 'Ahora',
      comments: [],
      commentCount: 0,
    };

    setFeedPosts((prev) => [newPost, ...prev]);
    setComposerText('');
    setComposerMode(null);
    setEmojiPickerOpen(false);
    setExpandedCommentsPostId(newPost.id);
    setFeedNotice('Publicacion creada.');
  };

  const publishStory = () => {
    const caption = buildStoryCaption(composerText, composerMode, viewer);
    const image = getComposerImage(composerMode);

    const newStory: StoryItem = {
      id: Date.now(),
      user: 'Tu historia',
      img: viewer.avatar,
      content: image,
      caption,
      createdAt: 'Ahora',
      isMe: true,
      active: true,
    };

    setStories((prev) => [newStory, ...prev.filter((story) => !story.isMe)]);
    setComposerText('');
    setComposerMode(null);
    setEmojiPickerOpen(false);
    setSelectedStoryIndex(0);
    setStoryProgress(0);
    setFeedNotice('Historia creada.');
  };

  const toggleComments = (postId: string) => {
    setExpandedCommentsPostId((current) => (current === postId ? null : postId));
  };

  const submitComment = (postId: string) => {
    const draft = commentDrafts[postId]?.trim() ?? '';

    if (!draft) {
      return;
    }

    const newComment: FeedComment = {
      id: `${postId}-comment-${Date.now()}`,
      user: viewer.name,
      userImage: viewer.avatar,
      content: draft,
      time: 'Ahora',
    };

    setFeedPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? { ...post, comments: [newComment, ...post.comments], commentCount: post.commentCount + 1 }
          : post
      )
    );

    setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
    setExpandedCommentsPostId(postId);
    setFeedNotice('Comentario publicado.');
  };

  const loadMorePosts = () => {
    if (hasLoadedMore) {
      setFeedNotice('No hay mas momentos por ahora.');
      return;
    }

    setFeedPosts((prev) => [...prev, ...decoratePosts(EXTRA_POSTS)]);
    setHasLoadedMore(true);
    setFeedNotice('Se han cargado mas publicaciones.');
  };

  const handleSharePost = async (post: FeedPost) => {
    const shareUrl =
      typeof window !== 'undefined' ? `${window.location.href.split('#')[0]}#${post.id}` : (post.image ?? '#');

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Publicacion de ${post.user}`,
          text: post.content,
          url: shareUrl,
        });
        setFeedNotice('Publicacion compartida.');
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${post.content}\n${shareUrl}`);
        setFeedNotice('Enlace copiado.');
        return;
      }

      setFeedNotice('La publicacion esta lista para compartir.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      setFeedNotice('No se pudo compartir.');
    }
  };

  const handleStorySend = async () => {
    if (!activeStory) {
      return;
    }

    const reply = storyMessage.trim();

    if (reply !== '') {
      setStoryMessage('');
      setStoryNotice(`Mensaje enviado a ${activeStory.user}`);
      return;
    }

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Historia de ${activeStory.user}`,
          text: `Mira esta historia de ${activeStory.user}`,
          url: activeStory.content,
        });
        setStoryNotice('Historia compartida');
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(activeStory.content);
        setStoryNotice('Enlace copiado');
        return;
      }

      setStoryNotice('Historia lista para compartir');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      setStoryNotice('No se pudo compartir');
    }
  };

  const storyOverlay =
    activeStory && typeof document !== 'undefined'
      ? createPortal(
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 z-[99999] isolate overflow-hidden bg-[rgba(248,250,252,0.6)] backdrop-blur-[20px] flex items-center justify-center p-4 md:p-8"
            >
              <div className="relative w-full max-w-md h-full md:h-[92vh] md:max-h-[880px] md:rounded-[3rem] overflow-hidden bg-zinc-950 shadow-[0_40px_120px_rgba(15,23,42,0.22)] border border-white/35">
                <div className="absolute top-4 left-4 right-4 z-20 flex gap-1.5">
                  {stories.map((_, idx) => (
                    <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white transition-all duration-50"
                        style={{
                          width: idx === selectedStoryIndex ? `${storyProgress}%` : idx < selectedStoryIndex ? '100%' : '0%',
                        }}
                      />
                    </div>
                  ))}
                </div>

                <div className="absolute top-8 left-4 right-4 z-20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={activeStory.img} className="w-10 h-10 rounded-xl border-2 border-brand" />
                    <div>
                      <p className="text-sm font-black text-white tracking-tight">{activeStory.user}</p>
                      <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest">{activeStory.createdAt ?? 'Hace 2h'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedStoryIndex(null)}
                    className="w-10 h-10 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/40 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <img
                  src={activeStory.content}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />

                <div className="pointer-events-none absolute inset-x-4 bottom-28 z-20 rounded-[1.6rem] border border-white/18 bg-black/30 px-4 py-3 text-white shadow-[0_20px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/62">Momento fallero</p>
                  <p className="mt-1 text-lg font-black leading-tight tracking-tight">{activeStory.caption ?? `Historia de ${activeStory.user}`}</p>
                </div>

                <div className="absolute inset-0 z-10 flex">
                  <div className="flex-1 cursor-pointer" onClick={prevStory} />
                  <div className="flex-1 cursor-pointer" onClick={nextStory} />
                </div>

                <form
                  className="absolute bottom-8 left-4 right-4 z-20 flex items-center gap-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleStorySend();
                  }}
                >
                  <label className="flex-1 bg-white/22 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-3">
                    <input
                      value={storyMessage}
                      onChange={(event) => setStoryMessage(event.target.value)}
                      placeholder="Enviar mensaje..."
                      className="w-full bg-transparent text-xs font-medium text-white placeholder:text-white/70 outline-none"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => toggleStoryLike(activeStory.id)}
                    className={cn(
                      "w-12 h-12 rounded-2xl backdrop-blur-md border flex items-center justify-center transition-all",
                      likedStories.includes(activeStory.id)
                        ? "bg-brand border-brand text-white shadow-[0_16px_36px_rgba(255,99,33,0.45)]"
                        : "bg-white/18 border-white/20 text-white hover:bg-white/26"
                    )}
                  >
                    <Heart className={cn("w-6 h-6", likedStories.includes(activeStory.id) && "fill-current")} />
                  </button>
                  <button
                    type="submit"
                    className="w-12 h-12 rounded-2xl bg-white/18 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/26 transition-all"
                  >
                    <Send className="w-6 h-6" />
                  </button>
                </form>

                <AnimatePresence>
                  {storyFeedback && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 12 }}
                      className="absolute bottom-28 left-1/2 z-20 -translate-x-1/2 rounded-full bg-white/88 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-700 shadow-lg"
                    >
                      {storyFeedback}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="hidden md:block">
                  <button
                    onClick={prevStory}
                    className="absolute left-[-80px] top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-all"
                  >
                    <ChevronLeft className="w-8 h-8" />
                  </button>
                  <button
                    onClick={nextStory}
                    className="absolute right-[-80px] top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-all"
                  >
                    <ChevronRight className="w-8 h-8" />
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>,
          document.body
        )
      : null;

  return (
    <section className="space-y-8">
      <AnimatePresence>
        {feedFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className={cn(
              'sticky top-4 z-40 rounded-[1.25rem] border px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] shadow-lg',
              isDarkMode ? 'border-white/10 bg-black/70 text-white backdrop-blur-xl' : 'border-white bg-white/92 text-slate-700 backdrop-blur-xl'
            )}
          >
            {feedFeedback}
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={cn(
          'rounded-[2rem] border px-5 py-4',
          isDarkMode ? 'border-white/10 bg-white/5' : 'border-gray-100 bg-white shadow-sm'
        )}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Comunidad</p>
            <h2 className="mt-1 text-[1.35rem] font-black tracking-tight">Feed social</h2>
            <p className="mt-2 text-sm font-bold leading-5 opacity-60">
              Historias arriba, conversacion en el centro y el contexto en el lateral.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span
              className={cn(
                'rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em]',
                isDarkMode ? 'bg-white/8 text-white/72' : 'bg-slate-100 text-slate-600'
              )}
            >
              {viewer.handle}
            </span>
            <span
              className={cn(
                'rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em]',
                isDarkMode ? 'bg-brand/14 text-brand' : 'bg-brand/10 text-brand'
              )}
            >
              {viewer.location}
            </span>
          </div>
        </div>
      </div>

      {/* Stories / Live Moments */}
      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 -mx-2 px-2">
        {stories.map((story, index) => (
          <motion.button 
            key={story.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => openStory(index)}
            className="flex flex-col items-center gap-2 flex-shrink-0"
          >
            <div className={cn(
              "relative w-16 h-16 rounded-2xl p-0.5 transition-all duration-500",
              story.active ? "bg-gradient-to-tr from-brand to-yellow-400" : "bg-gray-500/20",
              story.isMe && "bg-transparent"
            )}>
              <div className={cn(
                "w-full h-full rounded-[0.9rem] overflow-hidden border-2",
                isDarkMode ? "border-black" : "border-white"
              )}>
                <img src={story.img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              {story.isMe && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-brand rounded-full border-2 border-black flex items-center justify-center text-white shadow-lg">
                  <Plus className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
            <span className="text-[9px] font-black opacity-60 uppercase tracking-tighter truncate w-16 text-center">
              {story.user}
            </span>
          </motion.button>
        ))}
      </div>

      {/* Create Post Area */}
      <div className={cn(
        "p-5 rounded-[2rem] border transition-all",
        isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-gray-100 shadow-sm"
      )}>
        <div className="flex gap-4 mb-4">
          <img src={viewer.avatar} alt={viewer.name} className="w-10 h-10 rounded-xl object-cover" />
          <div className="flex-1 space-y-3">
            <textarea
              ref={composerRef}
              value={composerText}
              onChange={(event) => setComposerText(event.target.value)}
              rows={3}
              maxLength={240}
              placeholder="Qué está pasando en tu Falla?"
              className={cn(
                "min-h-[88px] w-full resize-none rounded-2xl border px-4 py-3 text-sm font-medium outline-none transition-colors",
                isDarkMode
                  ? "border-white/10 bg-white/5 text-white placeholder:text-white/35"
                  : "border-gray-100 bg-gray-50 text-slate-700 placeholder:text-gray-400"
              )}
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] opacity-45">
                {selectedComposerOption ? selectedComposerOption.helperText : 'Escribe algo o activa una opción para publicar.'}
              </p>
              <span className="text-[10px] font-black opacity-35">{composerText.trim().length}/240</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-white/5">
          <div className="flex flex-wrap gap-2">
            {COMPOSER_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isActive = composerMode === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggleComposerMode(option.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2 text-[10px] font-black transition-all",
                    isActive ? option.activeClassName : "opacity-60 hover:opacity-100"
                  )}
                >
                  <Icon className={cn("w-4 h-4", option.iconClassName)} />
                  {option.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setEmojiPickerOpen((current) => !current)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 text-[10px] font-black transition-all",
                emojiPickerOpen ? "bg-amber-400/15 text-amber-600" : "opacity-60 hover:opacity-100"
              )}
            >
              <Smile className="w-4 h-4 text-amber-500" />
              EMOJI
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={publishStory}
              disabled={!canPublish}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black shadow-lg transition-all",
                canPublish
                  ? isDarkMode ? "bg-white text-slate-950 shadow-white/10 hover:scale-[1.02]" : "bg-slate-950 text-white shadow-slate-950/20 hover:scale-[1.02]"
                  : "cursor-not-allowed bg-slate-400/35 text-white shadow-none"
              )}
            >
              HISTORIA
            </button>
            <button
              type="button"
              onClick={publishPost}
              disabled={!canPublish}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black text-white shadow-lg transition-all",
                canPublish ? "bg-brand shadow-brand/20 hover:scale-[1.02]" : "cursor-not-allowed bg-brand/45 shadow-none"
              )}
            >
              PUBLICAR
            </button>
          </div>
        </div>
        <AnimatePresence>
          {emojiPickerOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className={cn(
                "mt-3 flex flex-wrap gap-2 rounded-2xl border p-3",
                isDarkMode ? "border-white/10 bg-white/5" : "border-gray-100 bg-[#fff8f1]"
              )}
            >
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => insertEmoji(emoji)}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl text-lg transition-colors",
                    isDarkMode ? "bg-white/5 hover:bg-white/10" : "bg-white hover:bg-orange-50"
                  )}
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Trending Tags */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {TRENDING_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => appendTagToComposer(tag)}
            className={cn(
              "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all whitespace-nowrap",
              isDarkMode ? "bg-white/5 border-white/10 text-white/60 hover:bg-white/10" : "bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200"
            )}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Feed Posts */}
      <div className="space-y-6">
        {feedPosts.map((post) => {
          const isExpanded = expandedCommentsPostId === post.id;
          const visibleComments = isExpanded ? post.comments.slice(0, 3) : post.comments.slice(0, 1);
          const isRemovablePost = post.id.startsWith('local-');

          return (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={cn(
              "rounded-[2.5rem] overflow-hidden border transition-all duration-500 group",
              isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-gray-100 shadow-sm"
            )}
          >
            {/* Post Header */}
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img src={post.userImage} alt={post.user} className="w-10 h-10 rounded-xl object-cover border border-brand/20" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-[3px] border-black" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-black tracking-tight">{post.user}</p>
                    <Star className="w-2.5 h-2.5 text-brand fill-current" />
                  </div>
                  <p className="text-[8px] font-bold uppercase tracking-widest opacity-40">{post.time}</p>
                </div>
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenPostMenuId((current) => (current === post.id ? null : post.id))}
                  className="p-2 opacity-40 hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                <AnimatePresence>
                  {openPostMenuId === post.id && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className={cn(
                        "absolute right-0 top-10 z-20 min-w-[210px] rounded-2xl border p-2 shadow-2xl",
                        isDarkMode ? "border-white/10 bg-[#0f1115] text-white" : "border-gray-100 bg-white text-slate-700"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setOpenPostMenuId(null);
                          void handleSharePost(post);
                        }}
                        className="w-full rounded-xl px-3 py-2 text-left text-[11px] font-black uppercase tracking-[0.14em] transition-colors hover:bg-black/5"
                      >
                        Compartir publicación
                      </button>
                      {isRemovablePost ? (
                        <button
                          type="button"
                          onClick={() => deletePost(post.id)}
                          className="w-full rounded-xl px-3 py-2 text-left text-[11px] font-black uppercase tracking-[0.14em] text-red-500 transition-colors hover:bg-red-50"
                        >
                          Borrar publicación
                        </button>
                      ) : (
                        <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] opacity-45">
                          Solo puedes borrar las publicaciones que subes tú.
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Post Content */}
            <div className="px-5 pb-5">
              {post.image ? (
                <>
                  <p className="text-xs font-medium leading-relaxed mb-4 opacity-80">{post.content}</p>

                  <div className="relative aspect-square rounded-[1.5rem] overflow-hidden shadow-xl group-hover:shadow-brand/5 transition-all duration-700">
                    <img
                      src={post.image}
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />

                    <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md border border-white/20 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                      <Flame className="w-2.5 h-2.5 text-brand" />
                      <span className="text-[8px] font-black text-white uppercase tracking-tighter">Top</span>
                    </div>
                  </div>
                </>
              ) : (
                <div
                  className={cn(
                    "rounded-[1.5rem] border px-4 py-4",
                    isDarkMode ? "border-white/10 bg-white/5" : "border-orange-100 bg-[#fff8f1]"
                  )}
                >
                  <p className="text-sm font-medium leading-relaxed opacity-85">{post.content}</p>
                </div>
              )}

              {/* Post Actions */}
              <div className="mt-5 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <button
                    type="button"
                    onClick={() => toggleLike(post.id)}
                    className="flex items-center gap-2 group/btn"
                  >
                    <motion.div 
                      animate={likedPosts.includes(post.id) ? { scale: [1, 1.4, 1] } : {}}
                      className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
                        likedPosts.includes(post.id) ? "bg-red-500/20 text-red-500" : "bg-gray-500/10 text-gray-400"
                      )}
                    >
                      <Heart className={cn("w-4 h-4", likedPosts.includes(post.id) && "fill-current")} />
                    </motion.div>
                    <span className="text-[10px] font-black">{likedPosts.includes(post.id) ? post.likes + 1 : post.likes}</span>
                  </button>
                  
                  <button type="button" onClick={() => toggleComments(post.id)} className="flex items-center gap-2 group/btn">
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover/btn:scale-110",
                      isExpanded ? "bg-brand text-white" : "bg-brand/10 text-brand"
                    )}>
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-black">{post.commentCount}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => void handleSharePost(post)}
                  className="w-9 h-9 rounded-xl bg-gray-500/10 flex items-center justify-center opacity-40 hover:opacity-100 hover:bg-gray-500/20 transition-all"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>

              {/* Comments Preview */}
              <div className="mt-5 pt-4 border-t border-white/5 space-y-3">
                {visibleComments.length > 0 ? (
                  visibleComments.map((comment) => (
                    <div key={comment.id} className="flex items-start gap-2">
                      <img src={comment.userImage} alt={comment.user} className="w-6 h-6 rounded-lg object-cover" />
                      <div className={cn("flex-1 rounded-xl p-2.5", isDarkMode ? "bg-white/5" : "bg-gray-50")}>
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[9px] font-black mb-0.5">{comment.user}</p>
                          <span className="text-[8px] font-bold uppercase tracking-widest opacity-35">{comment.time}</span>
                        </div>
                        <p className="text-[10px] opacity-70 leading-tight">{comment.content}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={cn(
                    "rounded-xl border border-dashed px-4 py-3 text-[10px] font-bold uppercase tracking-widest opacity-45",
                    isDarkMode ? "border-white/10" : "border-gray-200"
                  )}>
                    Aún no hay comentarios. Sé el primero en escribir.
                  </div>
                )}
                <div className="flex items-center gap-2 px-1">
                  <div className="flex -space-x-2">
                    {[1,2].map((i) => (
                      <img key={i} src={`https://i.pravatar.cc/100?u=${i+20}`} className="w-4 h-4 rounded-full border border-black" />
                    ))}
                  </div>
                  <p className="text-[8px] font-bold opacity-40 uppercase tracking-widest">
                    {isExpanded ? `Mostrando ${visibleComments.length} de ${post.commentCount} comentarios` : `Ver los ${post.commentCount} comentarios...`}
                  </p>
                </div>
                {isExpanded && (
                  <form
                    className="flex items-center gap-3 pt-1"
                    onSubmit={(event) => {
                      event.preventDefault();
                      submitComment(post.id);
                    }}
                  >
                    <img src={viewer.avatar} alt={viewer.name} className="w-8 h-8 rounded-xl object-cover" />
                    <input
                      value={commentDrafts[post.id] ?? ''}
                      onChange={(event) => setCommentDrafts((prev) => ({ ...prev, [post.id]: event.target.value }))}
                      placeholder={`Comentar como ${viewer.name}`}
                      className={cn(
                        "flex-1 rounded-xl border px-3 py-2 text-[11px] font-medium outline-none transition-colors",
                        isDarkMode
                          ? "border-white/10 bg-white/5 text-white placeholder:text-white/35"
                          : "border-gray-100 bg-gray-50 text-slate-700 placeholder:text-gray-400"
                      )}
                    />
                    <button
                      type="submit"
                      disabled={!commentDrafts[post.id]?.trim()}
                      className={cn(
                        "rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all",
                        commentDrafts[post.id]?.trim()
                          ? "bg-brand text-white shadow-lg shadow-brand/20"
                          : "cursor-not-allowed bg-brand/45 text-white"
                      )}
                    >
                      Enviar
                    </button>
                  </form>
                )}
              </div>
            </div>
          </motion.div>
        );})}
      </div>

      {/* Load More */}
      <button
        type="button"
        onClick={loadMorePosts}
        className={cn(
          "w-full py-5 rounded-[1.5rem] border text-[10px] font-black uppercase tracking-[0.2em] transition-all",
          isDarkMode ? "bg-white/5 border-white/10 text-white/40 hover:bg-white/10" : "bg-gray-50 border-gray-100 text-gray-400 hover:bg-gray-100"
        )}
      >
        {hasLoadedMore ? 'No hay más momentos' : 'Cargar más momentos'}
      </button>

      {/* Story Viewer Modal */}
      {storyOverlay}
    </section>
  );
}
