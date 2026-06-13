import L from 'leaflet';

/**
 * Returns true if the map instance is safe to use (mounted and attached to DOM).
 */
export const canUseMap = (map: L.Map | null): map is L.Map => {
  return !!map && !!map.getContainer() && document.body.contains(map.getContainer());
};

/**
 * Safely call map.invalidateSize with optional options.
 */
export const safeInvalidate = (map: L.Map | null, options?: { pan?: boolean; debounceMoveend?: boolean }) => {
  if (!canUseMap(map)) return;
  map.invalidateSize(options);
};

/**
 * Stop any ongoing animation or pan/zoom.
 */
export const safeStop = (map: L.Map | null) => {
  if (!canUseMap(map)) return;
  map.stop();
};

/**
 * Safe wrapper for map.flyTo.
 */
export const safeFlyTo = (
  map: L.Map | null,
  latlng: L.LatLngExpression,
  zoom?: number,
  options?: L.ZoomPanOptions
) => {
  if (!canUseMap(map)) return;
  safeStop(map);
  map.flyTo(latlng, zoom, options);
};

/**
 * Safe wrapper for map.setView.
 */
export const safeSetView = (
  map: L.Map | null,
  latlng: L.LatLngExpression,
  zoom?: number,
  options?: L.ZoomPanOptions
) => {
  if (!canUseMap(map)) return;
  safeStop(map);
  map.setView(latlng, zoom, options);
};

/**
 * Safe wrapper for map.fitBounds.
 */
export const safeFitBounds = (
  map: L.Map | null,
  bounds: L.LatLngBoundsExpression,
  options?: L.FitBoundsOptions
) => {
  if (!canUseMap(map)) return;
  safeStop(map);
  map.fitBounds(bounds, options);
};

export default {
  canUseMap,
  safeInvalidate,
  safeStop,
  safeFlyTo,
  safeSetView,
  safeFitBounds,
};