-- ========================================================
-- フェーズ2: RLSの完全なロックダウン
-- クライアント（ブラウザ）からの直接アクセスを完全に遮断し、
-- API Routes (service_role) 経由のアクセスのみを許可します。
-- ========================================================

-- === items テーブルのポリシー削除 ===
drop policy if exists "items_select_policy" on items;
drop policy if exists "items_insert_policy" on items;
drop policy if exists "items_update_policy" on items;
drop policy if exists "items_delete_policy" on items;

-- === shops テーブルのポリシー削除 ===
drop policy if exists "shops_select_policy" on shops;
drop policy if exists "shops_insert_policy" on shops;
drop policy if exists "shops_update_policy" on shops;
drop policy if exists "shops_delete_policy" on shops;

-- === restock_history テーブルのポリシー削除 ===
drop policy if exists "restock_history_select_policy" on restock_history;
drop policy if exists "restock_history_insert_policy" on restock_history;
drop policy if exists "restock_history_update_policy" on restock_history;
drop policy if exists "restock_history_delete_policy" on restock_history;

-- デフォルトでアクセスが拒否されますが、service_roleキーを持つNext.jsサーバーはRLSをバイパスするためアクセス可能です。
