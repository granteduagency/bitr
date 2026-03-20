import { invokePublicFunction } from "@/lib/public-functions";
import i18n from "@/i18n/config";
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

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error(i18n.t("common.requestFailed"));
  }

  const { error } = await supabase.from("admin_push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: subscription.endpoint,
      subscription: subscription.toJSON(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    throw new Error(error.message || i18n.t("common.requestFailed"));
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await supabase
      .from("admin_push_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .eq("endpoint", subscription.endpoint);
  }

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
