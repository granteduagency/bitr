import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Home, Shield, HeartPulse, FileText, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { InstallAppButton } from '@/components/shared/InstallAppButton';
import { getServiceKeyFromPath, recordStoredClientActivity } from '@/lib/client-tracking';

export function DashboardLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const isRoot = location.pathname === '/dashboard';
  const clientName = localStorage.getItem('client_name') || '';

  const navItems = [
    { icon: Home, label: t('nav.home'), path: '/dashboard' },
    { icon: Shield, label: t('services.ikamet'), path: '/dashboard/ikamet' },
    { icon: HeartPulse, label: t('services.sigorta'), path: '/dashboard/sigorta' },
    { icon: FileText, label: t('services.viza'), path: '/dashboard/viza' },
  ];

  useEffect(() => {
    const serviceKey = getServiceKeyFromPath(location.pathname);

    void recordStoredClientActivity({
      route: location.pathname,
      serviceKey,
      action: 'route_viewed',
      details: {
        pageTitle: document.title,
      },
      throttleKey: `route:${location.pathname}`,
      throttleMs: 120000,
    }).catch((error) => {
      console.error('Route tracking error:', error);
    });
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#F7F5F2] relative">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-[#F7F5F2]/90 backdrop-blur-xl pt-4 pb-4 md:pt-6 md:pb-6">
        <div className="flex items-center justify-between px-4 md:px-8 xl:px-12 max-w-[1400px] mx-auto">
          {!isRoot ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full hover:bg-slate-200/60 w-10 h-10"
            >
              <ArrowLeft className="h-5 w-5 text-slate-700" />
            </Button>
          ) : (
            <div>
              <p className="text-sm md:text-base text-slate-400 font-medium mb-1">Xizmatlar</p>
              <h1 className="font-heading text-[1.7rem] md:text-3xl font-extrabold text-slate-900 leading-tight">
                {clientName ? `Salom, ${clientName} 👋` : 'Xizmatlar'}
              </h1>
            </div>
          )}
          
          <div className="flex items-center gap-2 md:gap-4">
            {isRoot && (
              <Button type="button" variant="outline" size="icon" className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white shadow-sm hover:bg-slate-50 border-slate-100">
                <Search className="w-5 h-5 text-slate-500" />
              </Button>
            )}
            <InstallAppButton />
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 md:px-8 xl:px-12 py-2 md:py-4 max-w-[1400px] mx-auto w-full">
        <Outlet />
      </main>

      {/* Floating Pill Navigation (Mobile only) */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 md:hidden">
        <div className="flex items-center gap-2 bg-white rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.12)] px-3 py-2.5 border border-slate-100/50">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            return (
              <Button
                key={item.path}
                type="button"
                variant="ghost"
                onClick={() => navigate(item.path)}
                className={`relative flex items-center justify-center rounded-full transition-all duration-300 ${
                  isActive
                    ? 'bg-slate-900 text-white w-14 h-14 shadow-lg'
                    : 'text-slate-400 hover:text-slate-700 w-12 h-12 hover:bg-slate-100'
                }`}
              >
                <item.icon className={`transition-all duration-200 ${isActive ? 'w-6 h-6' : 'w-5 h-5'}`} strokeWidth={isActive ? 2.2 : 1.8} />
              </Button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
