import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, RefreshCw, ArrowRightLeft, Search } from 'lucide-react';

export default function IkametMain() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const items = [
    { icon: Shield, label: t('ikamet.ilkKez'), path: '/dashboard/ikamet/ilk-kez' },
    { icon: RefreshCw, label: t('ikamet.uzatma'), path: '/dashboard/ikamet/uzatma' },
    { icon: ArrowRightLeft, label: t('ikamet.gecis'), path: '/dashboard/ikamet/gecis' },
    { icon: Search, label: t('ikamet.sonuc'), path: '/dashboard/ikamet/sonuc' },
  ];

  return (
    <div className="space-y-4 animate-fade-in pb-20 lg:pb-0">
      <h2 className="font-heading text-xl font-bold">{t('ikamet.title')}</h2>
      <div className="grid gap-3">
        {items.map((item) => (
          <Card key={item.path} className="cursor-pointer hover:shadow-md transition-all hover:border-primary/30" onClick={() => navigate(item.path)}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <item.icon className="h-6 w-6 text-primary" />
              </div>
              <span className="font-heading font-semibold">{item.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
