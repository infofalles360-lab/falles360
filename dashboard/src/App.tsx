import React, { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ArrowRight,
  Trophy,
  Star,
  MapPin,
  Clock,
  Heart,
  LogOut,
  Settings2,
  Sparkles,
  Route,
  Eye,
  Navigation,
  Radio,
  MessageCircle,
  Phone,
  Mail,
  Mic,
  Compass,
  CalendarDays,
  Search,
  X,
  Plus,
  Filter,
  FileText,
  Image as ImageIcon,
  Grid3X3,
  List,
  UsersRound,
  Bell,
  ShieldCheck,
  UserCheck,
  Target,
  Award,
  Activity,
  BadgePercent,
  MousePointerClick,
  QrCode,
  Store,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Tag,
  Utensils,
  Crown,
  Flame,
  Bot,
  SendHorizontal,
  Copy,
  Volume2,
  ThumbsUp,
  ThumbsDown,
  Newspaper,
  Paperclip,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './utils/cn';
import {
  APP_GUEST_VIEWER,
  APP_VIEWER,
  EVENTS_MOCK,
  SOCIAL_POSTS,
  type AppViewer,
  type Falla,
} from './data';
import { FALLAS_MOCK } from './fallas-mock';

import { Header } from './components/Header';
import { FallaMap } from './components/FallaMap';
import { SocialFeed } from './components/SocialFeed';
import { FallaDetail } from './components/FallaDetail';
import { NavigationErrorBoundary } from './components/NavigationErrorBoundary';
const NavigationMapModal = React.lazy(() => import('./components/NavigationMapModal'));
import { BottomNav } from './components/BottomNav';
import { FallaCard } from './components/FallaCard';
import { ProfileSettingsModal } from './components/ProfileSettingsModal';
import { DevicePreviewModal } from './components/DevicePreviewModal';
import { AgendaView } from './components/AgendaView';
import { MonumentRailCard } from './components/MonumentRailCard';
import { MapDashboardShowcase } from './components/MapDashboardShowcase';
import { BadgeUnlockCelebration } from './components/gamification/BadgeUnlockCelebration';
import { GamificationBadgeModal } from './components/gamification/GamificationBadgeModal';
import { GamificationProfilePanel } from './components/gamification/GamificationProfilePanel';
import { UnlockToast } from './components/gamification/UnlockToast';
import { useGamification } from './hooks/useGamification';
import { useUserLocation, type LocationStatus } from './hooks/useUserLocation';
import { formatLongDate, fromIsoDate, toIsoDate } from './utils/date';
import { distanceBetweenPoints, formatDistance } from './utils/navigation';
import {
  createTelegramLink,
  fetchTelegramStatus,
  sendAdminTelegramAlert,
  sendTelegramNotification,
  type TelegramAdminAlertPayload,
  type TelegramLinkStatus,
} from './utils/telegram';
import {
  fetchCendraSyncStatus,
  generateCendraDailySummaryDraft,
  publishCendraArticleToChannel,
  runCendraSync,
  searchCendraArticles,
  sendCendraArticleToMyTelegram,
  sendCendraDailySummaryToMyTelegram,
  setCendraArticleLandingPublication,
  type CendraRecentArticle,
  type CendraSyncStatus,
} from './utils/cendra';
import { withCsrfHeadersAsync } from './utils/security';
import { type MapStyleId } from './utils/mapThemes';
import { isDevicePreviewMode, type DevicePreviewMode } from './utils/devicePreview';
import {
  fetchDashboardEvents,
  fetchDashboardFavoriteIds,
  fetchDashboardFallas,
  hasValidCoordinates,
  toggleDashboardFavorite,
  type DashboardEvent,
} from './utils/publicApp';
import {
  readDashboardBootstrapSnapshot,
  scheduleDashboardIdleTask,
  warmDashboardImageUrls,
  writeDashboardBootstrapCache,
  type DashboardBootstrapSnapshot,
} from './utils/bootstrapCache';
import { getFallaSearchScore, normalizeFallaSearchQuery } from './utils/fallaSearch';
import { sendMonitorDailySummaryToMyTelegram } from './utils/monitor';

interface ProfileApiResponse {
  ok?: boolean;
  profile?: {
    id?: number | string | null;
    type?: string;
    name?: string;
    email?: string | null;
    username?: string | null;
    location?: string | null;
    role?: string | null;
  };
  message?: string;
}

interface StoredViewerPreferences {
  location?: string;
  avatar?: string;
  devicePreviewMode?: DevicePreviewMode;
}

interface DemoBusinessStats {
  profileViews: number;
  routeClicks: number;
  couponActivations: number;
  couponUses: number;
}

interface MarketplaceBusiness {
  id: string;
  name: string;
  type: string;
  location: string;
  distance: string;
  promotion: string;
  actionLabel: string;
  badge: string;
  category: string;
  imageUrl: string;
  plan: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  website?: string;
}

interface MarketplaceCoupon {
  id: string;
  title: string;
  business: string;
  condition: string;
  validUntil: string;
  actionLabel: string;
}

interface MarketplaceProduct {
  id: string;
  name: string;
  price: string;
  category: string;
  imageUrl: string;
}

interface MarketplaceExperience {
  id: string;
  name: string;
  description: string;
  price: string;
  actionLabel: string;
  location?: string;
  duration?: string;
  capacity?: string;
  businessName?: string;
  imageUrl?: string;
  contactChannel?: string;
}

interface MarketplacePayload {
  managed?: boolean;
  settings?: Record<string, string>;
  filters?: Array<{ id: string; label: string; category: string; sectionId: string; sortOrder: number }>;
  businesses?: MarketplaceBusiness[];
  coupons?: MarketplaceCoupon[];
  products?: MarketplaceProduct[];
  experiences?: MarketplaceExperience[];
}

interface MarketplaceContactMessage {
  id: string;
  from: 'provider' | 'user';
  text: string;
  createdAt: string;
  delivery?: 'email_sent' | 'email_failed' | 'local';
}

interface MarketplaceContactThread {
  businessId: string;
  businessName: string;
  businessImageUrl: string;
  messages: MarketplaceContactMessage[];
  updatedAt: string;
}

const DEMO_BUSINESS_FALLA: Falla = {
  id: 'business-mcdonalds-plaza-ayuntamiento',
  name: "McDonald's Plaza Ayuntamiento",
  section: 'Marketplace local',
  category: 'Experimental',
  lat: 39.46975,
  lng: -0.37633,
  description: 'Establecimiento demo del marketplace local con QR unico, cupon activable y tracking de visitas, clics y canjes.',
  artist: 'Partner comercial',
  imageUrl: 'https://picsum.photos/seed/mcdonalds-falles360/900/700',
  neighborhood: 'Ciutat Vella',
  likes: 0,
  visitors: 318,
  address: 'Plaza del Ayuntamiento, València',
  commissionName: "McDonald's",
  prizeText: 'Cupón activo -15%',
  favoritesCount: 0,
  eventsCount: 0,
  status: 'partner-demo',
  year: '2026',
  city: 'València',
};

interface AdminTelegramTemplate extends TelegramAdminAlertPayload {
  key: string;
  name: string;
  summary: string;
}

interface AgendaEvent {
  id: string;
  title: string;
  time: string;
  location: string;
  date: string;
  type: string;
  description: string;
  isLive?: boolean;
}

interface DashboardDailySignal {
  id: number;
  title: string;
  excerpt: string;
  category: string;
  publishedAt: string | null;
}

const VIEWER_PREFERENCES_KEY = 'falles360.viewer-preferences.v1';
const DASHBOARD_THEME_STORAGE_KEY = 'falles360.dashboard-theme.v1';
const MARKETPLACE_CONTACT_THREADS_KEY = 'falles360.marketplace-contact-threads.v1';
const FALLERITO_CHAT_THREADS_KEY = 'falles360.fallerito-chat-threads.v1';
const FALLERITO_SETTINGS_KEY = 'falles360.fallerito-settings.v1';
const FALLAS_LIVE_MODULE_KEY = 'falles360.fallas-live-module.v1';
const APP_ONBOARDING_STORAGE_KEY = 'falles360.app-onboarding.v1';
const DEFAULT_TELEGRAM_STATUS: TelegramLinkStatus = {
  linked: false,
  telegramUsername: null,
  linkedAt: null,
};
const DEFAULT_CENDRA_SYNC_STATUS: CendraSyncStatus = {
  configured: false,
  sourceUrl: null,
  articlesTotal: 0,
  pendingTelegramArticles: 0,
  landingArticles: 0,
  latestArticlePublishedAt: null,
  latestRun: null,
  recentArticles: [],
};
const DEFAULT_ADMIN_TELEGRAM_FORM: TelegramAdminAlertPayload = {
  type: 'aviso',
  title: '',
  detail: '',
  location: '',
  footer: '',
  target: 'channel',
};
const PREVIEW_TAB_VALUES = ['Mapa', 'Social', 'Marketplace'] as const;
const DEVICE_PREVIEW_ALLOWED_EMAIL = 'marcbaixaulifigueres@gmail.com';

const APP_ONBOARDING_STEPS = [
  {
    tab: 'Mapa',
    icon: Compass,
    eyebrow: 'Paso 1',
    title: 'Empieza por el mapa',
    body: 'Aqui ves las fallas cercanas, los grupos por zoom y las rutas. Acercate para descubrir monumentos concretos.',
    helper: 'Toca un marcador para abrir su ficha o usa GPS para moverte por Valencia.',
  },
  {
    tab: 'Agenda',
    icon: CalendarDays,
    eyebrow: 'Paso 2',
    title: 'Consulta que pasa hoy',
    body: 'La agenda ordena actos, mascletaes, ofrendas y eventos por dia para que no pierdas lo importante.',
    helper: 'Desde aqui puedes volver al mapa cuando un evento tenga ubicacion.',
  },
  {
    tab: 'Fallerito',
    icon: Bot,
    eyebrow: 'Paso 3',
    title: 'Pregunta a Fallerito',
    body: 'El asistente te ayuda a planificar rutas, entender una falla o encontrar recomendaciones rapidas.',
    helper: 'Tambien puede abrir rutas y llevarte a apartados concretos.',
  },
  {
    tab: 'Fallas',
    icon: Flame,
    eyebrow: 'Paso 4',
    title: 'Explora el catalogo',
    body: 'Busca por nombre, seccion, barrio o artista. Guarda favoritas y abre el detalle completo de cada monumento.',
    helper: 'Usa filtros si quieres preparar una visita por zonas.',
  },
  {
    tab: 'Marketplace',
    icon: ShoppingBag,
    eyebrow: 'Paso 5',
    title: 'Descubre ofertas y experiencias',
    body: 'Marketplace reune restaurantes, cupones, merchandising y experiencias falleras utiles durante la visita.',
    helper: 'Cuando acabes esta guia, podras moverte libremente por toda la app.',
  },
] as const;

const MARKETPLACE_FILTERS = ['Ofertas', 'Merchandising', 'Cupones', 'Experiencias', 'Sponsors', 'Restaurantes', 'Cercanos'] as const;

const MARKETPLACE_BUSINESSES: MarketplaceBusiness[] = [
  {
    id: 'la-terreta',
    name: 'La Terreta',
    type: 'Restaurante',
    location: 'Ciutat Vella',
    distance: '350 m',
    promotion: 'Menu fallero desde 14,90 EUR',
    actionLabel: 'Ver oferta',
    badge: 'Destacado',
    category: 'Restaurantes',
    plan: 'Premium/Fallas Boost',
    phone: '+34960000001',
    email: 'reservas@laterreta.example',
    whatsapp: '+34600000001',
    website: 'https://example.com/la-terreta',
    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'bar-el-casal',
    name: 'Bar El Casal',
    type: 'Bar',
    location: 'Ruzafa',
    distance: '180 m',
    promotion: '2x1 en bebida mostrando la app',
    actionLabel: 'Usar cupon',
    badge: 'Oferta cercana',
    category: 'Cupones',
    plan: 'Pro',
    phone: '+34960000002',
    whatsapp: '+34600000002',
    imageUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'tienda-fallera-valencia',
    name: 'Tienda Fallera Valencia',
    type: 'Merchandising',
    location: 'Extramurs',
    distance: '700 m',
    promotion: 'Pack recuerdo fallero',
    actionLabel: 'Ver producto',
    badge: 'Destacado',
    category: 'Merchandising',
    plan: 'Pro',
    email: 'tienda@fallera.example',
    website: 'https://example.com/tienda-fallera',
    imageUrl: 'https://images.unsplash.com/photo-1523381294911-8d3cead13475?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'valencia-fireworks-club',
    name: 'Valencia Fireworks Club',
    type: 'Experiencia',
    location: 'Alameda',
    distance: '1,2 km',
    promotion: 'Experiencia mascleta con guia local',
    actionLabel: 'Reservar',
    badge: 'Sponsor',
    category: 'Experiencias',
    plan: 'Premium/Fallas Boost',
    phone: '+34960000004',
    email: 'reservas@fireworksclub.example',
    whatsapp: '+34600000004',
    imageUrl: 'https://images.unsplash.com/photo-1533236897111-3e94666b2edf?auto=format&fit=crop&w=900&q=80',
  },
];

const MARKETPLACE_COUPONS: MarketplaceCoupon[] = [
  { id: 'discount-app', title: '10% descuento mostrando la app', business: 'La Terreta', condition: 'Valido en carta y menu fallero.', validUntil: 'Hasta el 19 de marzo', actionLabel: 'Guardar cupon' },
  { id: 'free-drink', title: 'Bebida gratis con menu fallero', business: 'Bar El Casal', condition: 'Una bebida por usuario registrado.', validUntil: 'Solo mediodia', actionLabel: 'Usar ahora' },
  { id: 'almuerzo-2x1', title: '2x1 en almuerzo', business: 'Forn del Ninot', condition: 'Disponible hasta fin de existencias.', validUntil: 'Hasta el 17 de marzo', actionLabel: 'Guardar cupon' },
  { id: 'merch-discount', title: 'Descuento en merchandising fallero', business: 'Tienda Fallera Valencia', condition: 'Aplicable a packs recuerdo.', validUntil: 'Campana Fallas', actionLabel: 'Usar ahora' },
];

const MARKETPLACE_PRODUCTS: MarketplaceProduct[] = [
  { id: 'camiseta-fallas360', name: 'Camiseta Fallas 360', price: '19,90 EUR', category: 'Textil', imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80' },
  { id: 'pulsera-fallera', name: 'Pulsera fallera', price: '6,90 EUR', category: 'Accesorios', imageUrl: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&q=80' },
  { id: 'guia-premium-rutas', name: 'Guia premium de rutas', price: '4,99 EUR', category: 'Digital', imageUrl: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=900&q=80' },
  { id: 'pack-recuerdo', name: 'Pack recuerdo Fallas', price: '24,90 EUR', category: 'Souvenir', imageUrl: 'https://images.unsplash.com/photo-1512909006721-3d6018887383?auto=format&fit=crop&w=900&q=80' },
  { id: 'merch-comisiones', name: 'Merchandising de comisiones', price: 'Desde 9,90 EUR', category: 'Comisiones', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80' },
];

const MARKETPLACE_EXPERIENCES: MarketplaceExperience[] = [
  { id: 'ruta-gastronomica', name: 'Ruta gastronomica', description: 'Bocados falleros por barrios con paradas cerca de fallas destacadas.', price: 'Desde 18 EUR', actionLabel: 'Reservar', location: 'Ciutat Vella', duration: '2 h', capacity: '12 plazas', businessName: 'La Terreta', imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=900&q=80', contactChannel: 'Reserva en app' },
  { id: 'tour-premiadas', name: 'Tour por fallas premiadas', description: 'Recorrido guiado por monumentos con premio y contexto artistico.', price: '12 EUR', actionLabel: 'Ver mas', location: 'Centro', duration: '90 min', capacity: '20 plazas', businessName: 'Fallas 360 Guides', imageUrl: 'https://images.unsplash.com/photo-1533236897111-3e94666b2edf?auto=format&fit=crop&w=900&q=80', contactChannel: 'Chat' },
  { id: 'experiencia-mascleta', name: 'Experiencia mascleta', description: 'Consejos, ubicacion recomendada y comercio asociado en la zona.', price: 'Gratis', actionLabel: 'Ver mas', location: 'Alameda', duration: '45 min', capacity: 'Libre', businessName: 'Valencia Fireworks Club', imageUrl: 'https://images.unsplash.com/photo-1533236897111-3e94666b2edf?auto=format&fit=crop&w=900&q=80', contactChannel: 'Info en app' },
  { id: 'visita-nocturna', name: 'Visita guiada nocturna', description: 'Plan nocturno con luces, ambiente y ofertas cercanas.', price: '15 EUR', actionLabel: 'Reservar', location: 'Ruzafa', duration: '2 h', capacity: '10 plazas', businessName: 'Fallas 360 Guides', imageUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=900&q=80', contactChannel: 'WhatsApp' },
  { id: 'pack-turistico', name: 'Pack turistico Fallas', description: 'Mapa, rutas, cupones y experiencias para visitantes.', price: '29 EUR', actionLabel: 'Reservar', location: 'Valencia', duration: '1 dia', capacity: 'Bajo reserva', businessName: 'Fallas 360', imageUrl: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=900&q=80', contactChannel: 'Email' },
];

function mapDashboardEventToAgendaEvent(event: DashboardEvent): AgendaEvent {
  return {
    id: event.id,
    title: event.title || 'Evento sin titulo',
    time: event.startTime ? event.startTime.slice(0, 5) : '--:--',
    location: event.locationName || event.address || 'Valencia',
    date: event.eventDate,
    type: event.categoryName || 'Agenda',
    description: event.description || 'Evento sin descripcion.',
    isLive: Boolean(event.isFeatured),
  };
}

function findAgendaSeasonStartEvent(events: AgendaEvent[]): AgendaEvent | null {
  return events.find((event) => {
    const searchableText = `${event.title} ${event.type} ${event.description}`.toLowerCase();
    return searchableText.includes('crid');
  }) ?? null;
}

function resolvePreferredAgendaDate(events: AgendaEvent[], fallbackDate: string): string {
  const availableDates = Array.from(new Set(events.map((event) => event.date).filter(Boolean))).sort();
  const today = toIsoDate(new Date());

  if (availableDates.length === 0) {
    return fallbackDate;
  }

  if (availableDates.includes(fallbackDate)) {
    return fallbackDate;
  }

  const firstAvailableDate = availableDates[0];
  const lastAvailableDate = availableDates[availableDates.length - 1];
  const fallbackTimestamp = Date.parse(`${fallbackDate}T00:00:00`);
  const firstAvailableTimestamp = Date.parse(`${firstAvailableDate}T00:00:00`);
  const lastAvailableTimestamp = Date.parse(`${lastAvailableDate}T00:00:00`);

  if (Number.isFinite(fallbackTimestamp) && Number.isFinite(firstAvailableTimestamp) && fallbackTimestamp < firstAvailableTimestamp) {
    const daysUntilFirstEvent = (firstAvailableTimestamp - fallbackTimestamp) / (1000 * 60 * 60 * 24);
    if (daysUntilFirstEvent > 45) {
      return fallbackDate;
    }
  }

  if (Number.isFinite(fallbackTimestamp) && Number.isFinite(lastAvailableTimestamp) && fallbackTimestamp > lastAvailableTimestamp) {
    return fallbackDate;
  }

  const nextUpcomingDate = availableDates.find((date) => date >= today);

  if (nextUpcomingDate) {
    return nextUpcomingDate;
  }

  return findAgendaSeasonStartEvent(events)?.date ?? availableDates[0];
}

function getAgendaTypeBadgeClass(type: string): string {
  const normalizedType = type.trim().toLowerCase();

  if (normalizedType.includes('masclet')) {
    return 'bg-orange-100 text-orange-600';
  }

  if (normalizedType.includes('ofrenda')) {
    return 'bg-pink-100 text-pink-600';
  }

  if (normalizedType.includes('crem')) {
    return 'bg-slate-200 text-slate-700';
  }

  if (normalizedType.includes('castillo') || normalizedType.includes('foc') || normalizedType.includes('pirote')) {
    return 'bg-purple-100 text-purple-600';
  }

  return 'bg-sky-100 text-sky-600';
}

const MAP_HEADER_COLLAPSE_SCROLL_Y = 140;
const MAP_HEADER_EXPAND_SCROLL_Y = 72;
const ADMIN_TELEGRAM_TEMPLATES: AdminTelegramTemplate[] = [
  {
    key: 'ultima-hora-fallera',
    name: 'Ultima hora fallera',
    summary: 'Titular profesional con tono de noticia y contexto rapido para canal y usuarios.',
    type: 'novedad',
    target: 'both',
    title: 'Ã°Å¸â€Â¥ Falles360 confirma una actualizacion relevante para la jornada de hoy',
    detail: 'La organizacion ya ha trasladado una novedad que afecta al desarrollo previsto de la jornada fallera.\nÃ°Å¸â€œÂ° Nuestro equipo ha revisado la informacion disponible y ya la ha incorporado a la cobertura para que puedas seguir el dia con contexto y sin perder tiempo.',
    location: 'Valencia Ã‚Â· recorrido oficial',
    footer: 'Consulta la app para ver el seguimiento completo y los cambios confirmados.',
  },
  {
    key: 'cambio-horario',
    name: 'Cambio de horario',
    summary: 'Plantilla editorial para reprogramaciones, con tono claro y directo.',
    type: 'aviso',
    target: 'both',
    title: 'Ã¢ÂÂ° La agenda de Falles360 actualiza el horario de un acto previsto para hoy',
    detail: 'La programacion oficial ha sido revisada y el evento afectado modifica su hora de inicio respecto a la prevista inicialmente.\nÃ°Å¸â€œÂ Antes de desplazarte, consulta la agenda actualizada para evitar esperas innecesarias y seguir el recorrido con la informacion correcta.',
    location: 'Acto y zona pendientes de confirmar',
    footer: 'La agenda revisada ya esta disponible en la app.',
  },
  {
    key: 'novedad-destacada',
    name: 'Novedad destacada',
    summary: 'Formato de lanzamiento para estrenos, mejoras o cobertura especial.',
    type: 'novedad',
    target: 'channel',
    title: 'Ã°Å¸Å½â€  Falles360 estrena nuevo contenido para seguir la fiesta con mas detalle',
    detail: 'La app incorpora novedades pensadas para mejorar la experiencia durante la jornada: rutas mas claras, seguimiento mas rapido y nuevos puntos de interes.\nÃ°Å¸â€œÂ² La actualizacion ya esta disponible para quienes quieran consultar la cobertura con una vision mas completa.',
    location: '',
    footer: 'Abre la app y descubre las novedades destacadas del dia.',
  },
  {
    key: 'ruta-recomendada',
    name: 'Ruta recomendada',
    summary: 'Mensaje curado con tono de recomendacion profesional y enfoque practico.',
    type: 'ruta',
    target: 'channel',
    title: 'Ã°Å¸â€”ÂºÃ¯Â¸Â Esta es la ruta recomendada por Falles360 para esta franja del dia',
    detail: 'El recorrido ha sido seleccionado para combinar monumentos destacados, mejor fluidez peatonal y una experiencia mas comoda en las zonas con mayor actividad.\nÃ°Å¸Å¡Â¶ Ideal para quienes quieren optimizar el tiempo sin renunciar a los puntos mas representativos de la fiesta.',
    location: 'Centro de Valencia',
    footer: 'Consulta la ruta completa y su mapa interactivo en la app.',
  },
  {
    key: 'movilidad-accesos',
    name: 'Movilidad y accesos',
    summary: 'Plantilla operativa para cortes, accesos y recomendaciones de desplazamiento.',
    type: 'aviso',
    target: 'both',
    title: 'Ã°Å¸Å¡Â§ Falles360 recomienda revisar accesos y movilidad antes del siguiente desplazamiento',
    detail: 'Durante las proximas horas se esperan restricciones puntuales en varios puntos del recorrido fallero.\nÃ°Å¸Å¡â€¡ Para reducir incidencias, se aconseja planificar el trayecto con antelacion y priorizar los accesos marcados como recomendados en la app.',
    location: 'Entorno del recorrido oficial',
    footer: 'Sigue la app para cambios confirmados de acceso y movilidad.',
  },
  {
    key: 'cobertura-en-directo',
    name: 'Cobertura en directo',
    summary: 'Mensaje de seguimiento continuo para mantener el tono de medio y servicio.',
    type: 'novedad',
    target: 'users',
    title: 'Ã°Å¸â€œÂ¡ Falles360 mantiene activa la cobertura de la jornada en tiempo real',
    detail: 'Seguiremos publicando avisos, novedades y cambios relevantes a medida que avance la actividad fallera.\nÃ°Å¸â€â€ Si quieres recibir una experiencia mas precisa, revisa tus favoritos y mantente atento a las actualizaciones del dia.',
    location: '',
    footer: 'Gracias por seguir la cobertura de Falles360.',
  },
];

function resolveDashboardBasePath(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  const pathname = window.location.pathname;
  const dashboardIndex = pathname.indexOf('/dashboard');

  if (dashboardIndex === -1) {
    return '';
  }

  return pathname.slice(0, dashboardIndex);
}

function buildProjectAssetUrl(relativePath: string): string {
  const segments = relativePath
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment));

  return `${resolveDashboardBasePath() || ''}/${segments.join('/')}`;
}

function resolveProfileEndpoint(): string {
  return `${resolveDashboardBasePath() || ''}/api/profile.php`;
}

function resolveMarketplaceEndpoint(): string {
  return `${resolveDashboardBasePath() || ''}/api/marketplace.php`;
}

function resolveNewsEndpoint(): string {
  return `${resolveDashboardBasePath() || ''}/api/news.php?limit=3`;
}

function resolveLoginUrl(): string {
  return `${resolveDashboardBasePath() || ''}/login.php`;
}

function resolveLogoutUrl(): string {
  return `${resolveDashboardBasePath() || ''}/logout.php`;
}

function formatDashboardDateTime(value: string | null | undefined): string {
  if (!value) {
    return 'Sin datos';
  }

  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function compactStoryText(value: string | null | undefined, fallback = ''): string {
  const normalized = (value ?? fallback).replace(/\s+/g, ' ').trim();
  return normalized.length > 0 ? normalized : fallback;
}

function storySafeFileName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'historia-falles360';
}

function storyWrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = compactStoryText(text).split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (context.measureText(nextLine).width <= maxWidth) {
      currentLine = nextLine;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    currentLine = word;

    if (lines.length >= maxLines) {
      break;
    }
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[.,;:!?]+$/, '')}...`;
  }

  return lines;
}

function storyFitFontSize(context: CanvasRenderingContext2D, text: string, maxWidth: number, baseSize: number, minSize: number, fontWeight = 900): number {
  let fontSize = baseSize;

  while (fontSize > minSize) {
    context.font = `${fontWeight} ${fontSize}px Arial, sans-serif`;

    if (context.measureText(text).width <= maxWidth) {
      return fontSize;
    }

    fontSize -= 2;
  }

  return minSize;
}

function drawStoryRoundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function drawStoryDottedColumn(context: CanvasRenderingContext2D, x: number, y: number, rows: number, color: string): void {
  context.fillStyle = color;

  for (let row = 0; row < rows; row += 1) {
    context.beginPath();
    context.arc(x, y + row * 26, 3.2, 0, Math.PI * 2);
    context.fill();
  }
}

function downloadCendraStoryImage(article: CendraRecentArticle): void {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('No se pudo preparar la imagen de historia.');
  }

  const background = context.createLinearGradient(0, 0, 1080, 1920);
  background.addColorStop(0, '#ffe8bd');
  background.addColorStop(0.22, '#ff9b5f');
  background.addColorStop(0.56, '#ff3d0a');
  background.addColorStop(1, '#071326');
  context.fillStyle = background;
  context.fillRect(0, 0, 1080, 1920);

  context.globalAlpha = 0.18;
  context.fillStyle = '#ffffff';
  context.beginPath();
  context.arc(1020, 250, 420, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.arc(980, 910, 310, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = 0.12;
  context.beginPath();
  context.arc(800, 1870, 260, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.arc(-80, 510, 190, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = 1;

  drawStoryDottedColumn(context, 1030, 355, 11, 'rgba(255,255,255,0.46)');
  drawStoryDottedColumn(context, 1056, 355, 11, 'rgba(255,255,255,0.32)');
  drawStoryDottedColumn(context, 16, 1572, 11, 'rgba(255,255,255,0.2)');
  drawStoryDottedColumn(context, 42, 1572, 11, 'rgba(255,255,255,0.16)');

  context.shadowColor = 'rgba(15,23,42,0.2)';
  context.shadowBlur = 30;
  context.shadowOffsetY = 22;
  drawStoryRoundRect(context, 48, 100, 984, 188, 36);
  context.fillStyle = 'rgba(255,255,255,0.96)';
  context.fill();
  context.shadowColor = 'transparent';
  context.shadowBlur = 0;
  context.shadowOffsetY = 0;

  context.fillStyle = '#111827';
  context.font = '900 72px Arial, sans-serif';
  context.fillText('Falles', 92, 214);
  context.fillStyle = '#ff3d0a';
  context.fillText('360', 354, 214);
  context.strokeStyle = '#d6dbe4';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(544, 138);
  context.lineTo(544, 240);
  context.stroke();
  context.fillStyle = '#58677c';
  const headerKicker = 'NOTÍCIA PER A HISTÒRIES';
  context.font = `900 ${storyFitFontSize(context, headerKicker, 380, 25, 20)}px Arial, sans-serif`;
  context.fillText(headerKicker, 590, 195);

  const category = compactStoryText(article.category, 'Actualitat fallera').toUpperCase();
  drawStoryRoundRect(context, 76, 368, 436, 72, 36);
  context.fillStyle = '#071326';
  context.fill();
  context.fillStyle = '#ffffff';
  context.font = '900 29px Arial, sans-serif';
  context.fillText(category.slice(0, 24), 120, 414);

  context.fillStyle = '#ffffff';
  context.shadowColor = 'rgba(75,18,6,0.34)';
  context.shadowBlur = 12;
  context.shadowOffsetY = 8;
  const title = compactStoryText(article.title, 'Nova notícia fallera');
  const titleFontSize = title.length > 86 ? 63 : title.length > 64 ? 68 : 74;
  context.font = `900 ${titleFontSize}px Arial, sans-serif`;
  const titleLines = storyWrapText(context, title, 900, 7);
  const titleLineHeight = titleFontSize + 16;
  titleLines.forEach((line, index) => {
    context.fillText(line, 76, 580 + index * titleLineHeight);
  });
  context.shadowColor = 'transparent';
  context.shadowBlur = 0;
  context.shadowOffsetY = 0;

  context.shadowColor = 'rgba(15,23,42,0.24)';
  context.shadowBlur = 26;
  context.shadowOffsetY = 16;
  drawStoryRoundRect(context, 76, 1150, 928, 388, 42);
  context.fillStyle = 'rgba(255,255,255,0.94)';
  context.fill();
  context.shadowColor = 'transparent';
  context.shadowBlur = 0;
  context.shadowOffsetY = 0;

  context.fillStyle = '#ff4b12';
  context.beginPath();
  context.arc(184, 1222, 57, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = '#ffffff';
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(154, 1250);
  context.lineTo(214, 1250);
  context.moveTo(164, 1250);
  context.lineTo(164, 1218);
  context.lineTo(184, 1186);
  context.lineTo(204, 1218);
  context.lineTo(204, 1250);
  context.moveTo(176, 1250);
  context.lineTo(176, 1218);
  context.moveTo(192, 1250);
  context.lineTo(192, 1218);
  context.stroke();

  context.fillStyle = '#111827';
  context.font = '500 34px Arial, sans-serif';
  const summary = compactStoryText(article.excerpt || article.summary, 'La jornada fallera suma una nova actualització destacada. Falles360 la prepara en format directe perquè arribe clara, visual i llesta per a xarxes.');
  storyWrapText(context, summary, 790, 5).forEach((line, index) => {
    context.fillText(line, 136, 1346 + index * 54);
  });

  context.fillStyle = '#ffffff';
  context.globalAlpha = 0.28;
  context.beginPath();
  context.arc(136, 1720, 50, 0, Math.PI * 2);
  context.strokeStyle = '#ffffff';
  context.lineWidth = 4;
  context.stroke();
  context.globalAlpha = 1;
  context.strokeStyle = '#ffffff';
  context.lineWidth = 5;
  context.beginPath();
  context.moveTo(112, 1744);
  context.lineTo(160, 1744);
  context.moveTo(122, 1744);
  context.lineTo(122, 1716);
  context.lineTo(136, 1692);
  context.lineTo(150, 1716);
  context.lineTo(150, 1744);
  context.stroke();
  context.font = '900 31px Arial, sans-serif';
  context.fillText('Fuente: Falles360', 218, 1706);
  context.fillStyle = '#ffd2a5';
  context.font = '800 28px Arial, sans-serif';
  context.fillText('Més informació en Falles360', 218, 1748);
  context.fillStyle = '#ff5b19';
  context.fillRect(218, 1776, 102, 4);

  const link = document.createElement('a');
  link.download = `${storySafeFileName(article.title)}-falles360-story.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function buildCendraStoryCaption(article: CendraRecentArticle): string {
  const summary = compactStoryText(article.excerpt || article.summary, 'La informació fallera, resumida i preparada per compartir des de Falles360.');
  const sourceUrl = compactStoryText(article.url);
  return [
    compactStoryText(article.title, 'Nova notícia fallera'),
    '',
    summary,
    '',
    'Fuente: Falles360',
    'Format història preparat per Falles360',
    sourceUrl,
  ].filter(Boolean).join('\n');
}

function readRuntimePreviewSettings(): {
  isEmbedded: boolean;
  previewTab?: (typeof PREVIEW_TAB_VALUES)[number];
  previewTheme?: 'dark' | 'light';
} {
  if (typeof window === 'undefined') {
    return { isEmbedded: false };
  }

  const params = new URL(window.location.href).searchParams;
  const previewTabParam = params.get('previewTab');
  const previewThemeParam = params.get('previewTheme');
  const previewTab = PREVIEW_TAB_VALUES.find((value) => value === previewTabParam);
  const previewTheme = previewThemeParam === 'dark' || previewThemeParam === 'light'
    ? previewThemeParam
    : undefined;

  return {
    isEmbedded: params.get('previewEmbed') === '1',
    previewTab,
    previewTheme,
  };
}

function resolveInitialActiveTab(): string {
  return readRuntimePreviewSettings().previewTab ?? 'Mapa';
}

function shouldShowAppOnboarding(isEmbeddedPreview: boolean): boolean {
  if (isEmbeddedPreview || typeof window === 'undefined') {
    return false;
  }

  try {
    return window.localStorage.getItem(APP_ONBOARDING_STORAGE_KEY) !== 'completed';
  } catch {
    return true;
  }
}

function persistAppOnboardingCompleted(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(APP_ONBOARDING_STORAGE_KEY, 'completed');
  } catch {
    // Si localStorage no esta disponible, al menos cerramos la guia en memoria.
  }
}

function resolveInitialFallasLiveModuleEnabled(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }

  try {
    return window.localStorage.getItem(FALLAS_LIVE_MODULE_KEY) !== 'off';
  } catch {
    return true;
  }
}

function resolveInitialDarkMode(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const runtimePreview = readRuntimePreviewSettings();

  if (runtimePreview.previewTheme === 'dark') {
    return true;
  }

  if (runtimePreview.previewTheme === 'light') {
    return false;
  }

  try {
    const storedTheme = window.localStorage.getItem(DASHBOARD_THEME_STORAGE_KEY);

    if (storedTheme === 'dark') {
      return true;
    }

    if (storedTheme === 'light') {
      return false;
    }
  } catch {
    // Si localStorage falla, usa el modo claro por defecto.
  }

  return false;
}

function applyDashboardTheme(isDarkMode: boolean, options: { persist?: boolean } = {}): void {
  if (typeof document === 'undefined') {
    return;
  }

  const theme = isDarkMode ? 'dark' : 'light';
  const root = document.documentElement;
  const body = document.body;

  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  body.classList.toggle('theme-dark', isDarkMode);
  body.classList.toggle('theme-light', !isDarkMode);

  if (options.persist === false) {
    return;
  }

  try {
    window.localStorage.setItem(DASHBOARD_THEME_STORAGE_KEY, theme);
  } catch {
    // Mantiene el tema activo aunque no se pueda persistir.
  }
}

function buildViewerHandle(name: string): string {
  const normalized = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');

  return `@${normalized || 'falles360'}`;
}

function buildViewerAvatar(name: string, accessType: AppViewer['accessType']): string {
  return `https://i.pravatar.cc/150?u=${encodeURIComponent(`${accessType}-${name.trim() || 'falles360'}`)}`;
}

function buildViewerInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  const initials = parts.map((part) => part.charAt(0).toUpperCase()).join('');
  return initials || 'F';
}

function readStoredViewerPreferences(): StoredViewerPreferences | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(VIEWER_PREFERENCES_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as StoredViewerPreferences;
    return {
      location: typeof parsed.location === 'string' ? parsed.location : undefined,
      avatar: typeof parsed.avatar === 'string' ? parsed.avatar : undefined,
      devicePreviewMode: isDevicePreviewMode(parsed.devicePreviewMode) ? parsed.devicePreviewMode : undefined,
    };
  } catch {
    return null;
  }
}

function writeStoredViewerPreferencesPatch(patch: Partial<StoredViewerPreferences>): void {
  if (typeof window === 'undefined') {
    return;
  }

  const current = readStoredViewerPreferences() ?? {};

  window.localStorage.setItem(VIEWER_PREFERENCES_KEY, JSON.stringify({
    ...current,
    ...patch,
  }));
}

function applyStoredViewerPreferences(baseViewer: AppViewer, preferences: StoredViewerPreferences | null): AppViewer {
  if (!preferences) {
    return baseViewer;
  }

  return {
    ...baseViewer,
    location: preferences.location?.trim() || baseViewer.location,
    avatar: preferences.avatar?.trim() || baseViewer.avatar,
  };
}

function resolveInitialDevicePreviewMode(): DevicePreviewMode {
  return readStoredViewerPreferences()?.devicePreviewMode ?? 'mobile';
}

function buildDevicePreviewUrl(activeTab: string, isDarkMode: boolean): string {
  if (typeof window === 'undefined') {
    return '';
  }

  const previewUrl = new URL(window.location.href);
  previewUrl.searchParams.delete('previewEmbed');
  previewUrl.searchParams.delete('previewTab');
  previewUrl.searchParams.delete('previewTheme');
  previewUrl.searchParams.set('previewEmbed', '1');
  previewUrl.searchParams.set('previewTheme', isDarkMode ? 'dark' : 'light');

  if (PREVIEW_TAB_VALUES.includes(activeTab as (typeof PREVIEW_TAB_VALUES)[number])) {
    previewUrl.searchParams.set('previewTab', activeTab);
  }

  return previewUrl.toString();
}

function mapProfileToViewer(profile: NonNullable<ProfileApiResponse['profile']>): AppViewer {
  const accessType = profile.type === 'guest' ? 'guest' : 'user';
  const baseViewer = accessType === 'guest' ? APP_GUEST_VIEWER : APP_VIEWER;
  const resolvedName = (profile.name || '').trim() || baseViewer.name;
  const resolvedId = profile.id !== null && profile.id !== undefined && String(profile.id).trim().length > 0
    ? String(profile.id)
    : baseViewer.id;
  const resolvedLocation = (profile.location || '').trim() || baseViewer.location;

  return {
    ...baseViewer,
    id: resolvedId,
    name: resolvedName,
    handle: buildViewerHandle(resolvedName),
    avatar: buildViewerAvatar(resolvedName, accessType),
    location: resolvedLocation,
    email: profile.email ?? baseViewer.email ?? null,
    role: (profile.role || (accessType === 'guest' ? 'guest' : 'user')).trim() || (accessType === 'guest' ? 'guest' : 'user'),
    accessType,
    isRegistered: accessType === 'user',
  };
}

function applyViewerSettings(baseViewer: AppViewer, settings: Pick<AppViewer, 'name' | 'location' | 'avatar'>): AppViewer {
  const resolvedName = settings.name.trim() || baseViewer.name;

  return {
    ...baseViewer,
    name: resolvedName,
    handle: buildViewerHandle(resolvedName),
    location: settings.location.trim() || baseViewer.location,
    avatar: settings.avatar.trim() || baseViewer.avatar,
  };
}

type DashboardIcon = React.ComponentType<{ className?: string }>;

function DashboardSurface({
  isDarkMode,
  className,
  children,
}: {
  isDarkMode: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-[18px] border p-4 shadow-[0_14px_30px_rgba(15,23,42,0.08)] transition-all duration-300 backdrop-blur-xl sm:p-5',
        isDarkMode
          ? 'border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.78),rgba(15,23,42,0.66))]'
          : 'border-slate-200/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.9))]',
        className
      )}
    >
      {children}
    </div>
  );
}

function DashboardStatusBanner({
  isDarkMode,
  eyebrow,
  message,
}: {
  isDarkMode: boolean;
  eyebrow: string;
  message: string;
}) {
  return (
    <div
      className={cn(
        'rounded-[1rem] border px-4 py-3 shadow-[0_14px_34px_-24px_rgba(15,23,42,0.24)]',
        isDarkMode ? 'border-white/10 bg-white/[0.05] text-white' : 'border-slate-200 bg-white/95 text-slate-900'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full', isDarkMode ? 'bg-white/10 text-brand-light' : 'bg-[#fff1ea] text-brand')}>
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className={cn('text-[10px] font-black uppercase tracking-[0.16em]', isDarkMode ? 'text-white/56' : 'text-slate-500')}>
            {eyebrow}
          </p>
          <p className="mt-1 text-sm font-bold leading-5">{message}</p>
        </div>
      </div>
    </div>
  );
}

function DashboardMetric({
  isDarkMode,
  icon: Icon,
  label,
  value,
  helper,
}: {
  isDarkMode: boolean;
  icon: DashboardIcon;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div
      className={cn(
        'rounded-[14px] border p-3.5',
        isDarkMode
          ? 'border-white/12 bg-white/[0.06]'
          : 'border-slate-200/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))]'
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-[12px]',
            isDarkMode ? 'bg-brand/18 text-brand' : 'bg-brand/12 text-brand'
          )}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold opacity-60">{label}</p>
          <p className="mt-1 text-[1.3rem] font-black leading-none tracking-tight">{value}</p>
        </div>
      </div>
      <p className="mt-2.5 text-[13px] font-medium leading-5 opacity-75">{helper}</p>
    </div>
  );
}

function MarketplaceView({
  isDarkMode,
  nearbyContextName,
  onOpenMap,
  canEditMarketplace = false,
}: {
  isDarkMode: boolean;
  nearbyContextName?: string;
  onOpenMap: () => void;
  canEditMarketplace?: boolean;
}) {
  const [marketplaceSearch, setMarketplaceSearch] = useState('');
  const [activeMarketplaceFilter, setActiveMarketplaceFilter] = useState<string>('Ofertas');
  const [activeProductCategory, setActiveProductCategory] = useState<string>('Decoración');
  const [isMarketplaceChatsOpen, setIsMarketplaceChatsOpen] = useState(false);
  const [marketplaceNotice, setMarketplaceNotice] = useState<string | null>(null);
  const [savedCouponIds, setSavedCouponIds] = useState<string[]>([]);
  const [usedCouponIds, setUsedCouponIds] = useState<string[]>([]);
  const [redeemingCoupon, setRedeemingCoupon] = useState<MarketplaceCoupon | null>(null);
  const [cartProductIds, setCartProductIds] = useState<string[]>([]);
  const [isMarketplaceEditorOpen, setIsMarketplaceEditorOpen] = useState(false);
  const [marketplaceEditorDraft, setMarketplaceEditorDraft] = useState<MarketplacePayload | null>(null);
  const [marketplaceEditorNotice, setMarketplaceEditorNotice] = useState<string | null>(null);
  const [isMarketplaceSaving, setIsMarketplaceSaving] = useState(false);
  const [marketplaceEditorSection, setMarketplaceEditorSection] = useState<'cover' | 'businesses' | 'coupons' | 'products' | 'experiences'>('businesses');
  const [marketplaceEditorSelectedIndex, setMarketplaceEditorSelectedIndex] = useState(0);
  const [marketplaceData, setMarketplaceData] = useState<MarketplacePayload>({
    managed: true,
    settings: {},
    filters: [],
    businesses: [],
    coupons: [],
    products: [],
    experiences: [],
  });
  const [marketplaceDetail, setMarketplaceDetail] = useState<null | {
    eyebrow: string;
    title: string;
    description: string;
    meta: string;
    imageUrl?: string;
    primaryAction: string;
    couponId?: string;
    business?: MarketplaceBusiness;
    offer?: {
      title: string;
      price: string;
      condition: string;
      distance: string;
    };
  }>(null);
  const [providerContactBusiness, setProviderContactBusiness] = useState<MarketplaceBusiness | null>(null);
  const [providerContactMessage, setProviderContactMessage] = useState('');
  const [providerContactSent, setProviderContactSent] = useState(false);
  const [isProviderContactSending, setIsProviderContactSending] = useState(false);
  const [providerContactChannel, setProviderContactChannel] = useState<'chat' | 'email'>('chat');
  const providerContactTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const providerContactSentTimerRef = useRef<number | null>(null);
  const [providerContactThreads, setProviderContactThreads] = useState<Record<string, MarketplaceContactThread>>(() => {
    if (typeof window === 'undefined') {
      return {};
    }

    try {
      const raw = window.localStorage.getItem(MARKETPLACE_CONTACT_THREADS_KEY);
      if (!raw) {
        return {};
      }

      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed as Record<string, MarketplaceContactThread> : {};
    } catch {
      return {};
    }
  });
  const activeProviderThread = providerContactBusiness ? providerContactThreads[providerContactBusiness.id] : null;
  const marketplaceContactThreadList = Object.values(providerContactThreads).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const filterIcons: Record<string, DashboardIcon> = {
    Ofertas: BadgePercent,
    Restaurantes: Utensils,
    Cupones: Tag,
    Merchandising: ShoppingBag,
    Experiencias: Star,
    Sponsors: Crown,
    Cercanos: MapPin,
    Populares: Star,
  };
  const marketplaceBusinesses = marketplaceData.businesses ?? [];
  const marketplaceCoupons = marketplaceData.coupons ?? [];
  const marketplaceProducts = marketplaceData.products ?? [];
  const marketplaceExperiences = marketplaceData.experiences ?? [];
  const marketplaceSettings = marketplaceData.settings ?? {};
  const marketplaceFilters = marketplaceData.filters?.length
    ? [...marketplaceData.filters].sort((left, right) => left.sortOrder - right.sortOrder)
    : [];
  const marketplaceSectionsByCategory: Record<string, string> = {
    Ofertas: 'marketplace-featured',
    Restaurantes: 'marketplace-featured',
    Cupones: 'marketplace-coupon',
    Merchandising: 'marketplace-products',
    Experiencias: 'marketplace-experiences',
    Sponsors: 'marketplace-sponsors',
    Cercanos: 'marketplace-offers',
    Populares: 'marketplace-recommended',
  };
  const firstCoupon = marketplaceCoupons[0] ?? null;
  const sponsorBusinesses = marketplaceBusinesses.filter((business) => business.badge === 'Sponsor' || business.category === 'Sponsors');
  const quickMarketplaceFilters = marketplaceFilters.slice(0, 5);
  const marketplaceEditorCollections = [
    { key: 'businesses', label: 'Negocios', empty: { id: `business-draft-${Date.now()}`, name: '', type: 'Restaurante', location: 'Valencia', distance: '', promotion: '', actionLabel: 'Ver oferta', badge: 'Destacado', category: 'Restaurantes', imageUrl: '', plan: 'Basico', phone: '', email: '', whatsapp: '', website: '' } },
    { key: 'coupons', label: 'Cupones', empty: { id: `coupon-draft-${Date.now()}`, title: '', business: '', condition: '', validUntil: 'Hoy 23:59', actionLabel: 'Usar cupon' } },
    { key: 'products', label: 'Productos', empty: { id: `product-draft-${Date.now()}`, name: '', price: '', category: 'Merchandising', imageUrl: '' } },
    { key: 'experiences', label: 'Experiencias', empty: { id: `experience-draft-${Date.now()}`, name: '', description: '', price: '', actionLabel: 'Reservar', location: '', duration: '', capacity: '', businessName: '', imageUrl: '', contactChannel: '' } },
  ] as const;

  useEffect(() => {
    let cancelled = false;
    fetch(resolveMarketplaceEndpoint())
      .then((response) => response.ok ? response.json() : null)
      .then((payload: MarketplacePayload | null) => {
        if (!cancelled && payload) {
          const managed = payload.managed === true;
          setMarketplaceData({
            managed,
            settings: payload.settings ?? {},
            filters: Array.isArray(payload.filters) ? payload.filters : [],
            businesses: Array.isArray(payload.businesses) ? payload.businesses : [],
            coupons: Array.isArray(payload.coupons) ? payload.coupons : [],
            products: Array.isArray(payload.products) ? payload.products : [],
            experiences: Array.isArray(payload.experiences) ? payload.experiences : [],
          });
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(MARKETPLACE_CONTACT_THREADS_KEY, JSON.stringify(providerContactThreads));
    } catch {
      // Mantiene el chat en memoria si el almacenamiento local no esta disponible.
    }
  }, [providerContactThreads]);

  useEffect(() => () => {
    if (providerContactSentTimerRef.current) {
      window.clearTimeout(providerContactSentTimerRef.current);
    }
  }, []);

  const normalizedSearch = marketplaceSearch.trim().toLowerCase();
  const activeFilter = marketplaceFilters.find((filter) => filter.label === activeMarketplaceFilter || filter.category === activeMarketplaceFilter);
  const activeFilterCategory = activeFilter?.category ?? activeMarketplaceFilter;
  const filteredBusinesses = marketplaceBusinesses.filter((business) => {
    const matchesSearch = normalizedSearch.length === 0
      || `${business.name} ${business.type} ${business.location} ${business.promotion}`.toLowerCase().includes(normalizedSearch);
    const matchesFilter = activeFilterCategory === 'Ofertas' || activeFilterCategory === 'Populares'
      ? true
      : activeFilterCategory === 'Sponsors'
      ? business.badge === 'Sponsor'
      : activeFilterCategory === 'Cercanos'
        ? business.badge === 'Oferta cercana' || business.distance.includes('m')
        : business.category === activeFilterCategory;

    return matchesSearch && matchesFilter;
  });
  const visibleBusinesses = filteredBusinesses;
  const heroBusiness = marketplaceBusinesses.find((business) => business.id === 'la-terreta')
    ?? visibleBusinesses[0]
    ?? null;
  const marketplaceItemsTotal = marketplaceBusinesses.length + marketplaceCoupons.length + marketplaceProducts.length + marketplaceExperiences.length;
  const hasMarketplaceContent = marketplaceItemsTotal > 0;
  type NearbyMarketplaceOffer = {
    id: string;
    title: string;
    price: string;
    distance: string;
    condition: string;
    actionLabel: string;
    couponId?: string;
    icon: DashboardIcon;
    imageUrl: string;
  };
  const nearbyOffers: NearbyMarketplaceOffer[] = [];
  const marketplaceRecommendationItems: Array<[string, string, string, string, string]> = [
    ...marketplaceCoupons.map((coupon) => [coupon.title, coupon.condition, coupon.validUntil, 'Cupon', heroBusiness?.imageUrl ?? ''] as [string, string, string, string, string]),
    ...marketplaceProducts.map((product) => [product.name, product.price, 'Online', 'Tienda', product.imageUrl] as [string, string, string, string, string]),
    ...marketplaceExperiences.map((experience) => [experience.name, experience.price, experience.duration || experience.location || 'Experiencia', 'Experiencia', experience.imageUrl || heroBusiness?.imageUrl || marketplaceBusinesses[0]?.imageUrl || ''] as [string, string, string, string, string]),
  ].filter((item) => item[4]);
  const marketplaceSectionTabs = [
    { label: 'Ofertas', filter: 'Ofertas', sectionId: 'marketplace-featured', icon: BadgePercent },
    { label: 'Productos', filter: 'Merchandising', sectionId: 'marketplace-products', icon: ShoppingBag },
    { label: 'Cupones', filter: 'Cupones', sectionId: 'marketplace-coupon', icon: Tag },
    { label: 'Experiencias', filter: 'Experiencias', sectionId: 'marketplace-experiences', icon: Star },
    { label: 'Proveedores', filter: 'Sponsors', sectionId: 'marketplace-sponsors', icon: UsersRound },
  ];
  const activeMarketplaceSection = activeFilterCategory === 'Sponsors'
    ? 'providers'
    : activeFilterCategory === 'Cupones'
      ? 'coupons'
      : activeFilterCategory === 'Experiencias'
        ? 'experiences'
        : activeFilterCategory === 'Merchandising'
          ? 'products'
          : 'offers';
  const isMarketplaceOffersOverview = activeMarketplaceSection === 'offers';
  const visibleCoupons = marketplaceCoupons.filter((coupon) => {
    const matchesSearch = normalizedSearch.length === 0
      || `${coupon.title} ${coupon.business} ${coupon.condition}`.toLowerCase().includes(normalizedSearch);
    return matchesSearch && (isMarketplaceOffersOverview || activeMarketplaceSection === 'coupons');
  });
  const visibleProducts = marketplaceProducts.filter((product) => {
    const matchesSearch = normalizedSearch.length === 0
      || `${product.name} ${product.category} ${product.price}`.toLowerCase().includes(normalizedSearch);
    const normalizedProductCategory = product.category.toLowerCase();
    const normalizedActiveProductCategory = activeProductCategory.toLowerCase();
    const matchesProductCategory = activeMarketplaceSection !== 'products'
      || activeProductCategory === ''
      || normalizedProductCategory.includes(normalizedActiveProductCategory)
      || normalizedActiveProductCategory.includes(normalizedProductCategory);
    return matchesSearch && (isMarketplaceOffersOverview || activeMarketplaceSection === 'products') && matchesProductCategory;
  });
  const visibleExperiences = marketplaceExperiences.filter((experience) => {
    const matchesSearch = normalizedSearch.length === 0
      || `${experience.name} ${experience.description} ${experience.price} ${experience.location ?? ''} ${experience.duration ?? ''} ${experience.capacity ?? ''} ${experience.businessName ?? ''} ${experience.contactChannel ?? ''}`.toLowerCase().includes(normalizedSearch);
    return matchesSearch && (isMarketplaceOffersOverview || activeMarketplaceSection === 'experiences');
  });
  const showMarketplaceNotice = (message: string) => {
    setMarketplaceNotice(message);
  };
  const openMarketplaceEditor = () => {
    setMarketplaceEditorDraft({
      managed: true,
      settings: { ...marketplaceSettings },
      filters: marketplaceFilters.map((filter) => ({ ...filter })),
      businesses: marketplaceBusinesses.map((business) => ({ ...business })),
      coupons: marketplaceCoupons.map((coupon) => ({ ...coupon })),
      products: marketplaceProducts.map((product) => ({ ...product })),
      experiences: marketplaceExperiences.map((experience) => ({ ...experience })),
    });
    setMarketplaceEditorNotice(null);
    setMarketplaceEditorSection('businesses');
    setMarketplaceEditorSelectedIndex(0);
    setIsMarketplaceEditorOpen(true);
  };
  const updateMarketplaceDraftSetting = (key: string, value: string) => {
    setMarketplaceEditorDraft((current) => ({
      ...(current ?? {}),
      settings: {
        ...(current?.settings ?? {}),
        [key]: value,
      },
    }));
  };
  const updateMarketplaceDraftItem = (
    collection: 'businesses' | 'coupons' | 'products' | 'experiences',
    index: number,
    field: string,
    value: string,
  ) => {
    setMarketplaceEditorDraft((current) => {
      const rows = [...(((current?.[collection] ?? []) as Array<Record<string, string>>))];
      rows[index] = { ...(rows[index] ?? {}), [field]: value };
      return { ...(current ?? {}), [collection]: rows };
    });
  };
  const addMarketplaceDraftItem = (
    collection: 'businesses' | 'coupons' | 'products' | 'experiences',
    emptyItem: Record<string, string>,
  ) => {
    setMarketplaceEditorDraft((current) => {
      const rows = [...(((current?.[collection] ?? []) as Array<Record<string, string>>))];
      rows.unshift({ ...emptyItem, id: `${collection}-draft-${Date.now()}` });
      return { ...(current ?? {}), [collection]: rows };
    });
    setMarketplaceEditorSection(collection);
    setMarketplaceEditorSelectedIndex(0);
  };
  const removeMarketplaceDraftItem = (
    collection: 'businesses' | 'coupons' | 'products' | 'experiences',
    index: number,
  ) => {
    setMarketplaceEditorDraft((current) => {
      const rows = [...(((current?.[collection] ?? []) as Array<Record<string, string>>))];
      rows.splice(index, 1);
      return { ...(current ?? {}), [collection]: rows };
    });
    setMarketplaceEditorSelectedIndex((current) => Math.max(0, Math.min(current, index - 1)));
  };
  const duplicateMarketplaceDraftItem = (
    collection: 'businesses' | 'coupons' | 'products' | 'experiences',
    index: number,
  ) => {
    setMarketplaceEditorDraft((current) => {
      const rows = [...(((current?.[collection] ?? []) as Array<Record<string, string>>))];
      const source = rows[index];
      if (!source) {
        return current;
      }
      rows.splice(index + 1, 0, {
        ...source,
        id: `${collection}-copy-${Date.now()}`,
        name: source.name ? `${source.name} copia` : source.name,
        title: source.title ? `${source.title} copia` : source.title,
      });
      return { ...(current ?? {}), [collection]: rows };
    });
    setMarketplaceEditorSection(collection);
    setMarketplaceEditorSelectedIndex(index + 1);
  };
  const saveMarketplaceEditor = async () => {
    if (!marketplaceEditorDraft) {
      return;
    }

    setIsMarketplaceSaving(true);
    setMarketplaceEditorNotice(null);

    try {
      const headers = await withCsrfHeadersAsync({
        'Content-Type': 'application/json',
        Accept: 'application/json',
      });
      const response = await fetch(resolveMarketplaceEndpoint(), {
        method: 'POST',
        credentials: 'same-origin',
        headers,
        body: JSON.stringify(marketplaceEditorDraft),
      });
      const payload = await response.json().catch(() => ({} as { ok?: boolean; message?: string; error?: string }));

      if (response.status === 401) {
        window.location.replace(resolveLoginUrl());
        return;
      }

      if (!response.ok || payload.ok === false) {
        throw new Error(payload.message || payload.error || 'No se pudo guardar el marketplace.');
      }

      setMarketplaceData(marketplaceEditorDraft);
      setMarketplaceEditorNotice('Cambios guardados. Ya se ven en la app.');
      showMarketplaceNotice('Marketplace actualizado');
    } catch (error) {
      setMarketplaceEditorNotice(error instanceof Error ? error.message : 'No se pudo guardar el marketplace.');
    } finally {
      setIsMarketplaceSaving(false);
    }
  };
  const scrollToMarketplaceSection = (sectionId: string) => {
    window.requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };
  const activateMarketplaceSection = (
    filter: string,
    sectionId: string,
    message: string,
  ) => {
    setMarketplaceSearch('');
    setActiveMarketplaceFilter(filter);
    showMarketplaceNotice(message);
    scrollToMarketplaceSection(sectionId);
  };
  const activateProductCategory = (category: string) => {
    setActiveMarketplaceFilter('Merchandising');
    setActiveProductCategory(category);
    showMarketplaceNotice(`Categoria: ${category}`);
    scrollToMarketplaceSection('marketplace-products');
  };
  const openMarketplaceDetail = (detail: NonNullable<typeof marketplaceDetail>) => {
    setMarketplaceDetail(detail);
    showMarketplaceNotice(`Abriendo: ${detail.title}`);
  };
  const normalizeProviderPhone = (value: string | undefined) => (value ?? '').replace(/[^\d+]/g, '');
  const resolveProviderContact = (business: MarketplaceBusiness) => {
    const phone = normalizeProviderPhone(business.phone);
    const whatsapp = normalizeProviderPhone(business.whatsapp || business.phone);
    return {
      phone,
      whatsapp,
      email: (business.email ?? '').trim(),
      website: (business.website ?? '').trim(),
    };
  };
  const buildProviderOfferMessage = (business: MarketplaceBusiness) => business.promotion || `${business.name} ha publicado una solicitud en el marketplace.`;
  const isLegacyProviderGreeting = (message: MarketplaceContactMessage | undefined) => (
    message?.from === 'provider'
    && message.text.toLowerCase().startsWith('hola, soy ')
  );
  const ensureProviderContactThread = (business: MarketplaceBusiness) => {
    const now = new Date().toISOString();
    setProviderContactThreads((current) => {
      const existing = current[business.id];
      if (existing && !isLegacyProviderGreeting(existing.messages[0])) {
        return current;
      }

      return {
        ...current,
        [business.id]: {
          ...(existing ?? {}),
          businessId: business.id,
          businessName: business.name,
          businessImageUrl: business.imageUrl,
          updatedAt: existing?.updatedAt ?? now,
          messages: [
            {
            id: `${business.id}-offer-${Date.now()}`,
            from: 'provider',
            text: buildProviderOfferMessage(business),
            createdAt: now,
            },
            ...(existing?.messages.slice(1) ?? []),
          ],
        },
      };
    });
  };
  const openProviderContact = (business: MarketplaceBusiness) => {
    ensureProviderContactThread(business);
    setProviderContactBusiness(business);
    setProviderContactMessage('');
    setProviderContactSent(false);
    setProviderContactChannel('chat');
    showMarketplaceNotice(`Contacto con ${business.name}`);
  };
  const openProviderThreadFromList = (thread: MarketplaceContactThread) => {
    const business = marketplaceBusinesses.find((item) => item.id === thread.businessId) ?? {
      id: thread.businessId,
      name: thread.businessName,
      type: 'Marketplace',
      location: '',
      distance: '',
      promotion: thread.messages.find((message) => message.from === 'provider')?.text ?? '',
      actionLabel: 'Contactar',
      badge: 'Chat abierto',
      category: 'Sponsors',
      imageUrl: thread.businessImageUrl,
      plan: 'Chat',
    };
    setIsMarketplaceChatsOpen(false);
    openProviderContact(business);
  };
  const contactProvider = (business: MarketplaceBusiness, channel?: 'phone' | 'whatsapp' | 'email' | 'website') => {
    if (!channel) {
      openProviderContact(business);
      return;
    }

    const contact = resolveProviderContact(business);
    const message = encodeURIComponent(`Hola ${business.name}, te contacto desde Falles360 por vuestra ficha de proveedor.`);

    if (channel === 'phone' && contact.phone) {
      window.location.href = `tel:${contact.phone}`;
      showMarketplaceNotice(`Llamando a ${business.name}`);
      return;
    }

    if (channel === 'email') {
      openProviderContact(business);
      setProviderContactChannel('email');
      window.setTimeout(() => providerContactTextareaRef.current?.focus(), 80);
      showMarketplaceNotice(contact.email ? 'Escribe el mensaje y se enviara por email' : 'Se enviara al correo de administracion del marketplace');
      return;
    }

    if (channel === 'website' && contact.website) {
      window.open(contact.website, '_blank', 'noopener,noreferrer');
      showMarketplaceNotice(`Abriendo web de ${business.name}`);
      return;
    }

    if (contact.whatsapp) {
      window.open(`https://wa.me/${contact.whatsapp.replace(/^\+/, '')}?text=${message}`, '_blank', 'noopener,noreferrer');
      showMarketplaceNotice(`WhatsApp abierto con ${business.name}`);
      return;
    }

    if (contact.phone) {
      window.location.href = `tel:${contact.phone}`;
      showMarketplaceNotice(`Llamando a ${business.name}`);
      return;
    }

    if (contact.email) {
      openProviderContact(business);
      setProviderContactChannel('email');
      window.setTimeout(() => providerContactTextareaRef.current?.focus(), 80);
      showMarketplaceNotice('Escribe el mensaje y se enviara por email');
      return;
    }

    showMarketplaceNotice(`Falta configurar contacto para ${business.name}`);
  };
  const sendProviderContactEmail = async (business: MarketplaceBusiness, text: string) => {
    const contact = resolveProviderContact(business);
    if (!contact.email) {
      throw new Error(`Falta configurar email para ${business.name}`);
    }

    const headers = await withCsrfHeadersAsync({
      'Content-Type': 'application/json',
      Accept: 'application/json',
    });
    const response = await fetch(`${resolveDashboardBasePath() || ''}/api/marketplace-contact.php`, {
      method: 'POST',
      credentials: 'same-origin',
      headers,
      body: JSON.stringify({
        businessId: business.id,
        businessName: business.name,
        businessEmail: contact.email,
        offer: buildProviderOfferMessage(business),
        message: text,
      }),
    });
    const payload = await response.json().catch(() => ({})) as { ok?: boolean; message?: string };
    if (!response.ok || payload.ok === false) {
      throw new Error(payload.message || 'No se pudo enviar el email al proveedor.');
    }
  };

  const sendProviderContactMessage = async () => {
    if (!providerContactBusiness) {
      return;
    }

    const trimmed = providerContactMessage.trim();
    if (trimmed === '') {
      showMarketplaceNotice('Escribe un mensaje para el proveedor');
      return;
    }

    setIsProviderContactSending(true);
    const now = new Date().toISOString();
    const message: MarketplaceContactMessage = {
      id: `${providerContactBusiness.id}-user-${Date.now()}`,
      from: 'user',
      text: trimmed,
      createdAt: now,
      delivery: 'local',
    };
    let emailSent = false;
    try {
      await sendProviderContactEmail(providerContactBusiness, trimmed);
      emailSent = true;
      message.delivery = 'email_sent';
    } catch (error) {
      message.delivery = 'email_failed';
      showMarketplaceNotice(error instanceof Error ? error.message : 'No se pudo enviar el email al proveedor');
    }

    setProviderContactThreads((current) => {
      const existing = current[providerContactBusiness.id] ?? {
        businessId: providerContactBusiness.id,
        businessName: providerContactBusiness.name,
        businessImageUrl: providerContactBusiness.imageUrl,
        updatedAt: now,
        messages: [{
          id: `${providerContactBusiness.id}-offer-${Date.now()}`,
          from: 'provider' as const,
          text: buildProviderOfferMessage(providerContactBusiness),
          createdAt: now,
        }],
      };

      return {
        ...current,
        [providerContactBusiness.id]: {
          ...existing,
          businessName: providerContactBusiness.name,
          businessImageUrl: providerContactBusiness.imageUrl,
          updatedAt: now,
          messages: [...existing.messages, message],
        },
      };
    });
    setProviderContactMessage('');
    setProviderContactSent(emailSent);
    if (providerContactSentTimerRef.current) {
      window.clearTimeout(providerContactSentTimerRef.current);
    }
    if (emailSent) {
      providerContactSentTimerRef.current = window.setTimeout(() => {
        setProviderContactSent(false);
        providerContactSentTimerRef.current = null;
      }, 2400);
    }
    setIsProviderContactSending(false);
    if (emailSent) {
      showMarketplaceNotice(`Email enviado a ${providerContactBusiness.name}`);
    }
  };
  const openCommissionRequestContact = () => {
    openProviderContact({
      id: 'commission-request-nou-campanar',
      name: 'Falla Nou Campanar',
      type: 'Comision fallera',
      location: 'Campanar',
      distance: '',
      promotion: 'Buscamos DJ para verbena. Presupuesto 400 EUR - 700 EUR. Experiencia en Fallas valorable.',
      actionLabel: 'Contactar',
      badge: 'Solicitud activa',
      category: 'Sponsors',
      imageUrl: '',
      plan: 'Solicitud',
      phone: '',
      email: '',
      whatsapp: '',
      website: '',
    });
  };
  const getCouponRedeemCode = (coupon: MarketplaceCoupon) => `F360-${coupon.id.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)}-VAL`;
  const openCouponRedeemer = (coupon: MarketplaceCoupon) => {
    setSavedCouponIds((current) => current.includes(coupon.id) ? current : [...current, coupon.id]);
    setRedeemingCoupon(coupon);
    setMarketplaceDetail(null);
    showMarketplaceNotice(`Cupon listo para escanear en ${coupon.business}`);
  };
  const confirmCouponRedeem = (coupon: MarketplaceCoupon) => {
    setUsedCouponIds((current) => current.includes(coupon.id) ? current : [...current, coupon.id]);
    setRedeemingCoupon(null);
    showMarketplaceNotice(`Cupon canjeado: ${coupon.title}`);
  };
  const handleRecommendedAction = (badge: string, title: string, price: string, distance: string, imageUrl: string) => {
    openMarketplaceDetail({
      eyebrow: badge,
      title,
      description: badge === 'Cupon'
        ? 'Oferta activa para usar dentro de Fallas 360. Puedes guardar el cupon y mostrarlo en el local.'
        : badge === 'Experiencia'
          ? 'Experiencia reservable conectada a tu ubicacion y al momento del dia.'
          : badge === 'Tienda'
            ? 'Producto popular disponible desde la tienda fallera de Fallas 360.'
            : 'Recomendacion cercana pensada para completar tu recorrido fallero.',
      meta: `${price} · ${distance}`,
      imageUrl,
      primaryAction: badge === 'Experiencia' ? 'Reservar' : badge === 'Tienda' ? 'Comprar' : badge === 'Cupon' ? 'Usar cupon' : 'Ver oferta',
    });

    if (badge === 'Cupon') {
      activateMarketplaceSection('Cupones', 'marketplace-coupon', `Cupon seleccionado: ${title}`);
      return;
    }

    if (badge === 'Experiencia') {
      activateMarketplaceSection('Experiencias', 'marketplace-experiences', `Experiencia seleccionada: ${title}`);
      return;
    }

    if (badge === 'Tienda') {
      activateMarketplaceSection('Merchandising', 'marketplace-products', `Producto seleccionado: ${title}`);
      return;
    }

    activateMarketplaceSection('Restaurantes', 'marketplace-featured', `Oferta seleccionada: ${title}`);
  };
  const handleSaveCoupon = (coupon: MarketplaceCoupon) => {
    setSavedCouponIds((current) => current.includes(coupon.id) ? current : [...current, coupon.id]);
    openMarketplaceDetail({
      eyebrow: 'Cupon guardado',
      title: coupon.title,
      description: `${coupon.condition} Muestralo en ${coupon.business} para aplicar la promocion.`,
      meta: coupon.validUntil,
      primaryAction: 'Usar cupon',
      couponId: coupon.id,
    });
  };
  const handleUseCoupon = (coupon: MarketplaceCoupon) => {
    openCouponRedeemer(coupon);
  };
  const handleAddProduct = (product: MarketplaceProduct) => {
    setCartProductIds((current) => current.includes(product.id) ? current : [...current, product.id]);
    openMarketplaceDetail({
      eyebrow: product.category,
      title: product.name,
      description: 'Producto anadido a tu lista. Puedes reservarlo o completar la compra desde Fallas 360.',
      meta: product.price,
      imageUrl: product.imageUrl,
      primaryAction: cartProductIds.includes(product.id) ? 'Ver lista' : 'Comprar o reservar',
    });
  };
  const handleOpenBusiness = (business: Pick<MarketplaceBusiness, 'name'>) => {
    const fullBusiness = marketplaceBusinesses.find((item) => item.name === business.name);
    const businessPromotion = fullBusiness?.promotion ?? 'Cocina valenciana tradicional, ofertas cercanas y ficha premium dentro del Marketplace.';
    openMarketplaceDetail({
      eyebrow: fullBusiness?.badge ?? 'Negocio destacado',
      title: business.name,
      description: businessPromotion,
      meta: fullBusiness ? `${fullBusiness.distance} · ${fullBusiness.location}` : 'Partner Fallas 360 · 4,9 ★',
      imageUrl: fullBusiness?.imageUrl,
      primaryAction: fullBusiness?.category === 'Sponsors' || fullBusiness?.badge === 'Sponsor' ? 'Contactar proveedor' : fullBusiness?.actionLabel ?? 'Descubrir',
      business: fullBusiness,
      offer: fullBusiness ? {
        title: businessPromotion,
        price: businessPromotion.includes('desde') ? businessPromotion.split('desde ')[1] ?? businessPromotion : businessPromotion,
        condition: 'Oferta activa para usuarios de Fallas 360. Consulta disponibilidad en el local antes de confirmar.',
        distance: fullBusiness.distance,
      } : undefined,
    });
  };
  const handleOpenOffer = (offer: (typeof nearbyOffers)[number], business: MarketplaceBusiness) => {
    const linkedCoupon = offer.couponId ? marketplaceCoupons.find((coupon) => coupon.id === offer.couponId) : null;
    openMarketplaceDetail({
      eyebrow: linkedCoupon ? 'Oferta con cupon' : 'Oferta cercana',
      title: offer.title,
      description: `${offer.condition} Disponible en ${business.name}.`,
      meta: `${offer.price} · ${offer.distance} · Hoy`,
      imageUrl: offer.imageUrl,
      primaryAction: linkedCoupon ? 'Usar cupon' : offer.actionLabel,
      couponId: linkedCoupon?.id,
      business,
      offer: {
        title: offer.title,
        price: offer.price,
        condition: offer.condition,
        distance: offer.distance,
      },
    });
  };
  const handleReserveExperience = (experience: MarketplaceExperience) => {
    const experienceLocation = experience.location || 'Valencia';
    const experienceDuration = experience.duration || '2 h';
    const experienceCapacity = experience.capacity || 'Cupos limitados';
    const experienceBusinessName = experience.businessName || experience.name;
    const experienceImageUrl = experience.imageUrl || marketplaceBusinesses.find((business) => business.category === 'Experiencias')?.imageUrl || '';
    const experienceBusiness: MarketplaceBusiness = {
      id: `experience-${experience.id}`,
      name: experienceBusinessName,
      type: 'Experiencia',
      location: experienceLocation,
      distance: experienceDuration,
      promotion: experience.description,
      actionLabel: experience.actionLabel,
      badge: 'Experiencia fallera',
      category: 'Experiencias',
      imageUrl: experienceImageUrl,
      plan: experienceCapacity,
    };

    openMarketplaceDetail({
      eyebrow: 'Experiencia fallera',
      title: experience.name,
      description: experience.description,
      meta: [experience.price, experienceDuration, experienceCapacity].filter(Boolean).join(' · '),
      imageUrl: experienceBusiness.imageUrl,
      primaryAction: experience.actionLabel,
      business: experienceBusiness,
      offer: {
        title: experience.name,
        price: experience.price,
        condition: [experience.description, experience.contactChannel ? `Contacto: ${experience.contactChannel}` : ''].filter(Boolean).join(' '),
        distance: experienceDuration,
      },
    });
  };

  return (
    <div className={cn('min-h-screen w-full max-w-none px-2 pb-[calc(env(safe-area-inset-bottom,0px)+7.25rem)] pt-0 sm:px-5 sm:pb-[calc(env(safe-area-inset-bottom,0px)+8.5rem)] lg:px-8 xl:px-10 2xl:px-14', isDarkMode ? 'bg-slate-950 text-white' : 'bg-[#fff7ef] text-[#1b120d]')}>
      <div className="mx-auto w-full max-w-[560px] space-y-3 sm:space-y-5 lg:max-w-none">
        {canEditMarketplace ? (
          <div className={cn('sticky top-3 z-[1200] flex items-center justify-between gap-3 rounded-[1.25rem] border px-3 py-2 shadow-[0_18px_44px_-34px_rgba(22,12,8,0.55)] backdrop-blur-xl', isDarkMode ? 'border-white/10 bg-slate-950/88' : 'border-white bg-white/88')}>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#d92510]">Editor admin</p>
              <p className={cn('truncate text-xs font-bold', isDarkMode ? 'text-white/58' : 'text-[#7a6558]')}>Edita el marketplace desde la app, estilo WordPress.</p>
            </div>
            <button type="button" onClick={openMarketplaceEditor} className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#1b120d] px-4 py-2.5 text-xs font-black text-white"><Settings2 className="h-4 w-4" /> Editar</button>
          </div>
        ) : null}
        <section className={cn('relative overflow-hidden rounded-b-[1.45rem] border-x border-b px-3 pb-4 pt-[calc(env(safe-area-inset-top,0px)+0.6rem)] shadow-[0_24px_70px_-48px_rgba(124,45,18,0.45)] sm:rounded-[2rem] sm:border sm:px-6 sm:pt-7 lg:px-8', isDarkMode ? 'border-white/10 bg-slate-950 text-white' : 'border-white/90 bg-[linear-gradient(180deg,#fff8ef_0%,#fffdf9_42%,#fff7ef_100%)] text-[#0d1830]')}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle_at_80%_10%,rgba(255,99,33,0.16),transparent_34%),linear-gradient(180deg,rgba(255,232,203,0.65),transparent)]" />
          <div className="pointer-events-none absolute right-4 top-8 hidden text-[#ef5a21]/55 sm:block">
            <Sparkles className="h-20 w-20" />
          </div>
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-3 sm:gap-4">
              <div className="flex min-w-0 items-center gap-3 sm:gap-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] bg-white shadow-[0_14px_34px_rgba(124,45,18,0.14)] sm:h-20 sm:w-20 sm:rounded-[1.3rem]">
                  <div className="text-center leading-none">
                    <Flame className="mx-auto h-6 w-6 fill-[#f04a1d] text-[#f04a1d] sm:h-10 sm:w-10" />
                    <p className="mt-0.5 text-[10px] font-black text-[#0f1d3a] sm:mt-1 sm:text-base">360</p>
                  </div>
                </div>
                <div className="min-w-0">
                  <h1 className="text-[1.45rem] font-black leading-none tracking-[-0.03em] sm:text-[3rem]">Marketplace Fallero</h1>
                  <p className={cn('mt-1.5 text-[12px] font-bold leading-4 sm:mt-2 sm:text-base sm:leading-5', isDarkMode ? 'text-white/60' : 'text-[#526071]')}>Compra, vende y conecta dentro del ecosistema fallero.</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsMarketplaceChatsOpen(true)} className={cn('relative inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full px-3 text-xs font-black shadow-[0_12px_24px_rgba(15,23,42,0.10)] sm:h-12 sm:px-4', marketplaceContactThreadList.length ? 'bg-[#1b120d] text-white' : isDarkMode ? 'bg-white/10 text-white/70' : 'bg-white text-[#0d1830]')} aria-label="Ver chats del marketplace">
                <MessageCircle className="h-4 w-4" />
                <span className="hidden min-[380px]:inline">Chats</span>
                {marketplaceContactThreadList.length ? <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#d92510] px-1 text-[10px] font-black text-white">{marketplaceContactThreadList.length}</span> : null}
              </button>
            </div>

            <label className={cn('mt-4 flex h-[52px] items-center gap-2 rounded-[1.25rem] border px-3 shadow-[0_18px_44px_rgba(15,23,42,0.12)] sm:mt-6 sm:h-16 sm:gap-3 sm:rounded-[1.8rem] sm:px-5', isDarkMode ? 'border-white/10 bg-white/10' : 'border-white bg-white')}>
              <Search className={cn('h-5 w-5 shrink-0 sm:h-7 sm:w-7', isDarkMode ? 'text-white/64' : 'text-slate-500')} />
              <input value={marketplaceSearch} onChange={(event) => setMarketplaceSearch(event.target.value)} placeholder="¿Qué buscas hoy?" className={cn('min-w-0 flex-1 bg-transparent text-sm font-bold outline-none placeholder:text-slate-400 sm:text-lg', isDarkMode ? 'text-white' : 'text-[#0d1830]')} />
              <span className={cn('h-7 w-px sm:h-8', isDarkMode ? 'bg-white/12' : 'bg-slate-200')} />
              <SlidersHorizontal className={cn('h-5 w-5 shrink-0 sm:h-6 sm:w-6', isDarkMode ? 'text-white/64' : 'text-slate-500')} />
            </label>

            <div className={cn('mt-4 grid grid-cols-2 rounded-[1.25rem] border p-1 shadow-[0_14px_30px_rgba(15,23,42,0.08)] sm:mt-5 sm:rounded-[1.7rem]', isDarkMode ? 'border-white/10 bg-white/8' : 'border-white bg-white/80')}>
              <button type="button" onClick={() => activateMarketplaceSection('Merchandising', 'marketplace-products', 'Mostrando productos')} className={cn('inline-flex h-11 items-center justify-center gap-1.5 rounded-[1rem] px-2 text-[12px] font-black shadow-[0_14px_28px_rgba(217,37,16,0.18)] transition sm:h-14 sm:gap-2 sm:rounded-[1.35rem] sm:text-base', activeMarketplaceSection === 'products' ? 'bg-[linear-gradient(135deg,#df1212,#f04a1d)] text-white' : isDarkMode ? 'text-white/78' : 'text-[#0b3b82]')}>
                <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5" /> Productos
              </button>
              <button type="button" onClick={() => activateMarketplaceSection('Sponsors', 'marketplace-sponsors', 'Mostrando proveedores')} className={cn('inline-flex h-11 items-center justify-center gap-1.5 rounded-[1rem] px-2 text-[11px] font-black leading-tight transition sm:h-14 sm:gap-2 sm:rounded-[1.35rem] sm:text-base', activeMarketplaceSection === 'providers' ? 'bg-[linear-gradient(135deg,#0d4c9e,#1f6fd1)] text-white shadow-[0_14px_28px_rgba(13,76,158,0.22)]' : isDarkMode ? 'text-white/78' : 'text-[#0b3b82]')}>
                <UsersRound className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" /> <span className="truncate">Proveedores</span>
              </button>
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {marketplaceSectionTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeMarketplaceFilter === tab.filter || (tab.filter === 'Merchandising' && activeMarketplaceSection === 'products');
                return (
                  <button
                    key={tab.filter}
                    type="button"
                    onClick={() => activateMarketplaceSection(tab.filter, tab.sectionId, `Seccion: ${tab.label}`)}
                    className={cn(
                      'inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-3 text-[11px] font-black transition sm:h-11 sm:px-4 sm:text-xs',
                      isActive
                        ? tab.filter === 'Sponsors'
                          ? 'bg-[#0d4c9e] text-white shadow-[0_12px_24px_rgba(13,76,158,0.22)]'
                          : 'bg-[#e83317] text-white shadow-[0_12px_24px_rgba(232,51,23,0.20)]'
                        : isDarkMode ? 'bg-white/8 text-white/70' : 'bg-white text-[#4b5563] shadow-[0_10px_22px_rgba(15,23,42,0.08)]'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {activeMarketplaceSection === 'products' ? (
            <div className="-mx-3 mt-4 flex snap-x gap-2 overflow-x-auto px-3 pb-2 [scrollbar-width:none] sm:mx-0 sm:mt-5 sm:grid sm:grid-cols-5 sm:gap-3 sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
              {[
                ['Decoración', Sparkles, 'text-[#ef3f18]', 'border-[#ef3f18]'],
                ['Indumentaria', Crown, 'text-[#0b3b82]', 'border-transparent'],
                ['Carpas', Store, 'text-[#0b3b82]', 'border-transparent'],
                ['Llibrets', List, 'text-[#ef5a21]', 'border-transparent'],
                ['Segunda mano', Heart, 'text-emerald-600', 'border-transparent'],
              ].map(([label, Icon, colorClass, borderClass]) => {
                const categoryLabel = String(label);
                const isActiveCategory = activeProductCategory === categoryLabel;
                return (
                <button key={categoryLabel} type="button" onClick={() => activateProductCategory(categoryLabel)} className={cn('grid h-[72px] min-w-[82px] snap-start grid-rows-[1fr_auto] place-items-center rounded-[0.85rem] border bg-white px-2 pb-2 pt-2 text-center shadow-[0_12px_24px_rgba(15,23,42,0.09)] transition-transform active:scale-[0.98] sm:h-24 sm:min-w-0 sm:rounded-[1.1rem] sm:px-3 sm:pb-3 sm:pt-3', isActiveCategory ? 'border-[#ef3f18] bg-[#fff7f0] ring-1 ring-[#ef3f18]' : borderClass as string)}>
                  <Icon className={cn('h-5 w-5 sm:h-7 sm:w-7', colorClass as string)} />
                  <span className="max-w-full truncate text-[10px] font-black leading-tight text-[#171717] sm:text-sm">{categoryLabel}</span>
                </button>
                );
              })}
            </div>
            ) : null}

            {activeMarketplaceSection === 'products' ? (
            <div id="marketplace-products" className="mt-6 scroll-mt-4 sm:mt-7">
              <div className="flex items-center justify-between gap-3">
                <h2 className="inline-flex min-w-0 items-center gap-2 text-[1.05rem] font-black tracking-[-0.03em] text-[#111111] sm:gap-3 sm:text-2xl"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#fff1ea] text-[#e83317] sm:h-11 sm:w-11"><ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5" /></span><span className="truncate">{activeProductCategory}</span></h2>
                <button type="button" onClick={() => { setActiveProductCategory(''); showMarketplaceNotice('Todos los productos'); }} className="inline-flex items-center gap-2 text-sm font-black text-[#e83317]">Ver todo <ArrowRight className="h-4 w-4" /></button>
              </div>
              <div className="-mx-3 mt-4 flex gap-3 overflow-x-auto px-3 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden">
                {(visibleProducts.length ? visibleProducts : marketplaceProducts).slice(0, 3).map((product, index) => (
                  <article key={product.id} role="button" tabIndex={0} onClick={() => handleAddProduct(product)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handleAddProduct(product); } }} className="w-[78vw] max-w-[280px] shrink-0 cursor-pointer overflow-hidden rounded-[1.05rem] bg-white p-2 shadow-[0_18px_42px_rgba(15,23,42,0.12)] md:w-auto md:max-w-none md:rounded-[1.2rem]">
                    <div className="relative h-36 overflow-hidden rounded-[0.85rem] bg-slate-100 sm:h-44 sm:rounded-[0.95rem]">
                      <img src={product.imageUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      <span className={cn('absolute left-3 top-3 rounded-[0.6rem] px-3 py-1.5 text-[11px] font-black text-white', index === 1 ? 'bg-[#2f6ecb]' : 'bg-[#ff5a16]')}>{index === 1 ? 'Nuevo' : 'Destacado'}</span>
                      <button type="button" onClick={(event) => { event.stopPropagation(); showMarketplaceNotice(`Favorito: ${product.name}`); }} className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white text-black shadow-lg"><Heart className="h-5 w-5" /></button>
                    </div>
                    <div className="px-2 pb-3 pt-3">
                      <h3 className="line-clamp-2 min-h-9 text-[15px] font-black leading-tight text-[#141414] sm:min-h-10 sm:text-base">{product.name}</h3>
                      <p className="mt-2 text-xl font-black text-[#e83317] sm:text-2xl">{product.price}</p>
                      <p className="mt-2 flex items-center gap-2 text-[13px] font-semibold text-[#333] sm:text-sm"><MapPin className="h-4 w-4" />{index === 0 ? 'Ruzafa' : index === 1 ? 'Benimaclet' : 'Campanar'}</p>
                      <p className="mt-1 flex items-center gap-2 text-[13px] font-semibold text-[#333] sm:text-sm"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />{index === 1 ? 'Lote 10 uds' : index === 2 ? 'Pack de 4' : 'Como nuevo'}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
            ) : null}

            {activeMarketplaceSection === 'providers' ? (
            <div id="marketplace-sponsors" className="mt-7 scroll-mt-4 sm:mt-8">
              <div className="flex items-center justify-between gap-3">
                <h2 className="inline-flex min-w-0 items-center gap-2 text-[1.15rem] font-black tracking-[-0.03em] text-[#111111] sm:gap-3 sm:text-2xl"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-50 text-[#0d4c9e] sm:h-11 sm:w-11"><UsersRound className="h-4 w-4 sm:h-5 sm:w-5" /></span><span className="truncate">Proveedores y comisiones</span></h2>
                <button type="button" onClick={() => activateMarketplaceSection('Sponsors', 'marketplace-sponsors', 'Todos los proveedores')} className="inline-flex items-center gap-2 text-sm font-black text-[#0d4c9e]">Ver todo <ArrowRight className="h-4 w-4" /></button>
              </div>
              <div className="-mx-3 mt-4 flex gap-3 overflow-x-auto px-3 pb-2 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-2 lg:gap-4 lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden">
                {sponsorBusinesses.slice(0, 1).map((business) => (
                  <article key={business.id} className="w-[84vw] max-w-[360px] shrink-0 rounded-[1.1rem] border border-blue-100 bg-white p-4 shadow-[0_18px_42px_rgba(15,23,42,0.10)] sm:p-5 lg:w-auto lg:max-w-none lg:rounded-[1.25rem]">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-black text-white sm:h-20 sm:w-20">
                        {business.imageUrl ? <img src={business.imageUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : <Radio className="h-8 w-8" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-lg font-black text-[#0d1830] sm:text-xl">{business.name}<ShieldCheck className="ml-2 inline h-5 w-5 text-[#2f6ecb]" /></h3>
                        <p className="mt-1 text-sm font-bold text-[#0d4c9e]">Proveedor verificado</p>
                        <p className="mt-1 text-sm font-semibold text-[#444]">{business.type} · {business.location}</p>
                      </div>
                      <Settings2 className="h-5 w-5 text-[#333]" />
                    </div>
                    <p className="mt-4 line-clamp-3 text-sm font-semibold leading-6 text-[#333] sm:text-base sm:leading-7">{business.promotion || 'Soluciones integrales para Fallas y eventos.'}</p>
                    <p className="mt-4 flex items-center gap-3 text-base font-black text-[#111]"><Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />4,9 <span className="text-sm font-semibold text-[#555]">(28)</span><span className="h-5 w-px bg-slate-200" /><ShieldCheck className="h-5 w-5 text-[#2f6ecb]" />Verificado</p>
                    <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
                      <button type="button" onClick={() => handleOpenBusiness(business)} className="h-12 rounded-[0.9rem] border border-[#0d4c9e] text-base font-black text-[#0d4c9e]">Ver perfil</button>
                      <button type="button" onClick={() => contactProvider(business)} className="inline-flex h-12 items-center justify-center gap-2 rounded-[0.9rem] bg-[#0d4c9e] px-4 text-sm font-black text-white"><MessageCircle className="h-4 w-4" /> Contactar</button>
                    </div>
                  </article>
                ))}
                <article className="w-[84vw] max-w-[360px] shrink-0 rounded-[1.1rem] border border-orange-100 bg-[#fff8ef] p-4 shadow-[0_18px_42px_rgba(255,99,33,0.10)] sm:p-5 lg:w-auto lg:max-w-none lg:rounded-[1.25rem]">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-white text-center text-[9px] font-black text-[#0d1830] shadow-sm sm:h-20 sm:w-20 sm:text-[10px]">FALLA<br />NOU<br />CAMPANAR</div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-black text-[#111] sm:text-xl">Falla Nou Campanar</h3>
                      <span className="mt-2 inline-flex rounded-[0.55rem] bg-orange-100 px-3 py-1.5 text-sm font-black text-[#e83317]">Solicitud activa</span>
                    </div>
                    <Settings2 className="h-5 w-5 text-[#333]" />
                  </div>
                  <h4 className="mt-4 text-lg font-black text-[#111] sm:mt-5 sm:text-xl">Buscamos DJ para verbena</h4>
                  <p className="mt-3 flex flex-wrap gap-4 text-base font-black"><span className="text-[#e83317]">400€ - 700€</span><span className="inline-flex items-center gap-2 text-[#222]"><MapPin className="h-5 w-5" />Campanar</span></p>
                  <p className="mt-3 line-clamp-3 text-sm font-semibold leading-6 text-[#333] sm:text-base sm:leading-7">Verbena de fin de semana para nuestras fiestas. Experiencia en Fallas valorable.</p>
                  <div className="mt-5 flex flex-col gap-3 min-[390px]:flex-row min-[390px]:items-center min-[390px]:justify-between">
                    <span className="inline-flex items-center gap-2 text-sm font-bold text-[#333]"><UsersRound className="h-4 w-4" />Comisión verificada</span>
                    <button type="button" onClick={openCommissionRequestContact} className="h-11 rounded-[0.9rem] bg-[linear-gradient(135deg,#ff6a1a,#ef2f13)] px-7 text-sm font-black text-white shadow-[0_14px_28px_rgba(255,99,33,0.24)] sm:h-12 sm:px-8 sm:text-base">Contactar</button>
                  </div>
                </article>
              </div>
            </div>
            ) : null}

            {activeMarketplaceSection === 'coupons' ? (
              <div id="marketplace-coupon" className="mt-7 scroll-mt-4 sm:mt-8">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="inline-flex min-w-0 items-center gap-2 text-[1.15rem] font-black tracking-[-0.03em] text-[#111111] sm:gap-3 sm:text-2xl">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#fff1ea] text-[#e83317] sm:h-11 sm:w-11"><Tag className="h-4 w-4 sm:h-5 sm:w-5" /></span>
                    <span className="truncate">Cupones activos</span>
                  </h2>
                  <span className="rounded-full bg-[#fff1ea] px-3 py-2 text-[10px] font-black text-[#e83317]">{visibleCoupons.length} activos</span>
                </div>
                <div className="-mx-3 mt-4 flex gap-3 overflow-x-auto px-3 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden">
                  {visibleCoupons.map((coupon) => (
                    <article key={coupon.id} className="w-[78vw] max-w-[280px] shrink-0 rounded-[1.05rem] bg-white p-4 shadow-[0_18px_42px_rgba(15,23,42,0.12)] md:w-auto md:max-w-none">
                      <span className="rounded-full bg-[#fff1ea] px-3 py-1.5 text-[10px] font-black uppercase text-[#e83317]">Cupon</span>
                      <h3 className="mt-3 line-clamp-2 text-base font-black text-[#111]">{coupon.title}</h3>
                      <p className="mt-2 text-sm font-bold text-[#555]">{coupon.business}</p>
                      <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-[#444]">{coupon.condition}</p>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => handleSaveCoupon(coupon)} className="h-10 rounded-full bg-[#fff1ea] text-[11px] font-black text-[#e83317]">Guardar</button>
                        <button type="button" onClick={() => handleUseCoupon(coupon)} className="h-10 rounded-full bg-[#e83317] text-[11px] font-black text-white">Usar</button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            {activeMarketplaceSection === 'experiences' ? (
              <div id="marketplace-experiences" className="mt-7 scroll-mt-4 sm:mt-8">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="inline-flex min-w-0 items-center gap-2 text-[1.15rem] font-black tracking-[-0.03em] text-[#111111] sm:gap-3 sm:text-2xl">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#fff1ea] text-[#e83317] sm:h-11 sm:w-11"><Star className="h-4 w-4 sm:h-5 sm:w-5" /></span>
                    <span className="truncate">Experiencias falleras</span>
                  </h2>
                </div>
                <div className="-mx-3 mt-4 flex gap-3 overflow-x-auto px-3 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden">
                  {visibleExperiences.map((experience, index) => (
                    <article key={experience.id} className="w-[78vw] max-w-[280px] shrink-0 overflow-hidden rounded-[1.05rem] bg-white shadow-[0_18px_42px_rgba(15,23,42,0.12)] md:w-auto md:max-w-none">
                      <div className="relative h-36 bg-slate-100">
                        <img src={experience.imageUrl || marketplaceBusinesses[index % marketplaceBusinesses.length]?.imageUrl || marketplaceProducts[0]?.imageUrl || ''} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        <span className="absolute left-3 top-3 rounded-full bg-white/92 px-2.5 py-1.5 text-[9px] font-black text-[#e83317]">Experiencia</span>
                      </div>
                      <div className="p-4">
                        <h3 className="line-clamp-2 text-base font-black text-[#111]">{experience.name}</h3>
                        <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-[#444]">{experience.description}</p>
                        <p className="mt-2 truncate text-[11px] font-black text-[#7a6558]">{[experience.businessName, experience.location, experience.duration].filter(Boolean).join(' · ')}</p>
                        <div className="mt-4 flex items-center justify-between gap-2">
                          <span className="font-black text-[#e83317]">{experience.price}</span>
                          <button type="button" onClick={() => handleReserveExperience(experience)} className="h-10 rounded-full bg-[#e83317] px-4 text-[11px] font-black text-white">{experience.actionLabel}</button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            {activeMarketplaceSection === 'offers' ? (
              <div id="marketplace-offers" className="mt-7 scroll-mt-4 sm:mt-8">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="inline-flex min-w-0 items-center gap-2 text-[1.15rem] font-black tracking-[-0.03em] text-[#111111] sm:gap-3 sm:text-2xl">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#fff1ea] text-[#e83317] sm:h-11 sm:w-11"><MapPin className="h-4 w-4 sm:h-5 sm:w-5" /></span>
                    <span className="truncate">Ofertas cercanas</span>
                  </h2>
                  <button type="button" onClick={onOpenMap} className="text-sm font-black text-[#e83317]">Ver mapa</button>
                </div>
                <div className="-mx-3 mt-4 flex gap-3 overflow-x-auto px-3 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden">
                  {nearbyOffers.length > 0 ? nearbyOffers.map((offer, index) => {
                    const business = marketplaceBusinesses[index % marketplaceBusinesses.length];
                    if (!business) return null;
                    return (
                      <article key={offer.id} className="w-[78vw] max-w-[280px] shrink-0 overflow-hidden rounded-[1.05rem] bg-white p-3 shadow-[0_18px_42px_rgba(15,23,42,0.12)] md:w-auto md:max-w-none">
                        <div className="relative h-32 overflow-hidden rounded-[0.85rem] bg-slate-100">
                          <img src={offer.imageUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <h3 className="mt-3 line-clamp-2 text-base font-black text-[#111]">{offer.title}</h3>
                        <p className="mt-1 text-sm font-bold text-[#555]">{business.name}</p>
                        <p className="mt-2 text-sm font-black text-[#e83317]">{offer.price} · {offer.distance}</p>
                        <button type="button" onClick={() => handleOpenOffer(offer, business)} className="mt-4 h-10 w-full rounded-full bg-[#e83317] text-[11px] font-black text-white">Ver oferta</button>
                      </article>
                    );
                  }) : [
                    heroBusiness ? {
                      id: `business-${heroBusiness.id}`,
                      title: heroBusiness.promotion || heroBusiness.name,
                      eyebrow: heroBusiness.badge || 'Oferta',
                      meta: `${heroBusiness.name} · ${heroBusiness.distance}`,
                      imageUrl: heroBusiness.imageUrl,
                      onClick: () => handleOpenBusiness(heroBusiness),
                    } : null,
                    firstCoupon ? {
                      id: `coupon-${firstCoupon.id}`,
                      title: firstCoupon.title,
                      eyebrow: 'Cupon',
                      meta: `${firstCoupon.business} · ${firstCoupon.validUntil}`,
                      imageUrl: heroBusiness?.imageUrl ?? marketplaceBusinesses[0]?.imageUrl ?? '',
                      onClick: () => handleUseCoupon(firstCoupon),
                    } : null,
                    marketplaceProducts[0] ? {
                      id: `product-${marketplaceProducts[0].id}`,
                      title: marketplaceProducts[0].name,
                      eyebrow: marketplaceProducts[0].category,
                      meta: marketplaceProducts[0].price,
                      imageUrl: marketplaceProducts[0].imageUrl,
                      onClick: () => handleAddProduct(marketplaceProducts[0]),
                    } : null,
                    marketplaceExperiences[0] ? {
                      id: `experience-${marketplaceExperiences[0].id}`,
                      title: marketplaceExperiences[0].name,
                      eyebrow: 'Experiencia',
                      meta: [marketplaceExperiences[0].price, marketplaceExperiences[0].duration].filter(Boolean).join(' · '),
                      imageUrl: marketplaceExperiences[0].imageUrl || heroBusiness?.imageUrl || marketplaceBusinesses[0]?.imageUrl || marketplaceProducts[0]?.imageUrl || '',
                      onClick: () => handleReserveExperience(marketplaceExperiences[0]),
                    } : null,
                  ].filter((item): item is { id: string; title: string; eyebrow: string; meta: string; imageUrl: string; onClick: () => void } => Boolean(item)).map((item) => (
                    <article key={item.id} role="button" tabIndex={0} onClick={item.onClick} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); item.onClick(); } }} className="w-[78vw] max-w-[280px] shrink-0 overflow-hidden rounded-[1.05rem] bg-white p-3 shadow-[0_18px_42px_rgba(15,23,42,0.12)] md:w-auto md:max-w-none">
                      <div className="relative h-32 overflow-hidden rounded-[0.85rem] bg-slate-100">
                        {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : null}
                        <span className="absolute left-3 top-3 rounded-full bg-white/92 px-2.5 py-1 text-[9px] font-black uppercase text-[#e83317]">{item.eyebrow}</span>
                      </div>
                      <h3 className="mt-3 line-clamp-2 text-base font-black text-[#111]">{item.title}</h3>
                      <p className="mt-2 truncate text-sm font-bold text-[#555]">{item.meta}</p>
                      <button type="button" onClick={(event) => { event.stopPropagation(); item.onClick(); }} className="mt-4 h-10 w-full rounded-full bg-[#e83317] text-[11px] font-black text-white">Ver</button>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <button type="button" onClick={canEditMarketplace ? openMarketplaceEditor : () => showMarketplaceNotice('Publicacion preparada')} className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5.6rem)] right-3 z-[5100] inline-flex h-11 items-center gap-1.5 rounded-full bg-[linear-gradient(135deg,#ff7a22,#ef2f13)] px-3.5 text-xs font-black text-white shadow-[0_18px_38px_rgba(255,99,33,0.32)] sm:bottom-[calc(env(safe-area-inset-bottom,0px)+6.2rem)] sm:right-5 sm:h-14 sm:px-5 sm:text-base">
          <Plus className="h-5 w-5 sm:h-6 sm:w-6" /> Publicar
        </button>

        <section className={cn('hidden relative overflow-hidden rounded-[1.65rem] border p-4 shadow-[0_24px_70px_-48px_rgba(124,45,18,0.5)] sm:p-5 lg:p-6', isDarkMode ? 'border-white/10 bg-[linear-gradient(145deg,#211410,#0f0b09)]' : 'border-white/85 bg-[linear-gradient(145deg,#fff,#fff3e8)]')}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#d92510,#ff7a32,#ffd28a)]" />
          <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-[#f05a28]/18 blur-3xl" />
          <div className="relative grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)] xl:items-stretch">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff1e8] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#c03e15]"><Store className="h-3.5 w-3.5" /> {marketplaceSettings.eyebrow || 'Marketplace Fallas 360'}</span>
                <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em]', isDarkMode ? 'bg-white/8 text-white/72' : 'bg-white text-[#7a6558]')}><MapPin className="h-3.5 w-3.5 text-[#d92510]" /> {nearbyContextName ?? marketplaceSettings.location_label ?? 'Valencia'}</span>
              </div>
              <h1 className="mt-4 max-w-3xl text-[2.55rem] font-black leading-[0.92] tracking-[-0.07em] text-[#d92510] sm:text-[4rem] xl:text-[4.8rem]">{marketplaceSettings.hero_title || 'Compra, come y reserva cerca de tu ruta'}</h1>
              <p className={cn('mt-4 max-w-2xl text-sm font-bold leading-6 sm:text-[1rem]', isDarkMode ? 'text-white/66' : 'text-[#6f5a4c]')}>{marketplaceSettings.hero_subtitle || 'Ofertas verificadas, cupones con QR, productos falleros y experiencias conectadas al mapa para completar el recorrido sin perder tiempo.'}</p>
              <div className="mt-5 grid grid-cols-3 gap-2 sm:max-w-xl">
                {[
                  [`${marketplaceBusinesses.length + marketplaceCoupons.length + marketplaceProducts.length + marketplaceExperiences.length}`, 'Ofertas activas'],
                  [`${savedCouponIds.length}`, 'Cupones guardados'],
                  [`${cartProductIds.length}`, 'En tu lista'],
                ].map(([value, label]) => (
                  <div key={label} className={cn('rounded-[1rem] border px-3 py-3', isDarkMode ? 'border-white/10 bg-white/6' : 'border-white bg-white/82')}>
                    <p className="text-[1.4rem] font-black leading-none text-[#d92510]">{value}</p>
                    <p className={cn('mt-1 text-[10px] font-black uppercase tracking-[0.12em]', isDarkMode ? 'text-white/50' : 'text-[#8a7465]')}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
            {heroBusiness ? (
              <button
                type="button"
                onClick={() => handleOpenBusiness(heroBusiness)}
                className="group relative min-h-[230px] overflow-hidden rounded-[1.35rem] bg-[#160c08] text-left text-white shadow-[0_22px_60px_-36px_rgba(22,12,8,0.85)]"
              >
                <img src={heroBusiness.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" referrerPolicy="no-referrer" />
                <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(22,12,8,0.08),rgba(22,12,8,0.88))]" />
                <span className="absolute left-4 top-4 rounded-full bg-white/92 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#c03e15]">{marketplaceSettings.featured_badge || heroBusiness.badge || 'Destacado'}</span>
                <span className="absolute bottom-4 left-4 right-4">
                  <span className="block text-[1.35rem] font-black leading-tight">{heroBusiness.name}</span>
                  <span className="mt-2 flex flex-wrap gap-2 text-[11px] font-black">
                    <span className="rounded-full bg-white/16 px-3 py-1.5">{heroBusiness.distance}</span>
                    <span className="rounded-full bg-white/16 px-3 py-1.5">{heroBusiness.promotion}</span>
                  </span>
                </span>
              </button>
            ) : (
              <div className={cn('flex min-h-[230px] flex-col justify-between rounded-[1.35rem] border p-5', isDarkMode ? 'border-white/10 bg-white/6' : 'border-[#f05a2822] bg-white/74')}>
                <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-[#fff1e8] text-[#d92510]"><Store className="h-5 w-5" /></div>
                <div>
                  <p className="text-xl font-black leading-tight">Marketplace vacio</p>
                  <p className={cn('mt-2 text-sm font-bold leading-6', isDarkMode ? 'text-white/58' : 'text-[#7a6558]')}>Las ofertas apareceran aqui cuando publiques negocios, cupones o productos.</p>
                </div>
              </div>
            )}
          </div>

          <label className={cn('relative mt-5 flex h-14 items-center gap-3 rounded-[1.25rem] border px-4 shadow-[0_16px_34px_-28px_rgba(124,45,18,0.5)]', isDarkMode ? 'border-white/10 bg-white/10' : 'border-[#f05a2820] bg-white')}>
            <Search className="h-5 w-5 shrink-0 text-[#f05a28]" />
            <input value={marketplaceSearch} onChange={(event) => setMarketplaceSearch(event.target.value)} placeholder="Buscar restaurantes, cupones, productos..." className={cn('min-w-0 flex-1 bg-transparent text-sm font-bold outline-none placeholder:text-[#a18c7f]', isDarkMode ? 'text-white' : 'text-[#1b120d]')} />
          </label>

          {marketplaceNotice ? (
            <div className={cn('mt-3 flex items-center justify-between gap-3 rounded-[1rem] px-3 py-2 text-[12px] font-black', isDarkMode ? 'bg-white/10 text-white' : 'bg-white text-[#1b120d]')}>
              <span>{marketplaceNotice}</span>
              <button type="button" onClick={() => setMarketplaceNotice(null)} className="text-[#d92510]">Cerrar</button>
            </div>
          ) : null}

          <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-5 sm:px-5 lg:-mx-6 lg:px-6 [&::-webkit-scrollbar]:hidden">
            {marketplaceFilters.map((filter) => {
              const filterName = filter.category || filter.label;
              const sectionId = filter.sectionId || marketplaceSectionsByCategory[filterName] || 'marketplace-featured';
              const Icon = filterIcons[filterName] ?? Tag;
              const isActive = activeMarketplaceFilter === filterName || activeMarketplaceFilter === filter.label;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => activateMarketplaceSection(filterName, sectionId, `Filtro activo: ${filter.label}`)}
                  className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-black shadow-sm', isActive ? 'bg-[#d92510] text-white' : isDarkMode ? 'bg-white/10 text-white/78' : 'bg-white text-[#6f5a4c]')}
                >
                  <Icon className="h-3.5 w-3.5" />{filterName === 'Cercanos' ? 'Cerca de mi' : filter.label}
                </button>
              );
            })}
          </div>
        </section>

        {!hasMarketplaceContent ? (
          <section id="marketplace-empty" className={cn('scroll-mt-4 rounded-[1.6rem] border p-5 text-center shadow-[0_18px_44px_-34px_rgba(22,12,8,0.28)] sm:p-7', isDarkMode ? 'border-white/10 bg-white/6' : 'border-white bg-white')}>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1.1rem] bg-[#fff1e8] text-[#d92510]"><Store className="h-6 w-6" /></div>
            <h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">Marketplace vacio</h2>
            <p className={cn('mx-auto mt-2 max-w-md text-sm font-bold leading-6', isDarkMode ? 'text-white/58' : 'text-[#7a6558]')}>No se mostrara ningun negocio, cupon o producto hasta que lo anadas.</p>
            {canEditMarketplace ? (
              <button type="button" onClick={openMarketplaceEditor} className="mt-5 inline-flex items-center justify-center gap-2 rounded-[0.8rem] bg-[#d92510] px-5 py-3 text-sm font-black text-white"><Settings2 className="h-4 w-4" /> Anadir contenido</button>
            ) : null}
          </section>
        ) : null}

        {isMarketplaceOffersOverview && heroBusiness ? (
        <section id="marketplace-featured" className="hidden scroll-mt-4 overflow-hidden rounded-[1.4rem] bg-[#160c08] text-white shadow-[0_30px_80px_-48px_rgba(22,12,8,0.9)] sm:block">
          <div className="relative min-h-[330px] p-5 sm:min-h-[390px] sm:p-7">
            <img src={heroBusiness.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" referrerPolicy="no-referrer" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(22,12,8,0.18),rgba(22,12,8,0.88)),linear-gradient(90deg,rgba(22,12,8,0.85),rgba(22,12,8,0.24))]" />
            <div className="relative z-10 flex min-h-[290px] flex-col justify-between sm:min-h-[330px]">
              <div className="flex items-start justify-between gap-4">
                <span className="inline-flex rounded-full bg-[#ffd28a] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#3b1b0e]">{marketplaceSettings.featured_badge || 'Oferta destacada'}</span>
                <button type="button" onClick={() => showMarketplaceNotice('Oferta guardada en favoritos')} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/16 backdrop-blur-md"><Heart className="h-5 w-5" /></button>
              </div>
              <div>
                <h2 className="max-w-[620px] break-words text-[2rem] font-black leading-[1.02] tracking-[-0.03em] sm:text-[3rem] lg:text-[3.6rem]">{heroBusiness.promotion || heroBusiness.name}</h2>
                <p className="mt-3 flex items-center gap-2 text-lg font-black"><Store className="h-5 w-5" />{heroBusiness.name}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-black sm:text-sm">
                  <span className="rounded-full bg-white/18 px-3 py-2">{heroBusiness.badge}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/18 px-3 py-2"><MapPin className="h-4 w-4" />{heroBusiness.distance}</span>
                  <span className="rounded-full bg-white/18 px-3 py-2">4,8 ★</span>
                </div>
                <button type="button" onClick={() => handleOpenBusiness(heroBusiness)} className="mt-5 inline-flex h-12 items-center gap-3 rounded-full bg-white px-5 text-sm font-black text-[#1b120d] shadow-xl">{heroBusiness.actionLabel || 'Ver oferta'} <ArrowRight className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        </section>
        ) : null}

        {isMarketplaceOffersOverview && visibleBusinesses.length ? (
        <section id="marketplace-directory" className="hidden scroll-mt-4 space-y-3 sm:block">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-black tracking-[-0.04em] sm:text-2xl">Negocios seleccionados</h2>
              <p className={cn('text-xs font-bold', isDarkMode ? 'text-white/52' : 'text-[#8a7465]')}>Restaurantes, tiendas y experiencias con ficha activa</p>
            </div>
            <button type="button" onClick={() => activateMarketplaceSection('Cercanos', 'marketplace-offers', 'Mostrando ofertas cercanas')} className="inline-flex items-center gap-2 text-xs font-black text-[#d92510]"><MapPin className="h-4 w-4" /> Cerca de mi</button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {visibleBusinesses.map((business) => (
              <article
                key={business.id}
                role="button"
                tabIndex={0}
                onClick={() => handleOpenBusiness(business)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleOpenBusiness(business);
                  }
                }}
                className={cn('group cursor-pointer overflow-hidden rounded-[1.25rem] border shadow-[0_16px_34px_-28px_rgba(22,12,8,0.45)] transition-transform hover:-translate-y-0.5', isDarkMode ? 'border-white/10 bg-white/8' : 'border-white bg-white')}
              >
                {business.imageUrl ? (
                  <div className="relative h-36">
                    <img src={business.imageUrl} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" referrerPolicy="no-referrer" />
                    {business.badge ? <span className="absolute left-3 top-3 rounded-full bg-white/94 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-[#c03e15]">{business.badge}</span> : null}
                  </div>
                ) : null}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-black leading-tight">{business.name}</h3>
                      {business.type || business.location ? <p className={cn('mt-1 truncate text-[11px] font-bold', isDarkMode ? 'text-white/54' : 'text-[#7a6558]')}>{[business.type, business.location].filter(Boolean).join(' · ')}</p> : null}
                    </div>
                    {business.distance ? <span className="shrink-0 rounded-full bg-[#fff1e8] px-2.5 py-1 text-[10px] font-black text-[#c03e15]">{business.distance}</span> : null}
                  </div>
                  {business.promotion ? <p className={cn('mt-3 line-clamp-2 text-xs font-bold leading-5', isDarkMode ? 'text-white/60' : 'text-[#6f5a4c]')}>{business.promotion}</p> : null}
                  {business.actionLabel ? (
                    <button type="button" onClick={(event) => { event.stopPropagation(); handleOpenBusiness(business); }} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[0.8rem] bg-[#1b120d] py-2.5 text-[11px] font-black text-white">
                      {business.actionLabel}<ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
        ) : null}

        {isMarketplaceOffersOverview && marketplaceRecommendationItems.length ? (
        <section id="marketplace-recommended" className="hidden scroll-mt-4 space-y-3 sm:block">
          <div className="flex items-end justify-between gap-3">
            <div><h2 className="text-xl font-black tracking-[-0.04em] sm:text-2xl">Recomendado para ti</h2><p className={cn('text-xs font-bold', isDarkMode ? 'text-white/52' : 'text-[#8a7465]')}>Segun ubicacion, intereses y momento del dia</p></div>
            <Sparkles className="h-5 w-5 text-[#d92510]" />
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {marketplaceRecommendationItems.map(([title, price, distance, badge, image]) => (
              <article key={title} role="button" tabIndex={0} onClick={() => handleRecommendedAction(badge, title, price, distance, image)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handleRecommendedAction(badge, title, price, distance, image); } }} className={cn('cursor-pointer overflow-hidden rounded-[1.35rem] border shadow-[0_16px_34px_-28px_rgba(22,12,8,0.45)] transition-transform hover:-translate-y-0.5', isDarkMode ? 'border-white/10 bg-white/8' : 'border-white bg-white')}>
                <div className="relative h-28"><img src={image} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /><span className="absolute left-2 top-2 rounded-full bg-white/92 px-2 py-1 text-[8px] font-black uppercase text-[#c03e15]">{badge}</span></div>
                <div className="p-3"><h3 className="text-[13px] font-black leading-tight sm:text-sm">{title}</h3><div className="mt-2 flex items-center justify-between gap-2"><span className="text-[12px] font-black text-[#d92510]">{price}</span><span className={cn('text-[10px] font-black', isDarkMode ? 'text-white/50' : 'text-[#8a7465]')}>{distance}</span></div><button type="button" onClick={(event) => { event.stopPropagation(); handleRecommendedAction(badge, title, price, distance, image); }} className="mt-3 w-full rounded-full bg-[#1b120d] py-2 text-[10px] font-black text-white">Ver</button></div>
              </article>
            ))}
          </div>
        </section>
        ) : null}

        {isMarketplaceOffersOverview && nearbyOffers.length > 0 && marketplaceBusinesses.length > 0 ? (
        <section id="marketplace-offers" className="hidden scroll-mt-4 space-y-3 sm:block">
          <div className="flex items-end justify-between gap-4"><h2 className="text-xl font-black tracking-[-0.04em] sm:text-2xl">Ofertas cerca de {nearbyContextName ? 'tu falla' : 'una falla'}</h2><button type="button" onClick={onOpenMap} className="text-xs font-black text-[#d92510]">Ver mapa</button></div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {nearbyOffers.map((offer, index) => {
              const Icon = offer.icon;
              const business = marketplaceBusinesses[index % marketplaceBusinesses.length];
              if (!business) {
                return null;
              }
              return (
                <article key={offer.id} role="button" tabIndex={0} onClick={() => handleOpenOffer(offer, business)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handleOpenOffer(offer, business); } }} className={cn('flex cursor-pointer items-center gap-3 rounded-[1.25rem] border p-2.5 shadow-[0_14px_30px_-28px_rgba(22,12,8,0.4)] transition-transform hover:-translate-y-0.5', isDarkMode ? 'border-white/10 bg-white/8' : 'border-white bg-white')}>
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[1rem]"><img src={offer.imageUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /><span className="absolute inset-0 flex items-center justify-center bg-black/18 text-white"><Icon className="h-5 w-5" /></span></div>
                  <div className="min-w-0 flex-1"><h3 className="truncate text-sm font-black">{offer.title}</h3><p className={cn('mt-0.5 truncate text-[11px] font-bold', isDarkMode ? 'text-white/56' : 'text-[#7a6558]')}>{business.name}</p><p className="mt-1 text-[10px] font-black text-[#d92510]">{offer.price} · {offer.distance} · Hoy</p></div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleOpenOffer(offer, business);
                    }}
                    className="rounded-full bg-[#fff1e8] px-3 py-2 text-[9px] font-black text-[#c03e15]"
                  >Ver</button>
                </article>
              );
            })}
          </div>
        </section>
        ) : null}

        {(isMarketplaceOffersOverview || activeMarketplaceSection === 'coupons') && firstCoupon ? (
        <section id="marketplace-coupon" className={cn('hidden scroll-mt-4 rounded-[1.7rem] border p-4 shadow-[0_18px_44px_-34px_rgba(217,37,16,0.4)] sm:block sm:p-5', isDarkMode ? 'border-white/10 bg-white/8' : 'border-[#f05a2822] bg-white')}>
          <div className="flex items-start justify-between gap-4">
            <div><span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase text-emerald-700">Activo</span><h2 className="mt-2 text-xl font-black tracking-[-0.04em]">Muestra este cupon en el local</h2><p className={cn('mt-1 text-sm font-bold', isDarkMode ? 'text-white/58' : 'text-[#7a6558]')}>Valido hasta hoy a las 23:59</p></div>
            <div className="grid h-24 w-24 shrink-0 grid-cols-3 gap-1 rounded-[1.2rem] bg-[#1b120d] p-2">{Array.from({ length: 9 }).map((_, index) => <span key={index} className={cn('rounded-[3px]', index % 2 === 0 ? 'bg-white' : 'bg-[#f05a28]')} />)}</div>
          </div>
          <button type="button" disabled={!firstCoupon} onClick={() => firstCoupon ? handleUseCoupon(firstCoupon) : showMarketplaceNotice('No hay cupones activos ahora mismo')} className={cn('mt-4 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-black text-white', firstCoupon ? 'bg-[#d92510]' : 'bg-slate-300')}><QrCode className="h-4 w-4" /> Canjear cupon</button>
        </section>
        ) : null}

        {visibleCoupons.length ? (
        <section id="marketplace-coupons-list" className="hidden scroll-mt-4 space-y-3 sm:block">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-black tracking-[-0.04em] sm:text-2xl">Cupones listos para usar</h2>
              <p className={cn('text-xs font-bold', isDarkMode ? 'text-white/52' : 'text-[#8a7465]')}>Guarda ahora y ensenalo en el local</p>
            </div>
            <span className="rounded-full bg-[#fff1e8] px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#c03e15]">{visibleCoupons.length} activos</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {visibleCoupons.map((coupon) => {
              const isSaved = savedCouponIds.includes(coupon.id);
              const isUsed = usedCouponIds.includes(coupon.id);
              return (
                <article key={coupon.id} className={cn('rounded-[1.25rem] border p-4 shadow-[0_16px_34px_-28px_rgba(22,12,8,0.4)]', isDarkMode ? 'border-white/10 bg-white/8' : 'border-white bg-white')}>
                  <div className="flex items-start justify-between gap-3">
                    <span className={cn('rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em]', isUsed ? 'bg-emerald-100 text-emerald-700' : 'bg-[#fff1e8] text-[#c03e15]')}>{isUsed ? 'Canjeado' : isSaved ? 'Guardado' : 'Nuevo'}</span>
                    <QrCode className="h-5 w-5 text-[#d92510]" />
                  </div>
                  <h3 className="mt-3 min-h-10 text-sm font-black leading-tight">{coupon.title}</h3>
                  <p className={cn('mt-2 text-xs font-bold leading-5', isDarkMode ? 'text-white/58' : 'text-[#7a6558]')}>{coupon.business} · {coupon.validUntil}</p>
                  <p className={cn('mt-2 line-clamp-2 text-[11px] font-bold leading-5', isDarkMode ? 'text-white/48' : 'text-[#8a7465]')}>{coupon.condition}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => handleSaveCoupon(coupon)} className={cn('rounded-full px-3 py-2 text-[10px] font-black', isDarkMode ? 'bg-white/10 text-white' : 'bg-[#fff1e8] text-[#c03e15]')}>Guardar</button>
                    <button type="button" onClick={() => handleUseCoupon(coupon)} className="rounded-full bg-[#d92510] px-3 py-2 text-[10px] font-black text-white">Usar</button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
        ) : null}

        {(isMarketplaceOffersOverview || activeMarketplaceSection === 'products') && visibleProducts.length ? (
        <section id="marketplace-products" className="hidden scroll-mt-4 space-y-3 sm:block">
          <h2 className="text-xl font-black tracking-[-0.04em] sm:text-2xl">Productos populares</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {visibleProducts.map((product, index) => (
              <article key={product.id} role="button" tabIndex={0} onClick={() => handleAddProduct(product)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handleAddProduct(product); } }} className={cn('cursor-pointer overflow-hidden rounded-[1.25rem] border shadow-[0_16px_34px_-28px_rgba(22,12,8,0.44)] transition-transform hover:-translate-y-0.5', isDarkMode ? 'border-white/10 bg-white/8' : 'border-white bg-white')}>
                <div className="relative h-28 sm:h-36"><img src={product.imageUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /><span className="absolute left-2 top-2 rounded-full bg-white/92 px-2 py-1 text-[8px] font-black uppercase text-[#c03e15]">{index === 0 ? 'Popular' : index === 1 ? 'Oferta' : product.category}</span></div>
                <div className="p-3"><h3 className="text-sm font-black leading-tight">{product.name}</h3><div className="mt-2 flex items-center justify-between gap-2"><span className="text-sm font-black text-[#d92510]">{product.price}</span><button type="button" onClick={(event) => { event.stopPropagation(); handleAddProduct(product); }} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1b120d] text-white"><ShoppingCart className="h-4 w-4" /></button></div></div>
              </article>
            ))}
          </div>
        </section>
        ) : null}

        {(isMarketplaceOffersOverview || activeMarketplaceSection === 'experiences') && visibleExperiences.length ? (
        <section id="marketplace-experiences" className="hidden scroll-mt-4 space-y-3 sm:block">
          <h2 className="text-xl font-black tracking-[-0.04em] sm:text-2xl">Experiencias falleras</h2>
          <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {visibleExperiences.map((experience, index) => (
              <article key={experience.id} role="button" tabIndex={0} onClick={() => handleReserveExperience(experience)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handleReserveExperience(experience); } }} className={cn('w-[250px] shrink-0 cursor-pointer overflow-hidden rounded-[1.35rem] border shadow-[0_16px_34px_-28px_rgba(22,12,8,0.44)] transition-transform hover:-translate-y-0.5', isDarkMode ? 'border-white/10 bg-white/8' : 'border-white bg-white')}>
                <div className="relative h-32"><img src={experience.imageUrl || marketplaceBusinesses[index % marketplaceBusinesses.length]?.imageUrl || marketplaceProducts[0]?.imageUrl || ''} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /><span className="absolute left-3 top-3 rounded-full bg-white/92 px-2 py-1 text-[9px] font-black text-[#c03e15]">{experience.capacity || (index === 0 ? '8 cupos' : '12 cupos')}</span></div>
                <div className="p-4"><h3 className="text-base font-black leading-tight">{experience.name}</h3><p className={cn('mt-2 line-clamp-2 text-xs font-bold leading-5', isDarkMode ? 'text-white/58' : 'text-[#7a6558]')}>{experience.description}</p><p className={cn('mt-2 truncate text-[10px] font-black', isDarkMode ? 'text-white/46' : 'text-[#8a7465]')}>{[experience.businessName, experience.location].filter(Boolean).join(' · ')}</p><div className="mt-3 flex items-center justify-between"><span className="text-sm font-black text-[#d92510]">{experience.price}</span><span className={cn('text-[10px] font-black', isDarkMode ? 'text-white/46' : 'text-[#8a7465]')}>{experience.duration || '2 h'}</span></div><button type="button" onClick={(event) => { event.stopPropagation(); handleReserveExperience(experience); }} className="mt-3 w-full rounded-full bg-[#d92510] py-2.5 text-[11px] font-black text-white">{experience.actionLabel}</button></div>
              </article>
            ))}
          </div>
        </section>
        ) : null}

        {(isMarketplaceOffersOverview || activeMarketplaceSection === 'providers') && sponsorBusinesses.length ? (
        <section id="marketplace-sponsors" className="hidden scroll-mt-4 space-y-3 sm:block">
          <h2 className="text-xl font-black tracking-[-0.04em] sm:text-2xl">Sponsors</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {(sponsorBusinesses.length ? sponsorBusinesses : marketplaceBusinesses.slice(0, 4)).map((sponsor) => (
              <article key={sponsor.id} className={cn('rounded-[1.25rem] border p-3 shadow-[0_14px_30px_-28px_rgba(22,12,8,0.4)]', isDarkMode ? 'border-white/10 bg-white/8' : 'border-white bg-white')}><div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-[#fff1e8] text-lg font-black text-[#c03e15]">{sponsor.imageUrl ? <img src={sponsor.imageUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : sponsor.name.charAt(0)}</div><h3 className="mt-3 text-sm font-black leading-tight">{sponsor.name}</h3><p className={cn('mt-1 text-[11px] font-bold', isDarkMode ? 'text-white/52' : 'text-[#8a7465]')}>{sponsor.type} · {sponsor.plan}</p><button type="button" onClick={() => { setActiveMarketplaceFilter('Sponsors'); handleOpenBusiness(sponsor); }} className="mt-3 text-[10px] font-black text-[#d92510]">Ver negocio</button></article>
            ))}
          </div>
        </section>
        ) : null}

        {quickMarketplaceFilters.length ? (
        <section id="marketplace-quick-actions" className={cn('hidden scroll-mt-4 rounded-[1.5rem] border p-4 sm:block', isDarkMode ? 'border-white/10 bg-white/8' : 'border-white bg-white')}>
          <h2 className="text-lg font-black tracking-[-0.04em]">Accesos rapidos</h2>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {quickMarketplaceFilters.map((filter) => {
              const filterName = filter.category || filter.label;
              const Icon = filterIcons[filterName] ?? Tag;
              const sectionId = filter.sectionId || marketplaceSectionsByCategory[filterName] || 'marketplace-featured';
              return (
                <button key={filter.id} type="button" onClick={() => activateMarketplaceSection(filterName, sectionId, `Acceso rapido: ${filter.label}`)} className="flex min-w-0 flex-col items-center gap-1.5 text-[8px] font-black text-[#7a6558]"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff1e8] text-[#c03e15]"><Icon className="h-4 w-4" /></span><span className="max-w-full truncate">{filter.label}</span></button>
              );
            })}
          </div>
        </section>
        ) : null}
      </div>

      <AnimatePresence>
        {isMarketplaceEditorOpen && marketplaceEditorDraft ? (
          <motion.div
            className="fixed inset-0 z-[7600] flex justify-end bg-black/45 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMarketplaceEditorOpen(false)}
          >
            <motion.aside
              className={cn('h-full w-full max-w-[620px] overflow-y-auto border-l p-4 shadow-[0_34px_110px_rgba(0,0,0,0.34)] sm:p-5', isDarkMode ? 'border-white/10 bg-slate-950 text-white' : 'border-[#f1e3d8] bg-[#fffaf6] text-[#1b120d]')}
              initial={{ x: 44 }}
              animate={{ x: 0 }}
              exit={{ x: 44 }}
              transition={{ duration: 0.2 }}
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Editor del marketplace"
            >
              <div className="sticky top-0 z-10 -mx-4 -mt-4 border-b border-black/5 bg-inherit px-4 py-4 sm:-mx-5 sm:-mt-5 sm:px-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#d92510]">Editor visual</p>
                    <h2 className="mt-1 text-2xl font-black tracking-[-0.05em]">Marketplace</h2>
                    <p className={cn('mt-1 text-xs font-bold leading-5', isDarkMode ? 'text-white/58' : 'text-[#7a6558]')}>Cambia textos, anade elementos o quita lo que no quieras mostrar.</p>
                  </div>
                  <button type="button" onClick={() => setIsMarketplaceEditorOpen(false)} className={cn('flex h-10 w-10 items-center justify-center rounded-full', isDarkMode ? 'bg-white/10' : 'bg-white')} aria-label="Cerrar editor"><X className="h-4 w-4" /></button>
                </div>
                <div className="mt-4">
                  <button type="button" onClick={() => void saveMarketplaceEditor()} disabled={isMarketplaceSaving} className="rounded-full bg-[#d92510] px-5 py-3 text-sm font-black text-white disabled:opacity-60">{isMarketplaceSaving ? 'Guardando...' : 'Guardar cambios'}</button>
                </div>
                {marketplaceEditorNotice ? <p className="mt-3 rounded-2xl bg-[#fff1e8] px-4 py-3 text-xs font-black text-[#c03e15]">{marketplaceEditorNotice}</p> : null}
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[220px_1fr]">
                <aside className={cn('rounded-[1.4rem] border p-3', isDarkMode ? 'border-white/10 bg-white/6' : 'border-white bg-white')}>
                  <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
                    {[
                      { key: 'cover', label: 'Portada', count: 1, icon: Sparkles },
                      ...marketplaceEditorCollections.map((collection) => ({
                        key: collection.key,
                        label: collection.label,
                        count: ((marketplaceEditorDraft[collection.key] ?? []) as unknown[]).length,
                        icon: collection.key === 'businesses' ? Store : collection.key === 'coupons' ? BadgePercent : collection.key === 'products' ? ShoppingBag : Star,
                      })),
                    ].map((item) => {
                      const Icon = item.icon;
                      const isActive = marketplaceEditorSection === item.key;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => {
                            setMarketplaceEditorSection(item.key as typeof marketplaceEditorSection);
                            setMarketplaceEditorSelectedIndex(0);
                          }}
                          className={cn('flex min-w-0 items-center justify-between gap-2 rounded-2xl px-3 py-3 text-left text-xs font-black transition-colors', isActive ? 'bg-[#d92510] text-white shadow-[0_14px_28px_rgba(217,37,16,0.2)]' : isDarkMode ? 'bg-white/8 text-white/70 hover:bg-white/12' : 'bg-[#fff7ef] text-[#6f5a4c] hover:bg-[#fff1e8]')}
                        >
                          <span className="flex min-w-0 items-center gap-2"><Icon className="h-4 w-4 shrink-0" /><span className="truncate">{item.label}</span></span>
                          <span className={cn('rounded-full px-2 py-1 text-[10px]', isActive ? 'bg-white/18 text-white' : 'bg-white text-[#c03e15]')}>{item.count}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className={cn('mt-3 rounded-2xl px-3 py-3 text-[11px] font-bold leading-5', isDarkMode ? 'bg-white/6 text-white/58' : 'bg-[#fff7ef] text-[#7a6558]')}>
                    Gestiona por bloques: eliges seccion, seleccionas elemento, editas y guardas.
                  </div>
                </aside>

                <section className={cn('min-w-0 rounded-[1.4rem] border p-4', isDarkMode ? 'border-white/10 bg-white/6' : 'border-white bg-white')}>
                  {marketplaceEditorSection === 'cover' ? (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-black tracking-[-0.04em]">Portada del marketplace</h3>
                          <p className={cn('mt-1 text-xs font-bold', isDarkMode ? 'text-white/52' : 'text-[#7a6558]')}>Textos principales que ve el usuario al abrir Marketplace.</p>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3">
                        {[
                          ['eyebrow', 'Etiqueta superior'],
                          ['location_label', 'Ubicacion'],
                          ['hero_title', 'Titulo grande'],
                          ['hero_subtitle', 'Descripcion'],
                          ['featured_badge', 'Etiqueta destacada'],
                          ['quick_access_label', 'Texto accesos rapidos'],
                        ].map(([key, label]) => (
                          <label key={key} className="grid gap-1.5 text-xs font-black">
                            <span>{label}</span>
                            {key === 'hero_subtitle' ? (
                              <textarea value={marketplaceEditorDraft.settings?.[key] ?? ''} onChange={(event) => updateMarketplaceDraftSetting(key, event.target.value)} rows={4} className={cn('rounded-2xl border px-3 py-2 text-sm font-bold outline-none', isDarkMode ? 'border-white/10 bg-slate-900 text-white' : 'border-[#efd9c9] bg-[#fffaf6] text-[#1b120d]')} />
                            ) : (
                              <input value={marketplaceEditorDraft.settings?.[key] ?? ''} onChange={(event) => updateMarketplaceDraftSetting(key, event.target.value)} className={cn('h-11 rounded-2xl border px-3 text-sm font-bold outline-none', isDarkMode ? 'border-white/10 bg-slate-900 text-white' : 'border-[#efd9c9] bg-[#fffaf6] text-[#1b120d]')} />
                            )}
                          </label>
                        ))}
                      </div>
                    </>
                  ) : (() => {
                    const collection = marketplaceEditorCollections.find((item) => item.key === marketplaceEditorSection);
                    if (!collection) {
                      return null;
                    }
                    const rows = (marketplaceEditorDraft[collection.key] ?? []) as Array<Record<string, string>>;
                    const selectedIndex = Math.min(marketplaceEditorSelectedIndex, Math.max(0, rows.length - 1));
                    const selectedRow = rows[selectedIndex] ?? null;
                    const fields = collection.key === 'businesses'
                      ? [['name', 'Nombre'], ['type', 'Tipo'], ['location', 'Zona'], ['distance', 'Distancia'], ['badge', 'Etiqueta'], ['category', 'Categoria'], ['plan', 'Plan'], ['actionLabel', 'Boton'], ['phone', 'Telefono'], ['whatsapp', 'WhatsApp'], ['email', 'Email'], ['website', 'Web'], ['imageUrl', 'Imagen URL'], ['promotion', 'Oferta principal']]
                      : collection.key === 'coupons'
                        ? [['title', 'Titulo'], ['business', 'Negocio'], ['validUntil', 'Validez'], ['actionLabel', 'Boton'], ['condition', 'Condiciones']]
                        : collection.key === 'products'
                          ? [['name', 'Nombre'], ['price', 'Precio'], ['category', 'Categoria'], ['imageUrl', 'Imagen URL']]
                          : [['name', 'Nombre'], ['price', 'Precio'], ['actionLabel', 'Boton'], ['description', 'Descripcion']];
                    return (
                      <div className="grid gap-4 xl:grid-cols-[minmax(210px,0.85fr)_minmax(0,1.15fr)]">
                        <div className="min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <h3 className="text-lg font-black tracking-[-0.04em]">{collection.label}</h3>
                              <p className={cn('mt-1 text-xs font-bold', isDarkMode ? 'text-white/52' : 'text-[#7a6558]')}>{rows.length} elementos activos.</p>
                            </div>
                            <button type="button" onClick={() => addMarketplaceDraftItem(collection.key, collection.empty)} className="inline-flex items-center gap-1.5 rounded-full bg-[#d92510] px-3 py-2 text-[11px] font-black text-white"><Plus className="h-3.5 w-3.5" /> Nuevo</button>
                          </div>
                          <div className="mt-3 max-h-[58vh] space-y-2 overflow-y-auto pr-1">
                            {rows.length === 0 ? (
                              <button type="button" onClick={() => addMarketplaceDraftItem(collection.key, collection.empty)} className={cn('w-full rounded-2xl border border-dashed px-4 py-8 text-sm font-black', isDarkMode ? 'border-white/14 text-white/58' : 'border-[#efd9c9] text-[#7a6558]')}>Crear primer elemento</button>
                            ) : null}
                            {rows.map((row, index) => {
                              const title = row.name || row.title || `Elemento ${index + 1}`;
                              const subtitle = row.business || row.category || row.type || row.price || 'Sin detalle';
                              const selected = index === selectedIndex;
                              return (
                                <button key={row.id ?? index} type="button" onClick={() => setMarketplaceEditorSelectedIndex(index)} className={cn('w-full rounded-2xl border p-3 text-left transition-colors', selected ? 'border-[#d92510] bg-[#fff1e8] text-[#1b120d]' : isDarkMode ? 'border-white/10 bg-slate-900/60 text-white/72 hover:bg-white/10' : 'border-[#f1e3d8] bg-[#fffaf6] text-[#6f5a4c] hover:bg-white')}>
                                  <span className="block truncate text-sm font-black">{title}</span>
                                  <span className="mt-1 block truncate text-[11px] font-bold opacity-70">{subtitle}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div className="min-w-0">
                          {selectedRow ? (
                            <>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <h4 className="truncate text-base font-black">{selectedRow.name || selectedRow.title || 'Elemento sin titulo'}</h4>
                                  <p className={cn('text-[11px] font-bold', isDarkMode ? 'text-white/50' : 'text-[#8a7465]')}>Editando #{selectedIndex + 1}</p>
                                </div>
                                <div className="flex gap-2">
                                  <button type="button" onClick={() => duplicateMarketplaceDraftItem(collection.key, selectedIndex)} className={cn('rounded-full px-3 py-2 text-[10px] font-black', isDarkMode ? 'bg-white/10 text-white' : 'bg-[#fff1e8] text-[#c03e15]')}>Duplicar</button>
                                  <button type="button" onClick={() => removeMarketplaceDraftItem(collection.key, selectedIndex)} className="rounded-full bg-red-50 px-3 py-2 text-[10px] font-black text-red-600">Eliminar</button>
                                </div>
                              </div>
                              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                {fields.map(([field, label]) => {
                                  const isLong = ['promotion', 'condition', 'description', 'imageUrl'].includes(field);
                                  return (
                                    <label key={field} className={cn('grid gap-1.5 text-[11px] font-black', isLong ? 'sm:col-span-2' : '')}>
                                      <span>{label}</span>
                                      {['promotion', 'condition', 'description'].includes(field) ? (
                                        <textarea value={selectedRow[field] ?? ''} onChange={(event) => updateMarketplaceDraftItem(collection.key, selectedIndex, field, event.target.value)} rows={4} className={cn('rounded-2xl border px-3 py-2 text-sm font-bold outline-none', isDarkMode ? 'border-white/10 bg-slate-900 text-white' : 'border-[#efd9c9] bg-[#fffaf6] text-[#1b120d]')} />
                                      ) : (
                                        <input value={selectedRow[field] ?? ''} onChange={(event) => updateMarketplaceDraftItem(collection.key, selectedIndex, field, event.target.value)} className={cn('h-11 rounded-2xl border px-3 text-sm font-bold outline-none', isDarkMode ? 'border-white/10 bg-slate-900 text-white' : 'border-[#efd9c9] bg-[#fffaf6] text-[#1b120d]')} />
                                      )}
                                    </label>
                                  );
                                })}
                              </div>
                            </>
                          ) : (
                            <div className={cn('rounded-2xl border border-dashed px-4 py-10 text-center text-sm font-black', isDarkMode ? 'border-white/14 text-white/58' : 'border-[#efd9c9] text-[#7a6558]')}>Selecciona o crea un elemento para editarlo.</div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </section>
              </div>

              {false ? (
              <div className="mt-5 space-y-5">
                <section className={cn('rounded-[1.4rem] border p-4', isDarkMode ? 'border-white/10 bg-white/6' : 'border-white bg-white')}>
                  <h3 className="text-base font-black">Portada</h3>
                  <div className="mt-3 grid gap-3">
                    {[
                      ['eyebrow', 'Etiqueta superior'],
                      ['location_label', 'Ubicacion'],
                      ['hero_title', 'Titulo grande'],
                      ['hero_subtitle', 'Descripcion'],
                      ['featured_badge', 'Etiqueta destacada'],
                      ['quick_access_label', 'Texto accesos rapidos'],
                    ].map(([key, label]) => (
                      <label key={key} className="grid gap-1.5 text-xs font-black">
                        <span>{label}</span>
                        {key === 'hero_subtitle' ? (
                          <textarea value={marketplaceEditorDraft.settings?.[key] ?? ''} onChange={(event) => updateMarketplaceDraftSetting(key, event.target.value)} rows={3} className={cn('rounded-2xl border px-3 py-2 text-sm font-bold outline-none', isDarkMode ? 'border-white/10 bg-white/8 text-white' : 'border-[#efd9c9] bg-[#fffaf6] text-[#1b120d]')} />
                        ) : (
                          <input value={marketplaceEditorDraft.settings?.[key] ?? ''} onChange={(event) => updateMarketplaceDraftSetting(key, event.target.value)} className={cn('h-11 rounded-2xl border px-3 text-sm font-bold outline-none', isDarkMode ? 'border-white/10 bg-white/8 text-white' : 'border-[#efd9c9] bg-[#fffaf6] text-[#1b120d]')} />
                        )}
                      </label>
                    ))}
                  </div>
                </section>

                {marketplaceEditorCollections.map((collection) => {
                  const rows = (marketplaceEditorDraft[collection.key] ?? []) as Array<Record<string, string>>;
                  return (
                    <section key={collection.key} className={cn('rounded-[1.4rem] border p-4', isDarkMode ? 'border-white/10 bg-white/6' : 'border-white bg-white')}>
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-base font-black">{collection.label}</h3>
                        <button type="button" onClick={() => addMarketplaceDraftItem(collection.key, collection.empty)} className="inline-flex items-center gap-1.5 rounded-full bg-[#fff1e8] px-3 py-2 text-[11px] font-black text-[#c03e15]"><Plus className="h-3.5 w-3.5" /> Anadir</button>
                      </div>
                      <div className="mt-3 space-y-3">
                        {rows.length === 0 ? <p className={cn('rounded-2xl px-4 py-5 text-sm font-bold', isDarkMode ? 'bg-white/8 text-white/58' : 'bg-[#fff7ef] text-[#7a6558]')}>No hay elementos activos en esta seccion.</p> : null}
                        {rows.map((row, index) => (
                          <article key={row.id ?? index} className={cn('rounded-[1.15rem] border p-3', isDarkMode ? 'border-white/10 bg-slate-900/60' : 'border-[#f1e3d8] bg-[#fffaf6]')}>
                            <div className="flex items-center justify-between gap-3">
                              <strong className="truncate text-sm">{row.name || row.title || `Elemento ${index + 1}`}</strong>
                              <button type="button" onClick={() => removeMarketplaceDraftItem(collection.key, index)} className="rounded-full bg-red-50 px-3 py-1.5 text-[10px] font-black text-red-600">Quitar</button>
                            </div>
                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                              {collection.key === 'businesses' ? (
                                <>
                                  {[
                                    ['name', 'Nombre'], ['type', 'Tipo'], ['location', 'Zona'], ['distance', 'Distancia'], ['badge', 'Etiqueta'], ['category', 'Categoria'], ['plan', 'Plan'], ['actionLabel', 'Boton'], ['phone', 'Telefono'], ['whatsapp', 'WhatsApp'], ['email', 'Email'], ['website', 'Web'], ['imageUrl', 'Imagen URL'],
                                  ].map(([field, label]) => (
                                    <label key={field} className={cn('grid gap-1 text-[11px] font-black', field === 'imageUrl' ? 'sm:col-span-2' : '')}><span>{label}</span><input value={row[field] ?? ''} onChange={(event) => updateMarketplaceDraftItem(collection.key, index, field, event.target.value)} className={cn('h-10 rounded-xl border px-3 text-xs font-bold outline-none', isDarkMode ? 'border-white/10 bg-white/8 text-white' : 'border-[#efd9c9] bg-white text-[#1b120d]')} /></label>
                                  ))}
                                  <label className="grid gap-1 text-[11px] font-black sm:col-span-2"><span>Oferta principal</span><textarea value={row.promotion ?? ''} onChange={(event) => updateMarketplaceDraftItem(collection.key, index, 'promotion', event.target.value)} rows={3} className={cn('rounded-xl border px-3 py-2 text-xs font-bold outline-none', isDarkMode ? 'border-white/10 bg-white/8 text-white' : 'border-[#efd9c9] bg-white text-[#1b120d]')} /></label>
                                </>
                              ) : null}
                              {collection.key === 'coupons' ? (
                                <>
                                  {[['title', 'Titulo'], ['business', 'Negocio'], ['validUntil', 'Validez'], ['actionLabel', 'Boton']].map(([field, label]) => (
                                    <label key={field} className="grid gap-1 text-[11px] font-black"><span>{label}</span><input value={row[field] ?? ''} onChange={(event) => updateMarketplaceDraftItem(collection.key, index, field, event.target.value)} className={cn('h-10 rounded-xl border px-3 text-xs font-bold outline-none', isDarkMode ? 'border-white/10 bg-white/8 text-white' : 'border-[#efd9c9] bg-white text-[#1b120d]')} /></label>
                                  ))}
                                  <label className="grid gap-1 text-[11px] font-black sm:col-span-2"><span>Condiciones</span><textarea value={row.condition ?? ''} onChange={(event) => updateMarketplaceDraftItem(collection.key, index, 'condition', event.target.value)} rows={3} className={cn('rounded-xl border px-3 py-2 text-xs font-bold outline-none', isDarkMode ? 'border-white/10 bg-white/8 text-white' : 'border-[#efd9c9] bg-white text-[#1b120d]')} /></label>
                                </>
                              ) : null}
                              {collection.key === 'products' ? (
                                <>
                                  {[['name', 'Nombre'], ['price', 'Precio'], ['category', 'Categoria'], ['imageUrl', 'Imagen URL']].map(([field, label]) => (
                                    <label key={field} className={cn('grid gap-1 text-[11px] font-black', field === 'imageUrl' ? 'sm:col-span-2' : '')}><span>{label}</span><input value={row[field] ?? ''} onChange={(event) => updateMarketplaceDraftItem(collection.key, index, field, event.target.value)} className={cn('h-10 rounded-xl border px-3 text-xs font-bold outline-none', isDarkMode ? 'border-white/10 bg-white/8 text-white' : 'border-[#efd9c9] bg-white text-[#1b120d]')} /></label>
                                  ))}
                                </>
                              ) : null}
                              {collection.key === 'experiences' ? (
                                <>
                                  {[['name', 'Nombre'], ['price', 'Precio'], ['actionLabel', 'Boton'], ['location', 'Ubicacion'], ['duration', 'Duracion'], ['capacity', 'Cupos'], ['businessName', 'Organizador'], ['contactChannel', 'Contacto'], ['imageUrl', 'Imagen URL']].map(([field, label]) => (
                                    <label key={field} className="grid gap-1 text-[11px] font-black"><span>{label}</span><input value={row[field] ?? ''} onChange={(event) => updateMarketplaceDraftItem(collection.key, index, field, event.target.value)} className={cn('h-10 rounded-xl border px-3 text-xs font-bold outline-none', isDarkMode ? 'border-white/10 bg-white/8 text-white' : 'border-[#efd9c9] bg-white text-[#1b120d]')} /></label>
                                  ))}
                                  <label className="grid gap-1 text-[11px] font-black sm:col-span-2"><span>Descripcion</span><textarea value={row.description ?? ''} onChange={(event) => updateMarketplaceDraftItem(collection.key, index, 'description', event.target.value)} rows={3} className={cn('rounded-xl border px-3 py-2 text-xs font-bold outline-none', isDarkMode ? 'border-white/10 bg-white/8 text-white' : 'border-[#efd9c9] bg-white text-[#1b120d]')} /></label>
                                </>
                              ) : null}
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
              ) : null}
            </motion.aside>
          </motion.div>
        ) : null}

        {redeemingCoupon ? (
          <motion.div
            className="fixed inset-0 z-[7200] flex items-end justify-center bg-black/58 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] backdrop-blur-md sm:items-center sm:pb-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setRedeemingCoupon(null)}
          >
            <motion.div
              className={cn('w-full max-w-[430px] overflow-hidden rounded-[2rem] shadow-[0_34px_100px_rgba(0,0,0,0.42)]', isDarkMode ? 'bg-slate-950 text-white' : 'bg-white text-[#1b120d]')}
              initial={{ y: 34, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 26, scale: 0.98 }}
              transition={{ duration: 0.22 }}
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Canjear cupon"
            >
              <div className="relative bg-[#1b120d] px-5 pb-5 pt-4 text-white">
                <button type="button" onClick={() => setRedeemingCoupon(null)} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/12 text-white" aria-label="Cerrar canje"><X className="h-4 w-4" /></button>
                <div className="flex items-center gap-3 pr-12">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ff5a1f] text-white"><QrCode className="h-5 w-5" /></span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ffd28a]">Canje en caja</p>
                    <h2 className="truncate text-xl font-black tracking-[-0.04em]">{redeemingCoupon.business}</h2>
                  </div>
                </div>
                <p className="mt-4 text-sm font-bold leading-5 text-white/72">{redeemingCoupon.title}</p>
              </div>

              <div className="p-5">
                <div className={cn('rounded-[1.6rem] border p-4 text-center', isDarkMode ? 'border-white/10 bg-white/6' : 'border-[#f1e3d8] bg-[#fffaf6]')}>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c03e15]">Ensena esta pantalla</p>
                  <div className="mx-auto mt-4 grid h-48 w-48 grid-cols-7 gap-1 rounded-[1.4rem] bg-white p-3 shadow-inner">
                    {Array.from({ length: 49 }).map((_, index) => {
                      const row = Math.floor(index / 7);
                      const column = index % 7;
                      const finder = (row < 2 && column < 2) || (row < 2 && column > 4) || (row > 4 && column < 2);
                      const active = finder || (index + redeemingCoupon.id.length + row * column) % 3 !== 0;
                      return <span key={index} className={cn('rounded-[4px]', active ? 'bg-[#1b120d]' : 'bg-[#ffe5d5]')} />;
                    })}
                  </div>
                  <div className="mx-auto mt-4 flex h-14 max-w-[240px] items-end justify-center gap-1 rounded-xl bg-white px-3 pb-2 shadow-inner">
                    {Array.from({ length: 30 }).map((_, index) => <span key={index} className="bg-[#1b120d]" style={{ width: index % 5 === 0 ? 3 : 2, height: `${18 + ((index * 7) % 24)}px` }} />)}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard?.writeText(getCouponRedeemCode(redeemingCoupon));
                      showMarketplaceNotice('Codigo de canje copiado');
                    }}
                    className="mt-4 w-full rounded-2xl border border-[#ffd4c0] bg-white px-4 py-3 text-sm font-black tracking-[0.12em] text-[#1b120d]"
                  >
                    {getCouponRedeemCode(redeemingCoupon)}
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {[
                    ['Validez', 'Hoy 23:59'],
                    ['Estado', usedCouponIds.includes(redeemingCoupon.id) ? 'Canjeado' : 'Activo'],
                    ['Metodo', 'QR + codigo'],
                  ].map(([label, value]) => (
                    <div key={label} className={cn('rounded-2xl px-2 py-3', isDarkMode ? 'bg-white/8' : 'bg-[#f8efe7]')}>
                      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#c03e15]">{label}</p>
                      <p className="mt-1 text-[11px] font-black">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-black leading-5 text-emerald-800">
                  El comercio escanea este QR o introduce el codigo para validar el canje.
                </div>

                <div className="mt-4 grid grid-cols-[1fr_auto] gap-3">
                  <button type="button" onClick={() => confirmCouponRedeem(redeemingCoupon)} className="rounded-full bg-[#d92510] px-5 py-3.5 text-sm font-black text-white shadow-[0_14px_28px_rgba(217,37,16,0.24)]">Confirmar canje</button>
                  <button type="button" onClick={() => setRedeemingCoupon(null)} className={cn('flex h-12 w-12 items-center justify-center rounded-full', isDarkMode ? 'bg-white/10 text-white' : 'bg-[#fff1e8] text-[#c03e15]')} aria-label="Cerrar"><X className="h-5 w-5" /></button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}

        {marketplaceDetail ? (
          <motion.div
            className="fixed inset-0 z-[7000] flex items-end justify-center bg-black/45 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] backdrop-blur-sm sm:items-center sm:pb-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMarketplaceDetail(null)}
          >
            <motion.div
              className={cn('max-h-[92vh] w-full max-w-[560px] overflow-hidden rounded-[2rem] border shadow-[0_30px_90px_rgba(0,0,0,0.34)]', isDarkMode ? 'border-white/10 bg-slate-950 text-white' : 'border-white bg-white text-[#1b120d]')}
              initial={{ y: 32, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 24, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div className="relative h-48 bg-[linear-gradient(135deg,#1b120d,#d92510_55%,#ffd28a)]">
                {marketplaceDetail.imageUrl ? <img src={marketplaceDetail.imageUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : null}
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.58))]" />
                <button type="button" onClick={() => setMarketplaceDetail(null)} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/92 text-[#1b120d] shadow-lg" aria-label="Cerrar detalle"><X className="h-4 w-4" /></button>
                <span className="absolute bottom-4 left-4 rounded-full bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#c03e15]">{marketplaceDetail.eyebrow}</span>
              </div>
              <div className="max-h-[calc(92vh-12rem)] overflow-y-auto p-5 sm:p-6">
                <h2 className="text-2xl font-black leading-tight tracking-[-0.04em] sm:text-3xl">{marketplaceDetail.title}</h2>
                <p className={cn('mt-3 text-sm font-bold leading-6', isDarkMode ? 'text-white/64' : 'text-[#6f5a4c]')}>{marketplaceDetail.description}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-black">
                  <span className="rounded-full bg-[#fff1e8] px-3 py-2 text-[#c03e15]">{marketplaceDetail.meta}</span>
                  <span className={cn('rounded-full px-3 py-2', isDarkMode ? 'bg-white/10 text-white/72' : 'bg-[#f8efe7] text-[#7a6558]')}>Fallas 360 verificado</span>
                </div>
                {marketplaceDetail.business ? (
                  <div className={cn('mt-5 rounded-[1.35rem] border p-4', isDarkMode ? 'border-white/10 bg-white/6' : 'border-[#f1e3d8] bg-[#fffaf6]')}>
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#fff1e8] text-[#c03e15]">
                        <Store className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#c03e15]">{marketplaceDetail.business.type || 'Marketplace'}</p>
                        <h3 className="mt-1 truncate text-lg font-black">{marketplaceDetail.business.name}</h3>
                        <p className={cn('mt-1 text-xs font-bold', isDarkMode ? 'text-white/58' : 'text-[#7a6558]')}>{marketplaceDetail.business.type} · {marketplaceDetail.business.location}</p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      {[
                        ['Distancia', marketplaceDetail.offer?.distance ?? marketplaceDetail.business.distance],
                        ['Zona', marketplaceDetail.business.location],
                        ['Plan', marketplaceDetail.business.plan === 'Premium/Fallas Boost' ? 'Premium' : marketplaceDetail.business.plan],
                      ].map(([label, value]) => (
                        <div key={label} className={cn('rounded-2xl px-2 py-3', isDarkMode ? 'bg-white/8' : 'bg-white')}>
                          <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#c03e15]">{label}</p>
                          <p className="mt-1 truncate text-[11px] font-black">{value}</p>
                        </div>
                      ))}
                    </div>
                    {marketplaceDetail.offer ? (
                      <div className={cn('mt-3 rounded-2xl px-4 py-3', isDarkMode ? 'bg-white/8' : 'bg-white')}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#c03e15]">Oferta activa</p>
                            <h4 className="mt-1 text-sm font-black leading-tight">{marketplaceDetail.offer.title}</h4>
                          </div>
                          <span className="shrink-0 rounded-full bg-[#d92510] px-3 py-1.5 text-[11px] font-black text-white">{marketplaceDetail.offer.price}</span>
                        </div>
                        <p className={cn('mt-2 text-xs font-bold leading-5', isDarkMode ? 'text-white/58' : 'text-[#7a6558]')}>{marketplaceDetail.offer.condition}</p>
                      </div>
                    ) : null}
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => { showMarketplaceNotice(`Ruta a ${marketplaceDetail.business?.name}`); onOpenMap(); setMarketplaceDetail(null); }} className={cn('inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-xs font-black', isDarkMode ? 'bg-white/10 text-white' : 'bg-[#1b120d] text-white')}><Navigation className="h-4 w-4" /> Ruta</button>
                      <button type="button" onClick={() => showMarketplaceNotice(`Guardado: ${marketplaceDetail.business?.name}`)} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#fff1e8] px-4 py-3 text-xs font-black text-[#c03e15]"><Heart className="h-4 w-4" /> Guardar</button>
                    </div>
                    {marketplaceDetail.business.badge === 'Sponsor' || marketplaceDetail.business.category === 'Sponsors' ? (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <button type="button" onClick={() => contactProvider(marketplaceDetail.business!, 'whatsapp')} className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#25d366] px-3 py-3 text-[11px] font-black text-white"><MessageCircle className="h-4 w-4" /> WhatsApp</button>
                        <button type="button" onClick={() => contactProvider(marketplaceDetail.business!, 'phone')} className={cn('inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-3 text-[11px] font-black', isDarkMode ? 'bg-white/10 text-white' : 'bg-[#eaf2ff] text-[#0d4c9e]')}><Phone className="h-4 w-4" /> Llamar</button>
                        <button type="button" onClick={() => contactProvider(marketplaceDetail.business!, 'email')} className={cn('inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-3 text-[11px] font-black', isDarkMode ? 'bg-white/10 text-white' : 'bg-[#fff1e8] text-[#c03e15]')}><Mail className="h-4 w-4" /> Email</button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <div className="mt-5 grid grid-cols-[1fr_auto] gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const detailCoupon = marketplaceDetail.couponId ? marketplaceCoupons.find((coupon) => coupon.id === marketplaceDetail.couponId) : null;
                      if (detailCoupon) {
                        openCouponRedeemer(detailCoupon);
                        return;
                      }
                      if (marketplaceDetail.business && (marketplaceDetail.business.badge === 'Sponsor' || marketplaceDetail.business.category === 'Sponsors')) {
                        contactProvider(marketplaceDetail.business);
                        return;
                      }
                      showMarketplaceNotice(`${marketplaceDetail.primaryAction}: ${marketplaceDetail.title}`);
                      setMarketplaceDetail(null);
                    }}
                    className="rounded-full bg-[#d92510] px-5 py-3 text-sm font-black text-white shadow-[0_14px_28px_rgba(217,37,16,0.24)]"
                  >{marketplaceDetail.primaryAction}</button>
                  <button type="button" onClick={() => showMarketplaceNotice(`Guardado en favoritos: ${marketplaceDetail.title}`)} className={cn('flex h-12 w-12 items-center justify-center rounded-full', isDarkMode ? 'bg-white/10 text-white' : 'bg-[#fff1e8] text-[#c03e15]')} aria-label="Guardar favorito"><Heart className="h-5 w-5" /></button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}

        {providerContactBusiness ? (
          <motion.div
            className="fixed inset-0 z-[7100] flex items-stretch justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:px-3 sm:pb-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setProviderContactBusiness(null)}
          >
            <motion.div
              className={cn('flex h-dvh w-full max-w-none flex-col overflow-hidden border-0 shadow-[0_30px_90px_rgba(0,0,0,0.34)] sm:h-auto sm:max-h-[92vh] sm:max-w-[520px] sm:rounded-[1.7rem] sm:border', isDarkMode ? 'border-white/10 bg-slate-950 text-white' : 'border-white bg-white text-[#1b120d]')}
              initial={{ y: 32, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 24, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Chat de contacto"
            >
              <div className={cn('flex shrink-0 items-center justify-between gap-3 border-b px-4 pb-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] sm:py-4', isDarkMode ? 'border-white/10' : 'border-[#f1e3d8]')}>
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-[#fff1e8] text-[#c03e15]">
                    {providerContactBusiness.imageUrl ? <img src={providerContactBusiness.imageUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : <UsersRound className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#c03e15]">Chat marketplace</p>
                    <h2 className="truncate text-base font-black">{providerContactBusiness.name}</h2>
                  </div>
                </div>
                <button type="button" onClick={() => setProviderContactBusiness(null)} className={cn('grid h-10 w-10 place-items-center rounded-full', isDarkMode ? 'bg-white/10' : 'bg-[#fff1e8] text-[#c03e15]')} aria-label="Cerrar contacto"><X className="h-4 w-4" /></button>
              </div>

              <div className="flex min-h-0 flex-1 flex-col p-4">
                <div className={cn('rounded-[1.2rem] px-4 py-3 text-sm font-bold leading-6', isDarkMode ? 'bg-white/8 text-white/72' : 'bg-[#fff8ef] text-[#6f5a4c]')}>
                  Conversacion directa dentro de Falles360. Responde a esta oferta para dejar abierto el contacto.
                </div>

                <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                  {(activeProviderThread?.messages.length ? activeProviderThread.messages : [{
                    id: 'provider-greeting',
                    from: 'provider' as const,
                    text: buildProviderOfferMessage(providerContactBusiness),
                    createdAt: new Date().toISOString(),
                  }]).map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        'max-w-[88%] rounded-[1.1rem] px-4 py-3 text-sm font-bold leading-6',
                        message.from === 'user'
                          ? 'ml-auto rounded-tr-sm bg-[#d92510] text-white'
                          : isDarkMode ? 'rounded-tl-sm bg-white/10 text-white' : 'rounded-tl-sm bg-[#f4f7fb] text-[#1b120d]'
                      )}
                    >
                      <p>{message.text}</p>
                      {message.from === 'user' && message.delivery ? (
                        <p className={cn('mt-1 text-[9px] font-black uppercase tracking-[0.12em]', message.delivery === 'email_failed' ? 'text-amber-100' : 'text-white/70')}>
                          {message.delivery === 'email_sent' ? 'Enviado por email' : message.delivery === 'email_failed' ? 'Email no enviado' : 'Guardado en chat'}
                        </p>
                      ) : null}
                      <p className={cn('mt-1 text-[9px] font-black uppercase tracking-[0.12em]', message.from === 'user' ? 'text-white/70' : isDarkMode ? 'text-white/40' : 'text-slate-400')}>
                        {new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(new Date(message.createdAt))}
                      </p>
                    </div>
                  ))}
                </div>

                {providerContactSent ? (
                  <div className="mt-4 rounded-[1.1rem] bg-emerald-50 px-4 py-3 text-sm font-black leading-6 text-emerald-800">
                    Mensaje enviado por email y guardado en el chat. Si el proveedor responde desde Falles360, aparecera aqui.
                  </div>
                ) : null}

                <div className="mt-4 shrink-0">
                  <textarea
                    ref={providerContactTextareaRef}
                    value={providerContactMessage}
                    onChange={(event) => {
                      setProviderContactMessage(event.target.value);
                      setProviderContactSent(false);
                    }}
                    rows={3}
                    className={cn('w-full resize-none rounded-[1.1rem] border px-4 py-3 text-sm font-bold leading-6 outline-none', isDarkMode ? 'border-white/10 bg-white/8 text-white placeholder:text-white/35' : 'border-[#efd9c9] bg-[#fffaf6] text-[#1b120d]')}
                    placeholder={providerContactChannel === 'email' ? 'Escribe el email para el proveedor...' : 'Escribe otro mensaje...'}
                  />
                  <button type="button" onClick={() => void sendProviderContactMessage()} disabled={isProviderContactSending} className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#d92510] text-sm font-black text-white shadow-[0_14px_28px_rgba(217,37,16,0.24)] disabled:opacity-60">
                    <SendHorizontal className="h-4 w-4" /> {isProviderContactSending ? 'Enviando email...' : providerContactChannel === 'email' ? 'Enviar por email' : 'Enviar mensaje'}
                  </button>
                </div>

                <div className="mt-4 grid shrink-0 grid-cols-3 gap-2 pb-[env(safe-area-inset-bottom,0px)]">
                  <button type="button" onClick={() => contactProvider(providerContactBusiness, 'whatsapp')} className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-[#25d366] px-3 text-[11px] font-black text-white"><MessageCircle className="h-4 w-4" /> WhatsApp</button>
                  <button type="button" onClick={() => contactProvider(providerContactBusiness, 'phone')} className={cn('inline-flex h-11 items-center justify-center gap-1.5 rounded-full px-3 text-[11px] font-black', isDarkMode ? 'bg-white/10 text-white' : 'bg-[#eaf2ff] text-[#0d4c9e]')}><Phone className="h-4 w-4" /> Llamar</button>
                  <button type="button" onClick={() => contactProvider(providerContactBusiness, 'email')} className={cn('inline-flex h-11 items-center justify-center gap-1.5 rounded-full px-3 text-[11px] font-black', providerContactChannel === 'email' ? 'bg-[#d92510] text-white' : isDarkMode ? 'bg-white/10 text-white' : 'bg-[#fff1e8] text-[#c03e15]')}><Mail className="h-4 w-4" /> Email</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}

        {isMarketplaceChatsOpen ? (
          <motion.div
            className="fixed inset-0 z-[7050] flex items-stretch justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:px-3 sm:pb-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMarketplaceChatsOpen(false)}
          >
            <motion.div
              className={cn('flex h-dvh w-full max-w-none flex-col overflow-hidden border-0 shadow-[0_30px_90px_rgba(0,0,0,0.34)] sm:h-auto sm:max-h-[88vh] sm:max-w-[520px] sm:rounded-[1.6rem] sm:border', isDarkMode ? 'border-white/10 bg-slate-950 text-white' : 'border-white bg-white text-[#1b120d]')}
              initial={{ y: 32, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 24, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Chats del marketplace"
            >
              <div className={cn('shrink-0 border-b px-4 pb-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] sm:py-4', isDarkMode ? 'border-white/10' : 'border-[#f1e3d8]')}>
                <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#c03e15]">Marketplace</p>
                  <h2 className="text-xl font-black tracking-[-0.03em]">Chats abiertos</h2>
                </div>
                <button type="button" onClick={() => setIsMarketplaceChatsOpen(false)} className={cn('grid h-10 w-10 place-items-center rounded-full', isDarkMode ? 'bg-white/10' : 'bg-[#fff1e8] text-[#c03e15]')} aria-label="Cerrar chats"><X className="h-4 w-4" /></button>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="rounded-full bg-[#d92510] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white">{marketplaceContactThreadList.length} abiertos</span>
                  <span className={cn('rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em]', isDarkMode ? 'bg-white/10 text-white/58' : 'bg-[#fff8ef] text-[#7a6558]')}>Guardados en este dispositivo</span>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-3 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] sm:p-4">
                {marketplaceContactThreadList.length ? (
                  <div className="overflow-hidden rounded-[1.25rem] border border-[#f1e3d8] bg-white sm:rounded-[1.35rem]">
                    {marketplaceContactThreadList.map((thread) => {
                      const lastMessage = thread.messages[thread.messages.length - 1];
                      return (
                        <button key={thread.businessId} type="button" onClick={() => openProviderThreadFromList(thread)} className={cn('flex w-full items-center gap-3 border-b p-3 text-left transition-colors last:border-b-0 sm:p-4', isDarkMode ? 'border-white/10 bg-white/6 hover:bg-white/10' : 'border-[#f1e3d8] bg-white hover:bg-[#fff8ef]')}>
                          <span className="relative grid h-[52px] w-[52px] shrink-0 place-items-center overflow-hidden rounded-full bg-[#fff1e8] text-[#c03e15]">
                            {thread.businessImageUrl ? <img src={thread.businessImageUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : <MessageCircle className="h-5 w-5" />}
                            <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <span className="truncate text-[15px] font-black">{thread.businessName}</span>
                              <span className="shrink-0 text-[10px] font-black text-[#c03e15]">
                                {new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(new Date(thread.updatedAt))}
                              </span>
                            </span>
                            <span className={cn('mt-1 block truncate text-[13px] font-bold', isDarkMode ? 'text-white/52' : 'text-[#7a6558]')}>{lastMessage?.from === 'user' ? 'Tu: ' : ''}{lastMessage?.text ?? 'Conversacion abierta'}</span>
                            <span className={cn('mt-2 inline-flex rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em]', isDarkMode ? 'bg-white/10 text-white/58' : 'bg-[#fff1e8] text-[#c03e15]')}>Toca para continuar</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className={cn('flex min-h-[55vh] flex-col items-center justify-center rounded-[1.2rem] px-4 py-8 text-center', isDarkMode ? 'bg-white/6' : 'bg-[#fff8ef]')}>
                    <div className="grid h-16 w-16 place-items-center rounded-full bg-[#fff1e8] text-[#c03e15]"><MessageCircle className="h-8 w-8" /></div>
                    <h3 className="mt-4 text-lg font-black">Sin chats abiertos</h3>
                    <p className={cn('mx-auto mt-2 max-w-xs text-sm font-bold leading-6', isDarkMode ? 'text-white/52' : 'text-[#7a6558]')}>Cuando contactes con una falla o proveedor, la conversacion aparecera aqui.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function ProfileQuickMetric({
  isDarkMode,
  icon: Icon,
  label,
  value,
  helper,
}: {
  isDarkMode: boolean;
  icon: DashboardIcon;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div
      className={cn(
        'rounded-[18px] border px-3 py-2.5',
        isDarkMode
          ? 'border-white/12 bg-white/[0.05]'
          : 'border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(248,250,252,0.85))]'
      )}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-[12px]',
            isDarkMode ? 'bg-brand/16 text-brand' : 'bg-brand/12 text-brand'
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0">
          <p className="text-[8px] font-black uppercase tracking-[0.18em] opacity-45">{label}</p>
          <p className="mt-0.5 text-[1rem] font-black leading-none tracking-tight">{value}</p>
        </div>
      </div>
      <p className="mt-1.5 text-[10px] font-bold leading-4 opacity-60">{helper}</p>
    </div>
  );
}

function SectionHero({
  isDarkMode,
  eyebrow,
  title,
  description,
  children,
  actions,
  className,
  compact = false,
}: {
  isDarkMode: boolean;
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <DashboardSurface
      isDarkMode={isDarkMode}
      className={cn(
        'relative overflow-hidden border-transparent bg-[radial-gradient(circle_at_top_right,rgba(255,99,33,0.12),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.84))]',
        isDarkMode && 'bg-[radial-gradient(circle_at_top_right,rgba(255,99,33,0.22),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.8),rgba(15,23,42,0.62))]',
        compact && 'px-4 py-4 sm:px-4 sm:py-4',
        className
      )}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand/16 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(currentColor 0.8px, transparent 0.8px)', backgroundSize: '14px 14px' }} />
      <div className={cn('relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between', compact && 'gap-3 xl:items-center')}>
        <div className={cn('max-w-2xl', compact && 'max-w-[34rem]')}>
          <div className={cn('inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-brand', compact && 'gap-1.5 px-2 py-1 text-[8px]')}>
            <Sparkles className={cn('h-3.5 w-3.5', compact && 'h-3 w-3')} />
            {eyebrow}
          </div>
          <h2 className={cn('mt-4 text-[2.2rem] font-black leading-[0.95] tracking-[-0.05em] sm:text-[2.7rem]', compact && 'mt-2 text-[1.45rem] leading-[1.02] sm:text-[1.7rem]')}>
            {title}
          </h2>
          <p className={cn('mt-3 max-w-2xl text-[15px] font-bold leading-6 opacity-65', compact && 'mt-1.5 max-w-[32rem] text-[11px] leading-4')}>{description}</p>
        </div>
        {actions ? <div className={cn('relative z-10 flex flex-wrap gap-3', compact && 'gap-1.5')}>{actions}</div> : null}
      </div>
      {children ? <div className={cn('relative z-10 mt-6', compact && 'mt-3')}>{children}</div> : null}
    </DashboardSurface>
  );
}

type FalleritoIntent = keyof typeof FALLERITO_RESPONSES;

type FalleritoAction = {
  type: 'open_marketplace' | 'open_falla_route' | 'open_tab';
  label: string;
  tab?: string;
  fallaId?: string;
  fallaIds?: string[];
  routeStops?: Array<{
    id?: string;
    lat: number;
    lng: number;
    nombre?: string;
  }>;
  fallaName?: string;
};

type FalleritoOfferCard = {
  id: string;
  kind: 'offer' | 'coupon' | 'product' | 'experience';
  title: string;
  business: string;
  detail: string;
  meta: string;
  imageUrl?: string;
  action: FalleritoAction;
};

type FalleritoDocumentScan = {
  id: string;
  kind: 'text' | 'image';
  name: string;
  type: string;
  size: number;
  text?: string;
  imageBase64?: string;
  previewUrl?: string;
  pageCount?: number;
};

type FalleritoAttachmentPreview = {
  kind: 'text' | 'image';
  name: string;
  type: string;
  size: number;
  previewUrl?: string;
  pageCount?: number;
};

type FalleritoTrace = {
  intent?: string;
  model?: string;
  rag?: {
    keywords?: string[];
    sources?: Record<string, number>;
    steps?: string[];
    duration_ms?: number;
    items?: Array<{
      type?: string;
      title?: string;
      source?: string;
      score?: number;
    }>;
  } | null;
  agent?: {
    mode?: string;
    steps?: string[];
    tools?: Array<{
      name?: string;
      label?: string;
      status?: string;
      count?: number;
      duration_ms?: number;
    }>;
    citations?: Array<{
      label?: string;
      detail?: string;
    }>;
  } | null;
};

type FalleritoVisibleSource = {
  key: string;
  label: string;
  detail: string;
};

type FalleritoAssistantMode = 'default' | 'deepthinking-fallero' | 'deepseek-fallero-nearby';

type FalleritoPlannerContext = {
  userPosition?: [number, number] | null;
  locationStatus?: LocationStatus;
  requestedAt?: string;
  assistantMode?: FalleritoAssistantMode;
};

type FalleritoEventType =
  | 'action_click'
  | 'followup_click'
  | 'feedback_up'
  | 'feedback_down'
  | 'copy_reply'
  | 'read_reply'
  | 'mode_select';

type FalleritoMessage = {
  from: 'bot' | 'user';
  text: string;
  attachment?: FalleritoAttachmentPreview;
  actions?: FalleritoAction[];
  offers?: FalleritoOfferCard[];
  trace?: FalleritoTrace;
  followUps?: string[];
};

type FalleritoThread = {
  id: string;
  title: string;
  messages: FalleritoMessage[];
  updatedAt: string;
};

type FalleritoLanguage = 'es' | 'val' | 'en';
type FalleritoResponseMode = 'short' | 'detailed' | 'steps';

type FalleritoSettings = {
  language: FalleritoLanguage;
  responseMode: FalleritoResponseMode;
};

type FalleritoUserMemory = {
  language: FalleritoLanguage;
  prefersWalking: boolean | null;
  avoidsCrowds: boolean | null;
  foodInterestLevel: number;
  favoriteZones: string[];
  updatedAt?: string | null;
};

const FALLERITO_LANGUAGE_OPTIONS: Array<{ value: FalleritoLanguage; label: string }> = [
  { value: 'es', label: 'Español' },
  { value: 'val', label: 'Valenciano' },
  { value: 'en', label: 'Inglés' },
];

const FALLERITO_RESPONSE_MODE_OPTIONS: Array<{ value: FalleritoResponseMode; label: string }> = [
  { value: 'short', label: 'Corto' },
  { value: 'detailed', label: 'Detallado' },
  { value: 'steps', label: 'Solo pasos rápidos' },
];

const FALLERITO_DEFAULT_SETTINGS: FalleritoSettings = {
  language: 'es',
  responseMode: 'short',
};
const FALLERITO_DEFAULT_USER_MEMORY: FalleritoUserMemory = {
  language: 'es',
  prefersWalking: null,
  avoidsCrowds: null,
  foodInterestLevel: 0,
  favoriteZones: [],
  updatedAt: null,
};

const FALLERITO_DOCUMENT_MAX_BYTES = 180_000;
const FALLERITO_PDF_MAX_BYTES = 8 * 1024 * 1024;
const FALLERITO_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
const FALLERITO_DOCUMENT_TEXT_MAX_CHARS = 8000;
const FALLERITO_DOCUMENT_SUPPORTED_EXTENSIONS = new Set(['txt', 'md', 'csv', 'json', 'log']);
const FALLERITO_IMAGE_SUPPORTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${bytes} B`;
}

function readFalleritoFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('No he podido leer el archivo.'));
    reader.readAsDataURL(file);
  });
}

async function prepareFalleritoImage(file: File): Promise<{ imageBase64: string; previewUrl: string }> {
  if (!FALLERITO_IMAGE_SUPPORTED_TYPES.has(file.type)) {
    throw new Error('Fallerito puede analizar fotos JPG, PNG o WEBP. Para HEIC, conviertela a JPG primero.');
  }

  if (file.size > FALLERITO_IMAGE_MAX_BYTES) {
    throw new Error(`La imagen pesa ${formatFileSize(file.size)}. Sube una foto de hasta ${formatFileSize(FALLERITO_IMAGE_MAX_BYTES)}.`);
  }

  const originalUrl = await readFalleritoFileAsDataUrl(file);
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const nextImage = new window.Image();
    nextImage.onload = () => resolve(nextImage);
    nextImage.onerror = () => reject(new Error('No he podido abrir la imagen. Prueba con JPG, PNG o WEBP.'));
    nextImage.src = originalUrl;
  });

  const maxSide = 1280;
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('No he podido preparar la imagen.');
  }

  context.drawImage(image, 0, 0, width, height);
  const previewUrl = canvas.toDataURL('image/jpeg', 0.82);
  const imageBase64 = previewUrl.split(',')[1] ?? '';
  if (!imageBase64) {
    throw new Error('No he podido preparar la imagen para analizarla.');
  }

  return { imageBase64, previewUrl };
}

async function extractFalleritoPdfText(file: File): Promise<{ text: string; pageCount: number }> {
  if (file.size > FALLERITO_PDF_MAX_BYTES) {
    throw new Error(`El PDF pesa ${formatFileSize(file.size)}. Sube un PDF de hasta ${formatFileSize(FALLERITO_PDF_MAX_BYTES)}.`);
  }

  const [{ getDocument, GlobalWorkerOptions }, workerModule] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.mjs?url'),
  ]);
  GlobalWorkerOptions.workerSrc = workerModule.default;

  const buffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: new Uint8Array(buffer) }).promise;
  const lines: string[] = [];
  const pageLimit = Math.min(pdf.numPages, 12);

  for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? String(item.str) : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (pageText) {
      lines.push(`Pagina ${pageNumber}: ${pageText}`);
    }

    if (lines.join(' ').length >= FALLERITO_DOCUMENT_TEXT_MAX_CHARS) {
      break;
    }
  }

  const text = lines.join('\n').slice(0, FALLERITO_DOCUMENT_TEXT_MAX_CHARS).trim();
  if (!text) {
    throw new Error('No he encontrado texto seleccionable en este PDF. Si es escaneado, sube una captura o foto de la pagina.');
  }

  return { text, pageCount: pdf.numPages };
}

async function scanFalleritoDocument(file: File): Promise<FalleritoDocumentScan> {
  if (file.type.startsWith('image/')) {
    const image = await prepareFalleritoImage(file);
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      kind: 'image',
      name: file.name,
      type: file.type,
      size: file.size,
      ...image,
    };
  }

  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';

  if (extension === 'pdf' || file.type === 'application/pdf') {
    const pdf = await extractFalleritoPdfText(file);
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      kind: 'text',
      name: file.name,
      type: file.type || 'application/pdf',
      size: file.size,
      text: pdf.text,
      pageCount: pdf.pageCount,
    };
  }

  if (!FALLERITO_DOCUMENT_SUPPORTED_EXTENSIONS.has(extension)) {
    throw new Error('Fallerito puede analizar PDF, fotos JPG/PNG/WEBP y documentos TXT, Markdown, CSV, JSON o LOG. Para DOCX convierte a PDF o TXT.');
  }

  if (file.size > FALLERITO_DOCUMENT_MAX_BYTES) {
    throw new Error(`El documento pesa ${formatFileSize(file.size)}. Sube un archivo de texto de hasta ${formatFileSize(FALLERITO_DOCUMENT_MAX_BYTES)}.`);
  }

  const rawText = await file.text();
  const text = rawText
    .replace(/\u0000/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, FALLERITO_DOCUMENT_TEXT_MAX_CHARS);

  if (!text) {
    throw new Error('No he podido leer texto dentro del documento.');
  }

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    kind: 'text',
    name: file.name,
    type: file.type || extension || 'text/plain',
    size: file.size,
    text,
  };
}

const FALLERITO_RESPONSES = {
  saludo: [
    'Hola, soy Fallerito. Puedo ayudarte con rutas, fallas, agenda, comida y transporte. Que necesitas ahora?',
    'Buenas, Fallerito al habla. Si quieres, te preparo una ruta, te digo que falla ver o te llevo a la agenda.',
  ],
  agradecimiento: [
    'De nada. Si quieres seguimos con una ruta, una falla concreta o un plan rapido.',
    'A ti. Cuando quieras te ayudo con fallas, horarios, comida o transporte.',
  ],
  buscar_falla: [
    'Para empezar rapido: Ayuntamiento, Plaza de la Reina y Mercado Central. Si tienes mas tiempo, suma Convento Jerusalem y Ruzafa.',
    'Si quieres fallas potentes, prioriza Seccion Especial y las zonas de Ayuntamiento, Gran Via, Ruzafa y Convento Jerusalem.',
  ],
  buscar_mascleta: [
    'La mascleta principal es en la Plaza del Ayuntamiento a las 14:00. Llega con margen y busca una calle lateral.',
    'Para verla mejor, evita el centro del mogollon: posicion lateral, agua y oidos protegidos.',
  ],
  explicar_falla: [
    'Una falla mezcla arte, satira y critica social. Si me describes el lema o los ninots, te ayudo a leerla.',
    'Fijate en carteles, personajes exagerados y escenas secundarias: ahi suele estar la critica del artista.',
  ],
  crear_ruta: [
    'Ruta rapida: Ayuntamiento, Plaza de la Reina, Micalet y Mercado Central. Compacta, centrica y con mucho ambiente.',
    'Ruta de 1 hora: Ayuntamiento, calle de la Paz, Colon, Gran Via y Convento Jerusalem.',
  ],
  comida: [
    'Plan fallero: bunuelos de calabaza con chocolate. Para comer o cenar, Ruzafa y el Carmen suelen funcionar muy bien.',
    'Tipico valenciano: paella, horchata con fartons o menu de casal. Mejor alejarse un poco del punto mas turistico.',
  ],
  horarios: [
    'Claves: mascleta a las 14:00, ofrenda el 17 y 18, y crema el 19 por la noche.',
    'La semana grande va del 15 al 19 de marzo. Dime si sales por la manana, tarde o noche y te propongo plan.',
  ],
  transporte: [
    'Para moverte en Fallas: Metrovalencia para entrar, EMT para aproximarte, Valenbisi o caminar en tramos cortos y coche solo fuera del centro.',
    'Transporte recomendado: metro hasta Xativa, Colon, Alameda o Angel Guimera; despues camina y revisa cortes antes de coger EMT.',
  ],
  emergencia: [
    'Si es una emergencia real, llama al 112. Para orientarte: farmacias, Policia Local, puntos de informacion y transporte desde el mapa.',
    'Para ayuda rapida: 112 si hay peligro, sal a una calle amplia y usa el mapa para ubicar farmacias, policia, informacion o transporte cercano.',
  ],
  ayuda: [
    'Puedo recomendar fallas, encontrar mascletas, crear rutas, explicar monumentos, sugerir comida, orientar transporte y ayudar en modo util.',
    "Prueba con: 'hazme una ruta', 'transporte al centro', 'donde hay mascleta', 'que falla veo' o 'donde comer'.",
  ],
  desconocido: [
    'No te he entendido del todo. Puedo ayudarte con fallas, mascletas, rutas, comida, horarios o transporte.',
    'Prueba con una sugerencia: ruta rapida, mascleta hoy, donde comer o que falla veo.',
  ],
} as const;

const FALLERITO_SUGGESTIONS = [
  'Ruta rapida',
  'Mascleta hoy',
  'Donde comer',
  'Que falla veo',
];
const FALLERITO_SUGGESTION_CARDS = [
  { label: 'Ruta rapida', icon: Route },
  { label: 'Mascleta hoy', icon: Radio },
  { label: 'Donde comer', icon: Utensils },
  { label: 'Que falla veo', icon: Flame },
] as const;
const FALLERITO_ASSISTANT_MODES = [
  {
    value: 'deepthinking-fallero',
    label: 'Deep Thinking fallero',
    detail: 'Piensa mejor, aclara lo justo y planifica con mas criterio.',
    icon: Sparkles,
  },
  {
    value: 'deepseek-fallero-nearby',
    label: 'DeepSeek fallero cerca de mi',
    detail: 'Usa GPS o zona para priorizar lo mas cercano y util.',
    icon: MapPin,
  },
] as const satisfies ReadonlyArray<{
  value: Exclude<FalleritoAssistantMode, 'default'>;
  label: string;
  detail: string;
  icon: typeof Sparkles;
}>;
const FALLERITO_INITIAL_MESSAGES: FalleritoMessage[] = [];
const FALLERITO_FOLLOW_UPS: Record<FalleritoLanguage, Partial<Record<FalleritoIntent, readonly string[]>>> = {
  es: {
    buscar_falla: ['Abrirme una ruta', 'Dime otra falla', 'Ver fallas cerca'],
    buscar_mascleta: ['Llevame a la agenda', 'Como llego', 'Que hago despues'],
    crear_ruta: ['Hazla mas corta', 'Quiero comer cerca', 'Abrir mapa'],
    comida: ['Ver ofertas', 'Algo cerca del centro', 'Plan para despues'],
    horarios: ['Abrir agenda', 'Que hago hoy', 'Como llego'],
    transporte: ['Abrir mapa', 'Llevame a la agenda', 'Ruta a una falla'],
    emergencia: ['Abrir mapa', 'Farmacia cerca', 'Como salir de la zona'],
    ayuda: ['Ruta rapida', 'Mascleta hoy', 'Que falla veo'],
    desconocido: ['Ruta rapida', 'Mascleta hoy', 'Donde comer'],
  },
  val: {
    buscar_falla: ['Obri-me una ruta', 'Digues-me una altra falla', 'Vore falles prop'],
    buscar_mascleta: ['Porta\'m a l\'agenda', 'Com arribe', 'Que faig despres'],
    crear_ruta: ['Fes-la mes curta', 'Vull menjar prop', 'Obrir mapa'],
    comida: ['Vore ofertes', 'Alguna cosa prop del centre', 'Pla per a despres'],
    horarios: ['Obrir agenda', 'Que faig hui', 'Com arribe'],
    transporte: ['Obrir mapa', 'Porta\'m a l\'agenda', 'Ruta a una falla'],
    emergencia: ['Obrir mapa', 'Farmacia prop', 'Com eixir de la zona'],
    ayuda: ['Ruta rapida', 'Mascleta hui', 'Quina falla veig'],
    desconocido: ['Ruta rapida', 'Mascleta hui', 'On menjar'],
  },
  en: {
    buscar_falla: ['Open a route', 'Show another falla', 'See nearby fallas'],
    buscar_mascleta: ['Open agenda', 'How do I get there', 'What next'],
    crear_ruta: ['Make it shorter', 'Food nearby', 'Open map'],
    comida: ['See offers', 'Near the center', 'Plan for after'],
    horarios: ['Open agenda', 'What should I do today', 'How do I get there'],
    transporte: ['Open map', 'Take me to agenda', 'Route to a falla'],
    emergencia: ['Open map', 'Nearby pharmacy', 'How do I leave the area'],
    ayuda: ['Quick route', 'Mascleta today', 'Which falla should I see'],
    desconocido: ['Quick route', 'Mascleta today', 'Where to eat'],
  },
};

const FALLERITO_LOCAL_TRANSLATIONS: Record<FalleritoLanguage, Partial<Record<FalleritoIntent, readonly string[]>>> = {
  es: {},
  val: {
    saludo: [
      'Hola, soc Fallerito. T’ajude amb rutes, mascletaes, falles, menjar, horaris i transport.',
      'Bones, Fallerito al parla. Digues-me si busques una falla, una mascleta, una ruta ràpida o un lloc per a menjar.',
    ],
    agradecimiento: [
      'De res. Si necessites una ruta, una mascleta o una falla concreta, ací estic.',
      'A tu. Quan vulgues seguim amb falles, horaris, menjar o transport.',
    ],
    comida: [
      'Pla faller: bunyols de carabassa amb xocolate. Per a menjar o sopar, Russafa i el Carme solen funcionar molt bé.',
      'Típic valencià: paella, orxata amb fartons o menú de casal. Millor allunyar-se un poc del punt més turístic.',
    ],
    buscar_falla: [
      'Per a començar ràpid: Ajuntament, plaça de la Reina i Mercat Central. Si tens més temps, suma Convent Jerusalem i Russafa.',
      'Si vols falles potents, prioritza Secció Especial i les zones d’Ajuntament, Gran Via, Russafa i Convent Jerusalem.',
    ],
    crear_ruta: [
      'Ruta ràpida: Ajuntament, plaça de la Reina, Micalet i Mercat Central. És compacta, cèntrica i amb molt ambient.',
      'Ruta d’una hora: Ajuntament, carrer de la Pau, Colom, Gran Via i Convent Jerusalem.',
    ],
    buscar_mascleta: [
      'La mascletà principal és a la plaça de l’Ajuntament a les 14:00. Arriba amb marge i busca un lateral.',
      'Per a vore-la millor, evita el centre de l’aglomeració: posició lateral, aigua i oïts protegits.',
    ],
    explicar_falla: [
      'Una falla barreja art, sàtira i crítica social. Si em descrius el lema o els ninots, t’ajude a llegir-la.',
      'Fixa’t en cartells, personatges exagerats i escenes secundàries: ahí sol estar la crítica de l’artista.',
    ],
    horarios: [
      'Claus: mascletà a les 14:00, ofrena el 17 i 18, i cremà el 19 de nit.',
      'La setmana gran va del 15 al 19 de març. Digues-me si ixes de matí, vesprada o nit i et propose un pla.',
    ],
    transporte: [
      'Pel centre, millor caminar. Per a entrar usa metro fins a Xàtiva, Colón o Alameda i evita el cotxe.',
      'En Falles hi ha talls i molta gent. Metro, EMT i caminar és la combinació més fiable.',
    ],
    ayuda: [
      'Puc recomanar falles, trobar mascletaes, crear rutes, explicar monuments, suggerir menjar i orientar transport.',
      "Prova amb: 'fes-me una ruta', 'on hi ha mascletà', 'quina falla veig' o 'on menjar'.",
    ],
    desconocido: [
      'No t’he entés del tot. Puc ajudar-te amb falles, mascletaes, rutes, menjar, horaris o transport.',
      'Prova amb una suggerència: ruta ràpida, mascletà hui, on menjar o quina falla veure.',
    ],
  },
  en: {
    saludo: [
      'Hi, I am Fallerito. I can help with routes, mascletas, fallas, food, schedules and transport.',
      'Hi, Fallerito here. Tell me if you need a falla, a mascleta, a quick route or somewhere to eat.',
    ],
    agradecimiento: [
      'You are welcome. If you need a route, a mascleta or a specific falla, I am here.',
      'Any time. We can keep going with fallas, schedules, food or transport.',
    ],
    comida: [
      'Fallas plan: pumpkin fritters with hot chocolate. For lunch or dinner, Ruzafa and El Carmen usually work well.',
      'Typical Valencia: paella, horchata with fartons or a casal menu. Move a bit away from the most touristy spot.',
    ],
    buscar_falla: [
      'To start quickly: City Hall, Plaza de la Reina and Central Market. If you have more time, add Convento Jerusalem and Ruzafa.',
      'If you want strong fallas, prioritize Special Section and the City Hall, Gran Via, Ruzafa and Convento Jerusalem areas.',
    ],
    crear_ruta: [
      'Quick route: City Hall, Plaza de la Reina, Micalet and Central Market. Compact, central and full of atmosphere.',
      'One-hour route: City Hall, Calle de la Paz, Colon, Gran Via and Convento Jerusalem.',
    ],
    buscar_mascleta: [
      'The main mascleta is at Plaza del Ayuntamiento at 14:00. Arrive early and look for a side street.',
      'For a better view, avoid the densest central crowd: side position, water and ear protection.',
    ],
    explicar_falla: [
      'A falla mixes art, satire and social criticism. If you describe the motto or figures, I can help you read it.',
      'Look at signs, exaggerated characters and side scenes: that is usually where the artist’s criticism appears.',
    ],
    horarios: [
      'Key times: mascleta at 14:00, offering on March 17 and 18, and crema on the night of March 19.',
      'The main Fallas week runs from March 15 to 19. Tell me morning, afternoon or night and I will suggest a plan.',
    ],
    transporte: [
      'In the city center, walking is best. To enter Valencia use metro to Xativa, Colon or Alameda and avoid the car.',
      'During Fallas there are road closures and crowds. Metro, EMT and walking are usually the most reliable combo.',
    ],
    ayuda: [
      'I can recommend fallas, find mascletas, create routes, explain monuments, suggest food and help with transport.',
      "Try: 'make me a route', 'where is the mascleta', 'which falla should I see' or 'where to eat'.",
    ],
    desconocido: [
      'I did not fully understand. I can help with fallas, mascletas, routes, food, schedules or transport.',
      'Try a suggestion: quick route, mascleta today, where to eat or which falla to see.',
    ],
  },
};

function readStoredFalleritoThreads(): Record<string, FalleritoThread> {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(FALLERITO_CHAT_THREADS_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, FalleritoThread> : {};
  } catch {
    return {};
  }
}

function readStoredFalleritoSettings(): FalleritoSettings {
  if (typeof window === 'undefined') {
    return FALLERITO_DEFAULT_SETTINGS;
  }

  try {
    const raw = window.localStorage.getItem(FALLERITO_SETTINGS_KEY);
    if (!raw) {
      return FALLERITO_DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(raw) as Partial<FalleritoSettings>;
    return {
      language: FALLERITO_LANGUAGE_OPTIONS.some((option) => option.value === parsed.language) ? parsed.language as FalleritoLanguage : FALLERITO_DEFAULT_SETTINGS.language,
      responseMode: FALLERITO_RESPONSE_MODE_OPTIONS.some((option) => option.value === parsed.responseMode) ? parsed.responseMode as FalleritoResponseMode : FALLERITO_DEFAULT_SETTINGS.responseMode,
    };
  } catch {
    return FALLERITO_DEFAULT_SETTINGS;
  }
}

function sanitizeFalleritoMemory(payload: unknown): FalleritoUserMemory {
  const source = payload && typeof payload === 'object' ? payload as Partial<FalleritoUserMemory> : {};
  const language = FALLERITO_LANGUAGE_OPTIONS.some((option) => option.value === source.language)
    ? source.language as FalleritoLanguage
    : FALLERITO_DEFAULT_USER_MEMORY.language;

  return {
    language,
    prefersWalking: typeof source.prefersWalking === 'boolean' ? source.prefersWalking : null,
    avoidsCrowds: typeof source.avoidsCrowds === 'boolean' ? source.avoidsCrowds : null,
    foodInterestLevel: Number.isFinite(source.foodInterestLevel) ? Math.max(0, Math.min(12, Number(source.foodInterestLevel))) : 0,
    favoriteZones: Array.isArray(source.favoriteZones)
      ? source.favoriteZones
        .filter((zone): zone is string => typeof zone === 'string' && zone.trim() !== '')
        .slice(0, 3)
      : [],
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : null,
  };
}

async function requestFalleritoUserMemory(): Promise<FalleritoUserMemory> {
  const response = await fetch(`${resolveDashboardBasePath() || ''}/api/fallerito-memory.php`, {
    method: 'GET',
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
    },
  });
  const payload = await response.json().catch(() => ({})) as { ok?: boolean; memory?: unknown; message?: string };
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.message || 'No se pudo cargar la memoria de Fallerito.');
  }

  return sanitizeFalleritoMemory(payload.memory);
}

async function updateFalleritoUserMemory(patch: Partial<FalleritoUserMemory> & { reset?: boolean }): Promise<FalleritoUserMemory> {
  const response = await fetch(`${resolveDashboardBasePath() || ''}/api/fallerito-memory.php`, await withCsrfHeadersAsync({
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }).then((headers) => ({
    method: 'POST',
    credentials: 'same-origin',
    headers,
    body: JSON.stringify(patch),
  })));
  const payload = await response.json().catch(() => ({})) as { ok?: boolean; memory?: unknown; message?: string };
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.message || 'No se pudo guardar la memoria de Fallerito.');
  }

  return sanitizeFalleritoMemory(payload.memory);
}

function createFalleritoThreadId(): string {
  return `fallerito-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function resolveFalleritoThreadTitle(messages: FalleritoMessage[]): string {
  const firstUserMessage = messages.find((item) => item.from === 'user')?.text.trim();
  return firstUserMessage ? firstUserMessage.slice(0, 48) : 'Nuevo chat';
}

const FALLERITO_LIGHT_INTENTS: FalleritoIntent[] = ['saludo', 'agradecimiento'];

const FALLERITO_INTENT_MATCHERS: Array<[FalleritoIntent, string[]]> = [
  ['emergencia', ['emergencia', 'urgencia', 'farmacia', 'farmacias', 'policia', 'ambulancia', 'hospital', '112', 'punto de informacion', 'perdido']],
  ['buscar_mascleta', ['mascleta', 'petard', 'fuego', 'pirotecn']],
  ['crear_ruta', ['ruta', 'recorrido', 'itinerario', 'camino', 'ver en']],
  ['comida', ['comer', 'comida', 'cenar', 'restaurante', 'bunuelo', 'bunuelos', 'horchata', 'paella', 'tapas']],
  ['horarios', ['hora', 'horario', 'cuando', 'agenda', 'evento', 'crema', 'ofrenda', 'planta']],
  ['transporte', ['metro', 'metrovalencia', 'bus', 'autobus', 'emt', 'tranvia', 'taxi', 'transporte', 'coche', 'aparcar', 'parking', 'llegar', 'valenbisi', 'tren', 'renfe']],
  ['explicar_falla', ['explica', 'explicame', 'ninot', 'significa', 'lema', 'satira']],
  ['buscar_falla', ['falla', 'fallas', 'monumento', 'recomienda', 'ver', 'especial']],
  ['ayuda', ['ayuda', 'puedes', 'comandos', 'que haces']],
  ['saludo', ['hola', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches', 'bona vesprada', 'bona nit', 'ey', 'hello', 'adios', 'hasta luego']],
  ['agradecimiento', ['gracias', 'merci', 'thanks', 'perfecto', 'genial', 'vale', 'ok', 'okay']],
];

function normalizeFalleritoText(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectFalleritoIntent(message: string): FalleritoIntent {
  const normalized = normalizeFalleritoText(message);
  const matches = FALLERITO_INTENT_MATCHERS.filter(([, keywords]) => keywords.some((keyword) => normalized.includes(keyword)));
  const domainMatch = matches.find(([intent]) => !FALLERITO_LIGHT_INTENTS.includes(intent));
  return domainMatch?.[0] ?? matches[0]?.[0] ?? 'desconocido';
}

function isFalleritoLightIntent(intent: FalleritoIntent, message: string) {
  if (!FALLERITO_LIGHT_INTENTS.includes(intent)) return false;

  const words = normalizeFalleritoText(message).split(' ').filter(Boolean);
  return words.length <= 6;
}

function detectFalleritoLanguage(text: string): FalleritoLanguage {
  const normalized = normalizeFalleritoText(text);
  const englishHits = ['hello', 'hi', 'thanks', 'thank', 'where', 'what', 'route', 'food', 'eat', 'schedule', 'transport', 'near me'].filter((word) => normalized.includes(word)).length;
  const valencianHits = ['bona', 'vesprada', 'gracies', 'gràcies', 'hui', 'menjar', 'on ', 'quina', 'falles', 'mascleta', 'mascletaes', 'vore', 'ací', 'ruta rapida'].filter((word) => normalized.includes(normalizeFalleritoText(word))).length;

  if (englishHits >= 1 && englishHits >= valencianHits) {
    return 'en';
  }

  if (valencianHits >= 2 || normalized.includes(' bon dia') || normalized.startsWith('bon dia')) {
    return 'val';
  }

  return 'es';
}

function resolveEffectiveFalleritoSettings(message: string, settings: FalleritoSettings): FalleritoSettings {
  const detectedLanguage = detectFalleritoLanguage(message);
  return {
    ...settings,
    language: settings.language === 'es' && detectedLanguage !== 'es' ? detectedLanguage : settings.language,
  };
}

function getFalleritoResponse(intent: FalleritoIntent, turn: number, language: FalleritoLanguage) {
  const translated = FALLERITO_LOCAL_TRANSLATIONS[language]?.[intent];
  const responses = translated ?? FALLERITO_RESPONSES[intent] ?? FALLERITO_RESPONSES.desconocido;
  return responses[turn % responses.length];
}

function applyFalleritoSettingsToReply(reply: string, settings: FalleritoSettings) {
  let text = reply.trim();

  if (settings.responseMode === 'steps') {
    const parts = text.split(/[.!?]\s+/).map((part) => part.trim()).filter(Boolean).slice(0, 3);
    text = parts.length ? parts.map((part, index) => `${index + 1}. ${part.replace(/[.!?]$/, '')}`).join('\n') : text;
  } else if (settings.responseMode === 'detailed') {
    text = `${text}\n\nPuedo ajustarlo mejor si me dices zona, tiempo disponible o si vas andando.`;
  } else {
    text = text.split(/[.!?]\s+/).filter(Boolean).slice(0, 2).join('. ');
    if (text !== '' && !/[.!?]$/.test(text)) {
      text += '.';
    }
  }

  return text;
}

function shouldAttachMarketplaceOffers(text: string, intent: FalleritoIntent) {
  const normalized = normalizeFalleritoText(text);
  return intent === 'comida'
    || ['oferta', 'ofertas', 'cupon', 'cupones', 'marketplace', 'producto', 'productos', 'tienda', 'comprar', 'restaurante', 'cenar', 'comer'].some((word) => normalized.includes(word));
}

function buildFalleritoOfferCards(source: MarketplacePayload | null, text: string, intent: FalleritoIntent): FalleritoOfferCard[] {
  if (!shouldAttachMarketplaceOffers(text, intent)) {
    return [];
  }

  const businesses = source?.businesses ?? [];
  const coupons = source?.coupons ?? [];
  const products = source?.products ?? [];
  const experiences = source?.experiences ?? [];
  const heroImage = businesses[0]?.imageUrl;

  return [
    ...coupons.slice(0, 2).map((coupon): FalleritoOfferCard => ({
      id: `coupon-${coupon.id}`,
      kind: 'coupon',
      title: coupon.title,
      business: coupon.business,
      detail: coupon.condition,
      meta: coupon.validUntil,
      imageUrl: businesses.find((business) => business.name === coupon.business)?.imageUrl ?? heroImage,
      action: { type: 'open_marketplace', label: 'Ver cupones', tab: 'Marketplace' },
    })),
    ...businesses.slice(0, 2).map((business): FalleritoOfferCard => ({
      id: `business-${business.id}`,
      kind: 'offer',
      title: business.promotion || business.actionLabel || 'Oferta activa',
      business: business.name,
      detail: `${business.type} en ${business.location}`,
      meta: business.distance || business.badge,
      imageUrl: business.imageUrl,
      action: { type: 'open_marketplace', label: business.actionLabel || 'Ver oferta', tab: 'Marketplace' },
    })),
    ...products.slice(0, 1).map((product): FalleritoOfferCard => ({
      id: `product-${product.id}`,
      kind: 'product',
      title: product.name,
      business: product.category,
      detail: 'Producto del marketplace fallero',
      meta: product.price,
      imageUrl: product.imageUrl,
      action: { type: 'open_marketplace', label: 'Ver productos', tab: 'Marketplace' },
    })),
    ...experiences.slice(0, 1).map((experience): FalleritoOfferCard => ({
      id: `experience-${experience.id}`,
      kind: 'experience',
      title: experience.name,
      business: experience.businessName || 'Experiencia',
      detail: experience.description,
      meta: [experience.price, experience.location, experience.duration].filter(Boolean).join(' · '),
      imageUrl: experience.imageUrl || heroImage,
      action: { type: 'open_marketplace', label: experience.actionLabel || 'Ver experiencia', tab: 'Marketplace' },
    })),
  ].slice(0, 4);
}

function buildFalleritoFollowUps(intent: FalleritoIntent, language: FalleritoLanguage, usedPrompts: string[] = []): string[] {
  const fallbacks = FALLERITO_FOLLOW_UPS[language].desconocido ?? FALLERITO_SUGGESTIONS;
  const prompts = FALLERITO_FOLLOW_UPS[language][intent] ?? fallbacks;
  const used = new Set(usedPrompts.map((prompt) => normalizeFalleritoText(prompt)));
  return prompts.filter((prompt) => !used.has(normalizeFalleritoText(prompt))).slice(0, 3);
}

function dedupeFalleritoActions(actions: FalleritoAction[]): FalleritoAction[] {
  const seen = new Set<string>();
  return actions.filter((action) => {
    const key = [action.type, action.tab ?? '', action.fallaId ?? '', (action.fallaIds ?? []).join(','), action.label].join('|');
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function needsFalleritoLocationContext(message: string, intent: FalleritoIntent): boolean {
  const normalized = normalizeFalleritoText(message);
  return intent === 'crear_ruta'
    || intent === 'buscar_falla'
    || normalized.includes(' cerca ')
    || normalized.startsWith('cerca ')
    || normalized.includes('mascleta')
    || normalized.includes('andando')
    || normalized.includes('a pie')
    || normalized.includes('evito multitudes')
    || normalized.includes('menos gente')
    || normalized.includes('que hago hoy')
    || normalized.includes('esta noche');
}

function buildFalleritoThinkingPlan(
  _message: string,
  intent: FalleritoIntent,
  {
    hasDocumentContext = false,
    shouldTryLocation = false,
    hasLocation = false,
    isMarketplaceOfferRequest = false,
    assistantMode = 'default',
  }: {
    hasDocumentContext?: boolean;
    shouldTryLocation?: boolean;
    hasLocation?: boolean;
    isMarketplaceOfferRequest?: boolean;
    assistantMode?: FalleritoAssistantMode;
  } = {},
): string[] {
  const steps: string[] = [];

  if (hasDocumentContext) {
    steps.push('Estoy leyendo el documento o la imagen adjunta y separando lo importante de lo accesorio.');
  } else {
    steps.push('He separado tu mensaje para detectar si buscas ruta, agenda, fallas, transporte o marketplace.');
  }

  switch (intent) {
    case 'crear_ruta':
    case 'transporte':
      steps.push('Estoy comprobando si necesito GPS o una zona concreta para abrir una ruta util dentro del mapa.');
      break;
    case 'buscar_falla':
    case 'explicar_falla':
      steps.push('Estoy filtrando fallas por coincidencia, tipo de visita y utilidad para recomendarte algo concreto.');
      break;
    case 'buscar_mascleta':
    case 'horarios':
      steps.push('Estoy contrastando agenda y actos disponibles para quedarme con lo que mejor encaja con tu pregunta.');
      break;
    case 'comida':
      steps.push('Estoy revisando opciones reales de marketplace y planes cercanos sin inventar ofertas.');
      break;
    case 'emergencia':
      steps.push('Estoy priorizando una respuesta practica y segura para orientarte rapido dentro de la app.');
      break;
    default:
      steps.push('Estoy cruzando las fuentes internas de la app para responder sin inventar datos.');
      break;
  }

  if (shouldTryLocation) {
    steps.push(
      hasLocation
        ? 'Ya tengo contexto de ubicacion y lo uso para afinar cercania, desplazamiento y recomendaciones.'
        : 'Si hace falta, pedire ubicacion para ajustar cercania, tiempo a pie y ruta en el mapa.'
    );
  }

  if (isMarketplaceOfferRequest && intent !== 'comida') {
    steps.push('Tambien estoy comprobando si hay ofertas reales relacionadas con lo que has pedido.');
  }

  if (assistantMode === 'deepseek-fallero-nearby') {
    steps.push('Estoy priorizando cercania real, tiempo a pie y utilidad practica alrededor de tu zona.');
  } else if (assistantMode === 'deepthinking-fallero') {
    steps.push('Voy a devolverte una respuesta corta con la mejor accion disponible dentro de la app.');
  } else {
    steps.push('Voy a responder de forma breve y accionable para que puedas seguir desde la app.');
  }

  return steps.filter((step, index, list) => list.indexOf(step) === index).slice(0, 4);
}

function buildInitialFalleritoTrace(
  message: string,
  intent: FalleritoIntent,
  options: {
    hasDocumentContext?: boolean;
    shouldTryLocation?: boolean;
    hasLocation?: boolean;
    isMarketplaceOfferRequest?: boolean;
    assistantMode?: FalleritoAssistantMode;
  } = {},
): FalleritoTrace {
  const steps = buildFalleritoThinkingPlan(message, intent, options);
  return {
    intent,
    rag: {
      keywords: normalizeFalleritoText(message).split(' ').filter((word) => word.length > 2).slice(0, 6),
      sources: {},
      duration_ms: 1,
      steps: steps.length > 0 ? [steps[0]] : [],
      items: [],
    },
    agent: {
      steps,
    },
  };
}

function normalizeFalleritoTrace(
  trace: FalleritoTrace | undefined,
  message: string,
  intent: FalleritoIntent,
  options: {
    hasDocumentContext?: boolean;
    shouldTryLocation?: boolean;
    hasLocation?: boolean;
    isMarketplaceOfferRequest?: boolean;
    assistantMode?: FalleritoAssistantMode;
  } = {},
): FalleritoTrace {
  const fallback = buildInitialFalleritoTrace(message, intent, options);
  const fallbackSteps = fallback.agent?.steps ?? [];
  const nextKeywords = Array.isArray(trace?.rag?.keywords) && trace.rag.keywords.length > 0
    ? trace.rag.keywords.slice(0, 6)
    : fallback.rag?.keywords ?? [];
  const nextSteps = Array.isArray(trace?.rag?.steps) && trace.rag.steps.length > 0
    ? trace.rag.steps.slice(0, 4)
    : fallbackSteps;

  return {
    ...trace,
    intent: trace?.intent ?? fallback.intent,
    rag: {
      ...(trace?.rag ?? {}),
      keywords: nextKeywords,
      sources: trace?.rag?.sources ?? fallback.rag?.sources ?? {},
      duration_ms: Number(trace?.rag?.duration_ms ?? fallback.rag?.duration_ms ?? 0),
      steps: nextSteps,
      items: Array.isArray(trace?.rag?.items) ? trace.rag.items : fallback.rag?.items ?? [],
    },
    agent: {
      ...(trace?.agent ?? {}),
      steps: Array.isArray(trace?.agent?.steps) && trace.agent.steps.length > 0
        ? trace.agent.steps.slice(0, 4)
        : fallbackSteps,
    },
  };
}

function resolveFalleritoSourceLabel(sourceKey: string): string {
  switch (sourceKey) {
    case 'fallas':
      return 'Catalogo de fallas';
    case 'agenda':
      return 'Agenda';
    case 'marketplace':
      return 'Marketplace';
    case 'articulos':
    case 'cendra':
      return 'Cendra';
    case 'documentos':
      return 'Documentos';
    default:
      return sourceKey;
  }
}

function buildFalleritoVisibleSources(trace?: FalleritoTrace): FalleritoVisibleSource[] {
  if (trace?.agent?.citations && Array.isArray(trace.agent.citations) && trace.agent.citations.length > 0) {
    return trace.agent.citations
      .slice(0, 4)
      .map((citation, index) => ({
        key: `agent-citation-${index}-${citation.label ?? 'source'}`,
        label: (citation.label || 'Fallas 360').trim(),
        detail: (citation.detail || 'Fuente interna').trim(),
      }));
  }

  if (!trace?.rag) {
    return [];
  }

  const traceItems = Array.isArray(trace.rag.items) ? trace.rag.items : [];
  const seen = new Set<string>();
  const itemSources = traceItems
    .slice(0, 4)
    .map((item, index) => {
      const source = (item.source || 'Fallas 360').trim();
      const title = (item.title || 'Fuente local').trim();
      const type = (item.type || 'dato').trim();
      const key = `${source}|${title}|${type}|${index}`;
      if (seen.has(`${source}|${title}|${type}`)) {
        return null;
      }
      seen.add(`${source}|${title}|${type}`);
      return {
        key,
        label: source,
        detail: `${title} · ${type}`,
      } satisfies FalleritoVisibleSource;
    })
    .filter((item): item is FalleritoVisibleSource => item !== null);

  if (itemSources.length > 0) {
    return itemSources;
  }

  const sourceEntries = trace.rag.sources && typeof trace.rag.sources === 'object'
    ? Object.entries(trace.rag.sources)
    : [];

  return sourceEntries
    .filter(([, count]) => Number(count) > 0)
    .slice(0, 4)
    .map(([sourceKey, count]) => ({
      key: sourceKey,
      label: resolveFalleritoSourceLabel(sourceKey),
      detail: `${count} coincidencia${Number(count) === 1 ? '' : 's'}`,
    }));
}

function FalleritoScreen({
  isDarkMode,
  onOpenTab,
  onOpenFallaRoute,
  userPosition,
  locationStatus,
  requestLocation,
}: {
  isDarkMode: boolean;
  onOpenTab: (tab: string) => void;
  onOpenFallaRoute: (
    fallaId?: string | null,
    fallaIds?: string[] | null,
    routeStops?: Array<{ id?: string; lat: number; lng: number; nombre?: string }> | null
  ) => void;
  userPosition: [number, number] | null;
  locationStatus: LocationStatus;
  requestLocation: () => Promise<[number, number]>;
}) {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusLabel, setStatusLabel] = useState('Fallerito');
  const [liveTrace, setLiveTrace] = useState<FalleritoTrace | undefined>();
  const [isFalleritoHistoryOpen, setIsFalleritoHistoryOpen] = useState(false);
  const [isFalleritoQuickMenuOpen, setIsFalleritoQuickMenuOpen] = useState(false);
  const [isFalleritoSettingsOpen, setIsFalleritoSettingsOpen] = useState(false);
  const [selectedFalleritoMode, setSelectedFalleritoMode] = useState<FalleritoAssistantMode>('deepthinking-fallero');
  const [falleritoSettings, setFalleritoSettings] = useState<FalleritoSettings>(() => readStoredFalleritoSettings());
  const [falleritoMemory, setFalleritoMemory] = useState<FalleritoUserMemory>(FALLERITO_DEFAULT_USER_MEMORY);
  const [falleritoMarketplaceData, setFalleritoMarketplaceData] = useState<MarketplacePayload | null>(null);
  const [falleritoThreads, setFalleritoThreads] = useState<Record<string, FalleritoThread>>(() => readStoredFalleritoThreads());
  const [activeFalleritoThreadId, setActiveFalleritoThreadId] = useState(() => createFalleritoThreadId());
  const [messages, setMessages] = useState<FalleritoMessage[]>(FALLERITO_INITIAL_MESSAGES);
  const [attachedDocument, setAttachedDocument] = useState<FalleritoDocumentScan | null>(null);
  const [documentScanError, setDocumentScanError] = useState<string | null>(null);
  const [isScanningDocument, setIsScanningDocument] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const documentInputRef = useRef<HTMLInputElement | null>(null);
  const falleritoQuickMenuRef = useRef<HTMLDivElement | null>(null);
  const falleritoThreadList = Object.values(falleritoThreads).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const activeFalleritoMode = FALLERITO_ASSISTANT_MODES.find((mode) => mode.value === selectedFalleritoMode) ?? null;
  const ActiveFalleritoModeIcon = activeFalleritoMode?.icon;
  const falleritoMemoryHighlights = [
    falleritoMemory.prefersWalking === true ? 'Va andando' : null,
    falleritoMemory.avoidsCrowds === true ? 'Evita multitudes' : null,
    falleritoMemory.foodInterestLevel >= 2 ? 'Suele pedir comida' : null,
    ...falleritoMemory.favoriteZones.slice(0, 2).map((zone) => `Zona ${zone}`),
  ].filter((value): value is string => Boolean(value));

  useEffect(() => {
    try {
      window.localStorage.setItem(FALLERITO_SETTINGS_KEY, JSON.stringify(falleritoSettings));
    } catch {
      // Mantiene los ajustes en memoria si localStorage no esta disponible.
    }
  }, [falleritoSettings]);

  useEffect(() => {
    let isActive = true;
    requestFalleritoUserMemory()
      .then((memory) => {
        if (!isActive) {
          return;
        }
        setFalleritoMemory(memory);
        setFalleritoSettings((current) => current.language === memory.language ? current : {
          ...current,
          language: memory.language,
        });
      })
      .catch(() => {
        if (isActive) {
          setFalleritoMemory(FALLERITO_DEFAULT_USER_MEMORY);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    fetch(resolveMarketplaceEndpoint())
      .then((response) => response.ok ? response.json() : null)
      .then((payload: MarketplacePayload | null) => {
        if (!isActive || !payload || typeof payload !== 'object') {
          return;
        }
        setFalleritoMarketplaceData({
          businesses: Array.isArray(payload.businesses) ? payload.businesses : [],
          coupons: Array.isArray(payload.coupons) ? payload.coupons : [],
          products: Array.isArray(payload.products) ? payload.products : [],
          experiences: Array.isArray(payload.experiences) ? payload.experiences : [],
        });
      })
      .catch(() => {
        if (isActive) {
          setFalleritoMarketplaceData(null);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(FALLERITO_CHAT_THREADS_KEY, JSON.stringify(falleritoThreads));
    } catch {
      // Mantiene los chats en memoria si localStorage no esta disponible.
    }
  }, [falleritoThreads]);

  useEffect(() => {
    if (messages.length === 0) {
      return;
    }

    const now = new Date().toISOString();
    setFalleritoThreads((current) => ({
      ...current,
      [activeFalleritoThreadId]: {
        id: activeFalleritoThreadId,
        title: resolveFalleritoThreadTitle(messages),
        messages,
        updatedAt: now,
      },
    }));
  }, [activeFalleritoThreadId, messages]);

  useEffect(() => {
    if (!isLoading) return undefined;

    const intervalId = window.setInterval(() => {
      setLiveTrace((current) => {
        if (!current) return current;

        const plannedSteps = Array.isArray(current.agent?.steps) && current.agent.steps.length > 0
          ? current.agent.steps
          : [];
        const currentSteps = Array.isArray(current.rag?.steps) ? current.rag.steps : [];
        const nextStep = plannedSteps[currentSteps.length] ?? plannedSteps[plannedSteps.length - 1];
        if (!nextStep) {
          return current;
        }
        const nextSteps = currentSteps.includes(nextStep) ? currentSteps : [...currentSteps, nextStep].slice(0, 4);

        return {
          ...current,
          rag: {
            ...current.rag,
            duration_ms: Number(current.rag?.duration_ms ?? 0) + 900,
            sources: currentSteps.length >= 1
              ? {
                fallas: Number(current.rag?.sources?.fallas ?? 0),
                agenda: Number(current.rag?.sources?.agenda ?? 0),
                marketplace: Number(current.rag?.sources?.marketplace ?? 0),
                cendra: Number(current.rag?.sources?.cendra ?? 0),
                documentos: Number(current.rag?.sources?.documentos ?? 0),
              }
              : current.rag?.sources,
            steps: nextSteps,
          },
        };
      });
    }, 900);

    return () => window.clearInterval(intervalId);
  }, [isLoading]);

  useEffect(() => {
    if (!isFalleritoQuickMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!falleritoQuickMenuRef.current?.contains(event.target as Node)) {
        setIsFalleritoQuickMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [isFalleritoQuickMenuOpen]);

  const requestFalleritoReply = async (
    text: string,
    intent: FalleritoIntent,
    localReply: string,
    history: FalleritoMessage[],
    settings: FalleritoSettings,
    documents: FalleritoDocumentScan[] = [],
    context: FalleritoPlannerContext = {},
  ) => {
    const response = await fetch(`${resolveDashboardBasePath() || ''}/api/fallerito.php`, await withCsrfHeadersAsync({
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }).then((headers) => ({
      method: 'POST',
      credentials: 'same-origin',
      headers,
      body: JSON.stringify({
        message: text,
        intent,
        localReply,
        history: history.slice(-6),
        settings,
        documents: documents.map((document) => ({
          kind: document.kind,
          name: document.name,
          type: document.type,
          size: document.size,
          text: document.text,
          imageBase64: document.imageBase64,
        })),
        context,
      }),
    })));

    const payload = await response.json().catch(() => ({})) as {
      ok?: boolean;
      reply?: string;
      source?: string;
      model?: string;
      message?: string;
      actions?: FalleritoAction[];
      debug?: FalleritoTrace;
      memory?: unknown;
    };

    if (!response.ok || payload.ok === false) {
      throw new Error(payload.message || 'Fallerito no esta disponible ahora mismo.');
    }

    return {
      reply: typeof payload.reply === 'string' && payload.reply.trim() !== '' ? payload.reply.trim() : localReply,
      source: payload.source === 'ollama'
        ? 'Dolphin local'
        : payload.source === 'deepseek-fallero'
          ? 'DeepSeek fallero'
          : payload.source === 'deepthinking-fallero'
            ? 'Deep Thinking fallero'
            : 'Modo local',
      model: payload.model,
      trace: payload.debug,
      memory: sanitizeFalleritoMemory(payload.memory),
      actions: Array.isArray(payload.actions)
        ? payload.actions
          .map((action): FalleritoAction | null => {
            if (
              !action
              || typeof action !== 'object'
              || typeof action.type !== 'string'
              || typeof action.label !== 'string'
              || action.label.trim() === ''
            ) {
              return null;
            }

            const source = action as Partial<FalleritoAction>;
            return {
              type: source.type,
              label: source.label.trim(),
              tab: typeof source.tab === 'string' ? source.tab : undefined,
              fallaId: typeof source.fallaId === 'string' ? source.fallaId : undefined,
              fallaIds: Array.isArray(source.fallaIds)
                ? source.fallaIds.filter((value): value is string => typeof value === 'string' && value.trim() !== '')
                : undefined,
              routeStops: Array.isArray(source.routeStops)
                ? source.routeStops.filter((stop): stop is NonNullable<FalleritoAction['routeStops']>[number] => (
                  !!stop
                  && typeof stop === 'object'
                  && typeof stop.lat === 'number'
                  && Number.isFinite(stop.lat)
                  && typeof stop.lng === 'number'
                  && Number.isFinite(stop.lng)
                ))
                : undefined,
              fallaName: typeof source.fallaName === 'string' ? source.fallaName : undefined,
            };
          })
          .filter((action): action is FalleritoAction => action !== null)
        : [],
    };
  };

  const trackFalleritoEvent = async (
    eventType: FalleritoEventType,
    details: Record<string, unknown> = {},
  ) => {
    try {
      await fetch(`${resolveDashboardBasePath() || ''}/api/fallerito-event.php`, await withCsrfHeadersAsync({
        'Content-Type': 'application/json',
        Accept: 'application/json',
      }).then((headers) => ({
        method: 'POST',
        credentials: 'same-origin',
        headers,
        body: JSON.stringify({
          eventType,
          threadId: activeFalleritoThreadId,
          details,
        }),
      })));
    } catch {
      // No bloquea el chat si falla la telemetria.
    }
  };

  const handleFalleritoLanguageChange = (language: FalleritoLanguage) => {
    setFalleritoSettings((current) => ({ ...current, language }));
    setFalleritoMemory((current) => ({ ...current, language }));
    void updateFalleritoUserMemory({ language })
      .then((memory) => setFalleritoMemory(memory))
      .catch(() => {
        // Mantiene la preferencia local si falla la persistencia remota.
      });
  };

  const handleFalleritoMemoryPatch = (patch: Partial<FalleritoUserMemory> & { reset?: boolean }) => {
    const optimisticMemory = patch.reset
      ? FALLERITO_DEFAULT_USER_MEMORY
      : {
        ...falleritoMemory,
        ...patch,
      };

    setFalleritoMemory({
      ...optimisticMemory,
      favoriteZones: Array.isArray(optimisticMemory.favoriteZones) ? optimisticMemory.favoriteZones.slice(0, 3) : [],
    });

    if (patch.language && FALLERITO_LANGUAGE_OPTIONS.some((option) => option.value === patch.language)) {
      setFalleritoSettings((current) => ({ ...current, language: patch.language as FalleritoLanguage }));
    }

    void updateFalleritoUserMemory(patch)
      .then((memory) => {
        setFalleritoMemory(memory);
        setFalleritoSettings((current) => current.language === memory.language ? current : {
          ...current,
          language: memory.language,
        });
      })
      .catch(() => {
        // No bloquea Fallerito si la memoria no se pudo guardar.
      });
  };

  const selectFalleritoMode = (mode: FalleritoAssistantMode) => {
    setSelectedFalleritoMode(mode);
    setIsFalleritoQuickMenuOpen(false);

    if (mode === 'default') {
      return;
    }

    const selectedMode = FALLERITO_ASSISTANT_MODES.find((option) => option.value === mode);
    void trackFalleritoEvent('mode_select', {
      actionType: mode,
      label: selectedMode?.label ?? mode,
    });
  };

  const handleFalleritoAction = (action: FalleritoAction) => {
    void trackFalleritoEvent('action_click', {
      actionType: action.type,
      label: action.label,
      tab: action.tab ?? null,
      fallaId: action.fallaId ?? null,
    });

    if (action.type === 'open_marketplace') {
      onOpenTab('Marketplace');
      return;
    }

    if (action.type === 'open_falla_route') {
      if (Array.isArray(action.fallaIds) && action.fallaIds.length > 0) {
        onOpenFallaRoute(action.fallaId ?? action.fallaIds[action.fallaIds.length - 1] ?? null, action.fallaIds, action.routeStops ?? null);
        return;
      }

      if (action.fallaId) {
        onOpenFallaRoute(action.fallaId, null, action.routeStops ?? null);
        return;
      }

      onOpenTab('Mapa');
      return;
    }

    if (action.type === 'open_tab' && action.tab) {
      onOpenTab(action.tab);
    }
  };

  const startNewFalleritoChat = () => {
    setActiveFalleritoThreadId(createFalleritoThreadId());
    setMessages(FALLERITO_INITIAL_MESSAGES);
    setMessage('');
    setLiveTrace(undefined);
    setIsLoading(false);
    setStatusLabel('Fallerito');
    setIsFalleritoHistoryOpen(false);
    setIsFalleritoQuickMenuOpen(false);
    setSelectedFalleritoMode('deepthinking-fallero');
  };

  const openFalleritoThread = (thread: FalleritoThread) => {
    setActiveFalleritoThreadId(thread.id);
    setMessages(thread.messages);
    setMessage('');
    setLiveTrace(undefined);
    setIsLoading(false);
    setStatusLabel('Fallerito');
    setIsFalleritoHistoryOpen(false);
    setIsFalleritoQuickMenuOpen(false);
    setSelectedFalleritoMode('deepthinking-fallero');
  };

  const handleDocumentSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setIsScanningDocument(true);
    setDocumentScanError(null);

    try {
      const document = await scanFalleritoDocument(file);
      setAttachedDocument(document);
    } catch (error) {
      setAttachedDocument(null);
      setDocumentScanError(error instanceof Error ? error.message : 'No he podido escanear el documento.');
    } finally {
      setIsScanningDocument(false);
    }
  };

  const sendMessage = async (text: string) => {
    const currentDocument = attachedDocument;
    const trimmed = text.trim() || (currentDocument
      ? currentDocument.kind === 'image'
        ? 'Analiza esta imagen y dime que informacion importante contiene.'
        : 'Analiza este documento y resumeme lo importante.'
      : '');
    if (!trimmed || isLoading) return;

    const intent = detectFalleritoIntent(trimmed);
    const effectiveSettings = resolveEffectiveFalleritoSettings(trimmed, falleritoSettings);
    const localReply = applyFalleritoSettingsToReply(getFalleritoResponse(intent, messages.length, effectiveSettings.language), effectiveSettings);
    const isMarketplaceOfferRequest = shouldAttachMarketplaceOffers(trimmed, intent);
    const marketplaceOffers = buildFalleritoOfferCards(falleritoMarketplaceData, trimmed, intent);
    const hasDocumentContext = Boolean(currentDocument);
    const outgoingMessages: FalleritoMessage[] = [...messages, {
      from: 'user',
      text: trimmed,
      attachment: currentDocument ? {
        kind: currentDocument.kind,
        name: currentDocument.name,
        type: currentDocument.type,
        size: currentDocument.size,
        previewUrl: currentDocument.previewUrl,
        pageCount: currentDocument.pageCount,
      } : undefined,
    }];
    const isLightIntent = isFalleritoLightIntent(intent, trimmed);
    const shouldTryLocation = selectedFalleritoMode === 'deepseek-fallero-nearby'
      || needsFalleritoLocationContext(trimmed, intent);

    setMessages(outgoingMessages);
    setMessage('');
    setAttachedDocument(null);
    setDocumentScanError(null);
    setIsFalleritoQuickMenuOpen(false);

    if (!hasDocumentContext && isMarketplaceOfferRequest && marketplaceOffers.length === 0) {
      setStatusLabel('Marketplace');
      setLiveTrace(undefined);
      const followUps = buildFalleritoFollowUps(intent, effectiveSettings.language, outgoingMessages.map((item) => item.text));
      window.setTimeout(() => {
        setMessages((current) => [...current, {
          from: 'bot',
          text: 'Ahora mismo no hay ofertas disponibles.',
          followUps,
        }]);
      }, 120);
      return;
    }

    if (!hasDocumentContext && isLightIntent) {
      setStatusLabel('Modo local');
      setLiveTrace(undefined);
      const followUps = buildFalleritoFollowUps(intent, effectiveSettings.language, outgoingMessages.map((item) => item.text));
      window.setTimeout(() => {
        setMessages((current) => [...current, {
          from: 'bot',
          text: localReply,
          offers: marketplaceOffers,
          followUps,
        }]);
      }, 120);
      return;
    }

    setIsLoading(true);
    setStatusLabel(
      selectedFalleritoMode === 'deepthinking-fallero'
        ? 'Deep Thinking fallero...'
        : selectedFalleritoMode === 'deepseek-fallero-nearby'
          ? 'Preparando DeepSeek fallero...'
        : 'Pensando...'
    );
    setLiveTrace(buildInitialFalleritoTrace(trimmed, intent, {
      hasDocumentContext,
      shouldTryLocation,
      hasLocation: Boolean(userPosition),
      isMarketplaceOfferRequest,
      assistantMode: selectedFalleritoMode,
    }));

    try {
      let plannerPosition = userPosition;
      if (!plannerPosition && shouldTryLocation && locationStatus !== 'blocked' && locationStatus !== 'unsupported') {
        setStatusLabel('Buscando GPS...');
        plannerPosition = await requestLocation().catch(() => null);
        setStatusLabel('Pensando...');
      }

      const result = await requestFalleritoReply(
        trimmed,
        intent,
        localReply,
        messages,
        effectiveSettings,
        currentDocument ? [currentDocument] : [],
        {
          userPosition: plannerPosition,
          locationStatus,
          requestedAt: new Date().toISOString(),
          assistantMode: selectedFalleritoMode,
        },
      );
      setFalleritoMemory(result.memory);
      setFalleritoSettings((current) => current.language === result.memory.language ? current : {
        ...current,
        language: result.memory.language,
      });
      const actions = dedupeFalleritoActions(marketplaceOffers.length
        ? result.actions.filter((action) => action.type !== 'open_marketplace')
        : result.actions);
      const followUps = buildFalleritoFollowUps(intent, effectiveSettings.language, outgoingMessages.map((item) => item.text));
      setMessages((current) => [...current, {
        from: 'bot',
        text: applyFalleritoSettingsToReply(result.reply, effectiveSettings),
        actions,
        offers: marketplaceOffers,
        trace: normalizeFalleritoTrace(result.trace, trimmed, intent, {
          hasDocumentContext,
          shouldTryLocation,
          hasLocation: Boolean(plannerPosition),
          isMarketplaceOfferRequest,
          assistantMode: selectedFalleritoMode,
        }),
        followUps,
      }]);
      setStatusLabel(result.source);
    } catch (error) {
      const followUps = buildFalleritoFollowUps(intent, effectiveSettings.language, outgoingMessages.map((item) => item.text));
      setMessages((current) => [...current, {
        from: 'bot',
        text: error instanceof Error ? error.message : 'Fallerito no puede responder porque Dolphin local no esta disponible.',
        followUps,
      }]);
      setStatusLabel('IA no disponible');
    } finally {
      setLiveTrace(undefined);
      setIsLoading(false);
    }
  };

  const renderThinkingTrace = (trace?: FalleritoTrace, live = false) => {
    if (!trace) return null;

    const keywords = Array.isArray(trace.rag?.keywords) ? trace.rag?.keywords.filter(Boolean).slice(0, 6) : [];
    const sources = trace.rag?.sources && typeof trace.rag.sources === 'object' ? Object.entries(trace.rag.sources) : [];
    const foundSources = sources.filter(([, count]) => Number(count) > 0);
    const items = Array.isArray(trace.rag?.items) ? trace.rag?.items.slice(0, 4) : [];
    const durationSeconds = Math.max(1, Math.round(Number(trace.rag?.duration_ms ?? 0) / 1000));
    const steps = Array.isArray(trace.rag?.steps) && trace.rag.steps.length > 0
      ? trace.rag.steps.slice(0, 4)
      : [
        keywords.length ? `He extraido palabras clave: ${keywords.join(', ')}.` : 'He revisado la pregunta para decidir que datos consultar.',
        foundSources.length
          ? `He encontrado resultados en ${foundSources.map(([source, count]) => `${source} (${count})`).join(', ')}.`
          : 'No he encontrado coincidencias claras en las fuentes locales.',
        items.length ? 'He usado las fuentes mas relevantes para preparar la respuesta.' : 'Respondere con cautela y orientare dentro de la app.',
      ];
    const agentTools = Array.isArray(trace.agent?.tools) ? trace.agent.tools.slice(0, 6) : [];
    const totalFound = foundSources.reduce((sum, [, count]) => sum + Number(count), 0);

    if (keywords.length === 0 && sources.length === 0 && items.length === 0 && !trace.intent && steps.length === 0) return null;

    return (
      <details open={live} className={cn('group overflow-hidden rounded-[1rem] border text-left shadow-sm', live ? 'mt-1' : 'mt-2', isDarkMode ? 'border-white/10 bg-white/[0.06] text-white' : 'border-orange-100 bg-white text-slate-700')}>
        <summary className={cn('flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-[11px] font-black sm:gap-3 sm:text-[12px] [&::-webkit-details-marker]:hidden', isDarkMode ? 'text-white/86' : 'text-[#4a3d34]')}>
          <span className="inline-flex min-w-0 items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-brand" />
            <span className="truncate">{live ? `Pensando en directo · ${durationSeconds} s` : `Pensado en ${durationSeconds} s`}</span>
          </span>
          <span className={cn('transition group-open:rotate-180', isDarkMode ? 'text-white/50' : 'text-brand/60')}>v</span>
        </summary>
        <div className={cn('border-t px-3 pb-3 pt-1 text-[11px] font-semibold leading-5 sm:text-[12px]', live ? 'max-h-36 overflow-y-auto overscroll-contain sm:max-h-none' : '', isDarkMode ? 'border-white/10 text-white/76' : 'border-orange-100 text-slate-600')}>
          <div>
            {steps.map((step, stepIndex) => (
              <div key={`${step}-${stepIndex}`} className="relative pl-5">
                <span className={cn('absolute left-0 top-[0.65rem] h-1.5 w-1.5 rounded-full', isDarkMode ? 'bg-white/60' : 'bg-brand/75')} />
                {stepIndex < steps.length - 1 ? <span className={cn('absolute bottom-[-0.55rem] left-[0.17rem] top-[1.1rem] w-px', isDarkMode ? 'bg-white/18' : 'bg-orange-200')} /> : null}
                <p className="py-2">{step}</p>
              </div>
            ))}
          </div>
          <div className="hidden flex-wrap gap-1.5">
            {trace.intent ? <span className={cn('rounded-full px-2 py-1', isDarkMode ? 'bg-white/8' : 'bg-white')}>intencion: {trace.intent}</span> : null}
            {keywords.map((keyword) => (
              <span key={keyword} className={cn('rounded-full px-2 py-1', isDarkMode ? 'bg-white/8' : 'bg-white')}>
                {keyword}
              </span>
            ))}
          </div>
          <div className={cn('mt-1 flex min-w-0 items-center gap-2 border-l py-1 pl-4 text-[12px]', isDarkMode ? 'border-white/20 text-white/68' : 'border-orange-200 text-slate-500')}>
            <Search className={cn('h-3.5 w-3.5 shrink-0', isDarkMode ? 'text-white/68' : 'text-brand/70')} />
            <span className="shrink-0">{totalFound} fuentes locales</span>
            <span className={cn('truncate', isDarkMode ? 'text-white/45' : 'text-slate-400')}>
              {foundSources.length ? foundSources.map(([source, count]) => `${source} ${count}`).join(' · ') : 'sin coincidencias claras'}
            </span>
          </div>
          {sources.length ? (
            <div className="hidden grid-cols-2 gap-1.5 min-[380px]:grid-cols-3">
              {sources.map(([source, count]) => (
                <span key={source} className={cn('rounded-[0.7rem] px-2 py-1.5', isDarkMode ? 'bg-white/7' : 'bg-white')}>
                  {source}: {count}
                </span>
              ))}
            </div>
          ) : null}
          {items.length ? (
            <div className="mt-2 space-y-1.5">
              {items.map((item, itemIndex) => (
                <div key={`${item.source ?? 'fuente'}-${item.title ?? itemIndex}`} className={cn('rounded-[0.75rem] border-l px-2.5 py-2', isDarkMode ? 'border-white/18 bg-white/[0.04] text-white/68' : 'border-orange-200 bg-[#fff8f4] text-slate-500')}>
                  <p className={cn('truncate font-bold', isDarkMode ? 'text-white/76' : 'text-[#4a3d34]')}>{item.title || 'Fuente recuperada'}</p>
                  <p className="truncate opacity-70">{item.type || 'dato'} · {item.source || 'Fallas 360'}</p>
                </div>
              ))}
            </div>
          ) : null}
          {agentTools.length ? (
            <div className="mt-2 space-y-1.5">
              <div className={cn('text-[10px] font-black uppercase tracking-[0.16em]', isDarkMode ? 'text-white/54' : 'text-slate-500')}>
                Herramientas usadas
              </div>
              <div className="grid gap-1.5">
                {agentTools.map((tool, toolIndex) => (
                  <div
                    key={`${tool.name ?? 'tool'}-${toolIndex}`}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-[0.75rem] border-l px-2.5 py-2',
                      isDarkMode ? 'border-white/18 bg-white/[0.04] text-white/68' : 'border-orange-200 bg-[#fff8f4] text-slate-500'
                    )}
                  >
                    <div className="min-w-0">
                      <p className={cn('truncate font-bold', isDarkMode ? 'text-white/76' : 'text-[#4a3d34]')}>
                        {tool.label || tool.name || 'Herramienta'}
                      </p>
                      <p className="truncate opacity-70">
                        {(tool.status || 'completed')} · {Math.max(0, Number(tool.count ?? 0))} resultado{Number(tool.count ?? 0) === 1 ? '' : 's'}
                      </p>
                    </div>
                    <span className={cn('shrink-0 text-[10px] font-black uppercase tracking-[0.14em]', isDarkMode ? 'text-white/45' : 'text-slate-400')}>
                      {Math.max(0, Number(tool.duration_ms ?? 0))} ms
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </details>
    );
  };

  const renderAttachmentPreview = (attachment?: FalleritoAttachmentPreview, compact = false) => {
    if (!attachment) return null;

    if (attachment.kind === 'image' && attachment.previewUrl) {
      return (
        <div className={cn('mb-2 overflow-hidden rounded-[1.45rem] shadow-[0_18px_46px_-24px_rgba(15,23,42,0.45)]', compact ? 'h-14 w-14 rounded-[0.9rem]' : 'ml-auto aspect-square w-[min(45vw,168px)]')}>
          <img src={attachment.previewUrl} alt={attachment.name} className="h-full w-full object-cover" />
        </div>
      );
    }

    const isPdf = attachment.type === 'application/pdf' || attachment.name.toLowerCase().endsWith('.pdf');

    return (
      <div className={cn('mb-2 ml-auto flex max-w-[min(78vw,320px)] items-center gap-3 rounded-[1.15rem] border px-3 py-2.5 text-left shadow-[0_18px_46px_-28px_rgba(15,23,42,0.42)]', isDarkMode ? 'border-white/10 bg-white/10 text-white' : 'border-slate-200 bg-white text-slate-950')}>
        <div className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-[0.9rem]', isPdf ? 'bg-red-50 text-red-600' : isDarkMode ? 'bg-white/10 text-white' : 'bg-[#fff1ea] text-brand')}>
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black">{attachment.name}</p>
          <p className={cn('truncate text-xs font-bold', isDarkMode ? 'text-white/56' : 'text-slate-500')}>
            {isPdf ? 'PDF' : 'Documento'} · {formatFileSize(attachment.size)}{attachment.pageCount ? ` · ${attachment.pageCount} paginas` : ''}
          </p>
        </div>
      </div>
    );
  };

  const renderVisibleSources = (trace?: FalleritoTrace) => {
    const sources = buildFalleritoVisibleSources(trace);
    if (sources.length === 0) {
      return null;
    }

    return (
      <div className="mt-3 pl-0.5">
        <div className="mb-2 flex items-center gap-2">
          <Search className={cn('h-3.5 w-3.5', isDarkMode ? 'text-white/58' : 'text-brand/80')} />
          <p className={cn('text-[10px] font-black uppercase tracking-[0.16em]', isDarkMode ? 'text-white/58' : 'text-slate-500')}>
            Fuentes consultadas
          </p>
        </div>
        <div className="grid gap-2">
          {sources.map((source) => (
            <div
              key={source.key}
              className={cn(
                'rounded-[0.95rem] border px-3 py-2.5 text-left shadow-[0_12px_30px_-26px_rgba(15,23,42,0.38)]',
                isDarkMode ? 'border-white/10 bg-white/[0.05]' : 'border-slate-200 bg-slate-50'
              )}
            >
              <p className={cn('truncate text-[11px] font-black uppercase tracking-[0.14em]', isDarkMode ? 'text-white/82' : 'text-[#4a3d34]')}>
                {source.label}
              </p>
              <p className={cn('mt-1 text-xs font-bold leading-5', isDarkMode ? 'text-white/56' : 'text-slate-500')}>
                {source.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const hasMessages = messages.length > 0;

  return (
    <section className={cn('relative flex h-full min-h-0 flex-col overflow-hidden', isDarkMode ? 'bg-[#160d08] text-white' : 'bg-[#fff9f4] text-[#21140d]')}>
      <div className={cn('pointer-events-none absolute inset-0', isDarkMode ? 'bg-[radial-gradient(circle_at_top,rgba(255,99,33,0.14),transparent_44%),linear-gradient(180deg,#160d08_0%,#1e120c_100%)]' : 'bg-[radial-gradient(circle_at_top,rgba(255,99,33,0.12),transparent_38%),linear-gradient(180deg,#fffdfb_0%,#fff7ef_100%)]')} />
      <div className={cn('pointer-events-none absolute inset-0 opacity-80', isDarkMode ? 'bg-[radial-gradient(circle_at_20%_18%,rgba(255,255,255,0.06),transparent_18%),radial-gradient(circle_at_80%_22%,rgba(255,172,96,0.08),transparent_16%),radial-gradient(circle_at_30%_84%,rgba(255,172,96,0.06),transparent_20%)]' : 'bg-[radial-gradient(circle_at_18%_16%,rgba(255,126,52,0.08),transparent_16%),radial-gradient(circle_at_82%_20%,rgba(255,194,120,0.12),transparent_18%),radial-gradient(circle_at_22%_82%,rgba(255,126,52,0.06),transparent_18%)]')} />
      <div className="relative shrink-0 px-3 pb-2 pt-[calc(env(safe-area-inset-top,0px)+0.7rem)] sm:px-5 sm:pb-3 sm:pt-[calc(env(safe-area-inset-top,0px)+1rem)] lg:px-8">
        <div className="mx-auto flex w-full max-w-[980px] items-center justify-between gap-3">
          <button type="button" onClick={() => setIsFalleritoHistoryOpen(true)} className={cn('grid h-12 w-12 place-items-center rounded-full border shadow-[0_18px_40px_-26px_rgba(255,99,33,0.28)] transition sm:h-14 sm:w-14', isDarkMode ? 'border-white/10 bg-white/6 text-brand-light hover:bg-white/10' : 'border-[#ffe2d0] bg-white/88 text-brand hover:bg-white')} aria-label="Abrir chats anteriores">
            <List className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
          <div className={cn('min-w-0 rounded-full border px-6 py-3 text-center shadow-[0_22px_52px_-34px_rgba(255,99,33,0.32)] sm:px-9', isDarkMode ? 'border-white/10 bg-white/8' : 'border-[#ffe7d9] bg-white/90')}>
            <p className="truncate text-[1.65rem] font-black tracking-[-0.04em] text-brand sm:text-[2rem]">Fallerito</p>
            <p className={cn('mt-1 hidden text-[10px] font-black uppercase tracking-[0.18em] sm:block', isDarkMode ? 'text-white/50' : 'text-[#b98b77]')}>
              {isLoading ? statusLabel : hasMessages ? 'Asistente fallero' : 'Tu asistente fallero'}
            </p>
          </div>
          <button type="button" onClick={() => setIsFalleritoSettingsOpen(true)} className={cn('grid h-12 w-12 place-items-center rounded-full border shadow-[0_18px_40px_-26px_rgba(255,99,33,0.28)] transition sm:h-14 sm:w-14', isDarkMode ? 'border-white/10 bg-white/6 text-white/78 hover:bg-white/10' : 'border-[#ffe2d0] bg-white/88 text-[#2c211d] hover:bg-white')} aria-label="Opciones">
            <Settings2 className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto px-4 py-3 [scrollbar-width:none] sm:px-6 sm:py-4 lg:px-8 [&::-webkit-scrollbar]:hidden">
        <div className="mx-auto flex max-w-[980px] flex-col gap-5 sm:gap-6">
          {!hasMessages ? (
            <div className="flex min-h-[42vh] flex-col items-center justify-center px-2 pb-4 pt-1 text-center sm:min-h-[46vh]">
              <div className="relative">
                <span className={cn('absolute -left-7 top-7 text-lg sm:-left-10 sm:text-2xl', isDarkMode ? 'text-orange-200/65' : 'text-[#ffc4a1]')}>✦</span>
                <span className={cn('absolute -right-7 top-4 text-xl sm:-right-10 sm:text-3xl', isDarkMode ? 'text-orange-200/60' : 'text-[#ffc4a1]')}>✦</span>
                <div className={cn('grid h-24 w-24 place-items-center rounded-[1.9rem] border-[3px] shadow-[0_22px_48px_-30px_rgba(255,99,33,0.52)] sm:h-32 sm:w-32', isDarkMode ? 'border-brand/50 bg-white/[0.04] text-brand-light' : 'border-brand/75 bg-[#fff7f1] text-brand')}>
                  <Bot className="h-12 w-12 sm:h-16 sm:w-16" />
                </div>
                <span className={cn('absolute inset-x-4 -bottom-3 h-4 rounded-full blur-xl', isDarkMode ? 'bg-white/12' : 'bg-[#ffd8c2]')} />
              </div>
              <h1 className={cn('mt-5 max-w-[10ch] text-[clamp(1.9rem,5.8vw,3.4rem)] font-black leading-[0.9] tracking-[-0.05em]', isDarkMode ? 'text-white' : 'text-[#1d140f]')}>
                En que te ayudo hoy?
              </h1>
              <p className={cn('mt-2.5 max-w-[22ch] text-[clamp(0.88rem,2.4vw,1.1rem)] font-semibold leading-[1.24]', isDarkMode ? 'text-white/68' : 'text-[#7c6a61]')}>
                Rutas, mascletaes, fallas y transporte.
              </p>
              <div className={cn('mt-4 max-w-[26rem] rounded-full border px-4 py-2 text-sm font-black shadow-[0_14px_30px_-24px_rgba(255,99,33,0.45)]', isDarkMode ? 'border-white/10 bg-white/[0.06] text-white/82' : 'border-[#ffe5d8] bg-white/92 text-[#8c5a43]')}>
                Ya estoy listo. Dime "que falla veo cerca" o "hazme una ruta rapida".
              </div>
              <div className="mt-6 grid w-full max-w-[720px] gap-2.5 sm:grid-cols-2 sm:gap-3">
                {FALLERITO_SUGGESTION_CARDS.slice(0, 2).map((suggestion) => (
                  <button key={suggestion.label} type="button" onClick={() => void sendMessage(suggestion.label)} disabled={isLoading} className={cn('flex min-h-[62px] items-center justify-center gap-3 rounded-full border px-6 text-[0.98rem] font-black shadow-[0_18px_40px_-28px_rgba(255,99,33,0.22)] transition hover:-translate-y-0.5 disabled:opacity-50 sm:min-h-[72px] sm:text-[1.05rem]', isDarkMode ? 'border-white/10 bg-white/6 text-white hover:bg-white/10' : 'border-[#ffe5d8] bg-white/92 text-[#241814] hover:bg-white')}>
                    <suggestion.icon className="h-5 w-5 shrink-0 text-brand sm:h-6 sm:w-6" />
                    <span>{suggestion.label}</span>
                  </button>
                ))}
              </div>
              <p className={cn('mt-6 inline-flex items-center gap-2 text-sm font-semibold sm:text-[0.95rem]', isDarkMode ? 'text-white/52' : 'text-[#a1948d]')}>
                <Sparkles className="h-4 w-4 text-[#c8bbb3]" />
                Pregunta cualquier cosa sobre Fallas 360
              </p>
            </div>
          ) : null}

          {messages.map((item, index) => {
            const isUserMessage = item.from === 'user';
            return (
              <div key={`${item.from}-${index}`} className={cn('flex w-full', isUserMessage ? 'justify-end' : 'justify-start')}>
                <div className={cn('min-w-0', isUserMessage ? 'max-w-[88%] sm:max-w-[76%]' : 'w-full max-w-[920px]')}>
                  <div className={cn('mb-1.5 flex items-center gap-2 px-1 text-[10px] font-black uppercase tracking-[0.18em]', isDarkMode ? 'text-white/42' : 'text-[#b3a49d]', isUserMessage ? 'justify-end' : 'justify-start')}>
                    {isUserMessage ? 'Tu' : 'Fallerito'}
                  </div>
                  <div className={cn(isUserMessage ? 'flex justify-end' : 'block')}>
                    {isUserMessage ? renderAttachmentPreview(item.attachment) : null}
                    {item.text ? (
                      <div
                        className={cn(
                          'whitespace-pre-wrap break-words text-[0.98rem] leading-7 tracking-[-0.01em] sm:text-[1.04rem]',
                          isUserMessage
                            ? 'rounded-[1.7rem] rounded-br-[1.1rem] bg-brand px-4 py-3.5 font-semibold text-white shadow-[0_18px_36px_-24px_rgba(255,99,33,0.75)]'
                            : isDarkMode
                              ? 'rounded-[1.7rem] rounded-tl-[1.1rem] border border-white/10 bg-white/[0.05] px-4 py-3.5 font-medium text-white'
                              : 'rounded-[1.7rem] rounded-tl-[1.1rem] border border-[#ffe4d6] bg-white/96 px-4 py-3.5 font-medium text-[#21140d] shadow-[0_18px_44px_-30px_rgba(255,99,33,0.28)]'
                        )}
                      >
                        {item.text}
                      </div>
                    ) : null}
                  </div>
                    {item.from === 'bot' ? (
                      <div className={cn('mt-2.5 flex items-center gap-1.5 px-1', isDarkMode ? 'text-white/52' : 'text-slate-500')}>
                        <button
                          type="button"
                          aria-label="Copiar"
                          onClick={() => {
                            if (navigator.clipboard?.writeText) {
                              void navigator.clipboard.writeText(item.text);
                            }
                            void trackFalleritoEvent('copy_reply', {
                              intent: item.trace?.intent ?? null,
                              replyPreview: item.text.slice(0, 160),
                            });
                          }}
                          className={cn('grid h-8 w-8 place-items-center rounded-full transition', isDarkMode ? 'hover:bg-white/10 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-900')}
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label="Leer"
                          onClick={() => {
                            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                              window.speechSynthesis.cancel();
                              const utterance = new SpeechSynthesisUtterance(item.text);
                              utterance.lang = 'es-ES';
                              window.speechSynthesis.speak(utterance);
                            }
                            void trackFalleritoEvent('read_reply', {
                              intent: item.trace?.intent ?? null,
                              replyPreview: item.text.slice(0, 160),
                            });
                          }}
                          className={cn('grid h-8 w-8 place-items-center rounded-full transition', isDarkMode ? 'hover:bg-white/10 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-900')}
                        >
                          <Volume2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label="Me sirve"
                          onClick={() => {
                            void trackFalleritoEvent('feedback_up', {
                              intent: item.trace?.intent ?? null,
                              replyPreview: item.text.slice(0, 160),
                            });
                          }}
                          className={cn('grid h-8 w-8 place-items-center rounded-full transition', isDarkMode ? 'hover:bg-white/10 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-900')}
                        >
                          <ThumbsUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label="No me sirve"
                          onClick={() => {
                            void trackFalleritoEvent('feedback_down', {
                              intent: item.trace?.intent ?? null,
                              replyPreview: item.text.slice(0, 160),
                            });
                          }}
                          className={cn('grid h-8 w-8 place-items-center rounded-full transition', isDarkMode ? 'hover:bg-white/10 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-900')}
                        >
                          <ThumbsDown className="h-4 w-4" />
                        </button>
                      </div>
                    ) : null}
                    {item.from === 'bot' ? renderThinkingTrace(item.trace) : null}
                    {item.from === 'bot' ? renderVisibleSources(item.trace) : null}
                    {item.from === 'bot' && item.offers?.length ? (
                      <div className="mt-3 grid gap-2.5 pl-1">
                        {item.offers.map((offer) => (
                          <button
                            key={offer.id}
                            type="button"
                            onClick={() => handleFalleritoAction(offer.action)}
                            className={cn(
                              'group flex w-full min-w-0 items-center gap-3 rounded-[1.3rem] border p-3 text-left shadow-[0_16px_36px_-30px_rgba(15,23,42,0.35)] transition active:scale-[0.99]',
                              isDarkMode ? 'border-white/10 bg-white/[0.05] hover:bg-white/[0.08]' : 'border-[#f2e4dd] bg-white hover:border-[#e4cfc4]'
                            )}
                          >
                            <div className={cn('flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[1rem]', isDarkMode ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700')}>
                              {offer.imageUrl ? (
                                <img src={offer.imageUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <BadgePercent className="h-5 w-5" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className={cn('rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em]', isDarkMode ? 'bg-white/10 text-white/70' : 'bg-slate-100 text-slate-700')}>
                                  {offer.kind === 'coupon' ? 'Cupon' : offer.kind === 'product' ? 'Producto' : offer.kind === 'experience' ? 'Experiencia' : 'Oferta'}
                                </span>
                                <span className={cn('truncate text-[10px] font-black', isDarkMode ? 'text-white/46' : 'text-slate-400')}>{offer.meta}</span>
                              </div>
                              <h4 className={cn('mt-1 truncate text-sm font-black leading-tight', isDarkMode ? 'text-white' : 'text-slate-950')}>{offer.title}</h4>
                              <p className={cn('mt-1 line-clamp-2 text-xs font-bold leading-5', isDarkMode ? 'text-white/58' : 'text-slate-500')}>
                                {offer.business} · {offer.detail}
                              </p>
                            </div>
                            <ArrowRight className={cn('h-4 w-4 shrink-0 transition group-hover:translate-x-0.5', isDarkMode ? 'text-white/50' : 'text-slate-500')} />
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {item.from === 'bot' && item.actions?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2 pl-1">
                        {item.actions.map((action, actionIndex) => (
                          <button
                            key={`${action.type}-${action.fallaId ?? action.tab ?? actionIndex}`}
                            type="button"
                            onClick={() => handleFalleritoAction(action)}
                            className={cn(
                              'inline-flex min-h-10 items-center rounded-full border px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition active:scale-[0.98]',
                              isDarkMode ? 'border-brand/30 bg-brand/10 text-brand-light hover:bg-brand/20' : 'border-brand/25 bg-white text-brand hover:bg-[#fff0e8]'
                            )}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                </div>
              </div>
            );
          })}

          {isLoading ? (
            <div className="flex justify-start">
              <div className={cn('w-full max-w-[920px] text-[1rem] font-medium leading-[1.4] sm:text-[1.08rem] sm:leading-[1.35]', isDarkMode ? 'text-white' : 'text-slate-950')}>
                <span className="inline-flex items-center gap-2 px-1"><Sparkles className="h-4.5 w-4.5 animate-pulse text-brand" /> {statusLabel}</span>
                {renderThinkingTrace(liveTrace, true)}
              </div>
            </div>
          ) : null}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="relative shrink-0 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.7rem)] pt-2 sm:px-5 sm:pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] lg:px-8">
        <input
          ref={documentInputRef}
          type="file"
          accept=".txt,.md,.csv,.json,.log,.pdf,.doc,.docx,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleDocumentSelected}
        />
        {attachedDocument || documentScanError || isScanningDocument ? (
          <div className={cn('mx-auto mb-3 flex max-w-[980px] items-center gap-3 rounded-[1.25rem] border px-3 py-3 text-left shadow-[0_16px_34px_-28px_rgba(15,23,42,0.12)]', isDarkMode ? 'border-white/10 bg-white/[0.06] text-white' : 'border-[#f0e0d7] bg-white/94 text-slate-950')}>
            {attachedDocument?.kind === 'image' && attachedDocument.previewUrl ? (
              <img src={attachedDocument.previewUrl} alt="" className="h-10 w-10 shrink-0 rounded-[0.8rem] object-cover" />
            ) : (
              <div className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-full', isDarkMode ? 'bg-white/10 text-white' : 'bg-[#fff1ea] text-brand')}>
                {attachedDocument?.kind === 'image' ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black">
                {isScanningDocument ? 'Analizando archivo...' : attachedDocument ? attachedDocument.name : 'Archivo no compatible'}
              </p>
              <p className={cn('truncate text-xs font-bold', isDarkMode ? 'text-white/56' : 'text-slate-500')}>
                {attachedDocument
                  ? attachedDocument.kind === 'image'
                    ? `${formatFileSize(attachedDocument.size)} · imagen lista para Fallerito`
                    : `${attachedDocument.type === 'application/pdf' ? 'PDF' : 'Documento'} · ${formatFileSize(attachedDocument.size)} · ${(attachedDocument.text?.length ?? 0).toLocaleString('es-ES')} caracteres${attachedDocument.pageCount ? ` · ${attachedDocument.pageCount} paginas` : ''}`
                  : documentScanError ?? 'No he podido leer el archivo.'}
              </p>
            </div>
            {attachedDocument || documentScanError ? (
              <button type="button" onClick={() => { setAttachedDocument(null); setDocumentScanError(null); }} className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full', isDarkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100')} aria-label="Quitar documento">
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        ) : null}
        <div className="mx-auto max-w-[980px]">
          {activeFalleritoMode ? (
            <div className={cn('mb-3 flex items-center justify-between gap-3 rounded-[1.2rem] border px-3 py-3 shadow-[0_14px_34px_-28px_rgba(15,23,42,0.1)]', isDarkMode ? 'border-white/10 bg-white/[0.06]' : 'border-[#f0e0d7] bg-white/92')}>
              <div className="flex min-w-0 items-center gap-2.5">
                <div className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-full', isDarkMode ? 'bg-white/10 text-white' : 'bg-[#fff1ea] text-brand')}>
                  {ActiveFalleritoModeIcon ? <ActiveFalleritoModeIcon className="h-4 w-4" /> : null}
                </div>
                <div className="min-w-0">
                  <p className={cn('text-[10px] font-black uppercase tracking-[0.16em]', isDarkMode ? 'text-white/54' : 'text-[#b39d92]')}>Modo activo</p>
                  <p className="truncate text-sm font-black">{activeFalleritoMode.label}</p>
                </div>
              </div>
              <button type="button" onClick={() => selectFalleritoMode('default')} className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full', isDarkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100')} aria-label="Quitar modo avanzado">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}
          <div ref={falleritoQuickMenuRef} className="relative">
            <AnimatePresence>
              {isFalleritoQuickMenuOpen ? (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.18 }}
                  className={cn('absolute bottom-full left-0 z-20 mb-3 w-[min(360px,calc(100vw-1.5rem))] overflow-hidden rounded-[1.4rem] border shadow-[0_24px_60px_-26px_rgba(15,23,42,0.22)]', isDarkMode ? 'border-white/10 bg-slate-950' : 'border-[#f0e0d7] bg-white')}
                >
                  <div className={cn('border-b px-4 py-3', isDarkMode ? 'border-white/10' : 'border-slate-100')}>
                    <p className={cn('text-[11px] font-black uppercase tracking-[0.16em]', isDarkMode ? 'text-white/56' : 'text-slate-500')}>Acciones y modos</p>
                  </div>
                  <div className="p-2">
                    <button type="button" onClick={() => { setIsFalleritoQuickMenuOpen(false); documentInputRef.current?.click(); }} disabled={isLoading || isScanningDocument} className={cn('mb-2 flex w-full items-center gap-3 rounded-[1rem] px-3 py-3 text-left transition disabled:opacity-50', isDarkMode ? 'hover:bg-white/8' : 'hover:bg-slate-50')}>
                      <div className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-full', isDarkMode ? 'bg-white/8 text-white/80' : 'bg-[#fff1ea] text-brand')}>
                        <Paperclip className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black">Adjuntar foto o documento</p>
                        <p className={cn('mt-1 text-xs font-bold leading-5', isDarkMode ? 'text-white/56' : 'text-slate-500')}>PDF, imagenes y documentos de texto.</p>
                      </div>
                    </button>
                    {FALLERITO_ASSISTANT_MODES.map((mode) => {
                      const Icon = mode.icon;
                      const isSelected = selectedFalleritoMode === mode.value;
                      return (
                        <button
                          key={mode.value}
                          type="button"
                          onClick={() => selectFalleritoMode(mode.value)}
                          className={cn('flex w-full items-start gap-3 rounded-[1rem] px-3 py-3 text-left transition', isSelected ? (isDarkMode ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-950') : (isDarkMode ? 'hover:bg-white/8' : 'hover:bg-slate-50'))}
                        >
                          <div className={cn('mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full', isSelected ? (isDarkMode ? 'bg-white/10 text-white' : 'bg-white text-slate-700') : (isDarkMode ? 'bg-white/8 text-white/72' : 'bg-slate-100 text-slate-700'))}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black">{mode.label}</p>
                            <p className={cn('mt-1 text-xs font-bold leading-5', isDarkMode ? 'text-white/56' : 'text-slate-500')}>{mode.detail}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
            <form className={cn('flex items-center gap-1.5 rounded-[1.75rem] border px-2.5 py-2 shadow-[0_24px_56px_-28px_rgba(255,99,33,0.28)] sm:gap-2.5 sm:px-4 sm:py-2.5', isDarkMode ? 'border-white/10 bg-[#20130d]' : 'border-[#f6dfd2] bg-white/96')} onSubmit={(event) => { event.preventDefault(); void sendMessage(message); }}>
              <button type="button" onClick={() => setIsFalleritoQuickMenuOpen((current) => !current)} className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-full transition sm:h-12 sm:w-12', isDarkMode ? 'bg-white/8 text-brand-light hover:bg-white/12' : 'bg-[#fff7f1] text-brand hover:bg-[#fff1e8]')} aria-label="Abrir acciones de Fallerito" aria-expanded={isFalleritoQuickMenuOpen}>
                <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage(message);
                  }
                }}
                placeholder={attachedDocument ? attachedDocument.kind === 'image' ? 'Pregunta sobre la foto adjunta' : 'Pregunta sobre el documento escaneado' : activeFalleritoMode ? `Pregunta a Fallerito en modo ${activeFalleritoMode.label}` : 'Pregunta a Fallerito...'}
                disabled={isLoading}
                rows={1}
                className={cn('max-h-20 min-h-10 min-w-0 flex-1 resize-none bg-transparent py-1.5 text-[0.98rem] font-medium leading-6 outline-none sm:max-h-24 sm:min-h-12 sm:py-2 sm:text-[1.06rem]', isDarkMode ? 'text-white placeholder:text-white/38' : 'text-slate-950 placeholder:text-[#b0a39c]')}
              />
              <button type="button" className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-full transition sm:h-11 sm:w-11', isDarkMode ? 'text-white/66 hover:bg-white/8' : 'text-[#241814] hover:bg-[#faf3ed]')} aria-label="Voz"><Mic className="h-5 w-5 sm:h-5.5 sm:w-5.5" /></button>
              <button type="submit" disabled={isLoading || isScanningDocument || (message.trim() === '' && !attachedDocument)} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand text-white shadow-[0_18px_34px_-18px_rgba(255,99,33,0.62)] transition hover:bg-brand-dark disabled:opacity-50 sm:h-[3.25rem] sm:w-[3.25rem]" aria-label="Enviar mensaje a Fallerito">
                <SendHorizontal className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </form>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isFalleritoHistoryOpen ? (
          <motion.div className="fixed inset-0 z-[7400] flex bg-black/35" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsFalleritoHistoryOpen(false)}>
            <motion.aside className={cn('h-full w-[86vw] max-w-[360px] overflow-y-auto border-r px-4 pb-6 pt-[calc(env(safe-area-inset-top,0px)+1rem)] shadow-[0_30px_90px_rgba(0,0,0,0.28)]', isDarkMode ? 'border-white/10 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-950')} initial={{ x: -40 }} animate={{ x: 0 }} exit={{ x: -40 }} transition={{ duration: 0.2 }} onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-brand">Fallerito</p>
                  <h2 className="text-xl font-black">Chats anteriores</h2>
                </div>
                <button type="button" onClick={() => setIsFalleritoHistoryOpen(false)} className={cn('grid h-10 w-10 place-items-center rounded-full', isDarkMode ? 'bg-white/10' : 'bg-slate-100')} aria-label="Cerrar historial"><X className="h-4 w-4" /></button>
              </div>
              <button type="button" onClick={startNewFalleritoChat} className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand text-sm font-black text-white"><Plus className="h-4 w-4" /> Nuevo chat</button>
              <div className="mt-5 space-y-2">
                {falleritoThreadList.length ? falleritoThreadList.map((thread) => {
                  const lastMessage = thread.messages[thread.messages.length - 1];
                  return (
                    <button key={thread.id} type="button" onClick={() => openFalleritoThread(thread)} className={cn('w-full rounded-[1rem] border p-3 text-left transition-colors', activeFalleritoThreadId === thread.id ? 'border-brand bg-[#fff1ea]' : isDarkMode ? 'border-white/10 bg-white/6 hover:bg-white/10' : 'border-slate-200 bg-slate-50 hover:bg-slate-100')}>
                      <span className="block truncate text-sm font-black">{thread.title}</span>
                      <span className={cn('mt-1 block truncate text-xs font-bold', isDarkMode ? 'text-white/52' : 'text-slate-500')}>{lastMessage?.text ?? 'Chat sin mensajes'}</span>
                    </button>
                  );
                }) : (
                  <div className={cn('rounded-[1rem] px-4 py-8 text-center', isDarkMode ? 'bg-white/6' : 'bg-slate-50')}>
                    <MessageCircle className="mx-auto h-7 w-7 text-brand" />
                    <p className="mt-3 text-sm font-black">Aun no hay chats</p>
                  </div>
                )}
              </div>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {isFalleritoSettingsOpen ? (
          <motion.div className="fixed inset-0 z-[7450] flex items-end justify-center bg-black/35 p-3 sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsFalleritoSettingsOpen(false)}>
            <motion.div className={cn('w-full max-w-[440px] rounded-[1.5rem] border p-4 shadow-[0_30px_90px_rgba(0,0,0,0.28)]', isDarkMode ? 'border-white/10 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-950')} initial={{ y: 30, scale: 0.98 }} animate={{ y: 0, scale: 1 }} exit={{ y: 24, scale: 0.98 }} transition={{ duration: 0.2 }} onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-brand">Ajustes</p>
                  <h2 className="text-xl font-black">Fallerito</h2>
                </div>
                <button type="button" onClick={() => setIsFalleritoSettingsOpen(false)} className={cn('grid h-10 w-10 place-items-center rounded-full', isDarkMode ? 'bg-white/10' : 'bg-slate-100')} aria-label="Cerrar ajustes"><X className="h-4 w-4" /></button>
              </div>

              <div className="mt-5 space-y-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-brand">Idioma</p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {FALLERITO_LANGUAGE_OPTIONS.map((option) => (
                      <button key={option.value} type="button" onClick={() => handleFalleritoLanguageChange(option.value)} className={cn('min-h-11 rounded-[0.9rem] border px-2 text-xs font-black transition', falleritoSettings.language === option.value ? 'border-brand bg-brand text-white' : isDarkMode ? 'border-white/10 bg-white/6 text-white/72' : 'border-slate-200 bg-slate-50 text-slate-700')}>
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-brand">Modo de respuesta</p>
                  <div className="mt-2 grid gap-2">
                    {FALLERITO_RESPONSE_MODE_OPTIONS.map((option) => (
                      <button key={option.value} type="button" onClick={() => setFalleritoSettings((current) => ({ ...current, responseMode: option.value }))} className={cn('flex min-h-11 items-center justify-between rounded-[0.9rem] border px-3 text-sm font-black transition', falleritoSettings.responseMode === option.value ? 'border-brand bg-brand text-white' : isDarkMode ? 'border-white/10 bg-white/6 text-white/72' : 'border-slate-200 bg-slate-50 text-slate-700')}>
                        {option.label}
                        {falleritoSettings.responseMode === option.value ? <span className="grid h-5 w-5 place-items-center rounded-full bg-white/18 text-[10px]">✓</span> : null}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-brand">Memoria por usuario</p>
                      <p className={cn('mt-1 text-xs font-bold', isDarkMode ? 'text-white/56' : 'text-slate-500')}>Fallerito recuerda preferencias reales entre sesiones y dispositivos.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleFalleritoMemoryPatch({ reset: true })}
                      className={cn('rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em]', isDarkMode ? 'border-white/10 bg-white/6 text-white/72' : 'border-slate-200 bg-slate-50 text-slate-700')}
                    >
                      Borrar memoria
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleFalleritoMemoryPatch({ prefersWalking: falleritoMemory.prefersWalking === true ? null : true })}
                      className={cn('rounded-full border px-3 py-2 text-[11px] font-black transition', falleritoMemory.prefersWalking === true ? 'border-brand bg-brand text-white' : isDarkMode ? 'border-white/10 bg-white/6 text-white/72' : 'border-slate-200 bg-slate-50 text-slate-700')}
                    >
                      Va andando
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFalleritoMemoryPatch({ avoidsCrowds: falleritoMemory.avoidsCrowds === true ? null : true })}
                      className={cn('rounded-full border px-3 py-2 text-[11px] font-black transition', falleritoMemory.avoidsCrowds === true ? 'border-brand bg-brand text-white' : isDarkMode ? 'border-white/10 bg-white/6 text-white/72' : 'border-slate-200 bg-slate-50 text-slate-700')}
                    >
                      Evita multitudes
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFalleritoMemoryPatch({ foodInterestLevel: falleritoMemory.foodInterestLevel >= 2 ? 0 : 3 })}
                      className={cn('rounded-full border px-3 py-2 text-[11px] font-black transition', falleritoMemory.foodInterestLevel >= 2 ? 'border-brand bg-brand text-white' : isDarkMode ? 'border-white/10 bg-white/6 text-white/72' : 'border-slate-200 bg-slate-50 text-slate-700')}
                    >
                      Suele pedir comida
                    </button>
                  </div>

                  <div className={cn('mt-3 rounded-[1rem] border px-3 py-3', isDarkMode ? 'border-white/10 bg-white/6' : 'border-slate-200 bg-slate-50')}>
                    <p className="text-sm font-black">Lo que Fallerito recuerda</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]', isDarkMode ? 'bg-white/8 text-white/82' : 'bg-white text-slate-700')}>
                        Idioma {FALLERITO_LANGUAGE_OPTIONS.find((option) => option.value === falleritoMemory.language)?.label ?? 'Español'}
                      </span>
                      {falleritoMemoryHighlights.length ? falleritoMemoryHighlights.map((item) => (
                        <span key={item} className={cn('rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]', isDarkMode ? 'bg-white/8 text-white/82' : 'bg-white text-slate-700')}>
                          {item}
                        </span>
                      )) : (
                        <span className={cn('text-xs font-bold', isDarkMode ? 'text-white/56' : 'text-slate-500')}>
                          Aún no hay suficientes señales. Fallerito irá aprendiendo con tus preguntas.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function AppOnboardingOverlay({
  isDarkMode,
  currentStep,
  stepIndex,
  totalSteps,
  onBack,
  onNext,
  onFinish,
  onSkip,
}: {
  isDarkMode: boolean;
  currentStep: (typeof APP_ONBOARDING_STEPS)[number];
  stepIndex: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
  onSkip: () => void;
}) {
  const Icon = currentStep.icon;
  const isLastStep = stepIndex === totalSteps - 1;

  return (
    <motion.div
      className="fixed inset-0 z-[9200] flex items-end justify-center bg-slate-950/14 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+5.9rem)] pt-6 sm:px-6 sm:pb-[calc(env(safe-area-inset-bottom,0px)+6.6rem)]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className={cn(
          'relative w-full max-w-[30rem] overflow-hidden rounded-[1.55rem] border p-3.5 shadow-[0_28px_70px_rgba(15,23,42,0.26)] backdrop-blur-xl sm:p-4',
          isDarkMode
            ? 'border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(8,13,23,0.96))] text-white'
            : 'border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,248,252,0.98))] text-slate-950'
        )}
        initial={{ opacity: 0, y: 26, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.98 }}
        transition={{ duration: 0.22 }}
      >
        <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-brand/18 blur-3xl" />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[1.15rem] bg-brand text-white shadow-[0_18px_34px_rgba(255,99,33,0.28)]">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">{currentStep.eyebrow}</p>
                <p className={cn('mt-1 text-[11px] font-black uppercase tracking-[0.14em]', isDarkMode ? 'text-white/46' : 'text-slate-400')}>
                  {currentStep.tab}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onSkip}
              className={cn(
                'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors',
                isDarkMode ? 'bg-white/10 text-white/72 hover:bg-white/14' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              )}
              aria-label="Omitir guia"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <h2 className="mt-4 text-[1.45rem] font-black leading-[0.98] tracking-[-0.05em] sm:text-[1.8rem]">
            {currentStep.title}
          </h2>
          <p className={cn('mt-2.5 text-[13px] font-bold leading-5 sm:text-sm sm:leading-6', isDarkMode ? 'text-white/72' : 'text-slate-600')}>
            {currentStep.body}
          </p>
          <p className={cn('mt-3 rounded-[1.1rem] px-3 py-2.5 text-[12px] font-black leading-5', isDarkMode ? 'bg-white/8 text-white/64' : 'bg-[#fff1e8] text-[#a84413]')}>
            {currentStep.helper}
          </p>

          <div className="mt-5 flex items-center gap-2">
            {APP_ONBOARDING_STEPS.map((step, index) => (
              <span
                key={step.tab}
                className={cn(
                  'h-2 rounded-full transition-all',
                  index === stepIndex ? 'w-8 bg-brand' : isDarkMode ? 'w-2 bg-white/18' : 'w-2 bg-slate-200'
                )}
              />
            ))}
          </div>

          <div className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] gap-2">
            <button
              type="button"
              onClick={onBack}
              disabled={stepIndex === 0}
              className={cn(
                'inline-flex h-12 items-center justify-center rounded-[1rem] px-4 text-[11px] font-black uppercase tracking-[0.16em] transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                isDarkMode ? 'bg-white/10 text-white hover:bg-white/14' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              )}
            >
              Atras
            </button>
            <button
              type="button"
              onClick={isLastStep ? onFinish : onNext}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[1rem] bg-brand px-4 text-[11px] font-black uppercase tracking-[0.16em] text-white shadow-[0_18px_34px_rgba(255,99,33,0.28)] transition-colors hover:bg-[#f45518]"
            >
              {isLastStep ? 'Terminar guia' : 'Siguiente apartado'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function App() {
  const runtimePreview = readRuntimePreviewSettings();
  const isEmbeddedPreview = runtimePreview.isEmbedded;
  const initialBootstrapSnapshotRef = useRef<DashboardBootstrapSnapshot | null>(null);
  if (initialBootstrapSnapshotRef.current === null && !import.meta.env.DEV && !isEmbeddedPreview) {
    initialBootstrapSnapshotRef.current = readDashboardBootstrapSnapshot();
  }
  const initialBootstrapSnapshot = initialBootstrapSnapshotRef.current;
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [fallas, setFallas] = useState<Falla[]>(() => (
    import.meta.env.DEV || isEmbeddedPreview ? FALLAS_MOCK : initialBootstrapSnapshot?.fallas ?? []
  ));
  const [agendaEvents, setAgendaEvents] = useState<AgendaEvent[]>(() => (
    import.meta.env.DEV || isEmbeddedPreview ? EVENTS_MOCK : initialBootstrapSnapshot?.agendaEvents ?? []
  ));
  const [dailySignal, setDailySignal] = useState<DashboardDailySignal | null>(() => (
    import.meta.env.DEV || isEmbeddedPreview ? null : initialBootstrapSnapshot?.dailySignal ?? null
  ));
  const panelNotifications: Array<{ id: string; title: string; message: string; commissionName: string; createdAt: string }> = [];
  const pinnedPanelNotifications: Array<{ id: string; title: string; message: string; commissionName: string; createdAt: string }> = [];
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'Todas' | 'Principal' | 'Infantil' | 'Experimental'>('Todas');
  const [selectedFallasSection, setSelectedFallasSection] = useState('Todas las secciones');
  const [selectedFallasNeighborhood, setSelectedFallasNeighborhood] = useState('Todos los barrios');
  const [selectedFallasArtist, setSelectedFallasArtist] = useState('Todos los artistas');
  const [fallasSortMode, setFallasSortMode] = useState('Destacados');
  const [fallasViewMode, setFallasViewMode] = useState<'grid' | 'list'>('grid');
  const [isFallasHelpOpen, setIsFallasHelpOpen] = useState(false);
  const [activeMonumentRail, setActiveMonumentRail] = useState<'Todas' | 'Especial' | 'Primera' | 'Infantil'>('Todas');
  const [selectedFalla, setSelectedFalla] = useState<Falla | null>(null);
  const [favorites, setFavorites] = useState<string[]>(() => (
    import.meta.env.DEV || isEmbeddedPreview ? [] : initialBootstrapSnapshot?.favorites ?? []
  ));
  const [activeTab, setActiveTab] = useState(() => resolveInitialActiveTab());
  const [isAppOnboardingOpen, setIsAppOnboardingOpen] = useState(() => shouldShowAppOnboarding(isEmbeddedPreview));
  const [appOnboardingStepIndex, setAppOnboardingStepIndex] = useState(0);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => toIsoDate(new Date()));
  const [isDarkMode, setIsDarkMode] = useState(() => resolveInitialDarkMode());
  const [showDetail, setShowDetail] = useState<Falla | null>(null);
  const [isGamificationCatalogOpen, setIsGamificationCatalogOpen] = useState(false);
  const [navigationFalla, setNavigationFalla] = useState<Falla | null>(null);
  const [activeRouteFallaId, setActiveRouteFallaId] = useState<string | null>(null);
  const [falleritoRouteFallaIds, setFalleritoRouteFallaIds] = useState<string[] | null>(null);
  const [falleritoRouteWaypoints, setFalleritoRouteWaypoints] = useState<Array<{ id?: string; lat: number; lng: number; nombre?: string }> | null>(null);
  const [falleritoRouteFocusToken, setFalleritoRouteFocusToken] = useState(0);
  const [isInlineGuidanceActive, setIsInlineGuidanceActive] = useState(false);
  const [isModalGuidanceActive, setIsModalGuidanceActive] = useState(false);
  const [mapStyleId, setMapStyleId] = useState<MapStyleId>('city');
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [isHeatmapEnabled, setIsHeatmapEnabled] = useState(false);
  const [isFallasLiveModuleEnabled, setIsFallasLiveModuleEnabled] = useState(() => resolveInitialFallasLiveModuleEnabled());
  const [viewer, setViewer] = useState<AppViewer>(import.meta.env.DEV ? APP_VIEWER : APP_GUEST_VIEWER);
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);
  const [devicePreviewMode, setDevicePreviewMode] = useState<DevicePreviewMode>(() => resolveInitialDevicePreviewMode());
  const [isDevicePreviewOpen, setIsDevicePreviewOpen] = useState(false);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [profileSaveNotice, setProfileSaveNotice] = useState<string | null>(null);
  const [profileSaveNoticeTone, setProfileSaveNoticeTone] = useState<'success' | 'error'>('success');
  const [telegramStatus, setTelegramStatus] = useState<TelegramLinkStatus>(DEFAULT_TELEGRAM_STATUS);
  const [isTelegramStatusLoading, setIsTelegramStatusLoading] = useState(false);
  const [isTelegramLinking, setIsTelegramLinking] = useState(false);
  const [isTelegramSendingTest, setIsTelegramSendingTest] = useState(false);
  const [telegramNotice, setTelegramNotice] = useState<string | null>(null);
  const [shouldPollTelegramStatus, setShouldPollTelegramStatus] = useState(false);
  const [cendraSyncStatus, setCendraSyncStatus] = useState<CendraSyncStatus>(DEFAULT_CENDRA_SYNC_STATUS);
  const [isCendraSyncLoading, setIsCendraSyncLoading] = useState(false);
  const [isCendraSyncRunning, setIsCendraSyncRunning] = useState(false);
  const [cendraSyncNotice, setCendraSyncNotice] = useState<string | null>(null);
  const [isCendraDraftGenerating, setIsCendraDraftGenerating] = useState(false);
  const [isCendraTelegramSending, setIsCendraTelegramSending] = useState(false);
  const [isCendraStoryPreparing, setIsCendraStoryPreparing] = useState(false);
  const [cendraStoryNotice, setCendraStoryNotice] = useState<string | null>(null);
  const [cendraSearchQuery, setCendraSearchQuery] = useState('');
  const [cendraArticles, setCendraArticles] = useState<CendraRecentArticle[]>([]);
  const [isCendraSearchLoading, setIsCendraSearchLoading] = useState(false);
  const [cendraArticleActionId, setCendraArticleActionId] = useState<number | null>(null);
  const [cendraArticleActionKind, setCendraArticleActionKind] = useState<'send-bot' | 'publish-channel' | 'landing' | null>(null);
  const [adminTelegramForm, setAdminTelegramForm] = useState<TelegramAdminAlertPayload>(DEFAULT_ADMIN_TELEGRAM_FORM);
  const [isAdminTelegramSending, setIsAdminTelegramSending] = useState(false);
  const [isMonitorSummarySending, setIsMonitorSummarySending] = useState(false);
  const [adminTelegramNotice, setAdminTelegramNotice] = useState<string | null>(null);
  const [activeAdminTemplateKey, setActiveAdminTemplateKey] = useState<string | null>(null);
  const [activeAdminProfileTab, setActiveAdminProfileTab] = useState<'telegram' | 'cendra' | 'historias'>('telegram');
  const [isAdminToolsExpanded, setIsAdminToolsExpanded] = useState(false);
  const [isNetworkAvailable, setIsNetworkAvailable] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [isBootstrapRefreshing, setIsBootstrapRefreshing] = useState(() => !import.meta.env.DEV && !isEmbeddedPreview);
  const [hasBootstrapCache, setHasBootstrapCache] = useState(Boolean(initialBootstrapSnapshot?.hasAnyData));
  const [isDemoCouponActive, setIsDemoCouponActive] = useState(false);
  const [isDemoBusinessVisibleOnMap, setIsDemoBusinessVisibleOnMap] = useState(false);
  const [demoBusinessStats, setDemoBusinessStats] = useState<DemoBusinessStats>({
    profileViews: 318,
    routeClicks: 74,
    couponActivations: 41,
    couponUses: 19,
  });
  const isHeaderCollapsedRef = useRef(false);
  const previousTodayIsoRef = useRef(toIsoDate(new Date()));
  const { userPosition, locationStatus, requestLocation, startLocationWatch, stopLocationWatch, watchPositionId } = useUserLocation();
  const gamification = useGamification(viewer.accessType === 'user', viewer.id);
  const pinPanelNotification = (_item?: unknown) => undefined;
  const reopenPinnedPanelNotification = (_item?: unknown) => undefined;
  const todayIso = toIsoDate(currentDate);
  const canUseDevicePreview = !isEmbeddedPreview
    && (viewer.email ?? '').trim().toLowerCase() === DEVICE_PREVIEW_ALLOWED_EMAIL;
  const currentAppOnboardingStep = APP_ONBOARDING_STEPS[Math.min(appOnboardingStepIndex, APP_ONBOARDING_STEPS.length - 1)];

  const completeAppOnboarding = () => {
    persistAppOnboardingCompleted();
    setIsAppOnboardingOpen(false);
    setAppOnboardingStepIndex(0);
  };


  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentDate(new Date());
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const previousTodayIso = previousTodayIsoRef.current;

    if (todayIso !== previousTodayIso) {
      setSelectedDate((current) => (current === previousTodayIso ? todayIso : current));
      previousTodayIsoRef.current = todayIso;
    }
  }, [todayIso]);

  useEffect(() => {
    if (!isAppOnboardingOpen) {
      return;
    }

    const step = APP_ONBOARDING_STEPS[Math.min(appOnboardingStepIndex, APP_ONBOARDING_STEPS.length - 1)];
    setShowDetail(null);
    setNavigationFalla(null);
    setActiveRouteFallaId(null);
    setIsDevicePreviewOpen(false);
    setIsProfileSettingsOpen(false);
    setIsGamificationCatalogOpen(false);
    setIsFallasHelpOpen(false);

    if (activeTab !== step.tab) {
      setActiveTab(step.tab);
    }
  }, [activeTab, appOnboardingStepIndex, isAppOnboardingOpen]);

  useEffect(() => {
    if (activeTab === 'Plano') {
      setActiveTab('Mapa');
    }
  }, [activeTab]);

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    const storedPreferences = readStoredViewerPreferences();
    if (storedPreferences) {
      setViewer((current) => applyStoredViewerPreferences(current, storedPreferences));
    }
  }, []);

  useEffect(() => {
    applyDashboardTheme(isDarkMode, { persist: !isEmbeddedPreview });
  }, [isDarkMode, isEmbeddedPreview]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const syncNetworkStatus = () => {
      setIsNetworkAvailable(navigator.onLine);
    };

    syncNetworkStatus();
    window.addEventListener('online', syncNetworkStatus);
    window.addEventListener('offline', syncNetworkStatus);

    return () => {
      window.removeEventListener('online', syncNetworkStatus);
      window.removeEventListener('offline', syncNetworkStatus);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(FALLAS_LIVE_MODULE_KEY, isFallasLiveModuleEnabled ? 'on' : 'off');
    } catch {
      // Fallas Live sigue activo en memoria aunque no se pueda persistir.
    }
  }, [isFallasLiveModuleEnabled]);

  useEffect(() => {
    if (activeTab !== 'Perfil' || typeof window === 'undefined') {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [activeTab]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (activeTab !== 'Mapa') {
      isHeaderCollapsedRef.current = false;
      setIsHeaderCollapsed(false);
      return;
    }

    let frameId = 0;

    const handleScroll = () => {
      if (frameId) {
        return;
      }

      frameId = window.requestAnimationFrame(() => {
        const nextScrollY = window.scrollY;
        const current = isHeaderCollapsedRef.current;
        const nextCollapsed = current
          ? nextScrollY > MAP_HEADER_EXPAND_SCROLL_Y
          : nextScrollY > MAP_HEADER_COLLAPSE_SCROLL_Y;

        if (nextCollapsed !== current) {
          isHeaderCollapsedRef.current = nextCollapsed;
          setIsHeaderCollapsed(nextCollapsed);
        }

        frameId = 0;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, [activeTab]);

  useEffect(() => {
    if (import.meta.env.DEV) {
      return;
    }

    const controller = new AbortController();

    fetch(resolveProfileEndpoint(), {
      credentials: 'same-origin',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.status === 401) {
          window.location.replace(resolveLoginUrl());
          return null;
        }

        if (!response.ok) {
          throw new Error('profile_unavailable');
        }

        return response.json() as Promise<ProfileApiResponse>;
      })
      .then((payload) => {
        if (payload?.ok && payload.profile) {
          setViewer(applyStoredViewerPreferences(mapProfileToViewer(payload.profile), readStoredViewerPreferences()));
        }
      })
      .catch(() => {
        // Mantiene el viewer local cuando el endpoint no esta disponible.
      });

    return () => {
      controller.abort();
    };
  }, [isEmbeddedPreview]);

  useEffect(() => {
    if (import.meta.env.DEV) {
      return;
    }

    if (!isNetworkAvailable) {
      setIsBootstrapRefreshing(false);
      return;
    }

    let isCancelled = false;
    setIsBootstrapRefreshing(true);

    const reconcileFalla = (items: Falla[], current: Falla | null): Falla | null => {
      if (!current) {
        return null;
      }

      return items.find((item) => item.id === current.id) ?? null;
    };

    Promise.allSettled([fetchDashboardFallas(), fetchDashboardFavoriteIds(), fetchDashboardEvents()])
      .then(([fallasResult, favoritesResult, eventsResult]) => {
        if (isCancelled) {
          return;
        }

        const cachePatch: {
          agendaEvents?: AgendaEvent[];
          fallas?: Falla[];
          favorites?: string[];
        } = {};

        if (fallasResult.status === 'fulfilled') {
          const nextFallas = fallasResult.value;
          cachePatch.fallas = nextFallas;
          React.startTransition(() => {
            setFallas(nextFallas);
            setSelectedFalla((current) => reconcileFalla(nextFallas, current));
            setShowDetail((current) => reconcileFalla(nextFallas, current));
            setNavigationFalla((current) => reconcileFalla(nextFallas, current));
            setActiveRouteFallaId((current) => (
              current && nextFallas.some((item) => item.id === current) ? current : null
            ));
          });
        } else if (fallasResult.reason instanceof Error && fallasResult.reason.message === 'SESSION_INVALID') {
          if (isEmbeddedPreview) {
            return;
          }
          window.location.replace(resolveLoginUrl());
          return;
        }

        if (favoritesResult.status === 'fulfilled') {
          setFavorites(favoritesResult.value);
          cachePatch.favorites = favoritesResult.value;
        } else if (favoritesResult.reason instanceof Error && favoritesResult.reason.message === 'SESSION_INVALID') {
          if (isEmbeddedPreview) {
            return;
          }
          window.location.replace(resolveLoginUrl());
          return;
        }

        if (eventsResult.status === 'fulfilled') {
          const nextAgendaEvents = eventsResult.value.map(mapDashboardEventToAgendaEvent);
          cachePatch.agendaEvents = nextAgendaEvents;
          React.startTransition(() => {
            setAgendaEvents(nextAgendaEvents);
          });
        } else if (eventsResult.reason instanceof Error && eventsResult.reason.message === 'SESSION_INVALID') {
          if (isEmbeddedPreview) {
            return;
          }
          window.location.replace(resolveLoginUrl());
          return;
        }

        if (cachePatch.fallas || cachePatch.agendaEvents || cachePatch.favorites) {
          writeDashboardBootstrapCache(cachePatch);
          setHasBootstrapCache(true);
        }
      })
      .catch((error) => {
        if (isCancelled) {
          return;
        }

        if (!isEmbeddedPreview && error instanceof Error && error.message === 'SESSION_INVALID') {
          window.location.replace(resolveLoginUrl());
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsBootstrapRefreshing(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [isEmbeddedPreview, isNetworkAvailable]);

  useEffect(() => {
    if (isEmbeddedPreview) {
      setDailySignal(null);
      return;
    }

    if (!isNetworkAvailable) {
      return;
    }

    let isCancelled = false;
    const controller = new AbortController();

    fetch(resolveNewsEndpoint(), { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP_${response.status}`);
        }

        const payload = await response.json() as {
          items?: Array<{
            id?: number | string;
            title?: string;
            excerpt?: string;
            category?: string;
            publishedAt?: string | null;
            featured?: boolean;
          }>;
        };

        if (isCancelled) {
          return;
        }

        const items = Array.isArray(payload.items)
          ? payload.items
            .map((item) => ({
              id: Number(item.id ?? 0),
              title: typeof item.title === 'string' ? item.title.trim() : '',
              excerpt: typeof item.excerpt === 'string' ? item.excerpt.trim() : '',
              category: typeof item.category === 'string' ? item.category.trim() : 'Actualidad fallera',
              publishedAt: typeof item.publishedAt === 'string' ? item.publishedAt : null,
              featured: Boolean(item.featured),
            }))
            .filter((item) => item.id > 0 && item.title !== '' && item.excerpt !== '')
          : [];

        const selectedItem = items.find((item) => item.featured) ?? items[0] ?? null;

        setDailySignal(
          selectedItem
            ? {
              id: selectedItem.id,
              title: selectedItem.title,
              excerpt: selectedItem.excerpt,
              category: selectedItem.category,
              publishedAt: selectedItem.publishedAt,
            }
            : null
        );
        writeDashboardBootstrapCache({
          dailySignal: selectedItem
            ? {
              id: selectedItem.id,
              title: selectedItem.title,
              excerpt: selectedItem.excerpt,
              category: selectedItem.category,
              publishedAt: selectedItem.publishedAt,
            }
            : null,
        });
        setHasBootstrapCache(true);
      })
      .catch(() => {
        if (!isCancelled && !initialBootstrapSnapshotRef.current?.dailySignal) {
          setDailySignal(null);
        }
      });

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [isEmbeddedPreview, isNetworkAvailable]);

  useEffect(() => {
    if (isEmbeddedPreview || fallas.length === 0) {
      return;
    }

    const prioritizedFallas = [...fallas]
      .filter((item) => item.imageUrl)
      .sort((left, right) => {
        if (!userPosition) {
          return (left.prize ?? 999) - (right.prize ?? 999);
        }

        if (!hasValidCoordinates(left) || !hasValidCoordinates(right)) {
          return Number(hasValidCoordinates(right)) - Number(hasValidCoordinates(left));
        }

        return distanceBetweenPoints(userPosition, [left.lat, left.lng]) - distanceBetweenPoints(userPosition, [right.lat, right.lng]);
      })
      .slice(0, 8)
      .map((item) => item.imageUrl)
      .filter((item): item is string => Boolean(item));

    return scheduleDashboardIdleTask(() => {
      warmDashboardImageUrls(prioritizedFallas);
    }, 1000);
  }, [fallas, isEmbeddedPreview, userPosition]);

  useEffect(() => {
    if (!viewer.isRegistered || !viewer.id) {
      setTelegramStatus(DEFAULT_TELEGRAM_STATUS);
      setIsTelegramStatusLoading(false);
      return;
    }

    let isCancelled = false;
    setIsTelegramStatusLoading(true);

    fetchTelegramStatus(viewer.id)
      .then((nextStatus) => {
        if (isCancelled) {
          return;
        }

        setTelegramStatus(nextStatus);

        if (nextStatus.linked) {
          setShouldPollTelegramStatus(false);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setTelegramStatus(DEFAULT_TELEGRAM_STATUS);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsTelegramStatusLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [viewer.id, viewer.isRegistered]);

  useEffect(() => {
    const preferredDate = resolvePreferredAgendaDate(agendaEvents, selectedDate);

    if (preferredDate !== selectedDate) {
      setSelectedDate(preferredDate);
    }
  }, [agendaEvents, selectedDate]);

  useEffect(() => {
    if (!shouldPollTelegramStatus || !viewer.isRegistered || !viewer.id || telegramStatus.linked) {
      return;
    }

    let isCancelled = false;

    const pollStatus = async () => {
      try {
        const nextStatus = await fetchTelegramStatus(viewer.id);

        if (isCancelled) {
          return;
        }

        setTelegramStatus(nextStatus);

        if (nextStatus.linked) {
          setShouldPollTelegramStatus(false);
          setTelegramNotice('Telegram conectado. Ya puedes recibir avisos.');
        }
      } catch {
        // Mantiene el ultimo estado visible mientras llega la vinculacion.
      }
    };

    const intervalId = window.setInterval(() => {
      void pollStatus();
    }, 4000);

    void pollStatus();

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [shouldPollTelegramStatus, telegramStatus.linked, viewer.id, viewer.isRegistered]);

  useEffect(() => {
    const adminAccess = viewer.role === 'admin' || viewer.role === 'support';

    if (!adminAccess) {
      setCendraSyncStatus(DEFAULT_CENDRA_SYNC_STATUS);
      setCendraArticles([]);
      setIsCendraSyncLoading(false);
      return;
    }

    let isCancelled = false;
    setIsCendraSyncLoading(true);

    fetchCendraSyncStatus()
      .then((nextStatus) => {
        if (isCancelled) {
          return;
        }

        setCendraSyncStatus(nextStatus);
      })
      .catch((error) => {
        if (isCancelled) {
          return;
        }

        if (error instanceof Error && error.message === 'Sesion no valida.') {
          window.location.replace(resolveLoginUrl());
          return;
        }

        setCendraSyncNotice(error instanceof Error ? error.message : 'No se pudo cargar el estado de Cendra.');
      })
      .finally(() => {
        if (!isCancelled) {
          setIsCendraSyncLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [viewer.role]);

  useEffect(() => {
    const adminAccess = viewer.role === 'admin' || viewer.role === 'support';

    if (!adminAccess) {
      setCendraArticles([]);
      setIsCendraSearchLoading(false);
      return;
    }

    let isCancelled = false;
    setIsCendraSearchLoading(true);

    searchCendraArticles('', 8)
      .then((items) => {
        if (!isCancelled) {
          setCendraArticles(items);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setCendraArticles([]);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsCendraSearchLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [viewer.role]);

  const fallasSections = useMemo(
    () => ['Todas las secciones', ...Array.from(new Set<string>(fallas.map((falla) => falla.section).filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b))],
    [fallas]
  );
  const fallasNeighborhoods = useMemo(
    () => ['Todos los barrios', ...Array.from(new Set<string>(fallas.map((falla) => falla.neighborhood).filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b))],
    [fallas]
  );
  const fallasArtists = useMemo(
    () => ['Todos los artistas', ...Array.from(new Set<string>(fallas.map((falla) => falla.artist).filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b))],
    [fallas]
  );
  const fallasWithPrizeCount = useMemo(
    () => fallas.filter((falla) => typeof falla.prize === 'number').length,
    [fallas]
  );

  const filteredFallas = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const items = fallas.filter((falla) => {
      const matchesSearch =
        !normalizedSearch
        || falla.name.toLowerCase().includes(normalizedSearch)
        || (falla.jcfNum ?? '').toLowerCase().includes(normalizedSearch)
        || falla.neighborhood.toLowerCase().includes(normalizedSearch)
        || falla.section.toLowerCase().includes(normalizedSearch)
        || falla.artist.toLowerCase().includes(normalizedSearch);
      const matchesCategory = selectedCategory === 'Todas'
        || falla.category === selectedCategory
        || (selectedCategory === 'Infantil' && falla.section.toLowerCase().includes('infantil'));
      const matchesSection = selectedFallasSection === 'Todas las secciones' || falla.section === selectedFallasSection;
      const matchesNeighborhood = selectedFallasNeighborhood === 'Todos los barrios' || falla.neighborhood === selectedFallasNeighborhood;
      const matchesArtist = selectedFallasArtist === 'Todos los artistas' || falla.artist === selectedFallasArtist;

      return matchesSearch && matchesCategory && matchesSection && matchesNeighborhood && matchesArtist;
    });

    return [...items].sort((a, b) => {
      if (fallasSortMode === 'Premios') {
        return (a.prize ?? 999) - (b.prize ?? 999) || b.likes - a.likes;
      }
      if (fallasSortMode === 'Mas vistas') {
        return b.visitors - a.visitors;
      }
      if (fallasSortMode === 'Nombre') {
        return a.name.localeCompare(b.name);
      }
      return (a.prize ?? 999) - (b.prize ?? 999) || b.likes - a.likes || b.visitors - a.visitors;
    });
  }, [fallas, fallasSortMode, searchQuery, selectedCategory, selectedFallasArtist, selectedFallasNeighborhood, selectedFallasSection]);

  const mappedFallas = useMemo(
    // El mapa debe mostrar todo el catálogo geolocalizado; los filtros del listado no deben ocultar infantiles.
    () => {
      const geolocatedFallas = fallas.filter((falla) => hasValidCoordinates(falla));
      return isDemoBusinessVisibleOnMap ? [...geolocatedFallas, DEMO_BUSINESS_FALLA] : geolocatedFallas;
    },
    [fallas, isDemoBusinessVisibleOnMap]
  );
  const monumentRails = useMemo(() => ([
    {
      id: 'Todas' as const,
      label: 'Todas',
      accentClass: 'bg-[#ff6b2c] text-white',
      description: 'Vista editorial completa del catalogo.',
      items: fallas,
    },
    {
      id: 'Especial' as const,
      label: 'Especial',
      accentClass: 'bg-[#ff8a3d] text-white',
      description: 'Recorrido premium de comisiones grandes.',
      items: fallas.filter((falla) => falla.section.toLowerCase().includes('especial')),
    },
    {
      id: 'Primera' as const,
      label: 'Primera',
      accentClass: 'bg-sky-500 text-white',
      description: 'Bloque rapido para primera categoria.',
      items: fallas.filter((falla) => falla.section.toLowerCase().includes('primera')),
    },
    {
      id: 'Infantil' as const,
      label: 'Infantil',
      accentClass: 'bg-emerald-500 text-white',
      description: 'Piezas infantiles integradas sin salir del mapa.',
      items: fallas.filter((falla) => falla.category === 'Infantil' || falla.section.toLowerCase().includes('infantil')),
    },
  ]), [fallas]);
  const activeMonumentRailData = useMemo(
    () => monumentRails.find((rail) => rail.id === activeMonumentRail) ?? monumentRails[0],
    [activeMonumentRail, monumentRails]
  );
  useEffect(() => {
    if (selectedFalla && !mappedFallas.some((item) => item.id === selectedFalla.id)) {
      setSelectedFalla(null);
    }

    if (activeRouteFallaId && !mappedFallas.some((item) => item.id === activeRouteFallaId)) {
      setActiveRouteFallaId(null);
    }
  }, [activeRouteFallaId, mappedFallas, selectedFalla]);

  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    const fallaId = Number(id);
    if (!Number.isFinite(fallaId) || fallaId <= 0) {
      return;
    }

    const optimisticFavorites = favorites.includes(id)
      ? favorites.filter((favoriteId) => favoriteId !== id)
      : [...favorites, id];

    setFavorites(optimisticFavorites);
    writeDashboardBootstrapCache({ favorites: optimisticFavorites });
    setHasBootstrapCache(true);

    void (async () => {
      try {
        const payload = await toggleDashboardFavorite('falla', fallaId);
        const nextFavorites = Array.isArray(payload.favorites?.fallas)
          ? payload.favorites.fallas.map((item) => String(item)).filter(Boolean)
          : [];

        setFavorites(nextFavorites);
        writeDashboardBootstrapCache({ favorites: nextFavorites });
        gamification.applyFavoritePayload(payload);
      } catch (error) {
        if (error instanceof Error && error.message === 'SESSION_INVALID') {
          window.location.replace(resolveLoginUrl());
          return;
        }

        gamification.queueNotification({
          type: 'favorite_error',
          title: 'Guardado local',
          message: 'La seleccion se mantiene en pantalla, pero no se ha sincronizado con el servidor.',
          payload: {},
        });
      }
    })();
  };

  const cridaEvent = useMemo(() => findAgendaSeasonStartEvent(agendaEvents), [agendaEvents]);
  const agendaHasTodayEvents = useMemo(
    () => agendaEvents.some((event) => event.date === todayIso),
    [agendaEvents, todayIso]
  );
  const shouldShowAgendaCountdown = Boolean(cridaEvent && selectedDate === cridaEvent.date && !agendaHasTodayEvents);

  const filteredEvents = useMemo(
    () => agendaEvents.filter((event) => event.date === selectedDate),
    [agendaEvents, selectedDate]
  );

  const selectedDateLabel = useMemo(
    () => formatLongDate(fromIsoDate(selectedDate)),
    [selectedDate]
  );

  const activeRouteFalla = useMemo(
    () => mappedFallas.find((falla) => falla.id === activeRouteFallaId) ?? null,
    [activeRouteFallaId, mappedFallas]
  );
  const normalizedMapSearchQuery = useMemo(
    () => normalizeFallaSearchQuery(mapSearchQuery),
    [mapSearchQuery]
  );
  const mapSortUserPosition = useMemo(
    () => (userPosition
      ? [Number(userPosition[0].toFixed(4)), Number(userPosition[1].toFixed(4))] as [number, number]
      : null),
    [userPosition]
  );
  const mapScopedFallas = useMemo(() => {
    switch (activeMonumentRail) {
      case 'Especial':
        return mappedFallas.filter((falla) => falla.section.toLowerCase().includes('especial'));
      case 'Primera':
        return mappedFallas.filter((falla) => falla.section.toLowerCase().includes('primera'));
      case 'Infantil':
        return mappedFallas.filter((falla) => falla.category === 'Infantil' || falla.section.toLowerCase().includes('infantil'));
      default:
        return mappedFallas;
    }
  }, [activeMonumentRail, mappedFallas]);
  const mapVisibleFallas = useMemo(() => {
    if (!normalizedMapSearchQuery) {
      return mapScopedFallas;
    }

    const scopedIds = new Set(mapScopedFallas.map((falla) => falla.id));

    return [...mappedFallas]
      .map((falla) => ({
        falla,
        score: getFallaSearchScore(falla, normalizedMapSearchQuery),
        isScoped: scopedIds.has(falla.id),
      }))
      .filter((item) => item.score > 0)
      .sort((left, right) => {
        if (left.score !== right.score) {
          return right.score - left.score;
        }

        if (left.isScoped !== right.isScoped) {
          return left.isScoped ? -1 : 1;
        }

        if (mapSortUserPosition) {
          const leftDistance = distanceBetweenPoints(mapSortUserPosition, [left.falla.lat, left.falla.lng]);
          const rightDistance = distanceBetweenPoints(mapSortUserPosition, [right.falla.lat, right.falla.lng]);

          if (Math.abs(leftDistance - rightDistance) > 25) {
            return leftDistance - rightDistance;
          }
        }

        const leftPrize = typeof left.falla.prize === 'number' ? left.falla.prize : 99;
        const rightPrize = typeof right.falla.prize === 'number' ? right.falla.prize : 99;

        if (leftPrize !== rightPrize) {
          return leftPrize - rightPrize;
        }

        return right.falla.visitors - left.falla.visitors;
      })
      .map((item) => item.falla);
  }, [mappedFallas, mapScopedFallas, mapSortUserPosition, normalizedMapSearchQuery]);
  const mapSidebarFallas = useMemo(() => {
    if (normalizedMapSearchQuery) {
      return mapVisibleFallas.slice(0, 5);
    }

    const selectedId = selectedFalla?.id ?? null;
    const routeId = activeRouteFallaId;
    const nextItems = [...mapVisibleFallas];

    nextItems.sort((left, right) => {
      const leftPinned = left.id === selectedId || left.id === routeId;
      const rightPinned = right.id === selectedId || right.id === routeId;

      if (leftPinned !== rightPinned) {
        return leftPinned ? -1 : 1;
      }

      if (mapSortUserPosition) {
        const leftDistance = distanceBetweenPoints(mapSortUserPosition, [left.lat, left.lng]);
        const rightDistance = distanceBetweenPoints(mapSortUserPosition, [right.lat, right.lng]);

        if (Math.abs(leftDistance - rightDistance) > 25) {
          return leftDistance - rightDistance;
        }
      }

      const leftPrize = typeof left.prize === 'number' ? left.prize : 99;
      const rightPrize = typeof right.prize === 'number' ? right.prize : 99;

      if (leftPrize !== rightPrize) {
        return leftPrize - rightPrize;
      }

      return right.visitors - left.visitors;
    });

    return nextItems.slice(0, 5);
  }, [activeRouteFallaId, mapSortUserPosition, mapVisibleFallas, normalizedMapSearchQuery, selectedFalla?.id]);

  const selectedDateEvents = useMemo(
    () => [...filteredEvents].sort((left, right) => left.time.localeCompare(right.time)),
    [filteredEvents]
  );

  const mostLikedPosts = useMemo(
    () => [...SOCIAL_POSTS].sort((left, right) => right.likes - left.likes).slice(0, 3),
    []
  );
  const editorialFallas = useMemo(
    () => fallas.slice(0, 4),
    [fallas]
  );
  const editorialPrizeCount = useMemo(
    () => editorialFallas.filter((falla) => typeof falla.prize === 'number').length,
    [editorialFallas]
  );
  const socialLeadPost = mostLikedPosts[0] ?? null;

  const principalFallasCount = useMemo(
    () => fallas.filter((falla) => falla.category === 'Principal').length,
    [fallas]
  );

  const uniqueNeighborhoodsCount = useMemo(
    () => new Set(fallas.map((falla) => falla.neighborhood)).size,
    [fallas]
  );
  const uniqueSectionsCount = useMemo(
    () => new Set(fallas.map((falla) => falla.section)).size,
    [fallas]
  );
  const uniqueArtistsCount = useMemo(
    () => new Set(fallas.map((falla) => falla.artist).filter(Boolean)).size,
    [fallas]
  );

  const liveEventsCount = useMemo(
    () => agendaEvents.filter((event) => event.isLive).length,
    [agendaEvents]
  );

  const nextSelectedDateEvent = selectedDateEvents[0] ?? null;
  const isMapImmersive = activeTab === 'Mapa' || activeTab === 'Plano';
  // All tabs except immersive map share the same default chrome (full-width bars)
  const usesMapChrome = activeTab === 'Mapa' || activeTab === 'Plano';
  const agendaUsesFloatingChrome = activeTab === 'Agenda' || activeTab === 'Fallerito' || activeTab === 'Fallas' || activeTab === 'Perfil';
  const isFalleritoTab = activeTab === 'Fallerito';
  const isMarketplaceTab = activeTab === 'Marketplace';
  const hasInstantContent = fallas.length > 0 || agendaEvents.length > 0 || favorites.length > 0 || dailySignal !== null;
  const dashboardStatusMessage = !isNetworkAvailable
    ? 'Estas sin conexion. Te mostramos la ultima informacion guardada.'
    : isBootstrapRefreshing && hasInstantContent
      ? 'Actualizando informacion en segundo plano sin bloquear la navegacion.'
      : isBootstrapRefreshing && hasBootstrapCache
        ? 'Preparando el contenido cacheado para que la app responda al instante.'
        : null;
  const dashboardStatusEyebrow = !isNetworkAvailable ? 'Modo offline' : 'Carga inteligente';
  const showDashboardStatusBanner = Boolean(dashboardStatusMessage) && !isFalleritoTab && !isMarketplaceTab;
  const hasDockedNavigation = false;
  const shouldHideBottomNav = isInlineGuidanceActive || isModalGuidanceActive;
  const isAdminViewer = viewer.role === 'admin' || viewer.role === 'support';
  const viewerInitials = buildViewerInitials(viewer.name);
  const viewerAccountLabel = viewer.accessType === 'guest' ? 'Modo invitado' : 'Cuenta registrada';
  const viewerGpsLabel = (
    locationStatus === 'ready'
      ? 'GPS listo'
      : locationStatus === 'loading'
        ? 'Buscando GPS'
        : locationStatus === 'blocked'
          ? 'GPS bloqueado'
          : 'GPS inactivo'
  );
  const telegramLinkedMoment = telegramStatus.linkedAt ? formatDashboardDateTime(telegramStatus.linkedAt) : 'Sin enlace todavia';
  const telegramStatusLabel = telegramStatus.linked
    ? (telegramStatus.telegramUsername ? `@${telegramStatus.telegramUsername}` : 'Avisos activos')
    : (viewer.isRegistered ? 'Pendiente de conectar' : 'Solo para registrados');
  const profileBundle = gamification.bundle?.profile ?? null;
  const favoriteCount = favorites.length;
  const visitedFallasCount = profileBundle?.totals.distinctFallasVisited ?? 0;
  const badgesUnlockedCount = profileBundle?.totals.badgesUnlocked ?? 0;
  const passportProgressPercent = Math.round(
    profileBundle?.level.progressPercent
    ?? profileBundle?.progress.totalProgressPercent
    ?? 0
  );
  const profileLastActivityMoment = profileBundle?.lastActivityAt
    ? formatDashboardDateTime(profileBundle.lastActivityAt)
    : 'Sin actividad sincronizada';
  const profileRecommendation = !viewer.isRegistered
    ? {
        title: 'Conviene pasar a cuenta registrada.',
        copy: 'Asi podras conservar progreso, visitas verificadas e historial entre sesiones.',
        cta: 'Iniciar sesion',
        action: () => {
          if (typeof window !== 'undefined') {
            window.location.assign(resolveLoginUrl());
          }
        },
      }
    : locationStatus !== 'ready'
      ? {
          title: 'Activa la ubicacion para afinar el perfil.',
          copy: 'Las rutas, las visitas verificadas y las recomendaciones funcionan mejor con GPS listo.',
          cta: locationStatus === 'loading' ? 'Buscando GPS' : 'Activar GPS',
          action: () => {
            void requestLocation().catch(() => {
              // El estado ya se actualiza desde el hook de ubicacion.
            });
          },
        }
      : !telegramStatus.linked
        ? {
            title: 'Falta cerrar la capa de avisos.',
            copy: 'Conecta Telegram para recibir recordatorios y cambios importantes fuera de la app.',
            cta: isTelegramLinking ? 'Abriendo Telegram' : 'Conectar Telegram',
            action: () => {
              void handleConnectTelegram();
            },
          }
        : favoriteCount === 0
          ? {
              title: 'Todavia no has marcado favoritas.',
              copy: 'Guarda tus fallas clave para convertir este perfil en un acceso rapido real.',
              cta: 'Ver catalogo',
              action: () => setActiveTab('Fallas'),
            }
          : {
              title: 'El perfil ya esta bien armado.',
              copy: 'Ahora toca usarlo como centro operativo: mapa, favoritas y progreso en una sola vista.',
              cta: 'Abrir mapa',
              action: () => setActiveTab('Mapa'),
            };
  const renderRegisteredFeatureGate = (_props: {
    feature: string;
    icon: DashboardIcon;
    title: string;
    copy: string;
  }) => (
    <div className="flex min-h-[calc(100dvh-10rem)] flex-col items-center justify-center px-6 text-center">
      <p className="max-w-md text-base font-medium text-slate-700">Necesitas registrarte para acceder</p>
      <button
        type="button"
        onClick={() => {
          if (typeof window !== 'undefined') {
            window.location.assign(resolveLoginUrl());
          }
        }}
        className="mt-4 inline-flex items-center justify-center rounded-full bg-brand px-5 py-2 text-xs font-semibold text-white shadow-[0_14px_28px_rgba(255,99,33,0.26)] transition-all hover:scale-[1.01]"
      >
        Iniciar sesión
      </button>
    </div>
  );
  const cendraLatestRunMoment = formatDashboardDateTime(
    cendraSyncStatus.latestRun?.finishedAt ?? cendraSyncStatus.latestRun?.startedAt ?? null
  );
  const cendraLatestArticleMoment = formatDashboardDateTime(cendraSyncStatus.latestArticlePublishedAt);
  const cendraStoryArticles = useMemo(() => {
    const sourceArticles = cendraArticles.length > 0 ? cendraArticles : cendraSyncStatus.recentArticles;
    const seenIds = new Set<number>();

    return sourceArticles.filter((article) => {
      if (!article.id || seenIds.has(article.id)) {
        return false;
      }

      seenIds.add(article.id);
      return true;
    });
  }, [cendraArticles, cendraSyncStatus.recentArticles]);
  const mapFocusFalla = useMemo(
    () => selectedFalla ?? navigationFalla ?? activeRouteFalla ?? mapSidebarFallas[0] ?? mapVisibleFallas[0] ?? mapScopedFallas[0] ?? null,
    [activeRouteFalla, mapScopedFallas, mapSidebarFallas, mapVisibleFallas, navigationFalla, selectedFalla]
  );
  const mapFocusDistanceMeters = useMemo(
    () => (userPosition && mapFocusFalla ? distanceBetweenPoints(userPosition, [mapFocusFalla.lat, mapFocusFalla.lng]) : null),
    [mapFocusFalla, userPosition]
  );
  const mapFocusDistanceLabel = useMemo(
    () => (mapFocusDistanceMeters !== null ? formatDistance(mapFocusDistanceMeters) : 'Centro de Valencia'),
    [mapFocusDistanceMeters]
  );
  const mapFocusEtaLabel = useMemo(
    () => (mapFocusDistanceMeters !== null ? `${Math.max(2, Math.round(mapFocusDistanceMeters / 82))} min a pie` : 'Sin ETA'),
    [mapFocusDistanceMeters]
  );
  const visitedFallaIdSet = useMemo(
    () => new Set((gamification.bundle?.profile.totals.visitedFallaIds ?? []).map((value) => String(value))),
    [gamification.bundle?.profile.totals.visitedFallaIds]
  );
  const gamificationShortcutIcon = useMemo(
    () => buildProjectAssetUrl('img/Trofeo y medalla de campeÃƒÂ³n.png'),
    []
  );

  const openInternalNavigation = (falla: Falla) => {
    setActiveTab('Mapa');
    setShowDetail(null);
    setNavigationFalla(null);
    setFalleritoRouteFallaIds(null);
    setFalleritoRouteWaypoints(null);
    setSelectedFalla(falla);
    setActiveRouteFallaId(falla.id);
  };

  const handleNavigateToFalla = (falla: Falla) => {
    const numericFallaId = Number(falla.id);
    if (viewer.accessType === 'user' && Number.isFinite(numericFallaId) && numericFallaId > 0) {
      void gamification.trackNavigationEvent({
        fallaId: numericFallaId,
        mode: hasValidCoordinates(falla) ? 'internal' : 'external',
      }).catch(() => undefined);
    }

    if (!hasValidCoordinates(falla)) {
      setShowDetail(null);

      if (typeof window !== 'undefined' && falla.routeUrl) {
        window.open(falla.routeUrl, '_blank', 'noopener,noreferrer');
      }

      return;
    }

    openInternalNavigation(falla);
  };

  const handlePrepareRouteOnMap = (falla: Falla) => {
    const numericFallaId = Number(falla.id);
    if (viewer.accessType === 'user' && Number.isFinite(numericFallaId) && numericFallaId > 0) {
      void gamification.trackNavigationEvent({
        fallaId: numericFallaId,
        mode: hasValidCoordinates(falla) ? 'internal' : 'external',
      }).catch(() => undefined);
    }

    if (!hasValidCoordinates(falla)) {
      if (typeof window !== 'undefined' && falla.routeUrl) {
        window.open(falla.routeUrl, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    openInternalNavigation(falla);
  };

  const handleFalleritoOpenFallaRoute = (
    fallaId?: string | null,
    fallaIds?: string[] | null,
    routeStops?: Array<{ id?: string; lat: number; lng: number; nombre?: string }> | null
  ) => {
    const normalizedFallaIds = Array.isArray(fallaIds)
      ? fallaIds.filter((value): value is string => typeof value === 'string' && value.trim() !== '')
      : [];
    const normalizedRouteStops = Array.isArray(routeStops)
      ? routeStops.filter((stop): stop is { id?: string; lat: number; lng: number; nombre?: string } => (
        !!stop
        && typeof stop.lat === 'number'
        && Number.isFinite(stop.lat)
        && typeof stop.lng === 'number'
        && Number.isFinite(stop.lng)
      ))
      : [];
    const routeFallas = normalizedFallaIds
      .map((id) => fallas.find((item) => item.id === id) ?? mappedFallas.find((item) => item.id === id) ?? null)
      .filter((item): item is Falla => item !== null);
    const targetRouteFalla = routeFallas[routeFallas.length - 1]
      ?? (fallaId ? fallas.find((item) => item.id === fallaId) ?? mappedFallas.find((item) => item.id === fallaId) ?? null : null);

    setMapSearchQuery('');
    setActiveMonumentRail('Todas');
    setShowDetail(null);
    setNavigationFalla(null);
    setFalleritoRouteFocusToken((current) => current + 1);

    if (normalizedRouteStops.length > 1 || routeFallas.length > 1) {
      setActiveTab('Mapa');
      setFalleritoRouteFallaIds(routeFallas.length > 1
        ? routeFallas.map((item) => item.id)
        : normalizedRouteStops.map((stop) => stop.id).filter((id): id is string => typeof id === 'string' && id !== '')
      );
      setFalleritoRouteWaypoints(normalizedRouteStops.length > 1 ? normalizedRouteStops : null);
      setSelectedFalla(targetRouteFalla);
      setActiveRouteFallaId(targetRouteFalla?.id ?? routeFallas[routeFallas.length - 1]?.id ?? null);
      return;
    }

    setFalleritoRouteFallaIds(null);
    setFalleritoRouteWaypoints(null);
    if (targetRouteFalla) {
      handlePrepareRouteOnMap(targetRouteFalla);
      return;
    }

    setActiveTab('Mapa');
  };

  const handleShareFalla = (falla: Falla, event?: React.MouseEvent) => {
    event?.stopPropagation();

    if (typeof window === 'undefined') {
      return;
    }

    const shareUrl = new URL(window.location.href);
    shareUrl.searchParams.set('falla', falla.id);

    const shareData = {
      title: `${falla.name} | Falles360`,
      text: `Mira esta falla en Falles360: ${falla.name}`,
      url: shareUrl.toString(),
    };

    void (async () => {
      try {
        if (typeof navigator.share === 'function') {
          await navigator.share(shareData);
        } else if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(shareData.url);
          gamification.queueNotification({
            type: 'share_copied',
            title: 'Enlace copiado',
            message: 'Ya puedes compartir esta falla.',
            payload: { fallaId: falla.id },
          });
        } else {
          window.prompt('Enlace para compartir', shareData.url);
        }
      } catch {
        // El usuario puede cancelar el panel nativo de compartir.
      }
    })();
  };

  const handleSelectFallaOnMap = (falla: Falla) => {
    setShowDetail(null);
    setNavigationFalla(null);
    setFalleritoRouteFallaIds(null);
    setFalleritoRouteWaypoints(null);
    setSelectedFalla(falla);
    setActiveRouteFallaId((current) => (current === falla.id ? current : null));
  };

  const handleRegisterVisit = async (falla: Falla) => {
    if (viewer.accessType !== 'user') {
      gamification.queueNotification({
        type: 'register_required',
        title: 'Cuenta registrada necesaria',
        message: 'La validaciÃƒÂ³n de visitas reales requiere una cuenta persistente.',
        payload: {},
      });
      setActiveTab('Perfil');
      return;
    }

    try {
      const position = userPosition ?? await requestLocation();
      await gamification.registerVisit({
        fallaId: Number(falla.id),
        latitude: position[0],
        longitude: position[1],
        visitSource: 'gps',
      });
    } catch (error) {
      gamification.queueNotification({
        type: 'visit_error',
        title: 'Visita no validada',
        message: error instanceof Error ? error.message : 'No se ha podido verificar tu ubicaciÃƒÂ³n.',
        payload: { fallaId: falla.id },
      });
    }
  };

  const handleTrackContentRead = (falla: Falla) => {
    if (viewer.accessType !== 'user') {
      return;
    }

    void gamification.trackContentRead({
      fallaId: Number(falla.id),
      section: 'history',
    }).catch(() => {
      // Mantiene la lectura local aunque falle el registro remoto.
    });
  };

  const handleFallaContentUpdated = (updatedFalla: Falla) => {
    setFallas((current) => {
      const nextFallas = current.map((falla) => (falla.id === updatedFalla.id ? updatedFalla : falla));
      writeDashboardBootstrapCache({ fallas: nextFallas });
      return nextFallas;
    });
    setHasBootstrapCache(true);
    setSelectedFalla((current) => (current?.id === updatedFalla.id ? updatedFalla : current));
    setShowDetail((current) => (current?.id === updatedFalla.id ? updatedFalla : current));
    setNavigationFalla((current) => (current?.id === updatedFalla.id ? updatedFalla : current));
  };

  const handleSaveViewerSettings = async (settings: Pick<AppViewer, 'name' | 'location' | 'avatar'>) => {
    const normalizedSettings = {
      name: settings.name.trim(),
      location: settings.location.trim(),
      avatar: settings.avatar.trim(),
    };

    setIsProfileSaving(true);
    setProfileSaveNotice(null);

    try {
      if (import.meta.env.DEV) {
        setViewer((current) => {
          const nextViewer = applyViewerSettings(current, normalizedSettings);
          writeStoredViewerPreferencesPatch({
            avatar: nextViewer.avatar,
            location: nextViewer.location,
          });
          return nextViewer;
        });
        setProfileSaveNotice('Perfil actualizado en local.');
        setProfileSaveNoticeTone('success');
        setIsProfileSettingsOpen(false);
        return;
      }

      const headers = await withCsrfHeadersAsync({
        'Content-Type': 'application/json',
      });

      const response = await fetch(resolveProfileEndpoint(), {
        method: 'POST',
        credentials: 'same-origin',
        headers,
        body: JSON.stringify({
          name: normalizedSettings.name,
          location: normalizedSettings.location,
        }),
      });

      if (response.status === 401) {
        window.location.replace(resolveLoginUrl());
        return;
      }

      const payload = await response.json().catch(() => ({} as ProfileApiResponse));

      if (!response.ok || payload.ok === false || !payload.profile) {
        throw new Error(payload.message || 'No se pudo guardar el perfil.');
      }

      setViewer(() => {
        const nextViewer = applyViewerSettings(mapProfileToViewer(payload.profile!), normalizedSettings);
        writeStoredViewerPreferencesPatch({
          avatar: nextViewer.avatar,
          location: nextViewer.location,
        });
        return nextViewer;
      });
      setProfileSaveNotice('Perfil actualizado correctamente.');
      setProfileSaveNoticeTone('success');
      setIsProfileSettingsOpen(false);
    } catch (error) {
      setProfileSaveNotice(error instanceof Error ? error.message : 'No se pudo guardar el perfil.');
      setProfileSaveNoticeTone('error');
    } finally {
      setIsProfileSaving(false);
    }
  };

  const handleDevicePreviewModeChange = (mode: DevicePreviewMode) => {
    setDevicePreviewMode(mode);
    writeStoredViewerPreferencesPatch({ devicePreviewMode: mode });
  };

  const handleLogout = () => {
    if (typeof window === 'undefined') {
      return;
    }

    window.location.assign(resolveLogoutUrl());
  };

  const handleDemoCouponActivate = () => {
    setIsDemoCouponActive(true);
    setDemoBusinessStats((current) => ({
      ...current,
      couponActivations: current.couponActivations + (isDemoCouponActive ? 0 : 1),
    }));
  };

  const handleDemoCouponUse = () => {
    setIsDemoCouponActive(false);
    setDemoBusinessStats((current) => ({
      ...current,
      couponUses: current.couponUses + 1,
    }));
  };

  const handleDemoRouteClick = () => {
    setDemoBusinessStats((current) => ({
      ...current,
      routeClicks: current.routeClicks + 1,
    }));
  };

  const handleLocateDemoBusiness = () => {
    setIsDemoBusinessVisibleOnMap(true);
    setSelectedFalla(DEMO_BUSINESS_FALLA);
    setActiveRouteFallaId((current) => (current === DEMO_BUSINESS_FALLA.id ? current : null));
    setMapSearchQuery("McDonald's");
    setActiveMonumentRail('Todas');
    setActiveTab('Mapa');
    handleDemoRouteClick();
  };

  const renderBusinessDemo = () => {
    const sentPeople = demoBusinessStats.profileViews + demoBusinessStats.routeClicks + demoBusinessStats.couponUses;
    const conversionRate = Math.round((demoBusinessStats.couponUses / Math.max(1, demoBusinessStats.couponActivations)) * 100);

    return (
      <div className="mx-auto grid max-w-[1680px] gap-4 px-3 pb-8 sm:px-4 lg:grid-cols-[minmax(0,1fr)_380px] xl:px-6">
        <DashboardSurface isDarkMode={isDarkMode} className="overflow-hidden p-0">
          <div className={cn('relative overflow-hidden p-5 sm:p-7', isDarkMode ? 'bg-[radial-gradient(circle_at_top_right,rgba(255,99,33,0.22),transparent_34%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.78))]' : 'bg-[radial-gradient(circle_at_top_right,rgba(255,99,33,0.16),transparent_34%),linear-gradient(180deg,#ffffff,#fff7f2)]')}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <span className="inline-flex items-center gap-2 rounded-full bg-brand px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                  <Store className="h-3.5 w-3.5" /> Demo marketplace
                </span>
                <h1 className="mt-5 text-[clamp(2.2rem,5vw,4.9rem)] font-black leading-[0.9] tracking-[-0.06em]">
                  McDonald's Plaza Ayuntamiento
                </h1>
                <p className={cn('mt-4 max-w-2xl text-sm font-bold leading-7 sm:text-base', isDarkMode ? 'text-white/66' : 'text-slate-600')}>
                  Ejemplo de ficha comercial con QR unico, cupon activado dentro de la app y tracking de visitas, clics y canjes para demostrar trafico real.
                </p>
              </div>

              <div className={cn('rounded-[1.7rem] border p-4 shadow-[0_20px_50px_rgba(15,23,42,0.12)]', isDarkMode ? 'border-white/10 bg-white/[0.06]' : 'border-white/80 bg-white/88')}>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Resultado comercial</p>
                <p className="mt-2 text-4xl font-black tracking-[-0.05em]">{sentPeople}</p>
                <p className={cn('mt-1 text-xs font-bold', isDarkMode ? 'text-white/58' : 'text-slate-500')}>personas atribuidas a esta ficha</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Visitas a ficha', value: demoBusinessStats.profileViews, icon: Eye, helper: 'Se suma al abrir Negocios' },
              { label: 'Clics de ruta', value: demoBusinessStats.routeClicks, icon: Navigation, helper: 'Intencion directa de visita' },
              { label: 'Cupones activados', value: demoBusinessStats.couponActivations, icon: BadgePercent, helper: 'Usuarios interesados' },
              { label: 'Cupones usados', value: demoBusinessStats.couponUses, icon: UserCheck, helper: `${conversionRate}% conversion demo` },
            ].map((metric) => {
              const Icon = metric.icon;
              return (
                <div key={metric.label} className={cn('rounded-[1.35rem] border p-4', isDarkMode ? 'border-white/10 bg-white/[0.045]' : 'border-slate-100 bg-slate-50/80')}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-brand/12 text-brand"><Icon className="h-4.5 w-4.5" /></div>
                    <p className="text-2xl font-black">{metric.value}</p>
                  </div>
                  <p className="mt-4 text-[10px] font-black uppercase tracking-[0.18em] text-brand">{metric.label}</p>
                  <p className={cn('mt-1 text-xs font-bold', isDarkMode ? 'text-white/56' : 'text-slate-500')}>{metric.helper}</p>
                </div>
              );
            })}
          </div>
        </DashboardSurface>

        <div className="space-y-4">
          <DashboardSurface isDarkMode={isDarkMode} className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Cupon QR unico</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">Menu Fallas -15%</h2>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-brand text-white"><QrCode className="h-5 w-5" /></div>
            </div>

            <div className={cn('rounded-[1.5rem] border p-4 text-center', isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-100 bg-slate-50')}>
              <div className="mx-auto grid h-40 w-40 grid-cols-5 gap-1 rounded-[1.2rem] bg-white p-4 shadow-inner">
                {Array.from({ length: 25 }).map((_, index) => (
                  <span key={index} className={cn('rounded-[3px]', [0, 1, 2, 5, 7, 10, 11, 12, 14, 17, 19, 20, 22, 24].includes(index) ? 'bg-slate-950' : 'bg-slate-100')} />
                ))}
              </div>
              <p className={cn('mt-3 text-[10px] font-black uppercase tracking-[0.18em]', isDarkMode ? 'text-white/50' : 'text-slate-400')}>QR-MCD-FALLES360-001</p>
            </div>

            <button type="button" onClick={handleDemoCouponActivate} className={cn('flex w-full items-center justify-center gap-2 rounded-[1.15rem] px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] transition-all', isDemoCouponActive ? 'bg-emerald-500 text-white' : 'bg-brand text-white hover:bg-[#f45518]')}>
              <BadgePercent className="h-4 w-4" />
              {isDemoCouponActive ? 'Cupon activado' : 'Activar cupon'}
            </button>

            <button type="button" onClick={handleDemoCouponUse} disabled={!isDemoCouponActive} className={cn('flex w-full items-center justify-center gap-2 rounded-[1.15rem] px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] transition-all disabled:cursor-not-allowed disabled:opacity-45', isDarkMode ? 'bg-white/10 text-white hover:bg-white/14' : 'bg-slate-950 text-white hover:bg-slate-800')}>
              <QrCode className="h-4 w-4" />
              Validar uso en caja
            </button>
          </DashboardSurface>

          <DashboardSurface isDarkMode={isDarkMode} className="space-y-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Acciones medibles</p>
            <button type="button" onClick={handleDemoRouteClick} className={cn('flex w-full items-center justify-between rounded-[1.15rem] border px-4 py-3 text-left transition-all', isDarkMode ? 'border-white/10 bg-white/[0.05] hover:bg-white/[0.08]' : 'border-slate-100 bg-slate-50 hover:bg-slate-100')}>
              <span><span className="block text-sm font-black">Como llegar</span><span className={cn('mt-1 block text-xs font-bold', isDarkMode ? 'text-white/54' : 'text-slate-500')}>Suma un clic de ruta al negocio</span></span>
              <Navigation className="h-4 w-4 text-brand" />
            </button>
            <button type="button" onClick={handleLocateDemoBusiness} className="flex w-full items-center justify-between rounded-[1.15rem] bg-brand px-4 py-3 text-left text-white shadow-[0_16px_34px_rgba(255,99,33,0.24)] transition-all hover:bg-[#f45518]">
              <span><span className="block text-sm font-black">Localizar en el mapa</span><span className="mt-1 block text-xs font-bold text-white/74">Crea el marcador demo y centra la vista</span></span>
              <MapPin className="h-4 w-4" />
            </button>
            <div className={cn('rounded-[1.15rem] border px-4 py-3', isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-100 bg-slate-50')}>
              <p className="text-sm font-black">Dashboard para el negocio</p>
              <p className={cn('mt-2 text-xs font-bold leading-5', isDarkMode ? 'text-white/58' : 'text-slate-500')}>
                McDonald's ve visitas, clics, cupones activados, cupones usados y conversion. Esto permite cobrar por resultado, no por fe.
              </p>
            </div>
          </DashboardSurface>
        </div>
      </div>
    );
  };

  const renderMapCanvas = (
    variant: 'default' | 'expanded' = 'default',
    options?: { frameClassName?: string; mapHeightClassName?: string; chromeMode?: 'full' | 'minimal' }
  ) => (
    <FallaMap
      isDarkMode={isDarkMode}
      isAdmin={viewer.role === 'admin'}
      isModalOpen={Boolean(showDetail) || Boolean(navigationFalla)}
      variant={variant}
      frameClassName={options?.frameClassName}
      mapHeightClassName={options?.mapHeightClassName}
      chromeMode={options?.chromeMode}
      heatmapEnabled={isHeatmapEnabled}
      setHeatmapEnabled={setIsHeatmapEnabled}
      fallasLiveModuleEnabled={isFallasLiveModuleEnabled}
      mapStyleId={mapStyleId}
      setMapStyleId={setMapStyleId}
      mapSearchQuery={mapSearchQuery}
      setMapSearchQuery={setMapSearchQuery}
      activeRouteFalla={activeRouteFalla}
      activeRouteFallaId={activeRouteFallaId}
      setActiveRouteFallaId={setActiveRouteFallaId}
      fallas={mapVisibleFallas}
      routeFallas={mappedFallas}
      selectedFalla={selectedFalla}
      setSelectedFalla={setSelectedFalla}
      userPosition={userPosition}
      locationStatus={locationStatus}
      requestLocation={requestLocation}
      startLocationWatch={startLocationWatch}
      stopLocationWatch={stopLocationWatch}
      watchPositionId={watchPositionId}
      favorites={favorites}
      toggleFavorite={toggleFavorite}
      onShowDetail={setShowDetail}
      onPrepareRoute={handlePrepareRouteOnMap}
      externalRouteFallaIds={falleritoRouteFallaIds}
      externalRouteWaypoints={falleritoRouteWaypoints}
      externalRouteFocusToken={falleritoRouteFocusToken}
      onGuidanceActiveChange={setIsInlineGuidanceActive}
      agendaEvents={agendaEvents}
      selectedDate={selectedDate}
      onOpenAgenda={() => setActiveTab('Agenda')}
    />
  );

  const renderMapDashboard = () => renderMapDashboardMapFirst();

  const renderMapDashboardMapFirst = () => {
    const levelNumber = profileBundle?.level.number ?? 1;
    const levelProgressPercent = passportProgressPercent;
    return (
      <MapDashboardShowcase
        activeMonumentRail={activeMonumentRail}
        activeRouteFallaId={activeRouteFallaId}
        favoriteCount={favoriteCount}
        favorites={favorites}
        focusDistanceLabel={mapFocusDistanceLabel}
        focusEtaLabel={mapFocusEtaLabel}
        focusFalla={selectedFalla}
        heatmapEnabled={isHeatmapEnabled}
        levelNumber={levelNumber}
        levelProgressPercent={levelProgressPercent}
        locationStatus={locationStatus}
        mapCanvas={renderMapCanvas('default', {
          frameClassName: '!rounded-none !border-0 !bg-transparent !p-0 !shadow-none',
          mapHeightClassName: 'h-[100dvh] min-h-[100dvh]',
          chromeMode: 'minimal',
        })}
        mapSearchQuery={mapSearchQuery}
        mapStyleId={mapStyleId}
        nextEventLabel={nextSelectedDateEvent ? `${nextSelectedDateEvent.time} · ${nextSelectedDateEvent.location}` : selectedDateLabel}
        nextEventTitle={nextSelectedDateEvent ? nextSelectedDateEvent.title : 'Sin evento inmediato'}
        onLocate={() => { void requestLocation().catch(() => undefined); }}
        onOpenAgenda={() => setActiveTab('Agenda')}
        onOpenCatalog={() => setActiveTab('Fallas')}
        onOpenProfile={() => setActiveTab('Perfil')}
        onClearSelected={() => {
          setSelectedFalla(null);
          setActiveRouteFallaId(null);
          setNavigationFalla(null);
        }}
        onPrepareRoute={handlePrepareRouteOnMap}
        onSelectFalla={handleSelectFallaOnMap}
        onSetHeatmapEnabled={setIsHeatmapEnabled}
        onSetMapSearchQuery={setMapSearchQuery}
        onSetMapStyleId={setMapStyleId}
        onSetMonumentRail={setActiveMonumentRail}
        onShowDetail={setShowDetail}
        onToggleFavorite={(falla, event) => toggleFavorite(falla.id, event)}
        sidebarFallas={mapSidebarFallas}
        viewerLocation={viewer.location}
        visibleCount={mapVisibleFallas.length}
        visitedFallasCount={visitedFallasCount}
      />
    );
  };
  const renderProfileOverview = () => (
    <DashboardSurface isDarkMode={isDarkMode} className="overflow-hidden">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_340px]">
        <div
          className={cn(
            'relative overflow-hidden rounded-[2rem] border p-5 sm:p-6',
            isDarkMode ? 'border-white/10 bg-white/[0.055]' : 'border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.95))]'
          )}
        >
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-brand/12 blur-3xl" />
          <div className="relative z-10">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="relative shrink-0">
                  <img
                    src={viewer.avatar}
                    alt={viewer.name}
                    className="h-24 w-24 rounded-[1.9rem] border-2 border-white/80 object-cover shadow-xl"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -bottom-1.5 -right-1.5 flex h-8 w-8 items-center justify-center rounded-[1rem] bg-brand text-white shadow-lg">
                    <Star className="h-4 w-4 fill-current" />
                  </div>
                </div>

                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Perfil central</p>
                  <h2 className="mt-2 text-[2.1rem] font-black leading-none tracking-[-0.05em] sm:text-[2.7rem]">
                    {viewer.name}
                  </h2>
                  <p className="mt-3 max-w-xl text-sm font-bold leading-6 opacity-65">
                    {viewer.isRegistered
                      ? 'Tu cuenta, accesos y progreso resumidos en una sola lectura.'
                      : 'Un perfil ligero para entrar, orientarte y volver rapido a la app.'}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {[
                      viewerAccountLabel,
                      viewer.location,
                      telegramStatus.linked ? 'Telegram activo' : 'Telegram pendiente',
                    ].map((item) => (
                      <span
                        key={item}
                        className={cn(
                          'inline-flex items-center rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em]',
                          isDarkMode ? 'bg-white/8 text-white/76' : 'bg-white text-slate-600 shadow-sm'
                        )}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 xl:max-w-[280px] xl:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setProfileSaveNotice(null);
                    setIsProfileSettingsOpen(true);
                  }}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-[1rem] px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] transition-all',
                    isDarkMode ? 'bg-white text-slate-950 hover:bg-slate-100' : 'bg-slate-950 text-white hover:bg-slate-800'
                  )}
                >
                  <Settings2 className="h-4 w-4 text-brand" />
                  Configurar perfil
                </button>

                <button
                  type="button"
                  onClick={profileRecommendation.action}
                  disabled={profileRecommendation.cta === 'Buscando GPS' || profileRecommendation.cta === 'Abriendo Telegram'}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-[1rem] px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] transition-all disabled:cursor-not-allowed disabled:opacity-60',
                    isDarkMode ? 'bg-white/10 text-white hover:bg-white/14' : 'bg-white text-slate-700 hover:bg-slate-50'
                  )}
                >
                  <ArrowRight className="h-4 w-4 text-brand" />
                  {profileRecommendation.cta}
                </button>
              </div>
            </div>

            {profileSaveNotice ? (
              <div
                className={cn(
                  'mt-5 rounded-[1.25rem] border px-4 py-3 text-sm font-bold leading-6',
                  profileSaveNoticeTone === 'error'
                    ? isDarkMode
                      ? 'border-red-500/25 bg-red-500/12 text-red-100'
                      : 'border-red-200 bg-red-50 text-red-700'
                    : isDarkMode
                      ? 'border-brand/30 bg-brand/12 text-white'
                      : 'border-brand/20 bg-[#fff3ea] text-slate-700'
                )}
              >
                {profileSaveNotice}
              </div>
            ) : null}

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <ProfileQuickMetric
                isDarkMode={isDarkMode}
                icon={Heart}
                label="Favoritas"
                value={String(favoriteCount).padStart(2, '0')}
                helper={favoriteCount > 0 ? 'Lista preparada para volver al mapa.' : 'Aun no has guardado ninguna.'}
              />
              <ProfileQuickMetric
                isDarkMode={isDarkMode}
                icon={Compass}
                label="Visitadas"
                value={String(visitedFallasCount).padStart(2, '0')}
                helper={viewer.isRegistered ? 'Visitas validadas.' : 'Disponible con cuenta registrada.'}
              />
              <ProfileQuickMetric
                isDarkMode={isDarkMode}
                icon={Trophy}
                label="Insignias"
                value={String(badgesUnlockedCount).padStart(2, '0')}
                helper={viewer.isRegistered ? 'Coleccion desbloqueada.' : 'Se activa al registrarte.'}
              />
            </div>

            <div className={cn('mt-4 rounded-[1.4rem] border px-4 py-4', isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-100 bg-slate-50/80')}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-brand">Resumen</p>
                  <p className="mt-2 text-sm font-bold leading-6 opacity-65">{profileRecommendation.copy}</p>
                </div>
                <div className="min-w-[150px]">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-45">Pasaporte</p>
                  <p className="mt-1 text-lg font-black">{viewer.isRegistered ? `${passportProgressPercent}%` : 'Bloqueado'}</p>
                  <p className="mt-1 text-[11px] font-bold opacity-60">{profileLastActivityMoment}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          <div
            className={cn(
              'rounded-[1.7rem] border p-4',
              isDarkMode ? 'border-white/10 bg-white/[0.05]' : 'border-slate-100 bg-white'
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Estado del perfil</p>
                <h3 className="mt-2 text-[1.2rem] font-black leading-tight">Conexion, acceso y trazas clave en una sola lectura.</h3>
              </div>
              <div className={cn('flex h-11 w-11 items-center justify-center rounded-[1rem]', isDarkMode ? 'bg-brand/14 text-brand' : 'bg-brand/10 text-brand')}>
                <Clock className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {[
                { label: 'Cuenta', value: viewerAccountLabel },
                { label: 'GPS', value: viewerGpsLabel },
                { label: 'Telegram', value: telegramStatusLabel },
                { label: 'Actividad', value: profileLastActivityMoment },
              ].map((item) => (
                <div key={item.label} className={cn('rounded-[1rem] border px-3 py-3', isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-100 bg-slate-50/75')}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-45">{item.label}</p>
                    <p className="text-right text-sm font-black leading-5">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            className={cn(
              'rounded-[1.7rem] border p-4',
              isDarkMode ? 'border-white/10 bg-white/[0.05]' : 'border-slate-100 bg-white'
            )}
          >
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Atajos utiles</p>
            <h3 className="mt-2 text-[1.2rem] font-black leading-tight">Acciones directas.</h3>

            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('Mapa')}
                className={cn(
                  'inline-flex items-center justify-center gap-2 rounded-[1rem] px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] transition-all',
                  isDarkMode ? 'bg-white text-slate-950 hover:bg-slate-100' : 'bg-slate-950 text-white hover:bg-slate-800'
                )}
              >
                Abrir mapa
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('Fallas')}
                className={cn(
                  'inline-flex items-center justify-center gap-2 rounded-[1rem] px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] transition-all',
                  isDarkMode ? 'bg-white/10 text-white hover:bg-white/14' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                )}
              >
                Ver fallas
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('Social')}
                className={cn(
                  'inline-flex items-center justify-center gap-2 rounded-[1rem] px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] transition-all',
                  isDarkMode ? 'bg-white/10 text-white hover:bg-white/14' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                )}
              >
                Abrir social
              </button>
              <button
                type="button"
                onClick={viewer.isRegistered ? handleLogout : profileRecommendation.action}
                className={cn(
                  'inline-flex items-center justify-center gap-2 rounded-[1rem] px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] transition-all',
                  isDarkMode ? 'bg-white/8 text-white hover:bg-white/12' : 'bg-white text-slate-700 hover:bg-slate-50'
                )}
              >
                {viewer.isRegistered ? <LogOut className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                {viewer.isRegistered ? 'Cerrar sesion' : 'Iniciar sesion'}
              </button>
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-[1.15rem] bg-brand/10 px-3 py-3 text-brand">
              <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-brand text-white">
                {viewerInitials}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-70">Perfil visible</p>
                <p className={cn('truncate text-sm font-black', isDarkMode ? 'text-white' : 'text-slate-900')}>{viewer.name}</p>
                <p className={cn('truncate text-[11px] font-bold', isDarkMode ? 'text-white/65' : 'text-slate-500')}>
                  {viewer.handle} Ã‚Â· {viewer.location}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardSurface>
  );

  const renderProfileOverviewV2 = () => {
    const profileReadinessItems = [
      { label: 'Cuenta', value: viewerAccountLabel, ready: viewer.isRegistered, icon: UserCheck },
      { label: 'GPS', value: viewerGpsLabel, ready: locationStatus === 'ready', icon: MapPin },
      { label: 'Telegram', value: telegramStatusLabel, ready: telegramStatus.linked, icon: Bell },
      { label: 'Favoritas', value: favoriteCount > 0 ? `${favoriteCount} guardadas` : 'Sin favoritas', ready: favoriteCount > 0, icon: Heart },
    ];
    const readinessPercent = Math.round((profileReadinessItems.filter((item) => item.ready).length / profileReadinessItems.length) * 100);
    const heroMetrics = [
      { icon: Heart, label: 'Favoritas', value: String(favoriteCount).padStart(2, '0'), helper: favoriteCount > 0 ? 'Acceso rapido al mapa.' : 'Guarda tus primeras fallas.' },
      { icon: Eye, label: 'Visitadas', value: String(visitedFallasCount).padStart(2, '0'), helper: viewer.isRegistered ? 'Visitas verificadas.' : 'Disponible con cuenta.' },
      { icon: Award, label: 'Insignias', value: String(badgesUnlockedCount).padStart(2, '0'), helper: viewer.isRegistered ? 'Logros desbloqueados.' : 'Se activa al registrarte.' },
      { icon: Target, label: 'Pasaporte', value: viewer.isRegistered ? `${passportProgressPercent}%` : '0%', helper: profileLastActivityMoment },
    ];
    const quickActions = [
      { label: 'Mapa', icon: Compass, action: () => setActiveTab('Mapa') },
      { label: 'Fallas', icon: Route, action: () => setActiveTab('Fallas') },
      { label: 'Social', icon: MessageCircle, action: () => setActiveTab('Social') },
    ];

    return (
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <section
          className={cn(
            'relative overflow-hidden rounded-[1.4rem] border p-4 shadow-[0_18px_46px_rgba(15,23,42,0.08)] sm:p-6 lg:p-7',
            isDarkMode ? 'border-white/10 bg-slate-950/78' : 'border-slate-200/80 bg-white'
          )}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(90deg,rgba(255,99,33,0.16),rgba(250,204,21,0.12),transparent)]" />
          <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-start">
            <div className="min-w-0">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="relative shrink-0">
                  <img
                    src={viewer.avatar}
                    alt={viewer.name}
                    className="h-24 w-24 rounded-[1.35rem] border border-white/80 object-cover shadow-[0_18px_36px_rgba(15,23,42,0.14)] sm:h-28 sm:w-28"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-[0.95rem] bg-brand text-white shadow-[0_14px_30px_rgba(255,99,33,0.32)]">
                    <Star className="h-4.5 w-4.5 fill-current" />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full bg-brand/12 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-brand">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Perfil
                    </span>
                    <span className={cn('rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em]', isDarkMode ? 'bg-white/8 text-white/72' : 'bg-slate-100 text-slate-600')}>
                      {viewerAccountLabel}
                    </span>
                  </div>
                  <h2 className="mt-3 break-words text-[2.05rem] font-black leading-[0.98] tracking-tight sm:text-[2.8rem] lg:text-[3.25rem]">
                    {viewer.name}
                  </h2>
                  <p className={cn('mt-3 max-w-2xl text-sm font-bold leading-6 sm:text-base sm:leading-7', isDarkMode ? 'text-white/62' : 'text-slate-500')}>
                    {viewer.isRegistered
                      ? 'Centro personal para controlar progreso, favoritas, avisos y rutas sin saltar entre pantallas.'
                      : 'Perfil de invitado listo para explorar. Registrate cuando quieras conservar progreso y visitas verificadas.'}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {[viewer.handle, viewer.location, telegramStatus.linked ? 'Telegram activo' : 'Telegram pendiente'].map((item) => (
                      <span key={item} className={cn('rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em]', isDarkMode ? 'bg-white/8 text-white/70' : 'bg-white text-slate-600 shadow-sm')}>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setProfileSaveNotice(null);
                    setIsProfileSettingsOpen(true);
                  }}
                  className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-[0.85rem] bg-brand px-5 text-[12px] font-black text-white shadow-[0_14px_30px_rgba(255,99,33,0.26)] transition-colors hover:bg-brand-dark sm:w-auto"
                >
                  <Settings2 className="h-4 w-4" />
                  Configurar
                </button>
                <button
                  type="button"
                  onClick={profileRecommendation.action}
                  disabled={profileRecommendation.cta === 'Buscando GPS' || profileRecommendation.cta === 'Abriendo Telegram'}
                  className={cn(
                    'inline-flex h-12 w-full items-center justify-center gap-3 rounded-[0.85rem] border px-5 text-[12px] font-black transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto',
                    isDarkMode ? 'border-white/12 bg-white/8 text-white hover:bg-white/12' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  )}
                >
                  <ArrowRight className="h-4 w-4 text-brand" />
                  {profileRecommendation.cta}
                </button>
              </div>

              {profileSaveNotice ? (
                <div
                  className={cn(
                    'mt-5 rounded-[1rem] border px-4 py-3 text-sm font-bold leading-6',
                    profileSaveNoticeTone === 'error'
                      ? isDarkMode
                        ? 'border-red-500/25 bg-red-500/12 text-red-100'
                        : 'border-red-200 bg-red-50 text-red-700'
                      : isDarkMode
                        ? 'border-brand/30 bg-brand/12 text-white'
                        : 'border-brand/20 bg-[#fff3ea] text-slate-700'
                  )}
                >
                  {profileSaveNotice}
                </div>
              ) : null}
            </div>

            <div className={cn('rounded-[1.15rem] border p-4', isDarkMode ? 'border-white/10 bg-white/[0.045]' : 'border-slate-100 bg-slate-50/80')}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Preparacion</p>
                  <p className="mt-1 text-sm font-black">{readinessPercent}% listo</p>
                </div>
                <div
                  className="grid h-16 w-16 place-items-center rounded-full text-sm font-black text-brand"
                  style={{ background: `conic-gradient(rgb(255 99 33) ${readinessPercent}%, rgba(148,163,184,0.22) 0)` }}
                >
                  <div className={cn('grid h-12 w-12 place-items-center rounded-full', isDarkMode ? 'bg-slate-950' : 'bg-white')}>
                    {readinessPercent}%
                  </div>
                </div>
              </div>
              <p className={cn('mt-4 text-sm font-bold leading-6', isDarkMode ? 'text-white/62' : 'text-slate-500')}>{profileRecommendation.copy}</p>
            </div>
          </div>

          <div className="relative z-10 mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {heroMetrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <article
                  key={metric.label}
                  className={cn(
                    'min-h-[132px] rounded-[1rem] border p-4',
                    isDarkMode ? 'border-white/10 bg-white/[0.045]' : 'border-slate-200/75 bg-white'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[0.85rem] bg-brand/10 text-brand">
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <p className={cn('text-[10px] font-black uppercase tracking-[0.18em]', isDarkMode ? 'text-white/42' : 'text-slate-400')}>{metric.label}</p>
                      <p className="mt-1 text-[1.45rem] font-black leading-none">{metric.value}</p>
                    </div>
                  </div>
                  <p className={cn('mt-3 text-[12px] font-bold leading-5', isDarkMode ? 'text-white/56' : 'text-slate-500')}>{metric.helper}</p>
                </article>
              );
            })}
          </div>
        </section>

        <aside
          className={cn(
            'rounded-[1.4rem] border p-5 shadow-[0_18px_46px_rgba(15,23,42,0.08)]',
            isDarkMode ? 'border-white/10 bg-slate-950/78' : 'border-slate-200/80 bg-white'
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-brand">Estado</p>
              <h3 className="mt-2 text-[1.25rem] font-black leading-tight">Cuenta, ubicacion y avisos bajo control.</h3>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] bg-brand/10 text-brand">
              <Activity className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-5 grid gap-2.5">
            {profileReadinessItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className={cn('rounded-[0.95rem] border px-3 py-3', isDarkMode ? 'border-white/10 bg-white/[0.045]' : 'border-slate-100 bg-slate-50/80')}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.8rem]', item.ready ? 'bg-brand/12 text-brand' : isDarkMode ? 'bg-white/8 text-white/55' : 'bg-white text-slate-400')}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-45">{item.label}</p>
                        <p className="truncate text-sm font-black">{item.value}</p>
                      </div>
                    </div>
                    <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', item.ready ? 'bg-emerald-500' : 'bg-slate-300')} />
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-5 text-[10px] font-black uppercase tracking-[0.22em] text-brand">Atajos</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {quickActions.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.action}
                  className={cn(
                    'flex min-h-[72px] flex-col items-center justify-center gap-2 rounded-[0.9rem] border px-2 text-center text-[10px] font-black uppercase tracking-[0.12em] transition-colors',
                    isDarkMode ? 'border-white/10 bg-white/[0.045] text-white hover:bg-white/8' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  )}
                >
                  <Icon className="h-4.5 w-4.5 text-brand" />
                  {item.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={viewer.isRegistered ? handleLogout : profileRecommendation.action}
            className={cn(
              'mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[0.9rem] text-[12px] font-black transition-colors',
              isDarkMode ? 'bg-white/8 text-white hover:bg-white/12' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            )}
          >
            {viewer.isRegistered ? <LogOut className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
            {viewer.isRegistered ? 'Cerrar sesion' : 'Iniciar sesion'}
          </button>
        </aside>
      </div>
    );
  };

  const handleConnectTelegram = async () => {
    if (!viewer.isRegistered || !viewer.id) {
      setTelegramNotice('Necesitas una cuenta registrada para vincular Telegram.');
      return;
    }

    setIsTelegramLinking(true);
    setTelegramNotice(null);

    try {
      const telegramUrl = await createTelegramLink(viewer.id);

      window.open(telegramUrl, '_blank', 'noopener,noreferrer');
      setShouldPollTelegramStatus(true);
      setTelegramNotice('Telegram se ha abierto. Pulsa Start en el bot para completar la vinculacion.');
    } catch (error) {
      if (error instanceof Error && error.message === 'Sesion no valida.') {
        window.location.replace(resolveLoginUrl());
        return;
      }

      setTelegramNotice(error instanceof Error ? error.message : 'No se pudo abrir Telegram.');
    } finally {
      setIsTelegramLinking(false);
    }
  };

  const handleRefreshTelegramStatus = async () => {
    if (!viewer.isRegistered || !viewer.id) {
      setTelegramNotice('Necesitas una cuenta registrada para comprobar Telegram.');
      return;
    }

    setIsTelegramStatusLoading(true);
    setTelegramNotice(null);

    try {
      const nextStatus = await fetchTelegramStatus(viewer.id);
      setTelegramStatus(nextStatus);
      setShouldPollTelegramStatus(!nextStatus.linked);
      setTelegramNotice(
        nextStatus.linked
          ? 'Telegram conectado. Los avisos ya estan activos.'
          : 'Todavia no hay una cuenta de Telegram vinculada.'
      );
    } catch (error) {
      if (error instanceof Error && error.message === 'Sesion no valida.') {
        window.location.replace(resolveLoginUrl());
        return;
      }

      setTelegramNotice(error instanceof Error ? error.message : 'No se pudo comprobar Telegram.');
    } finally {
      setIsTelegramStatusLoading(false);
    }
  };

  const handleSendTelegramTest = async () => {
    if (!viewer.id) {
      return;
    }

    setIsTelegramSendingTest(true);
    setTelegramNotice(null);

    try {
      await sendTelegramNotification(viewer.id, 'Ã°Å¸â€Â¥ Tu falla favorita empieza acto en 15 minutos.');
      setTelegramNotice('Aviso de prueba enviado a Telegram.');
    } catch (error) {
      if (error instanceof Error && error.message === 'Sesion no valida.') {
        window.location.replace(resolveLoginUrl());
        return;
      }

      setTelegramNotice(error instanceof Error ? error.message : 'No se pudo enviar el aviso de prueba.');
    } finally {
      setIsTelegramSendingTest(false);
    }
  };

  const handleAdminTelegramFieldChange = (field: keyof TelegramAdminAlertPayload, value: string) => {
    setActiveAdminTemplateKey(null);
    setAdminTelegramForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleApplyAdminTemplate = (template: AdminTelegramTemplate) => {
    setActiveAdminTemplateKey(template.key);
    setAdminTelegramNotice(`Plantilla cargada: ${template.name}. Puedes editar cualquier campo antes de enviar.`);
    setAdminTelegramForm({
      type: template.type,
      title: template.title,
      detail: template.detail,
      location: template.location,
      footer: template.footer,
      target: template.target,
    });
  };

  const handleResetAdminTelegramForm = () => {
    setActiveAdminTemplateKey(null);
    setAdminTelegramNotice('Formulario limpio. Puedes redactar un aviso desde cero.');
    setAdminTelegramForm(DEFAULT_ADMIN_TELEGRAM_FORM);
  };

  const handleAdminTelegramSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isAdminViewer) {
      setAdminTelegramNotice('Solo los admins pueden enviar avisos.');
      return;
    }

    setIsAdminTelegramSending(true);
    setAdminTelegramNotice(null);

    try {
      const result = await sendAdminTelegramAlert(adminTelegramForm);
      const deliveredTo = [];

      if (result.channel) {
        deliveredTo.push('canal');
      }

      if (result.users > 0) {
        deliveredTo.push(`${result.users} usuarios`);
      }

      setAdminTelegramNotice(
        deliveredTo.length > 0
          ? `Aviso enviado a ${deliveredTo.join(' y ')}.`
          : 'Aviso enviado correctamente.'
      );
      setActiveAdminTemplateKey(null);
      setAdminTelegramForm(DEFAULT_ADMIN_TELEGRAM_FORM);
    } catch (error) {
      if (error instanceof Error && error.message === 'Sesion no valida.') {
        window.location.replace(resolveLoginUrl());
        return;
      }

      setAdminTelegramNotice(error instanceof Error ? error.message : 'No se pudo enviar el aviso de Telegram.');
    } finally {
      setIsAdminTelegramSending(false);
    }
  };

  const handleSendMonitorSummaryToMyTelegram = async () => {
    if (!isAdminViewer) {
      setAdminTelegramNotice('Solo los admins pueden recibir el resumen del monitor.');
      return;
    }

    setIsMonitorSummarySending(true);
    setAdminTelegramNotice(null);

    try {
      const result = await sendMonitorDailySummaryToMyTelegram();
      setAdminTelegramNotice(
        result.updateCount > 0
          ? `El bot te ha enviado el resumen del monitor con ${result.updateCount} actualizaciones detectadas.`
          : 'El bot te ha enviado el resumen del monitor. No hay actualizaciones en las ultimas 24 horas.'
      );
    } catch (error) {
      if (error instanceof Error && error.message === 'Sesion no valida.') {
        window.location.replace(resolveLoginUrl());
        return;
      }

      setAdminTelegramNotice(error instanceof Error ? error.message : 'No se pudo enviar el resumen del monitor a tu Telegram.');
    } finally {
      setIsMonitorSummarySending(false);
    }
  };

  const handleRunCendraSync = async () => {
    if (!isAdminViewer) {
      setCendraSyncNotice('Solo los admins pueden lanzar la sincronizacion de Cendra.');
      return;
    }

    setIsCendraSyncRunning(true);
    setCendraSyncNotice(null);

    try {
      const result = await runCendraSync(cendraSyncStatus.sourceUrl);

      try {
        const refreshedStatus = await fetchCendraSyncStatus();
        setCendraSyncStatus(refreshedStatus);
      } catch {
        setCendraSyncStatus((current) => ({
          ...current,
          articlesTotal: result.articlesTotal,
          pendingTelegramArticles: result.pendingTelegramArticles,
          latestRun: result.latestRun,
        }));
      }

      try {
        const refreshedArticles = await searchCendraArticles(cendraSearchQuery, 8);
        setCendraArticles(refreshedArticles);
      } catch {
        // Mantiene el ultimo resultado visible si falla la recarga.
      }

      setCendraSyncNotice(`Cendra sincronizada: ${result.newItems} nuevas y ${result.updatedItems} actualizadas.`);
    } catch (error) {
      if (error instanceof Error && error.message === 'Sesion no valida.') {
        window.location.replace(resolveLoginUrl());
        return;
      }

      setCendraSyncNotice(error instanceof Error ? error.message : 'No se pudo sincronizar Cendra.');
    } finally {
      setIsCendraSyncRunning(false);
    }
  };

  const handleCendraSearchSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    setIsCendraSearchLoading(true);
    setCendraSyncNotice(null);

    try {
      const results = await searchCendraArticles(cendraSearchQuery, 12);
      setCendraArticles(results);
      setCendraSyncNotice(
        results.length > 0
          ? `${results.length} resultados cargados desde Cendra.`
          : 'No he encontrado resultados de Cendra para esa busqueda.'
      );
    } catch (error) {
      if (error instanceof Error && error.message === 'Sesion no valida.') {
        window.location.replace(resolveLoginUrl());
        return;
      }

      setCendraSyncNotice(error instanceof Error ? error.message : 'No se pudo buscar en Cendra.');
    } finally {
      setIsCendraSearchLoading(false);
    }
  };

  const handleGenerateCendraTelegramDraft = async () => {
    if (!isAdminViewer) {
      setCendraSyncNotice('Solo los admins pueden generar el resumen diario de Cendra.');
      return;
    }

    setIsCendraDraftGenerating(true);
    setCendraSyncNotice(null);

    try {
      const result = await generateCendraDailySummaryDraft();

      setActiveAdminTemplateKey(null);
      setAdminTelegramForm(result.draft);
      setAdminTelegramNotice(
        `Borrador diario de Cendra cargado con ${result.articleCount} articulos. Revisa el texto y publicalo en el canal cuando quieras.`
      );
      setActiveAdminProfileTab('telegram');
    } catch (error) {
      if (error instanceof Error && error.message === 'Sesion no valida.') {
        window.location.replace(resolveLoginUrl());
        return;
      }

      setCendraSyncNotice(error instanceof Error ? error.message : 'No se pudo generar el borrador diario de Cendra.');
    } finally {
      setIsCendraDraftGenerating(false);
    }
  };

  const handleSendCendraSummaryToMyTelegram = async () => {
    if (!isAdminViewer) {
      setCendraSyncNotice('Solo los admins pueden recibir el resumen diario por Telegram.');
      return;
    }

    setIsCendraTelegramSending(true);
    setCendraSyncNotice(null);

    try {
      const result = await sendCendraDailySummaryToMyTelegram();
      setCendraSyncNotice(
        `El bot te ha enviado el resumen diario con ${result.articleCount} articulos y un boton para confirmar la publicacion en el canal cuando lo revises.`
      );
    } catch (error) {
      if (error instanceof Error && error.message === 'Sesion no valida.') {
        window.location.replace(resolveLoginUrl());
        return;
      }

      setCendraSyncNotice(error instanceof Error ? error.message : 'No se pudo enviar el resumen diario a tu Telegram.');
    } finally {
      setIsCendraTelegramSending(false);
    }
  };

  const handleDownloadCendraStory = (article: CendraRecentArticle) => {
    if (!isAdminViewer) {
      setCendraStoryNotice('Solo los admins pueden preparar historias de Cendra.');
      return;
    }

    setIsCendraStoryPreparing(true);
    setCendraStoryNotice(null);

    try {
      downloadCendraStoryImage(article);
      setCendraStoryNotice(`Historia preparada para "${article.title}". Se ha descargado en formato PNG 1080x1920.`);
    } catch (error) {
      setCendraStoryNotice(error instanceof Error ? error.message : 'No se pudo preparar la historia.');
    } finally {
      setIsCendraStoryPreparing(false);
    }
  };

  const handleCopyCendraStoryCaption = async (article: CendraRecentArticle) => {
    const caption = buildCendraStoryCaption(article);

    if (!navigator.clipboard?.writeText) {
      setCendraStoryNotice('Tu navegador no permite copiar el texto automaticamente.');
      return;
    }

    try {
      await navigator.clipboard.writeText(caption);
      setCendraStoryNotice(`Texto de historia copiado para "${article.title}".`);
    } catch {
      setCendraStoryNotice('No se pudo copiar el texto de la historia.');
    }
  };

  const handleSendCendraArticleToBot = async (articleId: number) => {
    if (!isAdminViewer) {
      setCendraSyncNotice('Solo los admins pueden enviarse articulos de Cendra al bot.');
      return;
    }

    setCendraArticleActionId(articleId);
    setCendraArticleActionKind('send-bot');
    setCendraSyncNotice(null);

    try {
      const result = await sendCendraArticleToMyTelegram(articleId);
      setCendraSyncNotice(`El bot te ha enviado "${result.title}" con la version ampliada para revisarlo en privado.`);
    } catch (error) {
      if (error instanceof Error && error.message === 'Sesion no valida.') {
        window.location.replace(resolveLoginUrl());
        return;
      }

      setCendraSyncNotice(error instanceof Error ? error.message : 'No se pudo enviar el articulo a tu bot.');
    } finally {
      setCendraArticleActionId(null);
      setCendraArticleActionKind(null);
    }
  };

  const handlePublishCendraArticle = async (articleId: number) => {
    if (!isAdminViewer) {
      setCendraSyncNotice('Solo los admins pueden publicar articulos de Cendra en el canal.');
      return;
    }

    setCendraArticleActionId(articleId);
    setCendraArticleActionKind('publish-channel');
    setCendraSyncNotice(null);

    try {
      const result = await publishCendraArticleToChannel(articleId);
      setCendraSyncNotice(`"${result.title}" se ha publicado en el canal con formato adaptado para Falles360.`);
      setCendraArticles((current) => current.map((article) => (
        article.id === articleId
          ? { ...article, telegramSent: true }
          : article
      )));
      setCendraSyncStatus((current) => ({
        ...current,
        pendingTelegramArticles: Math.max(0, current.pendingTelegramArticles - 1),
      }));
    } catch (error) {
      if (error instanceof Error && error.message === 'Sesion no valida.') {
        window.location.replace(resolveLoginUrl());
        return;
      }

      setCendraSyncNotice(error instanceof Error ? error.message : 'No se pudo publicar el articulo en el canal.');
    } finally {
      setCendraArticleActionId(null);
      setCendraArticleActionKind(null);
    }
  };

  const handleToggleCendraLandingArticle = async (article: CendraRecentArticle) => {
    if (!isAdminViewer) {
      setCendraSyncNotice('Solo los admins pueden publicar noticias de Cendra en la landing.');
      return;
    }

    const nextPublished = !article.landingPublished;
    setCendraArticleActionId(article.id);
    setCendraArticleActionKind('landing');
    setCendraSyncNotice(null);

    try {
      const result = await setCendraArticleLandingPublication(article.id, nextPublished);
      setCendraSyncNotice(
        result.landingPublished
          ? `"${result.title}" ya aparece en Noticias de la landing.`
          : `"${result.title}" se ha retirado de Noticias de la landing.`
      );
      setCendraArticles((current) => current.map((item) => (
        item.id === article.id
          ? { ...item, landingPublished: result.landingPublished }
          : item
      )));
      setCendraSyncStatus((current) => ({
        ...current,
        landingArticles: Math.max(0, current.landingArticles + (result.landingPublished ? 1 : -1)),
        recentArticles: current.recentArticles.map((item) => (
          item.id === article.id
            ? { ...item, landingPublished: result.landingPublished }
            : item
        )),
      }));
    } catch (error) {
      if (error instanceof Error && error.message === 'Sesion no valida.') {
        window.location.replace(resolveLoginUrl());
        return;
      }

      setCendraSyncNotice(error instanceof Error ? error.message : 'No se pudo actualizar la landing.');
    } finally {
      setCendraArticleActionId(null);
      setCendraArticleActionKind(null);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Mapa':
        return renderMapDashboardMapFirst();

      case 'Social':
        return (
          <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,760px)_320px] xl:items-start xl:justify-center 2xl:grid-cols-[minmax(0,820px)_340px]">
            <div className="min-w-0">
              <SocialFeed isDarkMode={isDarkMode} posts={SOCIAL_POSTS} viewer={viewer} />
            </div>

            <div className="space-y-4 xl:sticky xl:top-8">
              <DashboardSurface
                isDarkMode={isDarkMode}
                className={cn(
                  'overflow-hidden border-transparent bg-[radial-gradient(circle_at_top_right,rgba(255,99,33,0.12),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,247,241,0.96))]',
                  isDarkMode && 'bg-[radial-gradient(circle_at_top_right,rgba(255,99,33,0.18),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.04))]'
                )}
              >
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Comunidad</p>
                <h2 className="mt-3 text-[1.8rem] font-black leading-[0.95] tracking-[-0.05em]">
                  Pulso social en un lateral mas limpio.
                </h2>
                <p className="mt-3 text-sm font-bold leading-6 opacity-65">
                  El feed queda como pieza principal y este bloque solo acompana con el contexto que ya existe.
                </p>
              </DashboardSurface>

              <DashboardSurface isDarkMode={isDarkMode} className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Resumen</p>
                    <h3 className="mt-1 text-[1.2rem] font-black tracking-tight">Actividad actual</h3>
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]',
                      isDarkMode ? 'bg-white/8 text-white/74' : 'bg-slate-100 text-slate-600'
                    )}
                  >
                    {viewer.handle}
                  </span>
                </div>
                <div className="grid gap-2.5">
                  <DashboardMetric
                    isDarkMode={isDarkMode}
                    icon={MessageCircle}
                    label="Feed"
                    value={String(SOCIAL_POSTS.length).padStart(2, '0')}
                    helper="Publicaciones base listas para alimentar la comunidad."
                  />
                  <DashboardMetric
                    isDarkMode={isDarkMode}
                    icon={Heart}
                    label="Favoritos"
                    value={String(favorites.length).padStart(2, '0')}
                    helper="Tus monumentos guardados conectan mejor con el contenido social."
                  />
                  <DashboardMetric
                    isDarkMode={isDarkMode}
                    icon={Radio}
                    label="Modo"
                    value={viewer.accessType === 'guest' ? 'Invitado' : 'Registrado'}
                    helper={`Publicando desde ${viewer.location}.`}
                  />
                </div>
              </DashboardSurface>

              <DashboardSurface isDarkMode={isDarkMode} className="space-y-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Tendencias</p>
                  <h3 className="mt-2 text-[1.3rem] font-black leading-none tracking-tight">Lo que mas se esta moviendo ahora.</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['#Fallas2026', '#Mascleta', '#Ofrenda', '#NitDelFoc'].map((tag) => (
                    <span
                      key={tag}
                      className={cn(
                        'rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em]',
                        isDarkMode ? 'bg-white/8 text-white/74' : 'bg-slate-100 text-slate-600'
                      )}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </DashboardSurface>

              <DashboardSurface isDarkMode={isDarkMode} className="space-y-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Destacado</p>
                  <h3 className="mt-2 text-[1.3rem] font-black leading-none tracking-tight">Publicaciones con mas traccion.</h3>
                </div>
                <div className="space-y-3">
                  {mostLikedPosts.map((post) => (
                    <div
                      key={post.id}
                      className={cn(
                        'rounded-[1.25rem] border px-4 py-3',
                        isDarkMode ? 'border-white/10 bg-white/6' : 'border-slate-100 bg-slate-50'
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-black">{post.user}</p>
                        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-brand">{post.likes} likes</span>
                      </div>
                      <p className="mt-2 text-sm font-bold leading-5 opacity-60">{post.content}</p>
                    </div>
                  ))}
                </div>
                <div className="grid gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('Mapa')}
                    className={cn(
                      'inline-flex items-center justify-center gap-2 rounded-[1rem] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] transition-all',
                      isDarkMode ? 'bg-white text-slate-950 hover:bg-slate-100' : 'bg-slate-950 text-white hover:bg-slate-800'
                    )}
                  >
                    Volver al mapa
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('Agenda')}
                    className="inline-flex items-center justify-center gap-2 rounded-[1rem] bg-brand px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-xl shadow-brand/25 transition-all hover:scale-[1.01]"
                  >
                    Ver agenda
                  </button>
                </div>
              </DashboardSurface>
            </div>
          </div>
        );

      case 'Agenda':
        return (
          <AgendaView
            isDarkMode={isDarkMode}
            events={agendaEvents}
            selectedDate={selectedDate}
            seasonStartEvent={cridaEvent}
            showSeasonCountdown={shouldShowAgendaCountdown}
            dailySignal={dailySignal}
            onDateChange={setSelectedDate}
            onViewMap={() => setActiveTab('Mapa')}
            onOpenAssistant={() => setActiveTab('Fallerito')}
            viewer={{
              name: viewer.name,
              location: viewer.location,
              avatar: viewer.avatar,
            }}
          />
        );

      case 'Fallas':
        return (
          <div className="space-y-3 px-3 pb-4 sm:px-4 lg:px-5 xl:px-6 2xl:px-8">
            <section
              className={cn(
                'relative min-h-[248px] overflow-hidden rounded-[1.05rem] border shadow-[0_16px_38px_rgba(15,23,42,0.09)] sm:min-h-[330px]',
                isDarkMode ? 'border-white/10 bg-slate-950 text-white' : 'border-white/90 bg-white text-slate-950'
              )}
            >
              <div className="absolute inset-0">
                <img
                  src={buildProjectAssetUrl('img/Explorador de barrio y fallas.png')}
                  alt=""
                  className="h-full w-full object-cover object-[68%_center]"
                  referrerPolicy="no-referrer"
                />
                <div className={cn('absolute inset-0', isDarkMode ? 'bg-[linear-gradient(90deg,rgba(2,6,23,0.92)_0%,rgba(2,6,23,0.68)_38%,rgba(2,6,23,0.22)_76%,rgba(2,6,23,0.48)_100%)]' : 'bg-[linear-gradient(90deg,rgba(255,255,255,0.98)_0%,rgba(255,255,255,0.9)_34%,rgba(255,255,255,0.38)_68%,rgba(255,255,255,0.72)_100%)]')} />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_71%_28%,rgba(255,99,33,0.16),transparent_36%)]" />
              </div>

              <div className="relative z-10 flex min-h-[248px] flex-col justify-between gap-4 p-4 sm:min-h-[330px] sm:p-5 lg:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div className="max-w-[540px]">
                    <p className="text-[9px] font-black uppercase tracking-[0.22em] text-brand">Catalogo oficial</p>
                    <h2 className="mt-2 max-w-[470px] text-[1.95rem] font-black leading-[0.96] tracking-tight sm:mt-3 sm:text-[3.45rem]">
                      Explora las Fallas <span className="text-brand">2026</span>
                    </h2>
                    <p className={cn('mt-2 max-w-[410px] text-[11px] font-bold leading-5 sm:mt-3 sm:text-[13px]', isDarkMode ? 'text-white/72' : 'text-slate-600')}>
                      Descubre cada monumento, sus artistas, premios y ubicacion. El catalogo visual mas completo de las Fallas de Valencia.
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-2.5 sm:flex sm:flex-row sm:flex-wrap">
                      <button
                        type="button"
                        onClick={() => setActiveTab('Mapa')}
                        className="inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-full bg-brand px-3 text-[9px] font-black uppercase tracking-[0.1em] text-white shadow-[0_14px_30px_rgba(255,99,33,0.25)] transition-colors hover:bg-brand-dark sm:w-auto sm:px-4 sm:text-[10px]"
                      >
                        <MapPin className="h-4 w-4" />
                        <span className="truncate">Ver mapa</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsFallasHelpOpen(true)}
                        className={cn(
                          'inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-full border px-3 text-[9px] font-black uppercase tracking-[0.1em] shadow-[0_12px_28px_rgba(15,23,42,0.07)] transition-colors sm:w-auto sm:px-4 sm:text-[10px]',
                          isDarkMode ? 'border-white/12 bg-white/10 text-white hover:bg-white/14' : 'border-black/5 bg-white/90 text-slate-700 hover:bg-white'
                        )}
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span className="truncate">Ayuda</span>
                      </button>
                    </div>
                  </div>

                  <div className={cn('hidden rounded-full border px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] shadow-[0_14px_30px_rgba(15,23,42,0.08)] lg:inline-flex', isDarkMode ? 'border-white/10 bg-slate-950/72 text-white' : 'border-black/5 bg-white/88 text-slate-600')}>
                    <span className="text-brand">{filteredFallas.length}</span>
                    <span className="ml-1">fallas visibles</span>
                  </div>
                </div>

                <div className={cn('grid grid-cols-2 gap-0 overflow-hidden rounded-[1rem] border shadow-[0_18px_38px_rgba(15,23,42,0.09)] backdrop-blur-xl sm:grid-cols-2 lg:grid-cols-5', isDarkMode ? 'border-white/10 bg-slate-950/72' : 'border-white/80 bg-white/90')}>
                  {[
                    { icon: Eye, label: 'Visibles', value: filteredFallas.length, helper: 'Monumentos en el catalogo' },
                    { icon: MapPin, label: 'Barrios', value: uniqueNeighborhoodsCount, helper: 'En toda Valencia' },
                    { icon: Trophy, label: 'Premios', value: fallasWithPrizeCount, helper: 'Categorias oficiales' },
                    { icon: UsersRound, label: 'Artistas', value: uniqueArtistsCount, helper: 'Talleres y estudios' },
                    { icon: Star, label: 'Novedades', value: fallas.length, helper: 'Fallas nuevas este ano' },
                  ].map((metric) => {
                    const Icon = metric.icon;
                    return (
                      <div key={metric.label} className={cn('flex items-center gap-2.5 border-b border-r px-3 py-2.5 even:border-r-0 last:col-span-2 last:border-b-0 sm:last:col-span-1 sm:[&:nth-child(4)]:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0', isDarkMode ? 'border-white/10' : 'border-slate-200/80')}>
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className={cn('text-[8px] font-black uppercase tracking-[0.16em]', isDarkMode ? 'text-white/48' : 'text-slate-400')}>{metric.label}</p>
                          <p className="mt-0.5 text-[0.95rem] font-black leading-none">{String(metric.value).padStart(2, '0')}</p>
                          <p className={cn('mt-1 truncate text-[8px] font-bold', isDarkMode ? 'text-white/50' : 'text-slate-500')}>{metric.helper}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <DashboardSurface isDarkMode={isDarkMode} className="rounded-[1.1rem] p-3 sm:p-3.5">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-5 xl:flex xl:flex-1">
                  <label className={cn('col-span-2 flex min-h-11 items-center gap-2 rounded-[0.75rem] border px-3 lg:col-span-1', isDarkMode ? 'border-white/10 bg-white/6' : 'border-slate-200 bg-white')}>
                    <Search className="h-4 w-4 shrink-0 text-brand" />
                    <input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Buscar falla, artista, JCF, barrio o premio..."
                      className={cn('min-w-0 flex-1 bg-transparent text-[12px] font-bold outline-none placeholder:font-semibold', isDarkMode ? 'text-white placeholder:text-white/42' : 'text-slate-800 placeholder:text-slate-400')}
                    />
                  </label>

                  {[
                    {
                      value: selectedFallasSection,
                      onChange: setSelectedFallasSection,
                      options: fallasSections,
                    },
                    {
                      value: selectedCategory,
                      onChange: (value: string) => setSelectedCategory(value as typeof selectedCategory),
                      options: ['Todas', 'Principal', 'Infantil', 'Experimental'],
                    },
                    {
                      value: selectedFallasNeighborhood,
                      onChange: setSelectedFallasNeighborhood,
                      options: fallasNeighborhoods,
                    },
                    {
                      value: selectedFallasArtist,
                      onChange: setSelectedFallasArtist,
                      options: fallasArtists,
                    },
                  ].map((control, index) => (
                    <label
                      key={`${control.value}-${index}`}
                      className={cn('flex min-h-11 items-center gap-2 rounded-[0.75rem] border px-2.5 sm:px-3', isDarkMode ? 'border-white/10 bg-white/6' : 'border-slate-200 bg-white')}
                    >
                      <Filter className="h-3.5 w-3.5 shrink-0 text-brand" />
                      <select
                        value={control.value}
                        onChange={(event) => control.onChange(event.target.value)}
                        className={cn('min-w-0 flex-1 bg-transparent text-[10px] font-black outline-none sm:text-[11px]', isDarkMode ? 'text-white' : 'text-slate-700')}
                      >
                        {control.options.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 xl:justify-end">
                  <label className={cn('flex h-11 flex-1 items-center justify-between gap-2 rounded-[0.75rem] border px-3 sm:flex-none', isDarkMode ? 'border-white/10 bg-white/6' : 'border-slate-200 bg-white')}>
                    <span className={cn('text-[10px] font-black uppercase tracking-[0.14em]', isDarkMode ? 'text-white/46' : 'text-slate-400')}>Ordenar por</span>
                    <select
                      value={fallasSortMode}
                      onChange={(event) => setFallasSortMode(event.target.value)}
                      className={cn('bg-transparent text-[11px] font-black outline-none', isDarkMode ? 'text-white' : 'text-slate-700')}
                    >
                      {['Destacados', 'Premios', 'Mas vistas', 'Nombre'].map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                  <div className={cn('hidden h-11 items-center overflow-hidden rounded-[0.55rem] border sm:flex', isDarkMode ? 'border-white/10 bg-white/6' : 'border-slate-200 bg-white')}>
                    <button
                      type="button"
                      onClick={() => setFallasViewMode('grid')}
                      className={cn('flex h-11 w-11 items-center justify-center transition-colors', fallasViewMode === 'grid' ? 'bg-brand text-white' : isDarkMode ? 'text-white/54 hover:bg-white/8' : 'text-slate-400 hover:bg-slate-50')}
                      aria-label="Vista cuadricula"
                      aria-pressed={fallasViewMode === 'grid'}
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setFallasViewMode('list')}
                      className={cn('flex h-11 w-11 items-center justify-center transition-colors', fallasViewMode === 'list' ? 'bg-brand text-white' : isDarkMode ? 'text-white/54 hover:bg-white/8' : 'text-slate-400 hover:bg-slate-50')}
                      aria-label="Vista lista"
                      aria-pressed={fallasViewMode === 'list'}
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {(searchQuery || selectedCategory !== 'Todas' || selectedFallasSection !== 'Todas las secciones' || selectedFallasNeighborhood !== 'Todos los barrios' || selectedFallasArtist !== 'Todos los artistas') && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className={cn('inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em]', isDarkMode ? 'bg-white/8 text-white/76' : 'bg-slate-100 text-slate-600')}>
                    {filteredFallas.length} resultados filtrados
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('Todas');
                      setSelectedFallasSection('Todas las secciones');
                      setSelectedFallasNeighborhood('Todos los barrios');
                      setSelectedFallasArtist('Todos los artistas');
                    }}
                    className={cn('inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em]', isDarkMode ? 'bg-white/8 text-white/70 hover:bg-white/12' : 'bg-white text-slate-500 hover:bg-slate-50')}
                  >
                    <X className="h-3 w-3" />
                    Limpiar filtros
                  </button>
                </div>
              )}
            </DashboardSurface>

            {filteredFallas.length > 0 ? (
              fallasViewMode === 'grid' ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {filteredFallas.map((falla) => (
                    <FallaCard
                      key={falla.id}
                      falla={falla}
                      isFavorite={favorites.includes(falla.id)}
                      isDarkMode={isDarkMode}
                      onClick={() => setShowDetail(falla)}
                      onFavorite={(event) => toggleFavorite(falla.id, event)}
                      onShare={(event) => handleShareFalla(falla, event)}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid gap-2.5">
                  {filteredFallas.map((falla) => {
                    const isFavorite = favorites.includes(falla.id);

                    return (
                      <div
                        key={falla.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setShowDetail(falla)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setShowDetail(falla);
                          }
                        }}
                        className={cn(
                          'grid cursor-pointer gap-3 rounded-[0.75rem] border p-2 text-left shadow-[0_10px_22px_rgba(15,23,42,0.06)] transition-colors sm:grid-cols-[132px_1fr_auto] sm:items-center',
                          isDarkMode ? 'border-white/10 bg-white/6 hover:bg-white/9' : 'border-slate-200 bg-white hover:bg-slate-50'
                        )}
                      >
                        <img src={falla.imageUrl} alt="" loading="lazy" decoding="async" className="h-28 w-full rounded-[0.55rem] object-cover sm:h-20" referrerPolicy="no-referrer" />
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className={cn('rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-white', falla.category === 'Infantil' ? 'bg-emerald-500' : 'bg-brand')}>
                              {typeof falla.prize === 'number' ? `${falla.prize} premio` : 'Novedad'}
                            </span>
                            {falla.category === 'Infantil' ? (
                              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-emerald-700">
                                Infantil
                              </span>
                            ) : null}
                            <span className={cn('rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.1em]', isDarkMode ? 'bg-white/10 text-white/76' : 'bg-slate-100 text-slate-500')}>
                              {falla.section}
                            </span>
                          </span>
                          <span className="mt-2 block truncate text-[1rem] font-black leading-tight">{falla.name}</span>
                          {falla.jcfNum || falla.budgetLabel ? (
                            <span className={cn('mt-1 block truncate text-[11px] font-black', isDarkMode ? 'text-white/66' : 'text-slate-500')}>
                              {falla.jcfNum ? `JCF ${falla.jcfNum}` : ''}{falla.jcfNum && falla.budgetLabel ? ' | ' : ''}{falla.budgetLabel || ''}
                            </span>
                          ) : null}
                          <span className={cn('mt-1 flex min-w-0 items-center gap-1.5 text-[11px] font-bold', isDarkMode ? 'text-white/58' : 'text-slate-500')}>
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-brand" />
                            <span className="truncate">{falla.address || falla.neighborhood}</span>
                          </span>
                        </span>
                        <span className="grid grid-cols-3 gap-1.5 sm:flex sm:items-center">
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleFavorite(falla.id);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                event.stopPropagation();
                                toggleFavorite(falla.id);
                              }
                            }}
                            className={cn('inline-flex h-9 items-center justify-center rounded-[0.55rem] px-3 text-[10px] font-black transition-colors', isFavorite ? 'bg-brand/10 text-brand' : isDarkMode ? 'bg-white/8 text-white/70 hover:bg-white/12' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
                          >
                            Guardar
                          </span>
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(event) => {
                              event.stopPropagation();
                              setShowDetail(falla);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                event.stopPropagation();
                                setShowDetail(falla);
                              }
                            }}
                            className={cn('inline-flex h-9 items-center justify-center rounded-[0.55rem] px-3 text-[10px] font-black transition-colors', isDarkMode ? 'bg-white/8 text-white/70 hover:bg-white/12' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
                          >
                            Ver
                          </span>
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(event) => handleShareFalla(falla, event)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                event.stopPropagation();
                                handleShareFalla(falla);
                              }
                            }}
                            className={cn('inline-flex h-9 items-center justify-center rounded-[0.55rem] px-3 text-[10px] font-black transition-colors', isDarkMode ? 'bg-white/8 text-white/70 hover:bg-white/12' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
                          >
                            Compartir
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              <DashboardSurface isDarkMode={isDarkMode} className="py-16 text-center">
                <p className="text-xl font-black uppercase tracking-widest opacity-45">No hay monumentos que coincidan con el filtro actual</p>
              </DashboardSurface>
            )}
          </div>
        );

      case 'Marketplace':
        if (!viewer.isRegistered) {
          return renderRegisteredFeatureGate({
            feature: 'Marketplace',
            icon: ShoppingBag,
            title: 'El marketplace exige cuenta registrada.',
            copy: 'Necesitamos que el usuario este registrado para mostrar ofertas, cupones, productos y contactos dentro de la app.',
          });
        }

        return (
          <MarketplaceView
            isDarkMode={isDarkMode}
            nearbyContextName={selectedFalla?.name ?? navigationFalla?.name ?? activeRouteFalla?.name}
            onOpenMap={() => setActiveTab('Mapa')}
            canEditMarketplace={isAdminViewer}
          />
        );

      case 'Fallerito':
        if (!viewer.isRegistered) {
          return renderRegisteredFeatureGate({
            feature: 'Fallerito',
            icon: Bot,
            title: 'Fallerito solo esta disponible con cuenta registrada.',
            copy: 'El acceso al bot de IA queda reservado a usuarios identificados dentro de Falles360.',
          });
        }

        return (
          <FalleritoScreen
            isDarkMode={isDarkMode}
            onOpenTab={setActiveTab}
            onOpenFallaRoute={handleFalleritoOpenFallaRoute}
            userPosition={userPosition}
            locationStatus={locationStatus}
            requestLocation={requestLocation}
          />
        );

      case 'Perfil':
        return (
          <div className="space-y-5 px-3 pb-4 sm:px-4 lg:px-6 xl:px-8 2xl:px-10">
            {renderProfileOverviewV2()}
            <GamificationProfilePanel
              isDarkMode={isDarkMode}
              isGuest={viewer.accessType !== 'user'}
              isLoading={gamification.isLoading}
              error={gamification.error}
              bundle={gamification.bundle}
              stats={gamification.stats}
            />
            {/*
            <SectionHero
              isDarkMode={isDarkMode}
              eyebrow="Perfil"
              title={`Tu panel personal, ${viewer.name}.`}
              description="Cuenta, accesos y favoritas resueltos en una sola lectura, con una cabecera mas util y menos espacio muerto."
              compact
              className="px-3 py-3 sm:px-4 sm:py-3"
              actions={
                <>
                  {viewer.isRegistered && (
                    <button
                      type="button"
                      onClick={() => void (telegramStatus.linked ? handleSendTelegramTest() : handleConnectTelegram())}
                      disabled={telegramStatus.linked ? isTelegramSendingTest : isTelegramLinking}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-[0.95rem] px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] transition-all disabled:cursor-not-allowed disabled:opacity-60',
                        isDarkMode ? 'bg-white/10 text-white hover:bg-white/14' : 'bg-white text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      <Radio className="h-4 w-4 text-brand" />
                      {telegramStatus.linked
                        ? (isTelegramSendingTest ? 'Enviando aviso' : 'Probar Telegram')
                        : (isTelegramLinking ? 'Abriendo Telegram' : 'Conectar Telegram')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsProfileSettingsOpen(true)}
                    className={cn(
                        'inline-flex items-center gap-2 rounded-[0.95rem] px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] transition-all',
                      isDarkMode ? 'bg-white text-slate-950 hover:bg-slate-100' : 'bg-slate-950 text-white hover:bg-slate-800'
                    )}
                  >
                    <Settings2 className="h-4 w-4 text-brand" />
                    Configurar perfil
                  </button>
                </>
              }
            >
              <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_248px]">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {[
                      viewerAccountLabel,
                      viewerGpsLabel,
                      telegramStatus.linked ? 'Telegram activo' : 'Telegram pendiente',
                      favorites.length > 0 ? `${favorites.length} favoritas guardadas` : 'Empieza tu lista de favoritas',
                    ].map((item) => (
                      <span
                        key={item}
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.16em]',
                          isDarkMode ? 'bg-white/8 text-white/80' : 'bg-white/80 text-slate-600'
                        )}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                  <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-4">
                    <ProfileQuickMetric
                      isDarkMode={isDarkMode}
                      icon={Heart}
                      label="Favoritos"
                      value={String(favorites.length).padStart(2, '0')}
                      helper="Monumentos guardados listos para volver al mapa."
                    />
                    <ProfileQuickMetric
                      isDarkMode={isDarkMode}
                      icon={Compass}
                      label="GPS"
                      value={
                        locationStatus === 'ready'
                          ? 'Activo'
                          : locationStatus === 'loading'
                            ? 'Buscando'
                            : locationStatus === 'blocked'
                              ? 'Bloq.'
                              : 'Apagado'
                      }
                      helper={
                        locationStatus === 'ready'
                          ? 'La ubicacion ya puede afinar rutas y distancias.'
                          : 'Activa tu posicion para mejorar recomendaciones y trayectos.'
                      }
                    />
                    <ProfileQuickMetric
                      isDarkMode={isDarkMode}
                      icon={Radio}
                      label="Telegram"
                      value={
                        telegramStatus.linked
                          ? 'Activo'
                          : viewer.isRegistered
                            ? 'Pendiente'
                            : 'No disp.'
                      }
                      helper={
                        telegramStatus.linked
                          ? `Avisos listos${telegramStatus.telegramUsername ? ` con @${telegramStatus.telegramUsername}` : ''}.`
                          : viewer.isRegistered
                            ? 'Conecta tu bot para recibir avisos fuera de la app.'
                            : 'Solo disponible para usuarios registrados.'
                      }
                    />
                    <ProfileQuickMetric
                      isDarkMode={isDarkMode}
                      icon={MessageCircle}
                      label="Acceso"
                      value={viewer.accessType === 'guest' ? 'Invitado' : 'Registrado'}
                      helper={`Sesion activa en ${viewer.location}.`}
                    />
                  </div>
                </div>

                <div
                  className={cn(
                    'rounded-[1.45rem] border p-3',
                    isDarkMode ? 'border-white/10 bg-white/[0.07]' : 'border-white/70 bg-white/88 shadow-[0_18px_40px_rgba(15,23,42,0.08)]'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="relative shrink-0">
                      <img
                        src={viewer.avatar}
                        alt={viewer.name}
                        className="h-14 w-14 rounded-[1.15rem] border-2 border-white/80 object-cover shadow-xl"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-[0.7rem] bg-brand text-white shadow-lg">
                        <Star className="h-3 w-3 fill-current" />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-brand">Perfil activo</p>
                      <h3 className="mt-1 text-[1.05rem] font-black leading-none tracking-tight">{viewer.name}</h3>
                      <p className="mt-1 text-[9px] font-black uppercase tracking-[0.18em] opacity-55">{viewer.handle}</p>
                    </div>
                  </div>

                  <div className="mt-2.5 grid gap-1.5">
                    <div className={cn('flex items-center justify-between gap-2 rounded-[0.95rem] px-2 py-2', isDarkMode ? 'bg-white/6' : 'bg-slate-50')}>
                      <div className="flex items-center gap-3">
                        <div className={cn('flex h-8 w-8 items-center justify-center rounded-[0.8rem]', isDarkMode ? 'bg-brand/18 text-brand' : 'bg-brand/10 text-brand')}>
                          <MapPin className="h-3 w-3" />
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-[0.16em] opacity-40">Ubicacion</p>
                          <p className="text-[12px] font-black leading-4">{viewer.location}</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-[0.16em] opacity-45">{viewerGpsLabel}</span>
                    </div>
                    <div className={cn('flex items-center justify-between gap-2 rounded-[0.95rem] px-2 py-2', isDarkMode ? 'bg-white/6' : 'bg-slate-50')}>
                      <div className="flex items-center gap-3">
                        <div className={cn('flex h-8 w-8 items-center justify-center rounded-[0.8rem]', isDarkMode ? 'bg-brand/18 text-brand' : 'bg-brand/10 text-brand')}>
                          <Radio className="h-3 w-3" />
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-[0.16em] opacity-40">Telegram</p>
                          <p className="text-[12px] font-black leading-4">{telegramStatus.linked ? 'Conectado' : 'Pendiente'}</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-[0.16em] opacity-45">{telegramStatusLabel}</span>
                    </div>
                    <div className={cn('flex items-center justify-between gap-2 rounded-[0.95rem] px-2 py-2', isDarkMode ? 'bg-white/6' : 'bg-slate-50')}>
                      <div className="flex items-center gap-3">
                        <div className={cn('flex h-8 w-8 items-center justify-center rounded-[0.8rem]', isDarkMode ? 'bg-brand/18 text-brand' : 'bg-brand/10 text-brand')}>
                          <Clock className="h-3 w-3" />
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-[0.16em] opacity-40">Ultima actividad</p>
                          <p className="text-[12px] font-black leading-4">{viewerAccountLabel}</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-[0.16em] opacity-45">{telegramLinkedMoment}</span>
                    </div>
                  </div>

                  {telegramNotice ? (
                    <p className="mt-2 text-[9px] font-black uppercase tracking-[0.14em] text-brand/80">{telegramNotice}</p>
                  ) : null}
                </div>
              </div>
            </SectionHero>

            <div className="grid grid-cols-1 gap-8 xl:grid-cols-[320px_minmax(0,1fr)]">
              <DashboardSurface isDarkMode={isDarkMode} className="space-y-5 px-5 py-5 xl:sticky xl:top-8">
                <div
                  className={cn(
                    'overflow-hidden rounded-[2rem] border p-4',
                    isDarkMode ? 'border-white/10 bg-white/[0.06]' : 'border-slate-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))]'
                  )}
                >
                  <div className="relative overflow-hidden rounded-[1.7rem] border px-4 py-4 text-center">
                    <div className={cn('absolute inset-0', isDarkMode ? 'bg-[radial-gradient(circle_at_top,rgba(255,99,33,0.24),transparent_58%)]' : 'bg-[radial-gradient(circle_at_top,rgba(255,99,33,0.18),transparent_58%)]')} />
                    <div className="relative z-10 [&>p:nth-of-type(2)]:hidden">
                      <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-[1.6rem] border-2 border-white/80 bg-slate-100 shadow-xl">
                        <img
                          src={viewer.avatar}
                          alt={viewer.name}
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <h2 className="mt-4 text-[1.8rem] font-black leading-none tracking-tight">{viewer.name}</h2>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-brand">{viewer.handle}</p>
                      <div className="mt-3 text-[11px] font-black uppercase tracking-[0.16em] opacity-55">{viewerAccountLabel} | {viewer.location}</div>
                      <p className="mt-3 text-[11px] font-black uppercase tracking-[0.16em] opacity-55">{viewerAccountLabel} Ã‚Â· {viewer.location}</p>
                    </div>
                  </div>
                  <p className="hidden">
                    {telegramStatus.linked
                      ? `Telegram conectado${telegramStatus.telegramUsername ? ` Ã‚Â· @${telegramStatus.telegramUsername}` : ''}`
                      : 'Telegram pendiente de vinculacion'}
                  </p>
                  {telegramNotice && (
                    <p className="hidden">
                      {telegramNotice}
                    </p>
                  )}

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className={cn('rounded-[1.15rem] px-3 py-3', isDarkMode ? 'bg-white/6' : 'bg-slate-50')}>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-40">Favoritas</p>
                      <p className="mt-1 text-[1.2rem] font-black leading-none">{String(favorites.length).padStart(2, '0')}</p>
                    </div>
                    <div className={cn('rounded-[1.15rem] px-3 py-3', isDarkMode ? 'bg-white/6' : 'bg-slate-50')}>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-40">Telegram</p>
                      <p className="mt-1 text-[1.2rem] font-black leading-none">{telegramStatus.linked ? 'Activo' : 'Pendiente'}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2.5">
                    <div className={cn('flex items-center justify-between gap-3 rounded-[1.15rem] px-3 py-3', isDarkMode ? 'bg-white/6' : 'bg-slate-50')}>
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-brand" />
                        <span className="text-xs font-black uppercase tracking-[0.14em] opacity-55">Ubicacion base</span>
                      </div>
                      <span className="text-xs font-black">{viewer.location}</span>
                    </div>
                    <div className={cn('flex items-center justify-between gap-3 rounded-[1.15rem] px-3 py-3', isDarkMode ? 'bg-white/6' : 'bg-slate-50')}>
                      <div className="flex items-center gap-3">
                        <Compass className="h-4 w-4 text-brand" />
                        <span className="text-xs font-black uppercase tracking-[0.14em] opacity-55">Estado GPS</span>
                      </div>
                      <span className="text-xs font-black">{viewerGpsLabel}</span>
                    </div>
                    <div className={cn('flex items-center justify-between gap-3 rounded-[1.15rem] px-3 py-3', isDarkMode ? 'bg-white/6' : 'bg-slate-50')}>
                      <div className="flex items-center gap-3">
                        <Radio className="h-4 w-4 text-brand" />
                        <span className="text-xs font-black uppercase tracking-[0.14em] opacity-55">Avisos</span>
                      </div>
                      <span className="text-xs font-black">{telegramStatusLabel}</span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveTab('Social')}
                    className={cn(
                      'inline-flex items-center justify-center gap-2 rounded-[1rem] px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] transition-all',
                      isDarkMode ? 'bg-white/8 text-white hover:bg-white/12' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    )}
                  >
                    Abrir social
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('Mapa')}
                    className={cn(
                      'inline-flex items-center justify-center gap-2 rounded-[1rem] px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] transition-all',
                      isDarkMode ? 'bg-white/8 text-white hover:bg-white/12' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    )}
                  >
                    Volver al mapa
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('Fallas')}
                    className="inline-flex items-center justify-center gap-2 rounded-[1rem] bg-brand px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-xl shadow-brand/25 transition-all hover:scale-[1.01]"
                  >
                    Ver favoritas en catalogo
                  </button>
                  {viewer.isRegistered && (
                    <button
                      type="button"
                      onClick={handleLogout}
                      className={cn(
                        'inline-flex items-center justify-center gap-2 rounded-[1rem] px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] transition-all',
                        isDarkMode ? 'bg-white/8 text-white hover:bg-white/12' : 'bg-slate-950 text-white hover:bg-slate-800'
                      )}
                    >
                      <LogOut className="h-4 w-4" />
                      Cerrar sesion
                    </button>
                  )}
                </div>

                <div className={cn('rounded-[1.8rem] border p-4', isDarkMode ? 'border-white/10 bg-white/[0.05]' : 'border-slate-100 bg-slate-50/70')}>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Resumen rapido</p>
                  <p className="mt-3 text-sm font-bold leading-6 opacity-65">
                    {favorites.length > 0
                      ? `Tu panel ya guarda ${favorites.length} favoritas y esta listo para abrir fichas o volver al mapa sin perder contexto.`
                      : 'Aun no has creado una lista propia. Guarda tus primeras fallas y este panel se convertira en tu acceso rapido diario.'}
                  </p>
                  <div className="mt-4 flex items-center gap-3 rounded-[1.15rem] bg-brand/10 px-3 py-3 text-brand">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[0.95rem] bg-brand text-white">
                      {viewerInitials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-70">Perfil visible</p>
                      <p className={cn('truncate text-sm font-black', isDarkMode ? 'text-white' : 'text-slate-900')}>{viewer.name}</p>
                    </div>
                  </div>
                </div>
              </DashboardSurface>
            */}

            <div className="space-y-8">
                {isAdminViewer && (
                  <DashboardSurface isDarkMode={isDarkMode} className="space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Herramientas admin</p>
                        <h3 className="mt-2 text-[1.5rem] font-black leading-none tracking-tight">Telegram y Cendra quedan fuera del ruido principal.</h3>
                        <p className="mt-3 text-sm font-bold leading-6 opacity-60">
                          Este bloque agrupa los dos paneles operativos del perfil en pestaÃƒÂ±as.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn('inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em]', isDarkMode ? 'bg-white/8 text-white/76' : 'bg-slate-100 text-slate-600')}>
                          PestaÃƒÂ±a activa: {activeAdminProfileTab}
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsAdminToolsExpanded((current) => !current)}
                          className={cn(
                            'inline-flex items-center justify-center rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all',
                            isDarkMode ? 'bg-white text-slate-950 hover:bg-slate-100' : 'bg-slate-950 text-white hover:bg-slate-800'
                          )}
                        >
                          {isAdminToolsExpanded ? 'Ocultar' : 'Abrir'}
                        </button>
                      </div>
                    </div>

                    {isAdminToolsExpanded ? (
                      <div className={cn('rounded-[1.35rem] border p-3', isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white/80')}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Fallas Live</p>
                            <p className="mt-1 text-sm font-bold leading-6 opacity-65">
                              Calcula actividad en segundo plano. Solo admin puede apagar el modulo completo.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsFallasLiveModuleEnabled((current) => !current)}
                            className={cn(
                              'inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] transition-all',
                              isFallasLiveModuleEnabled
                                ? 'bg-emerald-500 text-white shadow-[0_16px_30px_rgba(16,185,129,0.24)]'
                                : isDarkMode ? 'bg-white/10 text-white/72 hover:bg-white/14' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            )}
                          >
                            <Activity className="h-4 w-4" />
                            {isFallasLiveModuleEnabled ? 'Modulo activo' : 'Modulo apagado'}
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {isAdminToolsExpanded ? (
                      <div className={cn(
                        'inline-flex flex-wrap gap-2 rounded-[1.4rem] p-2',
                        isDarkMode ? 'bg-white/5' : 'bg-slate-100'
                      )}>
                      <button
                        type="button"
                        onClick={() => setActiveAdminProfileTab('telegram')}
                        className={cn(
                          'inline-flex items-center justify-center rounded-[1rem] px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.16em] transition-all',
                          activeAdminProfileTab === 'telegram'
                            ? (isDarkMode ? 'bg-white text-slate-950' : 'bg-slate-950 text-white')
                            : (isDarkMode ? 'bg-transparent text-white/72 hover:bg-white/8' : 'bg-transparent text-slate-600 hover:bg-white')
                        )}
                      >
                        Telegram
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveAdminProfileTab('cendra')}
                        className={cn(
                          'inline-flex items-center justify-center rounded-[1rem] px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.16em] transition-all',
                          activeAdminProfileTab === 'cendra'
                            ? (isDarkMode ? 'bg-white text-slate-950' : 'bg-slate-950 text-white')
                            : (isDarkMode ? 'bg-transparent text-white/72 hover:bg-white/8' : 'bg-transparent text-slate-600 hover:bg-white')
                        )}
                      >
                        Noticias
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveAdminProfileTab('historias')}
                        className={cn(
                          'inline-flex items-center justify-center rounded-[1rem] px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.16em] transition-all',
                          activeAdminProfileTab === 'historias'
                            ? (isDarkMode ? 'bg-white text-slate-950' : 'bg-slate-950 text-white')
                            : (isDarkMode ? 'bg-transparent text-white/72 hover:bg-white/8' : 'bg-transparent text-slate-600 hover:bg-white')
                        )}
                      >
                        Historias
                      </button>
                      </div>
                    ) : (
                      <p className="text-sm font-bold leading-6 opacity-55">
                        Las herramientas quedan plegadas hasta que necesites publicar, sincronizar o revisar el canal.
                      </p>
                    )}
                  </DashboardSurface>
                )}

                {isAdminViewer && isAdminToolsExpanded && activeAdminProfileTab === 'cendra' && (
                  <DashboardSurface isDarkMode={isDarkMode} className="space-y-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Sincronizacion de noticias</p>
                        <h3 className="mt-2 text-[1.5rem] font-black leading-none tracking-tight">Importa articulos falleros y registra cada ejecucion.</h3>
                        <p className="mt-3 text-sm font-bold leading-6 opacity-60">
                          {cendraSyncStatus.sourceUrl ?? 'Configura CENDRA_SYNC_SOURCE_URL en el entorno para activar la fuente.'}
                        </p>
                      </div>
                      <span className={cn('inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em]', isDarkMode ? 'bg-white/8 text-white/76' : 'bg-slate-100 text-slate-600')}>
                        {cendraSyncStatus.latestRun ? `Estado: ${cendraSyncStatus.latestRun.status}` : (cendraSyncStatus.configured ? 'Listo para sync' : 'Sin configurar')}
                      </span>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-5">
                      <DashboardMetric
                        isDarkMode={isDarkMode}
                        icon={Sparkles}
                        label="Articulos Cendra"
                        value={String(cendraSyncStatus.articlesTotal)}
                        helper="Registros guardados en cendra_articles."
                      />
                      <DashboardMetric
                        isDarkMode={isDarkMode}
                        icon={MessageCircle}
                        label="Pendientes Telegram"
                        value={String(cendraSyncStatus.pendingTelegramArticles)}
                        helper="Articulos todavia no marcados como enviados."
                      />
                      <DashboardMetric
                        isDarkMode={isDarkMode}
                        icon={Newspaper}
                        label="En landing"
                        value={String(cendraSyncStatus.landingArticles)}
                        helper="Noticias visibles en la portada publica."
                      />
                      <DashboardMetric
                        isDarkMode={isDarkMode}
                        icon={CalendarDays}
                        label="Ultimo articulo"
                        value={cendraLatestArticleMoment}
                        helper="Fecha mas reciente registrada desde Cendra."
                      />
                      <DashboardMetric
                        isDarkMode={isDarkMode}
                        icon={Clock}
                        label="Ultimo sync"
                        value={cendraLatestRunMoment}
                        helper={cendraSyncStatus.latestRun?.status ? `Estado ${cendraSyncStatus.latestRun.status}.` : 'Todavia no hay ejecuciones registradas.'}
                      />
                    </div>

                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
                      <div className={cn(
                        'rounded-[1.7rem] border p-4',
                        isDarkMode ? 'border-white/10 bg-white/[0.045]' : 'border-slate-100 bg-slate-50/70'
                      )}>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Buscador Cendra</p>
                            <p className="mt-2 text-sm font-bold leading-6 opacity-60">Busca todo lo importado desde Cendra. El bot te envia la version ampliada en privado y el canal publica una version adaptada para Falles360.</p>
                          </div>
                          {(isCendraSyncLoading || isCendraSearchLoading) ? (
                            <span className="text-[10px] font-black uppercase tracking-[0.16em] opacity-45">Cargando</span>
                          ) : null}
                        </div>

                        <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={(event) => void handleCendraSearchSubmit(event)}>
                          <input
                            type="text"
                            value={cendraSearchQuery}
                            onChange={(event) => setCendraSearchQuery(event.target.value)}
                            placeholder="Buscar en Cendra por titulo, resumen o contenido"
                            className={cn(
                              'min-h-[54px] flex-1 rounded-[1.25rem] border px-4 text-sm font-bold outline-none transition-all',
                              isDarkMode ? 'border-white/10 bg-white/5 text-white placeholder:text-white/35' : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400'
                            )}
                          />
                          <button
                            type="submit"
                            disabled={isCendraSearchLoading}
                            className={cn(
                              'inline-flex items-center justify-center rounded-[1.25rem] px-5 py-3 text-[11px] font-black uppercase tracking-[0.16em] transition-all disabled:cursor-not-allowed disabled:opacity-60',
                              isDarkMode ? 'bg-white text-slate-950 hover:bg-slate-100' : 'bg-slate-950 text-white hover:bg-slate-800'
                            )}
                          >
                            {isCendraSearchLoading ? 'Buscando' : 'Buscar'}
                          </button>
                        </form>

                        <div className="mt-4 space-y-3">
                          {cendraArticles.length > 0 ? (
                            cendraArticles.map((article) => (
                              <div
                                key={article.id}
                                className={cn(
                                  'rounded-[1.35rem] border p-4 transition-all',
                                  isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white'
                                )}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-brand">
                                      {article.category || 'Cendra'}
                                    </p>
                                    <strong className="mt-2 block text-sm font-black leading-6">
                                      {article.title}
                                    </strong>
                                  </div>
                                  <div className="flex shrink-0 flex-wrap justify-end gap-2">
                                    <span className={cn(
                                      'inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em]',
                                      article.telegramSent
                                        ? (isDarkMode ? 'bg-emerald-500/14 text-emerald-200' : 'bg-emerald-50 text-emerald-700')
                                        : (isDarkMode ? 'bg-white/8 text-white/72' : 'bg-slate-100 text-slate-600')
                                    )}>
                                      {article.telegramSent ? 'Canal' : 'Pendiente'}
                                    </span>
                                    <span className={cn(
                                      'inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em]',
                                      article.landingPublished
                                        ? (isDarkMode ? 'bg-brand/20 text-white' : 'bg-brand/10 text-brand')
                                        : (isDarkMode ? 'bg-white/8 text-white/56' : 'bg-slate-100 text-slate-500')
                                    )}>
                                      {article.landingPublished ? 'Landing' : 'No landing'}
                                    </span>
                                  </div>
                                </div>
                                {(article.excerpt || article.summary) ? (
                                  <p className="mt-3 text-sm font-bold leading-6 opacity-65">
                                    {article.excerpt || article.summary}
                                  </p>
                                ) : null}
                                <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] opacity-45">
                                  {formatDashboardDateTime(article.publishedAt)}{article.author ? ` Ã‚Â· ${article.author}` : ''}
                                </p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                  <a
                                    href={article.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={cn(
                                      'inline-flex items-center justify-center rounded-[1rem] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all',
                                      isDarkMode ? 'bg-white/8 text-white hover:bg-white/12' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    )}
                                  >
                                    Abrir fuente
                                  </a>
                                  <button
                                    type="button"
                                    disabled={cendraArticleActionId === article.id && cendraArticleActionKind === 'send-bot'}
                                    onClick={() => void handleSendCendraArticleToBot(article.id)}
                                    className={cn(
                                      'inline-flex items-center justify-center rounded-[1rem] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all disabled:cursor-not-allowed disabled:opacity-60',
                                      isDarkMode ? 'bg-white/10 text-white hover:bg-white/14' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    )}
                                  >
                                    {cendraArticleActionId === article.id && cendraArticleActionKind === 'send-bot' ? 'Enviando al bot' : 'Enviar completo a mi bot'}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={cendraArticleActionId === article.id && cendraArticleActionKind === 'publish-channel'}
                                    onClick={() => void handlePublishCendraArticle(article.id)}
                                    className={cn(
                                      'inline-flex items-center justify-center rounded-[1rem] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all disabled:cursor-not-allowed disabled:opacity-60',
                                      isDarkMode ? 'bg-brand/18 text-white hover:bg-brand/26' : 'bg-brand/10 text-brand hover:bg-brand/15'
                                    )}
                                  >
                                    {cendraArticleActionId === article.id && cendraArticleActionKind === 'publish-channel' ? 'Publicando canal' : 'Publicar en canal'}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={cendraArticleActionId === article.id && cendraArticleActionKind === 'landing'}
                                    onClick={() => void handleToggleCendraLandingArticle(article)}
                                    className={cn(
                                      'inline-flex items-center justify-center rounded-[1rem] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all disabled:cursor-not-allowed disabled:opacity-60',
                                      article.landingPublished
                                        ? (isDarkMode ? 'bg-white/10 text-white hover:bg-white/14' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')
                                        : (isDarkMode ? 'bg-brand text-white hover:bg-brand/90' : 'bg-brand text-white hover:bg-brand/90')
                                    )}
                                  >
                                    {cendraArticleActionId === article.id && cendraArticleActionKind === 'landing'
                                      ? 'Actualizando landing'
                                      : article.landingPublished ? 'Quitar de landing' : 'Publicar en landing'}
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className={cn(
                              'rounded-[1.35rem] border border-dashed p-6 text-sm font-bold leading-6 opacity-60',
                              isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white'
                            )}>
                              Todavia no hay articulos de Cendra para esa busqueda.
                            </div>
                          )}
                        </div>
                      </div>

                      <div className={cn(
                        'rounded-[1.7rem] border p-4',
                        isDarkMode ? 'border-white/10 bg-white/[0.045]' : 'border-slate-100 bg-slate-50/70'
                      )}>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Ejecucion manual</p>
                        <h4 className="mt-3 text-[1.2rem] font-black leading-tight">Lanza el sync ahora mismo desde el dashboard.</h4>
                          <p className="mt-3 text-sm font-bold leading-6 opacity-60">
                          Usa la misma logica del runner PHP, registra el resultado en cendra_sync_runs y te permite revisar borradores antes de publicarlos en el canal.
                          </p>

                        <div className={cn(
                          'mt-4 rounded-[1.35rem] border p-4',
                          isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white'
                        )}>
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-45">Ultima ejecucion</p>
                          <p className="mt-2 text-sm font-bold leading-6">
                            {cendraSyncStatus.latestRun?.notes || 'Todavia no hay detalle registrado.'}
                          </p>
                        </div>

                        <div className="mt-4 flex flex-col gap-3">
                          {cendraSyncNotice ? (
                            <p className="text-sm font-bold leading-6 text-brand">{cendraSyncNotice}</p>
                          ) : (
                            <p className="text-sm font-bold leading-6 opacity-55">
                              {cendraSyncStatus.configured
                                ? 'La fuente esta lista. Puedes ejecutar la sincronizacion cuando quieras.'
                                : 'Falta configurar la URL de origen en CENDRA_SYNC_SOURCE_URL.'}
                            </p>
                          )}

                          <button
                            type="button"
                            disabled={isCendraSyncRunning || isCendraSyncLoading}
                            onClick={() => void handleRunCendraSync()}
                            className={cn(
                              'inline-flex items-center justify-center gap-2 rounded-[1.25rem] px-5 py-3 text-[11px] font-black uppercase tracking-[0.16em] transition-all disabled:cursor-not-allowed disabled:opacity-60',
                              isDarkMode ? 'bg-white text-slate-950 hover:bg-slate-100' : 'bg-slate-950 text-white hover:bg-slate-800'
                            )}
                          >
                            {isCendraSyncRunning ? 'Sincronizando Cendra' : 'Sincronizar Cendra ahora'}
                          </button>

                          <button
                            type="button"
                            disabled={isCendraDraftGenerating || isCendraSyncLoading}
                            onClick={() => void handleGenerateCendraTelegramDraft()}
                            className={cn(
                              'inline-flex items-center justify-center gap-2 rounded-[1.25rem] px-5 py-3 text-[11px] font-black uppercase tracking-[0.16em] transition-all disabled:cursor-not-allowed disabled:opacity-60',
                              isDarkMode ? 'bg-white/10 text-white hover:bg-white/14' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            )}
                          >
                            {isCendraDraftGenerating ? 'Preparando resumen diario' : 'Pasar resumen al Telegram'}
                          </button>

                          <button
                            type="button"
                            disabled={isCendraTelegramSending || isCendraSyncLoading}
                            onClick={() => void handleSendCendraSummaryToMyTelegram()}
                            className={cn(
                              'inline-flex items-center justify-center gap-2 rounded-[1.25rem] px-5 py-3 text-[11px] font-black uppercase tracking-[0.16em] transition-all disabled:cursor-not-allowed disabled:opacity-60',
                              isDarkMode ? 'bg-brand/18 text-white hover:bg-brand/26' : 'bg-brand/10 text-brand hover:bg-brand/15'
                            )}
                          >
                            {isCendraTelegramSending ? 'Enviando al bot' : 'Recibir resumen con confirmacion'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </DashboardSurface>
                )}

                {isAdminViewer && isAdminToolsExpanded && activeAdminProfileTab === 'historias' && (
                  <DashboardSurface isDarkMode={isDarkMode} className="space-y-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Historias de marca</p>
                        <h3 className="mt-2 text-[1.5rem] font-black leading-none tracking-tight">Convierte noticias de Cendra en piezas listas para stories.</h3>
                        <p className="mt-3 text-sm font-bold leading-6 opacity-60">
                          Genera una imagen vertical 1080x1920 con identidad Falles360 y copia el texto de apoyo para publicar rapido.
                        </p>
                      </div>
                      <span className={cn('inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em]', isDarkMode ? 'bg-white/8 text-white/76' : 'bg-slate-100 text-slate-600')}>
                        {cendraStoryArticles.length} noticias listas
                      </span>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.28fr)]">
                      <div className={cn(
                        'overflow-hidden rounded-[2rem] border p-5',
                        isDarkMode ? 'border-white/10 bg-[linear-gradient(160deg,#ffe1aa_0%,#ff541c_58%,#081426_100%)] text-white' : 'border-orange-100 bg-[linear-gradient(160deg,#ffe8bd_0%,#ff541c_58%,#071326_100%)] text-white'
                      )}>
                        <div className="relative flex min-h-[520px] flex-col justify-between overflow-hidden rounded-[1.5rem] border border-white/18 p-5 shadow-2xl backdrop-blur-sm">
                          <div className="pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full bg-white/18" />
                          <div className="pointer-events-none absolute -right-10 bottom-20 h-56 w-56 rounded-full bg-white/10" />
                          <div className="relative flex items-center justify-between gap-3 rounded-[1.15rem] bg-white px-4 py-3 text-slate-950 shadow-xl">
                            <div className="inline-flex items-baseline gap-2 text-[1.7rem] font-black tracking-tight">
                              <span>Falles</span>
                              <span className="text-[#ff3d0a]">360</span>
                            </div>
                            <span className="max-w-[145px] border-l border-slate-200 pl-4 text-[8px] font-black uppercase leading-4 tracking-[0.14em] text-slate-500">Notícia per a històries</span>
                          </div>
                          <div className="relative">
                            <p className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white">Actualitat fallera</p>
                            <h4 className="mt-5 text-[2.35rem] font-black leading-[0.98] tracking-tight text-white drop-shadow-lg sm:text-[2.65rem]">Titular faller llest per a xarxes</h4>
                          </div>
                          <div className="relative rounded-[1.35rem] bg-white/94 p-4 text-slate-950 shadow-xl">
                            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#ff4b12] text-white">▵</span>
                            <p className="text-sm font-black leading-6">Plantilla vertical con marca, etiqueta, titular grande, contexto y fuente para publicar historias de Falles360.</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {cendraStoryNotice ? (
                          <p className="rounded-[1.15rem] bg-brand/10 px-4 py-3 text-sm font-bold leading-6 text-brand">{cendraStoryNotice}</p>
                        ) : (
                          <p className="rounded-[1.15rem] px-4 py-3 text-sm font-bold leading-6 opacity-60">
                            Usa las noticias importadas. Si necesitas otras, sincroniza o busca primero en la pestana Noticias.
                          </p>
                        )}

                        {cendraStoryArticles.length > 0 ? (
                          <div className="grid gap-3 lg:grid-cols-2">
                            {cendraStoryArticles.slice(0, 10).map((article) => (
                              <div
                                key={article.id}
                                className={cn(
                                  'rounded-[1.55rem] border p-4',
                                  isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white'
                                )}
                              >
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">{article.category || 'Actualidad fallera'}</p>
                                <h4 className="mt-2 text-base font-black leading-tight">{article.title}</h4>
                                {(article.excerpt || article.summary) ? (
                                  <p className="mt-3 line-clamp-3 text-sm font-bold leading-6 opacity-65">{article.excerpt || article.summary}</p>
                                ) : null}
                                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] opacity-45">
                                  {formatDashboardDateTime(article.publishedAt)}{article.author ? ` | ${article.author}` : ''}
                                </p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    disabled={isCendraStoryPreparing}
                                    onClick={() => handleDownloadCendraStory(article)}
                                    className={cn(
                                      'inline-flex items-center justify-center rounded-[1rem] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all disabled:cursor-not-allowed disabled:opacity-60',
                                      isDarkMode ? 'bg-brand/18 text-white hover:bg-brand/26' : 'bg-brand/10 text-brand hover:bg-brand/15'
                                    )}
                                  >
                                    {isCendraStoryPreparing ? 'Preparando' : 'Descargar story'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleCopyCendraStoryCaption(article)}
                                    className={cn(
                                      'inline-flex items-center justify-center rounded-[1rem] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all',
                                      isDarkMode ? 'bg-white/10 text-white hover:bg-white/14' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    )}
                                  >
                                    Copiar texto
                                  </button>
                                  <a
                                    href={article.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={cn(
                                      'inline-flex items-center justify-center rounded-[1rem] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all',
                                      isDarkMode ? 'bg-white/8 text-white hover:bg-white/12' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    )}
                                  >
                                    Fuente
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className={cn(
                            'rounded-[1.55rem] border border-dashed p-6 text-sm font-bold leading-6 opacity-60',
                            isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white'
                          )}>
                            Todavia no hay noticias de Cendra cargadas para preparar historias.
                          </div>
                        )}
                      </div>
                    </div>
                  </DashboardSurface>
                )}

                {isAdminViewer && isAdminToolsExpanded && activeAdminProfileTab === 'telegram' && (
                  <DashboardSurface isDarkMode={isDarkMode} className="space-y-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Centro de avisos Telegram</p>
                        <h3 className="mt-2 text-[1.5rem] font-black leading-none tracking-tight">Lanza avisos al canal y a usuarios vinculados.</h3>
                        <p className="mt-3 text-sm font-bold leading-6 opacity-60">
                          El bloque solo aparece con rol admin y usa la sesion real del usuario autenticado.
                        </p>
                      </div>
                      <span className={cn('inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em]', isDarkMode ? 'bg-white/8 text-white/76' : 'bg-slate-100 text-slate-600')}>
                        Destino: {adminTelegramForm.target}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className={cn(
                        'flex flex-col gap-3 rounded-[1.5rem] border p-4 sm:flex-row sm:items-center sm:justify-between',
                        isDarkMode ? 'border-white/10 bg-white/[0.045]' : 'border-slate-200 bg-white'
                      )}>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Monitor Fallas 360</p>
                          <p className="mt-2 text-sm font-bold leading-6 opacity-60">
                            Envia a tu bot vinculado el resumen de actualizaciones detectadas en las ultimas 24 horas.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleSendMonitorSummaryToMyTelegram()}
                          disabled={isMonitorSummarySending}
                          className={cn(
                            'inline-flex items-center justify-center gap-2 rounded-[1rem] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] transition-all disabled:cursor-not-allowed disabled:opacity-60',
                            isDarkMode ? 'bg-brand/18 text-white hover:bg-brand/26' : 'bg-brand/10 text-brand hover:bg-brand/15'
                          )}
                        >
                          {isMonitorSummarySending ? 'Enviando resumen' : 'Enviar resumen a Telegram'}
                        </button>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Plantillas profesionales</p>
                          <p className="mt-2 text-sm font-bold leading-6 opacity-60">
                            Carga una base editorial y ajusta el contenido antes de publicar.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleResetAdminTelegramForm}
                          className={cn(
                            'inline-flex items-center justify-center gap-2 rounded-[1rem] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] transition-all',
                            isDarkMode ? 'bg-white/8 text-white hover:bg-white/12' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          )}
                        >
                          Limpiar formulario
                        </button>
                      </div>

                      <div className="grid gap-3 xl:grid-cols-2">
                        {ADMIN_TELEGRAM_TEMPLATES.map((template) => (
                          <button
                            key={template.key}
                            type="button"
                            onClick={() => handleApplyAdminTemplate(template)}
                            className={cn(
                              'rounded-[1.5rem] border p-4 text-left transition-all',
                              activeAdminTemplateKey === template.key
                                ? isDarkMode
                                  ? 'border-brand bg-brand/12 text-white shadow-lg shadow-brand/10'
                                  : 'border-brand bg-brand/5 text-slate-900 shadow-lg shadow-brand/10'
                                : isDarkMode
                                  ? 'border-white/10 bg-white/5 text-white hover:border-white/18 hover:bg-white/8'
                                  : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50'
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-brand">{template.type}</p>
                                <strong className="mt-2 block text-base font-black leading-tight">{template.name}</strong>
                              </div>
                              <span className={cn(
                                'inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em]',
                                isDarkMode ? 'bg-white/8 text-white/72' : 'bg-slate-100 text-slate-600'
                              )}>
                                {template.target}
                              </span>
                            </div>
                            <p className="mt-3 text-sm font-bold leading-6 opacity-65">{template.summary}</p>
                            <p className="mt-4 text-[12px] font-black uppercase tracking-[0.14em] opacity-45">
                              {template.title}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <form className="grid gap-4 lg:grid-cols-2" onSubmit={(event) => void handleAdminTelegramSubmit(event)}>
                      <label className="grid gap-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.18em] opacity-55">Tipo</span>
                        <select
                          value={adminTelegramForm.type}
                          onChange={(event) => handleAdminTelegramFieldChange('type', event.target.value)}
                          className={cn(
                            'min-h-[56px] rounded-[1.35rem] border px-4 text-sm font-bold outline-none transition-all',
                            isDarkMode ? 'border-white/10 bg-white/5 text-white' : 'border-slate-200 bg-white text-slate-900'
                          )}
                        >
                          <option value="aviso">Aviso</option>
                          <option value="novedad">Novedad</option>
                          <option value="ruta">Ruta</option>
                        </select>
                      </label>

                      <label className="grid gap-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.18em] opacity-55">Destino</span>
                        <select
                          value={adminTelegramForm.target}
                          onChange={(event) => handleAdminTelegramFieldChange('target', event.target.value)}
                          className={cn(
                            'min-h-[56px] rounded-[1.35rem] border px-4 text-sm font-bold outline-none transition-all',
                            isDarkMode ? 'border-white/10 bg-white/5 text-white' : 'border-slate-200 bg-white text-slate-900'
                          )}
                        >
                          <option value="channel">Canal Falles360</option>
                          <option value="users">Usuarios vinculados</option>
                          <option value="both">Canal + usuarios</option>
                        </select>
                      </label>

                      <label className="grid gap-2 lg:col-span-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.18em] opacity-55">Titulo</span>
                        <input
                          type="text"
                          value={adminTelegramForm.title}
                          onChange={(event) => handleAdminTelegramFieldChange('title', event.target.value)}
                          required
                          placeholder="Titulo del aviso"
                          className={cn(
                            'min-h-[56px] rounded-[1.35rem] border px-4 text-sm font-bold outline-none transition-all',
                            isDarkMode ? 'border-white/10 bg-white/5 text-white placeholder:text-white/35' : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400'
                          )}
                        />
                      </label>

                      <label className="grid gap-2 lg:col-span-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.18em] opacity-55">Detalle</span>
                        <textarea
                          value={adminTelegramForm.detail}
                          onChange={(event) => handleAdminTelegramFieldChange('detail', event.target.value)}
                          rows={4}
                          placeholder="Detalle del aviso"
                          className={cn(
                            'rounded-[1.35rem] border px-4 py-4 text-sm font-bold outline-none transition-all',
                            isDarkMode ? 'border-white/10 bg-white/5 text-white placeholder:text-white/35' : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400'
                          )}
                        />
                      </label>

                      <label className="grid gap-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.18em] opacity-55">Ubicacion</span>
                        <input
                          type="text"
                          value={adminTelegramForm.location}
                          onChange={(event) => handleAdminTelegramFieldChange('location', event.target.value)}
                          placeholder="Ubicacion"
                          className={cn(
                            'min-h-[56px] rounded-[1.35rem] border px-4 text-sm font-bold outline-none transition-all',
                            isDarkMode ? 'border-white/10 bg-white/5 text-white placeholder:text-white/35' : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400'
                          )}
                        />
                      </label>

                      <label className="grid gap-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.18em] opacity-55">Pie</span>
                        <input
                          type="text"
                          value={adminTelegramForm.footer}
                          onChange={(event) => handleAdminTelegramFieldChange('footer', event.target.value)}
                          placeholder="Consulta mas detalles en la app."
                          className={cn(
                            'min-h-[56px] rounded-[1.35rem] border px-4 text-sm font-bold outline-none transition-all',
                            isDarkMode ? 'border-white/10 bg-white/5 text-white placeholder:text-white/35' : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400'
                          )}
                        />
                      </label>

                      <div className="flex flex-col gap-3 lg:col-span-2 sm:flex-row sm:items-center sm:justify-between">
                        {adminTelegramNotice ? (
                          <p className="text-sm font-bold leading-6 text-brand">{adminTelegramNotice}</p>
                        ) : (
                          <p className="text-sm font-bold leading-6 opacity-55">
                            Se enviara al canal configurado y/o a los usuarios vinculados en Telegram.
                          </p>
                        )}

                        <button
                          type="submit"
                          disabled={isAdminTelegramSending}
                          className={cn(
                            'inline-flex items-center justify-center gap-2 rounded-[1.25rem] px-5 py-3 text-[11px] font-black uppercase tracking-[0.16em] transition-all disabled:cursor-not-allowed disabled:opacity-60',
                            isDarkMode ? 'bg-white text-slate-950 hover:bg-slate-100' : 'bg-slate-950 text-white hover:bg-slate-800'
                          )}
                        >
                          {isAdminTelegramSending ? 'Enviando aviso' : 'Enviar aviso'}
                        </button>
                      </div>
                    </form>
                  </DashboardSurface>
                )}
              </div>
          </div>
        );

      case 'Plano':
        return renderMapDashboardMapFirst();

      default:
        return null;
    }
  };

  const devicePreviewUrl = useMemo(
    () => buildDevicePreviewUrl(activeTab, isDarkMode),
    [activeTab, isDarkMode]
  );

  return (
      <div
        className={cn(
          'min-h-screen transition-colors duration-500 selection:bg-brand selection:text-white',
          isFalleritoTab
            ? 'h-dvh overflow-hidden pb-[calc(env(safe-area-inset-bottom,0px)+5.85rem)] sm:pb-[calc(env(safe-area-inset-bottom,0px)+6.4rem)]'
            : isMapImmersive || isMarketplaceTab ? 'pb-0' : agendaUsesFloatingChrome ? 'pb-28 sm:pb-32' : 'pb-40',
          isDarkMode
            ? 'bg-[linear-gradient(180deg,#0e1522_0%,#0a1019_62%,#070c14_100%)] text-white'
            : 'bg-[linear-gradient(180deg,#f7fafc_0%,#edf2f7_58%,#e6edf4_100%)] text-[#0f172a]'
        )}
      >
        {!isFalleritoTab && !isMarketplaceTab ? (
        <Header
           isDarkMode={isDarkMode}
           setIsDarkMode={setIsDarkMode}
          activeTab={activeTab}
          onNavigate={setActiveTab}
          location={viewer.location}
          locationStatus={locationStatus}
          onLocate={() => { void requestLocation().catch(() => undefined); }}
          profileProgressPercent={passportProgressPercent}
          visitedFallasCount={visitedFallasCount}
          badgesUnlockedCount={badgesUnlockedCount}
          isCollapsed={isHeaderCollapsed}
          onOpenGamification={() => setIsGamificationCatalogOpen(true)}
          onOpenDevicePreview={canUseDevicePreview ? () => setIsDevicePreviewOpen(true) : undefined}
          onOpenProfile={() => setActiveTab('Perfil')}
          gamificationIconSrc={gamificationShortcutIcon}
          showDevicePreviewButton={canUseDevicePreview}
          avatarUrl={viewer.avatar}
           variant={usesMapChrome ? 'map' : 'default'}
         />
        ) : null}

        {showDashboardStatusBanner ? (
          <div className="mx-auto w-full max-w-[1800px] px-3 pt-2 sm:px-4 xl:px-6">
            <DashboardStatusBanner
              isDarkMode={isDarkMode}
              eyebrow={dashboardStatusEyebrow}
              message={dashboardStatusMessage ?? ''}
            />
          </div>
        ) : null}

        <main
          className={cn(
            'mx-auto w-full',
            isFalleritoTab ? 'h-full min-h-0 overflow-hidden pt-0' : isMarketplaceTab ? 'space-y-0 pt-0' : agendaUsesFloatingChrome ? 'space-y-4 pt-2 sm:pt-3 lg:pt-[5.7rem]' : isMapImmersive ? 'space-y-3' : 'space-y-8',
            isMapImmersive ? 'pt-0' : '',
            hasDockedNavigation
              ? 'max-w-none px-2 sm:px-3 xl:px-4 2xl:px-5'
              : isMarketplaceTab
                ? 'max-w-none px-0'
                : activeTab === 'Social'
                  ? 'max-w-[1680px] px-3 sm:px-4 xl:px-6'
                  : activeTab === 'Mapa' || activeTab === 'Agenda' || activeTab === 'Fallerito' || activeTab === 'Fallas'
                    ? 'max-w-none px-0'
                    : 'max-w-[1800px] px-3 sm:px-4 xl:px-6'
          )}
        >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            className={isFalleritoTab ? 'h-full min-h-0' : undefined}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      <FallaDetail
        falla={showDetail}
        isDarkMode={isDarkMode}
        onClose={() => setShowDetail(null)}
        onNavigateToFalla={handleNavigateToFalla}
        onRegisterVisit={handleRegisterVisit}
        onContentRead={handleTrackContentRead}
        onSelectTab={setActiveTab}
        favorites={favorites}
        toggleFavorite={toggleFavorite}
        isVisited={showDetail ? visitedFallaIdSet.has(showDetail.id) : false}
        canEditContent={viewer.role === 'admin'}
        onFallaUpdated={handleFallaContentUpdated}
      />

      <NavigationErrorBoundary
        isDarkMode={isDarkMode}
        onReset={() => {
          setNavigationFalla(null);
          setActiveRouteFallaId(null);
        }}
      >
        <React.Suspense fallback={null}>
          <NavigationMapModal
            falla={navigationFalla}
            isDarkMode={isDarkMode}
            mapStyleId={mapStyleId}
            setMapStyleId={setMapStyleId}
            activeRouteFallaId={activeRouteFallaId}
            setActiveRouteFallaId={setActiveRouteFallaId}
            userPosition={userPosition}
            locationStatus={locationStatus}
            requestLocation={requestLocation}
            variant="overlay"
            onGuidanceActiveChange={setIsModalGuidanceActive}
            onClose={() => {
              setNavigationFalla(null);
              setActiveRouteFallaId(null);
            }}
          />
        </React.Suspense>
      </NavigationErrorBoundary>

      {!shouldHideBottomNav ? (
        <BottomNav
          isDarkMode={isDarkMode}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          variant="default"
        />
      ) : null}

      <ProfileSettingsModal
        isOpen={isProfileSettingsOpen}
        viewer={viewer}
        isDarkMode={isDarkMode}
        isSaving={isProfileSaving}
        saveNotice={profileSaveNotice}
        saveNoticeTone={profileSaveNoticeTone}
        telegramStatus={telegramStatus}
        isTelegramStatusLoading={isTelegramStatusLoading}
        isTelegramLinking={isTelegramLinking}
        isTelegramSendingTest={isTelegramSendingTest}
        telegramNotice={telegramNotice}
        devicePreviewMode={devicePreviewMode}
        showDevicePreviewTools={canUseDevicePreview}
        onClose={() => setIsProfileSettingsOpen(false)}
        onSave={handleSaveViewerSettings}
        onDevicePreviewModeChange={handleDevicePreviewModeChange}
        onOpenDevicePreview={() => setIsDevicePreviewOpen(true)}
        onConnectTelegram={handleConnectTelegram}
        onRefreshTelegramStatus={handleRefreshTelegramStatus}
        onSendTelegramTest={handleSendTelegramTest}
      />

      <DevicePreviewModal
        isOpen={isDevicePreviewOpen}
        isDarkMode={isDarkMode}
        mode={devicePreviewMode}
        previewUrl={devicePreviewUrl}
        onClose={() => setIsDevicePreviewOpen(false)}
        onModeChange={handleDevicePreviewModeChange}
      />

      <AnimatePresence>
        {isAppOnboardingOpen ? (
          <AppOnboardingOverlay
            isDarkMode={isDarkMode}
            currentStep={currentAppOnboardingStep}
            stepIndex={appOnboardingStepIndex}
            totalSteps={APP_ONBOARDING_STEPS.length}
            onBack={() => setAppOnboardingStepIndex((current) => Math.max(0, current - 1))}
            onNext={() => setAppOnboardingStepIndex((current) => Math.min(APP_ONBOARDING_STEPS.length - 1, current + 1))}
            onFinish={completeAppOnboarding}
            onSkip={completeAppOnboarding}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {isFallasHelpOpen ? (
          <motion.div
            className="fixed inset-0 z-[6200] flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsFallasHelpOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              onClick={(event) => event.stopPropagation()}
              className={cn(
                'w-full max-w-[520px] rounded-[1rem] border p-5 shadow-[0_26px_70px_rgba(2,6,23,0.24)]',
                isDarkMode ? 'border-white/12 bg-slate-950 text-white' : 'border-white bg-white text-slate-950'
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">Catalogo de fallas</p>
                  <h3 className="mt-2 text-[1.35rem] font-black leading-tight">Como funciona</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFallasHelpOpen(false)}
                  className={cn('flex h-9 w-9 items-center justify-center rounded-full transition-colors', isDarkMode ? 'bg-white/8 hover:bg-white/12' : 'bg-slate-100 hover:bg-slate-200')}
                  aria-label="Cerrar ayuda"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 grid gap-3">
                {[
                  ['Filtra', 'Busca por nombre, artista, barrio, seccion o categoria.'],
                  ['Guarda', 'Marca fallas como favoritas para tenerlas en tu perfil y en el mapa.'],
                  ['Comparte', 'Usa el boton compartir para enviar un enlace directo a cada ficha.'],
                  ['Navega', 'Abre la ficha y prepara la ruta desde el mapa interactivo.'],
                ].map(([title, copy]) => (
                  <div key={title} className={cn('rounded-[0.75rem] border p-3', isDarkMode ? 'border-white/10 bg-white/6' : 'border-slate-200 bg-slate-50')}>
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-brand">{title}</p>
                    <p className={cn('mt-1 text-sm font-bold leading-5', isDarkMode ? 'text-white/68' : 'text-slate-600')}>{copy}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <GamificationBadgeModal
        isOpen={isGamificationCatalogOpen}
        isDarkMode={isDarkMode}
        isGuest={viewer.accessType !== 'user'}
        isLoading={gamification.isLoading}
        profile={gamification.bundle?.profile ?? null}
        badges={gamification.badges}
        onClose={() => setIsGamificationCatalogOpen(false)}
        onReplayUnlockedBadges={gamification.replayUnlockedBadgeCelebrations}
      />

      <BadgeUnlockCelebration
        item={gamification.celebrations[0] ?? null}
        isDarkMode={isDarkMode}
        onDismiss={gamification.dismissCelebration}
      />

      <AnimatePresence>
        {panelNotifications[0] ? (
          <motion.div
            className="fixed inset-0 z-[6200] flex items-center justify-center bg-slate-950/38 px-4 py-6 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => pinPanelNotification(panelNotifications[0])}
          >
            <motion.div
              initial={{ opacity: 0, y: 22, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.98 }}
              transition={{ duration: 0.22 }}
              onClick={(event) => event.stopPropagation()}
              className={cn('relative w-full max-w-[560px] overflow-hidden rounded-[1.55rem] border p-7 shadow-[0_34px_90px_rgba(180,70,18,0.28)]', isDarkMode ? 'border-white/12 bg-slate-950 text-white' : 'border-white bg-white text-slate-950')}
            >
              <div className="pointer-events-none absolute -left-20 -top-20 h-52 w-52 rounded-full bg-brand/14 blur-3xl" />
              <div className="relative z-10 flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-brand/10 text-brand"><Bell className="h-7 w-7" /></span>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-brand">Aviso del panel</p>
                </div>
                <button
                  type="button"
                  onClick={() => pinPanelNotification(panelNotifications[0])}
                  className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-full transition-colors', isDarkMode ? 'bg-white/10 text-white hover:bg-white/14' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
                  aria-label="Cerrar aviso"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="relative z-10 mt-6">
                <h3 className="text-[1.55rem] font-black leading-tight tracking-[-0.03em]">{panelNotifications[0].title}</h3>
                <p className={cn('mt-4 whitespace-pre-line text-base font-bold leading-7', isDarkMode ? 'text-white/72' : 'text-slate-650')}>{panelNotifications[0].message}</p>
                <div className={cn('mt-7 flex flex-col gap-4 border-t pt-5 sm:flex-row sm:items-center sm:justify-between', isDarkMode ? 'border-white/10' : 'border-slate-200')}>
                  <p className="text-[12px] font-black uppercase tracking-[0.16em] opacity-55">{panelNotifications[0].commissionName || 'Fallas 360'} · {formatDashboardDateTime(panelNotifications[0].createdAt)}</p>
                  <button
                    type="button"
                    onClick={() => pinPanelNotification(panelNotifications[0])}
                    className="rounded-full border border-brand px-7 py-3 text-sm font-black text-brand transition-colors hover:bg-brand hover:text-white"
                  >
                    Entendido
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="pointer-events-none fixed bottom-28 right-4 z-[5600] flex w-[min(92vw,380px)] flex-col gap-3 sm:bottom-32 sm:right-6">
        <AnimatePresence>
          {gamification.notifications.slice(-4).map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <UnlockToast item={item} isDarkMode={isDarkMode} onDismiss={gamification.dismissNotification} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
        <div
          className={cn(
            'absolute top-[-16%] right-[-12%] h-[42vw] w-[42vw] rounded-full blur-[120px] transition-opacity duration-1000',
            isDarkMode ? 'bg-brand/8 opacity-35' : 'bg-brand/8 opacity-35'
          )}
        />
        <div
          className={cn(
            'absolute bottom-[-14%] left-[-12%] h-[36vw] w-[36vw] rounded-full blur-[110px] transition-opacity duration-1000',
            isDarkMode ? 'bg-blue-900/10 opacity-25' : 'bg-blue-500/8 opacity-25'
          )}
        />
        <div
          className={cn(
            'absolute left-1/2 top-[22%] h-[24vw] w-[24vw] -translate-x-1/2 rounded-full blur-[120px] transition-opacity duration-1000',
            isDarkMode ? 'bg-white/4 opacity-15' : 'bg-white opacity-40'
          )}
        />
      </div>
    </div>
  );
}




