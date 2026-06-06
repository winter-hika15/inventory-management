-- 在庫管理用テーブルの作成
create table items (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  stock integer not null default 0,
  price integer not null default 0,
  threshold_low integer not null default 5,
  threshold_high integer not null default 20,
  unit text not null default '個',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- サンプルデータの追加
insert into items (name, stock, price, threshold_low, threshold_high, unit)
values 
  ('プレミアムコーヒー豆', 3, 1200, 5, 20, '袋'),
  ('オーガニックルイボスティー', 12, 850, 5, 20, '箱'),
  ('ミネラルウォーター 500ml', 45, 100, 10, 40, '個'),
  ('特製マグカップ', 8, 1500, 3, 15, '個'),
  ('エコバッグ', 1, 600, 4, 10, '個');
