import { CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export function SuccessScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="px-4 py-10 md:py-16"
    >
      <div className="relative mx-auto max-w-2xl overflow-hidden rounded-[2.2rem] border border-slate-200 bg-white px-6 py-10 text-center shadow-[0_24px_60px_-30px_rgba(15,23,42,0.35)] sm:px-10 sm:py-12">
        <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-[#D4ECFA]/60 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-14 -left-10 h-40 w-40 rounded-full bg-[#C8E6D0]/50 blur-3xl" />

        <motion.div
          initial={{ scale: 0.88, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.08, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-[#D5F0E8] shadow-[0_18px_35px_-18px_rgba(46,125,96,0.6)]"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#2E7D60]/15 bg-white/70">
            <CheckCircle className="h-9 w-9 text-[#2E7D60]" strokeWidth={2.2} />
          </div>
        </motion.div>

        <div className="relative space-y-3">
          <h2 className="font-heading text-3xl font-extrabold tracking-tight text-slate-900 sm:text-[2.15rem]">
            {t('common.formSubmitted')}
          </h2>
          <p className="mx-auto max-w-lg text-sm font-medium leading-6 text-slate-500 sm:text-base">
            {t('common.formSubmittedDesc')}
          </p>
        </div>

        <div className="relative mt-9 flex justify-center">
          <Button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="h-12 rounded-full bg-black px-7 text-sm font-semibold text-white hover:bg-black/90"
          >
            {t('nav.home')}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
