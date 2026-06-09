import { NextRequest } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { getSessionFromRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';

// 共通の権限チェック関数
async function checkItemAccess(itemId: string, session: any, supabase: any) {
  if (session.role === 'admin') return true;
  
  // 店舗アカウントの場合は、自店舗の商品かどうかを確認
  const { data: item } = await supabase.from('items').select('shop_id').eq('id', itemId).single();
  if (!item || item.shop_id !== session.email) {
    return false;
  }
  return true;
}

// PATCH: 商品の更新
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionFromRequest(request);
  if (!session) return unauthorizedResponse();

  const itemId = id;
  const supabase = getSupabaseServer();

  if (!(await checkItemAccess(itemId, session, supabase))) {
    return forbiddenResponse();
  }

  try {
    const payload = await request.json();
    
    // 店舗アカウントが、勝手に他店舗へ移動させるような更新を防ぐ
    if (session.role === 'store' && payload.shop_id && payload.shop_id !== session.email) {
      return forbiddenResponse();
    }

    const { error } = await supabase
      .from('items')
      .update(payload)
      .eq('id', itemId);

    if (error) throw error;

    return Response.json({ success: true });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: 商品の削除
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionFromRequest(request);
  if (!session) return unauthorizedResponse();

  const itemId = id;
  const supabase = getSupabaseServer();

  if (!(await checkItemAccess(itemId, session, supabase))) {
    return forbiddenResponse();
  }

  try {
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;

    return Response.json({ success: true });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
