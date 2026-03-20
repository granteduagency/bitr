import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useState } from "react";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  MessageCircle,
  Send,
  Camera,
  Facebook,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  DEFAULT_CONTACT_SETTINGS,
  fetchContactSettings,
  getLocalizedContactSettings,
  type ContactSettingsRow,
} from "@/lib/contact-settings";

const CONTACT_COLORS = [
  { bg: "#F5D5D5", color: "#B85555" },
  { bg: "#C8D5F5", color: "#4A6EC5" },
  { bg: "#C8E6D0", color: "#3A8A56" },
  { bg: "#F2E8A0", color: "#8B7E2A" },
];

const SOCIAL_ITEMS = [
  { icon: MessageCircle, label: "WhatsApp", bg: "#C8E6D0", color: "#3A8A56" },
  { icon: Send, label: "Telegram", bg: "#D4ECFA", color: "#3A8DC1" },
  { icon: Camera, label: "Instagram", bg: "#E0D4F0", color: "#7B5EA7" },
  { icon: Facebook, label: "Facebook", bg: "#C8D5F5", color: "#4A6EC5" },
];

export default function IletisimPage() {
  const { t, i18n } = useTranslation();
  const [contactSettings, setContactSettings] = useState<ContactSettingsRow>(
    DEFAULT_CONTACT_SETTINGS,
  );

  useEffect(() => {
    let mounted = true;

    fetchContactSettings()
      .then((data) => {
        if (mounted) {
          setContactSettings(data);
        }
      })
      .catch((error) => {
        console.error("Contact settings load error:", error);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const localizedContent = useMemo(
    () => getLocalizedContactSettings(contactSettings, i18n.language),
    [contactSettings, i18n.language],
  );

  const items = [
    {
      icon: MapPin,
      label: t("iletisim.address"),
      value: localizedContent.address,
    },
    {
      icon: Phone,
      label: t("iletisim.phone"),
      value: localizedContent.phone,
    },
    { icon: Mail, label: t("iletisim.email"), value: localizedContent.email },
    {
      icon: Clock,
      label: t("iletisim.workingHours"),
      value: localizedContent.workingHours,
    },
  ];

  const socialItems = SOCIAL_ITEMS.map((item) => ({
    ...item,
    href:
      item.label === "WhatsApp"
        ? localizedContent.socialLinks.whatsapp
        : item.label === "Telegram"
          ? localizedContent.socialLinks.telegram
          : item.label === "Instagram"
            ? localizedContent.socialLinks.instagram
            : localizedContent.socialLinks.facebook,
  }));

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-slate-900">
          {t("iletisim.title")}
        </h2>
        <p className="text-slate-400 text-sm mt-1">{localizedContent.subtitle}</p>
      </motion.div>

      {/* Contact Info - Bento cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        {items.map((item, i) => {
          const style = CONTACT_COLORS[i];
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.45 }}
              className="rounded-[1.5rem] p-5 md:p-6 min-h-[120px] flex flex-col justify-between"
              style={{ backgroundColor: style.bg }}
            >
              <div className="w-10 h-10 rounded-full bg-white/60 flex items-center justify-center mb-3">
                <item.icon className="h-5 w-5" style={{ color: style.color }} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  {item.label}
                </p>
                <p className="font-heading font-bold text-slate-800 text-[0.95rem]">
                  {item.value}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Social Media */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="space-y-4"
      >
        <h3 className="font-heading font-bold text-slate-900 text-lg">
          {t("iletisim.socialMedia")}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {socialItems.map((sm, i) => (
            <a
              key={i}
              href={sm.href || undefined}
              target={sm.href ? "_blank" : undefined}
              rel={sm.href ? "noreferrer" : undefined}
              className="rounded-[1.25rem] p-4 flex items-center gap-3 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
              style={{ backgroundColor: sm.bg }}
            >
              <sm.icon
                className="w-5 h-5"
                style={{ color: sm.color }}
                strokeWidth={2}
              />
              <span className="font-heading font-bold text-sm text-slate-800">
                {sm.label}
              </span>
            </a>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
