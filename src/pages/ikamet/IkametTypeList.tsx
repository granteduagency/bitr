import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Users,
  Clock,
  Calendar,
  ArrowUpRight,
} from "lucide-react";
import { motion } from "framer-motion";

const CARD_STYLES = [
  { bg: "#C8D5F5", color: "#4A6EC5" },
  { bg: "#C8E6D0", color: "#3A8A56" },
  { bg: "#F2E8A0", color: "#8B7E2A" },
  { bg: "#E0D4F0", color: "#7B5EA7" },
];

interface IkametTypeListProps {
  basePath: string;
  showUzunDonem?: boolean;
}

export default function IkametTypeList({
  basePath,
  showUzunDonem = true,
}: IkametTypeListProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const items = [
    {
      icon: GraduationCap,
      label: t("ikamet.ogrenci"),
      path: `${basePath}/ogrenci`,
    },
    { icon: Users, label: t("ikamet.aile"), path: `${basePath}/aile` },
    {
      icon: Clock,
      label: t("ikamet.kisaDonem"),
      path: `${basePath}/kisa-donem`,
    },
    ...(showUzunDonem
      ? [
          {
            icon: Calendar,
            label: t("ikamet.uzunDonem"),
            path: `${basePath}/uzun-donem`,
          },
        ]
      : []),
  ];

  const title = basePath.includes("uzatma")
    ? t("ikamet.uzatma")
    : basePath.includes("gecis")
      ? t("ikamet.gecis")
      : t("ikamet.ilkKez");

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-slate-900">
          {title}
        </h2>
        <p className="text-slate-400 text-sm mt-1">Ruxsatnoma turini tanlang</p>
      </motion.div>

      <div className="grid grid-cols-2 gap-4 md:gap-5">
        {items.map((item, i) => {
          const style = CARD_STYLES[i % CARD_STYLES.length];
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
              className="rounded-[1.5rem] p-5 cursor-pointer group transition-all duration-300 hover:shadow-lg hover:-translate-y-1 min-h-[150px] md:min-h-[170px] flex flex-col justify-between"
              style={{ backgroundColor: style.bg }}
              onClick={() => navigate(item.path)}
            >
              <div>
                <item.icon
                  className="h-7 w-7 mb-3"
                  style={{ color: style.color }}
                  strokeWidth={1.8}
                />
                <h3 className="font-heading font-bold text-[0.95rem] text-slate-800">
                  {item.label}
                </h3>
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
