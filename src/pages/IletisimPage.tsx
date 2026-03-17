import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';

export default function IletisimPage() {
  const { t } = useTranslation();

  const items = [
    { icon: MapPin, label: t('iletisim.address'), value: t('iletisim.addressValue') },
    { icon: Phone, label: t('iletisim.phone'), value: t('iletisim.phoneValue') },
    { icon: Mail, label: t('iletisim.email'), value: t('iletisim.emailValue') },
    { icon: Clock, label: t('iletisim.workingHours'), value: t('iletisim.workingHoursValue') },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-20 lg:pb-6">
      <h2 className="font-heading text-xl font-bold">{t('iletisim.title')}</h2>
      <div className="space-y-3">
        {items.map(item => (
          <Card key={item.label}>
            <CardContent className="flex items-start gap-4 p-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><item.icon className="h-5 w-5 text-primary" /></div>
              <div><p className="text-sm font-medium text-muted-foreground">{item.label}</p><p className="font-medium">{item.value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="space-y-3">
        <h3 className="font-heading font-semibold">{t('iletisim.socialMedia')}</h3>
        <div className="flex gap-3">
          <a href="#" className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center hover:bg-primary/10 transition-colors">📱</a>
          <a href="#" className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center hover:bg-primary/10 transition-colors">💬</a>
          <a href="#" className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center hover:bg-primary/10 transition-colors">📷</a>
          <a href="#" className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center hover:bg-primary/10 transition-colors">📘</a>
        </div>
      </div>
    </div>
  );
}
