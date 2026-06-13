import React, { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import { distanceBetweenPoints, type MapPoint, type RouteProfile } from '../utils/navigation';

interface RoutePolylineLayerProps {
  geometry: MapPoint[] | null;
  profile?: RouteProfile;
  variant?: 'default' | 'guided';
}

function simplifyRouteGeometry(geometry: MapPoint[] | null, profile: RouteProfile): MapPoint[] | null {
  if (!geometry || geometry.length <= 2) {
    return geometry;
  }

  const minDistanceMeters = profile === 'driving' ? 12 : 7;
  const simplified: MapPoint[] = [geometry[0]];
  let lastPoint = geometry[0];

  for (let index = 1; index < geometry.length - 1; index += 1) {
    const point = geometry[index];
    if (distanceBetweenPoints(lastPoint, point) >= minDistanceMeters) {
      simplified.push(point);
      lastPoint = point;
    }
  }

  const destination = geometry[geometry.length - 1];
  if (simplified[simplified.length - 1] !== destination) {
    simplified.push(destination);
  }

  return simplified.length >= 2 ? simplified : geometry;
}

function RoutePolylineLayerComponent({ geometry, profile = 'walking', variant = 'default' }: RoutePolylineLayerProps) {
  const map = useMap();
  const visibleGeometry = useMemo(() => simplifyRouteGeometry(geometry, profile), [geometry, profile]);

  useEffect(() => {
    if (!map.getPane('routePane')) {
      map.createPane('routePane');
    }

    const routePane = map.getPane('routePane');
    if (routePane) {
      routePane.style.zIndex = '640';
      routePane.style.pointerEvents = 'none';
    }

    if (!visibleGeometry || visibleGeometry.length < 2) {
      return undefined;
    }

    const isGuided = variant === 'guided';
    const isDriving = profile === 'driving';
    const routeColor = isDriving ? '#1a73e8' : '#ff5a1f';
    const routeDash = isDriving ? undefined : '12 16';
    // Map performance: keep route cleanup isolated so it never clears markers or tiles.
    // SVG is kept here because Leaflet renders dashed walking routes more reliably across devices.
    const routeRenderer = L.svg({ pane: 'routePane' });
    const shadowLayer = L.polyline(visibleGeometry, {
      pane: 'routePane',
      renderer: routeRenderer,
      color: '#0f172a',
      weight: isGuided ? 20 : 16,
      opacity: isDriving ? 0.16 : 0.12,
      lineCap: 'round',
      lineJoin: 'round',
      smoothFactor: 1.8,
      interactive: false,
    });

    const outlineLayer = L.polyline(visibleGeometry, {
      pane: 'routePane',
      renderer: routeRenderer,
      color: '#ffffff',
      weight: isGuided ? 17 : 15,
      opacity: 0.96,
      lineCap: 'round',
      lineJoin: 'round',
      smoothFactor: 1.8,
      interactive: false,
    });

    const mainLayer = L.polyline(visibleGeometry, {
      pane: 'routePane',
      renderer: routeRenderer,
      color: routeColor,
      weight: isGuided ? 10 : 8,
      opacity: 1,
      lineCap: 'round',
      lineJoin: 'round',
      dashArray: routeDash,
      smoothFactor: 1.8,
      interactive: false,
    });

    const routeLayer = L.layerGroup([shadowLayer, outlineLayer, mainLayer]).addTo(map);

    shadowLayer.bringToFront();
    outlineLayer.bringToFront();
    mainLayer.bringToFront();

    return () => {
      if (map.hasLayer(routeLayer)) {
        map.removeLayer(routeLayer);
      }
    };
  }, [map, profile, variant, visibleGeometry]);

  return null;
}

export const RoutePolylineLayer = React.memo(RoutePolylineLayerComponent);
