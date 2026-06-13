import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.heat';
import { useMap } from 'react-leaflet';
import { type DashboardHeatPoint } from '../utils/mapHeat';

// Gradient for light map backgrounds (city view)
const HEATMAP_GRADIENT_LIGHT = {
  0.0: 'rgba(255, 255, 200, 0)',
  0.15: 'rgba(255, 230, 100, 0.15)',
  0.35: 'rgba(255, 200, 50, 0.25)',
  0.55: 'rgba(255, 150, 30, 0.35)',
  0.75: 'rgba(255, 100, 20, 0.45)',
  1.0: 'rgba(220, 50, 20, 0.65)',
};

// Gradient for dark map backgrounds (night/satellite)
const HEATMAP_GRADIENT_DARK = {
  0.0: 'rgba(255, 255, 150, 0)',
  0.15: 'rgba(255, 220, 100, 0.2)',
  0.35: 'rgba(255, 180, 50, 0.3)',
  0.55: 'rgba(255, 130, 30, 0.4)',
  0.75: 'rgba(255, 80, 20, 0.55)',
  1.0: 'rgba(240, 40, 20, 0.8)',
};

interface HeatmapLayerProps {
  enabled: boolean;
  points: DashboardHeatPoint[];
  mapStyleId?: 'city' | 'satellite' | 'night';
  gradient?: Record<number, string>;
  pane?: string;
}

export function HeatmapLayer({ enabled, points, mapStyleId = 'city', gradient: customGradient, pane = 'heatmapPane' }: HeatmapLayerProps) {
  const map = useMap();
  const heatLayerRef = useRef<any>(null);

  // Determina el gradiente según el estilo del mapa
  const gradient = customGradient ?? (mapStyleId === 'city' ? HEATMAP_GRADIENT_LIGHT : HEATMAP_GRADIENT_DARK);
  const heatData = useMemo(
    () => points.map((point) => [point.lat, point.lng, point.intensity] as [number, number, number]),
    [points]
  );

  useEffect(() => {
    if (!map) return;

    try {
      if (!enabled || heatData.length === 0) {
        // Remove heatmap if disabled or no points
        if (heatLayerRef.current && map.hasLayer(heatLayerRef.current)) {
          map.removeLayer(heatLayerRef.current);
          heatLayerRef.current = null;
        }
        return;
      }

      // Check if leaflet.heat is available
      const heatLayerConstructor = (L as any).heatLayer;
      if (!heatLayerConstructor || typeof heatLayerConstructor !== 'function') {
        console.error('leaflet.heat is not properly loaded');
        return;
      }

      if (!heatData || heatData.length === 0) {
        if (heatLayerRef.current && map.hasLayer(heatLayerRef.current)) {
          map.removeLayer(heatLayerRef.current);
          heatLayerRef.current = null;
        }
        return;
      }

      // Create new heatmap layer if it doesn't exist
      if (!heatLayerRef.current) {
        const zoom = map.getZoom();
        heatLayerRef.current = heatLayerConstructor(heatData, {
          radius: zoom >= 16 ? 14 : zoom >= 14 ? 20 : 24,
          blur: zoom >= 16 ? 14 : zoom >= 14 ? 18 : 22,
          maxZoom: 18,
          minOpacity: 0.05,
          max: 1.0,
          gradient,
          pane,
        });

        // Add to map
        if (heatLayerRef.current) {
          heatLayerRef.current.addTo(map);
        }
      } else if (heatLayerRef.current.setLatLngs) {
        // Update existing layer
        heatLayerRef.current.setLatLngs(heatData);
      }
    } catch (error) {
      console.error('Error in HeatmapLayer:', error);
      // Try to clean up on error
      if (heatLayerRef.current) {
        try {
          if (map.hasLayer(heatLayerRef.current)) {
            map.removeLayer(heatLayerRef.current);
          }
        } catch (e) {
          // ignore cleanup errors
        }
        heatLayerRef.current = null;
      }
    }
  }, [enabled, heatData, gradient, map, pane]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (heatLayerRef.current && map && map.hasLayer(heatLayerRef.current)) {
        try {
          map.removeLayer(heatLayerRef.current);
        } catch (e) {
          console.warn('Error cleaning up heatmap layer:', e);
        }
      }
      heatLayerRef.current = null;
    };
  }, [map]);

  return null;
}
