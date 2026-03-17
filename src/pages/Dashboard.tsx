import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ServiceCard } from '@/components/shared/ServiceCard';
import {
  Shield, Briefcase, HeartPulse, AlertTriangle,
  GraduationCap, Plane, Building2, Languages,
  Scale, Phone,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [calismaOpen, setCalismaOpen] = useState(false);

  const clientName = localStorage.getItem('client_name') || '';

  const services = [
    { icon: Shield, title: t('services.ikamet'), href: '/dashboard/ikamet', color: '#3B82F6' },
    { icon: Briefcase, title: t('services.calisma'), href: '', color: '#8B5CF6', onClick: () => setCalismaOpen(true) },
    { icon: HeartPulse, title: t('services.sigorta'), href: '/dashboard/sigorta', color: '#EF4444' },
    { icon: AlertTriangle, title: t('services.deport'), href: '/dashboard/deport', color: '#F59E0B' },
    { icon: GraduationCap, title: t('services.universite'), href: '/dashboard/universite', color: '#10B981' },
    { icon: Plane, title: t('services.viza'), href: '/dashboard/viza', color: '#0EA5E9' },
    { icon: Building2, title: t('services.konsolosluk'), href: '/dashboard/konsolosluk', color: '#6366F1' },
    { icon: Languages, title: t('services.tercume'), href: '/dashboard/tercume', color: '#A855F7' },
    { icon: Scale, title: t('services.hukuk'), href: '/dashboard/hukuk', color: '#D97706' },
    { icon: Phone, title: t('services.iletisim'), href: '/dashboard/iletisim', color: '#059669' },
  ];

  return (
    <div className="space-y-6 pb-24 lg:pb-6">
      {clientName && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-2xl gradient-primary p-5 text-primary-foreground"
        >
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-primary-foreground/10 -mr-8 -mt-8" />
          <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full bg-primary-foreground/5 -ml-4 -mb-4" />
          <div className="relative">
            <p className="text-sm opacity-80">{t('landing.welcome')}</p>
            <p className="font-heading font-extrabold text-xl mt-0.5">{clientName}</p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {services.map((service, i) => (
          <ServiceCard key={service.title} {...service} index={i} />
        ))}
      </div>

      {/* Calisma Modal */}
      <Dialog open={calismaOpen} onOpenChange={setCalismaOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg">{t('calisma.selectType')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            <Button variant="outline" className="h-16 text-base rounded-xl justify-start gap-3 hover:border-primary/30 hover:bg-primary/5" onClick={() => { setCalismaOpen(false); navigate('/dashboard/calisma/yurt-ici'); }}>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Briefcase className="h-5 w-5 text-primary" /></div>
              {t('calisma.yurtIci')}
            </Button>
            <Button variant="outline" className="h-16 text-base rounded-xl justify-start gap-3 hover:border-accent/30 hover:bg-accent/5" onClick={() => { setCalismaOpen(false); navigate('/dashboard/calisma/yurt-disi'); }}>
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center"><Plane className="h-5 w-5 text-accent" /></div>
              {t('calisma.yurtDisi')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
