import { supabase } from '@/integrations/supabase/client';

export { supabase };

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
  const normalizedName = name.trim();
  const normalizedPhone = phone.trim();

  const { data, error } = await supabase.rpc('get_or_create_client', {
    _name: normalizedName,
    _phone: normalizedPhone,
  });

  if (error) {
    console.error('Client creation error:', error);
    return null;
  }

  return typeof data === 'string' ? data : null;
}
