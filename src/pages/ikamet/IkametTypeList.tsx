import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { GraduationCap, Users, Clock, Calendar } from 'lucide-react';

interface IkametTypeListProps {
  basePath: string;
  showUzunDonem?: boolean;
}

export default function IkametTypeList({ basePath, showUzunDonem = true }: IkametTypeListProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const items = [
    { icon: GraduationCap, label: t('ikamet.ogrenci'), path: `${basePath}/ogrenci` },
    { icon: Users, label: t('ikamet.aile'), path: `${basePath}/aile` },
    { icon: Clock, label: t('ikamet.kisaDonem'), path: `${basePath}/kisa-donem` },
    ...(showUzunDonem ? [{ icon: Calendar, label: t('ikamet.uzunDonem'), path: `${basePath}/uzun-donem` }] : []),
  ];

  return (
    <div className="space-y-4 animate-fade-in pb-20 lg:pb-0">
      <h2 className="font-heading text-xl font-bold">
        {basePath.includes('uzatma') ? t('ikamet.uzatma') : basePath.includes('gecis') ? t('ikamet.gecis') : t('ikamet.ilkKez')}
      </h2>
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
