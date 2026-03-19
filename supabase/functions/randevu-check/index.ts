const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const E_IKAMET_BASE_URL = "https://e-ikamet.goc.gov.tr";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/121.0";
const SESSION_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_WORKFLOW_CYCLES = 12;
const RETRY_DELAY_MS = 1000;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const APP_REFERER = Deno.env.get("APP_BASE_URL") || "http://localhost";
const PDFJS_DIST_URL = "https://esm.sh/pdfjs-dist@4.10.38/legacy/build/pdf.mjs";
const PDFJS_WORKER_URL = "https://esm.sh/pdfjs-dist@4.10.38/legacy/build/pdf.worker.mjs";

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

type AppointmentDebugStep = {
  sequence: number;
  timestamp: string;
  attempt: number;
  stage: string;
  level: "info" | "success" | "error";
  message: string;
  data: Record<string, unknown> | null;
};

type AppointmentStreamEvent =
  | {
      type: "result";
      result: AppointmentCheckResult;
    }
  | {
      type: "error";
      error: string;
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

const parseEnvList = (value: string | undefined, fallback: string[]) => {
  const items = (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : fallback;
};

const CAPTCHA_MODELS = parseEnvList(Deno.env.get("OPENROUTER_MODEL"), ["google/gemma-3-27b-it:free"]);
const VISION_MODELS = parseEnvList(Deno.env.get("OPENROUTER_VISION_MODEL"), CAPTCHA_MODELS);

const decodeBase64 = (base64: string) =>
  Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));

const digitsOnly = (value: string) => value.replace(/\D/g, "");

const previewHtml = (html: string, maxLength = 800) =>
  html
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

const createStepRecorder = () => {
  const log = (_input: {
    attempt?: number;
    stage: string;
    level: AppointmentDebugStep["level"];
    message: string;
    data?: Record<string, unknown> | null;
  }) => undefined;

  return { log };
};

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

async function callOpenRouter(
  requestBody: Record<string, unknown>,
  options?: {
    log?: ReturnType<typeof createStepRecorder>["log"];
    attempt?: number;
    stage?: string;
  },
) {
  const keys = getOpenRouterKeys();
  let lastError = "OpenRouter request failed.";
  const models = Array.isArray(requestBody.model)
    ? requestBody.model.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [String(requestBody.model || "")].filter(Boolean);
  const requestWithoutModel = { ...requestBody };
  delete requestWithoutModel.model;

  for (const model of models) {
    for (const [keyIndex, apiKey] of keys.entries()) {
      options?.log?.({
        attempt: options.attempt ?? 0,
        stage: options.stage || "openrouter.request",
        level: "info",
        message: "OpenRouter request started.",
        data: {
          model,
          keyIndex,
        },
      });

      const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": APP_REFERER,
          "X-Title": "Bitrx Randevu Checker",
        },
        body: JSON.stringify({
          ...requestWithoutModel,
          model,
        }),
      });

      const raw = await response.text();

      if (!response.ok) {
        lastError = raw || response.statusText;
        options?.log?.({
          attempt: options.attempt ?? 0,
          stage: options.stage || "openrouter.request",
          level: "error",
          message: "OpenRouter request failed.",
          data: {
            model,
            keyIndex,
            status: response.status,
            response: raw || response.statusText,
          },
        });

        if (response.status === 429) {
          await sleep(RETRY_DELAY_MS * 2);
        }

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
        options?.log?.({
          attempt: options.attempt ?? 0,
          stage: options.stage || "openrouter.request",
          level: "success",
          message: "OpenRouter request succeeded.",
          data: {
            model,
            keyIndex,
          },
        });
        return {
          content,
          model,
          keyIndex,
        };
      }

      if (Array.isArray(content)) {
        const text = content
          .map((item) => (item.type === "text" ? item.text || "" : ""))
          .join("")
          .trim();
        if (text) {
          options?.log?.({
            attempt: options.attempt ?? 0,
            stage: options.stage || "openrouter.request",
            level: "success",
            message: "OpenRouter request succeeded.",
            data: {
              model,
              keyIndex,
            },
          });
          return {
            content: text,
            model,
            keyIndex,
          };
        }
      }
    }
  }

  throw new HttpError(502, lastError);
}

async function solveCaptchaImage(
  imageBytes: Uint8Array,
  log: ReturnType<typeof createStepRecorder>["log"],
  cycle: number,
) {
  const response = await callOpenRouter({
    model: CAPTCHA_MODELS,
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
  }, {
    log,
    attempt: cycle,
    stage: "captcha.openrouter",
  });

  const solvedText = response.content.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8);
  log({
    attempt: cycle,
    stage: "captcha.solve",
    level: "success",
    message: "Captcha solved by OpenRouter.",
    data: {
      model: response.model,
      keyIndex: response.keyIndex,
      captchaImageDataUrl: `data:image/gif;base64,${btoa(String.fromCharCode(...imageBytes))}`,
      solvedText,
    },
  });

  return solvedText;
}

async function extractFromImage(file: {
  mimeType: string;
  contentsBase64: string;
}) {
  const response = await callOpenRouter({
    model: VISION_MODELS,
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

  return extractJsonObject(response.content);
}

function extractPdfTextFallback(fileBytes: Uint8Array) {
  const rawText = new TextDecoder("latin1").decode(fileBytes);
  const textChunks = Array.from(
    rawText.matchAll(/\(([^()]*)\)\s*T[Jj]/g),
    (match) => match[1]?.replace(/\\([()\\])/g, "$1") ?? "",
  )
    .map((chunk) => chunk.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  if (textChunks.length > 0) {
    return textChunks.join(" ");
  }

  return rawText.replace(/[^\x20-\x7E\n\r]/g, " ").replace(/\s+/g, " ").trim();
}

async function extractPdfText(fileBytes: Uint8Array) {
  try {
    const pdfjs = await import(PDFJS_DIST_URL);
    pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;

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

    const extractedText = chunks.join(" ").trim();
    if (extractedText) {
      return extractedText;
    }
  } catch {
    // Fall back to raw PDF text scanning when worker-based extraction is unavailable.
  }

  return extractPdfTextFallback(fileBytes);
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

async function createSession(log: ReturnType<typeof createStepRecorder>["log"], cycle: number) {
  log({
    attempt: cycle,
    stage: "session.fetch",
    level: "info",
    message: "Fetching e-ikamet login page.",
  });

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

  log({
    attempt: cycle,
    stage: "session.fetch",
    level: "success",
    message: "e-ikamet login page initialized.",
    data: {
      csrfToken,
      captchaSrc,
      captchaDeText,
      pagePreview: previewHtml(html),
    },
  });

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

async function getSession(log: ReturnType<typeof createStepRecorder>["log"], cycle: number) {
  if (sessionCache && isSessionValid(sessionCache)) {
    log({
      attempt: cycle,
      stage: "session.cache",
      level: "success",
      message: "Reusing cached e-ikamet session.",
      data: {
        createdAt: new Date(sessionCache.createdAt).toISOString(),
      },
    });
    return sessionCache;
  }

  return createSession(log, cycle);
}

async function loadCaptcha(
  session: SessionData,
  log: ReturnType<typeof createStepRecorder>["log"],
  cycle: number,
) {
  const captchaUrl = session.captchaSrc.startsWith("http")
    ? session.captchaSrc
    : `${E_IKAMET_BASE_URL}${session.captchaSrc}`;

  log({
    attempt: cycle,
    stage: "captcha.fetch",
    level: "info",
    message: "Loading captcha image from e-ikamet.",
    data: {
      captchaUrl,
    },
  });

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

  const captchaBytes = new Uint8Array(await response.arrayBuffer());
  log({
    attempt: cycle,
    stage: "captcha.fetch",
    level: "success",
    message: "Captcha image loaded.",
    data: {
      captchaUrl,
      byteLength: captchaBytes.byteLength,
      captchaImageDataUrl: `data:image/gif;base64,${btoa(String.fromCharCode(...captchaBytes))}`,
    },
  });

  return captchaBytes;
}

async function loginToEIkamet(
  session: SessionData,
  captchaText: string,
  log: ReturnType<typeof createStepRecorder>["log"],
  attempt: number,
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

  log({
    attempt,
    stage: "goc.login.request",
    level: "info",
    message: "Sending lookup payload to e-ikamet.",
    data: JSON.parse(body) as Record<string, unknown>,
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
  const loginResponse = (await response.json()) as LoginResponse;
  log({
    attempt,
    stage: "goc.login.response",
    level: "success",
    message: "Received e-ikamet login response.",
    data: loginResponse as unknown as Record<string, unknown>,
  });

  return loginResponse;
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

async function getAppointmentStatus(
  session: SessionData,
  log: ReturnType<typeof createStepRecorder>["log"],
  attempt: number,
) {
  log({
    attempt,
    stage: "goc.status.options",
    level: "info",
    message: "Loading e-ikamet status options page.",
  });

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
    const directStatus = parseStatusPage(optionsHtml);
    log({
      attempt,
      stage: "goc.status.options",
      level: "success",
      message: "Status page was returned directly from options page.",
      data: {
        pagePreview: previewHtml(optionsHtml),
        status: directStatus,
      },
    });
    return directStatus;
  }

  const recordNumber = optionsHtml.match(/href="[^"]*basvuruKayitNo=(\d+)/)?.[1];
  if (!recordNumber) {
    const fallbackStatus = parseStatusPage(optionsHtml);
    log({
      attempt,
      stage: "goc.status.options",
      level: "success",
      message: "Record number not found; parsed current page as final status.",
      data: {
        pagePreview: previewHtml(optionsHtml),
        status: fallbackStatus,
      },
    });
    return fallbackStatus;
  }

  log({
    attempt,
    stage: "goc.status.detail",
    level: "info",
    message: "Loading detailed application status page.",
    data: {
      recordNumber,
    },
  });

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

  const statusHtml = await statusResponse.text();
  const detailedStatus = parseStatusPage(statusHtml);
  log({
    attempt,
    stage: "goc.status.detail",
    level: "success",
    message: "Detailed application status loaded.",
    data: {
      recordNumber,
      pagePreview: previewHtml(statusHtml),
      status: detailedStatus,
    },
  });

  return detailedStatus;
}

async function checkAppointmentStatus(payload: {
  registrationNumber?: string;
  documentNumber?: string;
  checkType?: AppointmentCheckType;
  phone?: string | null;
  email?: string | null;
  parsedData?: ParsedAppointmentData;
}) {
  const recorder = createStepRecorder();
  const log = recorder.log;
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

  log({
    stage: "check.start",
    level: "info",
    message: "Appointment status check started.",
    data: {
      registrationNumber,
      documentNumber,
      checkType: checkType || null,
      phone,
      email,
      parsedData,
    },
  });

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
    log({
      stage: "check.cache",
      level: "success",
      message: "Returning cached appointment result.",
      data: {
        cacheKey,
        expiresAt: new Date(cached.expiresAt).toISOString(),
      },
    });

    return cached.value;
  }

  let attempt = 0;
  let cycle = 0;
  while (attempt < MAX_ATTEMPTS && cycle < MAX_WORKFLOW_CYCLES) {
    cycle += 1;

    try {
      log({
        attempt,
        stage: "cycle.start",
        level: "info",
        message: "Starting workflow cycle.",
        data: {
          cycle,
          loginAttemptsUsed: attempt,
        },
      });

      const session = await getSession(log, cycle);
      const captchaBytes = await loadCaptcha(session, log, cycle);
      const captchaText = await solveCaptchaImage(captchaBytes, log, cycle);

      if (!captchaText || captchaText.length < 6) {
        sessionCache = null;
        log({
          attempt,
          stage: "captcha.invalid",
          level: "error",
          message: "Captcha solver returned an invalid value.",
          data: {
            cycle,
            captchaText,
          },
        });
        continue;
      }

      attempt += 1;
      const loginResult = await loginToEIkamet(session, captchaText, log, attempt, {
        registrationNumber,
        documentNumber,
        checkType,
        phone,
        email,
      });

      if (loginResult.errors?.captchaInputText?.length) {
        sessionCache = null;
        log({
          attempt,
          stage: "goc.login.captchaRejected",
          level: "error",
          message: "e-ikamet rejected the captcha value.",
          data: {
            cycle,
            attempt,
            captchaText,
            errors: loginResult.errors,
          },
        });
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

        log({
          attempt,
          stage: "goc.login.noResult",
          level: "error",
          message: "e-ikamet did not allow proceeding with the provided data.",
          data: {
            cycle,
            attempt,
            loginResult,
          },
        });

        resultCache.set(cacheKey, {
          value: failedResult,
          expiresAt: Date.now() + 5 * 60 * 1000,
        });
        return failedResult;
      }

      const status = await getAppointmentStatus(session, log, attempt);
      const result: AppointmentCheckResult = {
        success: true,
        checkType,
        attempts: attempt,
        error: null,
        checkedAt: new Date().toISOString(),
        parsedData,
        randevuStatus: status,
      };

      log({
        attempt,
        stage: "check.complete",
        level: "success",
        message: "Appointment status check completed successfully.",
        data: {
          cycle,
          attempt,
          status,
        },
      });

      resultCache.set(cacheKey, {
        value: result,
        expiresAt: Date.now() + 10 * 60 * 1000,
      });
      return result;
    } catch (error) {
      sessionCache = null;
      log({
        attempt,
        stage: "cycle.error",
        level: "error",
        message: "Workflow cycle failed.",
        data: {
          cycle,
          attempt,
          error,
        },
      });

      if (attempt >= MAX_ATTEMPTS || cycle >= MAX_WORKFLOW_CYCLES) {
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

      await sleep(RETRY_DELAY_MS * (error instanceof HttpError && error.status === 502 ? 2 : 1));
    }
  }

  log({
    attempt,
    stage: "check.exhausted",
    level: "error",
    message: "Workflow finished without a successful result.",
    data: {
      attemptsUsed: attempt,
      cyclesUsed: cycle,
    },
  });

  return {
    success: false,
    checkType,
    attempts: attempt,
    error: `${attempt || 0} ta real login urinishidan keyin muvaffaqiyatsiz.`,
    checkedAt: new Date().toISOString(),
    parsedData,
    randevuStatus: null,
  } satisfies AppointmentCheckResult;
}

const streamResponse = (
  handler: (emit: (event: AppointmentStreamEvent) => void) => Promise<void>,
) =>
  new Response(
    new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const emit = (event: AppointmentStreamEvent) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        };

        try {
          await handler(emit);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unexpected error.";
          emit({
            type: "error",
            error: message,
          });
        } finally {
          controller.close();
        }
      },
    }),
    {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    },
  );

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

    if (action === "check-stream") {
      return streamResponse(async (emit) => {
        const result = await checkAppointmentStatus(payload);
        emit({
          type: "result",
          result,
        });
      });
    }

    throw new HttpError(400, "Unsupported action.");
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return jsonResponse({ error: message }, status);
  }
});
