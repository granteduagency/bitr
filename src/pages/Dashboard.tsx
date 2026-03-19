import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ServiceCard } from "@/components/shared/ServiceCard";
import {
  Shield,
  Briefcase,
  HeartPulse,
  AlertTriangle,
  GraduationCap,
  Plane,
  Building2,
  Languages,
  Scale,
  Phone,
} from "lucide-react";
import { Modal } from "@heroui/react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

// Soft pastel color palette matching the Figma design
const PASTEL_CARDS = [
  { bgColor: "#C8D5F5", color: "#4A6EC5" }, // soft blue
  { bgColor: "#F2E8A0", color: "#8B7E2A" }, // soft yellow
  { bgColor: "#C8E6D0", color: "#3A8A56" }, // soft mint
  { bgColor: "#E0D4F0", color: "#7B5EA7" }, // soft lavender
  { bgColor: "#FDD6B5", color: "#C67832" }, // soft peach
  { bgColor: "#D4ECFA", color: "#3A8DC1" }, // soft sky
  { bgColor: "#F5D5D5", color: "#B85555" }, // soft rose
  { bgColor: "#E8E0F8", color: "#6B5B95" }, // soft violet
  { bgColor: "#DCEDC8", color: "#6B8E23" }, // soft olive
  { bgColor: "#D5F0E8", color: "#2E7D60" }, // soft teal
];

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [calismaOpen, setCalismaOpen] = useState(false);

  const services = [
    { icon: Shield, title: t("services.ikamet"), href: "/dashboard/ikamet" },
    {
      icon: Briefcase,
      title: t("services.calisma"),
      href: "",
      onClick: () => setCalismaOpen(true),
    },
    {
      icon: HeartPulse,
      title: t("services.sigorta"),
      href: "/dashboard/sigorta",
    },
    {
      icon: AlertTriangle,
      title: t("services.deport"),
      href: "/dashboard/deport",
    },
    {
      icon: GraduationCap,
      title: t("services.universite"),
      href: "/dashboard/universite",
    },
    { icon: Plane, title: t("services.viza"), href: "/dashboard/viza" },
    {
      icon: Building2,
      title: t("services.konsolosluk"),
      href: "/dashboard/konsolosluk",
    },
    {
      icon: Languages,
      title: t("services.tercume"),
      href: "/dashboard/tercume",
    },
    { icon: Scale, title: t("services.hukuk"), href: "/dashboard/hukuk" },
    { icon: Phone, title: t("services.iletisim"), href: "/dashboard/iletisim" },
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Service Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5 lg:gap-6">
        {services.map((service, i) => (
          <ServiceCard
            key={service.title}
            {...service}
            bgColor={PASTEL_CARDS[i % PASTEL_CARDS.length].bgColor}
            color={PASTEL_CARDS[i % PASTEL_CARDS.length].color}
            index={i}
          />
        ))}
      </div>

      {/* HeroUI Modal for Ish Ruxsatnomasi */}
      <Modal.Backdrop isOpen={calismaOpen} onOpenChange={setCalismaOpen}>
        <Modal.Container placement="center">
          <Modal.Dialog className="sm:max-w-[380px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Icon className="bg-[#F2E8A0] text-[#8B7E2A]">
                <Briefcase className="size-5" />
              </Modal.Icon>
              <Modal.Heading>{t("calisma.selectType")}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className="flex flex-col gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex h-auto items-center gap-4 rounded-2xl border-slate-200 p-4 text-left hover:border-blue-300 hover:bg-blue-50/50 justify-start"
                  onClick={() => {
                    setCalismaOpen(false);
                    navigate("/dashboard/calisma/yurt-ici");
                  }}
                >
                  <div className="w-12 h-12 rounded-xl bg-[#C8D5F5] flex items-center justify-center shrink-0">
                    <Briefcase className="h-5 w-5 text-[#4A6EC5]" />
                  </div>
                  <div>
                    <p className="font-heading font-bold text-slate-800">
                      {t("calisma.yurtIci")}
                    </p>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Turkiya ichida ishlash uchun
                    </p>
                  </div>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex h-auto items-center gap-4 rounded-2xl border-slate-200 p-4 text-left hover:border-violet-300 hover:bg-violet-50/50 justify-start"
                  onClick={() => {
                    setCalismaOpen(false);
                    navigate("/dashboard/calisma/yurt-disi");
                  }}
                >
                  <div className="w-12 h-12 rounded-xl bg-[#E0D4F0] flex items-center justify-center shrink-0">
                    <Plane className="h-5 w-5 text-[#7B5EA7]" />
                  </div>
                  <div>
                    <p className="font-heading font-bold text-slate-800">
                      {t("calisma.yurtDisi")}
                    </p>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Chet elda ishlash uchun
                    </p>
                  </div>
                </Button>
              </div>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
}
