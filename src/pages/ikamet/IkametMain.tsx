import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Shield,
  RefreshCw,
  ArrowRightLeft,
  Search,
  ArrowUpRight,
} from "lucide-react";
import { motion } from "framer-motion";

const CARD_STYLES = [
  { bg: "#C8D5F5", color: "#4A6EC5", size: "col-span-2" }, // blue - wide
  { bg: "#C8E6D0", color: "#3A8A56", size: "col-span-1" }, // mint
  { bg: "#E0D4F0", color: "#7B5EA7", size: "col-span-1" }, // lavender
  { bg: "#F2E8A0", color: "#8B7E2A", size: "col-span-2" }, // yellow - wide
];

export default function IkametMain() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const items = [
    {
      icon: Shield,
      label: t("ikamet.ilkKez"),
      desc: t("ikamet.ilkKezDescription"),
      path: "/dashboard/ikamet/ilk-kez",
    },
    {
      icon: RefreshCw,
      label: t("ikamet.uzatma"),
      desc: t("ikamet.uzatmaDescription"),
      path: "/dashboard/ikamet/uzatma",
    },
    {
      icon: ArrowRightLeft,
      label: t("ikamet.gecis"),
      desc: t("ikamet.gecisDescription"),
      path: "/dashboard/ikamet/gecis",
    },
    {
      icon: Search,
      label: t("ikamet.sonuc"),
      desc: t("ikamet.sonucCardDescription"),
      path: "/dashboard/ikamet/sonuc",
    },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-slate-900">
          {t("ikamet.title")}
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          {t("ikamet.mainDescription")}
        </p>
      </motion.div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-2 gap-4 md:gap-5">
        {items.map((item, i) => {
          const style = CARD_STYLES[i];
          return (
            <motion.div
              key={item.path}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: i * 0.08,
                duration: 0.45,
                ease: [0.16, 1, 0.3, 1],
              }}
              className={`${style.size} rounded-[1.5rem] p-5 md:p-6 cursor-pointer group transition-all duration-300 hover:shadow-lg hover:-translate-y-1 min-h-[140px] md:min-h-[160px] flex flex-col justify-between`}
              style={{ backgroundColor: style.bg }}
              onClick={() => navigate(item.path)}
            >
              <div>
                <item.icon
                  className="h-7 w-7 mb-3"
                  style={{ color: style.color }}
                  strokeWidth={1.8}
                />
                <h3 className="font-heading font-bold text-base md:text-lg text-slate-800">
                  {item.label}
                </h3>
                <p className="text-sm text-slate-600/80 mt-1">{item.desc}</p>
              </div>
              <div className="flex justify-end mt-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                  style={{ backgroundColor: style.color, color: "#fff" }}
                >
                  <ArrowUpRight className="w-4 h-4" strokeWidth={2.5} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
