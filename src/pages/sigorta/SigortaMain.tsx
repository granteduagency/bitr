import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { HeartPulse, Plane, Mountain, Car, Palmtree } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function SigortaMain() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [saglikOpen, setSaglikOpen] = useState(false);
  const [aracOpen, setAracOpen] = useState(false);

  const items = [
    { icon: HeartPulse, label: t('sigorta.saglik'), color: '#E02424', onClick: () => setSaglikOpen(true) },
    { icon: Plane, label: t('sigorta.seyahat'), color: '#3F83F8', path: '/dashboard/sigorta/seyahat' },
    { icon: Mountain, label: t('sigorta.deprem'), color: '#FF5A1F', path: '/dashboard/sigorta/deprem' },
    { icon: Car, label: t('sigorta.arac'), color: '#6B7280', onClick: () => setAracOpen(true) },
    { icon: Palmtree, label: t('sigorta.turizm'), color: '#0E9F6E', path: '/dashboard/sigorta/turizm' },
  ];

  return (
    <div className="space-y-4 animate-fade-in pb-20 lg:pb-0">
      <h2 className="font-heading text-xl font-bold">{t('sigorta.title')}</h2>
      <div className="grid gap-3">
        {items.map((item) => (
          <Card key={item.label} className="cursor-pointer hover:shadow-md transition-all hover:border-primary/30"
            onClick={() => item.onClick ? item.onClick() : item.path && navigate(item.path)}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: item.color + '15', color: item.color }}>
                <item.icon className="h-6 w-6" />
              </div>
              <span className="font-heading font-semibold">{item.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={saglikOpen} onOpenChange={setSaglikOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('sigorta.saglik')}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3">
            <Button variant="outline" className="h-14" onClick={() => { setSaglikOpen(false); navigate('/dashboard/sigorta/saglik?type=yabanci'); }}>{t('form.foreign')}</Button>
            <Button variant="outline" className="h-14" onClick={() => { setSaglikOpen(false); navigate('/dashboard/sigorta/saglik?type=turk'); }}>{t('form.turkish')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={aracOpen} onOpenChange={setAracOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('sigorta.arac')}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3">
            <Button variant="outline" className="h-14" onClick={() => { setAracOpen(false); navigate('/dashboard/sigorta/arac/trafik'); }}>{t('sigorta.trafik')}</Button>
            <Button variant="outline" className="h-14" onClick={() => { setAracOpen(false); navigate('/dashboard/sigorta/arac/kasko'); }}>{t('sigorta.kasko')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
