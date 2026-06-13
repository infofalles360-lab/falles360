import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowLeft, ArrowRight, ExternalLink, Flame, Loader2, Newspaper, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import "./index.css";
import { registerServiceWorker } from "./pwa";

type NewsItem = {
  id: number;
  title: string;
  excerpt: string;
  url: string;
  imageUrl: string | null;
  category: string;
  author: string;
  publishedAt: string | null;
  landingPublishedAt: string | null;
  featured: boolean;
};

type NewsStatus = "loading" | "ready" | "error";

function newsEndpoint() {
  if (typeof window !== "undefined" && window.location.pathname.includes("/dist/")) {
    return "../api/news.php";
  }

  return "./api/news.php";
}

function detailHref(id: number) {
  return `./noticia.html?id=${encodeURIComponent(String(id))}`;
}

function formatNewsDate(value: string | null) {
  if (!value) {
    return "Actualidad fallera";
  }

  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return "Actualidad fallera";
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function splitSentences(text: string) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function buildNewsTake(item: NewsItem) {
  const sentences = splitSentences(item.excerpt);
  const category = item.category || "Actualidad fallera";

  return {
    summary: sentences[0] || item.excerpt || "Una noticia fallera seleccionada para seguir la actualidad sin perder contexto.",
    points: [
      `${category}: noticia seleccionada para el seguimiento fallero.`,
      sentences[1] || "Resumen breve pensado para entender lo importante sin copiar el texto original.",
      "Puedes abrir la lectura completa de Falles360 o ir a la fuente original cuando quieras ampliar.",
    ],
  };
}

function normalizeNewsItem(item: Partial<NewsItem>): NewsItem {
  return {
    id: Number(item.id ?? 0),
    title: typeof item.title === "string" ? item.title : "",
    excerpt: typeof item.excerpt === "string" ? item.excerpt : "",
    url: typeof item.url === "string" ? item.url : "",
    imageUrl: typeof item.imageUrl === "string" && item.imageUrl.trim() ? item.imageUrl : null,
    category: typeof item.category === "string" ? item.category : "",
    author: typeof item.author === "string" ? item.author : "",
    publishedAt: typeof item.publishedAt === "string" ? item.publishedAt : null,
    landingPublishedAt: typeof item.landingPublishedAt === "string" ? item.landingPublishedAt : null,
    featured: Boolean(item.featured),
  };
}

function NewsCard({
  item,
  index,
  selected,
  featured = false,
  onSelect,
}: {
  item: NewsItem;
  index: number;
  selected: boolean;
  featured?: boolean;
  onSelect: () => void;
}) {
  if (featured) {
    return (
      <article className={`group overflow-hidden rounded-[1.7rem] border bg-white/[0.06] shadow-[0_34px_100px_-48px_rgba(0,0,0,0.75)] transition ${selected ? "border-[#f05a28]/70" : "border-white/10 hover:border-white/20"}`}>
        <button type="button" onClick={onSelect} className="block w-full text-left">
          <div className="relative min-h-[360px] overflow-hidden bg-[#2a160d] sm:min-h-[520px]">
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-82 transition duration-500 group-hover:scale-[1.03]"
                loading="lazy"
              />
            ) : null}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(26,17,10,0.08),rgba(26,17,10,0.92))]" />
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-9">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-[#f05a28] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                  Destacada
                </span>
                <span className="rounded-full bg-white/14 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/78">
                  {item.category || "Cendra Digital"}
                </span>
              </div>
              <h2 className="mt-4 max-w-4xl font-display text-[clamp(2.6rem,5vw,5.4rem)] leading-[0.9] tracking-[-0.04em]">
                {item.title}
              </h2>
              <p className="mt-4 max-w-2xl text-sm font-bold leading-7 text-white/72 sm:text-base">
                {item.excerpt}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3 text-xs font-black uppercase tracking-[0.16em] text-white/54">
                <span>{formatNewsDate(item.publishedAt)}</span>
                <span className="h-1 w-1 rounded-full bg-[#ff8b5e]" />
                <span>Pulsar para ver lectura</span>
                <ArrowRight className="h-3.5 w-3.5 text-[#ff8b5e]" />
              </div>
            </div>
          </div>
        </button>
      </article>
    );
  }

  return (
    <article className={`group rounded-[1.35rem] border bg-white/[0.06] p-5 transition hover:-translate-y-0.5 hover:bg-white/[0.09] ${selected ? "border-[#f05a28]/70" : "border-white/10"}`}>
      <button type="button" onClick={onSelect} className="grid w-full gap-4 text-left sm:grid-cols-[148px_1fr] lg:grid-cols-[120px_1fr]">
        <div className="relative aspect-[1.35] overflow-hidden rounded-[1rem] bg-[#2a160d]">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt="" className="h-full w-full object-cover opacity-82 transition duration-500 group-hover:scale-[1.05]" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[#ff8b5e]">
              <Newspaper className="h-7 w-7" />
            </div>
          )}
          <span className="absolute left-2 top-2 rounded-full bg-[#f05a28] px-2 py-1 text-[9px] font-black text-white">
            {String(index).padStart(2, "0")}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ffb08f]">
            {item.category || "Actualidad"} · {formatNewsDate(item.publishedAt)}
          </p>
          <h2 className="mt-2 text-lg font-black leading-tight">
            {item.title}
          </h2>
          <p className="mt-2 line-clamp-2 text-sm font-bold leading-6 text-white/58">
            {item.excerpt}
          </p>
        </div>
      </button>
    </article>
  );
}

function NewsPreview({ item }: { item: NewsItem }) {
  const take = buildNewsTake(item);

  return (
    <aside className="xl:sticky xl:top-24">
      <AnimatePresence mode="wait">
        <motion.div
          key={item.id}
          initial={{ opacity: 0, x: 42, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 24, scale: 0.98 }}
          transition={{ duration: 0.32, ease: "easeOut" }}
          className="overflow-hidden rounded-[1.8rem] border border-white/10 bg-[#fff8f4] text-[#1a110a] shadow-[0_34px_120px_-48px_rgba(0,0,0,0.86)]"
        >
          <div className="relative min-h-[260px] overflow-hidden bg-[#2a160d]">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-82" loading="lazy" />
            ) : null}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(26,17,10,0.08),rgba(26,17,10,0.9))]" />
            <div className="absolute inset-x-0 bottom-0 p-6">
              <span className="inline-flex rounded-full bg-[#f05a28] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                Lectura Falles360
              </span>
              <h2 className="mt-4 font-display text-[clamp(2.5rem,4vw,4.2rem)] leading-[0.88] tracking-[-0.04em] text-white">
                {item.title}
              </h2>
            </div>
          </div>

          <div className="p-6 sm:p-7">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#c03e15]">
              Resumen propio
            </p>
            <p className="mt-3 text-base font-black leading-7 text-[#1a110a]">
              {take.summary}
            </p>

            <div className="mt-5 space-y-3">
              {take.points.map((point) => (
                <div key={point} className="flex gap-3 rounded-[1rem] border border-[#f05a2818] bg-white px-4 py-3 shadow-[0_14px_30px_-28px_rgba(26,17,10,0.45)]">
                  <Sparkles className="mt-1 h-4 w-4 shrink-0 text-[#f05a28]" />
                  <p className="text-sm font-bold leading-6 text-[#6b5a50]">{point}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-[1.15rem] bg-[#1a110a] p-4 text-white">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ffb08f]">Nota editorial</p>
              <p className="mt-2 text-sm font-bold leading-6 text-white/66">
                No copiamos el articulo completo. Mostramos una interpretacion breve de Falles360 y mantenemos el acceso a la fuente original.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href={detailHref(item.id)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#f05a28] px-5 py-3 text-sm font-black text-white transition hover:bg-[#ff8b5e]"
              >
                Ver ficha completa
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[#00000014] bg-white px-5 py-3 text-sm font-black text-[#1a110a] transition hover:bg-[#fff1ea]"
              >
                Fuente
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </aside>
  );
}

function NewsPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [status, setStatus] = useState<NewsStatus>("loading");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const landingHref =
    typeof window !== "undefined" && window.location.pathname.includes("/dist/")
      ? "./index.html"
      : "./";

  useEffect(() => {
    let cancelled = false;

    fetch(`${newsEndpoint()}?limit=12`, { credentials: "same-origin" })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("No se pudieron cargar las noticias.")))
      .then((payload) => {
        if (cancelled) {
          return;
        }

        const nextItems = Array.isArray(payload?.items)
          ? payload.items.map(normalizeNewsItem).filter((item: NewsItem) => item.title && item.url)
          : [];

        setItems(nextItems);
        setSelectedId((current) => current ?? nextItems[0]?.id ?? null);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const [featured, ...rest] = items;
  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? featured ?? null,
    [featured, items, selectedId],
  );

  return (
    <div className="min-h-dvh bg-[#1a110a] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_14%_10%,rgba(240,90,40,0.34),transparent_30%),radial-gradient(circle_at_92%_78%,rgba(255,211,42,0.13),transparent_34%)]" />

      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#1a110a]/88 px-5 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[92rem] items-center justify-between gap-4">
          <a href={landingHref} className="inline-flex items-center gap-2 text-sm font-black text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f05a28] text-white">
              <Flame className="h-5 w-5" />
            </span>
            Falles360
          </a>
          <a
            href={landingHref}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white/78 transition hover:bg-white/15"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </a>
        </div>
      </header>

      <main className="relative px-6 pb-24 pt-16">
        <section className="mx-auto max-w-[92rem]">
          <div className="max-w-5xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#f05a2826] bg-[#fff1ea] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-[#c03e15]">
              <Newspaper className="h-4 w-4" />
              Noticias Falles360
            </span>
            <h1 className="mt-6 font-display text-[clamp(4rem,10vw,8.8rem)] leading-[0.86] tracking-[-0.05em]">
              Actualidad fallera,
              <span className="block text-[#ff8b5e]">a nuestra manera.</span>
            </h1>
            <p className="mt-6 max-w-3xl text-base font-bold leading-8 text-white/64 sm:text-lg">
              Seleccionamos las noticias sincronizadas desde Cendra y las presentamos con un formato propio de Falles360: mas visual, directo y pensado para descubrir lo importante rapido.
            </p>
          </div>

          {status === "loading" ? (
            <div className="mt-14 flex min-h-[260px] items-center justify-center rounded-[1.7rem] border border-white/10 bg-white/[0.06]">
              <Loader2 className="h-8 w-8 animate-spin text-[#ff8b5e]" />
            </div>
          ) : null}

          {status === "error" ? (
            <div className="mt-14 rounded-[1.7rem] border border-[#f05a2840] bg-[#f05a28]/10 p-8">
              <h2 className="text-2xl font-black">No se pudieron cargar las noticias.</h2>
              <p className="mt-3 max-w-2xl text-sm font-bold leading-7 text-white/64">
                Revisa que `api/news.php` este accesible y que la base de datos tenga las columnas de publicacion en landing.
              </p>
            </div>
          ) : null}

          {status === "ready" && items.length === 0 ? (
            <div className="mt-14 overflow-hidden rounded-[1.7rem] border border-white/10 bg-white/[0.06] p-8 shadow-[0_34px_100px_-48px_rgba(0,0,0,0.75)] sm:p-10">
              <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
                <div className="flex aspect-[1.25] items-center justify-center rounded-[1.35rem] border border-white/10 bg-[#2a160d] text-[#ff8b5e]">
                  <Newspaper className="h-16 w-16" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ffb08f]">
                    Noticias en preparacion
                  </p>
                  <h2 className="mt-3 font-display text-[clamp(2.4rem,5vw,4.8rem)] leading-[0.9] tracking-[-0.04em]">
                    Aqui apareceran las noticias que publiques desde Cendra.
                  </h2>
                  <p className="mt-4 max-w-2xl text-sm font-bold leading-7 text-white/64 sm:text-base">
                    Entra al dashboard, busca una noticia sincronizada y pulsa `Publicar en landing`.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {status === "ready" && featured && selectedItem ? (
            <div className="mt-14 grid gap-5 xl:grid-cols-[minmax(0,0.96fr)_minmax(420px,0.9fr)] xl:items-start">
              <div className="space-y-4">
                <NewsCard item={featured} index={1} selected={selectedItem.id === featured.id} featured onSelect={() => setSelectedId(featured.id)} />
                {rest.map((item, index) => (
                  <NewsCard
                    key={item.id}
                    item={item}
                    index={index + 2}
                    selected={selectedItem.id === item.id}
                    onSelect={() => setSelectedId(item.id)}
                  />
                ))}
              </div>
              <NewsPreview item={selectedItem} />
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}

registerServiceWorker();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <NewsPage />
  </StrictMode>,
);
