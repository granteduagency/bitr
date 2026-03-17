import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { LogOut, Users, FileText, Clock, CheckCircle, Lock, BarChart3 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

export default function AdminPage() {
  const { t } = useTranslation();
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>('dashboard');
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

  const tableMap: Record<string, string> = {
    ikamet: 'ikamet_applications', sigorta: 'sigorta_applications', visa: 'visa_applications',
    tercume: 'tercume_applications', hukuk: 'hukuk_applications', calisma: 'calisma_applications',
    universite: 'university_applications',
  };

  const fetchData = async (table: string) => {
    const { data: d } = await (supabase.from(table as any).select('*, clients(name, phone)') as any).order('created_at', { ascending: false });
    setData(d || []);
  };

  const fetchClients = async () => {
    const { data: d } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
    setClients(d || []);
  };

  const fetchStats = async () => {
    const tables = Object.values(tableMap);
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
    else if (tableMap[tab]) fetchData(tableMap[tab]);
  }, [session, tab]);

  const updateStatus = async (id: string, status: string) => {
    if (!tableMap[tab]) return;
    await supabase.from(tableMap[tab]).update({ status }).eq('id', id);
    fetchData(tableMap[tab]);
    toast({ title: t('common.success') });
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      pending: 'bg-warning/10 text-warning border-warning/20',
      processing: 'bg-info/10 text-info border-info/20',
      completed: 'bg-success/10 text-success border-success/20',
      rejected: 'bg-destructive/10 text-destructive border-destructive/20',
    };
    return <Badge variant="outline" className={`${map[s] || ''} font-medium`}>{t(`admin.${s}`)}</Badge>;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">{t('common.loading')}</div>;

  if (!session) return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-15 blur-3xl gradient-primary" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-sm">
        <div className="rounded-2xl border border-border/40 bg-card/90 backdrop-blur-xl shadow-xl overflow-hidden">
          <div className="h-1.5 gradient-primary" />
          <div className="p-8 space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl gradient-primary flex items-center justify-center mb-4 shadow-primary">
                <Lock className="h-8 w-8 text-primary-foreground" />
              </div>
              <h1 className="font-heading text-xl font-extrabold">{t('admin.title')}</h1>
            </div>
            <form onSubmit={login} className="space-y-4">
              <Input placeholder={t('admin.email')} type="email" value={email} onChange={e => setEmail(e.target.value)} className="rounded-xl h-11" required />
              <Input placeholder={t('admin.password')} type="password" value={password} onChange={e => setPassword(e.target.value)} className="rounded-xl h-11" required />
              <Button type="submit" className="w-full h-11 rounded-xl gradient-primary text-primary-foreground font-semibold shadow-primary">{t('admin.login')}</Button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );

  const tabs = [
    { key: 'dashboard', label: t('admin.dashboard'), icon: BarChart3 },
    { key: 'clients', label: t('admin.clients'), icon: Users },
    { key: 'ikamet', label: t('services.ikamet') },
    { key: 'sigorta', label: t('services.sigorta') },
    { key: 'visa', label: t('services.viza') },
    { key: 'calisma', label: t('services.calisma') },
    { key: 'tercume', label: t('services.tercume') },
    { key: 'hukuk', label: t('services.hukuk') },
    { key: 'universite', label: t('services.universite') },
  ];

  const statCards = [
    { icon: FileText, label: t('admin.totalApplications'), value: stats.total, gradient: 'gradient-primary' },
    { icon: Clock, label: t('admin.pendingApplications'), value: stats.pending, gradient: 'gradient-warm' },
    { icon: CheckCircle, label: t('admin.completedApplications'), value: stats.completed, gradient: 'gradient-success' },
    { icon: Users, label: t('admin.todayApplications'), value: stats.today, gradient: 'gradient-cool' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/40 glass">
        <div className="container flex items-center justify-between h-14 px-4">
          <h1 className="font-heading font-extrabold text-lg">{t('admin.title')}</h1>
          <div className="flex items-center gap-2"><LanguageSwitcher /><Button variant="ghost" size="icon" onClick={logout} className="rounded-xl"><LogOut className="h-4 w-4" /></Button></div>
        </div>
      </header>

      <div className="container px-4 py-5">
        <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-none">
          {tabs.map(tb => (
            <Button key={tb.key} variant={tab === tb.key ? 'default' : 'outline'} size="sm"
              className={`rounded-xl shrink-0 font-medium ${tab === tb.key ? 'gradient-primary text-primary-foreground shadow-primary' : ''}`}
              onClick={() => setTab(tb.key)}>{tb.label}</Button>
          ))}
        </div>

        {tab === 'dashboard' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {statCards.map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                  <Card className="stat-card border-0">
                    <CardContent className="p-5">
                      <div className={`w-10 h-10 rounded-xl ${s.gradient} flex items-center justify-center mb-3`}>
                        <s.icon className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <p className="text-3xl font-heading font-extrabold">{s.value}</p>
                      <p className="text-xs text-muted-foreground mt-1 font-medium">{s.label}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {tab === 'clients' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-border/40 bg-card overflow-hidden">
            <Table>
              <TableHeader><TableRow className="bg-muted/30">
                <TableHead className="font-semibold">{t('form.name')}</TableHead>
                <TableHead className="font-semibold">{t('form.phone')}</TableHead>
                <TableHead className="font-semibold">{t('admin.date')}</TableHead>
              </TableRow></TableHeader>
              <TableBody>{clients.map(c => <TableRow key={c.id}><TableCell className="font-medium">{c.name}</TableCell><TableCell className="font-mono text-sm">{c.phone}</TableCell><TableCell className="text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</TableCell></TableRow>)}</TableBody>
            </Table>
          </motion.div>
        )}

        {!['dashboard','clients'].includes(tab) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-border/40 bg-card overflow-hidden">
            <Table>
              <TableHeader><TableRow className="bg-muted/30">
                <TableHead className="font-semibold">{t('admin.clients')}</TableHead>
                <TableHead className="font-semibold">{t('admin.type')}</TableHead>
                <TableHead className="font-semibold">{t('admin.status')}</TableHead>
                <TableHead className="font-semibold">{t('admin.date')}</TableHead>
                <TableHead className="font-semibold">{t('admin.actions')}</TableHead>
              </TableRow></TableHeader>
              <TableBody>{data.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t('common.noData')}</TableCell></TableRow>
              ) : data.map(d => <TableRow key={d.id}>
                <TableCell><span className="font-medium">{d.clients?.name || '—'}</span><br/><span className="text-xs text-muted-foreground font-mono">{d.clients?.phone}</span></TableCell>
                <TableCell><Badge variant="outline" className="font-medium">{d.type || d.category || '—'}</Badge></TableCell>
                <TableCell>{statusBadge(d.status)}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{new Date(d.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Select value={d.status} onValueChange={v => updateStatus(d.id, v)}>
                    <SelectTrigger className="w-32 h-8 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">{t('admin.pending')}</SelectItem>
                      <SelectItem value="processing">{t('admin.processing')}</SelectItem>
                      <SelectItem value="completed">{t('admin.completed')}</SelectItem>
                      <SelectItem value="rejected">{t('admin.rejected')}</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>)}</TableBody>
            </Table>
          </motion.div>
        )}
      </div>
    </div>
  );
}
