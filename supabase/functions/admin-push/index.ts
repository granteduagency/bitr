import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const WEB_PUSH_PUBLIC_KEY = Deno.env.get("WEB_PUSH_PUBLIC_KEY") || "";
const WEB_PUSH_PRIVATE_KEY = Deno.env.get("WEB_PUSH_PRIVATE_KEY") || "";
const WEB_PUSH_SUBJECT = Deno.env.get("WEB_PUSH_SUBJECT") || "mailto:info@example.com";
const APP_BASE_URL = (Deno.env.get("APP_BASE_URL") || "http://localhost:3000").replace(/\/+$/, "");

const serviceTableMap = {
  ikamet: "ikamet_applications",
  sigorta: "sigorta_applications",
  visa: "visa_applications",
  tercume: "tercume_applications",
  hukuk: "hukuk_applications",
  calisma: "calisma_applications",
  universite: "university_applications",
} as const;

type ServiceTab = keyof typeof serviceTableMap;

type StoredPushSubscription = {
  endpoint?: string;
  keys?: {
    auth?: string;
    p256dh?: string;
  };
};

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const requireConfiguredKeys = () => {
  if (!WEB_PUSH_PUBLIC_KEY || !WEB_PUSH_PRIVATE_KEY) {
    throw new Error("Web push keys are not configured.");
  }

  webpush.setVapidDetails(WEB_PUSH_SUBJECT, WEB_PUSH_PUBLIC_KEY, WEB_PUSH_PRIVATE_KEY);
};

const isServiceTab = (value: string): value is ServiceTab =>
  Object.prototype.hasOwnProperty.call(serviceTableMap, value);

const getAuthorizationToken = (req: Request) => {
  const header = req.headers.get("Authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
};

const requireAdminUser = async (req: Request) => {
  const token = getAuthorizationToken(req);
  if (!token) {
    throw new Error("Missing auth token.");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    throw new Error("Invalid auth token.");
  }

  const { data: roleRow, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (roleError || !roleRow) {
    throw new Error("Admin access required.");
  }

  return user;
};

const buildServiceLabel = (serviceTab: ServiceTab) => {
  const labels: Record<ServiceTab, string> = {
    ikamet: "ikamet",
    sigorta: "sigorta",
    visa: "viza",
    tercume: "tercume",
    hukuk: "hukuk",
    calisma: "calisma",
    universite: "universite",
  };

  return labels[serviceTab];
};

const fetchApplicationSummary = async (serviceTab: ServiceTab, applicationId: string) => {
  const { data, error } = await supabase
    .from(serviceTableMap[serviceTab])
    .select("id, created_at, clients(name, phone)")
    .eq("id", applicationId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Application could not be found.");
  }

  const relation = (data as { clients?: unknown }).clients;
  const clientList = Array.isArray(relation)
    ? (relation as Array<{ name?: string | null; phone?: string | null }>)
    : null;
  const client = clientList?.[0]
    ?? (Array.isArray(relation)
      ? null
      : ((relation as { name?: string | null; phone?: string | null } | null) ?? null));

  return {
    id: data.id as string,
    createdAt: typeof data.created_at === "string" ? data.created_at : new Date().toISOString(),
    clientName: client?.name?.trim() || "",
    clientPhone: client?.phone?.trim() || "",
  };
};

const sendPushToAllSubscribers = async (payload: {
  title: string;
  body: string;
  serviceTab: ServiceTab;
  applicationId: string;
}) => {
  requireConfiguredKeys();

  const { data: subscriptions, error } = await supabase
    .from("admin_push_subscriptions")
    .select("id, endpoint, subscription");

  if (error) {
    throw error;
  }

  if (!subscriptions || subscriptions.length === 0) {
    return { sent: 0 };
  }

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    data: {
      url: `${APP_BASE_URL}/admin?notification=1&tab=${payload.serviceTab}&id=${payload.applicationId}`,
    },
  });

  const staleSubscriptionIds: string[] = [];
  let sent = 0;

  await Promise.all(
    subscriptions.map(async (subscriptionRow) => {
      try {
        await webpush.sendNotification(
          subscriptionRow.subscription as StoredPushSubscription,
          notificationPayload,
        );
        sent += 1;
      } catch (error) {
        const statusCode =
          typeof error === "object" && error !== null && "statusCode" in error
            ? Number((error as { statusCode?: unknown }).statusCode)
            : 0;

        if (statusCode === 404 || statusCode === 410) {
          staleSubscriptionIds.push(subscriptionRow.id as string);
          return;
        }

        console.error("Push send error:", error);
      }
    }),
  );

  if (staleSubscriptionIds.length > 0) {
    await supabase.from("admin_push_subscriptions").delete().in("id", staleSubscriptionIds);
  }

  return { sent };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    const payload = await req.json().catch(() => ({})) as {
      action?: string;
      subscription?: StoredPushSubscription;
      endpoint?: string;
      serviceTab?: string;
      applicationId?: string;
    };

    if (payload.action === "public-key") {
      return jsonResponse({ publicKey: WEB_PUSH_PUBLIC_KEY });
    }

    if (payload.action === "subscribe") {
      const user = await requireAdminUser(req);
      const subscription = payload.subscription;
      const endpoint = subscription?.endpoint?.trim() || "";

      if (!endpoint || !subscription?.keys?.auth || !subscription?.keys?.p256dh) {
        return jsonResponse({ error: "Invalid subscription payload." }, 400);
      }

      const { error } = await supabase.from("admin_push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint,
          subscription,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" },
      );

      if (error) {
        throw error;
      }

      return jsonResponse({ success: true });
    }

    if (payload.action === "unsubscribe") {
      const user = await requireAdminUser(req);
      const endpoint = payload.endpoint?.trim() || "";

      if (!endpoint) {
        return jsonResponse({ error: "Missing subscription endpoint." }, 400);
      }

      const { error } = await supabase
        .from("admin_push_subscriptions")
        .delete()
        .eq("user_id", user.id)
        .eq("endpoint", endpoint);

      if (error) {
        throw error;
      }

      return jsonResponse({ success: true });
    }

    if (payload.action === "notify") {
      const serviceTab = payload.serviceTab?.trim() || "";
      const applicationId = payload.applicationId?.trim() || "";

      if (!isServiceTab(serviceTab) || !applicationId) {
        return jsonResponse({ error: "Invalid notify payload." }, 400);
      }

      const application = await fetchApplicationSummary(serviceTab, applicationId);
      const body = application.clientName || application.clientPhone || "Yangi mijoz";
      const result = await sendPushToAllSubscribers({
        title: `Yangi ${buildServiceLabel(serviceTab)} arizasi`,
        body,
        serviceTab,
        applicationId,
      });

      return jsonResponse({ success: true, ...result });
    }

    return jsonResponse({ error: "Unsupported action." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return jsonResponse({ error: message }, 500);
  }
});
