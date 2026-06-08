"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Package, 
  TrendingDown, 
  AlertTriangle, 
  Plus, 
  Minus, 
  Trash2, 
  Database, 
  DollarSign,
  AlertCircle,
  Lock,
  Edit2,
  X,
  Save,
  LogOut,
  Store,
  CheckCircle2
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

interface Item {
  id: string;
  name: string;
  stock: number;
  price: number;
  threshold_low: number;
  threshold_high: number;
  unit?: string;
  shop_id: string;
  created_at: string;
}

// 店舗別のデフォルト初期データ定義
const DEFAULT_INITIAL_ITEMS: Item[] = [
  {
    id: '1',
    name: 'プレミアムコーヒー豆',
    stock: 3,
    price: 1200,
    threshold_low: 5,
    threshold_high: 20,
    unit: '袋',
    shop_id: 'shopA@example.com',
    created_at: new Date(Date.now() - 500000).toISOString()
  },
  {
    id: '2',
    name: 'オーガニックルイボスティー',
    stock: 12,
    price: 850,
    threshold_low: 5,
    threshold_high: 20,
    unit: '箱',
    shop_id: 'shopA@example.com',
    created_at: new Date(Date.now() - 400000).toISOString()
  },
  {
    id: '3',
    name: 'ミネラルウォーター 500ml',
    stock: 45,
    price: 100,
    threshold_low: 10,
    threshold_high: 40,
    unit: '個',
    shop_id: 'shopB@example.com',
    created_at: new Date(Date.now() - 300000).toISOString()
  },
  {
    id: '4',
    name: '特製マグカップ',
    stock: 8,
    price: 1500,
    threshold_low: 3,
    threshold_high: 15,
    unit: '個',
    shop_id: 'shopB@example.com',
    created_at: new Date(Date.now() - 200000).toISOString()
  },
  {
    id: '5',
    name: 'エコバッグ',
    stock: 1,
    price: 600,
    threshold_low: 4,
    threshold_high: 10,
    unit: '個',
    shop_id: 'shopB@example.com',
    created_at: new Date(Date.now() - 100000).toISOString()
  }
];

export default function Home() {
  const router = useRouter();
  interface Shop {
    id: string;
    name: string;
    email: string;
    role: string;
  }

  const [items, setItems] = useState<Item[]>([]);
  const [shops, setShops] = useState<Shop[]>([]); // 店舗リスト用
  const [loading, setLoading] = useState(true);
  const [usingSupabase, setUsingSupabase] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; text: string; type: 'success' | 'error' | 'info' }[]>([]);
  const [currentShopEmail, setCurrentShopEmail] = useState('');
  const [adminRole, setAdminRole] = useState('store');

  // 新規登録フォーム用
  const [newItemName, setNewItemName] = useState('');
  const [newItemStock, setNewItemStock] = useState('10');
  const [newItemPrice, setNewItemPrice] = useState('1000');
  const [newItemUnit, setNewItemUnit] = useState('個');
  const [newItemLow, setNewItemLow] = useState('5');
  const [newItemHigh, setNewItemHigh] = useState('20');

  // インライン編集フォーム用
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('0');
  const [editStock, setEditStock] = useState('0');
  const [editLow, setEditLow] = useState('0');
  const [editHigh, setEditHigh] = useState('0');
  const [editUnit, setEditUnit] = useState('個');

  // トースト通知追加
  const addToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // 在庫状況ステータス判定
  const getStatus = (stock: number, low: number, high: number): 'low' | 'high' | 'normal' => {
    if (stock < low) return 'low';
    if (stock > high) return 'high';
    return 'normal';
  };

  // ソート処理（不足「low」が最上部）
  const sortItems = (itemsList: Item[]): Item[] => {
    return [...itemsList].sort((a, b) => {
      const statusA = getStatus(a.stock, a.threshold_low, a.threshold_high);
      const statusB = getStatus(b.stock, b.threshold_low, b.threshold_high);
      
      const priority = { low: 1, normal: 2, high: 3 };
      
      if (priority[statusA] !== priority[statusB]) {
        return priority[statusA] - priority[statusB];
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  };

  // 特定店舗の商品データのロード
  const loadShopItems = async (shopEmail: string, configured: boolean) => {
    if (!shopEmail) return;
    setLoading(true);

    if (configured) {
      try {
        const { data, error } = await supabase
          .from('items')
          .select('*')
          .eq('shop_id', shopEmail);

        if (error) throw error;

        if (data && data.length > 0) {
          setItems(sortItems(data));
        } else {
          // もしこの店舗のデータが1件もない場合、初期の店舗別サンプルデータを自動登録
          const shopInitialItems = DEFAULT_INITIAL_ITEMS.filter(item => item.shop_id === shopEmail);
          
          if (shopInitialItems.length > 0) {
            const { error: insertError } = await supabase
              .from('items')
              .insert(shopInitialItems.map(({ id, ...rest }) => rest)); // idは自動生成

            if (insertError) throw insertError;

            const { data: refetched } = await supabase
              .from('items')
              .select('*')
              .eq('shop_id', shopEmail);
            
            if (refetched) {
              setItems(sortItems(refetched));
            }
          } else {
            setItems([]);
          }
        }
        addToast(`店舗 ${shopEmail} のデータをロードしました`, 'success');
      } catch (error: any) {
        console.error('Supabaseロード失敗:', error.message);
        addToast(`DB接続エラー: ${error.message}`, 'error');
        setItems([]);
      }
    } else {
      // ローカルストレージからロード
      const localData = localStorage.getItem('inventory_items');
      let allItems: Item[] = [];
      if (localData) {
        try {
          allItems = JSON.parse(localData);
        } catch (e) {
          allItems = [];
        }
      }

      // 選択中の店舗データのみに絞り込む
      let shopItems = allItems.filter(item => item.shop_id === shopEmail);

      // この店舗のデータが初めての場合、初期データをセット
      if (shopItems.length === 0) {
        const shopInitialItems = DEFAULT_INITIAL_ITEMS.filter(item => item.shop_id === shopEmail);
        
        if (shopInitialItems.length > 0) {
          allItems = [...allItems, ...shopInitialItems];
          localStorage.setItem('inventory_items', JSON.stringify(allItems));
          shopItems = shopInitialItems;
        }
      }

      setItems(sortItems(shopItems));
      addToast(`店舗 ${shopEmail} (ローカル) のデータをロードしました`, 'info');
    }
    setLoading(false);
  };

  // セッションチェックと初期初期化
  useEffect(() => {
    async function initPage() {
      const configured = isSupabaseConfigured();
      setUsingSupabase(configured);

      // ローカルストレージからセッション取得
      const localSession = localStorage.getItem('admin_session');
      const localEmail = localStorage.getItem('admin_email');
      const localRole = localStorage.getItem('admin_role') || 'store';

      if (localSession !== 'active' || !localEmail) {
        router.push('/login');
        return;
      }

      setAdminRole(localRole);

      let initialShopEmail = localEmail;

      // 本部管理者の場合、店舗リストを読み込んで最初の店舗を初期表示にする
      if (localRole === 'admin') {
        let loadedShops: Shop[] = [];
        if (configured) {
          try {
            const { data: shopsData } = await supabase
              .from('shops')
              .select('*')
              .eq('role', 'store')
              .order('name', { ascending: true });
            loadedShops = shopsData || [];
          } catch (e) {
            console.error('店舗リストの取得失敗:', e);
          }
        } else {
          const localShops = localStorage.getItem('shops');
          if (localShops) {
            try {
              const parsedShops: Shop[] = JSON.parse(localShops);
              loadedShops = parsedShops.filter(s => s.role === 'store');
            } catch (e) {}
          }
        }
        setShops(loadedShops);
        if (loadedShops.length > 0) {
          initialShopEmail = loadedShops[0].email;
        } else {
          initialShopEmail = ''; // 店舗が1つもない場合
          addToast('管理店舗がありません。本部管理画面で店舗を作成してください', 'info');
        }
      }

      setCurrentShopEmail(initialShopEmail);
    }

    initPage();
  }, [router]);

  // 表示店舗の切り替え検知
  useEffect(() => {
    if (currentShopEmail) {
      loadShopItems(currentShopEmail, usingSupabase);
    }
  }, [currentShopEmail, usingSupabase]);

  // 全体データのうち、現在の店舗以外のデータを崩さずにローカル状態および保存用を同期する
  const syncItemsState = (shopUpdatedItems: Item[]) => {
    const sorted = sortItems(shopUpdatedItems);
    setItems(sorted);

    // ローカルストレージには「全店舗分」のデータをマージして保持する
    const localData = localStorage.getItem('inventory_items');
    let allItems: Item[] = [];
    if (localData) {
      try {
        allItems = JSON.parse(localData);
      } catch (e) {
        allItems = [];
      }
    }

    // 現在の店舗以外のデータを残し、現在の店舗のデータをマージ
    const otherShopsItems = allItems.filter(item => item.shop_id !== currentShopEmail);
    const merged = [...otherShopsItems, ...sorted];
    localStorage.setItem('inventory_items', JSON.stringify(merged));
  };

  // 1個売る
  const handleSell = async (item: Item) => {
    if (item.stock <= 0) return;
    const newStock = item.stock - 1;

    const updated = items.map(i => i.id === item.id ? { ...i, stock: newStock } : i);
    syncItemsState(updated);

    if (usingSupabase) {
      try {
        const { error } = await supabase
          .from('items')
          .update({ stock: newStock })
          .eq('id', item.id);
        if (error) throw error;
        addToast(`${item.name}を1個出庫しました`, 'success');
      } catch (error: any) {
        addToast(`データベース更新エラー: ${error.message}`, 'error');
      }
    } else {
      addToast(`${item.name}を1個出庫しました`, 'success');
    }
  };

  // 1個補充する
  const handleRestock = async (item: Item) => {
    const newStock = item.stock + 1;

    const updated = items.map(i => i.id === item.id ? { ...i, stock: newStock } : i);
    syncItemsState(updated);

    if (usingSupabase) {
      try {
        const { error } = await supabase
          .from('items')
          .update({ stock: newStock })
          .eq('id', item.id);
        if (error) throw error;
        addToast(`${item.name}を1個補充しました`, 'success');
      } catch (error: any) {
        addToast(`データベース更新エラー: ${error.message}`, 'error');
      }
    } else {
      addToast(`${item.name}を1個補充しました`, 'success');
    }
  };

  // 新規商品の追加
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) {
      addToast('商品名を入力してください', 'error');
      return;
    }

    const price = parseInt(newItemPrice) || 0;
    const stock = parseInt(newItemStock) || 0;
    const low = parseInt(newItemLow) || 0;
    const high = parseInt(newItemHigh) || 0;

    const newItemPayload = {
      name: newItemName.trim(),
      stock,
      price,
      threshold_low: low,
      threshold_high: high,
      unit: newItemUnit,
      shop_id: currentShopEmail, // ログイン中の店舗IDを紐付け
    };

    if (usingSupabase) {
      try {
        const { data, error } = await supabase
          .from('items')
          .insert([newItemPayload])
          .select();

        if (error) throw error;

        if (data && data[0]) {
          syncItemsState([...items, data[0]]);
          addToast(`商品「${data[0].name}」を追加しました`, 'success');
        }
      } catch (error: any) {
        addToast(`追加失敗: ${error.message}`, 'error');
      }
    } else {
      const created: Item = {
        id: Date.now().toString(),
        ...newItemPayload,
        created_at: new Date().toISOString()
      };
      syncItemsState([...items, created]);
      addToast(`商品「${created.name}」を追加しました（ローカル）`, 'success');
    }

    setNewItemName('');
    setNewItemStock('10');
    setNewItemPrice('1000');
    setNewItemUnit('個');
    setNewItemLow('5');
    setNewItemHigh('20');
  };

  // インライン編集の開始
  const startEditing = (item: Item) => {
    setEditingItemId(item.id);
    setEditName(item.name);
    setEditPrice(item.price.toString());
    setEditStock(item.stock.toString());
    setEditLow(item.threshold_low.toString());
    setEditHigh(item.threshold_high.toString());
    setEditUnit(item.unit || '個');
  };

  // インライン編集の保存
  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) {
      addToast('商品名を入力してください', 'error');
      return;
    }

    const price = parseInt(editPrice) || 0;
    const stock = parseInt(editStock) || 0;
    const low = parseInt(editLow) || 0;
    const high = parseInt(editHigh) || 0;

    const updatedItem = {
      name: editName.trim(),
      price,
      stock,
      threshold_low: low,
      threshold_high: high,
      unit: editUnit,
      shop_id: currentShopEmail
    };

    const updated = items.map(i => i.id === id ? { ...i, ...updatedItem } : i);
    syncItemsState(updated);

    if (usingSupabase) {
      try {
        const { error } = await supabase
          .from('items')
          .update(updatedItem)
          .eq('id', id);

        if (error) throw error;
        addToast('商品を更新しました', 'success');
      } catch (error: any) {
        addToast(`更新失敗: ${error.message}`, 'error');
      }
    } else {
      addToast('商品を更新しました（ローカル）', 'success');
    }

    setEditingItemId(null);
  };

  // 商品の削除
  const handleDeleteItem = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除してもよろしいですか？`)) return;

    const updated = items.filter(i => i.id !== id);
    syncItemsState(updated);

    if (usingSupabase) {
      try {
        const { error } = await supabase.from('items').delete().eq('id', id);
        if (error) throw error;
        addToast(`商品「${name}」を削除しました`, 'info');
      } catch (error: any) {
        addToast(`削除失敗: ${error.message}`, 'error');
      }
    } else {
      addToast(`商品「${name}」を削除しました`, 'info');
    }
  };

  // ログアウト処理
  const handleLogout = async () => {
    localStorage.removeItem('admin_session');
    localStorage.removeItem('admin_email');
    localStorage.removeItem('admin_role');
    localStorage.removeItem('admin_name');
    router.push('/login');
  };

  // 集計計算
  const totalValue = items.reduce((sum, item) => sum + (item.stock * item.price), 0);
  const totalStockCount = items.reduce((sum, item) => sum + item.stock, 0);
  const lowCount = items.filter(item => getStatus(item.stock, item.threshold_low, item.threshold_high) === 'low').length;
  const highCount = items.filter(item => getStatus(item.stock, item.threshold_low, item.threshold_high) === 'high').length;

  return (
    <div className="app-container animate-fade-in">
      {/* トースト表示 */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.type === 'success' && <CheckCircle2 size={16} />}
            {t.type === 'error' && <AlertCircle size={16} />}
            {t.type === 'info' && <Database size={16} />}
            <span>{t.text}</span>
          </div>
        ))}
      </div>

      {/* 店舗用ナビバー */}
      <nav className="admin-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <Store size={18} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
            {adminRole === 'admin' ? `本部管理者 (${currentShopEmail})` : `ログイン店舗: ${currentShopEmail}`}
          </span>
        </div>
        <div className="admin-nav-links">
          {adminRole === 'admin' && (
            <button onClick={() => router.push('/system-admin')} className="btn-nav" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
              <Lock size={13} />
              本部管理画面へ
            </button>
          )}
          <button onClick={handleLogout} className="btn-nav btn-logout">
            <LogOut size={13} />
            ログアウト
          </button>
        </div>
      </nav>

      {/* ヘッダー */}
      <header className="app-header" style={{ marginBottom: '1.5rem' }}>
        <h1>Smart Inventory</h1>
        <p>初心者にやさしいリアルタイム在庫・発注管理システム</p>
      </header>

      {/* Supabase未設定バナー */}
      {!usingSupabase && (
        <div className="supabase-banner">
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} />
            現在ローカルストレージモードで動作しています。データをデータベースに保存するには、<code>.env.local</code> に Supabase の接続キーを設定してください。
          </span>
        </div>
      )}

      {/* 本部管理者用の店舗切り替えセレクトボックス */}
      {adminRole === 'admin' && (
        <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', borderLeft: '5px solid var(--accent)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Store size={20} style={{ color: 'var(--accent)' }} />
            <div>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>表示する店舗を切り替え</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>本部は在庫を持たないため、選択した店舗の在庫画面として操作します。</span>
            </div>
          </div>
          <div style={{ minWidth: '220px' }}>
            {shops.length === 0 ? (
              <span style={{ fontSize: '0.85rem', color: 'var(--color-low)' }}>管理中の店舗がありません</span>
            ) : (
              <select 
                className="form-input" 
                value={currentShopEmail} 
                onChange={e => setCurrentShopEmail(e.target.value)}
                style={{ cursor: 'pointer', fontWeight: 600, background: 'rgba(15, 23, 42, 0.8)' }}
              >
                {shops.map(shop => (
                  <option key={shop.id} value={shop.email}>
                    {shop.name} ({shop.email})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}

      {/* 接続先情報 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', alignItems: 'center', gap: '0.4rem' }}>
        <Database size={14} color={usingSupabase ? '#10b981' : '#f59e0b'} />
        <span>接続先: {usingSupabase ? 'Supabase Database' : 'ブラウザローカルストレージ'}</span>
      </div>

      {/* サマリーバー */}
      <section className="summary-bar">
        <div className="summary-item total">
          <div className="summary-icon" style={{ background: 'rgba(255,255,255,0.05)', color: 'white' }}>
            <DollarSign size={20} />
          </div>
          <div className="summary-info">
            <span className="summary-label">在庫総資産額</span>
            <span className="summary-value">¥{totalValue.toLocaleString()}</span>
          </div>
        </div>

        <div className="summary-item low">
          <div className="summary-icon">
            <TrendingDown size={20} />
          </div>
          <div className="summary-info">
            <span className="summary-label">不足（要発注）</span>
            <span className="summary-value" style={{ color: 'var(--color-low)' }}>{lowCount} 件</span>
          </div>
        </div>

        <div className="summary-item high">
          <div className="summary-icon">
            <AlertTriangle size={20} />
          </div>
          <div className="summary-info">
            <span className="summary-label">在庫過剰</span>
            <span className="summary-value" style={{ color: 'var(--color-high)' }}>{highCount} 件</span>
          </div>
        </div>
      </section>

      {/* メイングリッド */}
      <main className="dashboard-grid">
        {/* 左側：在庫リスト */}
        <section className="glass-card">
          <div className="list-section-header">
            <h2>
              <Package size={20} />
              商品在庫状況一覧
            </h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              全 {items.length} 品目 (総在庫数: {totalStockCount}点)
            </span>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              読み込み中...
            </div>
          ) : items.length === 0 ? (
            <div className="empty-state">
              <Package className="empty-state-icon" />
              <p>登録されている商品がありません。</p>
              <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>右側のフォームから商品を追加してください。</p>
            </div>
          ) : (
            <div className="items-list">
              {items.map(item => {
                const isEditing = editingItemId === item.id;
                const status = getStatus(item.stock, item.threshold_low, item.threshold_high);

                if (isEditing) {
                  return (
                    <div key={item.id} className="edit-form-overlay animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--accent)' }}>商品を編集</span>
                        <button onClick={() => setEditingItemId(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                          <X size={18} />
                        </button>
                      </div>

                      <div className="form-group">
                        <label>商品名</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                        />
                      </div>

                      <div className="form-grid-2">
                        <div className="form-group">
                          <label>在庫数</label>
                          <input 
                            type="number" 
                            className="form-input" 
                            value={editStock}
                            onChange={e => setEditStock(e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label>単位</label>
                          <select 
                            className="form-input" 
                            value={editUnit}
                            onChange={e => setEditUnit(e.target.value)}
                          >
                            <option value="個">個</option>
                            <option value="箱">箱</option>
                            <option value="袋">袋</option>
                          </select>
                        </div>
                      </div>

                      <div className="form-group">
                        <label>単価 (円)</label>
                        <input 
                          type="number" 
                          className="form-input" 
                          value={editPrice}
                          onChange={e => setEditPrice(e.target.value)}
                        />
                      </div>

                      <div className="form-grid-2">
                        <div className="form-group">
                          <label>不足しきい値</label>
                          <input 
                            type="number" 
                            className="form-input" 
                            value={editLow}
                            onChange={e => setEditLow(e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label>過剰しきい値</label>
                          <input 
                            type="number" 
                            className="form-input" 
                            value={editHigh}
                            onChange={e => setEditHigh(e.target.value)}
                          />
                        </div>
                      </div>

                      <button 
                        onClick={() => handleSaveEdit(item.id)} 
                        className="btn btn-submit" 
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                      >
                        <Save size={16} />
                        変更を保存する
                      </button>
                    </div>
                  );
                }

                return (
                  <div key={item.id} className={`item-card status-${status}`}>
                    {/* 商品基本情報 */}
                    <div className="item-info">
                      <div className="item-title">{item.name}</div>
                      <div className="item-meta">
                        {status !== 'normal' && (
                          <span className={`badge ${status}`}>
                            {status === 'low' && '⚠️ 不足 (要発注)'}
                            {status === 'high' && '📦 過剰'}
                          </span>
                        )}
                        <span>単価: ¥{item.price.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* 在庫数と合計金額 */}
                    <div className="item-numbers">
                      <div className="num-box">
                        <span className="num-label">在庫数</span>
                        <span className="num-value" style={{ 
                          color: status === 'low' ? 'var(--color-low)' : status === 'high' ? 'var(--color-high)' : 'var(--text-primary)'
                        }}>
                          {item.stock} {item.unit || '個'}
                        </span>
                      </div>
                      <div className="num-box">
                        <span className="num-label">合計金額</span>
                        <span className="num-value" style={{ fontWeight: 600 }}>
                          ¥{(item.stock * item.price).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* 操作アクション */}
                    <div className="action-buttons">
                      <button 
                        className="btn btn-sell" 
                        onClick={() => handleSell(item)}
                        disabled={item.stock <= 0}
                        title="在庫を1つ減らします"
                      >
                        <Minus size={15} />
                        1個売る
                      </button>
                      <button 
                        className="btn btn-restock" 
                        onClick={() => handleRestock(item)}
                        title="在庫を1つ増やします"
                      >
                        <Plus size={15} />
                        補充する
                      </button>
                      {adminRole === 'admin' && (
                        <>
                          <button 
                            onClick={() => startEditing(item)} 
                            className="btn-edit"
                            style={{ marginLeft: '0.4rem' }}
                            title="商品情報を編集します"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button 
                            onClick={() => handleDeleteItem(item.id, item.name)}
                            style={{ 
                              background: 'transparent', 
                              border: 'none', 
                              color: 'var(--text-muted)', 
                              cursor: 'pointer',
                              padding: '0.5rem'
                            }}
                            title="商品を削除します"
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 右側サイドバー (新規商品登録 ＆ ガイド) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* 新規商品登録カード (本部管理者のみ表示) */}
          {adminRole === 'admin' ? (
            <section className="glass-card">
              <h2 className="sidebar-title">
                <Plus size={20} style={{ color: 'var(--accent)' }} />
                新規商品を登録
              </h2>
              
              <form onSubmit={handleAddItem}>
                <div className="form-group">
                  <label>商品名</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="例: オリジナルブレンドコーヒー" 
                    value={newItemName}
                    onChange={e => setNewItemName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>初期在庫数</label>
                    <input 
                      type="number" 
                      min="0"
                      className="form-input" 
                      value={newItemStock}
                      onChange={e => setNewItemStock(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>単位</label>
                    <select 
                      className="form-input" 
                      value={newItemUnit}
                      onChange={e => setNewItemUnit(e.target.value)}
                      required
                    >
                      <option value="個">個</option>
                      <option value="箱">箱</option>
                      <option value="袋">袋</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>単価 (円)</label>
                  <input 
                    type="number" 
                    min="0"
                    className="form-input" 
                    value={newItemPrice}
                    onChange={e => setNewItemPrice(e.target.value)}
                    required
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>不足しきい値</label>
                    <input 
                      type="number" 
                      min="0"
                      className="form-input" 
                      value={newItemLow}
                      onChange={e => setNewItemLow(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>過剰しきい値</label>
                    <input 
                      type="number" 
                      min="0"
                      className="form-input" 
                      value={newItemHigh}
                      onChange={e => setNewItemHigh(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-submit">
                  商品を登録する
                </button>
              </form>
            </section>
          ) : (
            <section className="glass-card" style={{ borderLeft: '5px solid var(--accent)' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.5rem' }}>
                🏪 在庫管理モード
              </span>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                現在、店舗スタッフ用画面でログインしています。
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4', marginTop: '0.4rem' }}>
                商品の「出庫（1個売る）」および「補充」のみ可能です。商品の新規登録や編集・削除は本部管理者が行います。
              </p>
            </section>
          )}

          {/* クイックガイド */}
          <section className="glass-card">
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
              💡 色分けのルール
            </span>
            <ul style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <li><strong style={{ color: 'var(--color-low)' }}>赤色（不足）</strong>: 不足しきい値未満。最優先で発注してください。</li>
              <li><strong style={{ color: 'var(--color-high)' }}>黄色（過剰）</strong>: 過剰しきい値超。余剰在庫が発生しています。</li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
