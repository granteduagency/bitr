
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TYPE public.app_role AS ENUM ('admin', 'staff');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert clients" ON public.clients
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view clients" ON public.clients
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.ikamet_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  father_name TEXT,
  mother_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  has_insurance BOOLEAN,
  passport_url TEXT,
  photo_url TEXT,
  student_cert_url TEXT,
  supporter_documents_url TEXT[],
  supporter_id_front_url TEXT,
  supporter_id_back_url TEXT,
  supporter_passport_url TEXT,
  supporter_type TEXT,
  supporter_student_cert_url TEXT,
  appointment_url TEXT,
  appointment_result JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ikamet_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert ikamet" ON public.ikamet_applications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage ikamet" ON public.ikamet_applications
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_ikamet_updated_at BEFORE UPDATE ON public.ikamet_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.calisma_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  documents_url TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.calisma_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert calisma" ON public.calisma_applications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage calisma" ON public.calisma_applications
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.sigorta_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  data JSONB NOT NULL DEFAULT '{}',
  documents_url TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.sigorta_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert sigorta" ON public.sigorta_applications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage sigorta" ON public.sigorta_applications
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.deport_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  entry_date DATE,
  exit_date DATE,
  violation_days INT,
  penalty_amount DECIMAL,
  result_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.deport_calculations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert deport" ON public.deport_calculations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage deport" ON public.deport_calculations
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.universities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_tr TEXT NOT NULL,
  name_uz TEXT NOT NULL,
  city TEXT,
  degrees TEXT[],
  faculties JSONB,
  programs JSONB,
  languages TEXT[],
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true
);

ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view universities" ON public.universities
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage universities" ON public.universities
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.university_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  university_id UUID REFERENCES public.universities(id),
  degree TEXT,
  faculty TEXT,
  program TEXT,
  language TEXT,
  status TEXT DEFAULT 'pending',
  passport_url TEXT,
  diploma_url TEXT,
  diploma_supplement_url TEXT,
  photo_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.university_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert uni apps" ON public.university_applications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage uni apps" ON public.university_applications
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.visa_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  from_country TEXT,
  to_country TEXT,
  travel_date DATE,
  phone TEXT,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.visa_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert visa" ON public.visa_applications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage visa" ON public.visa_applications
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.consulates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country TEXT NOT NULL,
  country_code TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  working_hours TEXT,
  website TEXT,
  required_documents JSONB,
  notes_tr TEXT,
  notes_uz TEXT,
  is_active BOOLEAN DEFAULT true
);

ALTER TABLE public.consulates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view consulates" ON public.consulates
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage consulates" ON public.consulates
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.tercume_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  document_types TEXT[],
  from_language TEXT,
  to_language TEXT,
  documents_url TEXT[],
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tercume_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert tercume" ON public.tercume_applications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage tercume" ON public.tercume_applications
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.hukuk_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  problem TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hukuk_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert hukuk" ON public.hukuk_applications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage hukuk" ON public.hukuk_applications
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_ikamet_client ON public.ikamet_applications(client_id);
CREATE INDEX idx_ikamet_status ON public.ikamet_applications(status);
CREATE INDEX idx_sigorta_type ON public.sigorta_applications(type);
CREATE INDEX idx_clients_phone ON public.clients(phone);
CREATE INDEX idx_visa_client ON public.visa_applications(client_id);
CREATE INDEX idx_uni_apps_client ON public.university_applications(client_id);

INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

CREATE POLICY "Anyone can upload documents" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Anyone can view documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents');

INSERT INTO public.universities (name_tr, name_uz, city, degrees, faculties, programs, languages) VALUES
('İstanbul Üniversitesi', 'Istanbul Universiteti', 'İstanbul', ARRAY['lisans','yuksek_lisans','doktora'], '["Tıp","Hukuk","Mühendislik","İktisat","Edebiyat"]'::jsonb, '{"Tıp":["Tıp"],"Hukuk":["Hukuk"],"Mühendislik":["Bilgisayar","Elektrik","Makine","İnşaat"],"İktisat":["İktisat","İşletme","Maliye"],"Edebiyat":["Türk Dili","Tarih","Felsefe"]}'::jsonb, ARRAY['tr','en']),
('Ankara Üniversitesi', 'Ankara Universiteti', 'Ankara', ARRAY['lisans','yuksek_lisans','doktora'], '["Tıp","Hukuk","Fen","Dil ve Tarih"]'::jsonb, '{"Tıp":["Tıp"],"Hukuk":["Hukuk"],"Fen":["Fizik","Kimya","Biyoloji","Matematik"],"Dil ve Tarih":["Türk Dili","Tarih","Arkeoloji"]}'::jsonb, ARRAY['tr','en']),
('Boğaziçi Üniversitesi', 'Bogazichi Universiteti', 'İstanbul', ARRAY['lisans','yuksek_lisans','doktora'], '["Mühendislik","Fen-Edebiyat","İktisat","Eğitim"]'::jsonb, '{"Mühendislik":["Bilgisayar","Elektrik","Endüstri","Kimya"],"Fen-Edebiyat":["Fizik","Kimya","Matematik","Moleküler Biyoloji"],"İktisat":["İktisat","Yönetim","Uluslararası Ticaret"],"Eğitim":["Eğitim Bilimleri"]}'::jsonb, ARRAY['tr','en']),
('Hacettepe Üniversitesi', 'Hacettepe Universiteti', 'Ankara', ARRAY['lisans','yuksek_lisans'], '["Tıp","Eczacılık","Mühendislik","Eğitim"]'::jsonb, '{"Tıp":["Tıp"],"Eczacılık":["Eczacılık"],"Mühendislik":["Bilgisayar","Gıda","Çevre"],"Eğitim":["İlköğretim","Özel Eğitim"]}'::jsonb, ARRAY['tr']),
('İstanbul Teknik Üniversitesi', 'Istanbul Texnik Universiteti', 'İstanbul', ARRAY['lisans','yuksek_lisans','doktora'], '["Mühendislik","Mimarlık","Fen","Denizcilik"]'::jsonb, '{"Mühendislik":["Bilgisayar","Elektrik","Makine","İnşaat","Kimya"],"Mimarlık":["Mimarlık","Şehir Planlama"],"Fen":["Fizik","Matematik"],"Denizcilik":["Deniz Ulaştırma","Gemi İnşaatı"]}'::jsonb, ARRAY['tr','en']),
('ODTÜ', 'ODTU (Ortadogu Texnik Universiteti)', 'Ankara', ARRAY['lisans','yuksek_lisans','doktora'], '["Mühendislik","Fen-Edebiyat","İktisat","Mimarlık"]'::jsonb, '{"Mühendislik":["Bilgisayar","Elektrik","Makine","Havacılık"],"Fen-Edebiyat":["Fizik","Kimya","Biyoloji","İstatistik"],"İktisat":["İktisat","İşletme"],"Mimarlık":["Mimarlık","Şehir Planlama"]}'::jsonb, ARRAY['tr','en']),
('Sakarya Üniversitesi', 'Sakarya Universiteti', 'Sakarya', ARRAY['lisans','yuksek_lisans'], '["Mühendislik","İktisat","Eğitim","İlahiyat"]'::jsonb, '{"Mühendislik":["Bilgisayar","Makine","Elektrik"],"İktisat":["İktisat","İşletme"],"Eğitim":["Türkçe Eğitimi","Matematik Eğitimi"],"İlahiyat":["İlahiyat"]}'::jsonb, ARRAY['tr']),
('Marmara Üniversitesi', 'Marmara Universiteti', 'İstanbul', ARRAY['lisans','yuksek_lisans'], '["Tıp","Hukuk","İktisat","İlahiyat","Mühendislik"]'::jsonb, '{"Tıp":["Tıp"],"Hukuk":["Hukuk"],"İktisat":["İktisat","İşletme","Maliye"],"İlahiyat":["İlahiyat"],"Mühendislik":["Bilgisayar","Makine"]}'::jsonb, ARRAY['tr','en']);
