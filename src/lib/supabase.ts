import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function uploadFile(file: File, bucket: string = 'documents'): Promise<string | null> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

  const { error } = await supabase.storage.from(bucket).upload(fileName, file);
  if (error) {
    console.error('Upload error:', error);
    return null;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
  return data.publicUrl;
}

export async function getOrCreateClient(name: string, phone: string): Promise<string | null> {
  // Try to find existing client
  const { data: existing } = await supabase
    .from('clients')
    .select('id')
    .eq('phone', phone)
    .maybeSingle();

  if (existing) return existing.id;

  // Create new client
  const { data, error } = await supabase
    .from('clients')
    .insert({ name, phone })
    .select('id')
    .single();

  if (error) {
    console.error('Client creation error:', error);
    return null;
  }

  return data.id;
}
