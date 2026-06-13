type BeforeInstallPromptChoice = {
  outcome: "accepted" | "dismissed";
  platform: string;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<BeforeInstallPromptChoice>;
};

type StandaloneNavigator = Navigator & {
  standalone?: boolean;
};

export type PwaInstallState = {
  canInstall: boolean;
  isInstalled: boolean;
  isIos: boolean;
  showIosHint: boolean;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let listeners = new Set<(state: PwaInstallState) => void>();
let isListening = false;

const isBrowser = () => typeof window !== "undefined";

const isIosDevice = () => {
  if (!isBrowser()) {
    return false;
  }

  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
};

const isStandaloneMode = () => {
  if (!isBrowser()) {
    return false;
  }

  const standaloneNavigator = window.navigator as StandaloneNavigator;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    standaloneNavigator.standalone === true
  );
};

const getStateSnapshot = (): PwaInstallState => {
  const isInstalled = isStandaloneMode();
  const isIos = isIosDevice();

  return {
    canInstall: deferredPrompt !== null && !isInstalled,
    isInstalled,
    isIos,
    showIosHint: isIos && !isInstalled,
  };
};

const emitState = () => {
  const nextState = getStateSnapshot();
  listeners.forEach((listener) => listener(nextState));
};

const handleBeforeInstallPrompt = (event: Event) => {
  const promptEvent = event as BeforeInstallPromptEvent;
  promptEvent.preventDefault();
  deferredPrompt = promptEvent;
  emitState();
};

const handleInstalled = () => {
  deferredPrompt = null;
  emitState();
};

const handleDisplayModeChange = () => {
  emitState();
};

const ensureInstallListeners = () => {
  if (!isBrowser() || isListening) {
    return;
  }

  isListening = true;
  window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  window.addEventListener("appinstalled", handleInstalled);

  const displayModeQuery = window.matchMedia("(display-mode: standalone)");
  const legacyDisplayModeQuery = displayModeQuery as MediaQueryList & {
    addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
  };

  if (typeof displayModeQuery.addEventListener === "function") {
    displayModeQuery.addEventListener("change", handleDisplayModeChange);
  } else if (typeof legacyDisplayModeQuery.addListener === "function") {
    legacyDisplayModeQuery.addListener(handleDisplayModeChange);
  }
};

export const getPwaInstallState = () => getStateSnapshot();

export const subscribeToPwaInstallState = (
  listener: (state: PwaInstallState) => void,
) => {
  ensureInstallListeners();
  listeners.add(listener);
  listener(getStateSnapshot());

  return () => {
    listeners.delete(listener);
  };
};

export const promptForInstall = async () => {
  if (!deferredPrompt) {
    return "unavailable" as const;
  }

  const promptEvent = deferredPrompt;
  deferredPrompt = null;
  emitState();

  await promptEvent.prompt();
  const choice = await promptEvent.userChoice;
  emitState();

  return choice.outcome;
};

export const registerServiceWorker = () => {
  if (!isBrowser() || !("serviceWorker" in navigator) || !import.meta.env.PROD) {
    return;
  }

  const isBuiltFromDist = window.location.pathname.includes("/dist/");
  const swUrl = isBuiltFromDist ? "../sw.js" : `${import.meta.env.BASE_URL}sw.js`;
  const scope = isBuiltFromDist ? "../" : import.meta.env.BASE_URL;

  window.addEventListener(
    "load",
    async () => {
      try {
        await navigator.serviceWorker.register(swUrl, { scope });
        console.info("Service Worker registrado");
      } catch (error) {
        console.error("Error registrando Service Worker:", error);
      }
    },
    { once: true },
  );
};

ensureInstallListeners();
