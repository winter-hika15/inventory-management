-- ========================================================
-- セキュリティマイグレーション
-- 在庫管理システムのセキュリティを強化するSQL
-- 
-- 実行方法: Supabaseダッシュボード → SQL Editor で実行してください
-- ========================================================

-- 1. pgcrypto 拡張の有効化（パスワードハッシュ化に使用）
create extension if not exists pgcrypto;


-- 2. 既存の平文パスワードを bcrypt ハッシュに変換
-- ※ 現在保存されている平文パスワードをハッシュ化します
-- ※ ハッシュ化済みのパスワード（$2a$ で始まるもの）はスキップします
update shops
set password = crypt(password, gen_salt('bf'))
where password not like '$2a$%' and password not like '$2b$%';


-- 3. 新規レコード挿入時にパスワードを自動ハッシュ化するトリガー関数
create or replace function hash_shop_password()
returns trigger as $$
begin
  -- パスワードが既にハッシュ化されている場合はスキップ
  if new.password not like '$2a$%' and new.password not like '$2b$%' then
    new.password := crypt(new.password, gen_salt('bf'));
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- パスワード更新時も自動ハッシュ化
create or replace function hash_shop_password_on_update()
returns trigger as $$
begin
  -- パスワードが変更された場合のみハッシュ化
  if new.password is distinct from old.password then
    if new.password not like '$2a$%' and new.password not like '$2b$%' then
      new.password := crypt(new.password, gen_salt('bf'));
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- 既存のトリガーを削除してから再作成
drop trigger if exists trigger_hash_shop_password on shops;
drop trigger if exists trigger_hash_shop_password_update on shops;

-- INSERT時のトリガー
create trigger trigger_hash_shop_password
  before insert on shops
  for each row
  execute function hash_shop_password();

-- UPDATE時のトリガー
create trigger trigger_hash_shop_password_update
  before update on shops
  for each row
  execute function hash_shop_password_on_update();


-- 4. 認証用のRPC関数（サーバーサイドで呼び出す）
-- パスワード検証をサーバーサイドのPostgres関数内で行い、
-- パスワードカラムの値がクライアントに返らないようにする
create or replace function authenticate_shop(p_email text, p_password text)
returns table(id uuid, name text, email text, role text) as $$
begin
  return query
    select s.id, s.name, s.email, s.role
    from shops s
    where s.email = p_email
      and s.password = crypt(p_password, s.password);
end;
$$ language plpgsql security definer;


-- 5. RLS (Row Level Security) の有効化
-- ⚠️ RLS を有効にすると、ポリシーが設定されるまでデータにアクセスできなくなります

-- items テーブル
alter table items enable row level security;

-- shops テーブル
alter table shops enable row level security;

-- restock_history テーブル
alter table restock_history enable row level security;


-- 6. RLS ポリシーの設定
-- anon キーからのアクセスも許可する（現在のクライアントサイドアーキテクチャとの互換性を維持）
-- 将来的にはAPI Routes経由のみに移行することを推奨

-- === items テーブルのポリシー ===
-- 既存のポリシーを削除
drop policy if exists "items_select_policy" on items;
drop policy if exists "items_insert_policy" on items;
drop policy if exists "items_update_policy" on items;
drop policy if exists "items_delete_policy" on items;

-- 読み取り: 認証済みユーザーおよびanon（自店舗のデータのみ参照可能は将来実装）
create policy "items_select_policy" on items
  for select using (true);

-- 挿入: 認証済みユーザーおよびanon
create policy "items_insert_policy" on items
  for insert with check (true);

-- 更新: 認証済みユーザーおよびanon
create policy "items_update_policy" on items
  for update using (true);

-- 削除: 認証済みユーザーおよびanon
create policy "items_delete_policy" on items
  for delete using (true);


-- === shops テーブルのポリシー ===
drop policy if exists "shops_select_policy" on shops;
drop policy if exists "shops_insert_policy" on shops;
drop policy if exists "shops_update_policy" on shops;
drop policy if exists "shops_delete_policy" on shops;

-- 読み取り: パスワードカラムは除外して参照可能
-- ※ RLSでカラム制限はできないため、アプリ側で select('id, name, email, role, created_at') を使用
create policy "shops_select_policy" on shops
  for select using (true);

-- 挿入: 認証済みユーザーおよびanon
create policy "shops_insert_policy" on shops
  for insert with check (true);

-- 更新: 認証済みユーザーおよびanon
create policy "shops_update_policy" on shops
  for update using (true);

-- 削除: 認証済みユーザーおよびanon
create policy "shops_delete_policy" on shops
  for delete using (true);


-- === restock_history テーブルのポリシー ===
drop policy if exists "restock_history_select_policy" on restock_history;
drop policy if exists "restock_history_insert_policy" on restock_history;
drop policy if exists "restock_history_update_policy" on restock_history;
drop policy if exists "restock_history_delete_policy" on restock_history;

create policy "restock_history_select_policy" on restock_history
  for select using (true);

create policy "restock_history_insert_policy" on restock_history
  for insert with check (true);

create policy "restock_history_update_policy" on restock_history
  for update using (true);

create policy "restock_history_delete_policy" on restock_history
  for delete using (true);


-- 7. 権限の付与（必要なロールに対して）
grant usage on schema public to anon, authenticated, service_role;
grant all on table items to anon, authenticated, service_role;
grant all on table shops to anon, authenticated, service_role;
grant all on table restock_history to anon, authenticated, service_role;

-- RPC関数の実行権限
grant execute on function authenticate_shop(text, text) to anon, authenticated, service_role;

-- ========================================================
-- 実行完了後の確認方法:
-- 1. shops テーブルのパスワードカラムが $2a$ または $2b$ で始まるハッシュになっていること
-- 2. SELECT * FROM authenticate_shop('admin@example.com', 'admin123'); で認証が成功すること
-- 3. SELECT * FROM authenticate_shop('admin@example.com', 'wrong'); で空の結果が返ること
-- ========================================================
