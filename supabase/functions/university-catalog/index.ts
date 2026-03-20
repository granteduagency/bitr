const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type JsonRecord = Record<string, unknown>;

type CatalogLoginResponse = {
  workspace?: {
    id?: string;
    name?: string;
  };
};

type CatalogRawFaculty = {
  id?: string;
  name?: string;
};

type CatalogRawDegreeOption = {
  id?: string;
  name?: string;
  order?: number;
};

type CatalogRawProgram = {
  id?: string;
  name?: string;
  degree?: string;
  language?: string;
  facultyId?: string | null;
  faculty?: CatalogRawFaculty | null;
  isActive?: boolean;
  durationYears?: number | null;
  tuitionFee?: number | null;
  currency?: string | null;
  description?: string | null;
  requirements?: string | null;
};

type CatalogRawUniversity = {
  id?: string;
  workspaceId?: string;
  name?: string;
  country?: string;
  city?: string;
  website?: string | null;
  logoUrl?: string | null;
  description?: string | null;
  isActive?: boolean;
  faculties?: CatalogRawFaculty[];
  programs?: CatalogRawProgram[];
};

type CatalogUniversity = {
  id: string;
  workspaceId: string;
  name: string;
  country: string;
  city: string;
  website: string | null;
  logoUrl: string | null;
  description: string | null;
  faculties: string[];
  programs: Array<{
    id: string;
    name: string;
    degree: string;
    language: string;
    facultyId: string | null;
    facultyName: string | null;
    isActive: boolean;
    durationYears: number | null;
    tuitionFee: number | null;
    currency: string | null;
    description: string | null;
    requirements: string | null;
  }>;
};

type CatalogDegreeOption = {
  id: string;
  name: string;
  order: number;
};

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const normalizeBaseUrl = (value?: string | null) =>
  value?.trim().replace(/\/+$/, "") ?? "";

const normalizeString = (value: unknown) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const optionalString = (value: unknown) => {
  const normalized = normalizeString(value);
  return normalized || null;
};

const uniqueSorted = (values: Array<string | null | undefined>) =>
  Array.from(
    new Set(values.map((value) => normalizeString(value)).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right, "uz"));

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

const mergeCookiePairs = (...cookieLists: string[][]) => {
  const cookieMap = new Map<string, string>();

  for (const cookieList of cookieLists) {
    for (const cookie of cookieList) {
      const pair = cookie.trim();
      if (!pair) {
        continue;
      }

      const separatorIndex = pair.indexOf("=");
      if (separatorIndex < 0) {
        continue;
      }

      cookieMap.set(pair.slice(0, separatorIndex), pair);
    }
  }

  return Array.from(cookieMap.values()).join("; ");
};

const readErrorMessage = async (response: Response) => {
  const raw = await response.text();

  try {
    const parsed = JSON.parse(raw) as { error?: string; message?: string };
    return parsed.error || parsed.message || raw;
  } catch {
    return raw || response.statusText;
  }
};

let authCache:
  | {
      cookieHeader: string;
      workspaceId: string;
      workspaceName: string | null;
      expiresAt: number;
    }
  | null = null;

async function fetchJson<T>(url: string, init: RequestInit = {}): Promise<{ data: T; response: Response }> {
  const response = await fetch(url, init);
  if (!response.ok) {
    await readErrorMessage(response);
    throw new HttpError(response.status, "katalog_istek_hatasi");
  }

  return {
    data: (await response.json()) as T,
    response,
  };
}

async function createCatalogSession(forceRefresh = false) {
  if (!forceRefresh && authCache && authCache.expiresAt > Date.now()) {
    return authCache;
  }

  const baseUrl = normalizeBaseUrl(Deno.env.get("CATALOG_BASE_URL"));
  const email = normalizeString(Deno.env.get("CATALOG_EMAIL"));
  const password = Deno.env.get("CATALOG_PASSWORD") ?? "";
  const workspaceId = normalizeString(Deno.env.get("CATALOG_WORKSPACE_ID"));

  if (!baseUrl || !email || !password) {
    throw new HttpError(
      500,
      "katalog_gizli_ayarlar_eksik",
    );
  }

  const csrf = await fetchJson<{ csrfToken?: string }>(`${baseUrl}/api/auth/csrf`);
  const csrfToken = normalizeString(csrf.data.csrfToken);
  if (!csrfToken) {
    throw new HttpError(502, "katalog_csrf_yok");
  }

  const csrfCookiePairs = parseSetCookieHeaders(csrf.response.headers)
    .map(extractCookiePair)
    .filter(Boolean);

  const login = await fetchJson<CatalogLoginResponse>(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
      Cookie: mergeCookiePairs(csrfCookiePairs),
    },
    body: JSON.stringify({
      email,
      password,
      rememberMe: false,
      ...(workspaceId ? { workspaceId } : {}),
    }),
  });

  const loginCookiePairs = parseSetCookieHeaders(login.response.headers)
    .map(extractCookiePair)
    .filter(Boolean);

  const resolvedWorkspaceId = normalizeString(login.data.workspace?.id);
  if (!resolvedWorkspaceId) {
    throw new HttpError(502, "katalog_calisma_alani_yok");
  }

  authCache = {
    cookieHeader: mergeCookiePairs(csrfCookiePairs, loginCookiePairs),
    workspaceId: resolvedWorkspaceId,
    workspaceName: optionalString(login.data.workspace?.name),
    expiresAt: Date.now() + 10 * 60 * 1000,
  };

  return authCache;
}

async function fetchCatalogUniversities() {
  const baseUrl = normalizeBaseUrl(Deno.env.get("CATALOG_BASE_URL"));
  if (!baseUrl) {
    throw new HttpError(500, "katalog_url_eksik");
  }

  const attemptFetch = async (forceRefresh = false) => {
    const auth = await createCatalogSession(forceRefresh);

    const headers = {
      Accept: "application/json",
      Cookie: auth.cookieHeader,
    };

    const [universitiesResponse, degreesResponse] = await Promise.all([
      fetchJson<{ universities?: CatalogRawUniversity[] }>(
        `${baseUrl}/api/universities?includeInactive=true`,
        {
          headers,
        },
      ),
      fetchJson<{ degrees?: CatalogRawDegreeOption[] }>(
        `${baseUrl}/api/program-degrees`,
        {
          headers,
        },
      ),
    ]);

    return {
      universitiesResponse,
      degreesResponse,
    };
  };

  try {
    const result = await attemptFetch(false);
    return {
      workspaceId: authCache?.workspaceId ?? null,
      workspaceName: authCache?.workspaceName ?? null,
      universities: result.universitiesResponse.data.universities ?? [],
      degrees: result.degreesResponse.data.degrees ?? [],
    };
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) {
      const result = await attemptFetch(true);
      return {
        workspaceId: authCache?.workspaceId ?? null,
        workspaceName: authCache?.workspaceName ?? null,
        universities: result.universitiesResponse.data.universities ?? [],
        degrees: result.degreesResponse.data.degrees ?? [],
      };
    }

    throw error;
  }
}

function transformCatalogUniversities(universities: CatalogRawUniversity[]): CatalogUniversity[] {
  return universities
    .filter((university) => university.isActive !== false)
    .map((university) => {
      const activePrograms = (university.programs ?? [])
        .filter((program) => program.isActive !== false)
        .map((program) => ({
          id: normalizeString(program.id),
          name: normalizeString(program.name),
          degree: normalizeString(program.degree),
          language: normalizeString(program.language),
          facultyId: optionalString(program.facultyId),
          facultyName: optionalString(program.faculty?.name),
          isActive: program.isActive !== false,
          durationYears:
            typeof program.durationYears === "number" ? program.durationYears : null,
          tuitionFee: typeof program.tuitionFee === "number" ? program.tuitionFee : null,
          currency: optionalString(program.currency),
          description: optionalString(program.description),
          requirements: optionalString(program.requirements),
        }))
        .filter((program) => program.id && program.name && program.degree && program.language);

      return {
        id: normalizeString(university.id),
        workspaceId: normalizeString(university.workspaceId),
        name: normalizeString(university.name),
        country: normalizeString(university.country) || "Türkiye",
        city: normalizeString(university.city) || "Istanbul",
        website: optionalString(university.website),
        logoUrl: optionalString(university.logoUrl),
        description: optionalString(university.description),
        faculties: uniqueSorted([
          ...(university.faculties ?? []).map((faculty) => faculty.name),
          ...activePrograms.map((program) => program.facultyName),
        ]),
        programs: activePrograms,
      };
    })
    .filter((university) => university.id && university.workspaceId && university.name)
    .filter((university) => university.programs.length > 0)
    .sort((left, right) => left.name.localeCompare(right.name, "uz"));
}

function transformCatalogDegreeOptions(
  degrees: CatalogRawDegreeOption[],
  universities: CatalogUniversity[],
): CatalogDegreeOption[] {
  const normalizedDegrees = degrees
    .map((degree) => ({
      id: normalizeString(degree.id),
      name: normalizeString(degree.name),
      order: typeof degree.order === "number" ? degree.order : Number.MAX_SAFE_INTEGER,
    }))
    .filter((degree) => degree.name);

  const seen = new Set(normalizedDegrees.map((degree) => degree.name.toLocaleLowerCase("uz")));
  const fallbackDegrees = uniqueSorted(
    universities.flatMap((university) => university.programs.map((program) => program.degree)),
  )
    .filter((degree) => !seen.has(degree.toLocaleLowerCase("uz")))
    .map((name, index) => ({
      id: `fallback-${index + 1}`,
      name,
      order: Number.MAX_SAFE_INTEGER,
    }));

  return [...normalizedDegrees, ...fallbackDegrees].sort(
    (left, right) => left.order - right.order || left.name.localeCompare(right.name, "uz"),
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ errorCode: "yontem_izin_verilmiyor" }, 405);
  }

  try {
    const payload = (await req.json().catch(() => ({}))) as JsonRecord;
    const action = normalizeString(payload.action);

    if (action && action !== "catalog") {
      throw new HttpError(400, "desteklenmeyen_islem");
    }

    const catalog = await fetchCatalogUniversities();
    const universities = transformCatalogUniversities(catalog.universities);
    const degrees = transformCatalogDegreeOptions(catalog.degrees, universities);

    return jsonResponse({
      workspaceId: catalog.workspaceId,
      workspaceName: catalog.workspaceName,
      degrees,
      universities,
    });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const errorCode = error instanceof HttpError ? error.message : "beklenmeyen_hata";
    return jsonResponse({ errorCode }, status);
  }
});
