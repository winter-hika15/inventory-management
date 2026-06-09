import { NextRequest } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { getSessionFromRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';

// GET: 管理者のみ、店舗一覧を取得
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return unauthorizedResponse();
  if (session.role !== 'admin') return forbiddenResponse();

  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('shops')
    .select('id, name, email, role, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ shops: data });
}

// POST: 管理者のみ、新規店舗を作成
export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return unauthorizedResponse();
  if (session.role !== 'admin') return forbiddenResponse();

  try {
    const payload = await request.json();
    const { name, email, password, role } = payload;

    if (!name || !email || !password) {
      return Response.json({ error: '必須項目が不足しています' }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    
    // 重複チェック
    const { data: existing } = await supabase.from('shops').select('id').eq('email', email).single();
    if (existing) {
      return Response.json({ error: 'このメールアドレスは既に登録されています' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('shops')
      .insert([{ name, email, password, role: role || 'store' }])
      .select('id, name, email, role, created_at');

    if (error) throw error;

    return Response.json({ shop: data[0] });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
