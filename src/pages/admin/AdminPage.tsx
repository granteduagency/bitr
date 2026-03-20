import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getDocuPipeOriginalUrl,
  getPassportFatherName,
  getPassportGivenName,
  getPassportSurname,
  toPassportExtractionData,
  type PassportExtractionData,
} from "@/lib/docupipe";
import {
  ensureAdminPushSubscription,
  removeAdminPushSubscription,
} from "@/lib/admin-push";
import {
  DEFAULT_CONTACT_SETTINGS,
  fetchContactSettings,
  type ContactSettingsRow,
} from "@/lib/contact-settings";
import { invokeAdminFunction } from "@/lib/admin-functions";
import type { Tables } from "@/integrations/supabase/types";
import { supabase, uploadFile } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
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
  Home,
  ShieldCheck,
  Plane,
  Briefcase,
  Languages,
  Gavel,
  GraduationCap,
  Settings,
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

type DetailSectionConfig = {
  key: string;
  titleKey: string;
  fields: string[];
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

const SERVICE_DETAIL_SECTIONS: Record<ServiceTab, DetailSectionConfig[]> = {
  ikamet: [
    { key: "overview", titleKey: "admin.sectionOverview", fields: ["category", "type", "created_at", "status"] },
    { key: "family", titleKey: "admin.sectionFamily", fields: ["father_name", "mother_name"] },
    { key: "contact", titleKey: "admin.sectionContact", fields: ["phone", "email", "address", "has_insurance"] },
    { key: "appointment", titleKey: "admin.sectionAppointment", fields: ["appointment_url", "appointment_result"] },
    { key: "passport", titleKey: "admin.sectionPassport", fields: ["passport_url", "photo_url", "student_cert_url", "passport_extraction"] },
    { key: "supporter", titleKey: "admin.sectionSupporter", fields: ["supporter_type", "supporter_passport_extraction", "supporter_id_front_url", "supporter_id_back_url", "supporter_passport_url", "supporter_student_cert_url", "notes"] },
  ],
  visa: [
    { key: "overview", titleKey: "admin.sectionOverview", fields: ["type", "phone", "created_at", "status"] },
    { key: "travel", titleKey: "admin.sectionTravel", fields: ["from_country", "to_country", "travel_date"] },
  ],
  sigorta: [
    { key: "overview", titleKey: "admin.sectionOverview", fields: ["type", "created_at", "status"] },
    { key: "details", titleKey: "admin.sectionDetails", fields: ["data"] },
  ],
  tercume: [
    { key: "overview", titleKey: "admin.sectionOverview", fields: ["from_language", "to_language", "status", "created_at"] },
    { key: "documents", titleKey: "admin.sectionDocuments", fields: ["documents_url", "passport_extraction"] },
  ],
  hukuk: [
    { key: "case", titleKey: "admin.sectionCase", fields: ["full_name", "phone", "problem", "created_at", "status"] },
  ],
  calisma: [
    { key: "overview", titleKey: "admin.sectionOverview", fields: ["type", "created_at", "status", "notes"] },
    { key: "documents", titleKey: "admin.sectionDocuments", fields: ["documents_url"] },
  ],
  universite: [
    { key: "overview", titleKey: "admin.sectionOverview", fields: ["external_university_name", "phone", "created_at", "status"] },
    { key: "study", titleKey: "admin.sectionStudy", fields: ["degree", "faculty", "program", "language"] },
    { key: "documents", titleKey: "admin.sectionDocuments", fields: ["passport_url", "photo_url", "passport_extraction", "diploma_url", "diploma_supplement_url"] },
  ],
};

type ServiceTab = keyof typeof tableMap;
type AdminTab = "dashboard" | "clients" | "prospects" | "settings" | ServiceTab;
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
type LeadTab = "clients" | "prospects";
type LeadRecord = Tables<"client_leads">;
type ActivityLogRecord = Tables<"client_activity_logs">;
type DashboardActivityPreview = ActivityLogRecord & {
  client_leads?: Pick<LeadRecord, "name" | "phone"> | null;
};
type DashboardPanel = "stats" | "activity";
type TabItem = {
  key: AdminTab;
  label: string;
  icon: LucideIcon;
};
type AdminNotificationItem = {
  id: string;
  serviceTab: ServiceTab;
  applicationId: string;
  title: string;
  description: string;
  createdAt: string;
  read: boolean;
};
type LeadActivitySummary = {
  summary: string;
  source?: "ai" | "fallback";
};
type DashboardInsights = {
  overview: string;
  issues: string[];
  recommendations: string[];
  source?: "ai" | "fallback";
};

const isServiceTab = (value: AdminTab): value is ServiceTab => value in tableMap;
const formatNullableDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString() : "—";
const applicationTableEntries = Object.entries(tableMap) as Array<[ServiceTab, ApplicationTableName]>;
const isServiceTabKey = (value: string): value is ServiceTab =>
  applicationTableEntries.some(([serviceTab]) => serviceTab === value);
const buildAdminNotificationUrl = (serviceTab: ServiceTab, applicationId: string) =>
  `/admin?notification=1&tab=${encodeURIComponent(serviceTab)}&id=${encodeURIComponent(applicationId)}`;
const formatNotificationDate = (value: string) =>
  new Date(value).toLocaleString([], {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatLeadActivityDate = (value: string) =>
  new Date(value).toLocaleString([], {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const fetchAdminApplicationById = async (serviceTab: ServiceTab, id: string) => {
  const { data, error } = await supabase
    .from(tableMap[serviceTab])
    .select("*, clients(name, phone)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Fetch application error:", error);
    return null;
  }

  return data as AdminApplicationRecord | null;
};

export default function AdminPage() {
  const { t, i18n } = useTranslation();
  const [session, setSession] = useState<Session | null>(null);
  const [selectedApp, setSelectedApp] = useState<AdminApplicationRecord | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [data, setData] = useState<AdminApplicationRecord[]>([]);
  const [serviceCache, setServiceCache] = useState<Partial<Record<ServiceTab, AdminApplicationRecord[]>>>({});
  const [clients, setClients] = useState<LeadRecord[]>([]);
  const [prospects, setProspects] = useState<LeadRecord[]>([]);
  const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(null);
  const [leadActivities, setLeadActivities] = useState<ActivityLogRecord[]>([]);
  const [leadActivitiesLoading, setLeadActivitiesLoading] = useState(false);
  const [selectedLeadApplication, setSelectedLeadApplication] = useState<AdminApplicationRecord | null>(null);
  const [selectedLeadApplicationTab, setSelectedLeadApplicationTab] = useState<ServiceTab | null>(null);
  const [selectedLeadApplicationLoading, setSelectedLeadApplicationLoading] = useState(false);
  const [leadSummary, setLeadSummary] = useState<LeadActivitySummary | null>(null);
  const [leadSummaryLoading, setLeadSummaryLoading] = useState(false);
  const [openingDocumentId, setOpeningDocumentId] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<{ url: string; label: string } | null>(null);
  const [imagePreviewLoading, setImagePreviewLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [prospectsLoading, setProspectsLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [adminBootstrapped, setAdminBootstrapped] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    fullName: "",
    avatarUrl: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [contactSettingsForm, setContactSettingsForm] =
    useState<ContactSettingsRow>(DEFAULT_CONTACT_SETTINGS);
  const [contactSettingsSaving, setContactSettingsSaving] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    today: 0,
    allClients: 0,
    prospects: 0,
    applicants: 0,
  });
  const [dashboardPanel, setDashboardPanel] = useState<DashboardPanel>("stats");
  const [dashboardActivity, setDashboardActivity] = useState<DashboardActivityPreview[]>([]);
  const [dashboardInsights, setDashboardInsights] = useState<DashboardInsights | null>(null);
  const [dashboardInsightsLoading, setDashboardInsightsLoading] = useState(false);
  const [dashboardClientsPage, setDashboardClientsPage] = useState(1);
  const [clientsPage, setClientsPage] = useState(1);
  const [prospectsPage, setProspectsPage] = useState(1);
  const sessionUserId = session?.user.id ?? null;

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

  useEffect(() => {
    if (!session) {
      setNotifications([]);
      setSettingsForm({
        fullName: "",
        avatarUrl: "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setContactSettingsForm(DEFAULT_CONTACT_SETTINGS);
      return;
    }

    setSettingsForm({
      fullName:
        (typeof session.user.user_metadata?.full_name === "string"
          ? session.user.user_metadata.full_name
          : "") || session.user.email?.split("@")[0] || "",
      avatarUrl:
        typeof session.user.user_metadata?.avatar_url === "string"
          ? session.user.user_metadata.avatar_url
          : "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

    fetchContactSettings()
      .then((data) => {
        setContactSettingsForm(data);
      })
      .catch((error) => {
        console.error("Contact settings load error:", error);
      });
  }, [session]);

  useEffect(() => {
    if (!session) {
      return;
    }

    ensureAdminPushSubscription({ requestPermission: false }).catch((error) => {
      console.error("Push subscription error:", error);
    });
  }, [session]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setSession(data.session ?? null);

    await ensureAdminPushSubscription({ requestPermission: true }).catch((pushError) => {
      console.error("Push subscription error:", pushError);
    });
  };

  const logout = async () => {
    await removeAdminPushSubscription().catch((error) => {
      console.error("Push unsubscribe error:", error);
    });
    await supabase.auth.signOut();
    setSession(null);
    setNotifications([]);
  };

  const openNotificationItem = useCallback(async (
    serviceTab: ServiceTab,
    applicationId: string,
    notificationId?: string,
  ) => {
    const application = await fetchAdminApplicationById(serviceTab, applicationId);
    if (!application) {
      toast({
        title: t("common.error"),
        description: t("admin.notificationLoadError"),
        variant: "destructive",
      });
      return;
    }

    if (notificationId) {
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId ? { ...notification, read: true } : notification,
        ),
      );
    }

    setTab(serviceTab);
    setSelectedApp(application);
    window.history.replaceState({}, document.title, "/admin");
  }, [t]);

  const openLeadDetails = async (lead: LeadRecord) => {
    setSelectedLead(lead);
    setLeadActivitiesLoading(true);
    setSelectedLeadApplication(null);
    setSelectedLeadApplicationTab(null);
    setSelectedLeadApplicationLoading(true);
    setLeadSummary(null);
    setLeadSummaryLoading(true);

    try {
      const { data: logs, error } = await supabase
        .from("client_activity_logs")
        .select("*")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const nextActivities = logs || [];
      setLeadActivities(nextActivities);
      const summaryActivities = buildLeadSummaryActivities(nextActivities);

      const linkedActivity = nextActivities.find(
        (activity) =>
          typeof activity.reference_id === "string" &&
          Boolean(activity.reference_id) &&
          typeof activity.service_key === "string" &&
          isServiceTabKey(activity.service_key),
      );

      if (linkedActivity?.reference_id && linkedActivity.service_key && isServiceTabKey(linkedActivity.service_key)) {
        const serviceTab = linkedActivity.service_key;
        const application = await fetchAdminApplicationById(serviceTab, linkedActivity.reference_id);
        setSelectedLeadApplication(application);
        setSelectedLeadApplicationTab(application ? serviceTab : null);
        setSelectedLeadApplicationLoading(false);

        try {
          const response = await invokeAdminFunction<LeadActivitySummary>(
            "admin-lead-summary",
            {
              action: "summarize",
              locale: i18n.language,
              lead: {
                name: lead.name,
                phone: lead.phone,
                applicationCount: lead.application_count,
                lastService: lead.last_service_key || "",
                lastActivityAt: lead.last_activity_at,
              },
              activities: summaryActivities,
              applicationContext: buildLeadApplicationContext(
                application,
                application ? serviceTab : null,
              ),
            },
          );

          setLeadSummary({
            summary: response.summary,
            source: response.source,
          });
        } catch (error) {
          console.error("Lead summary error:", error);
          const fallbackSummary = buildLeadActivitySummaryFallback(nextActivities);
          setLeadSummary(
            fallbackSummary
              ? {
                summary: fallbackSummary,
                source: "fallback",
              }
              : null,
          );
        }
      } else {
        setSelectedLeadApplicationLoading(false);
        const fallbackSummary = buildLeadActivitySummaryFallback(nextActivities);
        setLeadSummary(
          fallbackSummary
            ? {
              summary: fallbackSummary,
              source: "fallback",
            }
            : null,
        );
      }
    } catch (error) {
      console.error("Fetch lead activity error:", error);
      setLeadActivities([]);
      setSelectedLeadApplication(null);
      setSelectedLeadApplicationTab(null);
      setSelectedLeadApplicationLoading(false);
      setLeadSummary(null);
      toast({
        title: t("common.error"),
        description: t("admin.clientActivityLoadError"),
        variant: "destructive",
      });
    } finally {
      setLeadActivitiesLoading(false);
      setLeadSummaryLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setAvatarUploading(true);
      const uploadedUrl = await uploadFile(file, "documents");
      if (!uploadedUrl) {
        throw new Error(t("common.avatarUploadFailed"));
      }

      setSettingsForm((prev) => ({ ...prev, avatarUrl: uploadedUrl }));
      toast({ title: t("common.success") });
    } catch (error) {
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setAvatarUploading(false);
      event.target.value = "";
    }
  };

  const saveSettings = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setSettingsSaving(true);
      const isChangingPassword =
        Boolean(settingsForm.currentPassword) ||
        Boolean(settingsForm.newPassword) ||
        Boolean(settingsForm.confirmPassword);

      if (isChangingPassword) {
        if (
          !settingsForm.currentPassword ||
          !settingsForm.newPassword ||
          !settingsForm.confirmPassword
        ) {
          throw new Error(t("admin.passwordFieldsRequired"));
        }

        if (settingsForm.newPassword !== settingsForm.confirmPassword) {
          throw new Error(t("admin.passwordMismatch"));
        }

        if (!session?.user?.email) {
          throw new Error(t("common.error"));
        }

        const { error: reauthError } = await supabase.auth.signInWithPassword({
          email: session.user.email,
          password: settingsForm.currentPassword,
        });

        if (reauthError) {
          throw new Error(t("admin.currentPasswordInvalid"));
        }
      }

      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: settingsForm.fullName.trim(),
          avatar_url: settingsForm.avatarUrl.trim(),
        },
        ...(isChangingPassword ? { password: settingsForm.newPassword } : {}),
      });

      if (error) {
        throw error;
      }

      const {
        data: { session: refreshedSession },
      } = await supabase.auth.getSession();
      setSession(refreshedSession);
      setSettingsForm((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
      toast({ title: t("common.success") });
    } catch (error) {
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSettingsSaving(false);
    }
  };

  const saveContactSettings = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setContactSettingsSaving(true);

      const payload = {
        id: 1,
        subtitle_uz: contactSettingsForm.subtitle_uz.trim(),
        subtitle_tr: contactSettingsForm.subtitle_tr.trim(),
        address_uz: contactSettingsForm.address_uz.trim(),
        address_tr: contactSettingsForm.address_tr.trim(),
        phone: contactSettingsForm.phone.trim(),
        email: contactSettingsForm.email.trim(),
        working_hours_uz: contactSettingsForm.working_hours_uz.trim(),
        working_hours_tr: contactSettingsForm.working_hours_tr.trim(),
        whatsapp_url: contactSettingsForm.whatsapp_url.trim(),
        telegram_url: contactSettingsForm.telegram_url.trim(),
        instagram_url: contactSettingsForm.instagram_url.trim(),
        facebook_url: contactSettingsForm.facebook_url.trim(),
      };

      const { error } = await supabase
        .from("contact_settings")
        .upsert(payload, { onConflict: "id" });

      if (error) {
        throw error;
      }

      setContactSettingsForm((prev) => ({
        ...prev,
        ...payload,
      }));
      toast({ title: t("common.success") });
    } catch (error) {
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setContactSettingsSaving(false);
    }
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
      { key: 'passport_extraction', labelKey: 'admin.passportExtraction', isJson: true },
      { key: 'photo_url', labelKey: 'form.photo', isFile: true },
      { key: 'student_cert_url', labelKey: 'form.studentCert', isFile: true },
      { key: 'supporter_id_front_url', labelKey: 'form.supporterIdFront', isFile: true },
      { key: 'supporter_id_back_url', labelKey: 'form.supporterIdBack', isFile: true },
      { key: 'supporter_passport_url', labelKey: 'form.supporterPassport', isFile: true },
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
      { key: 'from_language', labelKey: 'tercume.fromLanguage' },
      { key: 'to_language', labelKey: 'tercume.toLanguage' },
      { key: 'documents_url', labelKey: 'tercume.uploadDocuments', isFile: true },
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
      { key: 'passport_extraction', labelKey: 'admin.passportExtraction', isJson: true },
      { key: 'diploma_url', labelKey: 'universite.diplomaUpload', isFile: true },
      { key: 'diploma_supplement_url', labelKey: 'universite.diplomaSupplementUpload', isFile: true },
      { key: 'photo_url', labelKey: 'universite.photoUpload', isFile: true },
      { key: 'status', labelKey: 'admin.status' },
      { key: 'created_at', labelKey: 'admin.createdAt', isDate: true },
    ],
  };

  const isJsonObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);
  const STRUCTURED_FIELD_ORDER: Partial<Record<string, string[]>> = {
    passport_extraction: [
      "sex",
      "place_of_birth",
      "nationality",
      "date_of_birth",
      "date_of_issue",
      "date_of_expiry",
      "passport_number",
      "personal_number",
    ],
    supporter_passport_extraction: [
      "sex",
      "place_of_birth",
      "nationality",
      "date_of_birth",
      "date_of_issue",
      "date_of_expiry",
      "passport_number",
      "personal_number",
    ],
  };
  const shouldHideStructuredKey = (key: string, rootKey?: string) => {
    if (key.toLowerCase() === "mrz") {
      return true;
    }

    if (
      (rootKey === "passport_extraction" || rootKey === "supporter_passport_extraction")
      && ["surname", "full_name", "given_names", "issuing_country"].includes(key)
    ) {
      return true;
    }

    return false;
  };
  const readText = (value: unknown) =>
    typeof value === "string" && value.trim() ? value.trim() : "";
  const getApplicationPayload = (item: AdminApplicationRecord | null | undefined) => {
    if (!item) return null;
    const record = item as unknown as Record<string, unknown>;
    return isJsonObject(record.data) ? record.data : null;
  };
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
  const getClientName = (item: AdminApplicationRecord | null | undefined) => {
    const relatedName = item?.clients?.name || item?.client?.name;
    if (relatedName?.trim()) {
      return relatedName;
    }

    const extraction = getPrimaryPassportExtraction(item);
    const passportName = [getPassportGivenName(extraction), getPassportSurname(extraction)]
      .filter(Boolean)
      .join(" ")
      .trim();
    if (passportName) {
      return passportName;
    }

    const record = item as unknown as Record<string, unknown> | null;
    const dataPayload = getApplicationPayload(item);
    const payloadName = [readText(dataPayload?.name), readText(dataPayload?.surname)]
      .filter(Boolean)
      .join(" ")
      .trim();

    return (
      readText(record?.full_name) ||
      readText(dataPayload?.full_name) ||
      payloadName ||
      "—"
    );
  };
  const getClientPhone = (item: AdminApplicationRecord | null | undefined) => {
    const relatedPhone = item?.clients?.phone || item?.client?.phone;
    if (relatedPhone?.trim()) {
      return relatedPhone;
    }

    const record = item as unknown as Record<string, unknown> | null;
    const dataPayload = getApplicationPayload(item);

    return readText(record?.phone) || readText(dataPayload?.phone) || "—";
  };
  const getInsuranceSummaryValue = (item: AdminApplicationRecord | null | undefined) => {
    const record = item as unknown as Record<string, unknown> | null;
    const dataPayload = getApplicationPayload(item);
    const directValue = record?.has_insurance;
    const payloadValue = dataPayload?.has_insurance;
    const value = payloadValue ?? directValue;

    if (typeof value === "boolean") {
      return value ? t("form.insuranceYes") : t("form.insuranceNo");
    }

    if (typeof value === "string" && value.trim()) {
      const normalized = value.trim().toLowerCase();
      if (["true", "yes", "ha", "var"].includes(normalized)) {
        return t("form.insuranceYes");
      }
      if (["false", "no", "yoq", "yok", "yoktur"].includes(normalized)) {
        return t("form.insuranceNo");
      }
      return value.trim();
    }

    return "—";
  };
  const buildLeadActivitySummaryFallback = (activities: ActivityLogRecord[]) => {
    const summaryActivities = buildLeadSummaryActivities(activities).slice(0, 3);
    if (summaryActivities.length === 0) {
      return "";
    }

    const isUz = i18n.language.startsWith("uz");
    const lines = summaryActivities
      .map((activity) => lowerFirstLetter(activity.title))
      .filter(Boolean);

    if (lines.length === 0) {
      return "";
    }

    if (isUz) {
      return `Mijozning so'nggi faolligiga ko'ra, u ${lines.join(". ")}.`;
    }

    return `Müşterinin son hareketlerine göre ${lines.join(". ")}.`;
  };
  const buildLeadApplicationContext = (
    item: AdminApplicationRecord | null,
    serviceTab: ServiceTab | null,
  ) => {
    if (!item || !serviceTab) {
      return null;
    }

    const record = item as unknown as Record<string, unknown>;
    const payload = getApplicationPayload(item);

    return {
      service: getServiceLabel(serviceTab),
      category: readText(record.category),
      type: formatValue("type", record.type),
      status: formatValue("status", record.status),
      phone: getClientPhone(item),
      email: readText(record.email) || readText(payload?.email),
      insurance: getInsuranceSummaryValue(item),
      university: readText(record.external_university_name),
      degree: readText(record.degree),
      faculty: readText(record.faculty),
      program: readText(record.program),
      language: readText(record.language),
      supporterType: readText(record.supporter_type),
      fatherName: readText(record.father_name),
      motherName: readText(record.mother_name),
    };
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
  const getLeadServiceLabel = (lead: LeadRecord) =>
    lead.last_service_key && isServiceTabKey(lead.last_service_key)
      ? getServiceLabel(lead.last_service_key)
      : t("admin.dashboardActivity");
  const getServiceBadgeClasses = (service?: string | null) => {
    switch (service) {
      case "ikamet":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "sigorta":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "visa":
        return "bg-violet-50 text-violet-700 border-violet-200";
      case "calisma":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "tercume":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "hukuk":
        return "bg-red-50 text-red-700 border-red-200";
      case "universite":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };
  const paginateRows = <T,>(rows: T[], page: number, pageSize: number) =>
    rows.slice((page - 1) * pageSize, page * pageSize);
  const lowerFirstLetter = (value: string) =>
    value ? value.charAt(0).toLowerCase() + value.slice(1) : value;
  const getIkametCategoryLabel = useCallback((value: string) => {
    const normalized = value.replace(/_/g, "-");
    const map: Record<string, string> = {
      "ilk-kez": t("ikamet.ilkKez"),
      uzatma: t("ikamet.uzatma"),
      gecis: t("ikamet.gecis"),
      sonuc: t("ikamet.sonuc"),
    };

    return map[normalized] || "";
  }, [t]);
  const getIkametTypeLabel = useCallback((value: string) => {
    const map: Record<string, string> = {
      ogrenci: t("ikamet.ogrenci"),
      aile: t("ikamet.aile"),
      kisa_donem: t("ikamet.kisaDonem"),
      uzun_donem: t("ikamet.uzunDonem"),
    };

    return map[value] || "";
  }, [t]);
  const getRouteLabel = useCallback((route: string | null | undefined) => {
    const path = readText(route).split("?")[0].replace(/\/+$/, "");
    if (!path) {
      return t("admin.routeUnknown");
    }

    if (path === "/dashboard") {
      return t("admin.dashboard");
    }

    const segments = path.split("/").filter(Boolean);
    if (segments[0] !== "dashboard") {
      return path;
    }

    const section = segments[1] || "";

    if (section === "ikamet") {
      const categoryLabel = getIkametCategoryLabel(segments[2] || "");
      const typeLabel = getIkametTypeLabel(segments[3] || "");

      if (categoryLabel && typeLabel) {
        return `${categoryLabel} · ${typeLabel}`;
      }

      if (categoryLabel) {
        return categoryLabel;
      }

      return t("ikamet.title");
    }

    if (section === "sigorta") {
      const type = segments[2] || "";
      if (type === "saglik") return t("sigorta.saglik");
      if (type === "turizm") return t("sigorta.turizm");
      return t("services.sigorta");
    }

    if (section === "universite") return t("services.universite");
    if (section === "viza") return t("services.viza");
    if (section === "tercume") return t("services.tercume");
    if (section === "hukuk") return t("services.hukuk");
    if (section === "calisma") return t("services.calisma");
    if (section === "iletisim") return t("services.iletisim");

    return path;
  }, [getIkametCategoryLabel, getIkametTypeLabel, t]);
  const getActivitySummaryText = useCallback((activity: ActivityLogRecord) => {
    const isUz = i18n.language.startsWith("uz");
    const details = isJsonObject(activity.details) ? activity.details : null;
    const routeLabel = getRouteLabel(activity.route);
    const universityName = readText(details?.universityName);
    const searchFilters = [
      readText(details?.degree),
      readText(details?.faculty),
      readText(details?.program),
      readText(details?.language),
    ].filter(Boolean).join(" · ");
    const status = readText(details?.status);
    const type = readText(details?.type);

    switch (activity.action) {
      case "route_viewed":
        return isUz
          ? `${routeLabel} bo'limini ko'rib chiqqan`
          : `${routeLabel} bölümünü incelemiş`;
      case "university_search":
        return searchFilters
          ? (isUz
            ? `${searchFilters} bo'yicha universitet qidirgan`
            : `${searchFilters} kriterlerine göre üniversite aramış`)
          : (isUz ? "Universitetlarni ko'rib chiqqan" : "Üniversiteleri incelemiş");
      case "university_selected":
        return universityName
          ? (isUz
            ? `${universityName} universitetini tanlagan`
            : `${universityName} üniversitesini seçmiş`)
          : (isUz ? "Universitet tanlagan" : "Üniversite seçmiş");
      case "appointment_document_parsed":
        return isUz
          ? "Randevu hujjatini yuklab, ma'lumotlarini ajratgan"
          : "Randevu belgesini yükleyip bilgileri ayıklamış";
      case "appointment_check_completed":
        return status
          ? (isUz
            ? `Randevu holatini tekshirgan: ${status}`
            : `Randevu durumunu kontrol etmiş: ${status}`)
          : (isUz ? "Randevu holatini tekshirgan" : "Randevu durumunu kontrol etmiş");
      case "application_submitted":
        return type
          ? (isUz
            ? `${type} bo'yicha ariza yuborgan`
            : `${type} için başvuru göndermiş`)
          : (isUz ? "Ariza yuborgan" : "Başvuru göndermiş");
      default:
        return isUz ? "Platformada faol bo'lgan" : "Platformada aktif olmuş";
    }
  }, [getRouteLabel, i18n.language]);
  const getLeadActionLabel = useCallback((action: string | null | undefined) => {
    switch (action) {
      case "route_viewed":
        return t("admin.activityRouteViewed");
      case "university_search":
        return t("admin.activityUniversitySearch");
      case "university_selected":
        return t("admin.activityUniversitySelected");
      case "appointment_document_parsed":
        return t("admin.activityAppointmentParsed");
      case "appointment_check_completed":
        return t("admin.activityAppointmentChecked");
      case "application_submitted":
        return t("admin.activityApplicationSubmitted");
      default:
        return t("admin.activityVisited");
    }
  }, [t]);
  const getActivityDescription = useCallback((activity: ActivityLogRecord) => {
    const details = isJsonObject(activity.details) ? activity.details : null;
    const route = readText(activity.route);
    const status = readText(details?.status);
    const universityName = readText(details?.universityName);
    const type = readText(details?.type);

    switch (activity.action) {
      case "route_viewed":
        return getRouteLabel(route);
      case "university_search":
        return [readText(details?.degree), readText(details?.faculty), readText(details?.program), readText(details?.language)]
          .filter(Boolean)
          .join(" · ") || t("admin.universitySearchWithoutFilters");
      case "university_selected":
        return universityName || t("admin.universitySelection");
      case "appointment_document_parsed":
        return t("admin.appointmentDocumentReady");
      case "appointment_check_completed":
        return status || t("admin.appointmentCheckFinished");
      case "application_submitted":
        return type || getLeadActionLabel(activity.action);
      default:
        return getLeadActionLabel(activity.action);
    }
  }, [getLeadActionLabel, getRouteLabel, t]);
  const buildLeadSummaryActivities = useCallback((activities: ActivityLogRecord[]) => {
    const isUz = i18n.language.startsWith("uz");
    const hasMeaningfulActivity = activities.some(
      (activity) =>
        activity.action !== "route_viewed" ||
        getRouteLabel(activity.route) !== t("admin.dashboard"),
    );

    const filtered = activities.filter((activity) => {
      if (!hasMeaningfulActivity) {
        return true;
      }

      return !(
        activity.action === "route_viewed" &&
        getRouteLabel(activity.route) === t("admin.dashboard")
      );
    });

    const ordered: Array<{
      at: string;
      title: string;
      description: string;
      route: string | null;
      service: string | null;
      count: number;
    }> = [];
    const seen = new Map<string, number>();

    for (const activity of filtered) {
      const title = getActivitySummaryText(activity);
      const description = getActivityDescription(activity);
      const key = `${title}::${description}`;
      const existingIndex = seen.get(key);

      if (existingIndex !== undefined) {
        ordered[existingIndex].count += 1;
        continue;
      }

      seen.set(key, ordered.length);
      ordered.push({
        at: activity.created_at,
        title,
        description,
        route: activity.route,
        service: activity.service_key,
        count: 1,
      });
    }

    return ordered.slice(0, 6).map((item) => ({
      at: item.at,
      title:
        item.count > 1
          ? `${item.title} (${item.count} ${isUz ? "marta" : "kez"})`
          : item.title,
      description: item.description,
      route: item.route,
      service: item.service,
    }));
  }, [getActivityDescription, getActivitySummaryText, getRouteLabel, i18n.language, t]);
  const getAdminDisplayName = (currentSession: Session | null) =>
    (typeof currentSession?.user?.user_metadata?.full_name === "string"
      ? currentSession.user.user_metadata.full_name.trim()
      : "") || currentSession?.user?.email?.split("@")[0] || "Admin";
  const getAdminAvatarUrl = (currentSession: Session | null) =>
    (typeof currentSession?.user?.user_metadata?.avatar_url === "string"
      ? currentSession.user.user_metadata.avatar_url.trim()
      : "") || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentSession?.user?.email || "Admin"}`;
  const getAdminInitials = (currentSession: Session | null) =>
    getAdminDisplayName(currentSession)
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((chunk) => chunk[0]?.toUpperCase() || "")
      .join("") || "A";
  const getServiceLabel = useCallback((service: ServiceTab) =>
    service === "visa" ? t("services.viza") : t(`services.${service}`), [t]);
  const getTabLabel = (value: AdminTab) => {
    if (value === "dashboard") return t("admin.dashboard");
    if (value === "clients") return t("admin.clients");
    if (value === "prospects") return t("admin.prospects");
    if (value === "settings") return t("admin.settings");
    return getServiceLabel(value);
  };
  const dashboardClientsPageSize = 3;
  const leadTablePageSize = 8;

  const fetchData = async (serviceTab: ServiceTab) => {
    const table = tableMap[serviceTab];
    const { data: rows, error } = await supabase
      .from(table)
      .select("*, clients(name, phone)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch data error:", error);
      return [];
    }

    return (rows || []) as AdminApplicationRecord[];
  };

  const fetchLeadList = async (leadTab: LeadTab) => {
    let query = supabase
      .from("client_leads")
      .select("*")
      .order("last_activity_at", { ascending: false });

    if (leadTab === "prospects") {
      query = query.eq("application_count", 0);
    }

    const { data: rows, error } = await query;

    if (error) {
      console.error("Fetch leads error:", error);
      return [];
    }

    return rows || [];
  };

  const fetchDashboardActivity = async () => {
    const { data: rows, error } = await supabase
      .from("client_activity_logs")
      .select("*, client_leads(name, phone)")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Fetch dashboard activity error:", error);
      return [];
    }

    return (rows || []) as DashboardActivityPreview[];
  };

  const fetchStats = async () => {
    const tables = Object.values(tableMap) as ApplicationTableName[];
    let total = 0,
      pending = 0,
      completed = 0,
      today = 0;
    const todayStr = new Date().toISOString().split("T")[0];
    for (const table of tables) {
      const [{ count: c1 }, { count: c2 }, { count: c3 }, { count: c4 }] =
        await Promise.all([
          supabase.from(table).select("*", { count: "exact", head: true }),
          supabase.from(table).select("*", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from(table).select("*", { count: "exact", head: true }).eq("status", "completed"),
          supabase.from(table).select("*", { count: "exact", head: true }).gte("created_at", todayStr),
        ]);
      total += c1 || 0;
      pending += c2 || 0;
      completed += c3 || 0;
      today += c4 || 0;
    }

    const [{ count: allClients }, { count: prospectsCount }, { count: applicantsCount }] =
      await Promise.all([
        supabase.from("client_leads").select("*", { count: "exact", head: true }),
        supabase.from("client_leads").select("*", { count: "exact", head: true }).eq("application_count", 0),
        supabase.from("client_leads").select("*", { count: "exact", head: true }).gt("application_count", 0),
      ]);

    return {
      total,
      pending,
      completed,
      today,
      allClients: allClients || 0,
      prospects: prospectsCount || 0,
      applicants: applicantsCount || 0,
    };
  };

  const buildDashboardInsightsFallback = useCallback(() => {
    const serviceUsage = (Object.keys(tableMap) as ServiceTab[])
      .map((serviceTab) => ({
        serviceTab,
        label: getServiceLabel(serviceTab),
        total: serviceCache[serviceTab]?.length || 0,
        pending: (serviceCache[serviceTab] || []).filter((item) => item.status === "pending").length,
      }))
      .sort((left, right) => right.total - left.total);

    const topServices = serviceUsage.filter((item) => item.total > 0).slice(0, 3);
    const isUz = i18n.language.startsWith("uz");
    const applicants = stats.applicants;
    const prospectsCount = stats.prospects;
    const backlogHeavy = stats.pending > stats.completed;

    if (isUz) {
      return {
        overview: topServices.length > 0
          ? `Hozir eng ko'p murojaat ${topServices.map((item) => `${item.label} (${item.total})`).join(", ")} bo'limlaridan kelmoqda. Jami ${stats.allClients} mijozdan ${applicants} tasi ariza yuborgan, ${prospectsCount} tasi esa hali qiziqish bosqichida.`
          : `Hozircha AI tahlili uchun yetarli xizmat ma'lumoti to'planmagan, lekin jami ${stats.allClients} mijoz kuzatilmoqda.`,
        issues: [
          prospectsCount > applicants
            ? "Qiziqish bildirgan, lekin arizaga o'tmagan mijozlar soni yuqori. Bu follow-up va tezkor aloqa yetarli emasligini ko'rsatishi mumkin."
            : "Arizaga o'tish ko'rsatkichi yomon emas, lekin hali ham qiziqish bosqichidagi mijozlarni tezroq qayta aloqa bilan yopish kerak.",
          backlogHeavy
            ? "Kutilayotgan arizalar bajarilgan arizalardan ko'p. Bu ichki jarayonlarda sekinlashuv borligini ko'rsatadi."
            : "Jarayonlar barqaror, lekin eng ko'p talab bo'layotgan bo'limlarda yuklama oshib borayotganini kuzatish kerak.",
        ],
        recommendations: [
          topServices[0]
            ? `${topServices[0].label} bo'limiga ko'proq e'tibor bering, chunki aynan shu yo'nalishda talab eng yuqori.`
            : "Mijoz qaysi bo'limlarda ko'proq to'xtab qolayotganini muntazam kuzatib boring.",
          "Ariza yubormagan mijozlarga tezkor aloqa, hujjat ro'yxati va keyingi qadamni aniqroq berish konversiyani oshiradi.",
          "Kutilayotgan arizalar uchun ichki prioritetlash va javob vaqtini qisqartirish foydali bo'ladi.",
        ],
        source: "fallback" as const,
      };
    }

    return {
      overview: topServices.length > 0
        ? `Şu anda en yoğun talep ${topServices.map((item) => `${item.label} (${item.total})`).join(", ")} alanlarında toplanıyor. Toplam ${stats.allClients} müşteriden ${applicants} tanesi başvuru göndermiş, ${prospectsCount} tanesi ise hâlâ ilgi aşamasında.`
        : `Şimdilik yapay analiz için yeterli hizmet verisi yok, ancak toplam ${stats.allClients} müşteri takip ediliyor.`,
      issues: [
        prospectsCount > applicants
          ? "İlgi gösterip başvuruya dönmeyen müşteri sayısı yüksek. Bu durum geri dönüş ve takip sürecinde eksik olabileceğini gösteriyor."
          : "Başvuruya dönüşüm fena değil, ancak ilgi aşamasındaki müşterilere daha hızlı geri dönüş yapılmalı.",
        backlogHeavy
          ? "Bekleyen başvuru sayısı tamamlananlardan fazla. Bu durum iç süreçlerde yavaşlama olduğunu düşündürüyor."
          : "Süreçler dengeli görünüyor, ancak en çok talep alan hizmetlerde yük artışını takip etmek gerekiyor.",
      ],
      recommendations: [
        topServices[0]
          ? `${topServices[0].label} alanına daha fazla dikkat verin; şu anda en yüksek talep bu tarafta.`
          : "Müşterilerin en çok hangi aşamada beklediğini düzenli takip edin.",
        "Başvuruya dönüşmeyen müşterilere net belge listesi ve sonraki adımı hızlıca iletmek dönüşümü artırır.",
        "Bekleyen başvurular için iç önceliklendirme ve daha hızlı geri dönüş planı oluşturmak faydalı olur.",
      ],
      source: "fallback" as const,
    };
  }, [getServiceLabel, i18n.language, serviceCache, stats.allClients, stats.applicants, stats.completed, stats.pending, stats.prospects]);

  useEffect(() => {
    if (!sessionUserId) {
      setServiceCache({});
      setData([]);
      setClients([]);
      setProspects([]);
      setSelectedLead(null);
      setLeadActivities([]);
      setAdminBootstrapped(false);
      return;
    }

    let isActive = true;

    const bootstrapAdminData = async () => {
      setDashboardLoading(true);
      setClientsLoading(true);
      setProspectsLoading(true);
      setDataLoading(false);

      try {
        const [nextStats, nextClients, nextProspects, nextActivity, nextServiceEntries] = await Promise.all([
          fetchStats(),
          fetchLeadList("clients"),
          fetchLeadList("prospects"),
          fetchDashboardActivity(),
          Promise.all(
            applicationTableEntries.map(async ([serviceTab]) => [serviceTab, await fetchData(serviceTab)] as const),
          ),
        ]);

        if (!isActive) {
          return;
        }

        const nextServiceCache = Object.fromEntries(nextServiceEntries) as Partial<
          Record<ServiceTab, AdminApplicationRecord[]>
        >;

        setStats(nextStats);
        setClients(nextClients);
        setProspects(nextProspects);
        setDashboardActivity(nextActivity);
        setServiceCache(nextServiceCache);
        setAdminBootstrapped(true);
      } finally {
        if (isActive) {
          setDashboardLoading(false);
          setClientsLoading(false);
          setProspectsLoading(false);
          setDataLoading(false);
        }
      }
    };

    void bootstrapAdminData();

    return () => {
      isActive = false;
    };
  }, [sessionUserId]);

  useEffect(() => {
    if (!sessionUserId || !adminBootstrapped) {
      return;
    }

    if (isServiceTab(tab)) {
      setData(serviceCache[tab] || []);
    }
  }, [adminBootstrapped, serviceCache, sessionUserId, tab]);

  useEffect(() => {
    if (!sessionUserId || !adminBootstrapped) {
      return;
    }

    let isActive = true;

    const refreshCurrentTab = async () => {
      if (tab === "dashboard") {
        const [nextStats, nextClients, nextProspects, nextActivity] = await Promise.all([
          fetchStats(),
          fetchLeadList("clients"),
          fetchLeadList("prospects"),
          fetchDashboardActivity(),
        ]);

        if (!isActive) {
          return;
        }

        setStats(nextStats);
        setClients(nextClients);
        setProspects(nextProspects);
        setDashboardActivity(nextActivity);
        return;
      }

      if (tab === "clients") {
        const nextClients = await fetchLeadList("clients");
        if (isActive) {
          setClients(nextClients);
        }
        return;
      }

      if (tab === "prospects") {
        const nextProspects = await fetchLeadList("prospects");
        if (isActive) {
          setProspects(nextProspects);
        }
        return;
      }

      if (isServiceTab(tab)) {
        const nextRows = await fetchData(tab);
        if (!isActive) {
          return;
        }

        setServiceCache((prev) => ({ ...prev, [tab]: nextRows }));
        setData(nextRows);
      }
    };

    void refreshCurrentTab();

    return () => {
      isActive = false;
    };
  }, [adminBootstrapped, sessionUserId, tab]);

  useEffect(() => {
    if (!sessionUserId || !adminBootstrapped || dashboardPanel !== "activity") {
      return;
    }

    let isActive = true;

    const loadDashboardInsights = async () => {
      setDashboardInsightsLoading(true);

      try {
        const serviceUsage = (Object.keys(tableMap) as ServiceTab[]).map((serviceTab) => {
          const rows = serviceCache[serviceTab] || [];
          return {
            service: serviceTab,
            label: getServiceLabel(serviceTab),
            total: rows.length,
            pending: rows.filter((item) => item.status === "pending").length,
            completed: rows.filter((item) => item.status === "completed").length,
          };
        });

        const response = await invokeAdminFunction<DashboardInsights>(
          "admin-dashboard-insights",
          {
            action: "summarize",
            locale: i18n.language,
            stats,
            serviceUsage,
            recentActivities: dashboardActivity.slice(0, 10).map((activity) => ({
              clientName: activity.client_leads?.name || "",
              clientPhone: activity.client_leads?.phone || "",
              action: getActivitySummaryText(activity),
              at: activity.created_at,
              service: activity.service_key && isServiceTabKey(activity.service_key)
                ? getServiceLabel(activity.service_key)
                : getRouteLabel(activity.route),
            })),
          },
        );

        if (!isActive) {
          return;
        }

        setDashboardInsights(response);
      } catch (error) {
        console.error("Dashboard insights error:", error);
        if (!isActive) {
          return;
        }

        setDashboardInsights(buildDashboardInsightsFallback());
      } finally {
        if (isActive) {
          setDashboardInsightsLoading(false);
        }
      }
    };

    void loadDashboardInsights();

    return () => {
      isActive = false;
    };
  }, [
    adminBootstrapped,
    buildDashboardInsightsFallback,
    dashboardActivity,
    dashboardPanel,
    getActivitySummaryText,
    getRouteLabel,
    getServiceLabel,
    i18n.language,
    serviceCache,
    sessionUserId,
    stats,
  ]);

  useEffect(() => {
    if (!sessionUserId || typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const serviceTab = params.get("tab");
    const applicationId = params.get("id");
    const isNotificationTarget = params.get("notification") === "1";

    if (!isNotificationTarget || !serviceTab || !applicationId || !isServiceTabKey(serviceTab)) {
      return;
    }

    void openNotificationItem(serviceTab, applicationId);
  }, [openNotificationItem, sessionUserId]);

  useEffect(() => {
    if (!sessionUserId || typeof window === "undefined") return;

    let isActive = true;

    const applicationChannels = applicationTableEntries.map(([serviceTab, table]) =>
      supabase
        .channel(`admin-notifications-${table}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table },
          async (payload) => {
            const applicationId =
              payload.new && typeof payload.new.id === "string" ? payload.new.id : "";
            if (!applicationId || !isActive) {
              return;
            }

            const application = await fetchAdminApplicationById(serviceTab, applicationId);
            if (!application || !isActive) {
              return;
            }

            const relatedName = application.clients?.name?.trim() || application.client?.name?.trim() || "";
            const relatedPhone = application.clients?.phone?.trim() || application.client?.phone?.trim() || "";
            const serviceLabel = serviceTab === "visa" ? t("services.viza") : t(`services.${serviceTab}`);
            const notification: AdminNotificationItem = {
              id: `${serviceTab}:${application.id}:${application.created_at || new Date().toISOString()}`,
              serviceTab,
              applicationId: application.id,
              title: t("admin.newApplicationTitle", { service: serviceLabel }),
              description: relatedName || relatedPhone || t("admin.viewClient"),
              createdAt: application.created_at || new Date().toISOString(),
              read: false,
            };

            setNotifications((prev) => [notification, ...prev].slice(0, 20));
            setServiceCache((prev) => ({
              ...prev,
              [serviceTab]: [
                application,
                ...(prev[serviceTab] || []).filter((item) => item.id !== application.id),
              ],
            }));
            if (tab === serviceTab) {
              setData((prev) => [application, ...prev.filter((item) => item.id !== application.id)]);
            }
            setStats((prev) => ({
              ...prev,
              total: prev.total + 1,
              pending: prev.pending + 1,
              today: prev.today + 1,
            }));
          },
        )
        .subscribe(),
    );

    const leadChannel = supabase
      .channel("admin-client-leads")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "client_leads" },
        async () => {
          const [nextStats, nextClients, nextProspects] = await Promise.all([
            fetchStats(),
            fetchLeadList("clients"),
            fetchLeadList("prospects"),
          ]);

          if (!isActive) {
            return;
          }

          setStats(nextStats);
          setClients(nextClients);
          setProspects(nextProspects);
        },
      )
      .subscribe();

    const activityChannel = supabase
      .channel("admin-client-activity")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "client_activity_logs" },
        async () => {
          const nextActivity = await fetchDashboardActivity();

          if (!isActive) {
            return;
          }

          setDashboardActivity(nextActivity);
        },
      )
      .subscribe();

    return () => {
      isActive = false;
      applicationChannels.forEach((channel) => {
        void supabase.removeChannel(channel);
      });
      void supabase.removeChannel(leadChannel);
      void supabase.removeChannel(activityChannel);
    };
  }, [sessionUserId, t, tab]);

  const updateStatus = async (id: string, status: string) => {
    if (!isServiceTab(tab)) return;

    await supabase
      .from(tableMap[tab])
      .update({ status })
      .eq("id", id);
    setServiceCache((prev) => ({
      ...prev,
      [tab]: (prev[tab] || []).map((item) => (item.id === id ? { ...item, status } : item)),
    }));
    setData((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
    toast({ title: t("common.success") });
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
      passport_url: "admin.passportPhoto",
      passport_document_id: "admin.passportOriginal",
      supporter_passport_document_id: "admin.supporterPassportOriginal",
      passport_extraction: "admin.passportExtraction",
      supporter_passport_extraction: "admin.supporterPassportExtraction",
      sex: "admin.genderShort",
      place_of_birth: "admin.birthCity",
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
  const isImageUrl = (value: string) =>
    /\.(png|jpe?g|gif|webp|bmp|svg|avif)(?:$|[?#])/i.test(value);

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
      const ikametTranslationMap: Record<string, string> = {
        ilk_kez: "ikamet.ilkKez",
        uzatma: "ikamet.uzatma",
        gecis: "ikamet.gecis",
        sonuc: "ikamet.sonuc",
        ogrenci: "ikamet.ogrenci",
        aile: "ikamet.aile",
        kisa_donem: "ikamet.kisaDonem",
        uzun_donem: "ikamet.uzunDonem",
      };
      const ikametTranslationKey = ikametTranslationMap[serviceValue];
      if (ikametTranslationKey && t(ikametTranslationKey) !== ikametTranslationKey) {
        return t(ikametTranslationKey);
      }
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

    if (key === "document_types") {
      const items = Array.isArray(value)
        ? value
        : String(value)
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);

      if (items.length === 0) {
        return "—";
      }

      return items
        .map((item) => {
          const translated = t(`tercume.documentTypes.${item}`);
          return translated !== `tercume.documentTypes.${item}` ? translated : item;
        })
        .join(", ");
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

  const isWideDetailKey = (key: string, rootKey = key, value?: unknown) => {
    if (["address", "notes", "problem", "error", "raw", "response"].includes(key)) {
      return true;
    }

    if (rootKey === "appointment_result" || rootKey === "data") {
      return key === "debugTrace" || key === "warnings" || key === "parsedData" || key === "randevuStatus";
    }

    return typeof value === "string" && value.length > 120;
  };

  const renderDetailCard = (
    rowKey: string,
    label: string,
    content: React.JSX.Element,
    fullWidth = false,
  ) => (
    <div
      key={rowKey}
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm min-w-0",
        fullWidth && "md:col-span-2",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <div className="mt-2 min-w-0">{content}</div>
    </div>
  );

  const renderFileAction = (url: string, label: string) => {
    if (isImageUrl(url)) {
      return (
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setImagePreviewLoading(true);
            setImagePreview({ url, label });
          }}
          className="h-auto p-0 text-sm font-semibold text-blue-600 hover:bg-transparent hover:text-blue-700"
        >
          <Eye className="w-3.5 h-3.5" /> {t("admin.viewImage")}
        </Button>
      );
    }

    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700"
      >
        <Eye className="w-3.5 h-3.5" /> {t("admin.viewFile")}
      </a>
    );
  };

  const openOriginalDocument = async (documentId: string) => {
    try {
      setOpeningDocumentId(documentId);
      const url = await getDocuPipeOriginalUrl(documentId);
      if (isImageUrl(url)) {
        setImagePreviewLoading(true);
        setImagePreview({ url, label: t("admin.viewOriginal") });
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
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

  function renderStructuredValue(
    value: unknown,
    key: string,
    labelPrefix?: string,
    rootKey = key,
  ): React.JSX.Element[] {
    if (shouldHideStructuredKey(key, rootKey)) {
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
            renderDetailCard(
              `${key}-${index}`,
              items.length > 1 ? `${label} ${index + 1}` : label,
              renderFileAction(String(item), items.length > 1 ? `${label} ${index + 1}` : label),
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
          renderDetailCard(
            key,
            label,
            <span className="text-sm font-semibold text-slate-800 break-words">{joined}</span>,
            isWideDetailKey(key, rootKey, joined),
          ),
        ];
      }

      return items.flatMap((item, index) =>
        renderStructuredValue(
          item,
          key,
          items.length > 1 ? `${label} ${index + 1}` : label,
          rootKey,
        ),
      );
    }

    if (typeof value === "object") {
      const orderedEntries = Object.entries(value as Record<string, unknown>).sort(([leftKey], [rightKey]) => {
        const order = STRUCTURED_FIELD_ORDER[rootKey];
        if (!order) {
          return 0;
        }

        const leftIndex = order.indexOf(leftKey);
        const rightIndex = order.indexOf(rightKey);

        if (leftIndex === -1 && rightIndex === -1) return 0;
        if (leftIndex === -1) return 1;
        if (rightIndex === -1) return -1;
        return leftIndex - rightIndex;
      });

      const hideRootPrefix =
        rootKey === "passport_extraction" || rootKey === "supporter_passport_extraction";

      return orderedEntries.flatMap(([childKey, childValue]) =>
        renderStructuredValue(
          childValue,
          childKey,
          hideRootPrefix
            ? getLabelForKey(childKey)
            : labelPrefix
              ? `${labelPrefix} · ${getLabelForKey(childKey)}`
              : getLabelForKey(childKey),
          rootKey,
        ),
      );
    }

    if (isDocumentIdKey(key) && typeof value === "string") {
      return [
        renderDetailCard(
          key,
          label,
          <Button
            type="button"
            variant="ghost"
            onClick={() => openOriginalDocument(value)}
            disabled={openingDocumentId === value}
            className="h-auto p-0 text-sm font-semibold text-blue-600 hover:bg-transparent hover:text-blue-700 disabled:opacity-60"
          >
            <Eye className="w-3.5 h-3.5" />
            {openingDocumentId === value ? t("common.loading") : t("admin.viewOriginal")}
          </Button>,
        ),
      ];
    }

    if (isFileUrl(value)) {
      return [
        renderDetailCard(
          key,
          label,
          renderFileAction(value, label),
        ),
      ];
    }

    return [
      renderDetailCard(
        key,
        label,
        <span className="text-sm font-semibold text-slate-800 break-words">
          {formatValue(key, value)}
        </span>,
        isWideDetailKey(key, rootKey, value),
      ),
    ];
  }

  const selectedPassportIdentity = getPassportIdentitySummary(selectedApp);
  const selectedServiceSections =
    selectedApp && isServiceTab(tab)
      ? buildApplicationSections(selectedApp, tab)
      : [];
  const selectedLeadPassportIdentity = getPassportIdentitySummary(selectedLeadApplication);
  const selectedLeadServiceSections =
    selectedLeadApplication && selectedLeadApplicationTab
      ? buildApplicationSections(selectedLeadApplication, selectedLeadApplicationTab)
      : [];
  function renderServiceField(
    item: AdminApplicationRecord,
    field: ServiceField,
  ): React.JSX.Element[] {
    const value = item[field.key as keyof AdminApplicationRecord];
    if (value === null || value === undefined || value === "") {
      return [];
    }

    const label = getLabelForKey(field.key, field.labelKey);

    if (field.key === "supporter_passport_extraction") {
      const extraction = toPassportExtractionData(value);
      const sex = extraction?.sex?.trim();

      if (!sex) {
        return [];
      }

      return [
        renderDetailCard(
          `${field.key}-sex`,
          t("admin.genderShort"),
          <span className="text-sm font-semibold text-slate-800 break-words">
            {formatValue("sex", sex)}
          </span>,
        ),
      ];
    }

    if (field.isJson) {
      return renderStructuredValue(
        value,
        field.key,
        field.key === "data" ? undefined : label,
        field.key,
      );
    }

    if (field.isFile || field.isDocuPipeOriginal) {
      return renderStructuredValue(value, field.key, label, field.key);
    }

    return [
      renderDetailCard(
        field.key,
        label,
        <span className="text-sm font-semibold text-slate-800 break-words">
          {formatValue(field.key, value, field.isDate)}
        </span>,
        isWideDetailKey(field.key, field.key, value),
      ),
      ];
  }

  function buildApplicationSections(
    item: AdminApplicationRecord,
    serviceTab: ServiceTab,
  ) {
    const fieldMap = new Map(SERVICE_FIELDS[serviceTab].map((field) => [field.key, field]));
    const consumed = new Set<string>();
    const sections = SERVICE_DETAIL_SECTIONS[serviceTab]
      .map((section) => {
        const cards = section.fields.flatMap((fieldKey) => {
          const field = fieldMap.get(fieldKey);
          if (!field) {
            return [];
          }

          consumed.add(fieldKey);
          return renderServiceField(item, field);
        });

        if (cards.length === 0) {
          return null;
        }

        return (
          <section key={section.key} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                {t(section.titleKey)}
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{cards}</div>
          </section>
        );
      })
      .filter(Boolean);

    const remainingCards = SERVICE_FIELDS[serviceTab]
      .filter((field) => !consumed.has(field.key))
      .flatMap((field) => renderServiceField(item, field));

    if (remainingCards.length > 0) {
      sections.push(
        <section key="remaining" className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
              {t("admin.details")}
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {remainingCards}
          </div>
        </section>,
      );
    }

    return sections;
  }

  const renderAdminStatCardSkeleton = (key: string) => (
    <div
      key={key}
      className="relative p-6 rounded-3xl min-h-[170px] bg-white/70 border border-slate-100 shadow-sm"
    >
      <div className="flex h-full flex-col items-center justify-center">
        <Skeleton className="h-10 w-10 rounded-full bg-white" />
        <Skeleton className="mt-4 h-8 w-20 rounded-full bg-white" />
        <Skeleton className="mt-3 h-3 w-24 rounded-full bg-white" />
      </div>
    </div>
  );

  const renderDashboardClientSkeleton = (key: string) => (
    <div
      key={key}
      className="flex items-center rounded-2xl bg-[#f5f4f2] px-4 py-3"
    >
      <div className="w-[30%] pr-2">
        <Skeleton className="h-4 w-24 rounded-full" />
      </div>
      <div className="w-[25%]">
        <Skeleton className="h-4 w-20 rounded-full" />
      </div>
      <div className="w-[20%]">
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="w-[25%]">
        <Skeleton className="h-4 w-16 rounded-full" />
      </div>
      <div className="flex w-10 justify-end">
        <Skeleton className="h-[18px] w-9 rounded-full" />
      </div>
    </div>
  );

  const renderAdminTableSkeletonRow = (key: string, showIndex = true, showStatus = true, showActions = true) => (
    <TableRow key={key} className="border-b border-slate-50 last:border-0">
      {showIndex && (
        <TableCell className="pl-8">
          <Skeleton className="mx-auto h-4 w-4 rounded-full" />
        </TableCell>
      )}
      <TableCell className="py-4">
        <Skeleton className="h-4 w-28 rounded-full" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-24 rounded-full" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-20 rounded-full" />
      </TableCell>
      {showStatus && (
        <TableCell>
          <Skeleton className="mx-auto h-6 w-20 rounded-full" />
        </TableCell>
      )}
      {showActions && (
        <TableCell className="pr-8">
          <div className="flex justify-end">
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
        </TableCell>
      )}
    </TableRow>
  );

  const renderPagination = (
    page: number,
    pageCount: number,
    onChange: (nextPage: number) => void,
  ) => {
    if (pageCount <= 1) {
      return null;
    }

    return (
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="h-9 rounded-full px-4 text-xs font-semibold"
        >
          {t("common.back")}
        </Button>
        {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
          <Button
            key={pageNumber}
            type="button"
            variant={pageNumber === page ? "default" : "outline"}
            size="sm"
            onClick={() => onChange(pageNumber)}
            className={cn(
              "h-9 min-w-9 rounded-full px-3 text-xs font-semibold",
              pageNumber === page && "bg-black text-white hover:bg-black/90",
            )}
          >
            {pageNumber}
          </Button>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onChange(page + 1)}
          className="h-9 rounded-full px-4 text-xs font-semibold"
        >
          {t("common.next")}
        </Button>
      </div>
    );
  };

  const dashboardClientPageCount = Math.max(1, Math.ceil(clients.length / dashboardClientsPageSize));
  const clientsPageCount = Math.max(1, Math.ceil(clients.length / leadTablePageSize));
  const prospectsPageCount = Math.max(1, Math.ceil(prospects.length / leadTablePageSize));

  useEffect(() => {
    setDashboardClientsPage((prev) => Math.min(prev, dashboardClientPageCount));
  }, [dashboardClientPageCount]);

  useEffect(() => {
    setClientsPage((prev) => Math.min(prev, clientsPageCount));
  }, [clientsPageCount]);

  useEffect(() => {
    setProspectsPage((prev) => Math.min(prev, prospectsPageCount));
  }, [prospectsPageCount]);

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
    { key: "prospects", label: t("admin.prospects"), icon: Search },
    { key: "ikamet", label: t("services.ikamet"), icon: Home },
    { key: "sigorta", label: t("services.sigorta"), icon: ShieldCheck },
    { key: "visa", label: t("services.viza"), icon: Plane },
    { key: "calisma", label: t("services.calisma"), icon: Briefcase },
    { key: "tercume", label: t("services.tercume"), icon: Languages },
    { key: "hukuk", label: t("services.hukuk"), icon: Gavel },
    { key: "universite", label: t("services.universite"), icon: GraduationCap },
    { key: "settings", label: t("admin.settings"), icon: Settings },
  ];

  const statCardsData = [
    { label: t("admin.totalApplications"), value: stats.total.toString(), bg: "bg-[#e0f3f8]", badge: t("admin.allTime"), badgeColors: "bg-[#ff6844] text-white", icon: Users },
    { label: t("admin.pendingApplications"), value: stats.pending.toString(), bg: "bg-[#e4dfd9]", badge: t("admin.wait"), badgeColors: "bg-[#e3d1a8] text-slate-800", icon: Clock },
    { label: t("admin.completedApplications"), value: stats.completed.toString(), bg: "bg-[#dbeef0]", badge: t("admin.done"), badgeColors: "bg-[#fae29f] text-slate-800", icon: CheckCircle },
    { label: t("admin.todayApplications"), value: stats.today.toString(), bg: "bg-[#fae7cb]", badge: t("admin.24h"), badgeColors: "bg-[#e3d1a8] text-slate-800", icon: FileText },
    { label: t("admin.convertedClients"), value: stats.applicants.toString(), bg: "bg-[#e8ebed]", badge: "", badgeColors: "", icon: Users },
    { label: t("services.ikamet"), value: String(serviceCache.ikamet?.length || 0), bg: "bg-[#cadded]", badge: "", badgeColors: "", icon: FileText },
    { label: t("services.viza"), value: String(serviceCache.visa?.length || 0), bg: "bg-[#ecdcc5]", badge: "", badgeColors: "", icon: Clock },
    { label: t("services.sigorta"), value: String(serviceCache.sigorta?.length || 0), bg: "bg-[#d5ced5]", badge: "", badgeColors: "", icon: CheckCircle },
    { label: t("services.calisma"), value: String(serviceCache.calisma?.length || 0), bg: "bg-[#ebd1d8]", badge: "", badgeColors: "", icon: Clock },
    { label: t("admin.allClients"), value: stats.allClients.toString(), bg: "bg-[#f4f3f0]", badge: "", badgeColors: "", icon: Search },
  ];
  const isLeadTab = tab === "clients" || tab === "prospects";
  const activeLeadRows = tab === "prospects" ? prospects : clients;
  const activeLeadLoading = tab === "prospects" ? prospectsLoading : clientsLoading;
  const unreadNotifications = notifications.filter((notification) => !notification.read).length;
  const currentLeadPage = tab === "prospects" ? prospectsPage : clientsPage;
  const activeLeadPageCount = tab === "prospects" ? prospectsPageCount : clientsPageCount;
  const dashboardClientRows = paginateRows(clients, dashboardClientsPage, dashboardClientsPageSize);
  const paginatedLeadRows = paginateRows(activeLeadRows, currentLeadPage, leadTablePageSize);

  return (
    <div className="h-screen overflow-hidden bg-[#dcdad2] flex p-3 pl-0">
      {/* Sidebar */}
      <aside className="w-[88px] h-full shrink-0 bg-[#dcdad2] flex flex-col items-center py-8 relative z-30 hidden lg:flex overflow-visible">
        <nav className="flex flex-col gap-1.5 overflow-visible">
          {tabs.map((tb) => {
            const Icon = tb.icon || FileText;
            const isActive = tab === tb.key;
            return (
              <Button
                key={tb.key}
                type="button"
                variant={isActive ? "default" : "ghost"}
                onClick={() => setTab(tb.key)}
                className={cn(
                  "w-11 h-11 flex items-center justify-center rounded-full transition-all group relative z-10",
                  isActive ? "bg-black text-white" : "text-slate-600 hover:bg-black/10"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[120] shadow-lg transition-opacity">
                  {tb.label}
                </span>
              </Button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-h-0 bg-[#f9f8f6] rounded-[2rem] flex flex-col min-w-0 overflow-hidden shadow-sm border border-black/5">
        {/* Header */}
        <header className="h-20 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-slate-400 bg-white px-4 py-2.5 rounded-full shadow-sm w-72 border border-slate-100">
            <Search className="w-4 h-4 ml-1" />
            <input type="text" placeholder={t("admin.searchPlaceholder")} className="bg-transparent border-none outline-none text-sm font-medium text-slate-700 w-full placeholder:text-slate-400" />
          </div>
          <div className="flex items-center gap-6">
            <LanguageSwitcher />
            <div className="flex items-center gap-4 text-slate-600 border-l border-slate-200 pl-6">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="relative h-10 w-10 rounded-full text-slate-500 hover:bg-white hover:text-black">
                    <Bell className="w-5 h-5" />
                    {unreadNotifications > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#ff6844] rounded-full border-2 border-white text-[10px] font-bold text-white flex items-center justify-center">
                        {Math.min(unreadNotifications, 9)}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-2xl bg-white p-2 border-slate-100 shadow-xl min-w-[320px] max-w-[360px]">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-sm font-bold text-slate-900">{t("admin.notifications")}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {unreadNotifications > 0
                        ? `${unreadNotifications} ${t("admin.unreadNotifications")}`
                        : t("admin.notificationsEmpty")}
                    </p>
                  </div>
                  <div className="max-h-[360px] overflow-y-auto py-1">
                    {notifications.length === 0 ? (
                      <div className="px-3 py-6 text-sm text-slate-400 text-center">
                        {t("admin.notificationsEmpty")}
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <DropdownMenuItem
                          key={notification.id}
                          className="rounded-xl px-3 py-3 items-start cursor-pointer"
                          onSelect={() => {
                            void openNotificationItem(
                              notification.serviceTab,
                              notification.applicationId,
                              notification.id,
                            );
                          }}
                        >
                          <div className="flex w-full items-start gap-3">
                            <span
                              className={cn(
                                "mt-1 h-2.5 w-2.5 rounded-full shrink-0",
                                notification.read ? "bg-slate-200" : "bg-[#ff6844]",
                              )}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-900">
                                {notification.title}
                              </p>
                              <p className="text-sm text-slate-500 mt-1 break-words">
                                {notification.description}
                              </p>
                              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400 mt-2">
                                {formatNotificationDate(notification.createdAt)}
                              </p>
                            </div>
                          </div>
                        </DropdownMenuItem>
                      ))
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" className="ml-2 h-auto rounded-full px-2 py-1 hover:bg-slate-100">
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-bold text-slate-800 leading-none">
                        {getAdminDisplayName(session)}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                        {t("admin.panel")}
                      </span>
                    </div>
                    <Avatar className="w-9 h-9 ml-1 border-2 border-white shadow-sm bg-slate-200">
                      <AvatarImage src={getAdminAvatarUrl(session)} alt="Avatar" className="object-cover" />
                      <AvatarFallback className="bg-slate-200 text-slate-700 text-xs font-bold">
                        {getAdminInitials(session)}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-2xl bg-white p-2 border-slate-100 shadow-xl min-w-[180px]">
                  <DropdownMenuItem
                    className="rounded-xl font-medium transition-colors hover:bg-slate-50 hover:text-slate-900 focus:bg-slate-50 focus:text-slate-900"
                    onSelect={() => setTab("settings")}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    {t("admin.settings")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="rounded-xl font-medium text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 focus:bg-red-50 focus:text-red-600"
                    onSelect={logout}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    {t("admin.logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Body */}
        <main className="flex-1 overflow-y-auto px-8 pb-8">
          <div className="flex items-center justify-between mb-8 mt-2">
            <div className="flex items-center gap-3 text-slate-900">
              <h2 className="text-[26px] font-extrabold tracking-tight font-heading">
                {getTabLabel(tab)}
              </h2>
            </div>
            {tab === "dashboard" && (
              <div className="flex items-center gap-4 text-sm font-semibold text-slate-500">
                <div className="flex items-center gap-2 hover:bg-black/5 px-3 py-1.5 rounded-xl transition-colors cursor-default">
                  <Clock className="w-4 h-4" /> {new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                </div>
                <div className="flex items-center gap-2 hover:bg-black/5 px-3 py-1.5 rounded-xl transition-colors text-slate-800 cursor-default">
                  <BarChart3 className="w-4 h-4 text-slate-400" />
                  {dashboardLoading ? <Skeleton className="h-4 w-8 rounded-full" /> : stats.total}
                </div>
              </div>
            )}
          </div>

          {tab === "dashboard" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* Bento Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {dashboardLoading ? Array.from({ length: 5 }, (_, i) => renderAdminStatCardSkeleton(`dashboard-stat-${i}`)) : statCardsData.map((s, i) => (
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
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mt-6 shadow-sm border border-black/5">
                      <s.icon className="w-4 h-4 text-slate-700" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-2 font-heading">{s.value}</h3>
                    <p className="text-[11px] font-bold text-slate-500 mt-1 first-letter:uppercase tracking-widest whitespace-nowrap overflow-hidden text-ellipsis max-w-[95%]">
                      {s.label}
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* Bottom Section */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-1 space-y-4">
                  <div className="flex items-center gap-6 px-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setDashboardPanel("stats")}
                      className={cn(
                        "h-auto rounded-none px-0 pb-1 text-[17px] transition-colors border-b-2 hover:bg-transparent",
                        dashboardPanel === "stats"
                          ? "font-extrabold text-slate-900 border-slate-900"
                          : "font-bold text-slate-400 border-transparent hover:text-slate-600",
                      )}
                    >
                      {t("admin.stats")}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setDashboardPanel("activity")}
                      className={cn(
                        "h-auto rounded-none px-0 pb-1 text-[17px] flex items-center gap-2 transition-colors border-b-2 hover:bg-transparent",
                        dashboardPanel === "activity"
                          ? "font-extrabold text-slate-900 border-slate-900"
                          : "font-bold text-slate-400 border-transparent hover:text-slate-600",
                      )}
                    >
                      <Grip className="w-4 h-4" /> {t("admin.activity")}
                    </Button>
                  </div>
                  <div className="bg-[#0f0f0f] text-white rounded-[2rem] p-8 h-[260px] flex flex-col justify-center shadow-md">
                    {dashboardLoading ? (
                      <div className="grid grid-cols-2 gap-y-8 gap-x-6">
                        {Array.from({ length: 4 }, (_, index) => (
                          <div key={index} className="flex flex-col gap-2">
                            <Skeleton className="h-6 w-16 rounded-full bg-white/10" />
                            <Skeleton className="h-3 w-24 rounded-full bg-white/10" />
                          </div>
                        ))}
                      </div>
                    ) : dashboardPanel === "activity" ? (
                      dashboardInsightsLoading ? (
                        <div className="flex h-full flex-col gap-6 overflow-y-auto pr-2 thin-scrollbar">
                          {Array.from({ length: 3 }, (_, index) => (
                            <div key={index} className="border-b border-white/10 pb-4 last:border-b-0">
                              <Skeleton className="h-4 w-28 rounded-full bg-white/10" />
                              <Skeleton className="mt-4 h-3 w-full rounded-full bg-white/10" />
                              <Skeleton className="mt-2 h-3 w-10/12 rounded-full bg-white/10" />
                              <Skeleton className="mt-2 h-3 w-8/12 rounded-full bg-white/10" />
                            </div>
                          ))}
                        </div>
                      ) : !dashboardInsights ? (
                        <div className="flex h-full items-center justify-center text-sm font-medium text-slate-400">
                          {t("common.noData")}
                        </div>
                      ) : (
                        <div className="flex h-full flex-col gap-6 overflow-y-auto pr-2 thin-scrollbar">
                          <section className="border-b border-white/10 pb-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                              {t("admin.activityInsightsOverview")}
                            </p>
                            <p className="mt-3 text-sm leading-6 text-slate-200">
                              {dashboardInsights.overview}
                            </p>
                          </section>
                          <section className="border-b border-white/10 pb-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                              {t("admin.activityInsightsIssues")}
                            </p>
                            <div className="mt-3 space-y-3">
                              {dashboardInsights.issues.map((issue, index) => (
                                <p key={index} className="text-sm leading-6 text-slate-200">
                                  {issue}
                                </p>
                              ))}
                            </div>
                          </section>
                          <section>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                              {t("admin.activityInsightsRecommendations")}
                            </p>
                            <div className="mt-3 space-y-3">
                              {dashboardInsights.recommendations.map((recommendation, index) => (
                                <p key={index} className="text-sm leading-6 text-slate-200">
                                  {recommendation}
                                </p>
                              ))}
                            </div>
                          </section>
                        </div>
                      )
                    ) : (
                      <div className="grid grid-cols-2 gap-y-8 gap-x-6">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-[#4ade80] text-xl font-black tracking-tight font-heading">
                            <Users className="w-5 h-5" /> {stats.allClients}
                          </div>
                          <p className="text-slate-400 text-xs font-semibold">{t("admin.allClients")}</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-[#f87171] text-xl font-black tracking-tight font-heading">
                            <Search className="w-5 h-5" /> {stats.prospects}
                          </div>
                          <p className="text-slate-400 text-xs font-semibold">{t("admin.prospects")}</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-[#4ade80] text-xl font-black tracking-tight font-heading">
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
                      </div>
                    )}
                  </div>
                </div>

                <div className="xl:col-span-2 space-y-4">
                  <div className="flex flex-wrap items-center justify-between px-2 gap-4">
                    <h3 className="font-bold text-[17px] text-slate-800">{t("admin.clients")}</h3>
                    <div className="flex flex-wrap gap-5 text-xs font-bold text-slate-500">
                      <div className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {stats.allClients}</div>
                      <div className="flex items-center gap-1.5 text-slate-800"><BarChart3 className="w-4 h-4" /> {t("admin.dashboard")}</div>
                    </div>
                  </div>
                  <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex-1 h-[260px] overflow-auto flex flex-col pb-0">
                    <div className="flex text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-3 px-4">
                      <div className="w-[30%]">{t("form.name")}</div>
                      <div className="w-[25%]">{t("form.phone")}</div>
                      <div className="w-[20%]">{t("admin.lastService")}</div>
                      <div className="w-[25%]">{t("admin.date")}</div>
                      <div className="w-10"></div>
                    </div>
                    <div className="flex-1 space-y-2">
                       {dashboardLoading ? (
                          Array.from({ length: 3 }, (_, index) => renderDashboardClientSkeleton(`dashboard-client-${index}`))
                       ) : clients.length === 0 ? (
                          <div className="text-center py-8 text-sm font-medium text-slate-500">{t("common.noData")}</div>
                       ) : dashboardClientRows.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => void openLeadDetails(c)}
                          className="flex w-full cursor-pointer items-center rounded-2xl bg-[#f5f4f2] px-4 py-3 text-[13px] font-bold text-slate-800 transition-colors hover:bg-[#eae8e6]"
                        >
                          <div className="w-[30%] truncate pr-2" title={c.name}>{c.name}</div>
                          <div className="w-[25%] text-slate-600 font-medium">{c.phone}</div>
                          <div className="w-[20%] text-slate-600 font-medium">
                             <div className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] uppercase border", getServiceBadgeClasses(c.last_service_key))}>
                               {getLeadServiceLabel(c)}
                             </div>
                          </div>
                          <div className="w-[25%] text-slate-600 font-medium italic">{formatNullableDate(c.last_activity_at)}</div>
                          <div className="w-10 flex justify-end">
                             <Eye className="h-4 w-4 text-slate-400" />
                          </div>
                        </button>
                      ))}
                    </div>
                    {!dashboardLoading && renderPagination(dashboardClientsPage, dashboardClientPageCount, setDashboardClientsPage)}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {tab === "settings" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl space-y-6">
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <form onSubmit={saveSettings} className="p-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-[185px_minmax(0,1fr)] gap-8 items-start">
                    <div className="space-y-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        {t("admin.profilePhoto")}
                      </p>
                      <Avatar className="w-40 h-40 rounded-[2rem] border border-slate-200 shadow-sm bg-slate-100">
                        <AvatarImage src={settingsForm.avatarUrl || getAdminAvatarUrl(session)} alt="Avatar" className="object-cover" />
                        <AvatarFallback className="bg-slate-100 text-slate-700 text-3xl font-bold">
                          {getAdminInitials(session)}
                        </AvatarFallback>
                      </Avatar>
                      <label className="inline-flex items-center justify-center h-11 px-5 rounded-full bg-black text-white hover:bg-black/90 text-sm font-semibold cursor-pointer transition-colors">
                        {avatarUploading ? t("common.loading") : t("common.upload")}
                        <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={avatarUploading} />
                      </label>
                    </div>

                    <div className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            {t("form.fullName")}
                          </label>
                          <Input
                            value={settingsForm.fullName}
                            onChange={(event) => setSettingsForm((prev) => ({ ...prev, fullName: event.target.value }))}
                            className="h-12 rounded-2xl border-slate-200 bg-slate-50 text-slate-900"
                            placeholder={t("form.fullName")}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            {t("form.email")}
                          </label>
                          <Input value={session?.user?.email || ""} disabled className="h-12 rounded-2xl border-slate-200 bg-slate-100 text-slate-500" />
                        </div>
                      </div>
                      <div className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            {t("admin.passwordSecurity")}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {t("admin.passwordSecurityDescription")}
                          </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="space-y-2">
                            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                              {t("admin.currentPassword")}
                            </label>
                            <Input
                              type="password"
                              value={settingsForm.currentPassword}
                              onChange={(event) => setSettingsForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
                              className="h-12 rounded-2xl border-slate-200 bg-white text-slate-900"
                              placeholder={t("admin.currentPassword")}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                              {t("admin.newPassword")}
                            </label>
                            <Input
                              type="password"
                              value={settingsForm.newPassword}
                              onChange={(event) => setSettingsForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                              className="h-12 rounded-2xl border-slate-200 bg-white text-slate-900"
                              placeholder={t("admin.newPassword")}
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                              {t("admin.confirmPassword")}
                            </label>
                            <Input
                              type="password"
                              value={settingsForm.confirmPassword}
                              onChange={(event) => setSettingsForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                              className="h-12 rounded-2xl border-slate-200 bg-white text-slate-900"
                              placeholder={t("admin.confirmPassword")}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" className="h-11 px-6 rounded-full bg-black text-white hover:bg-black/90 font-semibold" disabled={settingsSaving || avatarUploading}>
                      {settingsSaving ? t("common.loading") : t("common.save")}
                    </Button>
                  </div>
                </form>
              </div>

              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <form onSubmit={saveContactSettings} className="p-8 space-y-8">
                  <div className="space-y-1">
                    <h3 className="font-heading text-xl font-bold text-slate-900">
                      {t("services.iletisim")}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {t("admin.contactSettingsDescription")}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        {t("admin.contactSubtitleUz")}
                      </label>
                      <Input
                        value={contactSettingsForm.subtitle_uz}
                        onChange={(event) =>
                          setContactSettingsForm((prev) => ({
                            ...prev,
                            subtitle_uz: event.target.value,
                          }))
                        }
                        className="h-12 rounded-2xl border-slate-200 bg-slate-50 text-slate-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        {t("admin.contactSubtitleTr")}
                      </label>
                      <Input
                        value={contactSettingsForm.subtitle_tr}
                        onChange={(event) =>
                          setContactSettingsForm((prev) => ({
                            ...prev,
                            subtitle_tr: event.target.value,
                          }))
                        }
                        className="h-12 rounded-2xl border-slate-200 bg-slate-50 text-slate-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        {t("admin.addressUz")}
                      </label>
                      <Input
                        value={contactSettingsForm.address_uz}
                        onChange={(event) =>
                          setContactSettingsForm((prev) => ({
                            ...prev,
                            address_uz: event.target.value,
                          }))
                        }
                        className="h-12 rounded-2xl border-slate-200 bg-slate-50 text-slate-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        {t("admin.addressTr")}
                      </label>
                      <Input
                        value={contactSettingsForm.address_tr}
                        onChange={(event) =>
                          setContactSettingsForm((prev) => ({
                            ...prev,
                            address_tr: event.target.value,
                          }))
                        }
                        className="h-12 rounded-2xl border-slate-200 bg-slate-50 text-slate-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        {t("form.phone")}
                      </label>
                      <Input
                        value={contactSettingsForm.phone}
                        onChange={(event) =>
                          setContactSettingsForm((prev) => ({
                            ...prev,
                            phone: event.target.value,
                          }))
                        }
                        className="h-12 rounded-2xl border-slate-200 bg-slate-50 text-slate-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        {t("form.email")}
                      </label>
                      <Input
                        value={contactSettingsForm.email}
                        onChange={(event) =>
                          setContactSettingsForm((prev) => ({
                            ...prev,
                            email: event.target.value,
                          }))
                        }
                        className="h-12 rounded-2xl border-slate-200 bg-slate-50 text-slate-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        {t("admin.workingHoursUz")}
                      </label>
                      <Input
                        value={contactSettingsForm.working_hours_uz}
                        onChange={(event) =>
                          setContactSettingsForm((prev) => ({
                            ...prev,
                            working_hours_uz: event.target.value,
                          }))
                        }
                        className="h-12 rounded-2xl border-slate-200 bg-slate-50 text-slate-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        {t("admin.workingHoursTr")}
                      </label>
                      <Input
                        value={contactSettingsForm.working_hours_tr}
                        onChange={(event) =>
                          setContactSettingsForm((prev) => ({
                            ...prev,
                            working_hours_tr: event.target.value,
                          }))
                        }
                        className="h-12 rounded-2xl border-slate-200 bg-slate-50 text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        {t("iletisim.socialMedia")}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {t("admin.socialLinksDescription")}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">WhatsApp</label>
                        <Input
                          value={contactSettingsForm.whatsapp_url}
                          onChange={(event) =>
                            setContactSettingsForm((prev) => ({
                              ...prev,
                              whatsapp_url: event.target.value,
                            }))
                          }
                          className="h-12 rounded-2xl border-slate-200 bg-white text-slate-900"
                          placeholder="https://wa.me/..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Telegram</label>
                        <Input
                          value={contactSettingsForm.telegram_url}
                          onChange={(event) =>
                            setContactSettingsForm((prev) => ({
                              ...prev,
                              telegram_url: event.target.value,
                            }))
                          }
                          className="h-12 rounded-2xl border-slate-200 bg-white text-slate-900"
                          placeholder="https://t.me/..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Instagram</label>
                        <Input
                          value={contactSettingsForm.instagram_url}
                          onChange={(event) =>
                            setContactSettingsForm((prev) => ({
                              ...prev,
                              instagram_url: event.target.value,
                            }))
                          }
                          className="h-12 rounded-2xl border-slate-200 bg-white text-slate-900"
                          placeholder="https://instagram.com/..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Facebook</label>
                        <Input
                          value={contactSettingsForm.facebook_url}
                          onChange={(event) =>
                            setContactSettingsForm((prev) => ({
                              ...prev,
                              facebook_url: event.target.value,
                            }))
                          }
                          className="h-12 rounded-2xl border-slate-200 bg-white text-slate-900"
                          placeholder="https://facebook.com/..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      className="h-11 px-6 rounded-full bg-black text-white hover:bg-black/90 font-semibold"
                      disabled={contactSettingsSaving}
                    >
                      {contactSettingsSaving ? t("common.loading") : t("common.save")}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {/* Other Tabs Rendering... */}
          {tab !== "dashboard" && tab !== "settings" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
               <div className="px-8 pt-7 pb-4 border-b border-slate-50">
                 <h3 className="text-xl font-bold text-slate-900 font-heading">
                     {getTabLabel(tab)}
                 </h3>
                 <p className="text-slate-400 text-sm mt-0.5">
                   {(isLeadTab ? activeLeadLoading : dataLoading)
                     ? ''
                     : (isLeadTab ? activeLeadRows.length : data.length) > 0
                       ? `${isLeadTab ? activeLeadRows.length : data.length} ${t(isLeadTab ? 'admin.totalContacts' : 'admin.totalApplications')}`
                       : ''}
                 </p>
               </div>
               
               <Table>
                 <TableHeader>
                   <TableRow className="border-b border-slate-50 hover:bg-transparent">
                     {!isLeadTab && <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest w-12 text-center pl-8">#</TableHead>}
                     <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">{t("form.name")}</TableHead>
                     <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">{t("form.phone")}</TableHead>
                     <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">{t(isLeadTab ? "admin.lastActivity" : "admin.date")}</TableHead>
                     <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest text-center">{t(isLeadTab ? "admin.lastService" : "admin.status")}</TableHead>
                     <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest text-right pr-8">{t("admin.actions")}</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {isLeadTab && activeLeadLoading ? (
                     Array.from({ length: 5 }, (_, index) => renderAdminTableSkeletonRow(`lead-loading-${index}`, false, true, true))
                   ) : isLeadTab ? activeLeadRows.length === 0 ? (
                     <TableRow>
                       <TableCell colSpan={5} className="text-center text-slate-400 py-12">{t('common.noData')}</TableCell>
                     </TableRow>
                   ) : paginatedLeadRows.map((lead) => (
                       <TableRow key={lead.id} className="cursor-pointer border-b border-slate-50 transition-colors hover:bg-slate-50/50 last:border-0" onClick={() => void openLeadDetails(lead)}>
                       <TableCell className="font-bold text-slate-900 py-4 pl-8">{lead.name}</TableCell>
                       <TableCell className="text-slate-500 font-medium">{lead.phone}</TableCell>
                       <TableCell className="text-slate-400 font-medium">
                         <div className="flex flex-col gap-1">
                           <span>{getLeadActionLabel(lead.last_action)}</span>
                           <span className="text-xs text-slate-400">{formatLeadActivityDate(lead.last_activity_at)}</span>
                         </div>
                       </TableCell>
                       <TableCell className="text-center">
                         <span className={cn("inline-flex items-center px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full border", getServiceBadgeClasses(lead.last_service_key))}>
                           {getLeadServiceLabel(lead)}
                         </span>
                       </TableCell>
                       <TableCell className="text-right pr-8">
                         <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); void openLeadDetails(lead); }} className="cursor-pointer gap-1.5 text-slate-400 hover:text-slate-900">
                           <Eye className="w-3.5 h-3.5"/> {t("admin.detail")}
                         </Button>
                       </TableCell>
                     </TableRow>
                   )) : dataLoading ? (
                     Array.from({ length: 5 }, (_, index) => renderAdminTableSkeletonRow(`data-loading-${index}`))
                   ) : data.length === 0 ? (
                     <TableRow>
                       <TableCell colSpan={6} className="text-center text-slate-400 py-12">{t('common.noData')}</TableCell>
                     </TableRow>
                   ) : data.map((item, index) => (
                     <TableRow key={item.id} className="cursor-pointer border-b border-slate-50 transition-colors hover:bg-slate-50/30 last:border-0" onClick={() => setSelectedApp(item)}>
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
               {isLeadTab && !activeLeadLoading && renderPagination(currentLeadPage, activeLeadPageCount, (nextPage) => {
                 if (tab === "prospects") {
                   setProspectsPage(nextPage);
                 } else {
                   setClientsPage(nextPage);
                 }
               })}
            </motion.div>
          )}

          {/* Application Details Dialog */}
          <Dialog open={!!selectedApp} onOpenChange={(open) => !open && setSelectedApp(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 bg-white rounded-xl border border-slate-200 shadow-2xl outline-none">
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-100 shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 leading-none">{getTabLabel(tab)}</h2>
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
                <div className="space-y-6 px-6 py-6 bg-slate-50/50">
                  {selectedServiceSections}
                </div>

                {/* Change Status */}
                <div className="px-6 py-5 border-t border-slate-100 bg-slate-50/50">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{t('admin.changeStatus')}</p>
                  <div className="flex gap-2 flex-wrap">
                    {['pending', 'processing', 'completed', 'rejected'].map(st => {
                      const isActive = selectedApp?.status === st;
                      const colors: Record<string, string> = { pending: 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500', processing: 'bg-blue-500 hover:bg-blue-600 text-white border-blue-500', completed: 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500', rejected: 'bg-red-500 hover:bg-red-600 text-white border-red-500' };
                      return (
                        <Button
                          key={st}
                          type="button"
                          variant={isActive ? "default" : "outline"}
                          onClick={() => { if (selectedApp) { updateStatus(selectedApp.id, st); setSelectedApp({...selectedApp, status: st}); } }}
                          className={cn("h-auto px-4 py-2 text-xs font-bold rounded-md transition-all", isActive ? colors[st] : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50')}
                        >
                          {t(`admin.${st}`)}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog
            open={!!selectedLead}
            onOpenChange={(open) => {
              if (!open) {
                setSelectedLead(null);
                setLeadActivities([]);
                setSelectedLeadApplication(null);
                setSelectedLeadApplicationTab(null);
                setSelectedLeadApplicationLoading(false);
                setLeadSummary(null);
                setLeadSummaryLoading(false);
              }
            }}
          >
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 bg-white rounded-xl border border-slate-200 shadow-2xl outline-none">
              {selectedLead && (
                <>
                  <div className="px-6 py-5 border-b border-slate-100 shrink-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900 leading-none">
                          {selectedLead.name}
                        </h2>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto bg-slate-50/50 px-6 py-6">
                    <div className="space-y-6">
                      <section className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                            {t("admin.details")}
                          </h3>
                        </div>

                        {selectedLeadApplicationLoading ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                              {Array.from({ length: 4 }, (_, index) => (
                                <div key={index} className="rounded-2xl border border-slate-200 bg-white p-4">
                                  <Skeleton className="h-3 w-28 rounded-full bg-slate-200/80" />
                                  <Skeleton className="mt-3 h-4 w-11/12 rounded-full bg-slate-200/80" />
                                  <Skeleton className="mt-2 h-4 w-7/12 rounded-full bg-slate-200/80" />
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : selectedLeadApplication && selectedLeadApplicationTab ? (
                          <div className="space-y-4">
                            {selectedLeadPassportIdentity.length > 0 && (
                              <div
                                className={cn(
                                  "grid grid-cols-1 gap-3",
                                  selectedLeadPassportIdentity.length >= 3
                                    ? "sm:grid-cols-3"
                                    : "sm:grid-cols-2",
                                )}
                              >
                                {selectedLeadPassportIdentity.map((field) => (
                                  <div
                                    key={field.key}
                                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 min-w-0"
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
                            <div className="space-y-3">{selectedLeadServiceSections}</div>
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm font-medium text-slate-500">
                            {t("admin.noSubmittedDetails")}
                          </div>
                        )}
                      </section>

                      <section className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                            {t("admin.activity")}
                          </h3>
                        </div>
                        <div className="space-y-3">
                          {leadActivitiesLoading || leadSummaryLoading ? (
                            <div className="rounded-2xl border border-slate-200 bg-white p-5">
                              <Skeleton className="h-4 w-36 rounded-full bg-slate-200/80" />
                              <Skeleton className="mt-4 h-3 w-full rounded-full bg-slate-200/80" />
                              <Skeleton className="mt-2 h-3 w-11/12 rounded-full bg-slate-200/80" />
                              <Skeleton className="mt-2 h-3 w-9/12 rounded-full bg-slate-200/80" />
                              <Skeleton className="mt-5 h-3 w-40 rounded-full bg-slate-200/80" />
                            </div>
                          ) : leadSummary?.summary ? (
                            <div className="rounded-2xl border border-slate-200 bg-white p-5">
                              <p className="text-sm font-semibold text-slate-900">
                                {t("admin.activitySummary")}
                              </p>
                              <p className="mt-3 text-sm leading-7 text-slate-600">
                                {leadSummary.summary}
                              </p>
                              <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                                {t("admin.activitySummaryMeta", { count: leadActivities.length })}
                              </p>
                            </div>
                          ) : (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm font-medium text-slate-500">
                              {t("common.noData")}
                            </div>
                          )}
                        </div>
                      </section>
                    </div>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
          <Dialog
            open={!!imagePreview}
            onOpenChange={(open) => {
              if (!open) {
                setImagePreview(null);
                setImagePreviewLoading(false);
              }
            }}
          >
            <DialogContent className="max-w-4xl bg-white p-4 rounded-2xl border border-slate-200 shadow-2xl">
              {imagePreview && (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{imagePreview.label}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mt-1">
                      {t("admin.imagePreview")}
                    </p>
                  </div>
                  <div className="relative flex h-[68vh] min-h-[420px] items-center justify-center overflow-hidden rounded-2xl bg-slate-100 p-3">
                    {imagePreviewLoading && (
                      <div className="absolute inset-3 flex flex-col gap-3">
                        <Skeleton className="h-full w-full rounded-xl bg-slate-200/80" />
                        <Skeleton className="h-3 w-32 rounded-full bg-slate-200/80" />
                      </div>
                    )}
                    <img
                      src={imagePreview.url}
                      alt={imagePreview.label}
                      onLoad={() => setImagePreviewLoading(false)}
                      onError={() => setImagePreviewLoading(false)}
                      className={cn(
                        "max-h-full w-auto max-w-full rounded-xl object-contain transition-opacity duration-200",
                        imagePreviewLoading ? "opacity-0" : "opacity-100",
                      )}
                    />
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}
