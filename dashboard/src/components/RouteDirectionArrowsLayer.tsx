import React, { useMemo } from 'react';
import L from 'leaflet';
import { Marker } from 'react-leaflet';
import { type MapPoint } from '../utils/navigation';

interface RouteDirectionArrowsLayerProps {
  geometry: MapPoint[] | null;
  enabled: boolean;
  guided?: boolean;
}

interface DirectionArrow {
  bearing: number;
  point: MapPoint;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function toDegrees(value: number): number {
  return (value * 180) / Math.PI;
}

function distanceMeters(origin: MapPoint, destination: MapPoint): number {
  const earthRadiusMeters = 6371000;
  const [originLat, originLng] = origin;
  const [destinationLat, destinationLng] = destination;
  const deltaLat = toRadians(destinationLat - originLat);
  const deltaLng = toRadians(destinationLng - originLng);
  const normalizedOriginLat = toRadians(originLat);
  const normalizedDestinationLat = toRadians(destinationLat);
  const haversine =
    Math.sin(deltaLat / 2) ** 2
    + Math.cos(normalizedOriginLat) * Math.cos(normalizedDestinationLat) * Math.sin(deltaLng / 2) ** 2;

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function bearingDegrees(origin: MapPoint, destination: MapPoint): number {
  const [originLat, originLng] = origin.map(toRadians) as MapPoint;
  const [destinationLat, destinationLng] = destination.map(toRadians) as MapPoint;
  const deltaLng = destinationLng - originLng;
  const y = Math.sin(deltaLng) * Math.cos(destinationLat);
  const x =
    Math.cos(originLat) * Math.sin(destinationLat)
    - Math.sin(originLat) * Math.cos(destinationLat) * Math.cos(deltaLng);

  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

function interpolatePoint(origin: MapPoint, destination: MapPoint, ratio: number): MapPoint {
  return [
    origin[0] + ((destination[0] - origin[0]) * ratio),
    origin[1] + ((destination[1] - origin[1]) * ratio),
  ];
}

function buildDirectionArrows(geometry: MapPoint[]): DirectionArrow[] {
  if (geometry.length < 2) {
    return [];
  }

  const totalDistance = geometry.slice(1).reduce(
    (total, point, index) => total + distanceMeters(geometry[index], point),
    0
  );
  const spacing = Math.max(120, Math.min(260, totalDistance / 7));
  const arrows: DirectionArrow[] = [];
  let nextDistance = spacing;
  let walkedDistance = 0;

  for (let index = 1; index < geometry.length && arrows.length < 12; index += 1) {
    const origin = geometry[index - 1];
    const destination = geometry[index];
    const segmentDistance = distanceMeters(origin, destination);

    if (segmentDistance < 8) {
      continue;
    }

    while (walkedDistance + segmentDistance >= nextDistance && arrows.length < 12) {
      const ratio = (nextDistance - walkedDistance) / segmentDistance;
      arrows.push({
        point: interpolatePoint(origin, destination, ratio),
        bearing: bearingDegrees(origin, destination),
      });
      nextDistance += spacing;
    }

    walkedDistance += segmentDistance;
  }

  return arrows;
}

function createDirectionArrowIcon(bearing: number, guided: boolean): L.DivIcon {
  const size = guided ? 34 : 30;

  return L.divIcon({
    className: 'route-direction-arrow',
    html: `
      <div style="
        width:${size}px;
        height:${size}px;
        border-radius:999px;
        background:${guided ? '#6d28d9' : '#7c3aed'};
        border:3px solid #ffffff;
        box-shadow:0 12px 26px rgba(109,40,217,0.3);
        display:flex;
        align-items:center;
        justify-content:center;
        transform:rotate(${bearing}deg);
      ">
        <div style="
          width:0;
          height:0;
          border-left:6px solid transparent;
          border-right:6px solid transparent;
          border-bottom:13px solid #ffffff;
          transform:translateY(-2px);
        "></div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function RouteDirectionArrowsLayerComponent({ geometry, enabled, guided = false }: RouteDirectionArrowsLayerProps) {
  const arrows = useMemo(() => (geometry ? buildDirectionArrows(geometry) : []), [geometry]);

  if (!enabled || arrows.length === 0) {
    return null;
  }

  return (
    <>
      {arrows.map((arrow, index) => (
        <Marker
          key={`${index}:${arrow.point[0]}:${arrow.point[1]}`}
          position={arrow.point}
          icon={createDirectionArrowIcon(arrow.bearing, guided)}
          interactive={false}
          zIndexOffset={1050}
        />
      ))}
    </>
  );
}

export const RouteDirectionArrowsLayer = React.memo(RouteDirectionArrowsLayerComponent);
