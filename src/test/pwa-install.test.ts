import { describe, expect, it, vi } from "vitest";
import {
  detectPlatform,
  installGuide,
  isInstalled,
  promptInstall,
  type BeforeInstallPromptEvent,
  type InstallPlatform,
} from "@/lib/pwa";

const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const ANDROID_SAMSUNG =
  "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/24.0 Chrome/117.0.0.0 Mobile Safari/537.36";
const ANDROID_FIREFOX = "Mozilla/5.0 (Android 14; Mobile; rv:127.0) Gecko/127.0 Firefox/127.0";
const IOS_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const IOS_CHROME =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1";
const DESKTOP_CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

describe("platform detection", () => {
  const cases: [string, InstallPlatform, number?][] = [
    [ANDROID_CHROME, "chrome-android"],
    [ANDROID_SAMSUNG, "samsung-android"],
    [ANDROID_FIREFOX, "firefox-android"],
    [IOS_SAFARI, "ios-safari"],
    [IOS_CHROME, "ios-other"],
    [DESKTOP_CHROME, "desktop"],
    ["", "other"],
  ];

  it.each(cases)("maps %s", (ua, expected) => {
    expect(detectPlatform(ua, { touchPoints: 0 })).toBe(expected);
  });

  it("treats iPadOS desktop-class Safari as iOS", () => {
    expect(
      detectPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", { touchPoints: 5 }),
    ).toBe("ios-safari");
  });
});

describe("install guidance", () => {
  const platforms: InstallPlatform[] = [
    "chrome-android",
    "samsung-android",
    "firefox-android",
    "ios-safari",
    "ios-other",
    "desktop",
    "other",
  ];

  it.each(platforms)("gives manual steps for %s", (platform) => {
    const guide = installGuide(platform);
    expect(guide.title.length).toBeGreaterThan(0);
    expect(guide.steps.length).toBeGreaterThanOrEqual(2);
  });

  it("points iPhone users to Safari and the home screen", () => {
    const guide = installGuide("ios-safari");
    expect(guide.steps.join(" ")).toContain("Adicionar à Tela de Início");
    expect(installGuide("ios-other").steps.join(" ")).toContain("Safari");
  });
});

describe("beforeinstallprompt handling", () => {
  it("starts uninstalled and without a prompt", () => {
    expect(isInstalled()).toBe(false);
  });

  it("cancels the browser banner, then installs from the app button", async () => {
    const prompt = vi.fn().mockResolvedValue(undefined);
    const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
      platforms: ["web"],
      prompt,
      userChoice: Promise.resolve({ outcome: "accepted", platform: "web" }),
    }) as BeforeInstallPromptEvent;

    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);

    await expect(promptInstall()).resolves.toBe("accepted");
    expect(prompt).toHaveBeenCalledTimes(1);

    // The deferred event is single-use: a second tap must fall back to manual instructions.
    await expect(promptInstall()).resolves.toBe("unavailable");
  });

  it("reports the installed state after appinstalled", async () => {
    window.dispatchEvent(new Event("appinstalled"));
    expect(isInstalled()).toBe(true);
  });
});
