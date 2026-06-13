export type MapStyleId = 'city' | 'satellite' | 'night';

export interface MapTheme {
  id: MapStyleId;
  label: string;
  shortLabel: string;
  url: string;
  attribution: string;
  maxZoom?: number;
}

export const MAP_THEMES: MapTheme[] = [
  {
    id: 'city',
    label: 'Calles',
    shortLabel: 'Calles',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; CARTO',
    maxZoom: 20,
  },
  {
    id: 'satellite',
    label: 'Satelite',
    shortLabel: 'Satelite',
    url:
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    maxZoom: 19,
  },
  {
    id: 'night',
    label: 'Noche',
    shortLabel: 'Noche',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; CARTO',
    maxZoom: 20,
  },
];

export function getMapTheme(mapStyleId: MapStyleId): MapTheme {
  return MAP_THEMES.find((theme) => theme.id === mapStyleId) ?? MAP_THEMES[0];
}
