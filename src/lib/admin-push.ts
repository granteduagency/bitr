import { invokePublicFunction } from "@/lib/public-functions";
import { supabase } from "@/lib/supabase";

export type AdminPushServiceTab =
  | "ikamet"
  | "sigorta"
  | "visa"
  | "tercume"
  | "hukuk"
  | "calisma"
  | "universite";

type AdminPushPublicKeyResponse = {
  publicKey: string;
};

type EnsureAdminPushSubscriptionOptions = {
  requestPermission?: boolean;
};

const urlBase64ToUint8Array = (value: string) => {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);

  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
};

export async function ensureAdminPushSubscription(
  options: EnsureAdminPushSubscriptionOptions = {},
) {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return false;
  }

  const permission =
    Notification.permission === "granted"
      ? "granted"
      : options.requestPermission
        ? await Notification.requestPermission()
        : Notification.permission;

  if (permission !== "granted") {
    return false;
  }

  const { publicKey } = await invokePublicFunction<AdminPushPublicKeyResponse>(
    "admin-push",
    { action: "public-key" },
  );

  if (!publicKey) {
    return false;
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const { error } = await supabase.functions.invoke("admin-push", {
    body: {
      action: "subscribe",
      subscription: subscription.toJSON(),
    },
  });

  if (error) {
    throw new Error(error.message || "Push subscription could not be saved.");
  }

  return true;
}

export async function removeAdminPushSubscription() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    return;
  }

  await supabase.functions.invoke("admin-push", {
    body: {
      action: "unsubscribe",
      endpoint: subscription.endpoint,
    },
  });

  await subscription.unsubscribe();
}

export async function notifyAdminNewApplication(
  serviceTab: AdminPushServiceTab,
  applicationId: string,
) {
  await invokePublicFunction("admin-push", {
    action: "notify",
    serviceTab,
    applicationId,
  });
}
