import { NextRequest } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { getSessionFromRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';

// 管理者権限チェック（本部管理者のみ操作可能）
async function checkAdminAccess(session: any) {
  return session.role === 'admin';
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionFromRequest(request);
  if (!session) return unauthorizedResponse();

  if (!(await checkAdminAccess(session))) {
    return forbiddenResponse();
  }

  const supabase = getSupabaseServer();
  try {
    const payload = await request.json();
    
    // 許可する更新フィールドのみ抽出
    const updateData: { quantity?: number; price?: number } = {};
    if (typeof payload.quantity === 'number') updateData.quantity = payload.quantity;
    if (typeof payload.price === 'number') updateData.price = payload.price;

    const { error } = await supabase
      .from('restock_history')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
    return Response.json({ success: true });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionFromRequest(request);
  if (!session) return unauthorizedResponse();

  if (!(await checkAdminAccess(session))) {
    return forbiddenResponse();
  }

  const supabase = getSupabaseServer();
  try {
    const { error } = await supabase
      .from('restock_history')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return Response.json({ success: true });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
