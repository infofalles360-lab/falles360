import React, { useMemo } from 'react';
import L from 'leaflet';
import { Marker } from 'react-leaflet';
import { type RouteStep } from '../utils/navigation';

interface RouteStepMarkersLayerProps {
  steps: RouteStep[];
  currentStepIndex: number;
  enabled: boolean;
}

function resolveMarkerSymbol(step: RouteStep): string {
  const instruction = step.instruction.toLowerCase();

  if (instruction.includes('izquierda')) {
    return '&#8630;';
  }

  if (instruction.includes('derecha')) {
    return '&#8631;';
  }

  if (instruction.includes('rotonda') || instruction.includes('cambio de sentido')) {
    return '&#8635;';
  }

  return '&#8593;';
}

function createStepIcon(step: RouteStep, index: number, isCurrent: boolean): L.DivIcon {
  const label = resolveMarkerSymbol(step);
  const size = isCurrent ? 38 : 30;
  const background = isCurrent ? '#11a8ff' : '#ffffff';
  const color = isCurrent ? '#ffffff' : '#1f2937';
  const border = isCurrent ? '#ffffff' : '#b9e7ff';
  const shadow = isCurrent
    ? '0 14px 28px rgba(17,168,255,0.36), 0 0 0 5px rgba(17,168,255,0.16)'
    : '0 10px 22px rgba(17,168,255,0.22)';

  return L.divIcon({
    className: 'route-step-marker',
    html: `
      <div style="
        width:${size}px;
        height:${size}px;
        border-radius:999px;
        border:3px solid ${border};
        background:${background};
        color:${color};
        box-shadow:${shadow};
        display:flex;
        align-items:center;
        justify-content:center;
        font-family:Inter,system-ui,sans-serif;
        font-size:${isCurrent ? 21 : 17}px;
        font-weight:900;
        line-height:1;
        position:relative;
      ">
        <span aria-hidden="true">${label}</span>
        <span style="
          position:absolute;
          right:-5px;
          bottom:-5px;
          min-width:15px;
          height:15px;
          border-radius:999px;
          border:2px solid #ffffff;
          background:${isCurrent ? '#0f172a' : '#11a8ff'};
          color:#ffffff;
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:8px;
          font-weight:900;
        ">${index + 1}</span>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function RouteStepMarkersLayerComponent({ steps, currentStepIndex, enabled }: RouteStepMarkersLayerProps) {
  const visibleSteps = useMemo(
    () => steps
      .map((step, index) => ({ step, index }))
      .filter(({ step }) => step.location && step.instruction !== 'Has llegado a tu destino.')
      .slice(0, 18),
    [steps]
  );

  if (!enabled || visibleSteps.length === 0) {
    return null;
  }

  return (
    <>
      {visibleSteps.map(({ step, index }) => {
        if (!step.location) {
          return null;
        }

        return (
          <Marker
            key={`${index}:${step.location[0]}:${step.location[1]}`}
            position={step.location}
            icon={createStepIcon(step, index, index === currentStepIndex)}
            interactive={false}
            zIndexOffset={index === currentStepIndex ? 1200 : 900}
          />
        );
      })}
    </>
  );
}

export const RouteStepMarkersLayer = React.memo(RouteStepMarkersLayerComponent);
