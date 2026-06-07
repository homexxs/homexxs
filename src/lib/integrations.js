import { supabase } from '@/api/supabaseClient';

const DEFAULT_BUCKET = 'uploads';

export async function uploadFile({ file }, bucket = DEFAULT_BUCKET) {
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return { file_url: urlData.publicUrl };
}

export async function invokeLLM(body) {
  const res = await fetch('/api/llm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
