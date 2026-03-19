import type { Session } from "@supabase/supabase-js";
import type { Tables } from "@/integrations/supabase/types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export type AdminServiceTab =
  | "ikamet"
  | "sigorta"
  | "visa"
  | "tercume"
  | "hukuk"
  | "calisma"
  | "universite";

export type AdminLeadTab = "clients" | "prospects";
export type AdminDashboardTab = "dashboard";
export type AdminFetchTab = AdminDashboardTab | AdminLeadTab | AdminServiceTab;

export type AdminClientRecord = Tables<"clients">;
export type AdminClientSummary = Pick<AdminClientRecord, "name" | "phone">;
export type AdminClientRelation = {
  clients?: AdminClientSummary | null;
  client?: AdminClientSummary | null;
};

export type AdminApplicationMap = {
  ikamet: Tables<"ikamet_applications"> & AdminClientRelation;
  sigorta: Tables<"sigorta_applications"> & AdminClientRelation;
  visa: Tables<"visa_applications"> & AdminClientRelation;
  tercume: Tables<"tercume_applications"> & AdminClientRelation;
  hukuk: Tables<"hukuk_applications"> & AdminClientRelation;
  calisma: Tables<"calisma_applications"> & AdminClientRelation;
  universite: Tables<"university_applications"> & AdminClientRelation;
};

export type AdminApplicationRecord = AdminApplicationMap[AdminServiceTab];
export type AdminLeadRecord = Tables<"client_leads">;
export type AdminActivityLogRecord = Tables<"client_activity_logs">;
export type AdminDashboardActivityPreview = AdminActivityLogRecord & {
  client_leads?: Pick<AdminLeadRecord, "name" | "phone"> | null;
};

export type AdminStats = {
  total: number;
  pending: number;
  completed: number;
  today: number;
  allClients: number;
  prospects: number;
  applicants: number;
};

export type AdminServiceCounts = Record<AdminServiceTab, number>;

export type AdminDashboardPayload = {
  stats: AdminStats;
  serviceCounts: AdminServiceCounts;
  clients: AdminLeadRecord[];
  prospects: AdminLeadRecord[];
  dashboardActivity: AdminDashboardActivityPreview[];
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

async function invokeAdminFunction<T>(session: Session | null, body: unknown): Promise<T> {
  const accessToken = session?.access_token?.trim();
  if (!accessToken) {
    throw new Error("Admin session is missing.");
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-dashboard`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

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
    throw new Error(readFunctionError(payload) || `admin-dashboard failed with status ${response.status}.`);
  }

  return payload as T;
}

export async function fetchAdminDashboardData(session: Session | null) {
  return invokeAdminFunction<AdminDashboardPayload>(session, { action: "dashboard" });
}

export async function fetchAdminTabData(session: Session | null, tab: AdminLeadTab | AdminServiceTab) {
  return invokeAdminFunction<{ rows: AdminLeadRecord[] | AdminApplicationRecord[] }>(session, {
    action: "tab-data",
    tab,
  });
}

export async function fetchAdminApplication(session: Session | null, serviceTab: AdminServiceTab, id: string) {
  return invokeAdminFunction<{ application: AdminApplicationRecord | null }>(session, {
    action: "application",
    serviceTab,
    id,
  });
}

export async function fetchAdminLeadActivities(session: Session | null, leadId: string) {
  return invokeAdminFunction<{ rows: AdminActivityLogRecord[] }>(session, {
    action: "lead-activities",
    leadId,
  });
}

export async function updateAdminApplicationStatus(
  session: Session | null,
  serviceTab: AdminServiceTab,
  id: string,
  status: string,
) {
  return invokeAdminFunction<{ application: AdminApplicationRecord | null }>(session, {
    action: "update-status",
    serviceTab,
    id,
    status,
  });
}
