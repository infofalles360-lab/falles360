import {
  ArrowLeft,
  ArrowRight,
  Mail,
  Ticket,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

type WaitlistConfig = {
  endpoint: string;
  countEndpoint: string;
  initialCount: number;
  payloadFormat: "json" | "form";
  source: string;
  privacyHref: string;
  landingHref: string;
  successTitle: string;
  successMessage: string;
  successHref: string;
  formHref: string;
};

declare global {
  interface Window {
    FALLES360_WAITLIST?: Partial<WaitlistConfig>;
  }
}

const DEFAULT_CONFIG: WaitlistConfig = {
  endpoint: "",
  countEndpoint: "",
  initialCount: 0,
  payloadFormat: "json",
  source: "whitelist_static",
  privacyHref: "./privacy.html",
  landingHref: "./index.html",
  successTitle: "Ya estas dentro.",
  successMessage: "Te avisaremos antes que nadie cuando abramos el acceso anticipado.",
  successHref: "",
  formHref: "",
};

const heroStats = [
  ["380+", "Monumentos", "Ruta visual por toda Valencia para decidir mejor qué ver primero."],
  ["Gratis", "Acceso invitado", "Prueba la app antes de registrarte y entra sin fricción."],
  ["2027", "Rumbo a marzo", "Agenda, rutas y avisos listos para llegar con todo preparado."],
] as const;

const perks = [
  ["EARLY", "Acceso previo", "Antes del lanzamiento oficial"],
  ["FOUND", "Badge fundador", "Insignia exclusiva en tu perfil"],
  ["ALERT", "Aviso directo", "El primero en cada novedad"],
] as const;

const features = [
  [
    "MAPA",
    "Mapa de calor interactivo",
    "Sabrás qué zonas están más activas y qué fallas merece la pena priorizar en cada momento.",
  ],
  [
    "RUTA",
    "Pasaporte Fallero",
    "Guardas monumentos, desbloqueas insignias y conviertes el recorrido en algo que apetece completar.",
  ],
  [
    "ACTOS",
    "Agenda en vivo",
    "Mascletàs, castillos, ofrendas y actos clave ordenados para que llegues con tiempo y sin improvisar.",
  ],
  [
    "CERCA",
    "Marketplace fallero",
    "Restaurantes, cupones y experiencias útiles justo cuando estás recorriendo una zona concreta.",
  ],
] as const;

const steps = [
  [
    "01",
    "1 minuto",
    "Te apuntas",
    "Dejas tu nombre y tu email. No hay tarjeta, no hay registro largo y no te pedimos nada más.",
  ],
  [
    "02",
    "email directo",
    "Te avisamos",
    "Cuando activemos la entrada prioritaria, recibes el aviso antes que el resto y con acceso directo.",
  ],
  [
    "03",
    "entras primero",
    "Entras primero",
    "Empiezas a guardar rutas, favoritos y progreso con tiempo para llegar a marzo con todo preparado.",
  ],
] as const;

const heroHighlights = [
  "Email directo",
  "Acceso prioritario",
] as const;

const heroNotes = [
  ["Reservas", "Sitio guardado en la lista"],
  ["Avisos", "Te llega el acceso por correo"],
] as const;

function getWaitlistConfig(): WaitlistConfig {
  const path = typeof window !== "undefined" ? window.location.pathname : "";
  const isBuiltFromDist = path.includes("/dist/");
  const localEndpoint = isBuiltFromDist ? "../api/solicitudes.php" : "./api/solicitudes.php";
  const provided = typeof window !== "undefined" ? window.FALLES360_WAITLIST ?? {} : {};

  return {
    ...DEFAULT_CONFIG,
    ...provided,
    endpoint: provided.endpoint || localEndpoint,
    countEndpoint: provided.countEndpoint ?? localEndpoint,
  };
}

function useCountdown() {
  const targetDate = useMemo(() => new Date("2027-03-19T00:00:00+01:00"), []);
  const [countdown, setCountdown] = useState(() => getCountdownParts(targetDate));

  useEffect(() => {
    const tick = () => setCountdown(getCountdownParts(targetDate));
    tick();
    const timerId = window.setInterval(tick, 60000);
    return () => window.clearInterval(timerId);
  }, [targetDate]);

  return countdown;
}

function getCountdownParts(targetDate: Date) {
  const diff = targetDate.getTime() - Date.now();
  if (diff <= 0) {
    return { days: "0", hours: "0", mins: "0" };
  }

  return {
    days: String(Math.floor(diff / 86400000)),
    hours: String(Math.floor((diff % 86400000) / 3600000)),
    mins: String(Math.floor((diff % 3600000) / 60000)),
  };
}

function normalizeEmailInput(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function WaitlistFormCard({
  config,
  count,
  onCountChange,
}: {
  config: WaitlistConfig;
  count: number;
  onCountChange: (nextCount: number) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [humanConfirmed, setHumanConfirmed] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const countdown = useCountdown();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("enviado") === "1") {
      setStatus("success");
      setMessage(config.successMessage);
    }
  }, [config.successMessage]);

  useEffect(() => {
    if (status !== "success") {
      return;
    }

    const timerId = window.setTimeout(() => {
      setStatus("idle");
      setMessage("");
      window.history.replaceState({}, "", window.location.pathname);
    }, 6000);

    return () => window.clearTimeout(timerId);
  }, [status]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedEmail = normalizeEmailInput(email);

    if (trimmedName.length < 2) {
      setStatus("error");
      setMessage("Escribe tu nombre para entrar en la lista.");
      return;
    }

    if (trimmedEmail.length < 6 || !trimmedEmail.includes("@") || !trimmedEmail.includes(".")) {
      setStatus("error");
      setMessage("Escribe un email válido.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setStatus("error");
      setMessage("Escribe un email válido.");
      return;
    }

    if (!humanConfirmed) {
      setStatus("error");
      setMessage("Confirma que eres una persona antes de enviar.");
      return;
    }

    if (!config.endpoint) {
      setStatus("error");
      setMessage("El acceso anticipado no está disponible temporalmente. Inténtalo de nuevo más tarde.");
      return;
    }

    setStatus("sending");
    setMessage("");

    if (config.endpoint.includes("formsubmit.co/")) {
      event.currentTarget.submit();
      window.setTimeout(() => {
        setStatus("success");
        setMessage(config.successMessage);
        onCountChange(count + 1);
      }, 1200);
      return;
    }

    try {
      const payload = {
        name: trimmedName,
        email: trimmedEmail,
        source: config.source,
        _subject: "Nueva solicitud para la whitelist de Falles360",
        _template: "table",
        _honey: website,
        _autoresponse:
          "Gracias por apuntarte a la lista de espera de Falles360. Hemos recibido correctamente tu solicitud y te avisaremos por email antes de abrir el acceso anticipado.",
      };

      const requestInit: RequestInit = {
        method: "POST",
        mode: "cors",
      };

      if (config.payloadFormat === "form") {
        requestInit.headers = {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        };
        requestInit.body = new URLSearchParams(payload).toString();
      } else {
        requestInit.headers = {
          "Content-Type": "application/json",
        };
        requestInit.body = JSON.stringify(payload);
      }

      const response = await fetch(config.endpoint, requestInit);
      const rawText = await response.text();
      const data = rawText
        ? JSON.parse(rawText) as {
            ok?: boolean;
            success?: boolean | string;
            message?: string;
            count?: number;
          }
        : {};

      if (!response.ok || data.ok === false || data.success === false || data.success === "false") {
        throw new Error(data.message || "No se pudo guardar la solicitud.");
      }

      setStatus("success");
      setMessage(config.endpoint.includes("formsubmit.co") ? config.successMessage : data.message || config.successMessage);
      onCountChange(typeof data.count === "number" ? data.count : count + 1);
    } catch (error) {
      setStatus("error");
      if (error instanceof SyntaxError) {
        setMessage("El endpoint respondio, pero no devolvio JSON valido.");
        return;
      }
      setMessage(error instanceof Error ? error.message : "No se pudo guardar la solicitud.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-[34rem]">
      <div className="mb-5 flex flex-col items-center gap-2 text-center sm:mb-7 sm:flex-row sm:justify-center sm:gap-3">
        <div className="flex">
          {["MA", "VI", "GO"].map((label, index) => (
            <span
              key={label}
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[10px] font-black tracking-[0.05em] text-[#1a110a] ${
                index === 0 ? "bg-[#fde8e0]" : index === 1 ? "bg-[#fcd5c6] -ml-2" : "bg-[#fef3cd] -ml-2"
              }`}
            >
              {label}
            </span>
          ))}
        </div>
        <p className="flex items-center gap-2 text-sm font-bold text-[#7a6a60]">
          <span className="h-2 w-2 rounded-full bg-[#f05a28]" />
          Lista de acceso abierta
        </p>
      </div>

      <div className="rounded-[1.35rem] border-2 border-[#f05a2838] bg-white px-4 py-5 shadow-[0_24px_80px_-42px_rgba(240,90,40,0.45)] sm:rounded-[1.6rem] sm:px-8 sm:py-8">
        {status === "success" ? (
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-[#fff1ea] text-[#f05a28]">
              <Ticket className="h-7 w-7" />
            </div>
            <h2 className="mt-5 font-display text-[2.65rem] leading-[0.9] tracking-[-0.04em] text-[#1a110a] sm:text-[3.2rem]">
              {config.successTitle}
            </h2>
            <p className="mx-auto mt-3 max-w-[28rem] text-sm font-bold leading-6 text-[#7a6a60]">
              {message || config.successMessage}
            </p>
          </div>
        ) : (
          <form
            onSubmit={(event) => void handleSubmit(event)}
            action={config.endpoint}
            method="POST"
            target="falles360-submit-frame"
            className="space-y-4"
          >
            <input type="hidden" name="_subject" value="Nueva solicitud para la whitelist de Falles360" />
            <input type="hidden" name="_template" value="table" />
            <input type="hidden" name="_captcha" value="false" />
            <input
              type="hidden"
              name="_autoresponse"
              value="Gracias por apuntarte a la lista de espera de Falles360. Hemos recibido correctamente tu solicitud y te avisaremos por email antes de abrir el acceso anticipado."
            />
            <input type="hidden" name="_next" value={config.successHref} />
            <input type="hidden" name="_url" value={config.formHref} />
            <input type="hidden" name="source" value={config.source} />
            <div className="grid gap-2 rounded-[1.1rem] border border-[#f05a2814] bg-[linear-gradient(135deg,#fff8f4_0%,#fff3eb_100%)] p-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] sm:text-left">
              <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#c03e15] sm:justify-start sm:tracking-[0.18em]">
                <span className="h-2 w-2 rounded-full bg-[#f05a28]" />
                Acceso anticipado real
              </div>
              <p className="text-sm font-bold leading-6 text-[#7a6a60]">
                Al apuntarte guardamos tu sitio y cuando abramos el acceso os llega aviso al correo
                de forma directa.
              </p>
            </div>

            <label className="block">
              <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-[#c03e15]">
                Tu nombre
              </span>
              <div className="flex h-14 items-center gap-3 rounded-[1rem] border border-[#f05a2826] bg-[#fff8f4] px-3 transition focus-within:border-[#f05a28] focus-within:bg-white sm:px-4">
                <UserRound className="h-4.5 w-4.5 shrink-0 text-[#c03e15]" />
                <input
                  name="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  placeholder="Maria Garcia"
                  className="min-w-0 flex-1 bg-transparent text-sm font-bold text-[#1a110a] outline-none placeholder:text-[#d29a84]"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-[#c03e15]">
                Tu email
              </span>
              <div className="flex h-14 items-center gap-3 rounded-[1rem] border border-[#f05a2826] bg-[#fff8f4] px-3 transition focus-within:border-[#f05a28] focus-within:bg-white sm:px-4">
                <Mail className="h-4.5 w-4.5 shrink-0 text-[#c03e15]" />
                <input
                  name="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  type="email"
                  inputMode="email"
                  placeholder="maria@email.com"
                  className="min-w-0 flex-1 bg-transparent text-sm font-bold text-[#1a110a] outline-none placeholder:text-[#d29a84]"
                />
              </div>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-[1rem] border border-[#f05a2826] bg-[#fff8f4] px-4 py-3 transition hover:border-[#f05a2860]">
              <input
                type="checkbox"
                checked={humanConfirmed}
                onChange={(event) => setHumanConfirmed(event.target.checked)}
                required
                className="mt-0.5 h-5 w-5 shrink-0 accent-[#f05a28]"
              />
              <span className="text-left text-xs font-bold leading-5 text-[#7a6a60]">
                Confirmo que soy una persona y quiero apuntarme a la lista.
              </span>
            </label>

            <button
              type="submit"
              disabled={status === "sending" || !humanConfirmed}
              className="w-full rounded-[0.9rem] bg-[#f05a28] px-5 py-4 text-sm font-black uppercase tracking-[0.02em] text-white shadow-[0_16px_36px_-20px_rgba(240,90,40,0.9)] transition hover:-translate-y-0.5 hover:bg-[#ff7642] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {status === "sending" ? "Guardando..." : "Apuntarme a la lista"}
            </button>

            <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
              <label>
                No rellenar
                <input
                  name="_honey"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </label>
            </div>

            {message ? (
              <div className={`rounded-[1rem] px-4 py-3 text-sm font-bold ${status === "error" ? "bg-[#f05a2815] text-[#c03e15]" : "bg-[#2e9e6a14] text-[#237b52]"}`}>
                {message}
              </div>
            ) : null}
          </form>
        )}
        <iframe
          name="falles360-submit-frame"
          title="Envio de solicitud"
          className="hidden"
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {perks.map(([tag, title, copy]) => (
          <div
            key={tag}
            className="rounded-[1.2rem] border border-[#f05a2817] bg-[#fffdfb] px-4 py-4 text-center shadow-[0_18px_36px_-32px_rgba(26,17,10,0.32)]"
          >
            <div className="mx-auto inline-flex rounded-full bg-[#fff1ea] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#f05a28]">
              {tag}
            </div>
            <div className="mt-3 font-display text-[1.35rem] leading-[0.95] tracking-[0.02em] text-[#f05a28]">
              {title}
            </div>
            <p className="mt-2 text-xs font-medium leading-5 text-[#9b8a7e]">{copy}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-[#b0a098]">
          Quedan para Fallas 2027
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:flex sm:justify-center sm:gap-3">
          {[
            [countdown.days, "Dias"],
            [countdown.hours, "Horas"],
            [countdown.mins, "Min"],
          ].map(([value, label]) => (
            <div
              key={label}
              className="min-w-0 rounded-[1rem] border border-[#f05a2822] bg-white px-2 py-3 shadow-[0_18px_36px_-32px_rgba(26,17,10,0.28)] sm:min-w-[74px] sm:px-3"
            >
              <div className="font-display text-[2.2rem] leading-none tracking-[-0.04em] text-[#f05a28]">
                {value}
              </div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#9b8a7e]">
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function WaitlistApp() {
  const config = useMemo(() => getWaitlistConfig(), []);
  const [count, setCount] = useState(config.initialCount);
  const formSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!config.countEndpoint) {
      return;
    }

    let cancelled = false;

    void fetch(config.countEndpoint, { method: "GET", mode: "cors" })
      .then(async (response) => {
        const data = await response.json() as { count?: number };
        if (!cancelled && typeof data.count === "number") {
          setCount(data.count);
        }
      })
      .catch(() => {
        // The page can still work without the count endpoint.
      });

    return () => {
      cancelled = true;
    };
  }, [config.countEndpoint]);

  return (
    <div className="min-h-dvh overflow-x-hidden bg-white text-[#1a110a]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_right,rgba(240,90,40,0.08),transparent_28%),radial-gradient(circle_at_top_left,rgba(240,90,40,0.04),transparent_24%)]" />

      <nav className="fixed inset-x-0 top-0 z-50 border-b border-[#f05a2814] bg-white/90 px-5 py-4 backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <a href={config.landingHref} className="font-display text-[2rem] leading-none tracking-[0.12em] text-[#1a110a]">
            FALLES<span className="text-[#f05a28]">360</span>
          </a>
          <a
            href={config.landingHref}
            className="inline-flex items-center gap-2 text-sm font-bold text-[#7a6a60] transition hover:text-[#f05a28]"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a la landing
          </a>
        </div>
      </nav>

      <main>
        <section
          ref={formSectionRef}
          className="relative flex min-h-screen items-center overflow-hidden bg-[linear-gradient(180deg,#fffaf6_0%,#ffffff_38%,#fff8f2_100%)] px-4 pb-14 pt-24 sm:px-8 sm:pb-16 sm:pt-28"
        >
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(26,17,10,0.04)_1px,transparent_1px),linear-gradient(0deg,rgba(26,17,10,0.04)_1px,transparent_1px)] [background-size:86px_86px]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,#ffffff_0%,rgba(255,255,255,0)_100%)]" />
          <div className="pointer-events-none absolute left-[-8rem] top-[18%] h-64 w-64 rounded-full bg-[#f05a28]/10 blur-3xl" />
          <div className="pointer-events-none absolute right-[-10rem] top-[12%] h-72 w-72 rounded-full bg-[#ffd32a]/14 blur-3xl" />
          <div className="mx-auto w-full max-w-4xl">
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#f05a2833] bg-[#fff1ea] px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-[#c03e15]">
                <span className="h-2 w-2 rounded-full bg-[#f05a28]" />
                Acceso anticipado · Falles 2027
              </div>

              <h1 className="mt-5 max-w-4xl font-display text-[clamp(3rem,12vw,6rem)] leading-[0.9] tracking-[-0.04em] text-[#1a110a] sm:mt-6">
                Falles 2027.
                <br />
                <span className="text-[#f05a28]">Empieza a prepararlas ahora.</span>
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-[#7a6a60] sm:text-lg sm:leading-8">
                Entra antes que nadie al acceso anticipado de Falles360: mapa, agenda, rutas,
                Pasaporte Fallero y negocio local en una sola base.
                <strong className="text-[#1a110a]"> Apúntate ahora y recibe tu acceso prioritario directamente por email.</strong>
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-2.5">
                {heroHighlights.map((item) => (
                  <span
                    key={item}
                    className="inline-flex rounded-full border border-[#1a110a10] bg-white/82 px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#58483f] shadow-[0_10px_22px_rgba(26,17,10,0.05)]"
                  >
                    {item}
                  </span>
                ))}
              </div>

              <div className="mt-6 grid w-full max-w-2xl gap-3 sm:grid-cols-2">
                {heroNotes.map(([label, copy]) => (
                  <div
                    key={label}
                    className="rounded-[1.25rem] border border-[#f05a2814] bg-white/86 px-4 py-4 text-center shadow-[0_18px_34px_-30px_rgba(26,17,10,0.18)] backdrop-blur"
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c03e15]">{label}</p>
                    <p className="mt-2 text-sm font-bold leading-6 text-[#7a6a60]">{copy}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 w-full">
                <WaitlistFormCard config={config} count={count} onCountChange={setCount} />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#f05a28] px-6 py-12 sm:px-8">
          <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
            {heroStats.map(([value, label, copy]) => (
              <div
                key={label}
                className="rounded-[1.5rem] border border-white/20 bg-white/12 px-5 py-5 shadow-[0_18px_34px_rgba(160,49,10,0.14)]"
              >
                <p className="font-display text-5xl leading-none tracking-[-0.04em] text-white">{value}</p>
                <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-white">{label}</p>
                <p className="mt-2 max-w-[24ch] text-sm leading-6 text-white/78">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#1a110a] px-5 py-20 text-white sm:px-8 sm:py-24">
          <div className="pointer-events-none absolute right-[-12rem] top-[10%] h-96 w-96 rounded-full bg-[#f05a28]/15 blur-[100px]" />
          <div className="pointer-events-none absolute bottom-[-12rem] left-[-10rem] h-80 w-80 rounded-full bg-[#ffd32a]/8 blur-[100px]" />
          <div className="relative z-10 mx-auto max-w-5xl">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#f05a28]">
                Lo que vas a tener
              </p>
              <h2 className="mt-4 font-display text-[clamp(3rem,7vw,4.4rem)] leading-[0.92] tracking-[-0.04em]">
                Todo lo que
                <br />
                necesitas para
                <br />
                <span className="text-[#f05a28]">moverte en Fallas.</span>
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-white/72">
                Entras con una base real: mapa para decidir mejor, agenda para no perder actos,
                pasaporte para guardar progreso y ofertas cerca de tu ruta.
              </p>

              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {features.map(([tag, title, copy]) => (
                  <article
                    key={title}
                    className="rounded-[1.4rem] border border-white/12 bg-white/[0.07] p-5 shadow-[0_18px_36px_-32px_rgba(0,0,0,0.5)] backdrop-blur-sm"
                  >
                    <div className="inline-flex rounded-full bg-[#fff1ea] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#f05a28]">
                      {tag}
                    </div>
                    <h3 className="mt-4 text-lg font-black text-white">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/72">{copy}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#f7f4f1] px-6 py-20 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#f05a28]">
              Cómo funciona
            </p>
            <h2 className="mt-4 font-display text-[clamp(3rem,7vw,4.4rem)] leading-[0.92] tracking-[-0.04em] text-[#1a110a]">
              Tres pasos.
              <br />
              <span className="text-[#f05a28]">Sin complicaciones.</span>
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[#7a6a60]">
              El proceso es simple: dejas tu email, te reservamos sitio y entras antes que el resto
              cuando activemos el acceso anticipado.
            </p>

            <div className="relative mt-12 grid gap-6 md:grid-cols-3">
              <div className="absolute left-[12%] right-[12%] top-10 hidden h-px bg-[linear-gradient(90deg,transparent,#f05a28,transparent)] md:block" />
              {steps.map(([num, badge, title, copy]) => (
                <article
                  key={num}
                  className="relative rounded-[1.45rem] border border-[#f05a2817] bg-[#fffdfb] p-6 shadow-[0_18px_36px_-32px_rgba(26,17,10,0.32)]"
                >
                  <div className="font-display text-[3.6rem] leading-none text-[#f5cbbb]">{num}</div>
                  <div className="mt-2 inline-flex rounded-full bg-[#fff1ea] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#f05a28]">
                    {badge}
                  </div>
                  <h3 className="mt-4 text-2xl font-black tracking-[-0.04em] text-[#1a110a]">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#7a6a60]">{copy}</p>
                  {num !== "03" ? (
                    <div className="absolute right-[-18px] top-1/2 hidden -translate-y-1/2 text-[#f05a28] md:block">
                      <ArrowRight className="h-5 w-5" />
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[linear-gradient(135deg,#fff5f0_0%,#ffffff_50%,#fff8f4_100%)] px-6 py-24 text-center sm:px-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(240,90,40,0.08),_transparent_70%)]" />
          <div className="relative mx-auto max-w-4xl">
            <h2 className="font-display text-[clamp(3.4rem,9vw,6.2rem)] leading-[0.9] tracking-[-0.05em] text-[#1a110a]">
              Empieza este verano
              <br />
              y llega a marzo
              <br />
              <span className="text-[#f05a28]">con la app hecha tuya.</span>
            </h2>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-[#7a6a60]">
              Mapa, agenda, rutas y Pasaporte Fallero desde el primer día. Reserva tu sitio ahora y
              recibe el aviso antes que nadie cuando abramos el acceso anticipado.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => formSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
                className="inline-flex items-center gap-2 rounded-full bg-[#f05a28] px-8 py-4 text-sm font-bold text-white transition hover:bg-[#ff8b5e]"
              >
                Apuntarme ahora
                <ArrowRight className="h-4 w-4" />
              </button>
              <a
                href={config.landingHref}
                className="inline-flex items-center gap-2 rounded-full border border-[#00000014] bg-white px-8 py-4 text-sm font-bold text-[#1a110a] transition hover:bg-[#f7f4f1]"
              >
                Volver a la landing
              </a>
            </div>
            <p className="mt-5 text-sm text-[#b0a098]">
              <strong className="text-[#7a6a60]">Gratis para empezar. Sin tarjeta. Sin compromiso.</strong>
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#0000000d] bg-[#f7f4f1] px-6 py-8 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div className="font-display text-3xl tracking-[0.14em] text-[#1a110a]">
            FALLES<span className="text-[#f05a28]">360</span>
          </div>
          <p className="text-sm text-[#7a6a60]">
            © 2026 Falles360 · Valencia
          </p>
        </div>
      </footer>
    </div>
  );
}
