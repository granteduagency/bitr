const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const TCMB_TODAY_XML_URL = "https://www.tcmb.gov.tr/kurlar/today.xml";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

type ExchangeRatePayload = {
  usdTryRate: number;
  sourceDate: string;
  fetchedAt: string;
  source: "TCMB";
};

let cache:
  | (ExchangeRatePayload & {
      expiresAt: number;
    })
  | null = null;

const parseNumber = (value: string) => {
  const normalized = value.trim().replace(",", ".");
  const parsed = Number.parseFloat(normalized);

  if (!Number.isFinite(parsed)) {
    throw new HttpError(502, "tcmb_verisi_gecersiz");
  }

  return parsed;
};

const getLatestUsdTryRate = async (): Promise<ExchangeRatePayload> => {
  if (cache && cache.expiresAt > Date.now()) {
    const { expiresAt: _expiresAt, ...data } = cache;
    return data;
  }

  const response = await fetch(TCMB_TODAY_XML_URL, {
    headers: {
      Accept: "application/xml, text/xml, */*",
    },
  });

  if (!response.ok) {
    throw new HttpError(response.status >= 500 ? 502 : response.status, "doviz_kuru_alinamadi");
  }

  const xml = await response.text();
  const sourceDate = xml.match(/Tarih="([^"]+)"/)?.[1]?.trim();
  const usdBlock = xml.match(/<Currency[^>]+Kod="USD"[\s\S]*?<\/Currency>/)?.[0];
  const forexSelling = usdBlock?.match(/<ForexSelling>([^<]+)<\/ForexSelling>/)?.[1];

  if (!sourceDate || !forexSelling) {
    throw new HttpError(502, "usd_kuru_bulunamadi");
  }

  const data = {
    usdTryRate: parseNumber(forexSelling),
    sourceDate,
    fetchedAt: new Date().toISOString(),
    source: "TCMB" as const,
  };

  cache = {
    ...data,
    expiresAt: Date.now() + 60 * 60 * 1000,
  };

  return data;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ errorCode: "yontem_izin_verilmiyor" }, 405);
  }

  try {
    const payload = (await req.json().catch(() => ({}))) as { action?: string };
    const action = payload.action?.trim();

    if (action && action !== "usd") {
      throw new HttpError(400, "desteklenmeyen_islem");
    }

    const data = await getLatestUsdTryRate();
    return jsonResponse(data);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const errorCode = error instanceof HttpError ? error.message : "beklenmeyen_hata";
    return jsonResponse({ errorCode }, status);
  }
});
