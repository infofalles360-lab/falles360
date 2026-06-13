import { motion, useReducedMotion, useScroll, useTransform, useMotionValue, animate, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  ArrowUp,
  Bell,
  Bot,
  CalendarDays,
  Check,
  Clock,
  Crown,
  Download,
  ExternalLink,
  Flame,
  Gift,
  Heart,
  Home,
  Mail,
  MapPinned,
  MapPin,
  Menu,
  Navigation,
  Percent,
  Plus,
  Route,
  Search,
  SendHorizontal,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Smartphone,
  Star,
  Store,
  ShoppingBag,
  Target,
  Ticket,
  Utensils,
  Mic,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useState, useRef, useCallback, type FormEvent, type ReactNode, type MouseEvent as ReactMouseEvent } from "react";
import {
  getPwaInstallState,
  promptForInstall,
  subscribeToPwaInstallState,
  type PwaInstallState,
} from "./pwa";
import { HeroIphoneFrame } from "./HeroIphoneFrame";

const navItems = [
  { href: "#features", label: "Funciones" },
  { href: "#plans", label: "Planes" },
  { href: "#marketplace", label: "Marketplace" },
  { href: "#how", label: "Como funciona" },
  { href: "#pwa", label: "Instalacion" },
  { href: "#perfil", label: "Perfil" },
];

const heroStats = [
  ["380+", "Monumentos", "Ruta visual por toda Valencia"],
  ["Gratis", "Acceso invitado", "Prueba la app antes de registrarte"],
  ["2027", "Rumbo a marzo", "Agenda, rutas y avisos listos para Fallas"],
] as const;

const appShowcaseImages = {
  falla:
    "https://images.unsplash.com/photo-1558980664-10e7170b5df9?auto=format&fit=crop&w=900&q=80",
  food:
    "https://images.unsplash.com/photo-1515668236457-83c3b8764839?auto=format&fit=crop&w=900&q=80",
  city:
    "https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=900&q=80",
} as const;

const marqueeItems = [
  "Mapa interactivo",
  "Pasaporte Fallero",
  "380+ monumentos",
  "Agenda en vivo",
  "Acceso invitado",
  "Modo offline",
  "Marketplace local",
];

const featureCards = [
  {
    title: "Mapa de calor interactivo",
    copy: "Ve donde esta la gente, las fallas mas visitadas y los barrios mas activos para decidir mejor tu siguiente movimiento.",
    tag: "Tiempo real",
    icon: <MapPinned className="h-5 w-5" />,
  },
  {
    title: "Pasaporte Fallero",
    copy: "Escanea monumentos, acumula insignias y convierte el recorrido en un reto con progreso real y memorable.",
    tag: "Gamificacion",
    icon: <Ticket className="h-5 w-5" />,
  },
  {
    title: "Agenda en vivo",
    copy: "Mascletas, castillos, ofrendas y actos sincronizados al momento para que no llegues tarde a nada.",
    tag: "Notificaciones",
    icon: <CalendarDays className="h-5 w-5" />,
  },
  {
    title: "Modo offline",
    copy: "Cuando la cobertura falla, Falles360 sigue dando acceso a tus rutas, favoritos y puntos clave.",
    tag: "Sin conexion",
    icon: <ShieldCheck className="h-5 w-5" />,
  },
  {
    title: "Marketplace fallero",
    copy: "Descubre restaurantes, cupones, productos, experiencias y sponsors cerca de tu ruta o de cada falla.",
    tag: "Monetizacion",
    icon: <ShoppingBag className="h-5 w-5" />,
  },
  {
    title: "Ficha de cada monumento",
    copy: "Premios, artista, ubicacion, acceso y acciones utiles para entender cada falla y guardarla en tu ruta.",
    tag: "380+ monumentos",
    icon: <Flame className="h-5 w-5" />,
  },
];

const planCards = [
  {
    slug: "free",
    name: "Free",
    price: "0 â‚¬",
    label: "Whitelist gratis",
    priceNote: "Siempre gratis",
    description: "Todo lo esencial para descubrir Fallas 360 sin pagar.",
    idealFor: "Ideal para: consultar informacion basica, moverte por Fallas y probar la app.",
    featureTitle: "Incluye:",
    features: [
      "Acceso a la whitelist",
      "Mapa de fallas",
      "Agenda basica",
      "Monumentos y servicios cercanos",
      "Marketplace visible",
      "Fallerito basico: 7 consultas al dia",
    ],
    cta: "Unirme gratis",
    featured: false,
    badge: null,
  },
  {
    slug: "plus-fallas",
    name: "Plus Fallas",
    price: "3,99 â‚¬",
    label: "Por campana fallera",
    priceNote: "Por campana",
    description: "La mejor opcion para vivir Fallas con mas comodidad, menos improvisacion y ayuda personalizada.",
    idealFor: "Ideal para: quienes quieren organizar mejor su ruta, preguntar mas a Fallerito y aprovechar ventajas durante Fallas.",
    featureTitle: "Desbloquea:",
    features: [
      "Fallerito ampliado: 50 consultas al dia",
      "Rutas inteligentes",
      "Planes personalizados",
      "Favoritos avanzados",
      "Alertas importantes",
      "Ventajas en marketplace",
      "Badge Plus",
    ],
    cta: "Obtener",
    featured: true,
    badge: "Recomendado para Fallas",
  },
  {
    slug: "plus-anual",
    name: "Plus Anual",
    price: "9,99 â‚¬",
    label: "Al ano",
    priceNote: "Suscripcion anual",
    description: "Para disfrutar de todas las ventajas de Plus y seguir conectado al mundo fallero durante todo el ano.",
    idealFor: "Ideal para: usuarios que quieren usar Fallas 360 tambien fuera de marzo, con marketplace y ventajas todo el ano.",
    featureTitle: "Desbloquea:",
    features: [
      "Todo lo de Plus Fallas",
      "Marketplace fallero todo el ano",
      "Descuentos y ofertas de comercios",
      "Acceso anticipado a novedades",
      "Recomendaciones personalizadas",
      "Badge Plus anual",
    ],
    cta: "Obtener",
    featured: false,
    badge: "Pensado para todo el ano",
  },
] as const;

type PlanCard = (typeof planCards)[number];

const marketplaceChips = [
  { label: "Restaurantes", icon: <Utensils className="h-3.5 w-3.5" />, active: true },
  { label: "Cupones", icon: <Percent className="h-3.5 w-3.5" />, active: false },
  { label: "Merchandising", icon: <ShoppingBag className="h-3.5 w-3.5" />, active: false },
  { label: "Experiencias", icon: <Sparkles className="h-3.5 w-3.5" />, active: false },
  { label: "Sponsors", icon: <Crown className="h-3.5 w-3.5" />, active: false },
  { label: "Cerca de mi", icon: <MapPin className="h-3.5 w-3.5" />, active: false },
  { label: "Populares", icon: <Star className="h-3.5 w-3.5" />, active: false },
] as const;

const recommendedCards = [
  { title: "Cena cerca de tu falla", meta: "La Terreta", price: "Menu 14,90â‚¬", distance: "150 m", badge: "Restaurante", tone: "from-[#36110a] via-[#a73618] to-[#ff7a32]" },
  { title: "Cupon activo hoy", meta: "Bar Sant Josep", price: "2x1 bebida", distance: "220 m", badge: "Cupon", tone: "from-[#4b1f0d] via-[#d95824] to-[#f7b267]" },
  { title: "Experiencia fallera popular", meta: "Centro historico", price: "Desde 19â‚¬", distance: "800 m", badge: "Tour", tone: "from-[#162238] via-[#a92617] to-[#f4c96b]" },
  { title: "Producto mas vendido", meta: "Fallas 360 Store", price: "9,90â‚¬", distance: "Online", badge: "Tienda", tone: "from-[#2e160f] via-[#c03e15] to-[#ffe0a3]" },
] as const;

const nearbyOffers = [
  { title: "2x1 en bebida", business: "Bar La Terreta", distance: "120 m", time: "Hoy", action: "Usar cupon", tone: "from-[#f05a28] to-[#ffb16f]" },
  { title: "10% mostrando la app", business: "Casa Montoliu", distance: "250 m", time: "2 h", action: "Ver", tone: "from-[#b61f17] to-[#f6a45b]" },
  { title: "Pack recuerdo fallero", business: "Tienda Mascleta", distance: "350 m", time: "3 dias", action: "Ver", tone: "from-[#3d2416] to-[#d4a03c]" },
  { title: "Menu fallero grupos", business: "Arros del Carme", distance: "480 m", time: "Hoy", action: "Reservar", tone: "from-[#6e1b11] to-[#f05a28]" },
] as const;

const marketplaceProducts = [
  { name: "Camiseta Fallas 360", price: "18,90â‚¬", badge: "Popular", tone: "from-[#1a110a] via-[#c03e15] to-[#f4b35f]" },
  { name: "Pulsera fallera", price: "6,90â‚¬", badge: "Oferta", tone: "from-[#6b1f13] via-[#f05a28] to-[#ffd6a3]" },
  { name: "Guia premium de rutas", price: "4,90â‚¬", badge: "Digital", tone: "from-[#14213d] via-[#c03e15] to-[#f2c46d]" },
  { name: "Pack recuerdo fallero", price: "24,90â‚¬", badge: "Nuevo", tone: "from-[#2a180d] via-[#b82618] to-[#ffc36d]" },
] as const;

const marketplaceExperiences = [
  { title: "Ruta guiada por fallas premiadas", price: "22â‚¬", duration: "2 h", seats: "8 cupos", tone: "from-[#36110a] via-[#b82618] to-[#f4b35f]" },
  { title: "Cena + mascleta", price: "34â‚¬", duration: "3 h", seats: "12 cupos", tone: "from-[#24120b] via-[#f05a28] to-[#ffd18c]" },
  { title: "Tour fotografico fallero", price: "18â‚¬", duration: "90 min", seats: "5 cupos", tone: "from-[#13243a] via-[#c03e15] to-[#f2c46d]" },
] as const;

const marketplaceSponsors = [
  ["Bar La Terreta", "Restaurante"],
  ["Floristeria Valencia", "Flores"],
  ["Seguros Levante", "Servicios"],
  ["Casa Montoliu", "Partner"],
] as const;

const marketplaceQuickActions = [
  { label: "Restaurantes", icon: <Utensils className="h-4 w-4" /> },
  { label: "Cupones", icon: <Ticket className="h-4 w-4" /> },
  { label: "Tiendas", icon: <ShoppingBag className="h-4 w-4" /> },
  { label: "Experiencias", icon: <Sparkles className="h-4 w-4" /> },
  { label: "Sponsors", icon: <Crown className="h-4 w-4" /> },
] as const;

const reviewCards = [
  {
    quote:
      "Entre en modo invitado y en cinco minutos ya tenia claras las fallas que queria ver cuando volviera a Valencia.",
    name: "Maria R.",
    meta: "Valencia Â· Temporada 2026",
    accent: "bg-[#c03e15]",
  },
  {
    quote:
      "La mezcla de mapa, agenda y Pasaporte Fallero esta bien pensada. Se nota que no es solo una landing bonita.",
    name: "Jorge L.",
    meta: "Madrid Â· Temporada 2026",
    accent: "bg-[#1d6fa5]",
  },
  {
    quote:
      "Me gusto poder probarla sin cuenta y decidir despues si queria guardar progreso. Ese detalle elimina mucha friccion.",
    name: "Ana P.",
    meta: "Barcelona Â· Temporada 2026",
    accent: "bg-[#3b6d11]",
  },
];

const profileBenefits = [
  "Sincronizacion entre dispositivos",
  "Guardado de monumentos favoritos",
  "Historico de premios y visitas",
  "Estadisticas personales y progreso",
];

type FalleritoIntent = keyof typeof falleritoResponses;

type FalleritoMessage = {
  from: "bot" | "user";
  text: string;
};

const falleritoResponses = {
  saludo: [
    "Hola, soy Fallerito. Puedo ayudarte con fallas, mascletas, rutas, comida, transporte y horarios. Â¿Que necesitas?",
    "Buenas, Fallerito al habla. Dime si buscas una falla, una mascleta, una ruta rapida o algo para comer.",
  ],
  buscar_falla: [
    "Para una visita rapida empieza por Ayuntamiento, Plaza de la Reina y Mercado Central. Si tienes mas tiempo, suma Convento Jerusalem y Ruzafa.",
    "Si quieres fallas potentes, prioriza Seccion Especial: Ayuntamiento, Convento Jerusalem, Cuba-Literato Azorin y Sueca-Literato Azorin.",
  ],
  buscar_mascleta: [
    "La mascleta principal es en la Plaza del Ayuntamiento a las 14:00. Llega con margen y busca una calle lateral para verla mejor.",
    "Para mascleta, evita quedarte demasiado cerca del centro acordonado. Mejor una posicion lateral y protegete los oidos.",
  ],
  explicar_falla: [
    "Una falla mezcla arte, satira y critica social. Si me describes el lema, ninots o escena principal, te ayudo a interpretarla.",
    "Mira personajes, carteles y exageraciones: suelen ser pistas de la critica que plantea el artista fallero.",
  ],
  crear_ruta: [
    "Ruta de 45 min: Ayuntamiento, Plaza de la Reina, Micalet y Mercado Central. Es compacta, centrica y con mucho ambiente.",
    "Ruta de 1 hora: Ayuntamiento, calle de la Paz, Colon, Gran Via y Convento Jerusalem. Buena mezcla de centro y fallas grandes.",
  ],
  comida: [
    "Lo mas fallero: bunuelos de calabaza con chocolate. Para comer, Ruzafa y el Carmen tienen muchas opciones cerca del ambiente.",
    "Si quieres algo tipico: paella, horchata con fartons o un menu de casal. Evita pararte solo en sitios demasiado turisticos.",
  ],
  horarios: [
    "Puntos clave: mascleta a las 14:00, ofrenda el 17 y 18, y crema el 19 por la noche. Por la noche las fallas iluminadas ganan mucho.",
    "La semana grande va del 15 al 19 de marzo. Si me dices manana, tarde o noche, te propongo el mejor plan.",
  ],
  transporte: [
    "Por el centro, mejor a pie. Para entrar a Valencia usa metro hasta Xativa, Colon o Alameda y evita el coche en zonas cortadas.",
    "En Fallas el trafico se complica. Metro, EMT y caminar suelen ser la combinacion mas fiable para moverte rapido.",
  ],
  ayuda: [
    "Puedo recomendarte fallas, encontrar mascletas, crear rutas, explicar monumentos, sugerir comida tipica y orientar transporte.",
    "Prueba con: 'hazme una ruta', 'donde hay mascleta', 'que falla veo', 'donde comer' o 'como me muevo'.",
  ],
  desconocido: [
    "No te he entendido del todo. Puedo ayudarte con fallas, mascletas, rutas, comida, horarios o transporte.",
    "Reformulamelo un poco o toca una sugerencia: ruta rapida, mascleta, comida o fallas recomendadas.",
  ],
} as const;

const falleritoIntentMatchers: Array<[FalleritoIntent, string[]]> = [
  ["saludo", ["hola", "buenas", "ey", "hello"]],
  ["buscar_mascleta", ["mascleta", "mascleta", "petard", "fuego", "pirotecn"]],
  ["crear_ruta", ["ruta", "recorrido", "itinerario", "camino", "ver en"]],
  ["comida", ["comer", "comida", "cenar", "restaurante", "bunuelo", "bunuelos", "horchata", "paella", "tapas"]],
  ["horarios", ["hora", "horario", "cuando", "agenda", "evento", "crema", "ofrenda", "planta"]],
  ["transporte", ["metro", "bus", "emt", "transporte", "coche", "aparcar", "llegar", "valenbisi"]],
  ["explicar_falla", ["explica", "explicame", "ninot", "significa", "lema", "satira"]],
  ["buscar_falla", ["falla", "fallas", "monumento", "recomienda", "ver", "especial"]],
  ["ayuda", ["ayuda", "puedes", "comandos", "que haces"]],
];

const particlePositions = ["8%", "17%", "26%", "38%", "49%", "61%", "72%", "84%", "92%"]; 

function useStaticRevealOnMobile() {
  const reduceMotion = useReducedMotion() === true;
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const query = window.matchMedia("(max-width: 760px)");
    const update = () => setIsMobile(query.matches);
    update();

    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", update);
      return () => query.removeEventListener("change", update);
    }

    query.addListener(update);
    return () => query.removeListener(update);
  }, []);

  return reduceMotion || isMobile;
}

function reveal(delay = 0, staticReveal = false) {
  if (staticReveal) {
    return {
      initial: false,
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0 },
    };
  }

  return {
    initial: { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.05, margin: "160px 0px" },
    transition: { duration: 0.55, delay },
  };
}

function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border border-[#f05a2826] bg-[#fff1ea] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-[#c03e15] ${className}`}>
      {children}
    </span>
  );
}

function SectionHeading({
  eyebrow,
  title,
  copy,
  inverted = false,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  copy: string;
  inverted?: boolean;
}) {
  return (
    <div className="max-w-4xl space-y-5">
      {eyebrow}
      <h2 className={`font-display text-[clamp(3rem,6vw,5.5rem)] leading-[0.92] tracking-[-0.04em] ${inverted ? "text-white" : "text-[#1a110a]"}`}>
        {title}
      </h2>
      <p className={`max-w-3xl text-base leading-8 ${inverted ? "text-white/64" : "text-[#7a6a60]"}`}>{copy}</p>
    </div>
  );
}

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-[60] h-[3px] origin-left bg-gradient-to-r from-[#f05a28] via-[#ff8b5e] to-[#ffd32a]"
      style={{ scaleX: scrollYProgress }}
    />
  );
}

function AnimatedCount({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const count = useMotionValue(0);
  const displayValue = useTransform(count, (value) => `${Math.round(value)}${suffix}`);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(count, to, { duration: 1.5, ease: "easeOut" });
    return controls.stop;
  }, [count, inView, to]);

  return (
    <span ref={ref}>
      <motion.span>{displayValue}</motion.span>
    </span>
  );
}

const FALLAS_COUNTDOWN_TARGET = new Date("2027-03-19T00:00:00+01:00").getTime();

function getFallasCountdown() {
  const remainingMs = Math.max(0, FALLAS_COUNTDOWN_TARGET - Date.now());
  const totalSeconds = Math.floor(remainingMs / 1000);

  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function FallasCountdown() {
  const [timeLeft, setTimeLeft] = useState(getFallasCountdown);

  useEffect(() => {
    const interval = window.setInterval(() => setTimeLeft(getFallasCountdown()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const units = [
    ["Dias", timeLeft.days, "dias"],
    ["Horas", timeLeft.hours, "horas"],
    ["Min", timeLeft.minutes, "minutos"],
    ["Seg", timeLeft.seconds, "segundos"],
  ] as const;

  return (
    <div className="mx-auto mt-7 w-full max-w-[42rem] overflow-hidden rounded-[1.75rem] border border-[#f05a2828] bg-[#1a110a] p-1 shadow-[0_28px_70px_-42px_rgba(26,17,10,0.75)]">
      <div className="relative overflow-hidden rounded-[1.55rem] bg-[linear-gradient(135deg,#1a110a_0%,#2a160d_48%,#c03e15_130%)] px-4 py-4 text-white sm:px-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_10%,rgba(240,90,40,0.42),transparent_28%),radial-gradient(circle_at_8%_90%,rgba(255,211,42,0.14),transparent_34%)]" />
        <div className="relative flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#ffb08f]">
                <CalendarDays className="h-3.5 w-3.5" />
                Quedan para Fallas
              </p>
              <p className="mt-1 truncate text-sm font-black text-white/88">19 de marzo de 2027</p>
            </div>
            <span className="hidden rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white/76 sm:inline-flex">
              En vivo
            </span>
          </div>

          <div className="grid grid-cols-4 overflow-hidden rounded-[1.2rem] border border-white/10 bg-white/[0.06]">
            {units.map(([label, value, ariaLabel], index) => (
              <div
                key={label}
                className={`min-w-0 px-1.5 py-3 text-center sm:px-3 sm:py-4 ${index > 0 ? "border-l border-white/10" : ""}`}
                aria-label={`${value} ${ariaLabel}`}
              >
                <p className="font-display text-[2.15rem] leading-none tracking-[-0.05em] text-white sm:text-[2.75rem]">
                  {String(value).padStart(label === "Dias" ? 1 : 2, "0")}
                </p>
                <p className="mt-1 text-[8px] font-black uppercase tracking-[0.16em] text-[#ffb08f] sm:text-[9px]">{label}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-[11px] font-bold text-white/58 sm:text-left">
            La app ya prepara rutas, agenda, mapa y avisos para llegar con ventaja.
          </p>
        </div>
      </div>
    </div>
  );
}

function TiltCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion() === true;

  const handleMouseMove = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (reduceMotion || !cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      cardRef.current.style.transform = `perspective(400px) rotateX(${-y * 6}deg) rotateY(${x * 6}deg)`;
    },
    [reduceMotion],
  );

  const handleMouseLeave = useCallback(() => {
    if (!cardRef.current) return;
    cardRef.current.style.transform = "perspective(400px) rotateX(0deg) rotateY(0deg)";
  }, []);

  return (
    <div
      ref={cardRef}
      className={`transition-[transform] duration-150 will-change-transform ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transformStyle: "preserve-3d" }}
    >
      {children}
    </div>
  );
}

function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.button
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.25 }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-24 right-6 z-[70] flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f05a28] text-white shadow-[0_12px_32px_rgba(240,90,40,0.4)] transition hover:-translate-y-1 hover:bg-[#ff8b5e]"
          aria-label="Volver arriba"
        >
          <ArrowUp className="h-5 w-5" />
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}

/** Marco estilo iPhone 15 Pro (SVG + pantalla real debajo) */
function PhoneShell({
  label,
  className = "",
  featured = false,
  showStatus = true,
  children,
}: {
  label: string;
  className?: string;
  featured?: boolean;
  showStatus?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`transform-gpu [backface-visibility:hidden] ${className}`}>
      <HeroIphoneFrame featured={featured} footer={label}>
        <div className="flex h-full min-h-0 flex-col">
          {showStatus ? (
            <div
              className={`flex shrink-0 items-center justify-between px-3 text-[10px] font-bold text-[#8c7b6f] sm:px-4 ${featured ? "pb-1.5 pt-[26px]" : "border-b border-white/5 pb-2 pt-[30px]"}`}
            >
              <span>9:41</span>
              <span>{featured ? "LTE Â· 100%" : "5G Â· 100%"}</span>
            </div>
          ) : null}
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
        </div>
      </HeroIphoneFrame>
    </div>
  );
}

function HeatDot({ className, delay = 0 }: { className: string; delay?: number }) {
  const reduceMotion = useReducedMotion() === true;
  if (reduceMotion) {
    return <div className={`absolute rounded-full bg-[#f05a28] shadow-[0_0_14px_rgba(240,90,40,0.8)] ${className}`} />;
  }
  return (
    <motion.div
      className={`absolute rounded-full bg-[#f05a28] shadow-[0_0_16px_rgba(240,90,40,0.85)] ${className}`}
      animate={{
        scale: [1, 1.2, 1],
        boxShadow: [
          "0 0 12px rgba(240,90,40,0.7)",
          "0 0 22px rgba(240,90,40,0.95), 0 0 0 0 rgba(240,90,40,0.35)",
          "0 0 12px rgba(240,90,40,0.7)",
        ],
      }}
      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay }}
    />
  );
}

function MapPhone() {
  return (
    <PhoneShell label="Mapa interactivo" featured showStatus={false}>
      <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#f7f3ee] text-[#06142f]">
        <div className="absolute inset-0 bg-[#eef2f1]" />
        <div className="absolute inset-0 opacity-80 [background-image:linear-gradient(18deg,transparent_0_48%,rgba(142,154,154,0.34)_49%,transparent_51%),linear-gradient(108deg,transparent_0_49%,rgba(142,154,154,0.24)_50%,transparent_52%),linear-gradient(0deg,rgba(255,255,255,0.65)_1px,transparent_1px)] [background-size:96px_74px,118px_92px,100%_94px]" />
        <div className="absolute inset-y-0 left-[54%] w-[58%] bg-[#cfdbdb]/82" />
        <div className="absolute inset-y-0 left-[35%] w-[34%] -skew-x-[19deg] bg-white/72" />
        <div className="absolute left-[8%] top-[22%] text-[10px] font-semibold text-[#9aa5a6]">Burjassot</div>
        <div className="absolute left-[42%] top-[17%] text-[10px] font-semibold text-[#9aa5a6]">Meliana</div>
        <div className="absolute left-[34%] top-[33%] text-[11px] font-black uppercase tracking-[0.14em] text-[#d6a91b]">Valencia</div>
        <div className="absolute left-[18%] top-[44%] text-[10px] font-semibold text-[#9aa5a6]">Catarroja</div>
        <div className="absolute right-[16%] bottom-[29%] text-[10px] font-semibold text-[#9aa5a6]">Sueca</div>

        <div className="relative z-20 flex items-center justify-between rounded-b-[1.2rem] bg-white/98 px-3 pb-2.5 pt-5 shadow-[0_10px_26px_rgba(15,23,42,0.10)]">
          <div className="text-[10px] font-black uppercase tracking-tight">FALLES <span className="text-[#f05a28]">360</span></div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex h-8 items-center gap-1 rounded-full bg-white px-2.5 text-[10px] font-black shadow-[0_8px_18px_rgba(15,23,42,0.08)]"><Navigation className="h-3 w-3 text-[#f05a28]" /> GPS</span>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-[#f05a28] shadow-[0_8px_18px_rgba(15,23,42,0.08)]"><Smartphone className="h-3.5 w-3.5" /></span>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-[#4b5b72] shadow-[0_8px_18px_rgba(15,23,42,0.08)]"><Clock className="h-3.5 w-3.5" /></span>
            <span className="h-9 w-9 overflow-hidden rounded-full border-2 border-white shadow-[0_8px_18px_rgba(15,23,42,0.16)]">
              <img src={appShowcaseImages.falla} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            </span>
          </div>
        </div>

        <div className="relative z-20 p-4">
          <div className="inline-flex items-center gap-3 rounded-[1rem] bg-white/96 px-3.5 py-2.5 text-[11px] font-black uppercase tracking-[0.28em] text-[#06142f] shadow-[0_14px_30px_rgba(15,23,42,0.10)]">
            <span className="text-[#f05a28]"><SlidersHorizontal className="h-3.5 w-3.5" /></span>
            Panel
          </div>
          <div aria-hidden="true" className="ml-3 inline-grid h-9 w-9 place-items-center rounded-full bg-white/96 text-[#4b5b72] shadow-[0_14px_30px_rgba(15,23,42,0.10)]">
            <Target className="h-4 w-4" />
          </div>
        </div>

        <div className="relative z-10 flex-1">
          {[
            [50, 11, '6', 'bg-[#f05a28] text-white'],
            [47, 30, '366', 'bg-[#ffd32a] text-[#5c4300]'],
            [64, 31, '91', 'bg-[#ffd32a] text-[#5c4300]'],
            [41, 42, '25', 'bg-[#ff6b35] text-white'],
            [68, 42, '6', 'bg-[#ffd32a] text-[#5c4300]'],
            [76, 57, '2', 'bg-[#ff6b35] text-white'],
            [84, 77, '4', 'bg-[#ff6b35] text-white'],
          ].map(([left, top, label, tone]) => (
            <div key={`${left}-${top}-${label}`} className={`absolute grid h-10 w-10 place-items-center rounded-full text-[10px] font-black shadow-[0_10px_22px_rgba(240,90,40,0.28)] ${tone}`} style={{ left: `${left}%`, top: `${top}%` }}>
              {label}
            </div>
          ))}
        </div>

        <div className="relative z-20 mx-3 mb-3 grid shrink-0 grid-cols-5 rounded-[1.35rem] bg-white px-2 pb-3 pt-2 shadow-[0_-4px_28px_rgba(15,23,42,0.16)]">
          <div className="absolute left-1/2 top-[-1.45rem] grid h-14 w-14 -translate-x-1/2 place-items-center rounded-full border-[5px] border-white bg-[#f05a28] text-white shadow-[0_16px_34px_rgba(255,99,33,0.34)]">
            <Bot className="h-5 w-5" />
          </div>
          {[[MapPinned, "Mapa", true], [CalendarDays, "Agenda", false], [Bot, "Fallerito", false], [Flame, "Fallas", false], [ShoppingBag, "Marketplace", false]].map(([Icon, label, active]) => (
            <div key={String(label)} className={`flex min-w-0 flex-col items-center gap-1 text-[7px] font-bold ${active ? "text-[#f05a28]" : "text-[#06142f]/58"}`}>
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${String(label) === "Fallerito" ? "opacity-0" : active ? "text-[#f05a28]" : ""}`}><Icon className="h-3.5 w-3.5" /></div>
              {label}
            </div>
          ))}
        </div>
      </div>
    </PhoneShell>
  );
}
function AgendaPhone() {
  return (
    <PhoneShell label="Agenda completa" showStatus={false}>
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#eef4f7] text-[#06142f]">
        <div className="flex items-center justify-between rounded-b-[1.25rem] bg-white px-4 pb-3 pt-5 shadow-sm">
          <div className="text-[10px] font-black uppercase tracking-tight">FALLES <span className="text-[#f05a28]">360</span></div>
          <div className="flex items-center gap-2"><span className="rounded-full bg-white px-2 py-1 text-[10px] font-black shadow-sm">GPS</span><span className="h-7 w-7 rounded-full bg-[#f05a28]" /></div>
        </div>
        <div className="flex-1 overflow-hidden px-4 py-5">
          <div className="mb-4 overflow-hidden rounded-[1.6rem] bg-white shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
            <img src={appShowcaseImages.city} alt="" className="h-24 w-full object-cover" referrerPolicy="no-referrer" />
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#f05a28]">Agenda en vivo</p>
                <h3 className="mt-1 text-[15px] font-black leading-none">Mascleta y actos</h3>
              </div>
              <span className="rounded-full bg-[#f05a28] px-3 py-1.5 text-[8px] font-black text-white">14:00</span>
            </div>
          </div>
          <div className="rounded-[2rem] bg-gradient-to-br from-white to-[#fff1eb] p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#f05a28]">Vive las fallas</p>
            <h3 className="mt-3 text-[28px] font-black leading-none tracking-[-0.06em]">Rumbo a 2027</h3>
            <p className="mt-2 text-[11px] font-bold leading-5 text-[#41506b]">Prepara desde ya tus rutas, favoritos y puntos clave para la semana grande.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {["Monumentos oficiales", "Rutas recomendadas", "Premios y secciones", "Toda la actualidad"].map((item) => <span key={item} className="rounded-xl bg-white px-2 py-2 text-[7px] font-black text-[#41506b] shadow-sm">{item}</span>)}
            </div>
            <div className="mt-4 overflow-hidden rounded-[1.35rem] bg-[#06142f] text-white shadow-xl">
              <div className="relative min-h-[178px] p-4">
                <div className="absolute inset-y-0 right-0 w-[45%] bg-[radial-gradient(circle_at_40%_45%,rgba(240,90,40,0.9),rgba(240,90,40,0.18)_38%,transparent_70%)]" />
                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#ff5a2a]">Proximo acto</p>
                <div className="relative z-10 mt-2 flex items-start justify-between gap-2"><h4 className="text-[17px] font-black leading-none">Masclet...</h4><span className="rounded-full bg-[#ff5a2a] px-2 py-1 text-[7px] font-black uppercase">En directo</span></div>
                <p className="relative z-10 mt-3 text-[9px] font-bold text-white/88">Plaza del Ayuntamiento</p>
                <p className="relative z-10 mt-1 text-[9px] font-bold text-white/88">Semana grande Â· marzo</p>
                <div className="relative z-10 mt-4 grid grid-cols-4 gap-2">{["301", "20", "11", "56"].map((n) => <span key={n} className="rounded-xl bg-white/10 py-2 text-center text-[12px] font-black">{n}</span>)}</div>
                <span className="relative z-10 mt-4 inline-flex rounded-xl bg-[#ff5a2a] px-4 py-2 text-[10px] font-black">Ver detalle del acto</span>
              </div>
            </div>
          </div>
        </div>
        <div className="grid shrink-0 grid-cols-5 rounded-t-[1.4rem] bg-white px-2 pb-4 pt-2 shadow-[0_-12px_30px_rgba(15,23,42,0.08)]">
          {[[MapPinned, "Mapa", false], [CalendarDays, "Agenda", true], [Bot, "IA", false], [Flame, "Fallas", false], [UserRound, "Perfil", false]].map(([Icon, label, active]) => (
            <div key={String(label)} className={`flex flex-col items-center gap-1 text-[7px] font-bold ${active ? "text-[#f05a28]" : "text-[#06142f]/58"}`}><Icon className="h-3.5 w-3.5" />{label}</div>
          ))}
        </div>
      </div>
    </PhoneShell>
  );
}

function PassportPhone() {
  return (
    <PhoneShell label="Detalle editorial" showStatus={false}>
      <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#e8edf2] text-[#06142f]">
        <div className="flex items-center gap-2 rounded-b-[1.4rem] bg-white/95 px-3 pb-3 pt-4 shadow-sm">
          <div aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200">â€¹</div>
          <p className="min-w-0 flex-1 truncate text-[12px] font-black">FallesAr...</p>
          <div aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f05a28] text-white"><Flame className="h-4 w-4" /></div>
          <span aria-hidden="true" className="rounded-xl border border-slate-200 px-3 py-2 text-[9px] font-black uppercase tracking-[0.25em]">Edit</span>
          <div aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200"><X className="h-3.5 w-3.5" /></div>
        </div>
        <div className="flex-1 overflow-hidden px-3 py-5">
          <div className="mb-4 overflow-hidden rounded-[1.6rem] bg-white shadow-[0_18px_44px_rgba(15,23,42,0.1)]">
            <img src={appShowcaseImages.falla} alt="" className="h-32 w-full object-cover" referrerPolicy="no-referrer" />
            <div className="px-4 py-3">
              <p className="text-[8px] font-black uppercase tracking-[0.22em] text-[#f05a28]">Imagen de falla</p>
              <h3 className="mt-1 line-clamp-2 text-[17px] font-black leading-tight">Detalle del monumento</h3>
            </div>
          </div>
          <div className="rounded-[1.8rem] bg-gradient-to-br from-white via-[#fff8f4] to-[#e9fbff] px-5 py-6 text-center shadow-[0_18px_44px_rgba(15,23,42,0.1)]">
            <div className="inline-flex rounded-full bg-[#fff1eb] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.2em] text-[#f05a28]"><Flame className="mr-1 h-3 w-3" /> Falla destacada</div>
            <p className="mt-4 text-[8px] font-black uppercase tracking-[0.25em] text-[#8290a8]">Seccion especial | 2026</p>
            <h3 className="mt-3 text-[29px] font-black leading-[0.9] tracking-[-0.06em]">Convento de Jerusalen - Matematic Marzal</h3>
            <p className="mt-4 text-[10px] font-black text-[#6d7f9a]">Falles360 | archivo editorial de consulta</p>
            <p className="mx-auto mt-6 max-w-[230px] text-[13px] font-semibold leading-7 text-[#41506b]">Convent de Jerusalem - Matematic Marzal recoge en esta ficha toda la informacion principal del monumento, adaptada al formato de consulta editorial de Falles360.</p>
            <div className="mt-6 flex flex-col items-center gap-3">
              <span aria-hidden="true" className="rounded-full border border-slate-200 bg-white px-5 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-[#6d7f9a]">Table of content</span>
              <span aria-hidden="true" className="rounded-full border border-slate-200 bg-white px-5 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-[#6d7f9a]">Summary</span>
            </div>
          </div>
          <div className="mt-4 rounded-[1.6rem] bg-white p-4 shadow-sm"><p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#f05a28]">Summary</p></div>
        </div>
        <div className="absolute bottom-10 right-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ff5a2a] text-white shadow-[0_12px_30px_rgba(240,90,40,0.35)]">
          <CalendarDays className="h-4 w-4" />
        </div>
      </div>
    </PhoneShell>
  );
}

function HeroVisual() {
  const reduceMotion = useReducedMotion() === true;
  const staticReveal = useStaticRevealOnMobile();

  return (
    <motion.div
      {...reveal(0.18, staticReveal)}
      className="relative mx-auto mt-6 w-full max-w-6xl"
    >
      <div className="pointer-events-none absolute -inset-x-8 top-3 h-28 bg-[radial-gradient(ellipse_at_center,rgba(240,90,40,0.18),transparent_70%)] blur-2xl" />

      <motion.div
        className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-[#1a110a10] bg-white/86 shadow-[0_34px_110px_-72px_rgba(26,17,10,0.58)] backdrop-blur"
        animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
        transition={reduceMotion ? undefined : { duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="flex items-center gap-2 border-b border-[#1a110a0d] bg-white/80 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-[#f05a28]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#ffd32a]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#2e9e6a]" />
            <span className="ml-3 rounded-full bg-[#f7f4f1] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#9b8a7e]">
             Vista previa
            </span>
        </div>

        <div className="grid min-h-[360px] gap-0 bg-[#fbf7f3] md:grid-cols-[1.05fr_0.95fr]">
          <div className="relative min-h-[320px] overflow-hidden border-b border-[#1a110a0d] md:border-b-0 md:border-r">
            <div className="absolute inset-0 bg-[#eef2f1]" />
            <div className="absolute inset-0 opacity-90 [background-image:linear-gradient(22deg,transparent_0_48%,rgba(122,134,134,0.32)_49%,transparent_51%),linear-gradient(110deg,transparent_0_48%,rgba(122,134,134,0.22)_49%,transparent_51%),linear-gradient(90deg,rgba(255,255,255,0.62)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.72)_1px,transparent_1px)] [background-size:112px_82px,140px_96px,54px_54px,54px_54px]" />
            <div className="absolute left-[11%] top-[15%] rounded-full bg-white/92 px-3 py-1.5 text-[11px] font-black text-[#7a6a60] shadow-sm">Ruzafa</div>
            <div className="absolute right-[13%] top-[24%] rounded-full bg-white/92 px-3 py-1.5 text-[11px] font-black text-[#7a6a60] shadow-sm">Centro</div>
            <div className="absolute bottom-[23%] left-[22%] rounded-full bg-white/92 px-3 py-1.5 text-[11px] font-black text-[#7a6a60] shadow-sm">El Carmen</div>
            {[
              ["left-[44%] top-[28%]", "366", "bg-[#ffd32a] text-[#5c4300]"],
              ["left-[31%] top-[43%]", "25", "bg-[#f05a28] text-white"],
              ["left-[61%] top-[47%]", "91", "bg-[#ffd32a] text-[#5c4300]"],
              ["left-[72%] top-[66%]", "6", "bg-[#f05a28] text-white"],
            ].map(([position, value, tone]) => (
              <div key={value} className={`absolute grid h-12 w-12 place-items-center rounded-full text-xs font-black shadow-[0_14px_28px_rgba(240,90,40,0.28)] ${position} ${tone}`}>
                {value}
              </div>
            ))}
            <div className="absolute inset-x-5 bottom-5 rounded-[1.25rem] border border-white/82 bg-white/94 p-3 shadow-[0_18px_45px_-28px_rgba(26,17,10,0.45)]">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#fff1ea] text-[#f05a28]">
                  <MapPinned className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-black text-[#1a110a]">Mapa de calor activo</p>
                  <p className="truncate text-xs font-bold text-[#7a6a60]">Fallas cercanas, afluencia y rutas en una vista.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#f05a28]">Preparando la temporada</p>
                <h3 className="mt-1 text-2xl font-black tracking-[-0.04em] text-[#1a110a]">Tu base para Fallas 2027</h3>
              </div>
              <span className="rounded-full bg-[#1a110a] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white">Previa</span>
            </div>

            <div className="mt-5 space-y-3">
              {[
                [CalendarDays, "Marzo", "Agenda base de actos y fechas clave"],
                [Route, "Centro", "Ruta inicial para empezar con criterio"],
                [Ticket, "Retos", "Pasaporte Fallero listo para crecer"],
                [Gift, "Negocios", "Cupones y experiencias para activar"],
              ].map(([Icon, meta, title]) => (
                <div key={String(title)} className="flex items-center gap-3 rounded-[1.2rem] border border-[#1a110a0d] bg-white px-3 py-3 shadow-[0_14px_30px_-28px_rgba(26,17,10,0.35)]">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#fff1ea] text-[#f05a28]">
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#b0a098]">{String(meta)}</p>
                    <p className="truncate text-sm font-black text-[#1a110a]">{String(title)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function MarketplacePhoneMockup() {
  return (
    <div className="mx-auto w-full max-w-[430px] rounded-[3rem] border border-[#1a110a]/10 bg-[#1a110a] p-2 shadow-[0_34px_100px_-44px_rgba(26,17,10,0.72)]">
      <div className="relative overflow-hidden rounded-[2.55rem] bg-[#fbf4eb] text-[#1a110a]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(240,90,40,0.22),transparent_34%),radial-gradient(circle_at_88%_3%,rgba(212,160,60,0.18),transparent_26%)]" />
        <div className="relative flex h-[820px] min-h-0 flex-col overflow-hidden sm:h-[860px]">
          <div className="flex shrink-0 items-center justify-between px-5 pb-2 pt-5 text-[11px] font-black text-[#6d5a4e]">
            <span>9:41</span>
            <span>5G Â· 100%</span>
          </div>

          <div className="relative min-h-0 flex-1 overflow-y-auto px-4 pb-24 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <header className="sticky top-0 z-20 -mx-4 bg-[#fbf4eb]/90 px-4 pb-3 pt-2 backdrop-blur-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-[#c03e15] shadow-sm">
                    <Flame className="h-3 w-3" /> Fallas 360
                  </div>
                  <h3 className="mt-2 text-[29px] font-black leading-none tracking-[-0.06em]">Marketplace</h3>
                  <p className="mt-1 text-[12px] font-bold text-[#7a6a60]">Ofertas, productos y experiencias cerca de ti</p>
                </div>
                <div aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#c03e15] shadow-[0_12px_28px_rgba(26,17,10,0.1)]">
                  <SlidersHorizontal className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-[1.35rem] border border-[#f05a2820] bg-white px-3.5 py-3 shadow-[0_14px_34px_-28px_rgba(26,17,10,0.35)]">
                <Search className="h-4.5 w-4.5 text-[#f05a28]" />
                <span className="min-w-0 flex-1 truncate text-[12px] font-bold text-[#9b8a7e]">Buscar restaurantes, cupones, productos...</span>
              </div>

              <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {marketplaceChips.map((chip) => (
                  <span
                    key={chip.label}
                    aria-hidden="true"
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[10px] font-black shadow-sm ${chip.active ? "bg-[#f05a28] text-white" : "bg-white text-[#6d5a4e]"}`}
                  >
                    {chip.icon}
                    {chip.label}
                  </span>
                ))}
              </div>
            </header>

            <main className="pt-8">
              <section className="rounded-[2rem] border border-dashed border-[#f05a2830] bg-white/78 p-6 text-center shadow-[0_18px_40px_-34px_rgba(26,17,10,0.45)]">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-[#fff1ea] text-[#f05a28]">
                  <Store className="h-7 w-7" />
                </div>
                <h4 className="mt-5 text-[22px] font-black tracking-[-0.04em]">Activacion progresiva</h4>
                <p className="mx-auto mt-2 max-w-[280px] text-[12px] font-bold leading-6 text-[#7a6a60]">
                  Restaurantes, cupones, productos y experiencias se iran activando negocio a negocio antes de marzo.
                </p>
              </section>
            </main>
          </div>

          <nav className="absolute inset-x-0 bottom-0 z-30 grid grid-cols-5 rounded-t-[1.8rem] border-t border-[#0000000d] bg-white/96 px-3 pb-4 pt-2 shadow-[0_-18px_34px_rgba(26,17,10,0.1)] backdrop-blur-xl">
            {[[MapPinned, "Mapa", false], [CalendarDays, "Agenda", false], [Bot, "IA", false], [ShoppingBag, "Market", true], [UserRound, "Perfil", false]].map(([Icon, label, active]) => (
              <div key={String(label)} aria-hidden="true" className={`flex flex-col items-center gap-1 text-[8px] font-black ${active ? "text-[#f05a28]" : "text-[#9b8a7e]"}`}>
                <span className={`flex h-9 w-9 items-center justify-center rounded-2xl ${active ? "bg-[#f05a28] text-white shadow-[0_10px_22px_rgba(240,90,40,0.28)]" : "bg-transparent"}`}><Icon className="h-4 w-4" /></span>
                {label}
              </div>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}

function InstallPromptCard({
  state,
  message,
  onInstall,
  appHref,
}: {
  state: PwaInstallState;
  message: string | null;
  onInstall: () => void;
  appHref: string;
}) {
  const helperText = state.isInstalled
    ? "Falles360 ya esta instalada y lista para abrirse desde tu pantalla de inicio."
    : state.showIosHint
      ? "En Safari toca Compartir y luego Anadir a pantalla de inicio para fijarla."
      : state.canInstall
        ? "Pulsa instalar y deja la app fijada para abrirla rapido cuando empiece la semana grande."
        : "La instalacion guiada se mostrara en navegadores compatibles en movil.";

  return (
    <div className="rounded-[2rem] border border-[#f05a281f] bg-white p-6 shadow-[0_24px_70px_-45px_rgba(0,0,0,0.15)]">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#fff1ea] text-[#f05a28]">
          <Download className="h-5 w-5" />
        </div>
        <div>
          <p className="text-lg font-bold text-[#1a110a]">Fija Falles360 para marzo</p>
          <p className="mt-2 text-sm leading-6 text-[#7a6a60]">{helperText}</p>
        </div>
      </div>

      <div className="mt-5 space-y-3 rounded-[1.5rem] border border-[#0000000d] bg-[#f7f4f1] p-4 text-sm text-[#7a6a60]">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f05a28] text-xs font-bold text-white">1</span>
          Abre esta pagina en Chrome, Edge o Safari
        </div>
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f05a28] text-xs font-bold text-white">2</span>
          Pulsa compartir o el menu del navegador
        </div>
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#4ebf8a] text-xs font-bold text-white">3</span>
          Anade Falles360 a tu pantalla de inicio
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <a
          href={appHref}
          className="inline-flex items-center gap-2 rounded-full bg-[#f05a28] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#ff8b5e]"
        >
          Entrar como invitado
          <ArrowRight className="h-4 w-4" />
        </a>
        <button
          type="button"
          onClick={onInstall}
          className="inline-flex items-center gap-2 rounded-full border border-[#00000014] bg-white px-5 py-3 text-sm font-bold text-[#1a110a] transition hover:bg-[#f7f4f1]"
        >
          Instalar despues
          <Download className="h-4 w-4" />
        </button>
        {message ? <p className="text-sm font-medium text-[#c03e15]">{message}</p> : null}
      </div>
    </div>
  );
}

function Header({
  scrolled,
  mobileMenuOpen,
  onToggleMenu,
  loginHref,
  appHref,
}: {
  scrolled: boolean;
  mobileMenuOpen: boolean;
  onToggleMenu: () => void;
  loginHref: string;
  appHref: string;
}) {
  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-[#1a110a12] bg-white/95 shadow-[0_10px_30px_rgba(26,17,10,0.07)] backdrop-blur-xl"
          : "border-b border-[#1a110a0d] bg-white/90 backdrop-blur-xl"
      }`}
    >
      <div className="bg-[#f05a28] px-5 py-2 text-center text-[11px] font-black uppercase tracking-[0.16em] text-white sm:text-xs">
        Verano 2026: entra ahora, prepara tu ruta y llega a Fallas 2027 con ventaja
      </div>

      <div className="mx-auto flex max-w-[92rem] items-center justify-between px-5 py-3.5 sm:px-7 lg:px-8 lg:py-4">
        <a href="#top" className="inline-flex items-center gap-3 rounded-full px-1 py-1">
          <span className="font-display text-[2rem] leading-none tracking-[0.1em] text-[#1a110a]">
            FALLES<span className="text-[#f05a28]">360</span>
          </span>
        </a>

        <nav className="hidden items-center gap-1.5 rounded-full border border-[#1a110a0d] bg-white/82 p-1.5 shadow-[0_8px_24px_rgba(26,17,10,0.05)] lg:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2.5 text-sm font-bold text-[#58483f] transition hover:bg-[#fff3ec] hover:text-[#f05a28]"
            >
              {item.label}
            </a>
          ))}
          <a href={loginHref} className="rounded-full px-4 py-2.5 text-sm font-bold text-[#58483f] transition hover:bg-[#fff3ec] hover:text-[#f05a28]">
            Cuenta
          </a>
          <a
            href={appHref}
            className="inline-flex items-center justify-center rounded-full bg-[#f05a28] px-5 py-2.5 text-sm font-black text-white shadow-[0_10px_22px_rgba(240,90,40,0.24)] transition hover:-translate-y-0.5 hover:bg-[#e94e1f] hover:shadow-[0_14px_28px_rgba(240,90,40,0.3)]"
          >
            Entrar gratis
          </a>
        </nav>

        <button
          type="button"
          onClick={onToggleMenu}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#1a110a12] bg-white text-[#1a110a] shadow-[0_8px_20px_rgba(26,17,10,0.08)] lg:hidden"
          aria-label="Abrir menu"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileMenuOpen ? (
        <div className="border-t border-[#1a110a0d] bg-white/98 px-5 py-5 shadow-[0_18px_36px_rgba(26,17,10,0.08)] lg:hidden">
          <div className="flex flex-col gap-2">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="rounded-2xl px-4 py-3 text-sm font-bold text-[#4a3d34] transition hover:bg-[#fff3ec] hover:text-[#f05a28]">
                {item.label}
              </a>
            ))}
            <a
              href={loginHref}
              className="mt-2 inline-flex items-center justify-center rounded-full border border-[#1a110a12] bg-white px-5 py-3 text-sm font-black text-[#1a110a]"
            >
              Cuenta
            </a>
            <a
              href={appHref}
              className="inline-flex items-center justify-center rounded-full bg-[#f05a28] px-5 py-3 text-sm font-black text-white shadow-[0_12px_24px_rgba(240,90,40,0.24)]"
            >
              Entrar gratis
            </a>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function normalizeFalleritoText(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectFalleritoIntent(message: string): FalleritoIntent {
  const normalized = normalizeFalleritoText(message);
  const match = falleritoIntentMatchers.find(([, keywords]) =>
    keywords.some((keyword) => normalized.includes(keyword))
  );

  return match?.[0] ?? "desconocido";
}

function getFalleritoResponse(intent: FalleritoIntent, turn: number) {
  const responses = falleritoResponses[intent] ?? falleritoResponses.desconocido;
  return responses[turn % responses.length];
}

function FalleritoWidget() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<FalleritoMessage[]>([
    {
      from: "bot",
      text: "Soy Fallerito, tu guia fallero. Preguntame por rutas, mascletas, fallas, comida u horarios.",
    },
  ]);

  const sendMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    const intent = detectFalleritoIntent(trimmed);
    const botText = getFalleritoResponse(intent, messages.length);
    setMessages((current) => [
      ...current,
      { from: "user", text: trimmed },
      { from: "bot", text: botText },
    ]);
    setMessage("");
    setOpen(true);
  };

  return (
    <div className="fixed bottom-3 right-3 z-[80] flex max-w-[calc(100vw-1rem)] flex-col items-end gap-2.5 sm:bottom-6 sm:right-6 sm:max-w-[calc(100vw-2rem)] sm:gap-3">
      {open ? (
        <section className="flex max-h-[min(78dvh,42rem)] w-[min(100vw-1rem,25.5rem)] flex-col overflow-hidden rounded-[2.15rem] border border-[#f05a2826] bg-white shadow-[0_28px_90px_-34px_rgba(26,17,10,0.55)] sm:max-h-none sm:w-[min(100vw-2rem,380px)] sm:rounded-[2rem]">
          <div className="relative overflow-hidden bg-[#1a110a] px-4 py-4.5 text-white sm:py-4">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_8%,rgba(240,90,40,0.55),transparent_34%),radial-gradient(circle_at_12%_78%,rgba(255,208,130,0.24),transparent_30%)]" />
            <div className="relative flex items-center gap-3.5 sm:gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[1.1rem] bg-[#f05a28] shadow-[0_14px_28px_rgba(240,90,40,0.34)] sm:h-11 sm:w-11 sm:rounded-2xl">
                <Bot className="h-5.5 w-5.5 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-black sm:text-sm">Fallerito Bot</p>
                <p className="text-[12px] font-bold text-white/68 sm:text-xs">Guia rapido de Falles360</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/16 sm:h-9 sm:w-9"
                aria-label="Cerrar Fallerito"
              >
                <X className="h-4.5 w-4.5 sm:h-4 sm:w-4" />
              </button>
            </div>
          </div>

          <div className="min-h-[18rem] flex-1 space-y-3.5 overflow-y-auto bg-[#fff8f4] px-4 py-4.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:min-h-0 sm:max-h-[360px] sm:space-y-3 sm:py-4">
            {messages.map((item, index) => (
              <div key={`${item.from}-${index}`} className={`flex ${item.from === "user" ? "justify-end" : "justify-start"}`}>
                <p className={`max-w-[89%] rounded-[1.4rem] px-4 py-3.5 text-[15px] font-semibold leading-[1.55] shadow-sm sm:max-w-[86%] sm:rounded-[1.25rem] sm:py-3 sm:text-sm sm:leading-6 ${item.from === "user" ? "bg-[#f05a28] text-white" : "bg-white text-[#4a3d34]"}`}>
                  {item.text}
                </p>
              </div>
            ))}
          </div>

          <div className="border-t border-[#f05a2817] bg-[linear-gradient(180deg,#ffffff_0%,#fff8f3_100%)] px-3.5 pb-3.5 pt-3 sm:p-3">
            <form
              className="flex items-center gap-2 rounded-[1.55rem] border border-[#f05a2820] bg-[linear-gradient(180deg,#fffaf6_0%,#fff3eb_100%)] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_16px_34px_-28px_rgba(240,90,40,0.55)]"
              onSubmit={(event) => {
                event.preventDefault();
                sendMessage(message);
              }}
            >
              <button
                type="button"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#f05a281f] bg-white/88 text-[#f05a28] shadow-[0_10px_22px_-18px_rgba(240,90,40,0.8)] transition hover:bg-white"
                aria-label="Adjuntos proximamente"
                title="Adjuntos proximamente"
              >
                <Plus className="h-4.5 w-4.5" />
              </button>
              <div className="min-w-0 flex-1 rounded-[1.15rem] bg-white/86 px-3.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                <input
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Pregunta a Fallerito en lenguaje natural"
                  className="h-6 w-full min-w-0 bg-transparent text-[14px] font-semibold text-[#1a110a] outline-none placeholder:text-[#a8978b] sm:text-sm"
                />
              </div>
              <div className="h-7 w-px shrink-0 bg-[#f05a281f]" />
              <button
                type="button"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#1a110a] transition hover:bg-white/70"
                aria-label="Notas de voz proximamente"
                title="Notas de voz proximamente"
              >
                <Mic className="h-4.5 w-4.5" />
              </button>
              <button
                type="submit"
                disabled={!message.trim()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#ff9d77_0%,#f05a28_100%)] text-white shadow-[0_16px_30px_-20px_rgba(240,90,40,0.95)] transition hover:scale-[1.02] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100"
                aria-label="Enviar mensaje a Fallerito"
              >
                <SendHorizontal className="h-5 w-5 sm:h-4.5 sm:w-4.5" />
              </button>
            </form>
          </div>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="group flex items-center gap-3 rounded-full bg-[#f05a28] px-4 py-3 text-sm font-black text-white shadow-[0_24px_60px_-24px_rgba(240,90,40,0.95)] transition hover:-translate-y-0.5 hover:bg-[#ff7a32]"
        aria-label={open ? "Ocultar Fallerito" : "Abrir Fallerito"}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/18 transition group-hover:bg-white/24">
          <Bot className="h-5 w-5" />
        </span>
        <span className="hidden pr-1 sm:block">Fallerito</span>
      </button>
    </div>
  );
}

const NEWSLETTER_POPUP_STORAGE_KEY = "falles360.newsletter-popup.v3";
const NEWSLETTER_REOPEN_DELAY_MS = 45000;

function NewsletterPopup({ endpoint }: { endpoint: string }) {
  const [visible, setVisible] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<NewsletterStatus>("idle");
  const [message, setMessage] = useState("");
  const reopenTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = window.localStorage.getItem(NEWSLETTER_POPUP_STORAGE_KEY);
    if (saved === "joined" || saved === "dismissed") {
      return;
    }

    let readyByTime = false;

    const shouldOpen = () => {
      const scrollableHeight = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const scrollRatio = window.scrollY / scrollableHeight;

      if (readyByTime && scrollRatio >= 0.35) {
        setVisible(true);
        return true;
      }

      return false;
    };

    const handleScroll = () => {
      if (shouldOpen()) {
        window.removeEventListener("scroll", handleScroll);
      }
    };

    const timer = window.setTimeout(() => {
      readyByTime = true;
      if (shouldOpen()) {
        window.removeEventListener("scroll", handleScroll);
      }
    }, 18000);

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll);
      if (reopenTimerRef.current !== null) {
        window.clearTimeout(reopenTimerRef.current);
      }
    };
  }, []);

  const closePopup = () => {
    setVisible(false);
    setStatus("idle");
    setMessage("");

    if (typeof window === "undefined") {
      return;
    }

    if (reopenTimerRef.current !== null) {
      window.clearTimeout(reopenTimerRef.current);
    }

    reopenTimerRef.current = window.setTimeout(() => {
      const saved = window.localStorage.getItem(NEWSLETTER_POPUP_STORAGE_KEY);
      if (saved !== "joined") {
        setVisible(true);
      }
    }, NEWSLETTER_REOPEN_DELAY_MS);
  };

  const submitNewsletter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (trimmedName.length < 2) {
      setStatus("error");
      setMessage("Escribe tu nombre para unirte.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setStatus("error");
      setMessage("Escribe un correo valido.");
      return;
    }

    setStatus("sending");
    setMessage("");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          source: "landing_popup_10s",
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || payload.ok === false) {
        throw new Error(typeof payload.message === "string" ? payload.message : "No hemos podido guardarte.");
      }

      window.localStorage.setItem(NEWSLETTER_POPUP_STORAGE_KEY, "joined");
      if (reopenTimerRef.current !== null) {
        window.clearTimeout(reopenTimerRef.current);
      }
      setStatus("success");
      setMessage("Listo. Te avisaremos con novedades de Falles360.");
      window.setTimeout(() => setVisible(false), 1800);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "No hemos podido guardarte.");
    }
  };

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[#1a110a]/64 px-4 py-8 backdrop-blur-[10px] sm:px-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="newsletter-popup-title"
          onClick={closePopup}
        >
          <motion.form
            onSubmit={(event) => void submitNewsletter(event)}
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.97 }}
            transition={{ duration: 0.22 }}
            className="relative w-full max-w-[430px] overflow-hidden rounded-[1.65rem] border border-[#f05a2833] bg-[#fff8f4] px-6 py-7 text-[#1a110a] shadow-[0_34px_110px_rgba(26,17,10,0.42)] sm:px-8 sm:py-8"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_92%_8%,rgba(240,90,40,0.22),transparent_32%),radial-gradient(circle_at_8%_92%,rgba(255,139,94,0.16),transparent_34%)]" />
            <button
              type="button"
              onClick={closePopup}
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[#1a110a]/7 text-[#7a6a60] transition hover:bg-[#f05a28] hover:text-white"
              aria-label="Cerrar newsletter"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative z-10 mb-5 pr-9">
              <p className="inline-flex rounded-full bg-[#fff1ea] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#c03e15]">Newsletter Falles360</p>
              <h2 id="newsletter-popup-title" className="mt-3 text-[1.65rem] font-black leading-[1.05] tracking-[-0.04em] text-[#1a110a]">
                Noticias falleras, rutas y avisos antes que nadie.
              </h2>
              <p className="mt-3 text-sm font-bold leading-6 text-[#7a6a60]">
                Recibe avances reales de producto, agenda clave y avisos utiles cuando se acerque la semana grande.
              </p>
            </div>

            <div className="relative z-10 space-y-3.5">
              <label className="flex h-14 items-center gap-3 rounded-[1rem] border border-[#00000014] bg-white px-4 shadow-[0_12px_26px_-24px_rgba(26,17,10,0.35)] transition focus-within:border-[#f05a28] focus-within:bg-[#fffdfb]">
                <UserRound className="h-5 w-5 shrink-0 text-[#c03e15]" />
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Nombre"
                  autoComplete="name"
                  className="min-w-0 flex-1 bg-transparent text-sm font-bold text-[#1a110a] outline-none placeholder:text-[#9b8a7e]"
                />
              </label>

              <label className="flex h-14 items-center gap-3 rounded-[1rem] border border-[#00000014] bg-white px-4 shadow-[0_12px_26px_-24px_rgba(26,17,10,0.35)] transition focus-within:border-[#f05a28] focus-within:bg-[#fffdfb]">
                <Mail className="h-5 w-5 shrink-0 text-[#c03e15]" />
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="tucorreo@mail.com"
                  autoComplete="email"
                  inputMode="email"
                  className="min-w-0 flex-1 bg-transparent text-sm font-bold text-[#1a110a] outline-none placeholder:text-[#9b8a7e]"
                />
              </label>
            </div>

            <p className="relative z-10 mt-4 text-xs font-bold leading-5 text-[#7a6a60]">
              Al unirme acepto las{" "}
              <a href="./privacy.html" className="font-black text-[#1a110a] underline decoration-[#f05a28]/45 underline-offset-2 transition hover:text-[#c03e15]">
                Politicas de privacidad
              </a>
            </p>

            {message ? (
              <p className={`relative z-10 mt-4 rounded-[1rem] px-4 py-3 text-sm font-bold ${status === "success" ? "bg-[#2e9e6a]/12 text-[#237b52]" : "bg-[#f05a28]/12 text-[#c03e15]"}`}>
                {message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={status === "sending"}
              className="relative z-10 mt-5 w-full rounded-full bg-[#f05a28] px-6 py-4 text-sm font-black text-white shadow-[0_18px_38px_-22px_rgba(240,90,40,0.9)] transition hover:-translate-y-0.5 hover:bg-[#ff8b5e] disabled:cursor-not-allowed disabled:opacity-70 sm:text-base"
            >
              {status === "sending" ? "Enviando..." : "Quiero recibir novedades"}
            </button>
            <p className="relative z-10 mt-3 text-center text-[11px] font-bold text-[#b0a098]">
                Sin spam. Solo avances, noticias y avisos utiles de Falles360.
            </p>
          </motion.form>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

type NewsletterStatus = "idle" | "sending" | "success" | "error";

function SubscriptionFlowModal({
  plan,
  onClose,
  loginHref,
  whitelistHref,
  previewHref,
}: {
  plan: PlanCard;
  onClose: () => void;
  loginHref: string;
  whitelistHref: string;
  previewHref: string;
}) {
  const processSteps = [
    {
      title: "Eliges tu plan Plus",
      copy: `Seleccionas ${plan.name} y revisas lo que desbloquea antes de activarlo.`,
      icon: <Crown className="h-4.5 w-4.5" />,
    },
    {
      title: "Entras o creas tu cuenta",
      copy: "La suscripcion ira ligada a tu perfil para mantener consultas, rutas y ventajas desde cualquier dispositivo.",
      icon: <UserRound className="h-4.5 w-4.5" />,
    },
    {
      title: "Confirmas la activacion cuando se abra",
      copy: "El metodo de pago se conectara mas adelante. Hasta entonces, el plan queda presentado pero no se cobra nada.",
      icon: <ShieldCheck className="h-4.5 w-4.5" />,
    },
    {
      title: "Tu cuenta pasa a Plus",
      copy: "Cuando activemos suscripciones, se desbloquearan automaticamente las funciones premium del plan elegido.",
      icon: <Sparkles className="h-4.5 w-4.5" />,
    },
  ] as const;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[130] flex items-center justify-center bg-[#1a110a]/68 px-4 py-8 backdrop-blur-[12px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="subscription-flow-title"
        onClick={onClose}
      >
        <motion.div
          onClick={(event) => event.stopPropagation()}
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 18, scale: 0.97 }}
          transition={{ duration: 0.22 }}
          className="relative w-full max-w-[860px] overflow-hidden rounded-[2rem] border border-[#f05a2836] bg-[#fffaf7] shadow-[0_40px_120px_-48px_rgba(26,17,10,0.55)]"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_8%,rgba(240,90,40,0.22),transparent_28%),radial-gradient(circle_at_8%_84%,rgba(255,179,124,0.14),transparent_32%)]" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[#1a110a]/7 text-[#7a6a60] transition hover:bg-[#f05a28] hover:text-white"
            aria-label="Cerrar flujo de suscripcion"
          >
            <X className="h-4.5 w-4.5" />
          </button>

          <div className="relative grid gap-0 lg:grid-cols-[0.92fr_1.08fr]">
            <div className="border-b border-[#0000000d] bg-[linear-gradient(160deg,#1a110a_0%,#2f180f_48%,#c03e15_140%)] px-6 py-7 text-white lg:border-b-0 lg:border-r lg:border-r-white/10 lg:px-8 lg:py-9">
              <span className="inline-flex rounded-full bg-white/12 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#ffd3b8]">
                Flujo de activacion Plus
              </span>
              <h2 id="subscription-flow-title" className="mt-4 text-[2.2rem] font-black leading-[0.95] tracking-[-0.05em]">
                {plan.name}
              </h2>
              <p className="mt-2 font-display text-[3.6rem] leading-none tracking-[-0.06em] text-white">{plan.price}</p>
              <p className="mt-2 text-sm font-black uppercase tracking-[0.16em] text-white/68">{plan.priceNote}</p>
              <p className="mt-5 text-sm leading-7 text-white/78">{plan.description}</p>

              <div className="mt-6 rounded-[1.4rem] border border-white/12 bg-white/8 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#ffd3b8]">Mientras no haya pago activo</p>
                <p className="mt-2 text-sm leading-7 text-white/74">
                  Puedes seguir usando Fallas 360 gratis, entrar con tu cuenta y dejar preparado tu acceso para cuando abramos la activacion Plus.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href={previewHref}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-[#1a110a] transition hover:bg-[#fff1ea]"
                >
                  Continuar
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href={loginHref}
                  className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/8 px-5 py-3 text-sm font-black text-white transition hover:bg-white/14"
                >
                  Crear cuenta o entrar
                </a>
                <a
                  href={whitelistHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-transparent px-5 py-3 text-sm font-black text-white/84 transition hover:bg-white/10"
                >
                  Seguir con Free
                </a>
              </div>
            </div>

            <div className="px-6 py-7 lg:px-8 lg:py-9">
              <div className="rounded-[1.6rem] border border-[#f05a281c] bg-white p-5 shadow-[0_20px_56px_-42px_rgba(26,17,10,0.28)]">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#c03e15]">Asi funcionara el proceso</p>
                <div className="mt-5 space-y-4">
                  {processSteps.map((step, index) => (
                    <div key={step.title} className="flex items-start gap-4 rounded-[1.35rem] border border-[#0000000d] bg-[#fffaf7] px-4 py-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#fff1ea] text-[#f05a28]">
                        {step.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#b0a098]">Paso 0{index + 1}</p>
                        <p className="mt-1 text-base font-black tracking-tight text-[#1a110a]">{step.title}</p>
                        <p className="mt-1.5 text-sm leading-7 text-[#6e5e54]">{step.copy}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 rounded-[1.6rem] border border-[#f05a281c] bg-[#fff4ee] p-5">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#c03e15]">Que pasara despues</p>
                <ul className="mt-4 space-y-3">
                  {[
                    "Tu cuenta seguira teniendo acceso Free hasta que actives Plus de verdad.",
                    "No se bloqueara la app gratuita ni se iniciara ningun cobro ahora.",
                    "Cuando abramos suscripciones, la activacion se hara desde tu perfil con total claridad.",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm leading-7 text-[#5f5148]">
                      <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#fff1ea] text-[#c03e15]">
                        <Check className="h-4 w-4" />
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [installState, setInstallState] = useState<PwaInstallState>(() => getPwaInstallState());
  const [installMessage, setInstallMessage] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanCard | null>(null);
  const staticReveal = useStaticRevealOnMobile();

  const isBuiltFromDist =
    typeof window !== "undefined" && window.location.pathname.includes("/dist/");
  const loginHref = isBuiltFromDist ? "../login.php" : "./login.php";
  const appHref = isBuiltFromDist ? "../guest.php" : "./guest.php";
  const businessHref = isBuiltFromDist ? "../business-proposal.php" : "./business-proposal.php";
  const newsletterEndpoint = isBuiltFromDist ? "../api/newsletter.php" : "./api/newsletter.php";
  const whitelistHref = "https://infofalles360-lab.github.io/fallas360-whitelist/";
  const subscriptionPreviewBaseHref = isBuiltFromDist ? "./subscription-preview.html" : "./subscription-preview.html";

  useEffect(() => {
    const unsubscribe = subscribeToPwaInstallState((nextState) => {
      setInstallState(nextState);
    });

    const handleScroll = () => setScrolled(window.scrollY > 18);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      unsubscribe();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleInstall = async () => {
    if (installState.isInstalled) {
      setInstallMessage("Falles360 ya esta instalada. Abrela desde tu pantalla de inicio o entra como invitado.");
      return;
    }

    const result = await promptForInstall();

    if (result === "accepted") {
      setInstallMessage("Instalacion enviada. Abrela desde tu pantalla de inicio o entra como invitado para empezar.");
      return;
    }

    if (result === "dismissed") {
      setInstallMessage("Sin problema: puedes entrar como invitado y fijarla mas tarde desde el navegador.");
      return;
    }

    setInstallMessage(installState.showIosHint
      ? "En iPhone instala desde Compartir > Anadir a pantalla de inicio, o entra como invitado ahora."
      : "Si no aparece el aviso, entra como invitado y fijala mas tarde desde el menu del navegador."
    );
  };

  const openSubscriptionFlow = (plan: PlanCard) => {
    setSelectedPlan(plan);
  };

  const getSubscriptionPreviewHref = (plan: PlanCard) =>
    `${subscriptionPreviewBaseHref}?plan=${encodeURIComponent(plan.slug)}`;

  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#f7f4f1] text-[#1a110a]">
      <ScrollProgress />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(240,90,40,0.08),_transparent_28%),radial-gradient(circle_at_top_left,_rgba(240,90,40,0.04),_transparent_24%)]" />

      <Header
        scrolled={scrolled}
        mobileMenuOpen={mobileMenuOpen}
        onToggleMenu={() => setMobileMenuOpen((current) => !current)}
        loginHref={loginHref}
        appHref={appHref}
      />

      <main id="top" className="relative pt-24 sm:pt-24">
        <section className="relative min-h-[calc(100vh-6rem)] overflow-hidden px-6 pb-16 pt-4 sm:pt-6">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(26,17,10,0.045)_1px,transparent_1px),linear-gradient(0deg,rgba(26,17,10,0.045)_1px,transparent_1px)] [background-size:86px_86px]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,#ffffff_0%,rgba(255,255,255,0)_100%)]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(0deg,#f7f4f1_0%,rgba(247,244,241,0)_100%)]" />
          <div className="pointer-events-none absolute left-[14%] top-[24%] hidden h-9 w-9 rounded-full border border-[#f05a2836] sm:block">
            <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f05a28]" />
          </div>
          <div className="pointer-events-none absolute right-[19%] top-[26%] hidden h-9 w-9 rounded-full border border-[#f05a2836] lg:block">
            <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f05a28]" />
          </div>

          <div className="relative mx-auto max-w-[92rem]">
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="relative z-10 mx-auto max-w-5xl text-center"
            >
              <Eyebrow className="mx-auto">
                <Flame className="h-4 w-4" />
                Verano 2026 Â· rumbo a Fallas 2027
              </Eyebrow>

              <h1 className="mx-auto mt-5 max-w-5xl font-display text-[clamp(3rem,6.4vw,5.6rem)] leading-[0.9] tracking-[-0.04em] text-[#1a110a]">
                Este verano abre la base
                <span className="block text-[#f05a28]">de tus Fallas 2027.</span>
              </h1>

              <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-[#7a6a60] sm:text-lg">
                Mapa, agenda, rutas, Pasaporte Fallero y negocio local en una entrada rapida para ir preparando la experiencia antes de marzo.
                <strong className="text-[#1a110a]"> Entra gratis como invitado y decide despues si quieres guardar progreso.</strong>
              </p>

              <HeroVisual appHref={appHref} />

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5 }}
                className="mx-auto mt-7 grid max-w-3xl gap-4 border-t border-[#00000014] pt-7 sm:grid-cols-3"
              >
                {heroStats.map(([value, label, description]) => (
                  <div key={label}>
                    <p className="font-display text-5xl leading-none tracking-[-0.04em] text-[#f05a28]">
                      {value === "380+" ? <AnimatedCount to={380} suffix="+" /> : value}
                    </p>
                    <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-[#7a6a60]">{label}</p>
                    <p className="mt-2 text-sm text-[#b0a098]">{description}</p>
                  </div>
                ))}
              </motion.div>

              <FallasCountdown />
            </motion.div>
          </div>
        </section>

        <section className="overflow-hidden bg-[#f05a28] py-4 shadow-[0_18px_50px_-32px_rgba(240,90,40,0.85)]">
          <motion.div
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="flex min-w-max gap-10 whitespace-nowrap font-display text-lg tracking-[0.28em] text-white"
          >
            {[...marqueeItems, ...marqueeItems].map((item, index) => (
              <span key={`${item}-${index}`} className="flex items-center gap-4">
                {item}
                <span>ðŸ”¥</span>
              </span>
            ))}
          </motion.div>
        </section>

        <section className="relative overflow-hidden bg-[linear-gradient(135deg,#fff0ea_0%,#fff8f4_100%)] px-6 py-16 text-center">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(240,90,40,0.07),_transparent_70%)]" />
          <div className="relative mx-auto max-w-[82rem]">
            <p className="font-display text-[clamp(2.4rem,6vw,5.2rem)] leading-[0.96] tracking-[-0.04em] text-[#1a110a]">
              Las Fallas no se
              <span className="text-[#f05a28]"> improvisan en marzo.</span>
              <br />
              Tu telefono tiene que llegar preparado.
            </p>
            <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-[#7a6a60]">
              Entra este verano, entiende el producto y deja montada tu base. La instalacion puede esperar; la preparacion no.
            </p>
            <div className="mx-auto mt-6 grid max-w-4xl gap-3 sm:grid-cols-3">
              {["Encuentra una falla", "Guarda tu ruta", "Canjea cerca de ti"].map((item, index) => (
                <div key={item} className="rounded-2xl border border-[#f05a2818] bg-white/72 px-4 py-3 text-sm font-black text-[#1a110a] shadow-[0_16px_34px_-30px_rgba(0,0,0,0.35)]">
                  <span className="mr-2 text-[#f05a28]">0{index + 1}</span>{item}
                </div>
              ))}
            </div>
            <a
              href={appHref}
              className="relative mt-8 inline-flex items-center gap-2 rounded-full bg-[#f05a28] px-7 py-4 text-sm font-bold text-white transition hover:bg-[#ff8b5e]"
            >
              Entrar gratis como invitado
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </section>

        <section id="features" className="bg-[#f7f4f1] px-6 py-24">
          <div className="mx-auto max-w-[92rem]">
            <motion.div {...reveal(0, staticReveal)}>
              <SectionHeading
                eyebrow={
                  <Eyebrow>
                    <Star className="h-4 w-4" />
                    Todo lo que necesitas
                  </Eyebrow>
                }
                title={<>La base fallera en tu bolsillo.</>}
                copy="Pensada para llegar a marzo con criterio. Cada funcion tiene un objetivo claro: moverte mejor, guardar mejor y decidir mejor."
              />
            </motion.div>

            <div className="mt-12 grid overflow-hidden rounded-[2rem] border border-[#00000014] bg-white md:grid-cols-2 xl:grid-cols-3">
              {featureCards.map((card, index) => (
                <motion.article
                  key={card.title}
                  {...reveal(index * 0.04, staticReveal)}
                  className="group border-b border-r border-[#00000012] p-7 transition duration-300 hover:bg-[#fff5f1] xl:[&:nth-child(3n)]:border-r-0 md:[&:nth-last-child(-n+2)]:border-b-0 xl:[&:nth-last-child(-n+3)]:border-b-0"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#f05a2826] bg-[#fff1ea] text-[#f05a28] transition group-hover:bg-[#ffe4d9]">
                    {card.icon}
                  </div>
                  <h3 className="mt-6 text-xl font-bold text-[#1a110a]">{card.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#7a6a60]">{card.copy}</p>
                  <span className="mt-5 inline-flex rounded-full bg-[#fff1ea] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#c03e15]">
                    {card.tag}
                  </span>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section id="plans" className="relative overflow-hidden bg-[linear-gradient(180deg,#fffdfb_0%,#fff5ee_52%,#fffaf7_100%)] px-6 py-24">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(240,90,40,0.14),transparent_28%),radial-gradient(circle_at_85%_22%,rgba(244,196,109,0.2),transparent_26%),radial-gradient(circle_at_76%_78%,rgba(192,62,21,0.09),transparent_24%)]" />
          <div className="relative mx-auto max-w-[92rem]">
            <motion.div {...reveal(0, staticReveal)}>
              <SectionHeading
                eyebrow={
                  <Eyebrow>
                    <Crown className="h-4 w-4" />
                    Planes Fallas 360
                  </Eyebrow>
                }
                title={<>Empieza gratis y mejora<br />tu experiencia cuando quieras.</>}
                copy="La whitelist es gratuita. Fallas 360 seguira teniendo funciones gratis para todos, pero los usuarios Plus podran desbloquear mas consultas con Fallerito, rutas inteligentes, ayuda personalizada y ventajas exclusivas en el marketplace fallero."
              />
            </motion.div>

            <motion.div
              {...reveal(0.04, staticReveal)}
              className="mt-10 grid gap-4 rounded-[2rem] border border-[#f05a2817] bg-white/82 p-4 shadow-[0_28px_60px_-42px_rgba(26,17,10,0.28)] backdrop-blur-sm md:grid-cols-2 md:p-6"
            >
              <div className="rounded-[1.5rem] border border-[#00000010] bg-[#fffaf6] p-5 shadow-[0_18px_40px_-36px_rgba(26,17,10,0.22)]">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff1ea] text-[#f05a28]">
                  <CalendarDays className="h-5 w-5" />
                </span>
                <p className="mt-4 text-[11px] font-black uppercase tracking-[0.24em] text-[#c03e15]">Durante Fallas</p>
                <p className="mt-3 text-xl font-black tracking-tight text-[#1a110a]">Guia fallera para moverte mejor.</p>
                <p className="mt-2 text-sm leading-7 text-[#7a6a60]">Mapa, agenda, monumentos, rutas, servicios cercanos y Fallerito para llegar mejor preparado a cada dia.</p>
              </div>
              <div className="rounded-[1.5rem] border border-[#00000010] bg-[#fff] p-5 shadow-[0_18px_40px_-36px_rgba(26,17,10,0.18)]">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff1ea] text-[#f05a28]">
                  <Store className="h-5 w-5" />
                </span>
                <p className="mt-4 text-[11px] font-black uppercase tracking-[0.24em] text-[#c03e15]">Todo el ano</p>
                <p className="mt-3 text-xl font-black tracking-tight text-[#1a110a]">Marketplace fallero vivo mas alla de marzo.</p>
                <p className="mt-2 text-sm leading-7 text-[#7a6a60]">La app no desaparece despues de Fallas: se convierte en un espacio para descubrir comercios, ofertas, novedades y comunidad fallera.</p>
              </div>
            </motion.div>

            <div className="mt-12 grid gap-6 xl:grid-cols-3">
              {planCards.map((plan, index) => (
                <motion.article
                  key={plan.name}
                  {...reveal(index * 0.05, staticReveal)}
                  className={`relative overflow-hidden rounded-[2rem] border p-7 shadow-[0_28px_70px_-48px_rgba(26,17,10,0.34)] transition duration-300 hover:-translate-y-1 ${
                    plan.featured
                      ? "border-[#f05a2842] bg-[linear-gradient(180deg,#fff7f2_0%,#ffffff_100%)] shadow-[0_34px_90px_-46px_rgba(240,90,40,0.35)] xl:-translate-y-2"
                      : "border-[#00000012] bg-white/94"
                  }`}
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(240,90,40,0.14),transparent_72%)]" />
                  {plan.featured ? (
                    <div className="pointer-events-none absolute right-5 top-0 h-24 w-24 rounded-full bg-[radial-gradient(circle,rgba(240,90,40,0.22),transparent_70%)]" />
                  ) : null}
                  <div className="relative">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-3">
                        <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${
                          plan.featured
                            ? "bg-[#f05a28] text-white"
                            : "bg-[#fff1ea] text-[#c03e15]"
                        }`}>
                          {plan.label}
                        </span>
                        <div>
                          <h3 className="text-[2rem] font-black leading-none tracking-[-0.04em] text-[#1a110a]">{plan.name}</h3>
                          <p className="mt-3 text-sm leading-7 text-[#7a6a60]">{plan.description}</p>
                        </div>
                      </div>

                      {plan.badge ? (
                        <span className="inline-flex items-center gap-2 rounded-full border border-[#f05a2830] bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-[#c03e15] shadow-[0_12px_26px_-22px_rgba(240,90,40,0.45)]">
                          <Sparkles className="h-3.5 w-3.5" />
                          {plan.badge}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-8 flex items-end gap-3">
                      <span className="font-display text-[4rem] leading-none tracking-[-0.05em] text-[#1a110a]">{plan.price}</span>
                      <span className="pb-2 text-sm font-bold uppercase tracking-[0.16em] text-[#b0a098]">{plan.priceNote}</span>
                    </div>

                    <div className={`mt-5 rounded-[1.35rem] border px-4 py-4 ${
                      plan.featured
                        ? "border-[#f05a2826] bg-[#fff5ef]"
                        : "border-[#00000010] bg-[#faf7f4]"
                    }`}>
                      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#c03e15]">Ideal para</p>
                      <p className="mt-2 text-sm leading-7 text-[#6d5d53]">{plan.idealFor.replace(/^Ideal para:\s*/, "")}</p>
                    </div>

                    <p className="mt-7 text-[11px] font-black uppercase tracking-[0.22em] text-[#7a6a60]">{plan.featureTitle}</p>

                    <ul className="mt-4 space-y-3">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3 text-sm leading-7 text-[#5f5148]">
                          <span className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                            plan.featured ? "bg-[#f05a2818] text-[#f05a28]" : "bg-[#fff1ea] text-[#c03e15]"
                          }`}>
                            <Check className="h-4 w-4" />
                          </span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-8">
                      {plan.name === "Free" ? (
                        <a
                          href={whitelistHref}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1a110a] px-6 py-4 text-sm font-black text-white transition hover:bg-[#352318]"
                        >
                          {plan.cta}
                          <ArrowRight className="h-4 w-4" />
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openSubscriptionFlow(plan)}
                          aria-haspopup="dialog"
                          className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-4 text-sm font-black transition ${
                            plan.featured
                              ? "bg-[#f05a28] text-white hover:bg-[#ff8b5e]"
                              : "border border-[#f05a2824] bg-[#fff4ee] text-[#c03e15] hover:bg-[#fff0e7]"
                          }`}
                        >
                          {plan.cta}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>

            <motion.div {...reveal(0.1, staticReveal)} className="mx-auto mt-12 max-w-4xl text-center">
              <p className="font-display text-[clamp(2.1rem,5vw,4rem)] leading-[0.95] tracking-[-0.04em] text-[#1a110a]">
                Fallerito gratis te ayuda.
                <span className="block text-[#f05a28]">Fallerito Plus te organiza.</span>
              </p>
              <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-[#7a6a60]">
                La suscripcion sera opcional. La app seguira ofreciendo funciones gratuitas para todos los usuarios.
              </p>
            </motion.div>

            <motion.div {...reveal(0.14, staticReveal)} className="mx-auto mt-8 max-w-5xl rounded-[2rem] border border-[#00000010] bg-white/88 p-6 shadow-[0_24px_56px_-40px_rgba(26,17,10,0.26)] backdrop-blur-sm">
              <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                <div>
                  <p className="inline-flex rounded-full bg-[#fff1ea] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#c03e15]">
                    Proceso listo para activar
                  </p>
                  <h3 className="mt-4 text-[1.9rem] font-black leading-[1] tracking-[-0.04em] text-[#1a110a]">
                    Asi funcionara cuando un usuario quiera pasarse a Plus.
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-[#7a6a60]">
                    El flujo ya esta pensado para no romper la version gratuita: primero se elige plan, despues se entra en la cuenta, y solo mas adelante se conectara el cobro real desde perfil o checkout.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    "Elegir plan y revisar ventajas",
                    "Entrar o crear cuenta",
                    "Activar pago cuando se abra",
                    "Desbloqueo automatico de Plus",
                  ].map((item, index) => (
                    <div key={item} className="rounded-[1.35rem] border border-[#0000000d] bg-[#fffaf6] px-4 py-4">
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#c03e15]">Paso 0{index + 1}</p>
                      <p className="mt-2 text-sm font-bold leading-6 text-[#1a110a]">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section id="marketplace" className="relative overflow-hidden bg-[#fff8f4] px-6 py-24">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_12%,rgba(240,90,40,0.16),transparent_30%),radial-gradient(circle_at_88%_78%,rgba(212,160,60,0.2),transparent_34%),linear-gradient(180deg,#fff8f4,#fff1e7)]" />
          <div className="relative mx-auto grid max-w-[92rem] gap-12 lg:grid-cols-[0.86fr_1.14fr] lg:items-center">
            <motion.div {...reveal(0, staticReveal)}>
              <SectionHeading
                eyebrow={
                  <Eyebrow>
                    <Store className="h-4 w-4" />
                    Marketplace premium
                  </Eyebrow>
                }
                title={<>Comercio local,<br /><span className="text-[#f05a28]">ofertas y sponsors.</span></>}
                copy="Un espacio comercial dentro de Falles360 para conectar usuarios, turistas, falleros y vecinos con restaurantes, cupones, productos, experiencias reservables y patrocinadores cercanos."
              />

              <div className="mt-9 grid gap-3 sm:grid-cols-2">
                {[
                  ["Cupones digitales", "Canjeables en local con QR, estado activo y caducidad visible."],
                  ["Reservas y ventas", "Productos falleros, experiencias y menus preparados para convertir."],
                  ["Publicidad premium", "Sponsors y negocios destacados con presencia visual de alto valor."],
                  ["Cercania real", "Ofertas ordenadas por ubicacion, fallas cercanas e intereses."],
                ].map(([title, copy]) => (
                  <div key={title} className="rounded-[1.4rem] border border-[#f05a2822] bg-white/86 px-5 py-4 shadow-[0_18px_40px_-32px_rgba(0,0,0,0.35)] backdrop-blur-sm">
                    <Check className="h-5 w-5 text-[#f05a28]" />
                    <p className="mt-3 text-lg font-black tracking-tight text-[#1a110a]">{title}</p>
                    <p className="mt-2 text-sm leading-6 text-[#7a6a60]">{copy}</p>
                  </div>
                ))}
              </div>

              <p className="mt-6 rounded-[1.5rem] bg-[#1a110a] px-5 py-4 text-sm font-bold leading-6 text-white/78 shadow-[0_22px_50px_-34px_rgba(26,17,10,0.65)]">
                El marketplace convierte el recorrido fallero en visitas, reservas, canjes, compras y patrocinio medible para negocios locales.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href={businessHref}
                  className="inline-flex items-center gap-2 rounded-full bg-[#1a110a] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#352318]"
                >
                  Quiero aparecer en Falles360
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </motion.div>

            <motion.div {...reveal(0.08, staticReveal)}>
              <MarketplacePhoneMockup />
            </motion.div>
          </div>
        </section>

        <section id="how" className="bg-white px-6 py-24">
          <div className="mx-auto max-w-[92rem]">
            <motion.div {...reveal(0, staticReveal)}>
              <SectionHeading
                eyebrow={
                  <Eyebrow>
                    <Smartphone className="h-4 w-4" />
                    Empieza rapido
                  </Eyebrow>
                }
                title={<>Entra, explora<br />y guarda tu ruta.</>}
                copy="Primero entra gratis, entiende el producto y guarda lo importante. Cuando quieras tenerla siempre a mano, la fijas en tu pantalla de inicio."
              />
            </motion.div>

            <div className="relative mt-14 grid gap-10 md:grid-cols-3">
              <div className="absolute left-[12%] right-[12%] top-6 hidden h-px bg-[linear-gradient(90deg,transparent,#f05a28,transparent)] md:block" />
              {[
                ["1", "Entra gratis como invitado", "Accede al mapa, la agenda y la estructura de la app sin crear cuenta ni pasar por una tienda."],
                ["2", "Guarda lo importante", "Marca monumentos, rutas o cupones y activa tu perfil cuando de verdad quieras conservar progreso."],
                ["3", "Fijala si te encaja", "Anadela a tu pantalla de inicio para abrirla rapido cuando se acerque la semana grande."],
              ].map(([step, title, copy], index) => (
                <motion.article
                  key={step}
                  {...reveal(index * 0.06, staticReveal)}
                  className="relative text-center"
                >
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f05a28] font-display text-2xl text-white">
                    {step}
                  </div>
                  <p className="mt-6 text-lg font-bold text-[#1a110a]">{title}</p>
                  <p className="mt-3 text-sm leading-7 text-[#7a6a60]">{copy}</p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section id="pwa" className="bg-white px-6 py-24">
          <div className="mx-auto grid max-w-[92rem] gap-14 lg:grid-cols-[1fr_0.95fr] lg:items-center">
            <motion.div {...reveal(0, staticReveal)}>
              <SectionHeading
                eyebrow={
                  <Eyebrow>
                    <Download className="h-4 w-4" />
                    Cuando quieras fijarla
                  </Eyebrow>
                }
                title={<>La app se queda a mano cuando marzo aprieta.</>}
                copy="La instalacion no es una barrera de entrada: puedes probar Falles360 desde el navegador y fijarla despues para entrar rapido, mantener rutas y consultar contenido con menos cobertura."
              />

              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                <div className="overflow-hidden rounded-[1.5rem] border border-[#00000012] bg-[#f7f4f1]">
                  <div className="border-b border-[#0000000d] px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-[#7a6a60]">
                    App tradicional
                  </div>
                  {[
                    "Mas friccion para empezar",
                    "Depende de una tienda",
                    "Actualizacion menos directa",
                    "Peor para una prueba rapida",
                    "Mas pasos antes de entrar",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3 border-b border-[#00000008] px-4 py-3 text-sm text-[#b0a098] last:border-b-0">
                      <span className="text-base font-bold text-[#c9bdb6]">âœ•</span>
                      {item}
                    </div>
                  ))}
                </div>

                <div className="overflow-hidden rounded-[1.5rem] border border-[#f05a2826] bg-[#fff8f4]">
                  <div className="border-b border-[#f05a2817] px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-[#c03e15]">
                    Falles360 web app
                  </div>
                  {[
                    "Instalacion en 1 segundo",
                    "Directa desde el navegador",
                    "Siempre al dia",
                    "Funciona offline",
                    "Minimo espacio",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3 border-b border-[#f05a2810] px-4 py-3 text-sm text-[#7a6a60] last:border-b-0">
                      <Check className="h-4 w-4 text-[#2e9e6a]" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            <motion.div {...reveal(0.08, staticReveal)}>
              <InstallPromptCard
                state={installState}
                message={installMessage}
                onInstall={() => {
                  void handleInstall();
                }}
                appHref={appHref}
              />
            </motion.div>
          </div>
        </section>

        <section id="perfil" className="bg-[#f7f4f1] px-6 py-24">
          <div className="mx-auto grid max-w-[92rem] gap-14 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <motion.div {...reveal(0, staticReveal)} className="space-y-6">
              <SectionHeading
                eyebrow={
                  <Eyebrow>
                    <UserRound className="h-4 w-4" />
                    Tu perfil fallero
                  </Eyebrow>
                }
                title={
                  <>
                    Entra rapido ahora.
                    <br />
                    <span className="text-[#f05a28]">Guarda de verdad cuando te compense.</span>
                  </>
                }
                copy="El acceso invitado sirve para empezar sin friccion. La cuenta existe para guardar avance, sincronizar la experiencia y volver a tus rutas cuando quieras."
              />

              <div className="space-y-4">
                {profileBenefits.map((item, index) => (
                  <motion.div key={item} {...reveal(0.04 + index * 0.04, staticReveal)} className="flex items-start gap-3">
                    <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#f05a2815] text-[#c03e15]">
                      <Check className="h-4 w-4" />
                    </span>
                    <span className="text-sm leading-7 text-[#7a6a60]">{item}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div {...reveal(0.08, staticReveal)} className="mx-auto w-full max-w-[460px] rounded-[2rem] border border-[#00000012] bg-white p-6 shadow-[0_20px_60px_-38px_rgba(0,0,0,0.18)]">
              <div className="flex items-center gap-4 border-b border-[#0000000d] pb-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f05a28] font-display text-2xl text-white">F</div>
                <div>
                  <p className="text-base font-bold text-[#1a110a]">Falles360</p>
                  <p className="text-sm text-[#7a6a60]">Elige como entrar</p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <a href={loginHref} className="flex items-start gap-3 rounded-[1rem] border border-[#00000012] px-4 py-4 transition hover:bg-[#f7f4f1]">
                  <span className="text-lg">G</span>
                  <span>
                    <span className="block text-sm font-bold text-[#1a110a]">Crear cuenta con email</span>
                    <span className="mt-1 block text-xs leading-5 text-[#7a6a60]">Registra tu perfil para guardar rutas, favoritos e insignias de forma permanente.</span>
                  </span>
                </a>
                <a href={loginHref} className="flex items-start gap-3 rounded-[1rem] border border-[#00000012] px-4 py-4 transition hover:bg-[#f7f4f1]">
                  <span className="text-lg font-bold">A</span>
                  <span>
                    <span className="block text-sm font-bold text-[#1a110a]">Entrar a tu cuenta</span>
                    <span className="mt-1 block text-xs leading-5 text-[#7a6a60]">Vuelve a tu progreso, tus favoritos y tus rutas guardadas desde cualquier dispositivo.</span>
                  </span>
                </a>
                <div className="flex items-center gap-3 py-1 text-xs uppercase tracking-[0.22em] text-[#b0a098]">
                  <span className="h-px flex-1 bg-[#00000010]" />
                  o
                  <span className="h-px flex-1 bg-[#00000010]" />
                </div>
                <a href={appHref} className="flex items-start gap-3 rounded-[1rem] border border-dashed border-[#00000018] bg-[#fafafa] px-4 py-4 transition hover:border-[#f05a2826] hover:bg-[#f7f4f1]">
                  <UserRound className="mt-0.5 h-4.5 w-4.5 text-[#7a6a60]" />
                  <span>
                    <span className="block text-sm font-bold text-[#1a110a]">Acceso invitado</span>
                    <span className="mt-1 block text-xs leading-5 text-[#7a6a60]">Prueba la app ya y activa tu perfil solo cuando te aporte valor guardar progreso.</span>
                  </span>
                </a>
              </div>

              <p className="mt-5 border-t border-[#0000000d] pt-5 text-center text-xs leading-6 text-[#b0a098]">
                Entra rapido, entiende la experiencia y activa tu perfil solo cuando quieras convertir prueba en historial.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="bg-white px-6 py-24">
          <div className="mx-auto max-w-[92rem]">
            <motion.div {...reveal(0, staticReveal)}>
              <SectionHeading
                eyebrow={
                  <Eyebrow>
                    <Bell className="h-4 w-4" />
                    Lo que dice la gente
                  </Eyebrow>
                }
                title={<>Los falleros ya la usan.<br />Y se nota.</>}
                copy="La propuesta no se entiende solo por tecnologia. Se entiende cuando reduce friccion, ayuda a decidir mejor y te deja llegar a marzo con ventaja."
              />
            </motion.div>

            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {reviewCards.map((review, index) => (
                <div key={review.name}>
                <TiltCard>
                  <motion.article
                    {...reveal(index * 0.05, staticReveal)}
                    className="rounded-[1.5rem] border border-[#00000012] bg-[#f7f4f1] p-6 transition hover:-translate-y-1 hover:border-[#f05a2820]"
                  >
                  <div className="mb-4 flex items-center gap-1 text-[#f05a28]">
                    {Array.from({ length: 5 }).map((_, starIndex) => (
                      <Star key={starIndex} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-base leading-8 text-[#7a6a60]">&ldquo;{review.quote}&rdquo;</p>
                  <div className="mt-6 flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ${review.accent}`}>
                      {review.name
                        .split(" ")
                        .map((part) => part[0])
                        .join("")}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#1a110a]">{review.name}</p>
                      <p className="text-xs text-[#7a6a60]">{review.meta}</p>
                    </div>
                  </div>
                </motion.article>
                </TiltCard>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="instalar" className="relative overflow-hidden bg-[linear-gradient(135deg,#fff5f0_0%,#ffffff_50%,#fff8f4_100%)] px-6 py-24 text-center">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(240,90,40,0.08),_transparent_70%)]" />
          <motion.div {...reveal(0, staticReveal)} className="relative mx-auto max-w-[82rem]">
            <h2 className="font-display text-[clamp(3.4rem,9vw,7.2rem)] leading-[0.9] tracking-[-0.05em] text-[#1a110a]">
              Empieza este verano
              <br />
              y llega a marzo
              <br />
              <span className="text-[#f05a28]">con la app hecha tuya.</span>
            </h2>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-[#7a6a60]">
              Mapa, agenda, rutas, cupones y Pasaporte Fallero en una entrada rapida. Empieza gratis como invitado y crea cuenta solo cuando te compense.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <a
                href={appHref}
                className="inline-flex items-center gap-2 rounded-full bg-[#f05a28] px-8 py-4 text-sm font-bold text-white transition hover:bg-[#ff8b5e]"
              >
                Entrar gratis como invitado
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href={loginHref}
                className="inline-flex items-center gap-2 rounded-full border border-[#00000014] bg-white px-8 py-4 text-sm font-bold text-[#1a110a] transition hover:bg-[#f7f4f1]"
              >
                Crear cuenta o entrar
              </a>
            </div>
            <p className="mt-5 text-sm text-[#b0a098]">
              <strong className="text-[#7a6a60]">Gratis para empezar. Sin tarjeta.</strong> La instalacion es opcional y la cuenta solo hace falta cuando quieras guardar progreso.
            </p>
          </motion.div>
        </section>
      </main>

      <BackToTop />
      <NewsletterPopup endpoint={newsletterEndpoint} />
      {selectedPlan ? (
        <SubscriptionFlowModal
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
          loginHref={loginHref}
          whitelistHref={whitelistHref}
          previewHref={getSubscriptionPreviewHref(selectedPlan)}
        />
      ) : null}

      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-[#0000000d] bg-[#f7f4f1] px-6 py-8">
        <div className="font-display text-3xl tracking-[0.14em] text-[#1a110a]">
          FALLES<span className="text-[#f05a28]">360</span>
        </div>
        <p className="text-sm text-[#7a6a60]">© 2026 Falles360 · Una herramienta pensada para sobrevivir y disfrutar las Fallas de Valencia</p>
      </footer>
    </div>
  );
}
