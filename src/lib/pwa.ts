// Install-related browser state. The `beforeinstallprompt` listener lives at module scope
// because Chrome fires it right after load, often before React has mounted.
import { useEffect, useState, useSyncExternalStore } from "react";

export type BeforeInstallPromptEvent = Event & {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt: () => Promise<void>;
};

export type InstallPlatform =
  | "chrome-android"
  | "samsung-android"
  | "firefox-android"
  | "ios-safari"
  | "ios-other"
  | "desktop"
  | "other";

export type InstallSnapshot = { canPrompt: boolean; installed: boolean };

const DISPLAY_MODES = [
  "(display-mode: standalone)",
  "(display-mode: minimal-ui)",
  "(display-mode: fullscreen)",
  "(display-mode: window-controls-overlay)",
];

const isBrowser = typeof window !== "undefined";

let deferred: BeforeInstallPromptEvent | null = null;
let installedByEvent = false;
let snapshot: InstallSnapshot = { canPrompt: false, installed: false };
const listeners = new Set<() => void>();

export function isInstalled(): boolean {
  if (!isBrowser) return false;
  const standalone = DISPLAY_MODES.some((query) => window.matchMedia?.(query).matches === true);
  const iosStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  const fromAndroidApp = document.referrer.startsWith("android-app://");
  return installedByEvent || standalone || iosStandalone || fromAndroidApp;
}

function publish() {
  snapshot = { canPrompt: deferred !== null, installed: isInstalled() };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return snapshot;
}

const serverSnapshot: InstallSnapshot = { canPrompt: false, installed: false };
function getServerSnapshot() {
  return serverSnapshot;
}

if (isBrowser) {
  snapshot = { canPrompt: false, installed: isInstalled() };
  window.addEventListener("beforeinstallprompt", (event) => {
    // Chrome only shows its own mini-infobar when the event is not cancelled; we cancel it
    // so the install always starts from the PACE RUN button.
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    publish();
  });
  window.addEventListener("appinstalled", () => {
    installedByEvent = true;
    deferred = null;
    publish();
  });
  for (const query of DISPLAY_MODES) {
    window.matchMedia?.(query).addEventListener?.("change", publish);
  }
}

export type InstallOutcome = "accepted" | "dismissed" | "unavailable";

export async function promptInstall(): Promise<InstallOutcome> {
  const event = deferred;
  if (!event) return "unavailable";
  deferred = null;
  publish();
  try {
    await event.prompt();
    const choice = await event.userChoice;
    // `appinstalled` (not userChoice) confirms the install; the button shows an
    // "installation started" state until then.
    publish();
    return choice.outcome;
  } catch {
    publish();
    return "dismissed";
  }
}

export function useInstall(): InstallSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// Resolved after mount so server and client render the same generic guidance first.
export function usePlatform(): InstallPlatform {
  const [platform, setPlatform] = useState<InstallPlatform>("other");
  useEffect(() => setPlatform(detectPlatform()), []);
  return platform;
}

export function detectPlatform(
  userAgent = isBrowser ? window.navigator.userAgent : "",
  { touchPoints = isBrowser ? window.navigator.maxTouchPoints : 0 } = {},
): InstallPlatform {
  const ua = userAgent;
  const ipadOs = /Macintosh/.test(ua) && touchPoints > 1;
  const ios = /iPad|iPhone|iPod/.test(ua) || ipadOs;
  if (ios) {
    return /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/.test(ua) ? "ios-other" : "ios-safari";
  }
  if (/Android/.test(ua)) {
    if (/SamsungBrowser/.test(ua)) return "samsung-android";
    if (/Firefox|FxiOS/.test(ua)) return "firefox-android";
    return "chrome-android";
  }
  if (/Windows|Macintosh|Linux|CrOS/.test(ua)) return "desktop";
  return "other";
}

export type InstallGuide = { title: string; steps: string[]; note?: string };

export function installGuide(platform: InstallPlatform): InstallGuide {
  switch (platform) {
    case "chrome-android":
      return {
        title: "Instalar no Chrome (Android)",
        steps: [
          "Toque em INSTALAR PACE RUN. Se a janela de instalação não abrir, toque no menu ⋮ no canto superior direito do Chrome.",
          'Escolha "Instalar aplicativo" (ou "Adicionar à tela inicial").',
          'Confirme em "Instalar".',
        ],
        note: "O ícone PACE RUN fica na tela inicial e abre sem a barra do navegador.",
      };
    case "samsung-android":
      return {
        title: "Instalar no Samsung Internet",
        steps: [
          "Toque no menu ☰ no canto inferior direito.",
          'Escolha "Adicionar página a" e depois "Tela inicial".',
          'Confirme em "Adicionar".',
        ],
      };
    case "firefox-android":
      return {
        title: "Instalar no Firefox (Android)",
        steps: [
          "Toque no menu ⋮ no canto superior direito.",
          'Escolha "Instalar" ou "Adicionar à tela inicial".',
          'Confirme em "Adicionar".',
        ],
      };
    case "ios-safari":
      return {
        title: "Instalar no iPhone ou iPad (Safari)",
        steps: [
          "Toque no botão Compartilhar (quadrado com uma seta para cima).",
          'Escolha "Adicionar à Tela de Início".',
          'Toque em "Adicionar".',
        ],
        note: "No iPhone e no iPad a instalação é feita pelo Safari. O app abre pelo ícone, sem a barra do navegador.",
      };
    case "ios-other":
      return {
        title: "Instalar no iPhone ou iPad",
        steps: [
          "Abra este endereço no Safari (no iOS, só o Safari instala aplicativos da web).",
          "Toque em Compartilhar e depois em “Adicionar à Tela de Início”.",
          'Confirme em "Adicionar".',
        ],
      };
    case "desktop":
      return {
        title: "Instalar no computador (Chrome ou Edge)",
        steps: [
          "Clique no ícone de instalação na barra de endereço (um monitor com uma seta) ou abra o menu ⋮.",
          'Escolha "Instalar PACE RUN".',
          'Confirme em "Instalar".',
        ],
        note: "O PACE RUN abre em uma janela própria, fora do navegador.",
      };
    default:
      return {
        title: "Instalar pelo navegador",
        steps: [
          "Abra o menu do navegador.",
          'Escolha "Instalar aplicativo" ou "Adicionar à tela inicial".',
          "Confirme a instalação.",
        ],
        note: "No Android, use o Chrome para a melhor experiência. No iPhone, use o Safari.",
      };
  }
}
