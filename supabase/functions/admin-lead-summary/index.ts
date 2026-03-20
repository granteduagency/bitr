import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = Deno.env.get("OPENROUTER_ACTIVITY_SUMMARY_MODEL")
  || "minimax/minimax-m2.5:free";
const APP_BASE_URL = Deno.env.get("APP_BASE_URL") || "http://localhost";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type SummaryRequest = {
  action?: string;
  locale?: string;
  lead?: {
    name?: string;
    phone?: string;
    applicationCount?: number;
    lastService?: string;
    lastActivityAt?: string;
  };
  activities?: Array<{
    at?: string;
    title?: string;
    description?: string;
    route?: string | null;
    service?: string | null;
  }>;
  applicationContext?: Record<string, unknown> | null;
};

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

const requireAdminUser = async (req: Request) => {
  const token = getAuthorizationToken(req);
  if (!token) {
    throw new Error("yetki_belirteci_yok");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    throw new Error("yetkisiz");
  }

  const { data: roleRow, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (roleError || !roleRow) {
    throw new Error("admin_yetkisi_gerekli");
  }

  return user;
};

const parseEnvList = (value: string | undefined) =>
  (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const OPENROUTER_KEYS = (() => {
  const many = parseEnvList(Deno.env.get("OPENROUTER_API_KEYS"));
  const single = Deno.env.get("OPENROUTER_API_KEY")?.trim();
  if (many.length > 0) return many;
  return single ? [single] : [];
})();

const normalizeString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const sanitizeApplicationContext = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([key]) => !key.endsWith("_url") && !key.endsWith("_document_id"))
    .filter(([, item]) => item !== null && item !== undefined && item !== "")
    .slice(0, 24);

  return Object.fromEntries(entries);
};

const buildFallbackSummary = (payload: SummaryRequest) => {
  const locale = payload.locale?.startsWith("uz") ? "uz" : "tr";
  const activities = (payload.activities || []).slice(0, 3);
  const service = normalizeString(payload.lead?.lastService);
  const applicationCount = Number(payload.lead?.applicationCount || 0);
  const recentHighlights = Array.from(new Set(activities
    .map((activity) => normalizeString(activity.title) || normalizeString(activity.description))
    .filter(Boolean)));

  if (locale === "uz") {
    const leadName = normalizeString(payload.lead?.name) || "Mijoz";
    const statusText = applicationCount > 0
      ? "ariza yuborgan va jarayonda faol bo'lgan"
      : "hali ariza yubormagan, ammo xizmatlarni ko'rib chiqqan";
    const serviceText = service ? `${service} bo'limiga qiziqqan` : "xizmatlarga qiziqqan";
    const latest = recentHighlights[0] ? `So'nggi faolligiga ko'ra ${recentHighlights[0]}.` : "";
    const secondary = recentHighlights[1] ? `${recentHighlights[1]}.` : "";
    return `${leadName} ${serviceText}. Mijoz ${statusText}. ${latest} ${secondary}`.replace(/\s+/g, " ").trim();
  }

  const leadName = normalizeString(payload.lead?.name) || "Müşteri";
  const statusText = applicationCount > 0
    ? "başvuru göndermiş ve süreçte aktif kalmış"
    : "henüz başvuru göndermemiş ama hizmetleri incelemiş";
  const serviceText = service ? `${service} alanına ilgi göstermiş` : "hizmetlere ilgi göstermiş";
  const latest = recentHighlights[0] ? `Son hareketlerine göre ${recentHighlights[0]}.` : "";
  const secondary = recentHighlights[1] ? `${recentHighlights[1]}.` : "";
  return `${leadName} ${serviceText}. Müşteri ${statusText}. ${latest} ${secondary}`.replace(/\s+/g, " ").trim();
};

const buildPrompt = (payload: SummaryRequest) => {
  const locale = payload.locale?.startsWith("uz") ? "uz" : "tr";

  const system = locale === "uz"
    ? "Siz immigratsiya agentligi admini uchun mijoz faolligini tabiiy, qisqa va foydali tarzda xulosa qiluvchi yordamchisiz. Event log yozmang. 'Sahifa ko'rildi', 'route_viewed', '/dashboard/...' kabi texnik iboralarni qaytarmang. Bir xil mazmunni takrorlamang. Mijoz nimaga qiziqqani, qayergacha borgani va hozirgi holatini 2-4 tabiiy gapda yozing. Markdown ishlatmang."
    : "Sen göçmenlik ajansı admini için müşteri hareketlerini doğal, kısa ve faydalı şekilde özetleyen bir asistansın. Event log yazma. 'Sayfa görüntülendi', 'route_viewed', '/dashboard/...' gibi teknik ifadeleri tekrar etme. Aynı anlamı tekrar etme. Müşterinin neyle ilgilendiğini, süreçte nereye kadar geldiğini ve mevcut durumunu 2-4 doğal cümlede anlat. Markdown kullanma.";

  const user = {
    lead: payload.lead ?? {},
    activities: (payload.activities || []).slice(0, 20).map((activity) => ({
      at: activity.at,
      summary: activity.title,
      detail: activity.description,
      service: activity.service,
    })),
    applicationContext: sanitizeApplicationContext(payload.applicationContext),
    instructions: locale === "uz"
      ? "Mijoz haqida adminga foydali bo'ladigan tabiiy xulosa yozing. Harakatlarni birma-bir sanamang. Agar ariza yuborgan bo'lsa buni ayting, yubormagan bo'lsa qiziqish bosqichida ekanini ayting."
      : "Müşteri hakkında admin için faydalı olacak doğal bir özet yaz. Hareketleri tek tek listeleme. Başvuru gönderdiyse bunu belirt, göndermediyse ilgi aşamasında olduğunu söyle.",
  };

  return {
    system,
    user: JSON.stringify(user),
  };
};

const callOpenRouter = async (payload: SummaryRequest) => {
  if (OPENROUTER_KEYS.length === 0) {
    throw new Error("openrouter_yanit_alinamadi");
  }

  const prompt = buildPrompt(payload);

  let lastError = "";
  for (const apiKey of OPENROUTER_KEYS) {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": APP_BASE_URL,
        "X-Title": "Bitrx Admin Lead Summary",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        temperature: 0.2,
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
      }),
    });

    const raw = await response.text();

    if (!response.ok) {
      lastError = raw || response.statusText;
      if (response.status === 429) {
        continue;
      }
      continue;
    }

    const data = JSON.parse(raw) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const summary = normalizeString(data.choices?.[0]?.message?.content);
    if (summary) {
      return summary;
    }
  }

  console.error("Lead summary OpenRouter error:", lastError);
  throw new Error("ozet_uretilemedi");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ errorCode: "yontem_izin_verilmiyor" }, 405);
  }

  try {
    await requireAdminUser(req);

    const payload = await req.json().catch(() => ({})) as SummaryRequest;
    if (payload.action !== "summarize") {
      return jsonResponse({ errorCode: "desteklenmeyen_islem" }, 400);
    }

    if (!Array.isArray(payload.activities) || payload.activities.length === 0) {
      return jsonResponse({ errorCode: "gecersiz_icerik" }, 400);
    }

    try {
      const summary = await callOpenRouter(payload);
      return jsonResponse({ summary, source: "ai" });
    } catch (error) {
      console.error("Lead summary AI error:", error);
      return jsonResponse({
        summary: buildFallbackSummary(payload),
        source: "fallback",
      });
    }
  } catch (error) {
    const errorCode = error instanceof Error ? error.message : "beklenmeyen_hata";
    return jsonResponse({ errorCode }, 500);
  }
});
