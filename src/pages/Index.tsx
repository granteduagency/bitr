import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { Stamp, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const Index = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    localStorage.setItem('client_name', name.trim());
    localStorage.setItem('client_phone', phone.trim());
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Background */}
      <div className="absolute inset-0 bg-background">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full opacity-20 blur-3xl gradient-primary" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full opacity-10 blur-3xl bg-accent" />
      </div>

      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md"
      >
        <div className="rounded-3xl border border-border/40 bg-card/80 backdrop-blur-xl shadow-xl overflow-hidden">
          {/* Header gradient bar */}
          <div className="h-1.5 gradient-primary" />

          <div className="p-8 space-y-8">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-center space-y-4"
            >
              <div className="mx-auto w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center shadow-primary">
                <Stamp className="h-10 w-10 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-heading text-2xl font-extrabold tracking-tight">{t('landing.title')}</h1>
                <p className="text-muted-foreground text-sm mt-2 leading-relaxed">{t('landing.subtitle')}</p>
              </div>
            </motion.div>

            {/* Form */}
            <motion.form
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              <div className="space-y-2">
                <label className="text-sm font-semibold">{t('landing.nameLabel')}</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('landing.namePlaceholder')}
                  className="h-12 rounded-xl bg-muted/50 border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">{t('landing.phoneLabel')}</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t('landing.phonePlaceholder')}
                  type="tel"
                  className="h-12 rounded-xl bg-muted/50 border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                />
              </div>
              <Button type="submit" className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold text-base shadow-primary hover:shadow-lg transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]">
                {t('landing.continue')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.form>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Index;
