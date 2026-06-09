import { NextRequest } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { getSessionFromRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';

// GET: 補充履歴を取得 (店舗は自店舗のみ、管理者はクエリのshop_idまたは全店舗)
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return unauthorizedResponse();

  const searchParams = request.nextUrl.searchParams;
  let shopId = searchParams.get('shop_id');

  // 店舗アカウントの場合は、自店舗のデータしか取得できないように強制
  if (session.role === 'store') {
    shopId = session.email;
  }

  const supabase = getSupabaseServer();
  let query = supabase.from('restock_history').select('*').order('created_at', { ascending: false });

  if (shopId) {
    query = query.eq('shop_id', shopId);
  }

  const { data, error } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ history: data });
}

// POST: 補充履歴を登録
export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return unauthorizedResponse();

  try {
    const payload = await request.json();
    
    // 店舗アカウントの場合は、自店舗のデータしか作成できないように強制
    if (session.role === 'store') {
      if (payload.shop_id !== session.email) {
        return forbiddenResponse();
      }
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('restock_history')
      .insert([payload])
      .select();

    if (error) throw error;

    return Response.json({ log: data[0] });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
