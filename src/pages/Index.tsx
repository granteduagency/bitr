import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Form } from "@heroui/react";
import { ClientPhoneField } from "@/components/shared/ClientPhoneField";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { InstallAppButton } from "@/components/shared/InstallAppButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getDefaultClientPhoneCountry,
  normalizeClientName,
  validateClientName,
  validateClientPhone,
  sanitizeClientNameInput,
} from "@/lib/client-entry";
import {
  clearStoredClientIdentity,
  getStoredClientIdentity,
  saveStoredClientIdentity,
  syncStoredClientLead,
} from "@/lib/client-tracking";
import { Plane, Car, Luggage, Cloud, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const Index = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
  });
  const [phoneCountry, setPhoneCountry] = useState(getDefaultClientPhoneCountry());
  const [touched, setTouched] = useState({
    name: false,
    phone: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedName = useMemo(() => normalizeClientName(form.name), [form.name]);
  const nameError = useMemo(() => validateClientName(form.name), [form.name]);
  const phoneError = useMemo(
    () => validateClientPhone(form.phone, phoneCountry),
    [form.phone, phoneCountry],
  );
  const canSubmit = !nameError && !phoneError;
  const redirectTarget =
    typeof location.state === "object" &&
    location.state !== null &&
    "from" in location.state &&
    typeof (location.state as { from?: unknown }).from === "string" &&
    (location.state as { from: string }).from.startsWith("/dashboard")
      ? (location.state as { from: string }).from
      : "/dashboard";

  useEffect(() => {
    const identity = getStoredClientIdentity();

    if (identity) {
      setForm({
        name: identity.name,
        phone: identity.phone,
      });
      setPhoneCountry(identity.country);
      navigate(redirectTarget, { replace: true });
      return;
    }

    clearStoredClientIdentity();
  }, [navigate, redirectTarget]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTouched({ name: true, phone: true });

    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    let shouldResetSubmitting = true;

    try {
      saveStoredClientIdentity({
        name: normalizedName,
        phone: form.phone,
        country: phoneCountry,
      });
      await syncStoredClientLead({
        source: "landing",
        preferredCountry: phoneCountry,
      }).catch((error) => {
        console.error("Lead sync error:", error);
      });
      shouldResetSubmitting = false;
      navigate(redirectTarget, { replace: true });
    } finally {
      if (shouldResetSubmitting) {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-4 lg:p-8 bg-white">
      {/* Pastel Background Elements matching the Figma design */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[0%] left-[-10%] w-[500px] h-[500px] bg-[#d1fae5]/50 rounded-full blur-[100px]" />
        <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-[#fef3c7]/60 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] bg-[#fce7f3]/50 rounded-full blur-[100px]" />
      </div>

      <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
        <InstallAppButton />
        <LanguageSwitcher />
      </div>

      <AnimatePresence mode="wait">
        {!showForm ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md z-10 flex flex-col items-center justify-center text-center"
          >
            {/* Playful Illustration Wrapper */}
            <div className="relative w-full aspect-square max-w-[320px] flex items-center justify-center mb-6">
              {/* Dynamic Icons & Elements representing the Figma illustration */}

              {/* Background Cloud */}
              <motion.div
                animate={{ x: [-10, 10, -10] }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute top-[20%] left-[-5%] z-0 text-slate-200"
              >
                <Cloud
                  className="w-24 h-24 fill-current drop-shadow-sm"
                  strokeWidth={1}
                />
              </motion.div>

              {/* Central Main Element (Hot air balloon representation) */}
              <motion.div
                animate={{ y: [-8, 8, -8] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="relative z-10 flex items-center justify-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 500 500"
                  width="300"
                  height="300"
                >
                  <defs>
                    <clipPath id="balloon-clip">
                      <path d="M 250,100 C 120,100 120,270 220,340 Q 250,355 280,340 C 380,270 380,100 250,100 Z" />
                    </clipPath>
                    <linearGradient
                      id="multi-grad"
                      gradientUnits="userSpaceOnUse"
                      x1="120"
                      y1="0"
                      x2="380"
                      y2="0"
                    >
                      <stop offset="0%" stopColor="#FE7A0C" />
                      <stop offset="25%" stopColor="#FF2E62" />
                      <stop offset="50%" stopColor="#FEC722" />
                      <stop offset="75%" stopColor="#17F59E" />
                      <stop offset="100%" stopColor="#02FF9B" />
                    </linearGradient>
                  </defs>

                  <g>
                    <line
                      x1="226"
                      y1="345"
                      x2="232"
                      y2="400"
                      stroke="#4a151e"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                    <line
                      x1="250"
                      y1="345"
                      x2="250"
                      y2="400"
                      stroke="#4a151e"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                    <line
                      x1="274"
                      y1="345"
                      x2="268"
                      y2="400"
                      stroke="#4a151e"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />

                    <g id="basket">
                      <rect
                        x="225"
                        y="400"
                        width="50"
                        height="28"
                        rx="5"
                        fill="#e5a965"
                        stroke="#4a151e"
                        strokeWidth="6"
                        strokeLinejoin="round"
                      />
                      <line
                        x1="230"
                        y1="414"
                        x2="270"
                        y2="414"
                        stroke="#4a151e"
                        strokeWidth="3"
                        strokeLinecap="round"
                        opacity="0.5"
                      />
                      <rect
                        x="222"
                        y="394"
                        width="56"
                        height="10"
                        rx="3"
                        fill="#e5a965"
                        stroke="#4a151e"
                        strokeWidth="6"
                        strokeLinejoin="round"
                      />
                    </g>

                    <g id="balloon">
                      <rect
                        x="0"
                        y="0"
                        width="500"
                        height="500"
                        fill="url(#multi-grad)"
                        clipPath="url(#balloon-clip)"
                      />
                      <path
                        d="M 250,100 C 170,100 170,270 235,346"
                        fill="none"
                        stroke="#4a151e"
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                      <path
                        d="M 250,100 C 215,100 215,280 245,350"
                        fill="none"
                        stroke="#4a151e"
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                      <path
                        d="M 250,100 C 285,100 285,280 255,350"
                        fill="none"
                        stroke="#4a151e"
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                      <path
                        d="M 250,100 C 330,100 330,270 265,346"
                        fill="none"
                        stroke="#4a151e"
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                      <path
                        d="M 250,100 C 120,100 120,270 220,340 Q 250,355 280,340 C 380,270 380,100 250,100 Z"
                        fill="none"
                        stroke="#4a151e"
                        strokeWidth="6"
                        strokeLinejoin="round"
                      />
                      <rect
                        x="216"
                        y="336"
                        width="68"
                        height="12"
                        rx="6"
                        fill="#4a151e"
                      />
                    </g>
                  </g>
                </svg>
              </motion.div>

              {/* Foreground Cloud */}
              <motion.div
                animate={{ x: [10, -10, 10] }}
                transition={{
                  duration: 7,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1,
                }}
                className="absolute top-[40%] right-[-15%] z-20 text-white"
              >
                <Cloud
                  className="w-28 h-28 fill-current drop-shadow-[0_4px_12px_rgba(0,0,0,0.1)] text-[#6b2c3a]"
                  strokeWidth={2.5}
                />
              </motion.div>

              {/* Smaller surrounding icons */}
              <motion.div
                animate={{ y: [-4, 4, -4], rotate: [-5, 5, -5] }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.5,
                }}
                className="absolute top-[5%] right-[10%] z-10 shadow-sm"
              >
                <Plane
                  className="w-8 h-8 text-[#6b2c3a] fill-[#ffcce0] rotate-12"
                  strokeWidth={2.5}
                />
              </motion.div>

              <motion.div
                animate={{ y: [6, -6, 6] }}
                transition={{
                  duration: 4.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1.5,
                }}
                className="absolute bottom-[20%] left-[-5%] z-10 shadow-sm"
              >
                <Car
                  className="w-10 h-10 text-[#6b2c3a] fill-[#ffc95e] -rotate-6"
                  strokeWidth={2.5}
                />
              </motion.div>

              <motion.div
                animate={{ y: [-5, 5, -5] }}
                transition={{
                  duration: 3.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1,
                }}
                className="absolute bottom-[5%] right-[5%] z-10 shadow-sm"
              >
                <Luggage
                  className="w-8 h-8 text-[#6b2c3a] fill-[#ff5e8e] rotate-[-15deg]"
                  strokeWidth={2.5}
                />
              </motion.div>
            </div>

            <h1 className="font-heading text-3xl font-extrabold text-slate-900 tracking-tight mb-4 px-2 mt-12">
              {t("landing.title")}
            </h1>
            <p className="text-slate-600 text-[15px] font-medium leading-relaxed mb-10 px-8">
              {t("landing.subtitle")}
            </p>

            <Button
              type="button"
              onClick={() => setShowForm(true)}
              className="rounded-full bg-black text-white hover:bg-black/90 px-14 py-7 w-full max-w-[280px] text-lg font-bold shadow-[0_8px_30px_rgba(0,0,0,0.15)] mt-2"
            >
              {t("landing.getStarted")}
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md z-10 relative mt-10"
          >
            <div className="relative bg-transparent shadow-none border-none p-8 sm:p-10 flex flex-col items-center min-h-[500px]">
              {/* Back button */}
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
                className="absolute top-6 left-6 z-20 h-10 w-10 rounded-full border-slate-200 bg-white p-0 text-slate-400 shadow-sm hover:bg-white hover:text-black"
                aria-label="Back"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </Button>

              {/* Pastel floating backgrounds from the reference image */}
              <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-[#FEF4E1] blur-[40px] rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
              <div className="absolute top-1/4 left-0 w-[250px] h-[250px] bg-[#E3F9F1] blur-[50px] rounded-full -translate-x-1/3 pointer-events-none" />
              <div className="absolute bottom-1/4 right-0 w-[220px] h-[220px] bg-[#FEF0F2] blur-[50px] rounded-full translate-x-1/4 translate-y-1/4 pointer-events-none" />

              <div className="w-full flex flex-col gap-6 mt-6 z-10">
                <div className="text-center space-y-4">
                  {/* Passport SVG Icon */}
                  <div className="w-28 h-28 mx-auto -mb-2 transition-transform hover:scale-105 duration-300">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 400 400"
                    >
                      <defs>
                        <clipPath id="red-ticket-clip">
                          <rect
                            x="-50"
                            y="-75"
                            width="100"
                            height="150"
                            rx="16"
                          />
                        </clipPath>
                        <clipPath id="globe-clip">
                          <circle cx="0" cy="-15" r="45" />
                        </clipPath>
                        <clipPath id="badge-clip">
                          <rect x="-27" y="60" width="54" height="16" rx="6" />
                        </clipPath>
                      </defs>

                      <g transform="translate(200, 215) rotate(-10)">
                        <rect
                          x="-70"
                          y="-100"
                          width="140"
                          height="200"
                          rx="24"
                          fill="#FFFFFF"
                          stroke="#5A1827"
                          strokeWidth="8"
                          strokeLinejoin="round"
                        />
                      </g>

                      <g transform="translate(230, 140) rotate(25)">
                        <rect
                          x="-50"
                          y="-75"
                          width="100"
                          height="150"
                          rx="16"
                          fill="#E93465"
                        />
                        <g clipPath="url(#red-ticket-clip)">
                          <rect
                            x="-15"
                            y="-85"
                            width="16"
                            height="170"
                            fill="#FFFFFF"
                            stroke="#5A1827"
                            strokeWidth="6"
                          />
                          <rect
                            x="10"
                            y="-85"
                            width="26"
                            height="170"
                            fill="#E4A45A"
                            stroke="#5A1827"
                            strokeWidth="6"
                          />
                        </g>
                        <rect
                          x="-50"
                          y="-75"
                          width="100"
                          height="150"
                          rx="16"
                          fill="none"
                          stroke="#5A1827"
                          strokeWidth="8"
                          strokeLinejoin="round"
                        />
                      </g>

                      <g transform="translate(185, 200) rotate(-10)">
                        <rect
                          x="-70"
                          y="-100"
                          width="140"
                          height="200"
                          rx="24"
                          fill="#F57A18"
                          stroke="#5A1827"
                          strokeWidth="8"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M -60 70 L -60 -76 A 14 14 0 0 1 -46 -90 L 50 -90"
                          fill="none"
                          stroke="#FFAE45"
                          strokeWidth="6"
                          strokeLinecap="round"
                        />

                        <g transform="translate(0, 0)">
                          <g clipPath="url(#globe-clip)">
                            <rect
                              x="-50"
                              y="-65"
                              width="100"
                              height="100"
                              fill="#3CF3D8"
                            />
                            <rect
                              x="-50"
                              y="-65"
                              width="50"
                              height="50"
                              fill="#1DA7F8"
                            />
                            <rect
                              x="0"
                              y="-15"
                              width="50"
                              height="50"
                              fill="#1DA7F8"
                            />
                          </g>

                          <line
                            x1="0"
                            y1="-60"
                            x2="0"
                            y2="30"
                            stroke="#5A1827"
                            strokeWidth="5"
                          />
                          <line
                            x1="-45"
                            y1="-15"
                            x2="45"
                            y2="-15"
                            stroke="#5A1827"
                            strokeWidth="5"
                          />
                          <ellipse
                            cx="0"
                            cy="-15"
                            rx="45"
                            ry="16"
                            fill="none"
                            stroke="#5A1827"
                            strokeWidth="5"
                          />
                          <ellipse
                            cx="0"
                            cy="-15"
                            rx="18"
                            ry="45"
                            fill="none"
                            stroke="#5A1827"
                            strokeWidth="5"
                          />
                          <circle
                            cx="0"
                            cy="-15"
                            r="45"
                            fill="none"
                            stroke="#5A1827"
                            strokeWidth="8"
                          />
                        </g>

                        <g transform="translate(0, 0)">
                          <g clipPath="url(#badge-clip)">
                            <rect
                              x="-27"
                              y="60"
                              width="54"
                              height="16"
                              fill="#FFD62E"
                            />
                            <rect
                              x="-27"
                              y="68"
                              width="54"
                              height="10"
                              fill="#E89B10"
                            />
                          </g>
                          <rect
                            x="-27"
                            y="60"
                            width="54"
                            height="16"
                            rx="6"
                            fill="none"
                            stroke="#5A1827"
                            strokeWidth="6"
                            strokeLinejoin="round"
                          />
                        </g>
                      </g>
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold font-heading text-slate-900">
                    {t("landing.loginTitle")}
                  </h2>
                </div>

                <Form
                  className="flex flex-col gap-4 w-full"
                  onSubmit={onSubmit}
                >
                  <Input
                    required
                    name="name"
                    value={form.name}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        name: sanitizeClientNameInput(event.target.value),
                      }))
                    }
                    onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
                    placeholder={t("landing.namePlaceholder")}
                    autoComplete="name"
                    maxLength={60}
                    className={`w-full h-14 bg-white/50 hover:bg-white focus:bg-white border-2 rounded-[0.85rem] px-4 text-[15px] font-medium text-slate-900 placeholder:text-slate-500 shadow-none focus-visible:ring-0 ${touched.name && nameError ? "border-red-500 focus-visible:border-red-500" : "border-black focus-visible:border-black"}`}
                  />
                  <div className="mt-[-6px] min-h-[20px] px-1">
                    {touched.name && nameError ? (
                      <p className="text-sm font-medium text-red-500">{t(nameError)}</p>
                    ) : (
                      <p className="text-xs font-medium text-slate-400">{t("landing.nameHelper")}</p>
                    )}
                  </div>

                  <ClientPhoneField
                    value={form.phone}
                    country={phoneCountry}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, phone: value }))
                    }
                    onCountryChange={(country) => {
                      setPhoneCountry(country);
                    }}
                    onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
                    placeholder={t("landing.phonePlaceholder")}
                    autoComplete="tel"
                    locale={i18n.language}
                    invalid={Boolean(touched.phone && phoneError)}
                  />
                  <div className="mt-[-6px] min-h-[20px] px-1">
                    {touched.phone && phoneError ? (
                      <p className="text-sm font-medium text-red-500">{t(phoneError)}</p>
                    ) : (
                      <p className="text-xs font-medium text-slate-400">{t("landing.phoneHelper")}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={!canSubmit || isSubmitting}
                    className="w-full mt-2 h-14 bg-black text-white hover:bg-black/90 rounded-[2rem] text-base font-bold shadow-lg"
                  >
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isSubmitting ? t("landing.loginLoading") : t("landing.loginBtn")}
                  </Button>
                </Form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
