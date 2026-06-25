import { supabase } from '@/api/supabaseClient';

export const TABLES = {
  bookings: 'bookings',
  users: 'users',
  staff_members: 'staff_members',
  payments: 'payments',
  invoices: 'invoices',
  tickets: 'tickets',
  service_offerings: 'service_offerings',
  inventory_items: 'inventory_items',
  material_requests: 'material_requests',
  notifications: 'notifications',
  conversations: 'conversations',
  conversation_messages: 'conversation_messages',
  messages: 'messages',
  year_plans: 'year_plans',
  clients: 'clients',
};

function parseSort(sort) {
  if (!sort) return { column: 'created_at', ascending: false };
  const descending = sort.startsWith('-');
  let column = descending ? sort.slice(1) : sort;
  // Legacy alias: the app was originally built referencing "created_date",
  // but every table actually uses "created_at". Translate automatically.
  if (column === 'created_date') column = 'created_at';
  return { column, ascending: !descending };
}

function applyFilters(query, filters = {}) {
  let q = query;
  for (const [key, value] of Object.entries(filters)) {
    q = q.eq(key, value);
  }
  return q;
}

export async function list(table, sort, limit) {
  const { column, ascending } = parseSort(sort);
  let query = supabase.from(table).select('*').order(column, { ascending });
  if (limit != null) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function filter(table, filters, sort, limit) {
  const { column, ascending } = parseSort(sort);
  let query = applyFilters(supabase.from(table).select('*'), filters).order(column, { ascending });
  if (limit != null) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function create(table, row) {
  const { data, error } = await supabase.from(table).insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function update(table, id, row) {
  const { data, error } = await supabase.from(table).update(row).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function remove(table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}

export function subscribe(table, callback) {
  const channel = supabase
    .channel(`${table}-${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
      const type =
        payload.eventType === 'INSERT' ? 'create' :
        payload.eventType === 'UPDATE' ? 'update' : 'delete';
      const record = payload.new?.id ? payload.new : payload.old;
      callback({ type, data: record, id: record?.id });
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
