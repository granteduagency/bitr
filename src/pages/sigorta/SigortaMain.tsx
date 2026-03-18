import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  HeartPulse,
  Plane,
  Mountain,
  Car,
  Palmtree,
  ArrowUpRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { motion } from "framer-motion";

const CARD_STYLES = [
  { bg: "#F5D5D5", color: "#B85555", size: "col-span-1" }, // rose
  { bg: "#D4ECFA", color: "#3A8DC1", size: "col-span-1" }, // sky
  { bg: "#F2E8A0", color: "#8B7E2A", size: "col-span-2" }, // yellow - wide
  { bg: "#E0D4F0", color: "#7B5EA7", size: "col-span-1" }, // lavender
  { bg: "#C8E6D0", color: "#3A8A56", size: "col-span-1" }, // mint
];

export default function SigortaMain() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [saglikOpen, setSaglikOpen] = useState(false);
  const [aracOpen, setAracOpen] = useState(false);

  const items = [
    {
      icon: HeartPulse,
      label: t("sigorta.saglik"),
      desc: "Sog'liq sug'urtasi",
      onClick: () => setSaglikOpen(true),
    },
    {
      icon: Plane,
      label: t("sigorta.seyahat"),
      desc: "Sayohat himoyasi",
      path: "/dashboard/sigorta/seyahat",
    },
    {
      icon: Mountain,
      label: t("sigorta.deprem"),
      desc: "Zilzila sug'urtasi",
      path: "/dashboard/sigorta/deprem",
    },
    {
      icon: Car,
      label: t("sigorta.arac"),
      desc: "Avto sug'urtasi",
      onClick: () => setAracOpen(true),
    },
    {
      icon: Palmtree,
      label: t("sigorta.turizm"),
      desc: "Turizm paketi",
      path: "/dashboard/sigorta/turizm",
    },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-slate-900">
          {t("sigorta.title")}
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Kerakli sug'urta turini tanlang
        </p>
      </motion.div>

      {/* Bento Grid */}
      <div className="grid grid-cols-2 gap-4 md:gap-5">
        {items.map((item, i) => {
          const style = CARD_STYLES[i];
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: i * 0.08,
                duration: 0.45,
                ease: [0.16, 1, 0.3, 1],
              }}
              className={`${style.size} rounded-[1.5rem] p-5 md:p-6 cursor-pointer group transition-all duration-300 hover:shadow-lg hover:-translate-y-1 min-h-[140px] md:min-h-[160px] flex flex-col justify-between`}
              style={{ backgroundColor: style.bg }}
              onClick={() =>
                item.onClick ? item.onClick() : item.path && navigate(item.path)
              }
            >
              <div>
                <item.icon
                  className="h-7 w-7 mb-3"
                  style={{ color: style.color }}
                  strokeWidth={1.8}
                />
                <h3 className="font-heading font-bold text-base text-slate-800">
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

      {/* Saglik Dialog */}
      <Dialog open={saglikOpen} onOpenChange={setSaglikOpen}>
        <DialogContent className="rounded-[1.5rem] border-0 shadow-2xl max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg">
              {t("sigorta.saglik")}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            <Button
              variant="outline"
              className="h-16 rounded-2xl justify-start gap-3 text-base border-slate-200 hover:border-rose-300 hover:bg-rose-50/50"
              onClick={() => {
                setSaglikOpen(false);
                navigate("/dashboard/sigorta/saglik?type=yabanci");
              }}
            >
              <div className="w-10 h-10 rounded-xl bg-[#F5D5D5] flex items-center justify-center">
                <HeartPulse className="h-5 w-5 text-[#B85555]" />
              </div>
              {t("form.foreign")}
            </Button>
            <Button
              variant="outline"
              className="h-16 rounded-2xl justify-start gap-3 text-base border-slate-200 hover:border-green-300 hover:bg-green-50/50"
              onClick={() => {
                setSaglikOpen(false);
                navigate("/dashboard/sigorta/saglik?type=turk");
              }}
            >
              <div className="w-10 h-10 rounded-xl bg-[#C8E6D0] flex items-center justify-center">
                <HeartPulse className="h-5 w-5 text-[#3A8A56]" />
              </div>
              {t("form.turkish")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Arac Dialog */}
      <Dialog open={aracOpen} onOpenChange={setAracOpen}>
        <DialogContent className="rounded-[1.5rem] border-0 shadow-2xl max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg">
              {t("sigorta.arac")}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            <Button
              variant="outline"
              className="h-16 rounded-2xl justify-start gap-3 text-base border-slate-200 hover:border-blue-300 hover:bg-blue-50/50"
              onClick={() => {
                setAracOpen(false);
                navigate("/dashboard/sigorta/arac/trafik");
              }}
            >
              <div className="w-10 h-10 rounded-xl bg-[#C8D5F5] flex items-center justify-center">
                <Car className="h-5 w-5 text-[#4A6EC5]" />
              </div>
              {t("sigorta.trafik")}
            </Button>
            <Button
              variant="outline"
              className="h-16 rounded-2xl justify-start gap-3 text-base border-slate-200 hover:border-violet-300 hover:bg-violet-50/50"
              onClick={() => {
                setAracOpen(false);
                navigate("/dashboard/sigorta/arac/kasko");
              }}
            >
              <div className="w-10 h-10 rounded-xl bg-[#E0D4F0] flex items-center justify-center">
                <Car className="h-5 w-5 text-[#7B5EA7]" />
              </div>
              {t("sigorta.kasko")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
