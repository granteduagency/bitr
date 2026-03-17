import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Home, Shield, FileText, HeartPulse, Menu, Briefcase } from 'lucide-react';
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
      <header className="sticky top-0 z-50 border-b border-border/40 glass">
        <div className="container flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            {!isRoot && (
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl hover:bg-primary/5">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden rounded-xl hover:bg-primary/5">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 border-0">
                <div className="h-full bg-card">
                  <div className="p-6 gradient-primary">
                    <h2 className="font-heading font-extrabold text-xl text-primary-foreground">{t('landing.title')}</h2>
                    <p className="text-sm text-primary-foreground/70 mt-1">{t('landing.subtitle')}</p>
                  </div>
                  <nav className="flex flex-col gap-1 p-4">
                    {navItems.map((item) => {
                      const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
                      return (
                        <Button
                          key={item.path}
                          variant="ghost"
                          className={`justify-start gap-3 h-12 rounded-xl font-medium transition-all ${isActive ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted'}`}
                          onClick={() => { navigate(item.path); setOpen(false); }}
                        >
                          <item.icon className="h-5 w-5" />
                          {item.label}
                        </Button>
                      );
                    })}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="font-heading font-extrabold text-lg tracking-tight truncate">
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
      <nav className="fixed bottom-0 left-0 right-0 border-t border-border/40 glass lg:hidden z-50">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`bottom-nav-item ${isActive ? 'active' : 'text-muted-foreground'}`}
              >
                <item.icon className={`h-5 w-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                <span className="truncate max-w-[56px]">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
