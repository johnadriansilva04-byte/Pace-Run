import { QueryClient } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { routeTree } from "@/routeTree.gen";

let onPosition: PositionCallback | undefined;
const watchPosition = vi.fn((success: PositionCallback) => {
  onPosition = success;
  return 7;
});
const getUserMedia = vi.fn();

async function renderPreparar() {
  const router = createRouter({
    routeTree,
    context: { queryClient: new QueryClient() },
    history: createMemoryHistory({ initialEntries: ["/preparar"] }),
  });
  await router.load();
  return render(<RouterProvider router={router} />);
}

describe("preparation page permissions", () => {
  beforeEach(() => {
    watchPosition.mockClear();
    getUserMedia.mockClear();
    getUserMedia.mockResolvedValue({
      getAudioTracks: () => [{ stop: vi.fn() }],
      getTracks: () => [{ stop: vi.fn() }],
    });
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { watchPosition, clearWatch: vi.fn() },
    });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia },
    });
  });

  it("does not touch camera or GPS until the user asks to verify", async () => {
    await renderPreparar();

    expect(await screen.findByRole("heading", { name: "Preparação" })).toBeInTheDocument();
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(watchPosition).not.toHaveBeenCalled();
    expect(screen.getByText("VERIFIQUE CÂMERA E GPS PARA CONTINUAR")).toBeInTheDocument();
  });

  it("verifies camera and GPS after the explicit tap, then enables the camera", async () => {
    await renderPreparar();

    fireEvent.click(
      await screen.findByRole("button", { name: /VERIFICAR CÂMERA, GPS E MICROFONE/ }),
    );

    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(1));
    expect(getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({ video: expect.anything(), audio: true }),
    );
    expect(watchPosition).toHaveBeenCalledTimes(1);

    act(() => {
      onPosition?.({
        coords: {
          latitude: -23.55,
          longitude: -46.63,
          accuracy: 8,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      } as GeolocationPosition);
    });

    const open = await screen.findByRole("link", { name: "ABRIR CÂMERA ESPORTIVA" });
    expect(open).toHaveAttribute("href", "/camera");
    expect(screen.getByText(/Pronta \(teste encerrado, câmera desligada\)/)).toBeInTheDocument();
  });
});
