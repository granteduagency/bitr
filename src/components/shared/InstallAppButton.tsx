import { useEffect, useState } from "react";
import { Download, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

const isStandaloneMode = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);

export function InstallAppButton() {
  const { t } = useTranslation();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() =>
    typeof window !== "undefined" ? isStandaloneMode() : false,
  );

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setInstalled(isStandaloneMode());
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setInstalled(true);
      toast({
        title: t("common.appInstalled"),
      });
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [t]);

  const handleInstall = async () => {
    if (installed) {
      return;
    }

    if (!installPrompt) {
      toast({
        title: t("common.installApp"),
        description: t("common.installHelp"),
      });
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setInstallPrompt(null);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={handleInstall}
      title={installed ? t("common.appInstalled") : t("common.installApp")}
      className="rounded-full w-10 h-10 border-slate-200 bg-white hover:bg-slate-50 transition-colors"
    >
      {installed ? (
        <Check className="w-5 h-5 text-emerald-600" />
      ) : (
        <Download className="w-5 h-5 text-slate-600" />
      )}
    </Button>
  );
}
