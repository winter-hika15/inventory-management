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
create table shops (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null unique,
  password text not null,
  role text not null default 'store', -- 'admin' (本部管理者) または 'store' (店舗アカウント)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- サンプルデータの追加（店舗A: shopA@example.com / 店舗B: shopB@example.com 用にデータを分ける）
insert into items (name, stock, price, threshold_low, threshold_high, unit, shop_id)
values 
  ('プレミアムコーヒー豆', 3, 1200, 5, 20, '袋', 'shopA@example.com'),
  ('オーガニックルイボスティー', 12, 850, 5, 20, '箱', 'shopA@example.com'),
  ('ミネラルウォーター 500ml', 45, 100, 10, 40, '個', 'shopB@example.com'),
  ('特製マグカップ', 8, 1500, 3, 15, '個', 'shopB@example.com'),
  ('エコバッグ', 1, 600, 4, 10, '個', 'shopB@example.com');

-- サンプル店舗・管理者アカウントの追加
insert into shops (name, email, password, role)
values
  ('本部管理者', 'admin@example.com', 'admin123', 'admin'),
  ('店舗A', 'shopA@example.com', 'shopA123', 'store'),
  ('店舗B', 'shopB@example.com', 'shopB123', 'store');

-- RLS (Row Level Security) の無効化 (開発・動作検証用としてクライアントからのアクセスを許可)
alter table shops disable row level security;
alter table items disable row level security;


