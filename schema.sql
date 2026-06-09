-- ========================================================
-- 在庫管理システム データベーススキーマ
-- ========================================================

-- pgcrypto 拡張の有効化（パスワードハッシュ化に使用）
create extension if not exists pgcrypto;

-- 在庫管理用テーブルの作成
create table items (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  stock integer not null default 0,
  price integer not null default 0,
  threshold_low integer not null default 5,
  threshold_high integer not null default 20,
  unit text not null default '個',
  shop_id text not null, -- 店舗アカウント（ログインユーザーのメールアドレス等）と紐付けるカラム
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 店舗・管理者アカウント管理テーブルの作成
-- ⚠️ password カラムには bcrypt ハッシュのみ保存（平文パスワードはトリガーで自動ハッシュ化）
create table shops (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null unique,
  password text not null, -- bcrypt ハッシュ形式で保存
  role text not null default 'store', -- 'admin' (本部管理者) または 'store' (店舗アカウント)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 補充（発注）履歴テーブルの作成
create table restock_history (
  id uuid default gen_random_uuid() primary key,
  item_id text, -- 関連する商品のID
  item_name text not null, -- 履歴保存時の商品名
  quantity integer not null, -- 補充された数量
  price integer not null, -- 補充時の単価
  shop_id text not null, -- 補充した店舗のアカウントID
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);


-- ========================================================
-- パスワード自動ハッシュ化トリガー
-- ========================================================

-- INSERT時に平文パスワードを自動ハッシュ化
create or replace function hash_shop_password()
returns trigger as $$
begin
  if new.password not like '$2a$%' and new.password not like '$2b$%' then
    new.password := crypt(new.password, gen_salt('bf'));
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- UPDATE時にパスワードが変更された場合のみ自動ハッシュ化
create or replace function hash_shop_password_on_update()
returns trigger as $$
begin
  if new.password is distinct from old.password then
    if new.password not like '$2a$%' and new.password not like '$2b$%' then
      new.password := crypt(new.password, gen_salt('bf'));
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trigger_hash_shop_password
  before insert on shops
  for each row
  execute function hash_shop_password();

create trigger trigger_hash_shop_password_update
  before update on shops
  for each row
  execute function hash_shop_password_on_update();


-- ========================================================
-- 認証用 RPC 関数
-- ========================================================

-- サーバーサイドでパスワードを検証する関数
-- パスワードカラムの値はクライアントに返らない
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


-- ========================================================
-- RLS (Row Level Security) の設定
-- ========================================================

-- RLS を有効化
alter table items enable row level security;
alter table shops enable row level security;
alter table restock_history enable row level security;

-- items テーブルのポリシー
create policy "items_select_policy" on items for select using (true);
create policy "items_insert_policy" on items for insert with check (true);
create policy "items_update_policy" on items for update using (true);
create policy "items_delete_policy" on items for delete using (true);

-- shops テーブルのポリシー
create policy "shops_select_policy" on shops for select using (true);
create policy "shops_insert_policy" on shops for insert with check (true);
create policy "shops_update_policy" on shops for update using (true);
create policy "shops_delete_policy" on shops for delete using (true);

-- restock_history テーブルのポリシー
create policy "restock_history_select_policy" on restock_history for select using (true);
create policy "restock_history_insert_policy" on restock_history for insert with check (true);
create policy "restock_history_update_policy" on restock_history for update using (true);
create policy "restock_history_delete_policy" on restock_history for delete using (true);


-- ========================================================
-- 権限の付与
-- ========================================================

grant usage on schema public to anon, authenticated, service_role;
grant all on table items to anon, authenticated, service_role;
grant all on table shops to anon, authenticated, service_role;
grant all on table restock_history to anon, authenticated, service_role;
grant execute on function authenticate_shop(text, text) to anon, authenticated, service_role;


-- ========================================================
-- サンプルデータの追加
-- ※ パスワードはトリガーにより自動的に bcrypt ハッシュ化されます
-- ========================================================

insert into items (name, stock, price, threshold_low, threshold_high, unit, shop_id)
values 
  ('プレミアムコーヒー豆', 3, 1200, 5, 20, '袋', 'shopA@example.com'),
  ('オーガニックルイボスティー', 12, 850, 5, 20, '箱', 'shopA@example.com'),
  ('ミネラルウォーター 500ml', 45, 100, 10, 40, '個', 'shopB@example.com'),
  ('特製マグカップ', 8, 1500, 3, 15, '個', 'shopB@example.com'),
  ('エコバッグ', 1, 600, 4, 10, '個', 'shopB@example.com');

-- ※ パスワードは平文で指定しても、INSERT トリガーにより自動的にハッシュ化されます
insert into shops (name, email, password, role)
values
  ('本部管理者', 'admin@example.com', 'admin123', 'admin'),
  ('店舗A', 'shopA@example.com', 'shopA123', 'store'),
  ('店舗B', 'shopB@example.com', 'shopB123', 'store');
