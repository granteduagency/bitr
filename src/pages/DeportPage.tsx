import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input, Label, Surface, TextField } from "@heroui/react";
import { Button } from "@/components/ui/button";
import { calculateDeport } from "@/lib/deportCalculation";
import { getDeportExchangeRate, type DeportExchangeRate } from "@/lib/deport-rate";
import { AlertTriangle, CheckCircle, Calculator } from "lucide-react";
import { motion } from "framer-motion";

export default function DeportPage() {
  const { t, i18n } = useTranslation();
  const [entryDate, setEntryDate] = useState("");
  const [exitDate, setExitDate] = useState("");
  const [result, setResult] = useState<ReturnType<
    typeof calculateDeport
  > | null>(null);
  const [exchangeRate, setExchangeRate] = useState<DeportExchangeRate | null>(null);
  const [exchangeRateLoading, setExchangeRateLoading] = useState(true);
  const [exchangeRateError, setExchangeRateError] = useState(false);

  useEffect(() => {
    let active = true;

    setExchangeRateLoading(true);
    setExchangeRateError(false);

    getDeportExchangeRate()
      .then((data) => {
        if (!active) return;
        setExchangeRate(data);
      })
      .catch(() => {
        if (!active) return;
        setExchangeRate(null);
        setExchangeRateError(true);
      })
      .finally(() => {
        if (!active) return;
        setExchangeRateLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const locale = i18n.language === "tr" ? "tr-TR" : "uz-UZ";
  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        maximumFractionDigits: 0,
      }),
    [locale],
  );
  const decimalFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [locale],
  );
  const rateFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
      }),
    [locale],
  );

  const usdPenaltyAmount =
    result?.hasViolation && exchangeRate?.usdTryRate
      ? result.penaltyAmount / exchangeRate.usdTryRate
      : null;

  const handleCalc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryDate || !exitDate) return;
    setResult(calculateDeport(new Date(entryDate), new Date(exitDate)));
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-slate-900">
          {t("deport.title")}
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          {t("deport.subtitle")}
        </p>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleCalc}
      >
        <Surface className="rounded-[1.5rem] p-6 md:p-8 space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <TextField
              fullWidth
              name="entry_date"
              type="date"
              isRequired
              onChange={setEntryDate}
              value={entryDate}
            >
              <Label>{t("deport.entryDate")}</Label>
              <Input className="h-12 rounded-xl" />
            </TextField>
            <TextField
              fullWidth
              name="exit_date"
              type="date"
              isRequired
              onChange={setExitDate}
              value={exitDate}
            >
              <Label>{t("deport.exitDate")}</Label>
              <Input className="h-12 rounded-xl" />
            </TextField>
          </div>
          <Button
            type="submit"
            className="mx-auto h-12 w-fit rounded-2xl bg-slate-900 text-white font-bold shadow-lg"
          >
            <Calculator className="mr-2 h-4 w-4" /> {t("deport.calculate")}
          </Button>
        </Surface>
      </motion.form>

      {result && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div
            className={`rounded-[1.5rem] overflow-hidden ${result.hasViolation ? "bg-[#FDD6B5]" : "bg-[#C8E6D0]"}`}
          >
            <div className="p-6 md:p-8 space-y-4">
              <div className="flex items-center gap-3">
                {result.hasViolation ? (
                  <div className="w-12 h-12 rounded-full bg-white/60 flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-[#C67832]" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-white/60 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-[#3A8A56]" />
                  </div>
                )}
                <h3 className="font-heading font-extrabold text-lg text-slate-800">
                  {t("deport.result")}
                </h3>
              </div>
              {result.hasViolation ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-white/40 rounded-xl p-3">
                    <span className="text-sm text-slate-600">
                      {t("deport.violationDays")}
                    </span>
                    <span className="font-bold font-mono text-slate-900">
                      {result.violationDays}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-white/40 rounded-xl p-3">
                    <span className="text-sm text-slate-600">
                      {t("deport.penaltyAmount")}
                    </span>
                    <span className="font-bold font-mono text-[#B85555]">
                      {numberFormatter.format(result.penaltyAmount)} TL
                      {usdPenaltyAmount !== null
                        ? ` / ${decimalFormatter.format(usdPenaltyAmount)} USD`
                        : ""}
                    </span>
                  </div>
                  {result.hasViolation && (
                    <p className="px-1 text-xs text-slate-600">
                      {exchangeRate
                        ? t("deport.exchangeRateInfo", {
                            date: exchangeRate.sourceDate,
                            rate: rateFormatter.format(exchangeRate.usdTryRate),
                            source: exchangeRate.source,
                          })
                        : exchangeRateLoading
                          ? t("deport.exchangeRateLoading")
                          : exchangeRateError
                            ? t("deport.exchangeRateUnavailable")
                            : null}
                    </p>
                  )}
                  {result.deportDuration && (
                    <div className="flex justify-between items-center bg-white/40 rounded-xl p-3">
                      <span className="text-sm text-slate-600">
                        {t("deport.deportDuration")}
                      </span>
                      <span className="font-bold text-slate-900">
                        {t(`deport.durationOptions.${result.deportDuration}`)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[#3A8A56] font-bold text-base">
                  {t("deport.noViolation")}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
