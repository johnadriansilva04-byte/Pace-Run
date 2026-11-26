import { createFileRoute } from "@tanstack/react-router";
import { Landing } from "@/components/pace/Landing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PACE RUN — instale o app de telemetria na câmera" },
      {
        name: "description",
        content:
          "Instale o PACE RUN no celular e grave corridas, caminhadas e pedais com distância, pace, velocidade e elevação no vídeo.",
      },
      { property: "og:title", content: "PACE RUN — instale o aplicativo" },
      {
        property: "og:description",
        content:
          "Aplicativo instalável para Android e Chrome: câmera esportiva com telemetria ao vivo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});
