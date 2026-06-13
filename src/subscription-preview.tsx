import { StrictMode, useMemo } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  Crown,
  CreditCard,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import "./index.css";
import { registerServiceWorker } from "./pwa";

registerServiceWorker();

const planCatalog = {
  "plus-fallas": {
    name: "Plus Fallas",
    price: "3,99 €",
    note: "Por campana",
    badge: "Recomendado para Fallas",
    copy: "La mejor opcion para vivir Fallas con mas comodidad, menos improvisacion y ayuda personalizada.",
    features: [
      "Fallerito ampliado: 50 consultas al dia",
      "Rutas inteligentes",
      "Planes personalizados",
      "Favoritos avanzados",
      "Alertas importantes",
      "Ventajas en marketplace",
      "Badge Plus",
    ],
  },
  "plus-anual": {
    name: "Plus Anual",
    price: "9,99 €",
    note: "Suscripcion anual",
    badge: "Pensado para todo el ano",
    copy: "Para disfrutar de todas las ventajas de Plus y seguir conectado al mundo fallero durante todo el ano.",
    features: [
      "Todo lo de Plus Fallas",
      "Marketplace fallero todo el ano",
      "Descuentos y ofertas de comercios",
      "Acceso anticipado a novedades",
      "Recomendaciones personalizadas",
      "Badge Plus anual",
    ],
  },
} as const;

type PlanSlug = keyof typeof planCatalog;

function getPlanSlug(): PlanSlug {
  if (typeof window === "undefined") {
    return "plus-fallas";
  }

  const raw = new URLSearchParams(window.location.search).get("plan");
  return raw === "plus-anual" ? "plus-anual" : "plus-fallas";
}

function isBuiltFromDist() {
  return typeof window !== "undefined" && window.location.pathname.includes("/dist/");
}

function SubscriptionPreviewPage() {
  const plan = useMemo(() => planCatalog[getPlanSlug()], []);
  const builtFromDist = isBuiltFromDist();
  const whitelistHref = "https://infofalles360-lab.github.io/fallas360-whitelist/";
  const isGitHubPages =
    typeof window !== "undefined" && window.location.hostname.endsWith("github.io");
  const loginHref = isGitHubPages ? whitelistHref : builtFromDist ? "../login.php" : "./login.php";
  const appHref = isGitHubPages ? whitelistHref : builtFromDist ? "../guest.php" : "./guest.php";
  const plansHref = "./index.html#plans";

  const steps = [
    {
      title: "Cuenta",
      copy: "El usuario entra o crea su cuenta antes de activar el plan para ligar la suscripcion a su perfil.",
      icon: <UserRound className="h-5 w-5" />,
      ready: true,
    },
    {
      title: "Metodo de pago",
      copy: "Aqui ira Stripe, Redsys o el metodo que decidas. Esta es la unica pieza que falta conectar.",
      icon: <CreditCard className="h-5 w-5" />,
      ready: false,
    },
    {
      title: "Activacion",
      copy: "Tras confirmar el pago, la cuenta pasara automaticamente a Plus y se desbloquearan sus ventajas.",
      icon: <Sparkles className="h-5 w-5" />,
      ready: false,
    },
  ] as const;

  return (
    <div className="min-h-dvh bg-[#f7f4f1] text-[#1a110a]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(240,90,40,0.08),_transparent_28%),radial-gradient(circle_at_top_left,_rgba(240,90,40,0.05),_transparent_24%)]" />

      <main className="relative px-5 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[92rem]">
          <a
            href={plansHref}
            className="inline-flex items-center gap-2 rounded-full border border-[#00000012] bg-white/88 px-4 py-2.5 text-sm font-bold text-[#58483f] shadow-[0_12px_26px_-22px_rgba(26,17,10,0.25)] transition hover:bg-[#fff1ea] hover:text-[#f05a28]"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a planes
          </a>

          <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="overflow-hidden rounded-[2rem] border border-[#f05a2828] bg-[linear-gradient(160deg,#1a110a_0%,#2f180f_48%,#c03e15_145%)] p-6 text-white shadow-[0_32px_100px_-40px_rgba(26,17,10,0.65)] lg:p-8">
              <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#ffd3b8]">
                Activacion de prueba
              </span>
              <h1 className="mt-4 text-[2.6rem] font-black leading-[0.95] tracking-[-0.05em]">{plan.name}</h1>
              <div className="mt-3 flex items-end gap-3">
                <p className="font-display text-[4.6rem] leading-none tracking-[-0.06em]">{plan.price}</p>
                <p className="pb-2 text-sm font-black uppercase tracking-[0.16em] text-white/70">{plan.note}</p>
              </div>
              <p className="mt-5 inline-flex rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-[#ffd3b8]">
                {plan.badge}
              </p>
              <p className="mt-5 text-sm leading-7 text-white/80">{plan.copy}</p>

              <div className="mt-7 rounded-[1.5rem] border border-white/10 bg-white/8 p-5">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#ffd3b8]">Estado actual</p>
                <p className="mt-3 text-lg font-black tracking-tight">La pantalla ya esta preparada.</p>
                <p className="mt-2 text-sm leading-7 text-white/78">
                  Solo falta conectar el metodo de pago real. Todo lo demas puede mantenerse igual: cuenta, resumen del plan y activacion final.
                </p>
              </div>

              <div className="mt-7 space-y-3">
                <a
                  href={loginHref}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-4 text-sm font-black text-[#1a110a] transition hover:bg-[#fff1ea]"
                >
                  Continuar con cuenta
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href={appHref}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/14 bg-white/8 px-5 py-4 text-sm font-black text-white transition hover:bg-white/14"
                >
                  Seguir usando Free
                </a>
              </div>
            </div>

            <div className="space-y-6">
              <section className="rounded-[2rem] border border-[#f05a281a] bg-white/90 p-6 shadow-[0_24px_60px_-40px_rgba(26,17,10,0.28)] backdrop-blur-sm lg:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#c03e15]">Checkout de prueba</p>
                    <h2 className="mt-2 text-[2rem] font-black leading-[1] tracking-[-0.04em] text-[#1a110a]">
                      Solo falta conectar el cobro real.
                    </h2>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#fff1ea] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-[#c03e15]">
                    <Clock3 className="h-3.5 w-3.5" />
                    En preparacion
                  </span>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {steps.map((step, index) => (
                    <article
                      key={step.title}
                      className={`rounded-[1.5rem] border px-4 py-5 ${
                        step.ready ? "border-[#f05a2822] bg-[#fff8f4]" : "border-[#0000000d] bg-[#faf7f4]"
                      }`}
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff1ea] text-[#f05a28]">
                        {step.icon}
                      </div>
                      <p className="mt-4 text-[11px] font-black uppercase tracking-[0.18em] text-[#b0a098]">Paso 0{index + 1}</p>
                      <p className="mt-2 text-lg font-black tracking-tight text-[#1a110a]">{step.title}</p>
                      <p className="mt-2 text-sm leading-7 text-[#6f5f55]">{step.copy}</p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-[2rem] border border-[#00000010] bg-white/88 p-6 shadow-[0_20px_48px_-40px_rgba(26,17,10,0.25)]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff1ea] text-[#f05a28]">
                      <Crown className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#c03e15]">Resumen del plan</p>
                      <p className="text-sm font-bold text-[#7a6a60]">Lo que vera el usuario antes de pagar</p>
                    </div>
                  </div>

                  <ul className="mt-5 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm leading-7 text-[#5f5148]">
                        <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#fff1ea] text-[#c03e15]">
                          <Check className="h-4 w-4" />
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-[2rem] border border-[#f05a281f] bg-[#fff7f2] p-6 shadow-[0_20px_48px_-40px_rgba(26,17,10,0.22)]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#f05a28]">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#c03e15]">Siguiente integracion</p>
                      <p className="text-sm font-bold text-[#7a6a60]">La unica parte pendiente</p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-[1.5rem] border border-dashed border-[#f05a2830] bg-white/78 p-5">
                    <p className="text-sm font-black text-[#1a110a]">Bloque futuro de pago</p>
                    <p className="mt-2 text-sm leading-7 text-[#6b5c52]">
                      Aqui ira el selector de tarjeta, Bizum, Redsys o Stripe. Cuando lo conectes, esta pagina ya puede servir como paso previo real al cobro.
                    </p>
                    <button
                      type="button"
                      disabled
                      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#f05a28] px-5 py-4 text-sm font-black text-white opacity-70"
                    >
                      Metodo de pago proximamente
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SubscriptionPreviewPage />
  </StrictMode>,
);
