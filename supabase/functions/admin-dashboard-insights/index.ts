import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = Deno.env.get("OPENROUTER_ACTIVITY_INSIGHTS_MODEL")
  || "minimax/minimax-m2.5:free";
const APP_BASE_URL = Deno.env.get("APP_BASE_URL") || "http://localhost";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type InsightsRequest = {
  action?: string;
  locale?: string;
  stats?: {
    total?: number;
    pending?: number;
    completed?: number;
    today?: number;
    allClients?: number;
    prospects?: number;
    applicants?: number;
  };
  serviceUsage?: Array<{
    service?: string;
    label?: string;
    total?: number;
    pending?: number;
    completed?: number;
  }>;
  recentActivities?: Array<{
    clientName?: string;
    clientPhone?: string;
    action?: string;
    at?: string;
    service?: string;
  }>;
};

type InsightsResponse = {
  overview: string;
  issues: string[];
  recommendations: string[];
  source?: "ai" | "fallback";
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

const extractJsonObject = (text: string) => {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("json_bulunamadi");
  }

  return JSON.parse(match[0]) as Record<string, unknown>;
};

const sanitizeInsights = (value: Record<string, unknown>): InsightsResponse => {
  const overview = normalizeString(value.overview);
  const issues = Array.isArray(value.issues)
    ? value.issues.map(normalizeString).filter(Boolean).slice(0, 3)
    : [];
  const recommendations = Array.isArray(value.recommendations)
    ? value.recommendations.map(normalizeString).filter(Boolean).slice(0, 3)
    : [];

  if (!overview) {
    throw new Error("icerik_bos");
  }

  return {
    overview,
    issues,
    recommendations,
    source: "ai",
  };
};

const buildFallbackInsights = (payload: InsightsRequest): InsightsResponse => {
  const locale = payload.locale?.startsWith("uz") ? "uz" : "tr";
  const stats = payload.stats || {};
  const serviceUsage = (payload.serviceUsage || [])
    .map((item) => ({
      label: normalizeString(item.label),
      total: Number(item.total || 0),
      pending: Number(item.pending || 0),
      completed: Number(item.completed || 0),
    }))
    .sort((left, right) => right.total - left.total);

  const topServices = serviceUsage.filter((item) => item.total > 0).slice(0, 3);
  const allClients = Number(stats.allClients || 0);
  const applicants = Number(stats.applicants || 0);
  const prospects = Number(stats.prospects || 0);
  const pending = Number(stats.pending || 0);

  if (locale === "uz") {
    return {
      overview: topServices.length > 0
        ? `Eng ko'p talab ${topServices.map((item) => `${item.label} (${item.total})`).join(", ")} xizmatlarida jamlangan. Jami ${allClients} mijozdan ${applicants} tasi ariza yuborgan, ${prospects} tasi esa hali qiziqish bosqichida.`
        : `Hozircha xizmatlar bo'yicha yetarli ma'lumot yig'ilmagan, ammo jami ${allClients} mijoz kuzatilmoqda.`,
      issues: [
        prospects > applicants
          ? "Arizaga o'tmagan mijozlar soni yuqori, follow-up va keyingi qadamni tushuntirish jarayoni sust bo'lishi mumkin."
          : "Konversiya yomon emas, lekin qiziqish bildirgan mijozlarga tezroq qayta aloqa qilish hali ham muhim.",
        pending > completed
          ? "Kutilayotgan arizalar ko'pligi ichki jarayonlarda navbat yoki sekinlik borligini ko'rsatadi."
          : "Bajarilish ko'rsatkichi yaxshi, lekin talab yuqori bo'layotgan xizmatlarda yuklama oshayotganini kuzatish kerak.",
      ],
      recommendations: [
        topServices[0]
          ? `${topServices[0].label} bo'limida javob tezligi va hujjat bo'yicha yo'riqnomalarni kuchaytirish foydali bo'ladi.`
          : "Mijozlar qaysi bosqichda to'xtab qolayotganini doimiy kuzatib boring.",
        "Ariza yubormagan mijozlarga aniq hujjatlar ro'yxati va keyingi qadamni tez yetkazish konversiyani oshiradi.",
        "Kutilayotgan arizalarni ustuvorlashtirib, operatorlar kesimida yuklamani balanslash foydali bo'ladi.",
      ],
      source: "fallback",
    };
  }

  return {
    overview: topServices.length > 0
      ? `En yüksek talep ${topServices.map((item) => `${item.label} (${item.total})`).join(", ")} hizmetlerinde toplanıyor. Toplam ${allClients} müşteriden ${applicants} tanesi başvuru göndermiş, ${prospects} tanesi ise hâlâ ilgi aşamasında.`
      : `Şimdilik hizmet bazında yeterli veri yok, ancak toplam ${allClients} müşteri takip ediliyor.`,
    issues: [
      prospects > applicants
        ? "Başvuruya dönüşmeyen müşteri sayısı yüksek. Takip ve sonraki adımı anlatma sürecinde eksik olabilir."
        : "Dönüşüm kötü görünmüyor, ancak ilgi gösteren müşterilere daha hızlı geri dönüş hâlâ önemli.",
      pending > completed
        ? "Bekleyen başvuru sayısının yüksek olması, iç süreçlerde yavaşlama veya yığılma olduğunu gösteriyor."
        : "Tamamlanma dengesi iyi, ancak en yoğun hizmetlerde ekip yükü artıyor olabilir.",
    ],
    recommendations: [
      topServices[0]
        ? `${topServices[0].label} tarafında geri dönüş süresi ve belge yönlendirmeleri güçlendirilmeli.`
        : "Müşterilerin en çok hangi aşamada kaldığını düzenli olarak takip edin.",
      "Başvuru göndermeyen müşterilere net belge listesi ve sonraki adımı hızlı iletmek dönüşümü artırır.",
      "Bekleyen başvurular için önceliklendirme ve ekip içi iş dağılımını gözden geçirmek faydalı olur.",
    ],
    source: "fallback",
  };
};

const buildPrompt = (payload: InsightsRequest) => {
  const locale = payload.locale?.startsWith("uz") ? "uz" : "tr";

  const system = locale === "uz"
    ? `Siz immigratsiya agentligi admin paneli uchun analitik yordamchisiz.
Faqat quyidagi JSON formatida javob bering:
{"overview":"...","issues":["..."],"recommendations":["..."]}
Javob tabiiy va aniq bo'lsin. Mijozlar qaysi xizmatlardan ko'proq foydalanyapti, jarayonda qanday kamchiliklar bor, admin nimalarga e'tibor berishi kerakligini yozing. 1 ta overview, 2-3 ta issues, 2-3 ta recommendations qaytaring.`
    : `Sen göçmenlik ajansı admin paneli için analitik bir asistansın.
Sadece şu JSON formatında cevap ver:
{"overview":"...","issues":["..."],"recommendations":["..."]}
Yanıt doğal ve net olsun. Müşterilerin en çok hangi hizmetleri kullandığını, süreçte hangi eksiklerin göründüğünü ve adminin nelere dikkat etmesi gerektiğini yaz. 1 overview, 2-3 issues ve 2-3 recommendations döndür.`;

  const user = JSON.stringify({
    stats: payload.stats || {},
    serviceUsage: payload.serviceUsage || [],
    recentActivities: (payload.recentActivities || []).slice(0, 10),
  });

  return { system, user };
};

const callOpenRouter = async (payload: InsightsRequest) => {
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
        "X-Title": "Bitrx Admin Dashboard Insights",
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

    const content = normalizeString(data.choices?.[0]?.message?.content);
    if (!content) {
      continue;
    }

    return sanitizeInsights(extractJsonObject(content));
  }

  console.error("Dashboard insights OpenRouter error:", lastError);
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

    const payload = await req.json().catch(() => ({})) as InsightsRequest;
    if (payload.action !== "summarize") {
      return jsonResponse({ errorCode: "desteklenmeyen_islem" }, 400);
    }

    if (!payload.stats || !Array.isArray(payload.serviceUsage)) {
      return jsonResponse({ errorCode: "gecersiz_icerik" }, 400);
    }

    try {
      const insights = await callOpenRouter(payload);
      return jsonResponse(insights);
    } catch (error) {
      console.error("Dashboard insights AI error:", error);
      return jsonResponse(buildFallbackInsights(payload));
    }
  } catch (error) {
    const errorCode = error instanceof Error ? error.message : "beklenmeyen_hata";
    return jsonResponse({ errorCode }, 500);
  }
});
