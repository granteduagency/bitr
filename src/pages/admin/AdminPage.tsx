import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  getDocuPipeOriginalUrl,
  getPassportFatherName,
  getPassportGivenName,
  getPassportSurname,
  toPassportExtractionData,
  type PassportExtractionData,
} from "@/lib/docupipe";
import type { Tables } from "@/integrations/supabase/types";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FieldGroup, Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  LogOut,
  Users,
  FileText,
  Clock,
  CheckCircle,
  Lock,
  BarChart3,
  Grip,
  Search,
  Bell,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Home,
  ShieldCheck,
  Plane,
  Briefcase,
  Languages,
  Gavel,
  GraduationCap,
  Eye,
  type LucideIcon,
} from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

type ServiceField = {
  key: string;
  labelKey: string;
  isFile?: boolean;
  isDate?: boolean;
  isJson?: boolean;
  isDocuPipeOriginal?: boolean;
};

const tableMap = {
  ikamet: "ikamet_applications",
  sigorta: "sigorta_applications",
  visa: "visa_applications",
  tercume: "tercume_applications",
  hukuk: "hukuk_applications",
  calisma: "calisma_applications",
  universite: "university_applications",
} as const;

type ServiceTab = keyof typeof tableMap;
type AdminTab = "dashboard" | "clients" | ServiceTab;
type ApplicationTableName = (typeof tableMap)[ServiceTab];
type ClientRecord = Tables<"clients">;
type ClientSummary = Pick<ClientRecord, "name" | "phone">;
type ClientRelation = {
  clients?: ClientSummary | null;
  client?: ClientSummary | null;
};
type AdminApplicationMap = {
  ikamet: Tables<"ikamet_applications"> & ClientRelation;
  sigorta: Tables<"sigorta_applications"> & ClientRelation;
  visa: Tables<"visa_applications"> & ClientRelation;
  tercume: Tables<"tercume_applications"> & ClientRelation;
  hukuk: Tables<"hukuk_applications"> & ClientRelation;
  calisma: Tables<"calisma_applications"> & ClientRelation;
  universite: Tables<"university_applications"> & ClientRelation;
};
type AdminApplicationRecord = AdminApplicationMap[ServiceTab];
type TabItem = {
  key: AdminTab;
  label: string;
  icon: LucideIcon;
};

const isServiceTab = (value: AdminTab): value is ServiceTab => value in tableMap;
const formatNullableDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString() : "—";

export default function AdminPage() {
  const { t } = useTranslation();
  const [session, setSession] = useState<Session | null>(null);
  const [selectedApp, setSelectedApp] = useState<AdminApplicationRecord | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [data, setData] = useState<AdminApplicationRecord[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [openingDocumentId, setOpeningDocumentId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    today: 0,
  });

  useEffect(() => {
    supabase.auth.onAuthStateChange((_, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
    });
  }, []);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error)
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  // Per-service field definitions: key = DB column, labelKey = translation key
  const SERVICE_FIELDS: Record<ServiceTab, ServiceField[]> = {
    ikamet: [
      { key: 'category', labelKey: 'admin.category' },
      { key: 'type', labelKey: 'admin.serviceType' },
      { key: 'father_name', labelKey: 'form.fatherName' },
      { key: 'mother_name', labelKey: 'form.motherName' },
      { key: 'phone', labelKey: 'form.phone' },
      { key: 'email', labelKey: 'form.email' },
      { key: 'address', labelKey: 'form.address' },
      { key: 'has_insurance', labelKey: 'form.insurance' },
      { key: 'supporter_type', labelKey: 'form.supporterType' },
      { key: 'appointment_url', labelKey: 'admin.appointmentFile', isFile: true },
      { key: 'appointment_result', labelKey: 'admin.appointmentCheckResult', isJson: true },
      { key: 'passport_url', labelKey: 'form.passport', isFile: true },
      { key: 'passport_document_id', labelKey: 'admin.passportOriginal', isDocuPipeOriginal: true },
      { key: 'passport_extraction', labelKey: 'admin.passportExtraction', isJson: true },
      { key: 'photo_url', labelKey: 'form.photo', isFile: true },
      { key: 'student_cert_url', labelKey: 'form.studentCert', isFile: true },
      { key: 'supporter_id_front_url', labelKey: 'form.supporterIdFront', isFile: true },
      { key: 'supporter_id_back_url', labelKey: 'form.supporterIdBack', isFile: true },
      { key: 'supporter_passport_url', labelKey: 'form.supporterPassport', isFile: true },
      { key: 'supporter_passport_document_id', labelKey: 'admin.supporterPassportOriginal', isDocuPipeOriginal: true },
      { key: 'supporter_passport_extraction', labelKey: 'admin.supporterPassportExtraction', isJson: true },
      { key: 'supporter_student_cert_url', labelKey: 'form.supporterStudentCert', isFile: true },
      { key: 'status', labelKey: 'admin.status' },
      { key: 'notes', labelKey: 'admin.notes' },
      { key: 'created_at', labelKey: 'admin.createdAt', isDate: true },
    ],
    visa: [
      { key: 'type', labelKey: 'admin.serviceType' },
      { key: 'from_country', labelKey: 'viza.fromCountry' },
      { key: 'to_country', labelKey: 'viza.toCountry' },
      { key: 'travel_date', labelKey: 'viza.travelDate', isDate: true },
      { key: 'phone', labelKey: 'form.phone' },
      { key: 'status', labelKey: 'admin.status' },
      { key: 'created_at', labelKey: 'admin.createdAt', isDate: true },
    ],
    sigorta: [
      { key: 'type', labelKey: 'admin.serviceType' },
      { key: 'data', labelKey: 'admin.details', isJson: true },
      { key: 'status', labelKey: 'admin.status' },
      { key: 'created_at', labelKey: 'admin.createdAt', isDate: true },
    ],
    tercume: [
      { key: 'document_types', labelKey: 'tercume.documentType' },
      { key: 'from_language', labelKey: 'tercume.fromLanguage' },
      { key: 'to_language', labelKey: 'tercume.toLanguage' },
      { key: 'documents_url', labelKey: 'tercume.uploadDocuments', isFile: true },
      { key: 'passport_document_id', labelKey: 'admin.passportOriginal', isDocuPipeOriginal: true },
      { key: 'passport_extraction', labelKey: 'admin.passportExtraction', isJson: true },
      { key: 'status', labelKey: 'admin.status' },
      { key: 'created_at', labelKey: 'admin.createdAt', isDate: true },
    ],
    hukuk: [
      { key: 'full_name', labelKey: 'form.fullName' },
      { key: 'phone', labelKey: 'form.phone' },
      { key: 'problem', labelKey: 'form.problem' },
      { key: 'status', labelKey: 'admin.status' },
      { key: 'created_at', labelKey: 'admin.createdAt', isDate: true },
    ],
    calisma: [
      { key: 'type', labelKey: 'admin.serviceType' },
      { key: 'documents_url', labelKey: 'common.upload', isFile: true },
      { key: 'notes', labelKey: 'admin.notes' },
      { key: 'status', labelKey: 'admin.status' },
      { key: 'created_at', labelKey: 'admin.createdAt', isDate: true },
    ],
    universite: [
      { key: 'external_university_name', labelKey: 'admin.universityName' },
      { key: 'degree', labelKey: 'universite.degree' },
      { key: 'faculty', labelKey: 'universite.faculty' },
      { key: 'program', labelKey: 'universite.program' },
      { key: 'language', labelKey: 'universite.language' },
      { key: 'phone', labelKey: 'form.phone' },
      { key: 'passport_url', labelKey: 'universite.passportUpload', isFile: true },
      { key: 'passport_document_id', labelKey: 'admin.passportOriginal', isDocuPipeOriginal: true },
      { key: 'passport_extraction', labelKey: 'admin.passportExtraction', isJson: true },
      { key: 'diploma_url', labelKey: 'universite.diplomaUpload', isFile: true },
      { key: 'diploma_supplement_url', labelKey: 'universite.diplomaSupplementUpload', isFile: true },
      { key: 'photo_url', labelKey: 'universite.photoUpload', isFile: true },
      { key: 'status', labelKey: 'admin.status' },
      { key: 'created_at', labelKey: 'admin.createdAt', isDate: true },
    ],
  };

  const getClientName = (item: AdminApplicationRecord | null | undefined) =>
    item?.clients?.name || item?.client?.name || "—";
  const getClientPhone = (item: AdminApplicationRecord | null | undefined) =>
    item?.clients?.phone || item?.client?.phone || "—";
  const isJsonObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);
  const shouldHideStructuredKey = (key: string) => key.toLowerCase() === "mrz";
  const getPrimaryPassportExtraction = (
    item: AdminApplicationRecord | null | undefined,
  ): PassportExtractionData | null => {
    if (!item) return null;

    const record = item as unknown as Record<string, unknown>;
    const directExtraction = toPassportExtractionData(record.passport_extraction);
    if (directExtraction) {
      return directExtraction;
    }

    const dataPayload = isJsonObject(record.data) ? record.data : null;
    if (!dataPayload) {
      return null;
    }

    return toPassportExtractionData(dataPayload.passport_extraction);
  };
  const getPassportIdentitySummary = (item: AdminApplicationRecord | null | undefined) => {
    const extraction = getPrimaryPassportExtraction(item);
    if (!extraction) return [];

    return [
      { key: "name", label: t("form.name"), value: getPassportGivenName(extraction) },
      { key: "surname", label: t("form.surname"), value: getPassportSurname(extraction) },
      { key: "father_name", label: t("form.fatherName"), value: getPassportFatherName(extraction) },
    ].filter((field) => field.value);
  };

  const fetchData = async (serviceTab: ServiceTab) => {
    const table = tableMap[serviceTab];
    const { data: rows, error } = await supabase
      .from(table)
      .select("*, clients(name, phone)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch data error:", error);
      setData([]);
      return;
    }

    setData((rows || []) as AdminApplicationRecord[]);
  };

  const fetchClients = async () => {
    const { data: d } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });
    setClients(d || []);
  };

  const fetchStats = async () => {
    const tables = Object.values(tableMap) as ApplicationTableName[];
    let total = 0,
      pending = 0,
      completed = 0,
      today = 0;
    const todayStr = new Date().toISOString().split("T")[0];
    for (const table of tables) {
      const { count: c1 } = await supabase.from(table).select(
        "*",
        { count: "exact", head: true },
      );
      const { count: c2 } = await supabase.from(table)
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      const { count: c3 } = await supabase.from(table)
        .select("*", { count: "exact", head: true })
        .eq("status", "completed");
      const { count: c4 } = await supabase.from(table)
        .select("*", { count: "exact", head: true })
        .gte("created_at", todayStr);
      total += c1 || 0;
      pending += c2 || 0;
      completed += c3 || 0;
      today += c4 || 0;
    }
    setStats({ total, pending, completed, today });
  };

  useEffect(() => {
    if (!session) return;
    if (tab === "dashboard") {
      fetchStats();
      fetchClients();
    } else if (tab === "clients") {
      fetchClients();
    } else if (isServiceTab(tab)) {
      fetchData(tab);
    }
  }, [session, tab]);

  const updateStatus = async (id: string, status: string) => {
    if (!isServiceTab(tab)) return;

    await supabase
      .from(tableMap[tab])
      .update({ status })
      .eq("id", id);
    fetchData(tab);
    toast({ title: t("common.success") });
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      pending: "bg-warning/10 text-warning border-warning/20",
      processing: "bg-info/10 text-info border-info/20",
      completed: "bg-success/10 text-success border-success/20",
      rejected: "bg-destructive/10 text-destructive border-destructive/20",
    };
    return (
      <Badge variant="outline" className={`${map[s] || ""} font-medium`}>
        {t(`admin.${s}`)}
      </Badge>
    );
  };

  const humanizeKey = (key: string) =>
    key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const getLabelForKey = (key: string, preferredLabelKey?: string) => {
    if (preferredLabelKey) {
      const translated = t(preferredLabelKey);
      if (translated !== preferredLabelKey) return translated;
    }

    const specialLabels: Record<string, string> = {
      passport_document_id: "admin.passportOriginal",
      supporter_passport_document_id: "admin.supporterPassportOriginal",
      passport_extraction: "admin.passportExtraction",
      supporter_passport_extraction: "admin.supporterPassportExtraction",
    };

    const specialLabelKey = specialLabels[key];
    if (specialLabelKey) {
      const translated = t(specialLabelKey);
      if (translated !== specialLabelKey) return translated;
    }

    const camel = key.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase());
    const translationKeys = [
      `admin.${camel}`,
      `sigorta.${camel}`,
      `form.${camel}`,
      `tercume.${camel}`,
      `universite.${camel}`,
    ];

    for (const translationKey of translationKeys) {
      const translated = t(translationKey);
      if (translated !== translationKey) return translated;
    }

    return humanizeKey(key);
  };

  const isFileUrl = (value: unknown): value is string =>
    typeof value === "string" && /^https?:\/\//.test(value);

  const isDocumentIdKey = (key: string) => key.endsWith("_document_id");

  const formatValue = (key: string, value: unknown, isDate?: boolean) => {
    if (typeof value === "boolean") {
      return value ? t("common.yes") : t("common.no");
    }

    if (value === null || value === undefined) {
      return "—";
    }

    if ((isDate || key === "created_at" || key === "updated_at" || key.endsWith("_date")) && typeof value === "string") {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleString();
      }
    }

    if (key === "status") {
      const translated = t(`admin.${value}`);
      return translated !== `admin.${value}` ? translated : String(value);
    }

    if (key === "category" || key === "type") {
      const serviceValue = String(value);
      if (t(`ikamet.${serviceValue}`) !== `ikamet.${serviceValue}`) return t(`ikamet.${serviceValue}`);
      if (t(`viza.types.${serviceValue}`) !== `viza.types.${serviceValue}`) return t(`viza.types.${serviceValue}`);
      if (serviceValue === "yurt_ici" && t("calisma.yurtIci") !== "calisma.yurtIci") return t("calisma.yurtIci");
      if (serviceValue === "yurt_disi" && t("calisma.yurtDisi") !== "calisma.yurtDisi") return t("calisma.yurtDisi");
      if (t(`sigorta.${serviceValue}`) !== `sigorta.${serviceValue}`) return t(`sigorta.${serviceValue}`);
      return serviceValue.replace(/_/g, " ");
    }

    if (key === "has_insurance") {
      return value === true || value === "yes" ? t("form.insuranceYes") : t("form.insuranceNo");
    }

    if (key === "supporter_type") {
      return value === "turk" ? t("form.supporterTypeTurkish") : t("form.supporterTypeForeign");
    }

    if (key === "from_language" || key === "to_language" || key === "language") {
      const translated = t(`tercume.languages.${value}`);
      return translated !== `tercume.languages.${value}` ? translated : String(value);
    }

    if (key === "degree") {
      const translated = t(`universite.degrees.${value}`);
      return translated !== `universite.degrees.${value}` ? translated : String(value);
    }

    if (key === "gender") {
      if (value === "male") return t("common.male");
      if (value === "female") return t("common.female");
    }

    if (key === "sex") {
      if (String(value).toUpperCase() === "M") return t("common.male");
      if (String(value).toUpperCase() === "F") return t("common.female");
    }

    return String(value);
  };

  const renderDetailRow = (rowKey: string, label: string, content: JSX.Element) => (
    <div key={rowKey} className="flex items-start px-6 py-4 hover:bg-slate-50/60 transition-colors">
      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide w-44 shrink-0 pt-0.5">
        {label}
      </span>
      <div className="flex-1 min-w-0">{content}</div>
    </div>
  );

  const openOriginalDocument = async (documentId: string) => {
    try {
      setOpeningDocumentId(documentId);
      const url = await getDocuPipeOriginalUrl(documentId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setOpeningDocumentId(null);
    }
  };

  function renderStructuredValue(value: unknown, key: string, labelPrefix?: string): JSX.Element[] {
    if (shouldHideStructuredKey(key)) {
      return [];
    }

    const label = labelPrefix || getLabelForKey(key);
    if (value === null || value === undefined || value === "") {
      return [];
    }

    if (Array.isArray(value)) {
      const items = value.filter((item) => item !== null && item !== undefined && item !== "");
      if (items.length === 0) return [];

      if (items.every((item) => typeof item !== "object")) {
        if (items.every((item) => isFileUrl(item))) {
          return items.map((item, index) =>
            renderDetailRow(
              `${key}-${index}`,
              items.length > 1 ? `${label} ${index + 1}` : label,
              <a
                href={String(item)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                <Eye className="w-3.5 h-3.5" /> {t("admin.viewFile")}
              </a>,
            ),
          );
        }

        const joined = key === "document_types"
          ? items
              .map((item) => {
                const translated = t(`tercume.documentTypes.${item}`);
                return translated !== `tercume.documentTypes.${item}` ? translated : String(item);
              })
              .join(", ")
          : items.map((item) => formatValue(key, item)).join(", ");

        return [
          renderDetailRow(
            key,
            label,
            <span className="text-sm font-semibold text-slate-800 break-words">{joined}</span>,
          ),
        ];
      }

      return items.flatMap((item, index) =>
        renderStructuredValue(item, key, items.length > 1 ? `${label} ${index + 1}` : label),
      );
    }

    if (typeof value === "object") {
      return Object.entries(value as Record<string, unknown>).flatMap(([childKey, childValue]) =>
        renderStructuredValue(
          childValue,
          childKey,
          labelPrefix ? `${labelPrefix} · ${getLabelForKey(childKey)}` : getLabelForKey(childKey),
        ),
      );
    }

    if (isDocumentIdKey(key) && typeof value === "string") {
      return [
        renderDetailRow(
          key,
          label,
          <button
            type="button"
            onClick={() => openOriginalDocument(value)}
            disabled={openingDocumentId === value}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-60"
          >
            <Eye className="w-3.5 h-3.5" />
            {openingDocumentId === value ? t("common.loading") : t("admin.viewOriginal")}
          </button>,
        ),
      ];
    }

    if (isFileUrl(value)) {
      return [
        renderDetailRow(
          key,
          label,
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            <Eye className="w-3.5 h-3.5" /> {t("admin.viewFile")}
          </a>,
        ),
      ];
    }

    return [
      renderDetailRow(
        key,
        label,
        <span className="text-sm font-semibold text-slate-800 break-words">
          {formatValue(key, value)}
        </span>,
      ),
    ];
  }

  const selectedPassportIdentity = getPassportIdentitySummary(selectedApp);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        {t("common.loading")}
      </div>
    );

  if (!session)
    return (
      <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-4 bg-white">
        {/* Pastel Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[0%] left-[-10%] w-[500px] h-[500px] bg-[#d1fae5]/40 rounded-full blur-[100px]" />
          <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-[#fef3c7]/50 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] bg-[#fce7f3]/40 rounded-full blur-[100px]" />
        </div>

        <div className="absolute top-6 right-6 z-50">
          <LanguageSwitcher />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[380px] z-10 flex flex-col items-center"
        >
          {/* Logo/Icon */}
          <div className="w-24 h-24 mb-6 transition-transform hover:scale-105 duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
              <defs>
                <clipPath id="red-ticket-clip"><rect x="-50" y="-75" width="100" height="150" rx="16" /></clipPath>
                <clipPath id="globe-clip"><circle cx="0" cy="-15" r="45" /></clipPath>
                <clipPath id="badge-clip"><rect x="-27" y="60" width="54" height="16" rx="6" /></clipPath>
              </defs>
              <g transform="translate(200, 215) rotate(-10)">
                <rect x="-70" y="-100" width="140" height="200" rx="24" fill="#FFFFFF" stroke="#5A1827" strokeWidth="8" strokeLinejoin="round" />
              </g>
              <g transform="translate(230, 140) rotate(25)">
                <rect x="-50" y="-75" width="100" height="150" rx="16" fill="#E93465" />
                <g clipPath="url(#red-ticket-clip)">
                  <rect x="-15" y="-85" width="16" height="170" fill="#FFFFFF" stroke="#5A1827" strokeWidth="6" />
                  <rect x="10" y="-85" width="26" height="170" fill="#E4A45A" stroke="#5A1827" strokeWidth="6" />
                </g>
                <rect x="-50" y="-75" width="100" height="150" rx="16" fill="none" stroke="#5A1827" strokeWidth="8" strokeLinejoin="round" />
              </g>
              <g transform="translate(185, 200) rotate(-10)">
                <rect x="-70" y="-100" width="140" height="200" rx="24" fill="#F57A18" stroke="#5A1827" strokeWidth="8" strokeLinejoin="round" />
                <path d="M -60 70 L -60 -76 A 14 14 0 0 1 -46 -90 L 50 -90" fill="none" stroke="#FFAE45" strokeWidth="6" strokeLinecap="round" />
                <g transform="translate(0, 0)">
                  <g clipPath="url(#globe-clip)">
                    <rect x="-50" y="-65" width="100" height="100" fill="#3CF3D8" />
                    <rect x="-50" y="-65" width="50" height="50" fill="#1DA7F8" />
                    <rect x="0" y="-15" width="50" height="50" fill="#1DA7F8" />
                  </g>
                  <line x1="0" y1="-60" x2="0" y2="30" stroke="#5A1827" strokeWidth="5" />
                  <line x1="-45" y1="-15" x2="45" y2="-15" stroke="#5A1827" strokeWidth="5" />
                  <ellipse cx="0" cy="-15" rx="45" ry="16" fill="none" stroke="#5A1827" strokeWidth="5" />
                  <ellipse cx="0" cy="-15" rx="18" ry="45" fill="none" stroke="#5A1827" strokeWidth="5" />
                  <circle cx="0" cy="-15" r="45" fill="none" stroke="#5A1827" strokeWidth="8" />
                </g>
                <g transform="translate(0, 0)">
                  <g clipPath="url(#badge-clip)">
                    <rect x="-27" y="60" width="54" height="16" fill="#FFD62E" />
                    <rect x="-27" y="68" width="54" height="10" fill="#E89B10" />
                  </g>
                  <rect x="-27" y="60" width="54" height="16" rx="6" fill="none" stroke="#5A1827" strokeWidth="6" strokeLinejoin="round" />
                </g>
              </g>
            </svg>
          </div>

          <h1 className="font-heading text-2xl font-bold text-slate-900 mb-2">
            {t("landing.loginTitle")}
          </h1>
          <p className="text-slate-500 text-sm font-medium mb-8 text-center px-4">
            {t("admin.loginDescription")}
          </p>

          <form onSubmit={login} className="w-full space-y-5">
            <div className="space-y-1.5">
              <Input
                id="email"
                type="email"
                placeholder={t("landing.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 bg-white border-2 border-slate-900 rounded-[0.85rem] px-4 font-medium placeholder:text-slate-400 focus-visible:ring-0 focus-visible:border-black"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Input
                id="password"
                type="password"
                placeholder={t("landing.passwordPlaceholder")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 bg-white border-2 border-slate-900 rounded-[0.85rem] px-4 font-medium placeholder:text-slate-400 focus-visible:ring-0 focus-visible:border-black"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-black text-white hover:bg-black/90 rounded-full font-bold text-base shadow-sm mt-2"
            >
              {t("landing.loginBtn")}
            </Button>

            <div className="text-center pt-2">
              <a href="#" className="text-sm font-semibold text-slate-900 hover:underline">
                {t("admin.forgotPassword")}
              </a>
            </div>
          </form>
        </motion.div>
      </div>
    );

  const tabs: TabItem[] = [
    { key: "dashboard", label: t("admin.dashboard"), icon: Grip },
    { key: "clients", label: t("admin.clients"), icon: Users },
    { key: "ikamet", label: t("services.ikamet"), icon: Home },
    { key: "sigorta", label: t("services.sigorta"), icon: ShieldCheck },
    { key: "visa", label: t("services.viza"), icon: Plane },
    { key: "calisma", label: t("services.calisma"), icon: Briefcase },
    { key: "tercume", label: t("services.tercume"), icon: Languages },
    { key: "hukuk", label: t("services.hukuk"), icon: Gavel },
    { key: "universite", label: t("services.universite"), icon: GraduationCap },
  ];

  const statCardsData = [
    { label: t("admin.totalApplications"), value: stats.total.toString(), bg: "bg-[#e0f3f8]", badge: t("admin.allTime"), badgeColors: "bg-[#ff6844] text-white", icon: Users },
    { label: t("admin.pendingApplications"), value: stats.pending.toString(), bg: "bg-[#e4dfd9]", badge: t("admin.wait"), badgeColors: "bg-[#e3d1a8] text-slate-800", icon: Clock },
    { label: t("admin.completedApplications"), value: stats.completed.toString(), bg: "bg-[#dbeef0]", badge: t("admin.done"), badgeColors: "bg-[#fae29f] text-slate-800", icon: CheckCircle },
    { label: t("admin.todayApplications"), value: stats.today.toString(), bg: "bg-[#fae7cb]", badge: t("admin.24h"), badgeColors: "bg-[#e3d1a8] text-slate-800", icon: FileText },
    { label: t("admin.clients"), value: clients.length.toString(), bg: "bg-[#e8ebed]", badge: "", badgeColors: "", icon: Users },
    { label: t("services.ikamet"), value: "—", bg: "bg-[#cadded]", badge: "", badgeColors: "", icon: FileText },
    { label: t("services.viza"), value: "—", bg: "bg-[#ecdcc5]", badge: "", badgeColors: "", icon: Clock },
    { label: t("services.sigorta"), value: "—", bg: "bg-[#d5ced5]", badge: "", badgeColors: "", icon: CheckCircle },
    { label: t("services.calisma"), value: "—", bg: "bg-[#ebd1d8]", badge: "", badgeColors: "", icon: Clock },
    { isEmpty: true, bg: "bg-[#f4f3f0]" },
  ];

  return (
    <div className="min-h-screen bg-[#dcdad2] flex p-3">
      {/* Sidebar */}
      <aside className="w-[88px] bg-[#dcdad2] flex flex-col items-center py-6 gap-6 relative z-10 hidden lg:flex">
        <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-black/5 flex items-center justify-center mb-2 overflow-hidden">
          <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
        </div>
        <nav className="flex-1 flex flex-col gap-4">
          {tabs.map((tb) => {
            const Icon = tb.icon || FileText;
            const isActive = tab === tb.key;
            return (
              <button
                key={tb.key}
                onClick={() => setTab(tb.key)}
                className={cn(
                  "w-11 h-11 flex items-center justify-center rounded-full transition-all group relative",
                  isActive ? "bg-black text-white" : "text-slate-600 hover:bg-black/10"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="absolute left-14 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                  {tb.label}
                </span>
              </button>
            );
          })}
        </nav>
        <button onClick={logout} className="w-11 h-11 flex items-center justify-center rounded-full text-slate-600 hover:bg-black/10 transition-colors">
          <LogOut className="w-5 h-5" />
        </button>
      </aside>

      {/* Main Content */}
      <div className="flex-1 bg-[#f9f8f6] rounded-[2rem] flex flex-col min-w-0 overflow-hidden shadow-sm border border-black/5">
        {/* Header */}
        <header className="h-20 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-slate-400 bg-white px-4 py-2.5 rounded-full shadow-sm w-72 border border-slate-100">
            <Search className="w-4 h-4 ml-1" />
            <input type="text" placeholder={t("admin.searchPlaceholder")} className="bg-transparent border-none outline-none text-sm font-medium text-slate-700 w-full placeholder:text-slate-400" />
          </div>
          <div className="flex items-center gap-6">
            <LanguageSwitcher />
            <div className="flex items-center gap-4 text-slate-600 border-l border-slate-200 pl-6 cursor-pointer hover:opacity-80 transition-opacity">
              <button className="relative text-slate-500 hover:text-black transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#ff6844] rounded-full border-2 border-white"></span>
              </button>
              <div className="flex items-center gap-2 ml-2">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-bold text-slate-800 leading-none">
                    {session?.user?.email?.split('@')[0] || "Admin"}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                    {t("admin.panel")}
                  </span>
                </div>
                <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden ml-1 border-2 border-white shadow-sm">
                  <img 
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${session?.user?.email || 'Admin'}`} 
                    alt="Avatar" 
                    className="w-full h-full object-cover" 
                  />
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          </div>
        </header>

        {/* Body */}
        <main className="flex-1 overflow-y-auto px-8 pb-8">
          <div className="flex items-center justify-between mb-8 mt-2">
            <div className="flex items-center gap-3 text-slate-900">
              <Grip className="w-6 h-6 text-slate-800" />
              <h2 className="text-[26px] font-extrabold tracking-tight font-heading capitalize">{tab}</h2>
            </div>
            {tab === "dashboard" && (
              <div className="flex items-center gap-4 text-sm font-semibold text-slate-500">
                <div className="flex items-center gap-2 hover:bg-black/5 px-3 py-1.5 rounded-xl transition-colors cursor-default">
                  <Clock className="w-4 h-4" /> {new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                </div>
                <div className="flex items-center gap-2 hover:bg-black/5 px-3 py-1.5 rounded-xl transition-colors text-slate-800 cursor-default">
                  <BarChart3 className="w-4 h-4 text-slate-400" /> {stats.total}
                </div>
              </div>
            )}
          </div>

          {tab === "dashboard" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* Bento Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {statCardsData.map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className={cn(
                      "relative p-6 rounded-3xl flex flex-col items-center justify-center min-h-[170px] text-center transition-transform hover:-translate-y-1 shadow-sm",
                      s.bg
                    )}
                  >
                    {s.badge && (
                      <div className={cn("absolute top-5 inline-flex items-center text-[10px] font-extrabold px-3 py-1 rounded-full", s.badgeColors)}>
                        {s.badge}
                      </div>
                    )}
                    {!s.isEmpty && (
                      <>
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mt-3 shadow-sm border border-black/5">
                          <s.icon className="w-4 h-4 text-slate-700" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-2 font-heading">{s.value}</h3>
                        <p className="text-[11px] font-bold text-slate-500 mt-1 first-letter:uppercase tracking-widest whitespace-nowrap overflow-hidden text-ellipsis max-w-[95%]">
                          {s.label}
                        </p>
                      </>
                    )}
                    {s.isEmpty && (
                      <div className="w-10 h-10 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-400 transition-colors cursor-pointer">
                        <Plus className="w-5 h-5" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Bottom Section */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-1 space-y-4">
                  <div className="flex items-center gap-6 px-2">
                    <button className="font-extrabold text-slate-900 border-b-2 border-slate-900 pb-1 text-[17px]">{t("admin.stats")}</button>
                    <button className="font-bold text-slate-400 hover:text-slate-600 pb-1 text-[17px] flex items-center gap-2 transition-colors">
                      <Grip className="w-4 h-4" /> {t("admin.activity")}
                    </button>
                  </div>
                  <div className="bg-[#0f0f0f] text-white rounded-[2rem] p-8 h-[260px] flex flex-col justify-center shadow-md">
                    <div className="grid grid-cols-2 gap-y-8 gap-x-6">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-[#4ade80] text-xl font-black tracking-tight font-heading">
                          <Users className="w-5 h-5" /> {clients.length}
                        </div>
                        <p className="text-slate-400 text-xs font-semibold">{t("admin.clients")}</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-[#f87171] text-xl font-black tracking-tight font-heading">
                          <Clock className="w-5 h-5" /> {stats.pending}
                        </div>
                        <p className="text-slate-400 text-xs font-semibold">{t("admin.pendingApplications")}</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-[#4ade80] text-xl font-black tracking-tight font-heading">
                          <CheckCircle className="w-5 h-5" /> {stats.completed}
                        </div>
                        <p className="text-slate-400 text-xs font-semibold">{t("admin.completedApplications")}</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-slate-300 text-xl font-black tracking-tight font-heading">
                          <ArrowUpRight className="w-5 h-5 rotate-45 text-slate-600" /> {stats.today}
                        </div>
                        <p className="text-slate-400 text-xs font-semibold">{t("admin.todayApplications")}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="xl:col-span-2 space-y-4">
                  <div className="flex flex-wrap items-center justify-between px-2 gap-4">
                    <h3 className="font-bold text-[17px] text-slate-800">{t("admin.clients")}</h3>
                    <div className="flex flex-wrap gap-5 text-xs font-bold text-slate-500">
                      <button className="flex items-center gap-1.5 hover:text-slate-800 transition-colors"><Users className="w-4 h-4" /> {clients.length}</button>
                      <button className="flex items-center gap-1.5 text-slate-800 transition-colors"><BarChart3 className="w-4 h-4" /> {t("admin.dashboard")}</button>
                    </div>
                  </div>
                  <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex-1 h-[260px] overflow-auto flex flex-col">
                    <div className="flex text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-3 px-4">
                      <div className="w-[30%]">{t("form.name")}</div>
                      <div className="w-[25%]">{t("form.phone")}</div>
                      <div className="w-[20%]">{t("admin.status")}</div>
                      <div className="w-[25%]">{t("admin.date")}</div>
                      <div className="w-10"></div>
                    </div>
                    <div className="space-y-2">
                       {clients.length === 0 ? (
                          <div className="text-center py-8 text-sm font-medium text-slate-500">{t("common.noData")}</div>
                       ) : clients.slice(0, 3).map((c, i) => (
                        <div key={c.id} className="flex items-center px-4 py-3 bg-[#f5f4f2] hover:bg-[#eae8e6] transition-colors rounded-2xl text-[13px] font-bold text-slate-800">
                          <div className="w-[30%] truncate pr-2" title={c.name}>{c.name}</div>
                          <div className="w-[25%] text-slate-600 font-medium">{c.phone}</div>
                          <div className="w-[20%] text-slate-600 font-medium">
                             <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] uppercase">
                               {t("admin.clients")}
                             </div>
                          </div>
                          <div className="w-[25%] text-slate-600 font-medium italic">{formatNullableDate(c.created_at)}</div>
                          <div className="w-10 flex justify-end">
                             <div className={cn("inline-flex w-9 h-[18px] rounded-full p-0.5", i % 2 === 0 ? "bg-black text-white" : "bg-slate-300")}>
                               <div className={cn("w-3.5 h-3.5 bg-white rounded-full transition-transform shadow-sm", i % 2 === 0 ? "translate-x-4" : "")}></div>
                             </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Other Tabs Rendering... */}
          {tab !== "dashboard" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
               <div className="px-8 pt-7 pb-4 border-b border-slate-50">
                 <h3 className="text-xl font-bold text-slate-900 font-heading">
                    {t(`services.${tab}`) || tab}
                 </h3>
                 <p className="text-slate-400 text-sm mt-0.5">{data.length > 0 ? `${data.length} ${t('admin.totalApplications')}` : ''}</p>
               </div>
               
               <Table>
                 <TableHeader>
                   <TableRow className="border-b border-slate-50 hover:bg-transparent">
                     {tab !== 'clients' && <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest w-12 text-center pl-8">#</TableHead>}
                     <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">{t("form.name")}</TableHead>
                     <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">{t("form.phone")}</TableHead>
                     <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">{t("admin.date")}</TableHead>
                     {tab !== 'clients' && <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest text-center">{t("admin.status")}</TableHead>}
                     {tab !== 'clients' && <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest text-right pr-8">{t("admin.actions")}</TableHead>}
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {tab === 'clients' ? clients.map((c) => (
                       <TableRow key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                       <TableCell className="font-bold text-slate-900 py-4 pl-8">{c.name}</TableCell>
                       <TableCell className="text-slate-500 font-medium">{c.phone}</TableCell>
                       <TableCell className="text-slate-400 font-medium">{formatNullableDate(c.created_at)}</TableCell>
                     </TableRow>
                   )) : data.length === 0 ? (
                     <TableRow>
                       <TableCell colSpan={6} className="text-center text-slate-400 py-12">{t('common.noData')}</TableCell>
                     </TableRow>
                   ) : data.map((item, index) => (
                     <TableRow key={item.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/30 transition-colors cursor-pointer" onClick={() => setSelectedApp(item)}>
                       <TableCell className="text-slate-400 font-medium text-center pl-8">{index + 1}</TableCell>
                       <TableCell className="font-semibold text-slate-900 py-4">{getClientName(item)}</TableCell>
                       <TableCell className="text-slate-500 font-medium">{getClientPhone(item)}</TableCell>
                       <TableCell className="text-slate-400 font-medium">{formatNullableDate(item.created_at)}</TableCell>
                       <TableCell className="text-center">
                         <span className={cn("inline-flex items-center px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full border", (() => { const m: Record<string, string> = { pending: 'bg-amber-50 text-amber-600 border-amber-200', processing: 'bg-blue-50 text-blue-600 border-blue-200', completed: 'bg-emerald-50 text-emerald-600 border-emerald-200', rejected: 'bg-red-50 text-red-500 border-red-200' }; return m[item.status || ""] || 'bg-slate-50 text-slate-500 border-slate-200'; })())}>
                           {item.status ? (t(`admin.${item.status}`) || item.status) : "—"}
                         </span>
                       </TableCell>
                       <TableCell className="text-right pr-8">
                         <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedApp(item); }} className="text-slate-400 hover:text-slate-900 gap-1.5">
                           <Eye className="w-3.5 h-3.5"/> {t("admin.detail")}
                         </Button>
                       </TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
            </motion.div>
          )}

          {/* Application Details Dialog */}
          <Dialog open={!!selectedApp} onOpenChange={(open) => !open && setSelectedApp(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 bg-white rounded-xl border border-slate-200 shadow-2xl outline-none">
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-100 shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 leading-none">{t(`services.${tab}`) || t("admin.detail")}</h2>
                    <p className="text-sm text-slate-500 mt-1 font-medium">
                      {getClientName(selectedApp)} · {getClientPhone(selectedApp)}
                    </p>
                    {selectedPassportIdentity.length > 0 && (
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {selectedPassportIdentity.map((field) => (
                          <div
                            key={field.key}
                            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 min-w-0"
                          >
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                              {field.label}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-900 break-words">
                              {field.value}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className={cn("inline-flex items-center px-3 py-1.5 text-[11px] uppercase font-bold tracking-wider rounded-full border", (() => { const m: Record<string, string> = { pending: 'bg-amber-50 text-amber-600 border-amber-200', processing: 'bg-blue-50 text-blue-600 border-blue-200', completed: 'bg-emerald-50 text-emerald-600 border-emerald-200', rejected: 'bg-red-50 text-red-500 border-red-200' }; return selectedApp ? (m[selectedApp.status || ""] || 'bg-slate-50 text-slate-500 border-slate-200') : ''; })())}>
                    {selectedApp?.status ? (t(`admin.${selectedApp.status}`) || selectedApp.status) : ''}
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto">
                <div className="divide-y divide-slate-50">
                  {selectedApp && isServiceTab(tab) && SERVICE_FIELDS[tab].map((field) => {
                    const v = selectedApp[field.key as keyof AdminApplicationRecord];
                    if (v === null || v === undefined || v === '') return null;

                    const label = getLabelForKey(field.key, field.labelKey);

                    if (field.isJson) {
                      return renderStructuredValue(v, field.key, field.key === 'data' ? undefined : label);
                    }

                    if (field.isFile || field.isDocuPipeOriginal) {
                      return renderStructuredValue(v, field.key, label);
                    }

                    return renderDetailRow(
                      field.key,
                      label,
                      <span className="text-sm font-semibold text-slate-800 break-words">
                        {formatValue(field.key, v, field.isDate)}
                      </span>,
                    );
                  })}
                </div>

                {/* Change Status */}
                <div className="px-6 py-5 border-t border-slate-100 bg-slate-50/50">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{t('admin.changeStatus')}</p>
                  <div className="flex gap-2 flex-wrap">
                    {['pending', 'processing', 'completed', 'rejected'].map(st => {
                      const isActive = selectedApp?.status === st;
                      const colors: Record<string, string> = { pending: 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500', processing: 'bg-blue-500 hover:bg-blue-600 text-white border-blue-500', completed: 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500', rejected: 'bg-red-500 hover:bg-red-600 text-white border-red-500' };
                      return (
                        <button
                          key={st}
                          onClick={() => { if (selectedApp) { updateStatus(selectedApp.id, st); setSelectedApp({...selectedApp, status: st}); } }}
                          className={cn("px-4 py-2 text-xs font-bold rounded-md border transition-all", isActive ? colors[st] : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50')}
                        >
                          {t(`admin.${st}`)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}
