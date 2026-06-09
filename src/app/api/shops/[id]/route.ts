import { NextRequest } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { getSessionFromRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';

// PATCH: 店舗情報の更新 (管理者、または自分自身のみ)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionFromRequest(request);
  if (!session) return unauthorizedResponse();

  const shopId = id;
  
  // 管理者か、または自分自身のアカウントの更新でなければエラー
  if (session.role !== 'admin' && session.shopId !== shopId) {
    return forbiddenResponse();
  }

  try {
    const payload = await request.json();
    const supabase = getSupabaseServer();

    // メールアドレスが変更された場合のチェック
    if (payload.email) {
      const { data: existing } = await supabase
        .from('shops')
        .select('id')
        .eq('email', payload.email)
        .neq('id', shopId)
        .single();
      
      if (existing) {
        return Response.json({ error: 'このメールアドレスは既に登録されています' }, { status: 400 });
      }

      // 古いメールアドレスを取得してitemsとrestock_historyも更新する (Supabase側でカスケードできない場合のため)
      const { data: oldShop } = await supabase.from('shops').select('email').eq('id', shopId).single();
      if (oldShop && oldShop.email !== payload.email) {
        await supabase.from('items').update({ shop_id: payload.email }).eq('shop_id', oldShop.email);
        await supabase.from('restock_history').update({ shop_id: payload.email }).eq('shop_id', oldShop.email);
      }
    }

    const { error } = await supabase
      .from('shops')
      .update(payload)
      .eq('id', shopId);

    if (error) throw error;

    return Response.json({ success: true });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: 管理者のみ、店舗を削除
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionFromRequest(request);
  if (!session) return unauthorizedResponse();
  if (session.role !== 'admin') return forbiddenResponse();

  const shopId = id;

  try {
    const supabase = getSupabaseServer();

    // 管理者アカウント自体の削除は禁止する保護
    const { data: targetShop } = await supabase.from('shops').select('role, email').eq('id', shopId).single();
    if (targetShop?.role === 'admin') {
      return Response.json({ error: '本部管理者アカウントは削除できません' }, { status: 400 });
    }

    if (targetShop) {
      // 関連データの削除
      await supabase.from('items').delete().eq('shop_id', targetShop.email);
      await supabase.from('restock_history').delete().eq('shop_id', targetShop.email);
    }

    const { error } = await supabase
      .from('shops')
      .delete()
      .eq('id', shopId);

    if (error) throw error;

    return Response.json({ success: true });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
