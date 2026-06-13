import L from 'leaflet';
import { type MapPoint } from './navigation';

export type MapViewportMode = 'main' | 'modal';
export type NavigationViewportMode = 'modal' | 'docked';

export function getFitBoundsOptions(map: L.Map, mode: MapViewportMode, hasRoute: boolean) {
  const size = map.getSize();
  const isPhone = size.x < 640;

  if (mode === 'modal') {
    return {
      paddingTopLeft: L.point(isPhone ? 18 : 28, isPhone ? 154 : 136),
      paddingBottomRight: L.point(
        isPhone ? 18 : 28,
        isPhone ? Math.round(size.y * 0.34) : Math.round(size.y * 0.24)
      ),
      maxZoom: hasRoute ? (isPhone ? 16 : 17) : 16,
      animate: true,
    };
  }

  return {
    paddingTopLeft: L.point(isPhone ? 18 : 28, isPhone ? 104 : 92),
    paddingBottomRight: L.point(
      isPhone ? 18 : Math.min(Math.round(size.x * 0.34), 420),
      isPhone ? Math.round(size.y * 0.26) : 116
    ),
    maxZoom: hasRoute ? (isPhone ? 15 : 16) : 16,
    animate: true,
  };
}

export function getGuidanceViewport(map: L.Map, focusPoint: MapPoint, mode: NavigationViewportMode) {
  const size = map.getSize();
  const isPhone = size.x < 640;
  const isTablet = size.x < 1180;
  const zoom = isPhone ? 16.45 : isTablet ? 16.6 : mode === 'docked' ? 16.35 : 16.3;
  const verticalOffset = isPhone
    ? Math.round(size.y * 0.14)
    : mode === 'docked'
      ? Math.round(size.y * 0.12)
      : Math.round(size.y * 0.1);
  const projected = map.project(L.latLng(focusPoint[0], focusPoint[1]), zoom);
  const center = map.unproject(L.point(projected.x, projected.y - verticalOffset), zoom);

  return { center, zoom };
}
