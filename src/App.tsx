import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import '@/i18n/config';

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { ProtectedRoute } from "./components/shared/ProtectedRoute";

import IkametMain from "./pages/ikamet/IkametMain";
import IkametTypeList from "./pages/ikamet/IkametTypeList";
import IkametForm from "./pages/ikamet/IkametForm";
import IkametSonuc from "./pages/ikamet/IkametSonuc";

import CalismaForm from "./pages/calisma/CalismaForm";

import SigortaMain from "./pages/sigorta/SigortaMain";
import SigortaSaglik from "./pages/sigorta/SigortaSaglik";
import SigortaSeyahat from "./pages/sigorta/SigortaSeyahat";
import SigortaDeprem from "./pages/sigorta/SigortaDeprem";
import SigortaArac from "./pages/sigorta/SigortaArac";
import SigortaTurizm from "./pages/sigorta/SigortaTurizm";

import DeportPage from "./pages/DeportPage";
import UniversitePage from "./pages/UniversitePage";
import VizaPage from "./pages/VizaPage";
import KonsoloslukPage from "./pages/KonsoloslukPage";
import TercumePage from "./pages/TercumePage";
import HukukPage from "./pages/HukukPage";
import IletisimPage from "./pages/IletisimPage";

import AdminPage from "./pages/admin/AdminPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/admin" element={<AdminPage />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<Dashboard />} />
              
              {/* Ikamet */}
              <Route path="ikamet" element={<IkametMain />} />
              <Route path="ikamet/ilk-kez" element={<IkametTypeList basePath="/dashboard/ikamet/ilk-kez" showUzunDonem />} />
              <Route path="ikamet/ilk-kez/ogrenci" element={<IkametForm category="ilk_kez" type="ogrenci" />} />
              <Route path="ikamet/ilk-kez/aile" element={<IkametForm category="ilk_kez" type="aile" />} />
              <Route path="ikamet/ilk-kez/kisa-donem" element={<IkametForm category="ilk_kez" type="kisa_donem" />} />
              <Route path="ikamet/ilk-kez/uzun-donem" element={<IkametForm category="ilk_kez" type="uzun_donem" />} />
              <Route path="ikamet/uzatma" element={<IkametTypeList basePath="/dashboard/ikamet/uzatma" showUzunDonem={false} />} />
              <Route path="ikamet/uzatma/ogrenci" element={<IkametForm category="uzatma" type="ogrenci" />} />
              <Route path="ikamet/uzatma/aile" element={<IkametForm category="uzatma" type="aile" />} />
              <Route path="ikamet/uzatma/kisa-donem" element={<IkametForm category="uzatma" type="kisa_donem" />} />
              <Route path="ikamet/gecis" element={<IkametTypeList basePath="/dashboard/ikamet/gecis" showUzunDonem />} />
              <Route path="ikamet/gecis/ogrenci" element={<IkametForm category="gecis" type="ogrenci" />} />
              <Route path="ikamet/gecis/aile" element={<IkametForm category="gecis" type="aile" />} />
              <Route path="ikamet/gecis/kisa-donem" element={<IkametForm category="gecis" type="kisa_donem" />} />
              <Route path="ikamet/gecis/uzun-donem" element={<IkametForm category="gecis" type="uzun_donem" />} />
              <Route path="ikamet/sonuc" element={<IkametSonuc />} />
              
              {/* Calisma */}
              <Route path="calisma/:type" element={<CalismaForm />} />
              
              {/* Sigorta */}
              <Route path="sigorta" element={<SigortaMain />} />
              <Route path="sigorta/saglik" element={<SigortaSaglik />} />
              <Route path="sigorta/seyahat" element={<SigortaSeyahat />} />
              <Route path="sigorta/deprem" element={<SigortaDeprem />} />
              <Route path="sigorta/arac/:type" element={<SigortaArac />} />
              <Route path="sigorta/turizm" element={<SigortaTurizm />} />
              
              {/* Other */}
              <Route path="deport" element={<DeportPage />} />
              <Route path="universite" element={<UniversitePage />} />
              <Route path="viza" element={<VizaPage />} />
              <Route path="konsolosluk" element={<KonsoloslukPage />} />
              <Route path="tercume" element={<TercumePage />} />
              <Route path="hukuk" element={<HukukPage />} />
              <Route path="iletisim" element={<IletisimPage />} />
            </Route>
          </Route>
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
