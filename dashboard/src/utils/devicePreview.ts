export type DevicePreviewMode =
  | 'iphone-se'
  | 'iphone-15'
  | 'iphone-pro-max'
  | 'pixel-8'
  | 'galaxy-s24'
  | 'mobile'
  | 'tablet'
  | 'desktop';

export interface DevicePreviewOption {
  mode: DevicePreviewMode;
  family: 'mobile' | 'tablet' | 'desktop';
  label: string;
  shortLabel: string;
  width: number;
  height: number;
  description: string;
}

export const DEVICE_PREVIEW_OPTIONS: DevicePreviewOption[] = [
  {
    mode: 'iphone-se',
    family: 'mobile',
    label: 'iPhone SE',
    shortLabel: 'SE',
    width: 375,
    height: 667,
    description: 'Pantalla pequena para detectar textos largos y controles apretados.',
  },
  {
    mode: 'iphone-15',
    family: 'mobile',
    label: 'iPhone 15',
    shortLabel: '15',
    width: 393,
    height: 852,
    description: 'Movil actual equilibrado para validar la experiencia principal.',
  },
  {
    mode: 'iphone-pro-max',
    family: 'mobile',
    label: 'iPhone Pro Max',
    shortLabel: 'Max',
    width: 430,
    height: 932,
    description: 'Movil grande para paneles flotantes, mapa y modales largos.',
  },
  {
    mode: 'pixel-8',
    family: 'mobile',
    label: 'Pixel 8',
    shortLabel: 'Pixel',
    width: 412,
    height: 915,
    description: 'Android alto para revisar navegacion inferior y overlays.',
  },
  {
    mode: 'galaxy-s24',
    family: 'mobile',
    label: 'Galaxy S24',
    shortLabel: 'S24',
    width: 360,
    height: 780,
    description: 'Android estrecho para comprobar que todo encaja sin desbordes.',
  },
  {
    mode: 'mobile',
    family: 'mobile',
    label: 'Movil',
    shortLabel: 'Movil',
    width: 390,
    height: 844,
    description: 'Marco vertical compacto para revisar el layout base.',
  },
  {
    mode: 'tablet',
    family: 'tablet',
    label: 'Tablet',
    shortLabel: 'Tablet',
    width: 820,
    height: 1180,
    description: 'Ancho intermedio para menus, tarjetas y paneles.',
  },
  {
    mode: 'desktop',
    family: 'desktop',
    label: 'Escritorio',
    shortLabel: 'Desktop',
    width: 1440,
    height: 900,
    description: 'Vista amplia para validar columnas y zonas flotantes.',
  },
];

export function isDevicePreviewMode(value: string | null | undefined): value is DevicePreviewMode {
  return DEVICE_PREVIEW_OPTIONS.some((option) => option.mode === value);
}

export function getDevicePreviewOption(mode: DevicePreviewMode): DevicePreviewOption {
  return DEVICE_PREVIEW_OPTIONS.find((option) => option.mode === mode) ?? DEVICE_PREVIEW_OPTIONS[0];
}
