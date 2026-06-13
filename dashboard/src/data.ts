import conventoJerusalenLogo from './assets/convento-jerusalen-logo.svg';
import conventoJerusalenDetail from './assets/convento-jerusalen-detail.svg';
import conventoJerusalenHaze from './assets/convento-jerusalen-haze.svg';

export interface Falla {
  id: string;
  name: string;
  section: string;
  category: 'Principal' | 'Infantil' | 'Experimental';
  lat: number;
  lng: number;
  description: string;
  artist: string;
  prize?: number;
  imageUrl: string;
  logoUrl?: string;
  detailImageUrl?: string;
  detailAtmosphereUrl?: string;
  neighborhood: string;
  likes: number;
  visitors: number;
  address?: string;
  routeUrl?: string;
  commissionName?: string;
  prizeText?: string;
  favoritesCount?: number;
  eventsCount?: number;
  status?: string;
  year?: string;
  jcfNum?: string;
  budgetEur?: number;
  budgetLabel?: string;
  city?: string;
}

export interface Event {
  id: string;
  title: string;
  time: string;
  location: string;
  date: string;
  type: 'Mascletà' | 'Castillo' | 'Ofrenda' | 'Cremà' | 'Pasacalle';
  description: string;
  isLive?: boolean;
}

export interface SocialPost {
  id: string;
  user: string;
  userImage: string;
  content: string;
  image: string;
  likes: number;
  time: string;
}

export type TvChannelPlayerType = 'iframe' | 'hls' | 'web';

export interface TvChannel {
  id: string;
  name: string;
  area: string;
  focus: string;
  note: string;
  availability: string;
  watchUrl: string;
  actionLabel: string;
  playerType: TvChannelPlayerType;
  embedUrl?: string;
}

export interface AppViewer {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  location: string;
  email?: string | null;
  role: string;
  accessType: 'user' | 'guest';
  isRegistered: boolean;
}

export interface TvChatBotConfig {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  badge: string;
  audienceByChannel: Record<string, string>;
  messagesByChannel: Record<string, string[]>;
}

export const LEGACY_FALLAS_MOCK: Falla[] = [
  {
    id: '1',
    name: 'Convento Jerusalén - Matemático Marzal',
    section: 'Especial',
    category: 'Principal',
    lat: 39.4678,
    lng: -0.3792,
    neighborhood: 'Extramurs',
    description: 'Una de las fallas más emblemáticas de la ciudad, conocida por su espectacularidad y detalle. Este año bajo el lema "Olimpo de los Dioses".',
    artist: 'Pere Baenas',
    prize: 1,
    imageUrl: 'https://picsum.photos/seed/falla1/800/600',
    logoUrl: conventoJerusalenLogo,
    detailImageUrl: conventoJerusalenDetail,
    detailAtmosphereUrl: conventoJerusalenHaze,
    likes: 1240,
    visitors: 4500
  },
  {
    id: '2',
    name: 'Exposición - Micer Mascó',
    section: 'Especial',
    category: 'Principal',
    lat: 39.4745,
    lng: -0.3635,
    neighborhood: 'Exposició',
    description: 'Falla de sección especial con un diseño innovador y gran colorido. Representa la dualidad entre la naturaleza y la tecnología.',
    artist: 'David Sánchez Llongo',
    prize: 2,
    imageUrl: 'https://picsum.photos/seed/falla2/800/600',
    likes: 980,
    visitors: 3200
  },
  {
    id: '3',
    name: 'Plaza del Pilar',
    section: 'Especial',
    category: 'Principal',
    lat: 39.4728,
    lng: -0.3815,
    neighborhood: 'Ciutat Vella',
    description: 'Ubicada en una plaza estrecha, esta falla destaca por su altura y equilibrio. Un desafío a la gravedad constante.',
    artist: 'Paco Torres',
    prize: 3,
    imageUrl: 'https://picsum.photos/seed/falla3/800/600',
    likes: 1560,
    visitors: 5100
  },
  {
    id: '4',
    name: 'Na Jordana',
    section: 'Especial',
    category: 'Principal',
    lat: 39.4795,
    lng: -0.3805,
    neighborhood: 'El Carmen',
    description: 'Falla histórica del barrio del Carmen con un enfoque artístico único y satírico.',
    artist: 'Mario Gual',
    imageUrl: 'https://picsum.photos/seed/falla4/800/600',
    likes: 850,
    visitors: 2800
  },
  {
    id: '5',
    name: 'Cuba - Literato Azorín',
    section: 'Especial',
    category: 'Principal',
    lat: 39.4625,
    lng: -0.3755,
    neighborhood: 'Ruzafa',
    description: 'Famosa por su iluminación y su monumento en el barrio de Ruzafa. Un espectáculo de luz y color.',
    artist: 'Vicente Martínez',
    imageUrl: 'https://picsum.photos/seed/falla5/800/600',
    likes: 2100,
    visitors: 6700
  }
];

export const EVENTS_MOCK: Event[] = [
  {
    id: 'e1',
    title: 'Mascletà',
    time: '14:00',
    location: 'Plaza del Ayuntamiento',
    date: '2027-03-15',
    type: 'Mascletà',
    description: 'Espectáculo pirotécnico de ruido y ritmo.',
    isLive: true
  },
  {
    id: 'e2',
    title: 'La Cridà',
    time: '19:30',
    location: 'Torres de Serranos',
    date: '2027-02-23',
    type: 'Pasacalle',
    description: 'Apertura oficial de las Fallas desde las Torres de Serranos.'
  },
  {
    id: 'e3',
    title: 'Ofrenda de Flores',
    time: '15:30',
    location: 'Plaza de la Virgen',
    date: '2027-03-17',
    type: 'Ofrenda',
    description: 'Homenaje a la Virgen de los Desamparados.'
  },
  {
    id: 'e4',
    title: 'Mascletà',
    time: '14:00',
    location: 'Plaza del Ayuntamiento',
    date: '2027-03-16',
    type: 'Mascletà',
    description: 'Espectáculo pirotécnico diario.'
  },
  {
    id: 'e5',
    title: 'Nit del Foc',
    time: '01:30',
    location: 'Paseo de la Alameda',
    date: '2027-03-18',
    type: 'Castillo',
    description: 'El mayor espectáculo de fuegos artificiales.'
  },
  {
    id: 'e6',
    title: 'La Cremà',
    time: '22:00',
    location: 'Toda la ciudad',
    date: '2027-03-19',
    type: 'Cremà',
    description: 'El fuego consume los monumentos para dar paso a la primavera.'
  },
  {
    id: 'e7',
    title: 'Mascletà',
    time: '14:00',
    location: 'Plaza del Ayuntamiento',
    date: '2027-03-17',
    type: 'Mascletà',
    description: 'Espectáculo pirotécnico diario.'
  },
  {
    id: 'e8',
    title: 'Mascletà',
    time: '14:00',
    location: 'Plaza del Ayuntamiento',
    date: '2027-03-18',
    type: 'Mascletà',
    description: 'Espectáculo pirotécnico diario.'
  },
  {
    id: 'e9',
    title: 'Mascletà',
    time: '14:00',
    location: 'Plaza del Ayuntamiento',
    date: '2027-03-19',
    type: 'Mascletà',
    description: 'Última Mascletà de las fiestas.'
  }
];

export const SOCIAL_POSTS: SocialPost[] = [
  {
    id: 'p1',
    user: 'Marc B.',
    userImage: 'https://i.pravatar.cc/150?u=marc',
    content: '¡Increíble la falla de Convento este año! El detalle es de otro mundo. 🎆',
    image: 'https://picsum.photos/seed/post1/600/800',
    likes: 45,
    time: '2h'
  },
  {
    id: 'p2',
    user: 'Elena F.',
    userImage: 'https://i.pravatar.cc/150?u=elena',
    content: 'Esperando la Mascletà en primera fila. ¡Qué ganas! 🔥',
    image: 'https://picsum.photos/seed/post2/600/800',
    likes: 128,
    time: '45m'
  },
  {
    id: 'p3',
    user: 'Valencia Lover',
    userImage: 'https://i.pravatar.cc/150?u=val',
    content: 'Ruzafa iluminada es lo mejor de las fiestas. No os lo perdáis.',
    image: 'https://picsum.photos/seed/post3/600/800',
    likes: 89,
    time: '5h'
  }
];

export const APP_VIEWER: AppViewer = {
  id: 'marc-baixauli',
  name: 'Marc Baixauli',
  handle: '@marcbaix',
  avatar: 'https://i.pravatar.cc/150?u=marc',
  location: 'Valencia',
  email: 'marc@falles360.app',
  role: 'user',
  accessType: 'user',
  isRegistered: true
};

export const APP_GUEST_VIEWER: AppViewer = {
  id: 'guest-viewer',
  name: 'Invitado',
  handle: '@invitado',
  avatar: 'https://i.pravatar.cc/150?u=falles360-guest',
  location: 'Valencia',
  email: null,
  role: 'guest',
  accessType: 'guest',
  isRegistered: false
};

export const TV_CHAT_BOT: TvChatBotConfig = {
  id: 'falles360-bot',
  name: 'Bot Falles360',
  handle: '@botfalles360',
  avatar: 'https://i.pravatar.cc/150?u=falles360-bot',
  badge: 'BOT',
  audienceByChannel: {},
  messagesByChannel: {}
};

export const TV_CHANNELS: TvChannel[] = [
  {
    id: 'apunt',
    name: 'A Punt',
    area: 'Toda la Comunitat',
    focus: 'Mascletaes, Ofrenda, Crema y actos oficiales',
    note: 'Canal publico valenciano con emision en directo en television, web y aplicaciones.',
    availability: 'Disponible en la app',
    watchUrl: 'https://www.apuntmedia.es/directe/directe-tv_136_1392524.html',
    actionLabel: 'Abrir oficial',
    playerType: 'iframe',
    embedUrl: 'https://players.brightcove.net/6057955885001/wM4NX8x9T_default/index.html?videoId=6137605659001'
  },
  {
    id: '7televalencia',
    name: '7 TeleValencia',
    area: 'Valencia y l Horta',
    focus: 'Crida, Ofrenda, Crema y especiales Vive Las Fallas',
    note: 'Mantiene streaming propio y refuerza la cobertura durante los dias grandes de la fiesta.',
    availability: 'Disponible en la app',
    watchUrl: 'https://7televalencia.com/directo-7televalencia/',
    actionLabel: 'Abrir oficial',
    playerType: 'iframe',
    embedUrl: 'https://shares.enetres.net/live.php?source=CoreV1&v=9E9557EFCEBB43A89CEC8FBD3C500247028&view=embed'
  },
  {
    id: 'la8',
    name: 'La 8 Mediterraneo',
    area: 'Valencia metropolitana',
    focus: 'Ofrenda, actos tradicionales y especiales falleros',
    note: 'Su portal agrupa especiales y emisiones en directo con reproductor integrado.',
    availability: 'Disponible en la app',
    watchUrl: 'https://laocho.tv/tv-en-directo/',
    actionLabel: 'Abrir oficial',
    playerType: 'hls',
    embedUrl: 'https://newscript.gestec-video.com/hls/8TVEVENTOS.m3u8'
  },
  {
    id: 'levante-tv',
    name: 'Levante TV',
    area: 'Valencia',
    focus: 'Especiales Tot es Festa y cobertura audiovisual de Fallas',
    note: 'Levante-EMV centraliza los directos y programas falleros de la cadena en su seccion de video.',
    availability: 'Disponible en la app',
    watchUrl: 'https://www.levante-emv.com/videos/levante-tv/',
    actionLabel: 'Abrir oficial',
    playerType: 'web',
    embedUrl: 'https://www.levante-emv.com/videos/levante-tv/'
  },
  {
    id: 'intercomarcal',
    name: 'Intercomarcal TV',
    area: 'Elda y Vinalopo',
    focus: 'Fallas de Elda y circuito festivo del sur de la Comunitat',
    note: 'Referencia util para seguir la vertiente fallera de Alicante, especialmente en septiembre.',
    availability: 'Disponible en la app',
    watchUrl: 'https://www.intercomarcal.com/',
    actionLabel: 'Abrir oficial',
    playerType: 'web',
    embedUrl: 'https://www.intercomarcal.com/'
  }
];
