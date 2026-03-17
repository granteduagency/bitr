import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { LogOut, Users, FileText, Clock, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function AdminPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'dashboard'|'ikamet'|'sigorta'|'visa'|'tercume'|'hukuk'|'calisma'|'universite'|'clients'>('dashboard');
  const [data, setData] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0, today: 0 });

  useEffect(() => {
    supabase.auth.onAuthStateChange((_, s) => { setSession(s); setLoading(false); });
    supabase.auth.getSession().then(({ data: { session: s } }) => { setSession(s); setLoading(false); });
  }, []);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
  };

  const logout = async () => { await supabase.auth.signOut(); setSession(null); };

  const fetchData = async (table: string) => {
    const { data: d } = await supabase.from(table).select('*, clients(name, phone)').order('created_at', { ascending: false });
    setData(d || []);
  };

  const fetchClients = async () => {
    const { data: d } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
    setClients(d || []);
  };

  const fetchStats = async () => {
    const tables = ['ikamet_applications','sigorta_applications','visa_applications','tercume_applications','hukuk_applications','calisma_applications','university_applications'];
    let total = 0, pending = 0, completed = 0, today = 0;
    const todayStr = new Date().toISOString().split('T')[0];
    for (const tbl of tables) {
      const { count: c1 } = await supabase.from(tbl).select('*', { count: 'exact', head: true });
      const { count: c2 } = await supabase.from(tbl).select('*', { count: 'exact', head: true }).eq('status', 'pending');
      const { count: c3 } = await supabase.from(tbl).select('*', { count: 'exact', head: true }).eq('status', 'completed');
      const { count: c4 } = await supabase.from(tbl).select('*', { count: 'exact', head: true }).gte('created_at', todayStr);
      total += c1 || 0; pending += c2 || 0; completed += c3 || 0; today += c4 || 0;
    }
    setStats({ total, pending, completed, today });
  };

  useEffect(() => {
    if (!session) return;
    if (tab === 'dashboard') { fetchStats(); fetchClients(); }
    else if (tab === 'clients') fetchClients();
    else {
      const tableMap: Record<string, string> = { ikamet: 'ikamet_applications', sigorta: 'sigorta_applications', visa: 'visa_applications', tercume: 'tercume_applications', hukuk: 'hukuk_applications', calisma: 'calisma_applications', universite: 'university_applications' };
      fetchData(tableMap[tab]);
    }
  }, [session, tab]);

  const updateStatus = async (table: string, id: string, status: string) => {
    await supabase.from(table).update({ status }).eq('id', id);
    const tableMap: Record<string, string> = { ikamet: 'ikamet_applications', sigorta: 'sigorta_applications', visa: 'visa_applications', tercume: 'tercume_applications', hukuk: 'hukuk_applications', calisma: 'calisma_applications', universite: 'university_applications' };
    fetchData(tableMap[tab]);
    toast({ title: t('common.success') });
  };

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = { pending: 'bg-warning/10 text-warning', processing: 'bg-primary/10 text-primary', completed: 'bg-success/10 text-success', rejected: 'bg-destructive/10 text-destructive' };
    return <Badge className={colors[s] || ''}>{t(`admin.${s}`)}</Badge>;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">{t('common.loading')}</div>;

  if (!session) return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-sm"><CardHeader className="text-center"><CardTitle className="font-heading">{t('admin.title')}</CardTitle></CardHeader>
        <CardContent><form onSubmit={login} className="space-y-4">
          <Input placeholder={t('admin.email')} type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          <Input placeholder={t('admin.password')} type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          <Button type="submit" className="w-full">{t('admin.login')}</Button>
        </form></CardContent></Card>
    </div>
  );

  const tabs = [
    { key: 'dashboard', label: t('admin.dashboard') }, { key: 'clients', label: t('admin.clients') },
    { key: 'ikamet', label: t('services.ikamet') }, { key: 'sigorta', label: t('services.sigorta') },
    { key: 'visa', label: t('services.viza') }, { key: 'calisma', label: t('services.calisma') },
    { key: 'tercume', label: t('services.tercume') }, { key: 'hukuk', label: t('services.hukuk') },
    { key: 'universite', label: t('services.universite') },
  ];

  const tableMap: Record<string, string> = { ikamet: 'ikamet_applications', sigorta: 'sigorta_applications', visa: 'visa_applications', tercume: 'tercume_applications', hukuk: 'hukuk_applications', calisma: 'calisma_applications', universite: 'university_applications' };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14 px-4">
          <h1 className="font-heading font-bold">{t('admin.title')}</h1>
          <div className="flex items-center gap-2"><LanguageSwitcher /><Button variant="ghost" size="icon" onClick={logout}><LogOut className="h-4 w-4" /></Button></div>
        </div>
      </header>
      <div className="container px-4 py-4">
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
          {tabs.map(tb => <Button key={tb.key} variant={tab === tb.key ? 'default' : 'outline'} size="sm" onClick={() => setTab(tb.key as any)}>{tb.label}</Button>)}
        </div>

        {tab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[{ icon: FileText, label: t('admin.totalApplications'), value: stats.total, color: 'text-primary' },
                { icon: Clock, label: t('admin.pendingApplications'), value: stats.pending, color: 'text-warning' },
                { icon: CheckCircle, label: t('admin.completedApplications'), value: stats.completed, color: 'text-success' },
                { icon: Users, label: t('admin.todayApplications'), value: stats.today, color: 'text-primary' },
              ].map(s => (
                <Card key={s.label}><CardContent className="p-4 text-center">
                  <s.icon className={`h-6 w-6 mx-auto mb-2 ${s.color}`} /><p className="text-2xl font-bold font-heading">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p>
                </CardContent></Card>
              ))}
            </div>
          </div>
        )}

        {tab === 'clients' && (
          <Table><TableHeader><TableRow><TableHead>{t('form.name')}</TableHead><TableHead>{t('form.phone')}</TableHead><TableHead>{t('admin.date')}</TableHead></TableRow></TableHeader>
            <TableBody>{clients.map(c => <TableRow key={c.id}><TableCell>{c.name}</TableCell><TableCell>{c.phone}</TableCell><TableCell>{new Date(c.created_at).toLocaleDateString()}</TableCell></TableRow>)}</TableBody></Table>
        )}

        {!['dashboard','clients'].includes(tab) && (
          <Table><TableHeader><TableRow><TableHead>{t('admin.clients')}</TableHead><TableHead>{t('admin.type')}</TableHead><TableHead>{t('admin.status')}</TableHead><TableHead>{t('admin.date')}</TableHead><TableHead>{t('admin.actions')}</TableHead></TableRow></TableHeader>
            <TableBody>{data.map(d => <TableRow key={d.id}>
              <TableCell>{d.clients?.name || '—'}<br/><span className="text-xs text-muted-foreground">{d.clients?.phone}</span></TableCell>
              <TableCell>{d.type || d.category || '—'}</TableCell>
              <TableCell>{statusBadge(d.status)}</TableCell>
              <TableCell>{new Date(d.created_at).toLocaleDateString()}</TableCell>
              <TableCell><Select value={d.status} onValueChange={v => updateStatus(tableMap[tab], d.id, v)}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent>
                <SelectItem value="pending">{t('admin.pending')}</SelectItem><SelectItem value="processing">{t('admin.processing')}</SelectItem><SelectItem value="completed">{t('admin.completed')}</SelectItem><SelectItem value="rejected">{t('admin.rejected')}</SelectItem>
              </SelectContent></Select></TableCell>
            </TableRow>)}</TableBody></Table>
        )}
      </div>
    </div>
  );
}
