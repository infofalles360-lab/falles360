import { useEffect, useMemo, useRef, useState } from 'react';
import { distanceBetweenPoints, formatDistance, type MapPoint, type RouteStep } from '../utils/navigation';

const DESTINATION_REACHED_METERS = 26;
const MANEUVER_NEARBY_METERS = 42;
const MANEUVER_LOOKAHEAD_METERS = 110;

function isSpeechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function buildVoiceAnnouncement(step: RouteStep, index: number, totalSteps: number) {
  const stepCountLabel = `Paso ${index + 1} de ${totalSteps}.`;
  const distanceLabel = step.distanceMeters > 0 ? `Recorre ${formatDistance(step.distanceMeters)}.` : '';
  return `${stepCountLabel} ${step.instruction} ${distanceLabel}`.trim();
}

function resolveSpanishVoice() {
  if (!isSpeechSupported()) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((voice) => voice.lang.toLowerCase() === 'es-es')
    ?? voices.find((voice) => voice.lang.toLowerCase().startsWith('es'))
    ?? null
  );
}

interface NavigationGuidanceOptions {
  routeSteps: RouteStep[];
  userPosition: MapPoint | null;
  destination: MapPoint | null;
  isRouteActive: boolean;
  routeKey: string;
}

export function useNavigationGuidance({
  routeSteps,
  userPosition,
  destination,
  isRouteActive,
  routeKey,
}: NavigationGuidanceOptions) {
  const [isGuidanceActive, setIsGuidanceActive] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const spokenKeyRef = useRef<string | null>(null);

  const steps = useMemo(
    () => routeSteps.filter((step) => step.instruction !== 'Has llegado a tu destino.'),
    [routeSteps]
  );
  const voiceSupported = isSpeechSupported();
  const currentStep = steps[currentStepIndex] ?? null;
  const remainingSteps = useMemo(
    () => steps.slice(currentStep ? currentStepIndex : 0, currentStep ? currentStepIndex + 4 : 4),
    [currentStep, currentStepIndex, steps]
  );
  const nextSteps = useMemo(
    () => remainingSteps.slice(currentStep ? 1 : 0),
    [currentStep, remainingSteps]
  );
  const currentStepLabel = currentStep ? `${currentStepIndex + 1}/${steps.length}` : null;
  const destinationDistance = useMemo(
    () => (userPosition && destination ? distanceBetweenPoints(userPosition, destination) : null),
    [destination, userPosition]
  );

  useEffect(() => {
    setIsGuidanceActive(false);
    setVoiceEnabled(false);
    setCurrentStepIndex(0);
    spokenKeyRef.current = null;

    if (voiceSupported) {
      window.speechSynthesis.cancel();
    }
  }, [routeKey, voiceSupported]);

  useEffect(() => {
    if (isRouteActive) {
      return;
    }

    setIsGuidanceActive(false);
    setCurrentStepIndex(0);
    spokenKeyRef.current = null;

    if (voiceSupported) {
      window.speechSynthesis.cancel();
    }
  }, [isRouteActive, voiceSupported]);

  useEffect(() => {
    if (!isGuidanceActive || !userPosition || !steps.length) {
      return;
    }

    if (destinationDistance !== null && destinationDistance <= DESTINATION_REACHED_METERS) {
      setCurrentStepIndex(Math.max(steps.length - 1, 0));
      return;
    }

    const indexedStepDistances = steps
      .map((step, index) => ({
        index,
        distance: step.location ? distanceBetweenPoints(userPosition, step.location) : Number.POSITIVE_INFINITY,
      }))
      .filter((entry) => Number.isFinite(entry.distance));

    if (!indexedStepDistances.length) {
      return;
    }

    const nearestStep = indexedStepDistances.reduce((closest, current) =>
      current.distance < closest.distance ? current : closest
    );

    setCurrentStepIndex((previousIndex) => {
      if (nearestStep.index < previousIndex) {
        return previousIndex;
      }

      if (
        nearestStep.distance <= MANEUVER_NEARBY_METERS
        || (nearestStep.index > previousIndex && nearestStep.distance <= MANEUVER_LOOKAHEAD_METERS)
      ) {
        return nearestStep.index;
      }

      return previousIndex;
    });
  }, [destinationDistance, isGuidanceActive, steps, userPosition]);

  useEffect(() => {
    if (!voiceSupported || !voiceEnabled || !isGuidanceActive || !currentStep) {
      return;
    }

    const utteranceKey = `${routeKey}:${currentStepIndex}`;
    if (spokenKeyRef.current === utteranceKey) {
      return;
    }

    const utterance = new SpeechSynthesisUtterance(buildVoiceAnnouncement(currentStep, currentStepIndex, steps.length));
    const selectedVoice = resolveSpanishVoice();

    utterance.lang = selectedVoice?.lang ?? 'es-ES';
    utterance.voice = selectedVoice;
    utterance.rate = 1.02;
    utterance.pitch = 1;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    spokenKeyRef.current = utteranceKey;
  }, [currentStep, currentStepIndex, isGuidanceActive, routeKey, steps.length, voiceEnabled, voiceSupported]);

  useEffect(() => {
    if (voiceEnabled || !voiceSupported) {
      return;
    }

    window.speechSynthesis.cancel();
  }, [voiceEnabled, voiceSupported]);

  useEffect(() => {
    return () => {
      if (voiceSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [voiceSupported]);

  const startGuidance = () => {
    setIsGuidanceActive(true);
    setCurrentStepIndex((previousIndex) => Math.min(previousIndex, Math.max(steps.length - 1, 0)));
  };

  const stopGuidance = () => {
    setIsGuidanceActive(false);
    spokenKeyRef.current = null;

    if (voiceSupported) {
      window.speechSynthesis.cancel();
    }
  };

  const toggleVoice = () => {
    if (!voiceSupported) {
      return;
    }

    spokenKeyRef.current = null;
    setVoiceEnabled((current) => !current);
  };

  const goToNextStep = () => {
    setCurrentStepIndex((previousIndex) => Math.min(previousIndex + 1, Math.max(steps.length - 1, 0)));
    spokenKeyRef.current = null;
  };

  const goToPreviousStep = () => {
    setCurrentStepIndex((previousIndex) => Math.max(previousIndex - 1, 0));
    spokenKeyRef.current = null;
  };

  return {
    currentStep,
    currentStepIndex,
    currentStepLabel,
    isGuidanceActive,
    nextSteps,
    remainingSteps,
    startGuidance,
    stopGuidance,
    toggleVoice,
    voiceEnabled,
    voiceSupported,
    goToNextStep,
    goToPreviousStep,
    canGoNext: currentStepIndex < steps.length - 1,
    canGoPrevious: currentStepIndex > 0,
    hasReachedDestination: destinationDistance !== null && destinationDistance <= DESTINATION_REACHED_METERS,
  };
}
