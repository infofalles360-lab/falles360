import 'leaflet';

declare module 'leaflet' {
  type HeatLatLngTuple = [number, number, number?];

  interface HeatLayerOptions extends LayerOptions {
    blur?: number;
    gradient?: Record<number, string>;
    max?: number;
    maxZoom?: number;
    minOpacity?: number;
    pane?: string;
    radius?: number;
  }

  interface HeatLayer extends Layer {
    addLatLng(latlng: LatLngExpression | HeatLatLngTuple): this;
    redraw(): this;
    setLatLngs(latlngs: Array<LatLngExpression | HeatLatLngTuple>): this;
    setOptions(options: HeatLayerOptions): this;
  }

  function heatLayer(
    latlngs: Array<LatLngExpression | HeatLatLngTuple>,
    options?: HeatLayerOptions,
  ): HeatLayer;
}
