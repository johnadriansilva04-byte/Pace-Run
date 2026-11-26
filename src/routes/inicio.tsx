import { createFileRoute } from "@tanstack/react-router";
import { Home } from "@/components/pace/Home";

export const Route = createFileRoute("/inicio")({
  head: () => ({
    meta: [
      { title: "PACE RUN — seu percurso. seus números. sua história." },
      {
        name: "description",
        content:
          "Grave corridas, caminhadas e pedais com um painel de telemetria ao vivo gravado direto no vídeo.",
      },
      { property: "og:title", content: "PACE RUN" },
      {
        property: "og:description",
        content: "Câmera esportiva com distância, pace, velocidade e elevação no vídeo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});
