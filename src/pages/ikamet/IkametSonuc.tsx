import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Input, Label, Surface, TextField } from "@heroui/react";
import { Upload, CheckCircle2, RotateCcw, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { toast } from "@/hooks/use-toast";
import { getOrCreateClient, supabase, uploadFile } from "@/lib/supabase";
import {
  checkAppointmentStatus,
  formatPhoneForLookup,
  normalizePhoneInput,
  parseAppointmentFile,
  suggestAppointmentCheckType,
  type AppointmentDebugStep,
  type AppointmentCheckResult,
  type AppointmentCheckType,
  type AppointmentParsedData,
} from "@/lib/randevu";

const emptyParsedData: AppointmentParsedData = {
  registrationNumber: null,
  documentNumber: null,
  phone: null,
  email: null,
  suggestedCheckType: null,
  source: "manual",
  warnings: [],
};

const stageLabel = (stage: string) => stage.replace(/\./g, " / ");

const prettifyDebugData = (data: Record<string, unknown> | null) => {
  if (!data) {
    return null;
  }

  const { captchaImageDataUrl, ...rest } = data;
  const formatted = JSON.stringify(rest, null, 2);
  return {
    captchaImageDataUrl:
      typeof captchaImageDataUrl === "string" ? captchaImageDataUrl : null,
    formatted: formatted === "{}" ? null : formatted,
  };
};

export default function IkametSonuc() {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [checkType, setCheckType] = useState<AppointmentCheckType>("phone");
  const [result, setResult] = useState<AppointmentCheckResult | null>(null);
  const [parsedData, setParsedData] = useState<AppointmentParsedData>(emptyParsedData);
  const [debugSteps, setDebugSteps] = useState<AppointmentDebugStep[]>([]);
  const [form, setForm] = useState({
    registrationNumber: "",
    documentNumber: "",
    phone: "",
    email: "",
  });

  const setField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const canUsePhone = normalizePhoneInput(form.phone).length === 10;
  const canUseEmail = form.email.trim().length > 0;
  const canSubmit =
    !!selectedFile &&
    !!form.registrationNumber.trim() &&
    !!form.documentNumber.trim() &&
    ((checkType === "phone" && canUsePhone) || (checkType === "email" && canUseEmail));

  const visibleWarnings = useMemo(
    () => parsedData.warnings.filter(Boolean),
    [parsedData.warnings],
  );

  const visibleDebugSteps = useMemo(
    () => (result?.debugTrace?.length ? result.debugTrace : debugSteps),
    [debugSteps, result],
  );

  const resetState = () => {
    setSelectedFile(null);
    setFileName("");
    setResult(null);
    setParsedData(emptyParsedData);
    setDebugSteps([]);
    setForm({
      registrationNumber: "",
      documentNumber: "",
      phone: "",
      email: "",
    });
    setCheckType("phone");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setFileName(file.name);
    setResult(null);
    setDebugSteps([]);
    setParsing(true);

    try {
      const extracted = await parseAppointmentFile(file);
      setParsedData(extracted);
      setForm({
        registrationNumber: extracted.registrationNumber || "",
        documentNumber: extracted.documentNumber || "",
        phone: extracted.phone || "",
        email: extracted.email || "",
      });

      const suggested = extracted.suggestedCheckType || suggestAppointmentCheckType(extracted.phone, extracted.email);
      if (suggested) {
        setCheckType(suggested);
      }

      toast({
        title: t("common.success"),
        description: t("ikamet.parseSuccess"),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("common.error");
      setParsedData(emptyParsedData);
      setForm({
        registrationNumber: "",
        documentNumber: "",
        phone: "",
        email: "",
      });
      toast({
        title: t("common.error"),
        description: message,
        variant: "destructive",
      });
    } finally {
      setParsing(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedFile) return;

    setLoading(true);
    setDebugSteps([]);

    try {
      const appointmentUrl = await uploadFile(selectedFile);
      if (!appointmentUrl) {
        throw new Error("Appointment file upload failed.");
      }

      const finalParsedData: AppointmentParsedData = {
        ...parsedData,
        registrationNumber: form.registrationNumber.trim() || null,
        documentNumber: form.documentNumber.trim().toUpperCase() || null,
        phone: normalizePhoneInput(form.phone) || null,
        email: form.email.trim().toLowerCase() || null,
        suggestedCheckType: suggestAppointmentCheckType(form.phone, form.email),
        source: parsedData.source || "manual",
      };

      const checkResult = await checkAppointmentStatus({
        registrationNumber: form.registrationNumber.trim(),
        documentNumber: form.documentNumber.trim().toUpperCase(),
        phone: normalizePhoneInput(form.phone),
        email: form.email.trim().toLowerCase(),
        checkType,
        parsedData: finalParsedData,
        onStep: (step) => {
          setDebugSteps((prev) => [...prev, step]);
        },
      });

      const clientId = await getOrCreateClient(
        localStorage.getItem("client_name")!,
        localStorage.getItem("client_phone")!,
      );

      const { error } = await supabase.from("ikamet_applications").insert({
        client_id: clientId,
        category: "sonuc",
        type: "sonuc",
        appointment_url: appointmentUrl,
        phone: finalParsedData.phone,
        email: finalParsedData.email,
        appointment_result: checkResult,
      });

      if (error) throw error;

      setParsedData(finalParsedData);
      setDebugSteps(checkResult.debugTrace || []);
      setResult(checkResult);
      toast({
        title: checkResult.success ? t("common.success") : t("common.error"),
        description: checkResult.success
          ? t("ikamet.checkSuccess")
          : checkResult.error || t("ikamet.checkFailed"),
        variant: checkResult.success ? "default" : "destructive",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-slate-900">
          {t("ikamet.sonuc")}
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          {t("ikamet.sonucDescription")}
        </p>
      </div>

      {result && (
        <Surface className="rounded-[1.5rem] p-6 md:p-8 space-y-4 border border-slate-200">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] font-bold text-slate-400">
                {t("form.appointmentResult")}
              </p>
              <h3 className="font-heading text-xl font-extrabold text-slate-900 mt-2">
                {result.success
                  ? result.randevuStatus?.status || t("ikamet.checkSuccess")
                  : t("ikamet.checkFailed")}
              </h3>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
                result.success
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700"
              }`}
            >
              {result.success ? t("common.success") : t("common.error")}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-slate-400 font-medium">{t("admin.registrationNumber")}</p>
              <p className="font-semibold text-slate-900 mt-1">
                {result.parsedData.registrationNumber || "—"}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-slate-400 font-medium">{t("admin.documentNumber")}</p>
              <p className="font-semibold text-slate-900 mt-1">
                {result.parsedData.documentNumber || "—"}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-slate-400 font-medium">{t("admin.checkType")}</p>
              <p className="font-semibold text-slate-900 mt-1">
                {result.checkType === "phone"
                  ? t("ikamet.checkByPhone")
                  : t("ikamet.checkByEmail")}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-slate-400 font-medium">{t("admin.attempts")}</p>
              <p className="font-semibold text-slate-900 mt-1">{result.attempts}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-slate-400 font-medium">{t("admin.permitType")}</p>
              <p className="font-semibold text-slate-900 mt-1">
                {result.randevuStatus?.permitType || "—"}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-slate-400 font-medium">{t("admin.pttBarcode")}</p>
              <p className="font-semibold text-slate-900 mt-1">
                {result.randevuStatus?.pttBarcode || "—"}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 md:col-span-2">
              <p className="text-slate-400 font-medium">{t("admin.dates")}</p>
              <p className="font-semibold text-slate-900 mt-1">
                {result.randevuStatus?.dates || "—"}
              </p>
            </div>
            {!result.success && result.error && (
              <div className="rounded-2xl bg-rose-50 p-4 md:col-span-2">
                <p className="text-rose-500 font-medium">{t("common.error")}</p>
                <p className="font-semibold text-rose-700 mt-1">{result.error}</p>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              variant="secondary"
              onPress={resetState}
              className="rounded-2xl"
            >
              <RotateCcw className="h-4 w-4" />
              {t("ikamet.newCheck")}
            </Button>
          </div>
        </Surface>
      )}

      <form onSubmit={handleSubmit}>
        <Surface className="rounded-[1.5rem] p-6 md:p-8 space-y-5">
          <div className="space-y-2">
            <Label>{t("form.appointmentUpload")}</Label>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                onPress={() => inputRef.current?.click()}
                isPending={parsing}
                className="rounded-2xl"
              >
                {parsing ? (
                  t("ikamet.parsingDocument")
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    {t("form.appointmentUpload")}
                  </>
                )}
              </Button>
              {selectedFile && (
                <div className="inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="max-w-[220px] truncate">{fileName}</span>
                </div>
              )}
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <p className="text-xs text-slate-400">
              {t("ikamet.uploadHint")}
            </p>
          </div>

          {visibleWarnings.length > 0 && (
            <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700 space-y-1">
              {visibleWarnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField
              fullWidth
              isRequired
              name="registrationNumber"
              variant="secondary"
              onChange={(value) => setField("registrationNumber", value)}
              value={form.registrationNumber}
            >
              <Label>{t("admin.registrationNumber")}</Label>
              <Input placeholder="2026-11-0040386" />
            </TextField>
            <TextField
              fullWidth
              isRequired
              name="documentNumber"
              variant="secondary"
              onChange={(value) => setField("documentNumber", value.toUpperCase())}
              value={form.documentNumber}
            >
              <Label>{t("admin.documentNumber")}</Label>
              <Input placeholder="FA9081227" />
            </TextField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField
              fullWidth
              name="phone"
              variant="secondary"
              onChange={(value) => setField("phone", normalizePhoneInput(value))}
              value={form.phone}
            >
              <Label>{t("form.phone")}</Label>
              <Input placeholder="5010088801" />
            </TextField>
            <TextField
              fullWidth
              name="email"
              type="email"
              variant="secondary"
              onChange={(value) => setField("email", value)}
              value={form.email}
            >
              <Label>{t("form.email")}</Label>
              <Input placeholder="email@example.com" />
            </TextField>
          </div>

          <div className="space-y-2">
            <Label>{t("admin.checkType")}</Label>
            <Select value={checkType} onValueChange={(value) => setCheckType(value as AppointmentCheckType)}>
              <SelectTrigger className="w-full md:w-[240px]">
                <SelectValue placeholder={t("common.select")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="phone" disabled={!canUsePhone}>
                  {t("ikamet.checkByPhone")}
                </SelectItem>
                <SelectItem value="email" disabled={!canUseEmail}>
                  {t("ikamet.checkByEmail")}
                </SelectItem>
              </SelectContent>
            </Select>
            {checkType === "phone" && canUsePhone && (
              <p className="text-xs text-slate-400">
                {formatPhoneForLookup(form.phone)}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <FileText className="h-4 w-4" />
              {t("ikamet.checkInfo")}
            </div>
            <p className="mt-2">
              {t("ikamet.checkInfoDesc")}
            </p>
          </div>

          {(loading || visibleDebugSteps.length > 0) && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] font-bold text-slate-400">
                    {t("ikamet.debugTitle")}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    {loading ? t("ikamet.debugLive") : t("ikamet.debugFinished")}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {visibleDebugSteps.length}
                </span>
              </div>

              {visibleDebugSteps.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  {t("ikamet.debugWaiting")}
                </div>
              ) : (
                <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
                  {visibleDebugSteps.map((step) => {
                    const debugData = prettifyDebugData(step.data);

                    return (
                      <div
                        key={`${step.sequence}-${step.timestamp}`}
                        className={`rounded-2xl border p-4 space-y-3 ${
                          step.level === "error"
                            ? "border-rose-200 bg-rose-50"
                            : step.level === "success"
                              ? "border-emerald-200 bg-emerald-50"
                              : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                              {stageLabel(step.stage)}
                            </p>
                            <p className="text-sm font-semibold text-slate-900 mt-1">
                              {step.message}
                            </p>
                          </div>
                          <div className="text-right text-xs text-slate-500">
                            <p>#{step.sequence}</p>
                            <p>{step.attempt > 0 ? `Attempt ${step.attempt}` : "Prep"}</p>
                          </div>
                        </div>

                        {debugData?.captchaImageDataUrl && (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Captcha
                            </p>
                            <img
                              src={debugData.captchaImageDataUrl}
                              alt="Captcha preview"
                              className="h-16 rounded-xl border border-slate-200 bg-white px-3 py-2"
                            />
                          </div>
                        )}

                        {debugData?.formatted && (
                          <pre className="overflow-x-auto rounded-xl bg-slate-950 p-3 text-xs leading-5 text-slate-100">
                            {debugData.formatted}
                          </pre>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <SubmitButton
            isPending={loading}
            isDisabled={!canSubmit || parsing}
            className="h-12 rounded-2xl bg-slate-900 text-white font-bold shadow-lg"
          />
        </Surface>
      </form>
    </motion.div>
  );
}
