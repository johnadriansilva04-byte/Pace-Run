import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InstallButton, InstallSection } from "@/components/pace/Install";
import type { BeforeInstallPromptEvent } from "@/lib/pwa";

function deferredPrompt(outcome: "accepted" | "dismissed") {
  const prompt = vi.fn().mockResolvedValue(undefined);
  const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
    platforms: ["web"],
    prompt,
    userChoice: Promise.resolve({ outcome, platform: "web" }),
  }) as BeforeInstallPromptEvent;
  return { event, prompt };
}

describe("install UI", () => {
  it("explains the manual install path when the browser has no prompt", () => {
    render(<InstallSection />);

    expect(screen.getByText("INSTALAÇÃO PELO NAVEGADOR")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /INSTALAR PACE RUN/ }).length).toBeGreaterThan(0);
    expect(screen.getByText(/A instalação não concede permissões/i)).toBeInTheDocument();
    expect(screen.getByText(/não esta página de instalação/i)).toBeInTheDocument();
  });

  it("scrolls to the instructions when the prompt is unavailable", () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    render(<InstallSection />);

    fireEvent.click(screen.getAllByRole("button", { name: /INSTALAR PACE RUN/ })[0]!);

    expect(scrollIntoView).toHaveBeenCalled();
  });

  it("uses beforeinstallprompt when Chrome offers it", async () => {
    const { event, prompt } = deferredPrompt("accepted");
    window.dispatchEvent(event);

    render(<InstallSection />);
    expect(screen.getByText("PRONTO PARA INSTALAR")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /INSTALAR PACE RUN/ })[0]!);

    await waitFor(() => expect(prompt).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("INSTALAÇÃO INICIADA")).toBeInTheDocument();
  });

  it("opens the app instead of offering the install once installed", () => {
    window.dispatchEvent(new Event("appinstalled"));

    render(<InstallButton />);

    const link = screen.getByRole("link", { name: /ABRIR PACE RUN/ });
    expect(link).toHaveAttribute("href", "/inicio");
  });
});
