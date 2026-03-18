const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const E_IKAMET_BASE_URL = "https://e-ikamet.goc.gov.tr";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/121.0";
const SESSION_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MS = 1000;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const CAPTCHA_MODEL = Deno.env.get("OPENROUTER_MODEL") || "google/gemma-3-27b-it:free";
const VISION_MODEL = Deno.env.get("OPENROUTER_VISION_MODEL") || CAPTCHA_MODEL;
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const APP_REFERER = Deno.env.get("APP_BASE_URL") || "http://localhost";

type AppointmentCheckType = "phone" | "email";

type ParsedAppointmentData = {
  registrationNumber: string | null;
  documentNumber: string | null;
  phone: string | null;
  email: string | null;
  suggestedCheckType: AppointmentCheckType | null;
  source: "pdf" | "image" | "manual";
  warnings: string[];
};

type AppointmentCheckStatus = {
  status: string | null;
  permitType: string | null;
  dates: string | null;
  pttBarcode: string | null;
};

type AppointmentCheckResult = {
  success: boolean;
  checkType: AppointmentCheckType;
  attempts: number;
  error: string | null;
  checkedAt: string;
  parsedData: ParsedAppointmentData;
  randevuStatus: AppointmentCheckStatus | null;
};

type SessionData = {
  cookies: Record<string, string>;
  csrfToken: string;
  captchaDeText: string;
  captchaSrc: string;
  createdAt: number;
};

type LoginResponse = {
  donusDegerleri?: {
    devamEdebilir?: boolean;
  };
  result?: {
    donusDegerleri?: {
      devamEdebilir?: boolean;
    };
  };
  errors?: {
    captchaInputText?: string[];
  };
};

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let sessionCache: SessionData | null = null;
const resultCache = new Map<string, { expiresAt: number; value: AppointmentCheckResult }>();

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const optionalString = (value: unknown) => {
  const normalized = normalizeString(value);
  return normalized || null;
};

const decodeBase64 = (base64: string) =>
  Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));

const digitsOnly = (value: string) => value.replace(/\D/g, "");

const normalizePhoneDigits = (value: string) => {
  const digits = digitsOnly(value);

  if (digits.length === 12 && digits.startsWith("90")) {
    return digits.slice(2);
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1);
  }

  if (digits.length > 10) {
    return digits.slice(-10);
  }

  return digits;
};

const formatPhoneForLookup = (value: string) => {
  const normalized = normalizePhoneDigits(value);
  if (normalized.length !== 10) {
    return value.trim();
  }

  return `(${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}-${normalized.slice(6, 8)}-${normalized.slice(8, 10)}`;
};

const suggestCheckType = (phone?: string | null, email?: string | null): AppointmentCheckType | null => {
  if (normalizePhoneDigits(phone || "").length === 10) {
    return "phone";
  }

  if ((email || "").trim()) {
    return "email";
  }

  return null;
};

const parseSetCookieHeaders = (headers: Headers) => {
  const maybeHeaders = headers as Headers & {
    getSetCookie?: () => string[];
  };

  if (typeof maybeHeaders.getSetCookie === "function") {
    return maybeHeaders.getSetCookie();
  }

  const singleHeader = headers.get("set-cookie");
  return singleHeader ? [singleHeader] : [];
};

const extractCookiePair = (setCookieHeader: string) =>
  setCookieHeader.split(";")[0]?.trim() ?? "";

const parseCookieStore = (headers: Headers) => {
  const store: Record<string, string> = {};

  for (const cookie of parseSetCookieHeaders(headers)) {
    const pair = extractCookiePair(cookie);
    const separatorIndex = pair.indexOf("=");
    if (separatorIndex < 0) {
      continue;
    }

    store[pair.slice(0, separatorIndex)] = pair.slice(separatorIndex + 1);
  }

  return store;
};

const mergeCookies = (...cookieStores: Record<string, string>[]) => {
  const merged: Record<string, string> = {};

  for (const store of cookieStores) {
    Object.assign(merged, store);
  }

  return merged;
};

const cookieHeader = (cookies: Record<string, string>) =>
  Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");

const decodeHtmlEntities = (text: string) =>
  text
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');

const extractJsonObject = (text: string) => {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("Vision response did not return valid JSON.");
  }

  return JSON.parse(match[0]) as Record<string, unknown>;
};

const getOpenRouterKeys = () => {
  const rawKeys = Deno.env.get("OPENROUTER_API_KEYS") || Deno.env.get("OPENROUTER_API_KEY") || "";
  const keys = rawKeys
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);

  if (keys.length === 0) {
    throw new HttpError(500, "OPENROUTER_API_KEYS is not configured.");
  }

  return keys;
};

async function callOpenRouter(requestBody: Record<string, unknown>) {
  const keys = getOpenRouterKeys();
  let lastError = "OpenRouter request failed.";

  for (const apiKey of keys) {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": APP_REFERER,
        "X-Title": "Bitrx Randevu Checker",
      },
      body: JSON.stringify(requestBody),
    });

    const raw = await response.text();

    if (!response.ok) {
      lastError = raw || response.statusText;
      continue;
    }

    const parsed = JSON.parse(raw) as {
      choices?: Array<{
        message?: {
          content?: string | Array<{ type?: string; text?: string }>;
        };
      }>;
    };

    const content = parsed.choices?.[0]?.message?.content;
    if (typeof content === "string") {
      return content;
    }

    if (Array.isArray(content)) {
      const text = content
        .map((item) => (item.type === "text" ? item.text || "" : ""))
        .join("")
        .trim();
      if (text) {
        return text;
      }
    }
  }

  throw new HttpError(502, lastError);
}

async function solveCaptchaImage(imageBytes: Uint8Array) {
  const response = await callOpenRouter({
    model: CAPTCHA_MODEL,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Read this captcha carefully. It contains exactly 8 letters or digits. Reply with only the 8-character captcha text in uppercase, with no explanation.",
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/gif;base64,${btoa(String.fromCharCode(...imageBytes))}`,
            },
          },
        ],
      },
    ],
    max_tokens: 20,
    temperature: 0,
  });

  return response.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8);
}

async function extractFromImage(file: {
  mimeType: string;
  contentsBase64: string;
}) {
  const response = await callOpenRouter({
    model: VISION_MODEL,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "Extract the following fields from this Turkish residence permit appointment document image. Return JSON only with keys registrationNumber, documentNumber, phone, email. Use null when a field is missing.",
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${file.mimeType};base64,${file.contentsBase64}`,
            },
          },
        ],
      },
    ],
    max_tokens: 200,
    temperature: 0,
  });

  return extractJsonObject(response);
}

async function extractPdfText(fileBytes: Uint8Array) {
  const pdfjs = await import("https://esm.sh/pdfjs-dist@4.10.38/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: fileBytes,
    disableFontFace: true,
    useSystemFonts: true,
    isEvalSupported: false,
  });

  const pdf = await loadingTask.promise;
  const chunks: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();

    for (const item of content.items as Array<{ str?: string }>) {
      if (typeof item.str === "string") {
        chunks.push(item.str);
      }
    }
  }

  return chunks.join(" ");
}

function extractFromText(text: string) {
  const normalizedText = text
    .replace(/[\u0131]/g, "i")
    .replace(/[\u0130]/g, "I")
    .replace(/\s+/g, " ")
    .trim();

  const registrationNumber =
    normalizedText.match(/Registration\s*Number[:\s)]*(\d{4}-\d{2}-\d{7})/i)?.[1] ||
    normalizedText.match(/Kayit\s*Numarasi[:\s)]*(\d{4}-\d{2}-\d{7})/i)?.[1] ||
    normalizedText.match(/(\d{4}-\d{2}-\d{7})/)?.[1] ||
    null;

  const documentNumber =
    normalizedText.match(/Number\s+of\s+Document[:\s)]*([A-Z]{1,2}\d{6,8})/i)?.[1] ||
    normalizedText.match(/Belge\s*No[:\s)]*([A-Z]{1,2}\d{6,8})/i)?.[1] ||
    normalizedText.match(/Document[:\s)]*([A-Z]{1,2}\d{6,8})/i)?.[1] ||
    normalizedText.match(/([A-Z]{2}\d{7})/)?.[1] ||
    null;

  const phoneMatch =
    normalizedText.match(/Phone\s*1[:\s)]*(\d{10,11})/i)?.[1] ||
    normalizedText.match(/Telefon\s*1[:\s)]*(\d{10,11})/i)?.[1] ||
    normalizedText.match(/Telefon[:\s)]*(\d{10,11})/i)?.[1] ||
    null;

  const email =
    normalizedText.match(/E[-\s]?mail[:\s)]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i)?.[1] ||
    normalizedText.match(/E[-\s]?Posta[:\s)]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i)?.[1] ||
    normalizedText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i)?.[1] ||
    null;

  return {
    registrationNumber,
    documentNumber,
    phone: phoneMatch ? normalizePhoneDigits(phoneMatch) : null,
    email: email?.toLowerCase() ?? null,
  };
}

function buildParsedData(input: {
  registrationNumber?: unknown;
  documentNumber?: unknown;
  phone?: unknown;
  email?: unknown;
  source: "pdf" | "image" | "manual";
}) {
  const parsed: ParsedAppointmentData = {
    registrationNumber: optionalString(input.registrationNumber),
    documentNumber: optionalString(input.documentNumber)?.toUpperCase() ?? null,
    phone: optionalString(input.phone) ? normalizePhoneDigits(String(input.phone)) : null,
    email: optionalString(input.email)?.toLowerCase() ?? null,
    suggestedCheckType: null,
    source: input.source,
    warnings: [],
  };

  parsed.suggestedCheckType = suggestCheckType(parsed.phone, parsed.email);

  if (!parsed.registrationNumber) {
    parsed.warnings.push("Registration number could not be extracted.");
  }

  if (!parsed.documentNumber) {
    parsed.warnings.push("Document number could not be extracted.");
  }

  if (!parsed.phone && !parsed.email) {
    parsed.warnings.push("Phone or email could not be extracted.");
  }

  return parsed;
}

async function parseAppointmentFile(payload: {
  filename?: string;
  mimeType?: string | null;
  contentsBase64?: string;
}) {
  const filename = normalizeString(payload.filename);
  const mimeType = normalizeString(payload.mimeType) || "application/octet-stream";
  const contentsBase64 = normalizeString(payload.contentsBase64);

  if (!filename || !contentsBase64) {
    throw new HttpError(400, "Appointment file payload is incomplete.");
  }

  const bytes = decodeBase64(contentsBase64);
  if (bytes.byteLength > MAX_FILE_SIZE_BYTES) {
    throw new HttpError(400, "Appointment file is too large.");
  }

  if (mimeType === "application/pdf" || filename.toLowerCase().endsWith(".pdf")) {
    const text = await extractPdfText(bytes);
    return buildParsedData({
      ...extractFromText(text),
      source: "pdf",
    });
  }

  if (mimeType.startsWith("image/")) {
    const extracted = await extractFromImage({
      mimeType,
      contentsBase64,
    });

    return buildParsedData({
      registrationNumber: extracted.registrationNumber,
      documentNumber: extracted.documentNumber,
      phone: extracted.phone,
      email: extracted.email,
      source: "image",
    });
  }

  throw new HttpError(400, "Only PDF or image files are supported.");
}

async function createSession() {
  const response = await fetch(`${E_IKAMET_BASE_URL}/Ikamet/DevamEdenBasvuruGiris`, {
    method: "GET",
    headers: {
      "User-Agent": USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new HttpError(response.status, "Could not create e-ikamet session.");
  }

  const html = await response.text();
  const csrfToken =
    html.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/)?.[1] || "";
  const captchaSrc = html.match(/id="CaptchaImage"[^>]*src="([^"]+)"/)?.[1] || "";
  const captchaDeText = html.match(/id="CaptchaDeText"[^>]*value="([^"]+)"/)?.[1] || "";

  if (!csrfToken || !captchaSrc || !captchaDeText) {
    throw new HttpError(502, "Could not initialize e-ikamet login page.");
  }

  const session: SessionData = {
    cookies: parseCookieStore(response.headers),
    csrfToken,
    captchaDeText,
    captchaSrc,
    createdAt: Date.now(),
  };

  sessionCache = session;
  return session;
}

const isSessionValid = (session: SessionData) =>
  Date.now() - session.createdAt < SESSION_TIMEOUT_MS;

async function getSession() {
  if (sessionCache && isSessionValid(sessionCache)) {
    return sessionCache;
  }

  return createSession();
}

async function loadCaptcha(session: SessionData) {
  const captchaUrl = session.captchaSrc.startsWith("http")
    ? session.captchaSrc
    : `${E_IKAMET_BASE_URL}${session.captchaSrc}`;

  const response = await fetch(captchaUrl, {
    headers: {
      "User-Agent": USER_AGENT,
      Cookie: cookieHeader(session.cookies),
      Referer: `${E_IKAMET_BASE_URL}/Ikamet/DevamEdenBasvuruGiris`,
    },
  });

  if (!response.ok) {
    throw new HttpError(response.status, "Could not load captcha image.");
  }

  return new Uint8Array(await response.arrayBuffer());
}

async function loginToEIkamet(
  session: SessionData,
  captchaText: string,
  input: {
    registrationNumber: string;
    documentNumber: string;
    checkType: AppointmentCheckType;
    phone?: string | null;
    email?: string | null;
  },
) {
  const body = JSON.stringify({
    basvuruNo: input.registrationNumber,
    cepTelefon: input.checkType === "phone" ? formatPhoneForLookup(input.phone || "") : "",
    ePosta: input.checkType === "email" ? optionalString(input.email) : null,
    yabanciKimlikNo: null,
    pasaportBelgeNo: input.documentNumber,
    islemTur: -1,
    CaptchaInputText: captchaText,
    CaptchaDeText: session.captchaDeText,
  });

  const response = await fetch(`${E_IKAMET_BASE_URL}/Ikamet/DevamEdenBasvuruGiris/Ara`, {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      Cookie: cookieHeader(session.cookies),
      "Content-Type": "application/json",
      Origin: E_IKAMET_BASE_URL,
      Referer: `${E_IKAMET_BASE_URL}/`,
      "X-Requested-With": "XMLHttpRequest",
      "__requestverificationtoken": session.csrfToken,
      Accept: "*/*",
    },
    body,
  });

  if (!response.ok) {
    throw new HttpError(response.status, "e-ikamet login request failed.");
  }

  session.cookies = mergeCookies(session.cookies, parseCookieStore(response.headers));
  return (await response.json()) as LoginResponse;
}

function parseStatusPage(html: string): AppointmentCheckStatus {
  const status =
    html.match(/txt-md[^>]*>([^<]+)</)?.[1] ||
    null;
  const permitType =
    html.match(/Type of Residence Permit[\s\S]*?form-control-label[^>]*>([^<]+)/i)?.[1] ||
    html.match(/İkamet İzni Türü[\s\S]*?form-control-label[^>]*>([^<]+)/i)?.[1] ||
    null;
  const dates =
    html.match(/Starting-Ending dates[\s\S]*?form-control-label[^>]*>([^<]+)/i)?.[1] ||
    html.match(/Başlangıç - Bitiş[\s\S]*?form-control-label[^>]*>([^<]+)/i)?.[1] ||
    null;
  const pttBarcode =
    html.match(/PTT Barkod[\s\S]*?form-control-label[^>]*>([^<]+)/i)?.[1] ||
    null;

  return {
    status: status ? decodeHtmlEntities(status.trim()) : null,
    permitType: permitType ? decodeHtmlEntities(permitType.trim()) : null,
    dates: dates ? decodeHtmlEntities(dates.trim()) : null,
    pttBarcode: pttBarcode ? decodeHtmlEntities(pttBarcode.trim()) : null,
  };
}

async function getAppointmentStatus(session: SessionData) {
  const optionsResponse = await fetch(`${E_IKAMET_BASE_URL}/Ikamet/DevamEdenBasvuruSecenekler`, {
    headers: {
      "User-Agent": USER_AGENT,
      Cookie: cookieHeader(session.cookies),
      Referer: `${E_IKAMET_BASE_URL}/Ikamet/DevamEdenBasvuruGiris`,
    },
  });

  if (!optionsResponse.ok) {
    throw new HttpError(optionsResponse.status, "Could not load application status page.");
  }

  const optionsHtml = await optionsResponse.text();
  if (optionsHtml.includes("Başvuru Durumunuz") || optionsHtml.includes("İkamet İzni Türü")) {
    return parseStatusPage(optionsHtml);
  }

  const recordNumber = optionsHtml.match(/href="[^"]*basvuruKayitNo=(\d+)/)?.[1];
  if (!recordNumber) {
    return parseStatusPage(optionsHtml);
  }

  const statusResponse = await fetch(
    `${E_IKAMET_BASE_URL}/Ikamet/BasvuruDurum?basvuruKayitNo=${recordNumber}`,
    {
      headers: {
        "User-Agent": USER_AGENT,
        Cookie: cookieHeader(session.cookies),
        Referer: `${E_IKAMET_BASE_URL}/Ikamet/DevamEdenBasvuruSecenekler`,
      },
    },
  );

  if (!statusResponse.ok) {
    throw new HttpError(statusResponse.status, "Could not load detailed application status.");
  }

  return parseStatusPage(await statusResponse.text());
}

async function checkAppointmentStatus(payload: {
  registrationNumber?: string;
  documentNumber?: string;
  checkType?: AppointmentCheckType;
  phone?: string | null;
  email?: string | null;
  parsedData?: ParsedAppointmentData;
}) {
  const registrationNumber = normalizeString(payload.registrationNumber);
  const documentNumber = normalizeString(payload.documentNumber).toUpperCase();
  const checkType = payload.checkType;
  const phone = optionalString(payload.phone) ? normalizePhoneDigits(String(payload.phone)) : null;
  const email = optionalString(payload.email)?.toLowerCase() ?? null;
  const parsedData = payload.parsedData || {
    registrationNumber: registrationNumber || null,
    documentNumber: documentNumber || null,
    phone,
    email,
    suggestedCheckType: suggestCheckType(phone, email),
    source: "manual" as const,
    warnings: [],
  };

  if (!registrationNumber || !documentNumber) {
    throw new HttpError(400, "Registration number and document number are required.");
  }

  if (checkType !== "phone" && checkType !== "email") {
    throw new HttpError(400, "checkType must be phone or email.");
  }

  if (checkType === "phone" && phone?.length !== 10) {
    throw new HttpError(400, "A valid phone number is required for phone checks.");
  }

  if (checkType === "email" && !email) {
    throw new HttpError(400, "A valid email is required for email checks.");
  }

  const cacheKey = `${registrationNumber}:${documentNumber}:${checkType}:${phone || email || ""}`;
  const cached = resultCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  let attempt = 0;
  while (attempt < MAX_ATTEMPTS) {
    attempt += 1;

    try {
      const session = await getSession();
      const captchaBytes = await loadCaptcha(session);
      const captchaText = await solveCaptchaImage(captchaBytes);

      if (!captchaText || captchaText.length < 6) {
        sessionCache = null;
        continue;
      }

      const loginResult = await loginToEIkamet(session, captchaText, {
        registrationNumber,
        documentNumber,
        checkType,
        phone,
        email,
      });

      if (loginResult.errors?.captchaInputText?.length) {
        sessionCache = null;
        await sleep(RETRY_DELAY_MS);
        continue;
      }

      const canProceed =
        loginResult.donusDegerleri?.devamEdebilir ||
        loginResult.result?.donusDegerleri?.devamEdebilir;

      if (!canProceed) {
        const failedResult: AppointmentCheckResult = {
          success: false,
          checkType,
          attempts: attempt,
          error: "Ma'lumotlar noto'g'ri yoki ariza topilmadi.",
          checkedAt: new Date().toISOString(),
          parsedData,
          randevuStatus: null,
        };

        resultCache.set(cacheKey, {
          value: failedResult,
          expiresAt: Date.now() + 5 * 60 * 1000,
        });
        return failedResult;
      }

      const status = await getAppointmentStatus(session);
      const result: AppointmentCheckResult = {
        success: true,
        checkType,
        attempts: attempt,
        error: null,
        checkedAt: new Date().toISOString(),
        parsedData,
        randevuStatus: status,
      };

      resultCache.set(cacheKey, {
        value: result,
        expiresAt: Date.now() + 10 * 60 * 1000,
      });
      return result;
    } catch (error) {
      sessionCache = null;

      if (attempt >= MAX_ATTEMPTS) {
        const message = error instanceof Error ? error.message : "Unknown error.";
        return {
          success: false,
          checkType,
          attempts: attempt,
          error: message,
          checkedAt: new Date().toISOString(),
          parsedData,
          randevuStatus: null,
        } satisfies AppointmentCheckResult;
      }

      await sleep(RETRY_DELAY_MS);
    }
  }

  return {
    success: false,
    checkType,
    attempts: MAX_ATTEMPTS,
    error: `${MAX_ATTEMPTS} ta urinishdan keyin muvaffaqiyatsiz.`,
    checkedAt: new Date().toISOString(),
    parsedData,
    randevuStatus: null,
  } satisfies AppointmentCheckResult;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    const payload = (await req.json().catch(() => ({}))) as {
      action?: string;
      file?: {
        filename?: string;
        mimeType?: string | null;
        contentsBase64?: string;
      };
      registrationNumber?: string;
      documentNumber?: string;
      checkType?: AppointmentCheckType;
      phone?: string | null;
      email?: string | null;
      parsedData?: ParsedAppointmentData;
    };

    const action = normalizeString(payload.action);

    if (action === "parse") {
      return jsonResponse(await parseAppointmentFile(payload.file || {}));
    }

    if (action === "check") {
      return jsonResponse(await checkAppointmentStatus(payload));
    }

    throw new HttpError(400, "Unsupported action.");
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return jsonResponse({ error: message }, status);
  }
});
