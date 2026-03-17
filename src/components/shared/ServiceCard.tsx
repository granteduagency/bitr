import { type LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';

interface ServiceCardProps {
  icon: LucideIcon;
  title: string;
  href: string;
  color: string;
  onClick?: () => void;
}

export function ServiceCard({ icon: Icon, title, href, color, onClick }: ServiceCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(href);
    }
  };

  return (
    <Card
      className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 border-border/50 group"
      onClick={handleClick}
    >
      <CardContent className="flex flex-col items-center justify-center p-6 gap-3 text-center">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
          style={{ backgroundColor: color + '15', color }}
        >
          <Icon className="h-7 w-7" />
        </div>
        <span className="font-heading font-semibold text-sm leading-tight">{title}</span>
      </CardContent>
    </Card>
  );
}
