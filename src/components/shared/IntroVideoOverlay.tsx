import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface IntroVideoOverlayProps {
  enabled: boolean;
  storageKey: string;
  videoId: string;
  title: string;
}

export function IntroVideoOverlay({
  enabled,
  storageKey,
  videoId,
  title,
}: IntroVideoOverlayProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      setIsOpen(false);
      return;
    }

    const hasSeenVideo = window.localStorage.getItem(storageKey) === "1";
    if (!hasSeenVideo) {
      setIsOpen(true);
    }
  }, [enabled, storageKey]);

  const closeOverlay = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, "1");
    }

    setIsOpen(false);
  };

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4"
      onClick={closeOverlay}
    >
      <div
        className="w-full max-w-[360px] overflow-hidden rounded-[1.75rem] bg-black shadow-2xl sm:max-w-[420px]"
        onClick={(event) => event.stopPropagation()}
      >
        <iframe
          className="h-[calc(100vh-200px)] w-full max-h-[680px] min-h-[360px]"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </div>,
    document.body,
  );
}
