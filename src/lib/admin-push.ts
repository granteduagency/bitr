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

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const urlBase64ToUint8Array = (value: string) => {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);

  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
};

const readFunctionError = (payload: unknown) => {
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const message = (payload as { message?: unknown }).message;
    const error = (payload as { error?: unknown }).error;

    if (typeof message === "string" && message.trim()) {
      return message;
    }

    if (typeof error === "string" && error.trim()) {
      return error;
    }
  }

  return "";
};

const getAdminAccessToken = async () => {
  const {
    data: { session: currentSession },
  } = await supabase.auth.getSession();

  const currentToken = currentSession?.access_token?.trim();
  if (currentToken) {
    return currentToken;
  }

  const {
    data: { session: refreshedSession },
    error,
  } = await supabase.auth.refreshSession();

  const refreshedToken = refreshedSession?.access_token?.trim();
  if (error || !refreshedToken) {
    throw new Error("Admin session is missing.");
  }

  return refreshedToken;
};

const sendAdminPushRequest = async (token: string, body: unknown) =>
  fetch(`${SUPABASE_URL}/functions/v1/admin-push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

const invokeAdminPushFunction = async <T>(body: unknown): Promise<T> => {
  let token = await getAdminAccessToken();
  let response = await sendAdminPushRequest(token, body);

  if (response.status === 401) {
    const {
      data: { session: refreshedSession },
    } = await supabase.auth.refreshSession();

    const refreshedToken = refreshedSession?.access_token?.trim();
    if (refreshedToken) {
      token = refreshedToken;
      response = await sendAdminPushRequest(token, body);
    }
  }

  const raw = await response.text();
  let payload: unknown = null;

  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = raw;
    }
  }

  if (!response.ok) {
    throw new Error(readFunctionError(payload) || `admin-push failed with status ${response.status}.`);
  }

  return payload as T;
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

  await invokeAdminPushFunction<{ success: boolean }>({
      action: "subscribe",
      subscription: subscription.toJSON(),
  });

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

  await invokeAdminPushFunction<{ success: boolean }>({
    action: "unsubscribe",
    endpoint: subscription.endpoint,
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
