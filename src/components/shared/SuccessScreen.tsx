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
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center py-20 px-4 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
        className="w-24 h-24 rounded-full gradient-success flex items-center justify-center mb-8 shadow-lg"
      >
        <CheckCircle className="h-12 w-12 text-success-foreground" />
      </motion.div>
      <h2 className="text-2xl font-heading font-extrabold mb-3">{t('common.formSubmitted')}</h2>
      <p className="text-muted-foreground max-w-sm mb-10">{t('common.formSubmittedDesc')}</p>
      <Button onClick={() => navigate('/dashboard')} className="h-12 px-8 rounded-xl gradient-primary text-primary-foreground font-semibold shadow-primary">
        {t('nav.home')}
      </Button>
    </motion.div>
  );
}
