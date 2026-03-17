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

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [calismaOpen, setCalismaOpen] = useState(false);
  const [aracOpen, setAracOpen] = useState(false);

  const clientName = localStorage.getItem('client_name') || '';

  const services = [
    { icon: Shield, title: t('services.ikamet'), href: '/dashboard/ikamet', color: '#1A56DB' },
    { icon: Briefcase, title: t('services.calisma'), href: '', color: '#7C3AED', onClick: () => setCalismaOpen(true) },
    { icon: HeartPulse, title: t('services.sigorta'), href: '/dashboard/sigorta', color: '#E02424' },
    { icon: AlertTriangle, title: t('services.deport'), href: '/dashboard/deport', color: '#FF5A1F' },
    { icon: GraduationCap, title: t('services.universite'), href: '/dashboard/universite', color: '#0E9F6E' },
    { icon: Plane, title: t('services.viza'), href: '/dashboard/viza', color: '#3F83F8' },
    { icon: Building2, title: t('services.konsolosluk'), href: '/dashboard/konsolosluk', color: '#6B7280' },
    { icon: Languages, title: t('services.tercume'), href: '/dashboard/tercume', color: '#8B5CF6' },
    { icon: Scale, title: t('services.hukuk'), href: '/dashboard/hukuk', color: '#D97706' },
    { icon: Phone, title: t('services.iletisim'), href: '/dashboard/iletisim', color: '#059669' },
  ];

  return (
    <div className="space-y-6 pb-20 lg:pb-6 animate-fade-in">
      {clientName && (
        <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
          <p className="text-sm text-muted-foreground">{t('landing.welcome')}</p>
          <p className="font-heading font-bold text-lg">{clientName}</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {services.map((service) => (
          <ServiceCard key={service.title} {...service} />
        ))}
      </div>

      {/* Calisma Modal */}
      <Dialog open={calismaOpen} onOpenChange={setCalismaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">{t('calisma.selectType')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Button variant="outline" className="h-16 text-base" onClick={() => { setCalismaOpen(false); navigate('/dashboard/calisma/yurt-ici'); }}>
              {t('calisma.yurtIci')}
            </Button>
            <Button variant="outline" className="h-16 text-base" onClick={() => { setCalismaOpen(false); navigate('/dashboard/calisma/yurt-disi'); }}>
              {t('calisma.yurtDisi')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Arac Modal (used by sigorta) */}
      <Dialog open={aracOpen} onOpenChange={setAracOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">{t('sigorta.selectType')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Button variant="outline" className="h-16 text-base" onClick={() => { setAracOpen(false); navigate('/dashboard/sigorta/arac/trafik'); }}>
              {t('sigorta.trafik')}
            </Button>
            <Button variant="outline" className="h-16 text-base" onClick={() => { setAracOpen(false); navigate('/dashboard/sigorta/arac/kasko'); }}>
              {t('sigorta.kasko')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
