import { useTranslation } from "react-i18next";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const countries = [
  "uzbekistan",
  "kazakhstan",
  "kyrgyzstan",
  "tajikistan",
  "turkmenistan",
  "azerbaijan",
  "belarus",
  "ukraine",
  "russia",
  "other",
] as const;
type Country = (typeof countries)[number];

const flags: Record<Country, string> = {
  uzbekistan: "🇺🇿",
  kazakhstan: "🇰🇿",
  kyrgyzstan: "🇰🇬",
  tajikistan: "🇹🇯",
  turkmenistan: "🇹🇲",
  azerbaijan: "🇦🇿",
  belarus: "🇧🇾",
  ukraine: "🇺🇦",
  russia: "🇷🇺",
  other: "🌍",
};

const CARD_COLORS = [
  "#C8D5F5",
  "#F2E8A0",
  "#C8E6D0",
  "#E0D4F0",
  "#FDD6B5",
  "#D4ECFA",
  "#F5D5D5",
  "#E8E0F8",
  "#DCEDC8",
  "#D5F0E8",
];

export default function KonsoloslukPage() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Country | null>(null);

  if (selected)
    return (
      <div className="space-y-6 animate-fade-in">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setSelected(null)}
          className="w-fit px-0 text-sm font-medium text-slate-500 hover:bg-transparent hover:text-slate-900"
        >
          ← {t("common.back")}
        </Button>
        <div
          className="rounded-[1.5rem] p-6 md:p-8"
          style={{
            backgroundColor:
              CARD_COLORS[
                countries.indexOf(selected) % CARD_COLORS.length
              ],
          }}
        >
          <span className="text-5xl mb-4 block">{flags[selected]}</span>
          <h2 className="font-heading text-2xl font-extrabold text-slate-800">
            {t(`konsolosluk.countries.${selected}`)}
          </h2>
          <p className="text-slate-600 mt-3">{t("konsolosluk.noInfo")}</p>
        </div>
      </div>
    );

  return (
    <div className="space-y-6 animate-fade-in">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-slate-900">
          {t("konsolosluk.title")}
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          {t("konsolosluk.selectCountry")}
        </p>
      </motion.div>

      {/* Bento-style flag cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
        {countries.map((c, i) => (
          <motion.div
            key={c}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: i * 0.05,
              duration: 0.45,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="rounded-[1.5rem] p-5 cursor-pointer group transition-all duration-300 hover:shadow-lg hover:-translate-y-1 min-h-[130px] flex flex-col justify-between"
            style={{ backgroundColor: CARD_COLORS[i % CARD_COLORS.length] }}
            onClick={() => setSelected(c)}
          >
            <span className="text-3xl mb-2">{flags[c]}</span>
            <div className="flex items-end justify-between">
              <span className="font-heading font-bold text-sm text-slate-800 leading-tight">
                {t(`konsolosluk.countries.${c}`)}
              </span>
              <div className="w-7 h-7 rounded-full bg-white/60 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shrink-0 ml-2">
                <ArrowUpRight
                  className="w-3.5 h-3.5 text-slate-700"
                  strokeWidth={2.5}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
