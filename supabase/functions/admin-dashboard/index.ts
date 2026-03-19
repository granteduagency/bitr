import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

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
type LeadTab = "clients" | "prospects";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const getAuthorizationToken = (req: Request) => {
  const header = req.headers.get("Authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
};

const isServiceTab = (value: string): value is ServiceTab =>
  Object.prototype.hasOwnProperty.call(serviceTableMap, value);

const isLeadTab = (value: string): value is LeadTab => value === "clients" || value === "prospects";

const normalizeRelation = <T extends Record<string, unknown>>(
  row: T,
  relationKey: "clients" | "client_leads",
) => {
  const relation = row[relationKey];
  const normalized = Array.isArray(relation)
    ? (relation[0] as Record<string, unknown> | null | undefined) ?? null
    : ((relation as Record<string, unknown> | null | undefined) ?? null);

  return {
    ...row,
    [relationKey]: normalized,
  };
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

  if (roleError) {
    throw new Error(roleError.message);
  }

  if (!roleRow) {
    throw new Error("Admin access required.");
  }

  return user;
};

const fetchServiceRows = async (serviceTab: ServiceTab) => {
  const { data, error } = await supabase
    .from(serviceTableMap[serviceTab])
    .select("*, clients(name, phone)")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map((row) => normalizeRelation(row as Record<string, unknown>, "clients"));
};

const fetchLeadRows = async (leadTab: LeadTab) => {
  let query = supabase
    .from("client_leads")
    .select("*")
    .order("last_activity_at", { ascending: false });

  if (leadTab === "prospects") {
    query = query.eq("application_count", 0);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
};

const fetchDashboardActivity = async () => {
  const { data, error } = await supabase
    .from("client_activity_logs")
    .select("*, client_leads(name, phone)")
    .order("created_at", { ascending: false })
    .limit(6);

  if (error) {
    throw error;
  }

  return (data || []).map((row) =>
    normalizeRelation(row as Record<string, unknown>, "client_leads"),
  );
};

const fetchLeadActivities = async (leadId: string) => {
  const { data, error } = await supabase
    .from("client_activity_logs")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
};

const fetchStats = async () => {
  const todayStr = new Date().toISOString().split("T")[0];
  const serviceTabs = Object.keys(serviceTableMap) as ServiceTab[];

  const serviceCountEntries = await Promise.all(
    serviceTabs.map(async (serviceTab) => {
      const table = serviceTableMap[serviceTab];
      const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });

      if (error) {
        throw error;
      }

      return [serviceTab, count || 0] as const;
    }),
  );

  let total = 0;
  let pending = 0;
  let completed = 0;
  let today = 0;

  await Promise.all(
    serviceTabs.map(async (serviceTab) => {
      const table = serviceTableMap[serviceTab];
      const [{ count: totalCount, error: totalError }, { count: pendingCount, error: pendingError }, { count: completedCount, error: completedError }, { count: todayCount, error: todayError }] =
        await Promise.all([
          supabase.from(table).select("*", { count: "exact", head: true }),
          supabase.from(table).select("*", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from(table).select("*", { count: "exact", head: true }).eq("status", "completed"),
          supabase.from(table).select("*", { count: "exact", head: true }).gte("created_at", todayStr),
        ]);

      if (totalError || pendingError || completedError || todayError) {
        throw totalError || pendingError || completedError || todayError;
      }

      total += totalCount || 0;
      pending += pendingCount || 0;
      completed += completedCount || 0;
      today += todayCount || 0;
    }),
  );

  const [{ count: allClients, error: allClientsError }, { count: prospects, error: prospectsError }, { count: applicants, error: applicantsError }] =
    await Promise.all([
      supabase.from("client_leads").select("*", { count: "exact", head: true }),
      supabase.from("client_leads").select("*", { count: "exact", head: true }).eq("application_count", 0),
      supabase.from("client_leads").select("*", { count: "exact", head: true }).gt("application_count", 0),
    ]);

  if (allClientsError || prospectsError || applicantsError) {
    throw allClientsError || prospectsError || applicantsError;
  }

  return {
    stats: {
      total,
      pending,
      completed,
      today,
      allClients: allClients || 0,
      prospects: prospects || 0,
      applicants: applicants || 0,
    },
    serviceCounts: Object.fromEntries(serviceCountEntries),
  };
};

const fetchDashboardPayload = async () => {
  const [{ stats, serviceCounts }, clients, prospects, dashboardActivity] = await Promise.all([
    fetchStats(),
    fetchLeadRows("clients"),
    fetchLeadRows("prospects"),
    fetchDashboardActivity(),
  ]);

  return {
    stats,
    serviceCounts,
    clients,
    prospects,
    dashboardActivity,
  };
};

const fetchApplicationById = async (serviceTab: ServiceTab, id: string) => {
  const { data, error } = await supabase
    .from(serviceTableMap[serviceTab])
    .select("*, clients(name, phone)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return normalizeRelation(data as Record<string, unknown>, "clients");
};

const updateApplicationStatus = async (serviceTab: ServiceTab, id: string, status: string) => {
  const { error } = await supabase
    .from(serviceTableMap[serviceTab])
    .update({ status })
    .eq("id", id);

  if (error) {
    throw error;
  }

  return fetchApplicationById(serviceTab, id);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase environment is not configured.");
    }

    await requireAdminUser(req);

    const payload = await req.json().catch(() => ({})) as {
      action?: string;
      tab?: string;
      serviceTab?: string;
      id?: string;
      leadId?: string;
      status?: string;
    };

    if (payload.action === "dashboard") {
      return jsonResponse(await fetchDashboardPayload());
    }

    if (payload.action === "tab-data") {
      const tab = payload.tab?.trim() || "";
      if (isLeadTab(tab)) {
        return jsonResponse({ rows: await fetchLeadRows(tab) });
      }

      if (isServiceTab(tab)) {
        return jsonResponse({ rows: await fetchServiceRows(tab) });
      }

      return jsonResponse({ error: "Unknown tab." }, 400);
    }

    if (payload.action === "application") {
      const serviceTab = payload.serviceTab?.trim() || "";
      const id = payload.id?.trim() || "";

      if (!isServiceTab(serviceTab) || !id) {
        return jsonResponse({ error: "Invalid application request." }, 400);
      }

      return jsonResponse({ application: await fetchApplicationById(serviceTab, id) });
    }

    if (payload.action === "lead-activities") {
      const leadId = payload.leadId?.trim() || "";
      if (!leadId) {
        return jsonResponse({ error: "Missing lead id." }, 400);
      }

      return jsonResponse({ rows: await fetchLeadActivities(leadId) });
    }

    if (payload.action === "update-status") {
      const serviceTab = payload.serviceTab?.trim() || "";
      const id = payload.id?.trim() || "";
      const status = payload.status?.trim() || "";

      if (!isServiceTab(serviceTab) || !id || !status) {
        return jsonResponse({ error: "Invalid status update request." }, 400);
      }

      return jsonResponse({ application: await updateApplicationStatus(serviceTab, id, status) });
    }

    return jsonResponse({ error: "Unknown action." }, 400);
  } catch (error) {
    console.error("admin-dashboard error:", error);
    const message = error instanceof Error ? error.message : "Unexpected error.";
    const status = /auth token|admin access/i.test(message) ? 401 : 500;
    return jsonResponse({ error: message }, status);
  }
});
