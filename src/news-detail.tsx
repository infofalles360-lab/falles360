import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowLeft, ExternalLink, Flame, Loader2, Newspaper, Sparkles } from "lucide-react";
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

type DetailStatus = "loading" | "ready" | "error";

function apiEndpoint(id: string) {
  const base = typeof window !== "undefined" && window.location.pathname.includes("/dist/")
    ? "../api/news.php"
    : "./api/news.php";

  return `${base}?id=${encodeURIComponent(id)}`;
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
    month: "long",
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

function buildFalles360Take(item: NewsItem) {
  const sentences = splitSentences(item.excerpt);
  const first = sentences[0] || item.excerpt || "Una noticia fallera seleccionada para seguir la actualidad sin perder contexto.";
  const second = sentences[1] || "La clave esta en entender como afecta al calendario, a las comisiones o a la experiencia de quienes viven las Fallas.";
  const category = item.category || "actualidad fallera";

  return {
    summary: first,
    bullets: [
      `Tema principal: ${category.toLowerCase()}.`,
      second,
      "Falles360 la destaca porque puede ayudar a planificar mejor rutas, agenda o seguimiento fallero.",
    ],
    context: `Esta ficha es una lectura rapida creada para Falles360 a partir de la noticia sincronizada. Para consultar la informacion completa, fechas exactas y texto original, abre la fuente enlazada.`,
  };
}

function NewsDetailPage() {
  const [item, setItem] = useState<NewsItem | null>(null);
  const [status, setStatus] = useState<DetailStatus>("loading");

  const landingHref =
    typeof window !== "undefined" && window.location.pathname.includes("/dist/")
      ? "./index.html"
      : "./";
  const newsHref = "./noticias.html";
  const articleId = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("id") || ""
    : "";

  useEffect(() => {
    if (!articleId) {
      setStatus("error");
      return;
    }

    let cancelled = false;
    fetch(apiEndpoint(articleId), { credentials: "same-origin" })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("No se pudo cargar la noticia.")))
      .then((payload) => {
        if (cancelled || !payload?.item) {
          return;
        }

        setItem(normalizeNewsItem(payload.item));
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
  }, [articleId]);

  const take = useMemo(() => item ? buildFalles360Take(item) : null, [item]);

  return (
    <div className="min-h-dvh bg-[#1a110a] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_16%_10%,rgba(240,90,40,0.34),transparent_30%),radial-gradient(circle_at_90%_82%,rgba(255,211,42,0.13),transparent_34%)]" />

      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#1a110a]/88 px-5 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[92rem] items-center justify-between gap-4">
          <a href={landingHref} className="inline-flex items-center gap-2 text-sm font-black text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f05a28] text-white">
              <Flame className="h-5 w-5" />
            </span>
            Falles360
          </a>
          <a
            href={newsHref}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white/78 transition hover:bg-white/15"
          >
            <ArrowLeft className="h-4 w-4" />
            Noticias
          </a>
        </div>
      </header>

      <main className="relative px-6 pb-24 pt-12">
        <section className="mx-auto max-w-[92rem]">
          {status === "loading" ? (
            <div className="flex min-h-[420px] items-center justify-center rounded-[1.7rem] border border-white/10 bg-white/[0.06]">
              <Loader2 className="h-8 w-8 animate-spin text-[#ff8b5e]" />
            </div>
          ) : null}

          {status === "error" ? (
            <div className="rounded-[1.7rem] border border-[#f05a2840] bg-[#f05a28]/10 p-8">
              <h1 className="text-2xl font-black">No se pudo cargar esta noticia.</h1>
              <p className="mt-3 max-w-2xl text-sm font-bold leading-7 text-white/64">
                Puede que no exista, que no este publicada en landing o que falte el identificador.
              </p>
            </div>
          ) : null}

          {status === "ready" && item && take ? (
            <article>
              <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-stretch">
                <div className="relative min-h-[460px] overflow-hidden rounded-[1.9rem] border border-white/10 bg-[#2a160d] shadow-[0_34px_100px_-48px_rgba(0,0,0,0.75)]">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-82" />
                  ) : null}
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(26,17,10,0.08),rgba(26,17,10,0.92))]" />
                  <div className="absolute inset-x-0 bottom-0 p-6 sm:p-9">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-[#f05a28] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                        Lectura Falles360
                      </span>
                      <span className="rounded-full bg-white/14 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/78">
                        {item.category || "Cendra Digital"}
                      </span>
                    </div>
                    <h1 className="mt-5 font-display text-[clamp(3rem,6vw,6.2rem)] leading-[0.86] tracking-[-0.05em]">
                      {item.title}
                    </h1>
                    <p className="mt-5 max-w-2xl text-sm font-bold leading-7 text-white/72 sm:text-base">
                      {take.summary}
                    </p>
                  </div>
                </div>

                <aside className="rounded-[1.9rem] border border-white/10 bg-white/[0.07] p-6 shadow-[0_34px_100px_-54px_rgba(0,0,0,0.75)] sm:p-8">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ffb08f]">
                    Lo esencial
                  </p>
                  <div className="mt-5 space-y-4">
                    {take.bullets.map((bullet) => (
                      <div key={bullet} className="flex gap-3 rounded-[1.15rem] border border-white/10 bg-[#1a110a]/36 p-4">
                        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#ff8b5e]" />
                        <p className="text-sm font-bold leading-6 text-white/72">{bullet}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 rounded-[1.25rem] bg-[#fff1ea] p-5 text-[#1a110a]">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c03e15]">
                      Contexto
                    </p>
                    <p className="mt-3 text-sm font-bold leading-7 text-[#6b5a50]">
                      {take.context}
                    </p>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-3 text-xs font-black uppercase tracking-[0.16em] text-white/54">
                    <span>{formatNewsDate(item.publishedAt)}</span>
                    {item.author ? (
                      <>
                        <span className="h-1 w-1 rounded-full bg-[#ff8b5e]" />
                        <span>{item.author}</span>
                      </>
                    ) : null}
                  </div>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#f05a28] px-6 py-4 text-sm font-black text-white shadow-[0_18px_38px_-22px_rgba(240,90,40,0.9)] transition hover:-translate-y-0.5 hover:bg-[#ff8b5e]"
                  >
                    Leer fuente original
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </aside>
              </div>

              <section className="mt-8 rounded-[1.7rem] border border-white/10 bg-white/[0.06] p-6 sm:p-8">
                <div className="flex items-center gap-3">
                  <Newspaper className="h-5 w-5 text-[#ff8b5e]" />
                  <h2 className="text-xl font-black">Nota editorial</h2>
                </div>
                <p className="mt-4 max-w-4xl text-sm font-bold leading-7 text-white/62">
                  Falles360 no reproduce el articulo completo. Esta pagina ofrece una lectura breve, con lenguaje y contexto propio, y conserva el enlace a la fuente para ampliar la informacion.
                </p>
              </section>
            </article>
          ) : null}
        </section>
      </main>
    </div>
  );
}

registerServiceWorker();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <NewsDetailPage />
  </StrictMode>,
);
