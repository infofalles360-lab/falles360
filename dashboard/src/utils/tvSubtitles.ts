import { type TvChannel } from '../data';

export type TvSubtitleLanguage = 'off' | 'es' | 'val' | 'en' | 'fr';
type ActiveTvSubtitleLanguage = Exclude<TvSubtitleLanguage, 'off'>;

export interface TvSubtitleOption {
  id: TvSubtitleLanguage;
  label: string;
  shortLabel: string;
}

export const TV_SUBTITLE_OPTIONS: TvSubtitleOption[] = [
  { id: 'off', label: 'Sin subtitulos', shortLabel: 'OFF' },
  { id: 'es', label: 'Castellano', shortLabel: 'ES' },
  { id: 'val', label: 'Valenciano', shortLabel: 'VAL' },
  { id: 'en', label: 'English', shortLabel: 'EN' },
  { id: 'fr', label: 'Francais', shortLabel: 'FR' },
];

const TV_SUBTITLE_LINES: Record<string, Record<ActiveTvSubtitleLanguage, string[]>> = {
  'apunt': {
    es: [
      'Directo de A Punt desde Valencia.',
      'Cobertura de mascletaes, Ofrenda, Crema y actos oficiales.',
      'Senal disponible para toda la Comunitat.',
      'Puedes cambiar el idioma del subtitulo desde la app.'
    ],
    val: [
      "Directe d'A Punt des de Valencia.",
      "Cobertura de mascletaes, Ofrena, Crema i actes oficials.",
      'Senyal disponible per a tota la Comunitat.',
      "Pots canviar l'idioma del subtitol des de l'app."
    ],
    en: [
      'Live broadcast from A Punt in Valencia.',
      'Coverage includes mascletaes, the Flower Offering, the Crema and official ceremonies.',
      'Signal available across the Valencian region.',
      'You can switch subtitle language from the app.'
    ],
    fr: [
      'Diffusion en direct de A Punt depuis Valence.',
      "Couverture des mascletaes, de l'Offrande, de la Crema et des ceremonies officielles.",
      'Signal disponible dans toute la region valencienne.',
      "Vous pouvez changer la langue des sous-titres depuis l'application."
    ],
  },
  '7televalencia': {
    es: [
      'Directo de 7 TeleValencia.',
      'Cobertura especial de la Crida, la Ofrenda, la Crema y Vive Las Fallas.',
      "La senal se centra en Valencia y l'Horta.",
      'Subtitulos disponibles en varios idiomas dentro de la app.'
    ],
    val: [
      'Directe de 7 TeleValencia.',
      'Cobertura especial de la Crida, l Ofrena, la Crema i Vive Las Fallas.',
      "La senyal se centra en Valencia i l'Horta.",
      "Subtitols disponibles en diversos idiomes dins de l'app."
    ],
    en: [
      'Live broadcast from 7 TeleValencia.',
      'Special coverage of the Crida, the Flower Offering, the Crema and Vive Las Fallas.',
      'The signal focuses on Valencia and the surrounding metropolitan area.',
      'Subtitles are available in multiple languages inside the app.'
    ],
    fr: [
      'Diffusion en direct de 7 TeleValencia.',
      "Couverture speciale de la Crida, de l'Offrande, de la Crema et de Vive Las Fallas.",
      'Le signal se concentre sur Valence et sa zone metropolitaine.',
      "Les sous-titres sont disponibles en plusieurs langues dans l'application."
    ],
  },
  'la8': {
    es: [
      'Directo de La 8 Mediterraneo.',
      'Cobertura de Ofrenda, actos tradicionales y especiales falleros.',
      'Senal metropolitana para Valencia y su entorno.',
      'El reproductor HLS mantiene el cambio rapido de canal.'
    ],
    val: [
      'Directe de La 8 Mediterraneo.',
      'Cobertura de l Ofrena, actes tradicionals i especials fallers.',
      'Senyal metropolitana per a Valencia i el seu entorn.',
      'El reproductor HLS mant el canvi rapid de canal.'
    ],
    en: [
      'Live broadcast from La 8 Mediterraneo.',
      'Coverage includes the Flower Offering, traditional events and Fallas specials.',
      'Metropolitan signal for Valencia and nearby areas.',
      'The HLS player keeps fast channel switching inside the app.'
    ],
    fr: [
      'Diffusion en direct de La 8 Mediterraneo.',
      "Couverture de l'Offrande, des actes traditionnels et des emissions speciales Fallas.",
      'Signal metropolitain pour Valence et les environs.',
      "Le lecteur HLS conserve le changement rapide de chaine dans l'application."
    ],
  },
  'levante-tv': {
    es: [
      'Directo y especiales de Levante TV.',
      'Seguimiento audiovisual de Fallas y del programa Tot es Festa.',
      'Cobertura centrada en la ciudad de Valencia.',
      'La app mantiene subtitulos incluso al abrir la web integrada.'
    ],
    val: [
      'Directe i especials de Levante TV.',
      'Seguiment audiovisual de les Falles i del programa Tot es Festa.',
      'Cobertura centrada en la ciutat de Valencia.',
      "L'app mant els subtitols fins i tot en la web integrada."
    ],
    en: [
      'Live specials from Levante TV.',
      'Audiovisual coverage of Fallas and the Tot es Festa programme.',
      'Coverage focused on the city of Valencia.',
      'The app keeps subtitles available even with the integrated web view.'
    ],
    fr: [
      'Direct et emissions speciales de Levante TV.',
      'Couverture audiovisuelle des Fallas et de Tot es Festa.',
      'Couverture centree sur la ville de Valence.',
      "L'application garde les sous-titres meme avec la vue web integree."
    ],
  },
  'intercomarcal': {
    es: [
      'Directo de Intercomarcal TV.',
      'Cobertura de las Fallas de Elda y del circuito festivo del sur.',
      'Senal enfocada en Elda y el Vinalopo.',
      'Usa el selector para leer subtitulos en el idioma que prefieras.'
    ],
    val: [
      'Directe de Intercomarcal TV.',
      'Cobertura de les Falles d Elda i del circuit festiu del sud.',
      "Senyal enfocada en Elda i el Vinalopo.",
      'Usa el selector per a llegir subtitols en el teu idioma preferit.'
    ],
    en: [
      'Live broadcast from Intercomarcal TV.',
      'Coverage of the Elda Fallas and the southern festival circuit.',
      'Signal focused on Elda and the Vinalopo area.',
      'Use the selector to read subtitles in your preferred language.'
    ],
    fr: [
      'Diffusion en direct de Intercomarcal TV.',
      'Couverture des Fallas de Elda et du circuit festif du sud.',
      'Signal centre sur Elda et la zone de Vinalopo.',
      'Utilisez le selecteur pour lire les sous-titres dans votre langue preferee.'
    ],
  },
};

function buildFallbackSubtitleLines(channel: TvChannel, language: ActiveTvSubtitleLanguage): string[] {
  switch (language) {
    case 'val':
      return [
        `Directe de ${channel.name}.`,
        `Cobertura principal: ${channel.focus}.`,
        `Zona de cobertura: ${channel.area}.`,
        "Canvia l'idioma dels subtitols quan vulgues."
      ];
    case 'en':
      return [
        `Live broadcast from ${channel.name}.`,
        `Main coverage: ${channel.focus}.`,
        `Coverage area: ${channel.area}.`,
        'Switch subtitle language whenever you want.'
      ];
    case 'fr':
      return [
        `Diffusion en direct de ${channel.name}.`,
        `Couverture principale : ${channel.focus}.`,
        `Zone couverte : ${channel.area}.`,
        'Changez la langue des sous-titres quand vous voulez.'
      ];
    default:
      return [
        `Directo de ${channel.name}.`,
        `Cobertura principal: ${channel.focus}.`,
        `Zona de cobertura: ${channel.area}.`,
        'Cambia el idioma de los subtitulos cuando quieras.'
      ];
  }
}

export function getTvSubtitleLines(channel: TvChannel, language: TvSubtitleLanguage): string[] {
  if (language === 'off') {
    return [];
  }

  return TV_SUBTITLE_LINES[channel.id]?.[language] ?? buildFallbackSubtitleLines(channel, language);
}

