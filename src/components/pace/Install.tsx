import { useState } from "react";
import { ArrowRight, Check, Download, Info, Loader2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { installGuide, promptInstall, useInstall, usePlatform } from "@/lib/pwa";

function scrollToInstall() {
  document.getElementById("instalacao")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-display font-bold tracking-wider transition disabled:opacity-60";

export function InstallButton({
  size = "lg",
  className = "",
}: {
  size?: "lg" | "md";
  className?: string;
}) {
  const { installed, canPrompt } = useInstall();
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);

  if (installed) {
    return (
      <a
        href="/inicio"
        className={`${base} ${size === "lg" ? "px-7 py-4 text-lg" : "px-5 py-3"} bg-primary text-primary-foreground shadow-glow hover:scale-[1.02] ${className}`}
      >
        ABRIR PACE RUN <ArrowRight className="h-5 w-5" />
      </a>
    );
  }

  const onClick = async () => {
    if (!canPrompt) {
      scrollToInstall();
      return;
    }
    setBusy(true);
    const outcome = await promptInstall();
    setBusy(false);
    if (outcome === "accepted") {
      setAccepted(true);
      toast.success("Instalação iniciada. Abra o PACE RUN pelo ícone na tela inicial.");
    } else if (outcome === "dismissed") {
      toast("Instalação cancelada. Toque em INSTALAR PACE RUN para tentar de novo.");
    } else {
      scrollToInstall();
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`${base} ${size === "lg" ? "px-7 py-4 text-lg" : "px-5 py-3"} bg-primary text-primary-foreground shadow-glow hover:scale-[1.02] ${className}`}
    >
      {busy ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : accepted ? (
        <Check className="h-5 w-5" />
      ) : (
        <Download className="h-5 w-5" />
      )}
      {accepted ? "INSTALAÇÃO INICIADA" : "INSTALAR PACE RUN"}
    </button>
  );
}

function StatusPill({ installed, canPrompt }: { installed: boolean; canPrompt: boolean }) {
  const tone = installed
    ? "border-primary/60 bg-primary/10 text-primary"
    : canPrompt
      ? "border-primary/40 bg-primary/10 text-primary"
      : "border-border bg-secondary text-muted-foreground";
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-display text-xs tracking-widest ${tone}`}
    >
      <span className="h-2 w-2 rounded-full bg-current" />
      {installed
        ? "INSTALADO NESTE DISPOSITIVO"
        : canPrompt
          ? "PRONTO PARA INSTALAR"
          : "INSTALAÇÃO PELO NAVEGADOR"}
    </span>
  );
}

function Steps({ steps }: { steps: string[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((step, index) => (
        <li key={step} className="flex gap-3 text-sm text-muted-foreground">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-secondary font-display text-xs font-bold text-primary">
            {index + 1}
          </span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}

export function InstallSection() {
  const { installed, canPrompt } = useInstall();
  const guide = installGuide(usePlatform());

  return (
    <section id="instalacao" className="scroll-mt-24">
      <div className="speed-lines overflow-hidden rounded-2xl border border-border bg-card/70 p-6 md:p-10">
        <div className="grid gap-8 md:grid-cols-[1fr_1fr]">
          <div>
            <StatusPill installed={installed} canPrompt={canPrompt} />
            <h2 className="mt-4 font-display text-3xl font-bold leading-tight md:text-4xl">
              INSTALE UMA VEZ.
              <br />
              <span className="text-speed">TREINE SEMPRE.</span>
            </h2>
            <p className="mt-3 max-w-sm text-muted-foreground">
              O PACE RUN vira um ícone no seu celular, abre em tela cheia e guarda o essencial para
              funcionar mesmo com internet instável.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <InstallButton size="md" />
              <a
                href="/inicio"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary px-5 py-3 font-display font-bold tracking-wider text-foreground hover:bg-muted"
              >
                USAR NO NAVEGADOR
              </a>
            </div>
            <p className="mt-5 flex items-start gap-2 rounded-lg border border-border bg-background/40 p-3 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />A instalação não concede
              permissões. Câmera e localização só são pedidas quando você toca em INICIAR ATIVIDADE
              dentro do aplicativo.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background/50 p-5">
            <h3 className="flex items-center gap-2 font-display text-sm tracking-widest text-primary">
              <Smartphone className="h-4 w-4" /> {guide.title.toUpperCase()}
            </h3>
            <div className="mt-4">
              <Steps steps={guide.steps} />
            </div>
            {guide.note && <p className="mt-4 text-xs text-muted-foreground">{guide.note}</p>}
            <p className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
              Depois de instalar, abra o PACE RUN pelo ícone. A primeira tela é a página inicial do
              aplicativo, não esta página de instalação.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
