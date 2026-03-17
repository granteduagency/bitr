import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Home, Shield, FileText, HeartPulse, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useState } from 'react';

export function DashboardLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const isRoot = location.pathname === '/dashboard';
  const [open, setOpen] = useState(false);

  const navItems = [
    { icon: Home, label: t('nav.home'), path: '/dashboard' },
    { icon: Shield, label: t('services.ikamet'), path: '/dashboard/ikamet' },
    { icon: HeartPulse, label: t('services.sigorta'), path: '/dashboard/sigorta' },
    { icon: FileText, label: t('services.viza'), path: '/dashboard/viza' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
        <div className="container flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            {!isRoot && (
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <nav className="flex flex-col gap-1 p-4 pt-12">
                  {navItems.map((item) => (
                    <Button
                      key={item.path}
                      variant={location.pathname === item.path ? 'secondary' : 'ghost'}
                      className="justify-start gap-3"
                      onClick={() => { navigate(item.path); setOpen(false); }}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
            <h1 className="font-heading font-bold text-lg truncate">
              {t('landing.title')}
            </h1>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Content */}
      <main className="container px-4 py-6 max-w-4xl mx-auto">
        <Outlet />
      </main>

      {/* Bottom Nav (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 border-t bg-card/95 backdrop-blur-md lg:hidden z-50">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-1 px-3 py-2 text-xs transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="truncate max-w-[60px]">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
