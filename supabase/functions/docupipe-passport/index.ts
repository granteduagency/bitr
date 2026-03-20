import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DOCUPIPE_BASE_URL = "https://app.docupipe.ai";
const PASSPORT_SCHEMA_NAME = "bitrx-passport-extraction-v2";
const PASSPORT_SCHEMA = {
  type: "object",
  properties: {
    passport_number: {
      type: "string",
      description: "Passport number or document number exactly as written on the passport.",
    },
    surname: {
      type: "string",
      description: "Holder surname or last name.",
    },
    given_names: {
      type: "string",
      description: "Holder given names without the surname.",
    },
    full_name: {
      type: "string",
      description: "Full passport holder name.",
    },
    nationality: {
      type: "string",
      description: "Nationality or citizenship written on the passport.",
    },
    date_of_birth: {
      type: "string",
      description: "Birth date in YYYY-MM-DD format when possible.",
    },
    date_of_issue: {
      type: "string",
      description: "Issue date in YYYY-MM-DD format when possible.",
    },
    date_of_expiry: {
      type: "string",
      description: "Expiry date in YYYY-MM-DD format when possible.",
    },
    sex: {
      type: "string",
      description: "Passport sex marker, preferably M or F.",
    },
    place_of_birth: {
      type: "string",
      description: "Place of birth when present.",
    },
    personal_number: {
      type: "string",
      description: "Personal number or national identification number if present.",
    },
    issuing_country: {
      type: "string",
      description: "Issuing country or issuing authority country.",
    },
  },
  additionalProperties: false,
};

type JsonRecord = Record<string, unknown>;

class HttpError extends Error {
  status: number;
  errorCode: string;

  constructor(status: number, errorCode: string, message?: string) {
    super(message || errorCode);
    this.status = status;
    this.errorCode = errorCode;
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const readErrorMessage = async (response: Response) => {
  const raw = await response.text();
  try {
    const parsed = JSON.parse(raw) as { error?: string; message?: string };
    return parsed.error || parsed.message || raw;
  } catch {
    return raw || response.statusText;
  }
};

async function docuPipeRequest<T>(
  apiKey: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("X-API-Key", apiKey);

  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${DOCUPIPE_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new HttpError(response.status, "docupipe_istek_hatasi", message);
  }

  return response.json() as Promise<T>;
}

async function ensurePassportSchema(apiKey: string) {
  const schemas = await docuPipeRequest<Array<{ schemaId: string; schemaName: string }>>(
    apiKey,
    "/schemas",
  );

  const existing = schemas.find((schema) => schema.schemaName === PASSPORT_SCHEMA_NAME);
  if (existing?.schemaId) {
    return existing.schemaId;
  }

  const created = await docuPipeRequest<{ schemaId: string }>(apiKey, "/schema", {
    method: "POST",
    body: JSON.stringify({
      schemaName: PASSPORT_SCHEMA_NAME,
      jsonSchema: PASSPORT_SCHEMA,
    }),
  });

  return created.schemaId;
}

async function waitForDocumentReady(apiKey: string, documentId: string) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const document = await docuPipeRequest<{ status?: string } & JsonRecord>(
      apiKey,
      `/document/${documentId}`,
    );

    if (document.status === "completed") {
      return document;
    }

    if (document.status === "failed" || document.status === "error") {
      throw new HttpError(502, "docupipe_belge_isleme_basarisiz");
    }

    await sleep(1500);
  }

  throw new HttpError(504, "docupipe_belge_isleme_zaman_asimi");
}

async function waitForJobReady(apiKey: string, jobId: string, label: string) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const job = await docuPipeRequest<{ status?: string; errorMessage?: string } & JsonRecord>(
      apiKey,
      `/job/${jobId}`,
    );

    if (job.status === "completed") {
      return job;
    }

    if (job.status === "failed" || job.status === "error") {
      throw new HttpError(
        502,
        "docupipe_is_basarisiz",
        typeof job.errorMessage === "string" ? `${label}: ${job.errorMessage}` : label,
      );
    }

    await sleep(1500);
  }

  throw new HttpError(504, "docupipe_is_zaman_asimi", label);
}

async function waitForStandardizationReady(
  apiKey: string,
  standardizationId: string,
  standardizationJobId?: string | null,
) {
  if (standardizationJobId) {
    await waitForJobReady(apiKey, standardizationJobId, "DocuPipe standardization job");
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const standardization = await docuPipeRequest<
        { status?: string; data?: JsonRecord | null } & JsonRecord
      >(apiKey, `/standardization/${standardizationId}`);

      if (standardization.status === "completed" || standardization.data) {
        return standardization;
      }

      if (standardization.status === "failed" || standardization.status === "error") {
        throw new HttpError(502, "docupipe_standardizasyon_basarisiz");
      }
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) {
        await sleep(1500);
        continue;
      }

      throw error;
    }

    await sleep(1500);
  }

  throw new HttpError(504, "docupipe_standardizasyon_zaman_asimi");
}

const stringOrNull = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
};

function normalizePassportExtraction(data: JsonRecord) {
  const surname = stringOrNull(data.surname ?? data.last_name);
  const givenNames = stringOrNull(data.given_names ?? data.first_names ?? data.names);
  const fullName =
    stringOrNull(data.full_name) ||
    [givenNames, surname].filter(Boolean).join(" ").trim() ||
    null;

  return {
    passport_number: stringOrNull(data.passport_number ?? data.document_number),
    surname,
    given_names: givenNames,
    full_name: fullName,
    nationality: stringOrNull(data.nationality ?? data.citizenship),
    date_of_birth: stringOrNull(data.date_of_birth ?? data.birth_date),
    date_of_issue: stringOrNull(data.date_of_issue ?? data.issue_date),
    date_of_expiry: stringOrNull(data.date_of_expiry ?? data.expiry_date),
    sex: stringOrNull(data.sex ?? data.gender),
    place_of_birth: stringOrNull(data.place_of_birth),
    personal_number: stringOrNull(data.personal_number ?? data.identity_number),
    issuing_country: stringOrNull(data.issuing_country ?? data.country_of_issue),
  };
}

function assertPassportExtractionValid(extraction: ReturnType<typeof normalizePassportExtraction>) {
  const hasPrimaryName = Boolean(extraction.surname);
  const hasAnyName = Boolean(extraction.given_names || extraction.full_name);
  const evidenceScore = [
    extraction.surname,
    extraction.given_names || extraction.full_name,
    extraction.nationality,
    extraction.date_of_birth,
    extraction.sex,
    extraction.place_of_birth,
    extraction.issuing_country,
    extraction.passport_number,
  ].filter(Boolean).length;

  if (!hasPrimaryName || !hasAnyName || evidenceScore < 4) {
    throw new HttpError(
      400,
      "pasaport_gecersiz_belge",
    );
  }
}

async function requireAdmin(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    throw new HttpError(500, "supabase_ortami_yok");
  }

  const authorization = req.headers.get("Authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.replace("Bearer ", "").trim()
    : "";

  if (!token) {
    throw new HttpError(401, "yetki_belirteci_yok");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    throw new HttpError(401, "yetkisiz");
  }

  const { data: role, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (roleError) {
    throw new HttpError(500, roleError.message);
  }

  if (!role) {
    throw new HttpError(403, "admin_yetkisi_gerekli");
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ errorCode: "yontem_izin_verilmiyor" }, 405);
  }

  try {
    const apiKey = Deno.env.get("DOCUPIPE_API_KEY");
    if (!apiKey) {
      throw new HttpError(500, "docupipe_api_anahtari_yok");
    }

    const payload = await req.json() as {
      action?: string;
      documentId?: string;
      file?: {
        filename?: string;
        contentsBase64?: string;
      };
    };

    if (payload.action === "extract") {
      const filename = payload.file?.filename?.trim();
      const contentsBase64 = payload.file?.contentsBase64?.trim();

      if (!filename || !contentsBase64) {
        throw new HttpError(400, "pasaport_dosyasi_eksik");
      }

      const schemaId = await ensurePassportSchema(apiKey);
      const upload = await docuPipeRequest<{ documentId: string }>(apiKey, "/document", {
        method: "POST",
        body: JSON.stringify({
          document: {
            file: {
              filename,
              contents: contentsBase64,
            },
          },
        }),
      });

      await waitForDocumentReady(apiKey, upload.documentId);

      const standardize = await docuPipeRequest<{
        standardizationIds?: string[];
        standardizationJobIds?: string[];
      }>(
        apiKey,
        "/v2/standardize/batch",
        {
          method: "POST",
          body: JSON.stringify({
            documentIds: [upload.documentId],
            schemaId,
          }),
        },
      );

      const standardizationId = standardize.standardizationIds?.[0];
      const standardizationJobId = standardize.standardizationJobIds?.[0];
      if (!standardizationId) {
        throw new HttpError(502, "standardizasyon_kimligi_yok");
      }

      const standardization = await waitForStandardizationReady(
        apiKey,
        standardizationId,
        standardizationJobId,
      );
      const extraction = normalizePassportExtraction((standardization.data || {}) as JsonRecord);
      assertPassportExtractionValid(extraction);

      return jsonResponse({
        documentId: upload.documentId,
        standardizationId,
        standardizationJobId,
        schemaId,
        extraction,
      });
    }

    if (payload.action === "original-url") {
      await requireAdmin(req);

      const documentId = payload.documentId?.trim();
      if (!documentId) {
        throw new HttpError(400, "belge_kimligi_gerekli");
      }

      const download = await docuPipeRequest<{ url?: string }>(
        apiKey,
        `/document/${documentId}/download/original-url`,
      );

      if (!download.url) {
        throw new HttpError(502, "orijinal_belge_baglantisi_yok");
      }

      return jsonResponse({ url: download.url });
    }

    throw new HttpError(400, "desteklenmeyen_islem");
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const errorCode = error instanceof HttpError ? error.errorCode : "beklenmeyen_hata";
    return jsonResponse({ errorCode }, status);
  }
});
