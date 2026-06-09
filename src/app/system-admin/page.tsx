"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  Users, 
  ShoppingBag, 
  DollarSign, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Key, 
  LogOut,
  ArrowRight,
  Database,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface Shop {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'store';
  created_at: string;
}

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

interface RestockHistory {
  id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  price: number;
  shop_id: string;
  created_at: string;
}


const DEFAULT_STARTER_ITEMS = [
  { name: 'ベーシックコーヒー豆', stock: 15, price: 1000, threshold_low: 5, threshold_high: 30, unit: '袋' },
  { name: 'ペーパーフィルター 100枚入', stock: 20, price: 450, threshold_low: 8, threshold_high: 40, unit: '箱' },
  { name: 'オリジナルテイクアウトカップ', stock: 120, price: 15, threshold_low: 50, threshold_high: 300, unit: '個' }
];

export default function SystemAdmin() {
  const router = useRouter();
  const [shops, setShops] = useState<Shop[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<{ id: number; text: string; type: 'success' | 'error' | 'info' }[]>([]);

  // フォーム用ステート
  const [newShopName, setNewShopName] = useState('');
  const [newShopEmail, setNewShopEmail] = useState('');
  const [newShopPassword, setNewShopPassword] = useState('');
  const [creating, setCreating] = useState(false);

  // 本部管理者自身のアカウント設定用
  const [adminId, setAdminId] = useState<string>('');
  const [adminEmailInput, setAdminEmailInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [updatingAdmin, setUpdatingAdmin] = useState(false);

  // 編集用ステート
  const [editingShopId, setEditingShopId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');

  // --- 商品管理モーダル用ステート ---
  const [selectedShopForItems, setSelectedShopForItems] = useState<Shop | null>(null);

  // 商品追加フォーム用のステート
  const [newItemName, setNewItemName] = useState('');
  const [newItemStock, setNewItemStock] = useState('10');
  const [newItemPrice, setNewItemPrice] = useState('1000');
  const [newItemUnit, setNewItemUnit] = useState('個');
  const [newItemLow, setNewItemLow] = useState('5');
  const [newItemHigh, setNewItemHigh] = useState('20');
  const [addingItem, setAddingItem] = useState(false);

  // 商品編集用のステート
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemPrice, setEditItemPrice] = useState('0');
  const [editItemStock, setEditItemStock] = useState('0');
  const [editItemLow, setEditItemLow] = useState('0');
  const [editItemHigh, setEditItemHigh] = useState('0');
  const [editItemUnit, setEditItemUnit] = useState('個');
  const [updatingItem, setUpdatingItem] = useState(false);

  // トースト通知
  const addToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // セッション確認 & データロード
  useEffect(() => {
    async function initPage() {
      setLoading(true);

      // サーバーサイドでセッションを検証
      try {
        const sessionRes = await fetch('/api/auth/session');
        const sessionData = await sessionRes.json();

        if (!sessionData.authenticated || !sessionData.user || sessionData.user.role !== 'admin') {
          router.push('/login');
          return;
        }

        const { id: userId, email: userEmail } = sessionData.user;
        setAdminId(userId);

        try {
          // 店舗データロード
          const shopsRes = await fetch('/api/shops');
          const shopsData = await shopsRes.json();
          if (shopsRes.ok) setShops(shopsData.shops || []);

          // 全商品データロード
          const itemsRes = await fetch('/api/items');
          const itemsData = await itemsRes.json();
          if (itemsRes.ok) setItems(itemsData.items || []);

        } catch (err: any) {
          addToast(`データ取得失敗: ${err.message}`, 'error');
        }
        
        setAdminEmailInput(userEmail);
      } catch (err) {
        console.error('セッション検証エラー:', err);
        router.push('/login');
        return;
      }
      setLoading(false);
    }
    initPage();
  }, [router]);

  // 補充履歴の記録（本部管理者画面用）
  const addRestockLog = async (itemId: string, itemName: string, quantity: number, price: number, shopEmail: string) => {
    if (quantity <= 0) return;

    const newLogPayload = {
      item_id: itemId,
      item_name: itemName,
      quantity,
      price,
      shop_id: shopEmail,
    };

    try {
      await fetch('/api/restock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLogPayload)
      });
    } catch (error: any) {
      console.error('補充履歴の保存に失敗しました:', error.message);
    }
  };


  // 店舗の新規発行
  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopName.trim() || !newShopEmail.trim() || !newShopPassword.trim()) {
      addToast('すべての項目を入力してください', 'error');
      return;
    }

    // 重複チェック
    if (shops.some(s => s.email.toLowerCase() === newShopEmail.trim().toLowerCase())) {
      addToast('このメールアドレスは既に登録されています', 'error');
      return;
    }

    setCreating(true);
    const newShopPayload = {
      name: newShopName.trim(),
      email: newShopEmail.trim(),
      password: newShopPassword.trim(),
      role: 'store' as const,
    };

    try {
      const res = await fetch('/api/shops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newShopPayload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.shop) {
        const createdShop = data.shop;
        setShops(prev => [createdShop, ...prev]);

        // 2. 店舗用の初期スターターキット商品の追加
        const starterPayloads = DEFAULT_STARTER_ITEMS.map(starter => ({
          ...starter,
          shop_id: createdShop.email
        }));

        for (const starter of starterPayloads) {
          const itemRes = await fetch('/api/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(starter)
          });
          if (itemRes.ok) {
            const itemData = await itemRes.json();
            if (itemData.item) setItems(prev => [...prev, itemData.item]);
          }
        }

        addToast(`店舗「${createdShop.name}」を発行しました（初期データ自動セット済）`, 'success');
      }
    } catch (err: any) {
      addToast(`店舗発行失敗: ${err.message}`, 'error');
    } finally {
      setCreating(false);
    }

    // フォームリセット
    setNewShopName('');
    setNewShopEmail('');
    setNewShopPassword('');
  };

  // 店舗の編集開始
  const startEditing = (shop: Shop) => {
    setEditingShopId(shop.id);
    setEditName(shop.name);
    setEditEmail(shop.email);
    setEditPassword(shop.password || '');
  };

  // 店舗の編集保存
  const handleSaveEdit = async (shopId: string) => {
    if (!editName.trim() || !editEmail.trim() || !editPassword.trim()) {
      addToast('店舗名、メールアドレス、パスワードを入力してください', 'error');
      return;
    }

    const targetShop = shops.find(s => s.id === shopId);
    if (!targetShop) return;

    const oldEmail = targetShop.email;
    const newEmail = editEmail.trim();

    // メールアドレスが変更された場合の重複チェック
    if (newEmail.toLowerCase() !== oldEmail.toLowerCase() && 
        shops.some(s => s.id !== shopId && s.email.toLowerCase() === newEmail.toLowerCase())) {
      addToast('このメールアドレスは既に登録されています', 'error');
      return;
    }

    const updatedFields = {
      name: editName.trim(),
      email: newEmail,
      password: editPassword.trim()
    };

    try {
      const res = await fetch(`/api/shops/${shopId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShops(prev => prev.map(s => s.id === shopId ? { ...s, ...updatedFields } : s));
      setItems(prev => prev.map(item => item.shop_id === oldEmail ? { ...item, shop_id: newEmail } : item));
      addToast('店舗情報を更新しました', 'success');
    } catch (err: any) {
      addToast(`更新失敗: ${err.message}`, 'error');
    }

    setEditingShopId(null);
  };

  // 店舗の削除
  const handleDeleteShop = async (shop: Shop) => {
    if (shop.role === 'admin') {
      addToast('本部管理者アカウントは削除できません', 'error');
      return;
    }

    const confirmMsg = `店舗「${shop.name}」を完全に削除してもよろしいですか？\nこの店舗の登録商品・在庫データもすべて削除されます。この操作は取り消せません。`;
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/shops/${shop.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);

      setShops(prev => prev.filter(s => s.id !== shop.id));
      setItems(prev => prev.filter(item => item.shop_id !== shop.email));
      addToast(`店舗「${shop.name}」と関連在庫データを削除しました`, 'info');
    } catch (err: any) {
      addToast(`削除失敗: ${err.message}`, 'error');
    }
  };

  // --- 店舗別商品の追加・編集・削除アクション ---

  // 特定店舗への商品追加
  const handleAddProduct = async (e: React.FormEvent, shopEmail: string) => {
    e.preventDefault();
    if (!newItemName.trim()) {
      addToast('商品名を入力してください', 'error');
      return;
    }

    setAddingItem(true);
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
      shop_id: shopEmail,
    };

    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItemPayload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.item) {
        setItems(prev => [...prev, data.item]);
        if (stock > 0) {
          addRestockLog(data.item.id, data.item.name, stock, price, shopEmail);
        }
        addToast(`商品「${data.item.name}」を追加しました`, 'success');
      }
    } catch (err: any) {
      addToast(`追加失敗: ${err.message}`, 'error');
    } finally {
      setAddingItem(false);
    }


    // フォームクリア
    setNewItemName('');
    setNewItemStock('10');
    setNewItemPrice('1000');
    setNewItemUnit('個');
    setNewItemLow('5');
    setNewItemHigh('20');
  };

  // 商品編集の開始
  const startEditingProduct = (item: Item) => {
    setEditingItemId(item.id);
    setEditItemName(item.name);
    setEditItemPrice(item.price.toString());
    setEditItemStock(item.stock.toString());
    setEditItemLow(item.threshold_low.toString());
    setEditItemHigh(item.threshold_high.toString());
    setEditItemUnit(item.unit || '個');
  };

  // 商品編集の保存
  const handleSaveProductEdit = async (id: string, shopEmail: string) => {
    if (!editItemName.trim()) {
      addToast('商品名を入力してください', 'error');
      return;
    }

    setUpdatingItem(true);
    const price = parseInt(editItemPrice) || 0;
    const stock = parseInt(editItemStock) || 0;
    const low = parseInt(editItemLow) || 0;
    const high = parseInt(editItemHigh) || 0;

    // 編集前の商品データを取得して、在庫増の場合は補充履歴を記録
    const originalItem = items.find(i => i.id === id);
    const oldStock = originalItem ? originalItem.stock : 0;
    const restockQty = stock - oldStock;

    const updatedItem = {
      name: editItemName.trim(),
      price,
      stock,
      threshold_low: low,
      threshold_high: high,
      unit: editItemUnit,
      shop_id: shopEmail
    };

    try {
      const res = await fetch(`/api/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedItem)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setItems(prev => prev.map(i => i.id === id ? { ...i, ...updatedItem } : i));
      if (restockQty > 0) {
        addRestockLog(id, updatedItem.name, restockQty, price, shopEmail);
      }
      addToast('商品を更新しました', 'success');
    } catch (err: any) {
      addToast(`更新失敗: ${err.message}`, 'error');
    } finally {
      setUpdatingItem(false);
    }


    setEditingItemId(null);
  };

  // 商品の削除
  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`商品「${name}」を削除してもよろしいですか？`)) return;

    try {
      const res = await fetch(`/api/items/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      
      setItems(prev => prev.filter(i => i.id !== id));
      addToast(`商品「${name}」を削除しました`, 'info');
    } catch (err: any) {
      addToast(`削除失敗: ${err.message}`, 'error');
    }
  };
 
  // ログアウト
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('ログアウトエラー:', err);
    }
    localStorage.removeItem('admin_email');
    localStorage.removeItem('admin_role');
    localStorage.removeItem('admin_name');
    router.push('/login');
  };

  // 本部管理者自身のアカウント設定変更
  const handleUpdateAdminSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmailInput.trim()) {
      addToast('メールアドレスを入力してください', 'error');
      return;
    }

    if (!adminId) {
      addToast('管理者情報の取得に失敗しました', 'error');
      return;
    }

    setUpdatingAdmin(true);
    const updatedFields: any = {
      email: adminEmailInput.trim(),
    };
    if (adminPasswordInput.trim()) {
      updatedFields.password = adminPasswordInput.trim();
    }

    try {
      const res = await fetch(`/api/shops/${adminId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      localStorage.setItem('admin_email', adminEmailInput.trim());
      addToast('管理者アカウントの設定を更新しました', 'success');
      setAdminPasswordInput('');
    } catch (err: any) {
      addToast(`更新失敗: ${err.message}`, 'error');
    } finally {
      setUpdatingAdmin(false);
    }
  };

  // 集計データの計算
  const storeShops = shops.filter(s => s.role === 'store');
  const totalShopsCount = storeShops.length;
  const totalItemsCount = items.length;
  const totalStockCount = items.reduce((sum, i) => sum + i.stock, 0);
  const totalAssetValue = items.reduce((sum, i) => sum + (i.stock * i.price), 0);

  // 店舗別の集計データを算出するヘルパー
  const getShopStats = (shopEmail: string) => {
    const shopItems = items.filter(item => item.shop_id === shopEmail);
    const itemTypesCount = shopItems.length;
    const assetValue = shopItems.reduce((sum, i) => sum + (i.stock * i.price), 0);
    const lowStockCount = shopItems.filter(i => i.stock < i.threshold_low).length;
    return { itemTypesCount, assetValue, lowStockCount };
  };

  return (
    <div className="app-container animate-fade-in">
      {/* トースト */}
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

      {/* 本部管理者用ナビバー */}
      <nav className="admin-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <Building2 size={20} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.02em' }}>本部管理者ダッシュボード</span>
        </div>
        <div className="admin-nav-links">
          <button onClick={() => router.push('/')} className="btn-nav" style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'white' }}>
            店舗在庫画面へ
            <ArrowRight size={14} />
          </button>
          <button onClick={handleLogout} className="btn-nav btn-logout">
            <LogOut size={14} />
            ログアウト
          </button>
        </div>
      </nav>

      {/* ヘッダー */}
      <header className="app-header" style={{ marginBottom: '2rem' }}>
        <h1>本部管理センター</h1>
        <p>新規店舗アカウントの発行・認証情報の設定、および各店舗の在庫概要をリアルタイムに集計・監査します。</p>
      </header>


      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-secondary)' }}>
          店舗データおよび集計情報をロード中...
        </div>
      ) : (
        <>
          {/* 本部サマリー統計 */}
          <section className="summary-bar" style={{ marginBottom: '2.5rem' }}>
            <div className="summary-item total">
              <div className="summary-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent)' }}>
                <Building2 size={20} />
              </div>
              <div className="summary-info">
                <span className="summary-label">管理店舗数</span>
                <span className="summary-value">{totalShopsCount} 店舗</span>
              </div>
            </div>

            <div className="summary-item total">
              <div className="summary-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                <ShoppingBag size={20} />
              </div>
              <div className="summary-info">
                <span className="summary-label">全店舗・総品目数</span>
                <span className="summary-value">{totalItemsCount} 品目</span>
              </div>
            </div>

            <div className="summary-item total">
              <div className="summary-icon" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'white' }}>
                <DollarSign size={20} />
              </div>
              <div className="summary-info">
                <span className="summary-label">全店舗・総在庫資産額</span>
                <span className="summary-value">¥{totalAssetValue.toLocaleString()}</span>
              </div>
            </div>
          </section>

          {/* メインダッシュボードグリッド */}
          <main className="dashboard-grid">
            
            {/* 左側：店舗一覧および各店舗の在庫状況 */}
            <section className="glass-card">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Users size={20} style={{ color: 'var(--accent)' }} />
                登録店舗アカウント・在庫状況一覧
              </h2>

              <div className="items-list" style={{ gap: '1.25rem' }}>
                {shops.map(shop => {
                  const isEditing = editingShopId === shop.id;
                  
                  // 管理者アカウントは表示を制限
                  if (shop.role === 'admin') return null;

                  // 各店舗の統計情報を取得
                  const stats = getShopStats(shop.email);

                  if (isEditing) {
                    return (
                      <div key={shop.id} className="edit-form-overlay animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--accent)' }}>店舗情報を編集</span>
                          <button onClick={() => setEditingShopId(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                            <X size={18} />
                          </button>
                        </div>

                        <div className="form-group">
                          <label>店舗名</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                          />
                        </div>

                        <div className="form-group">
                          <label>店舗メールアドレス (ログインID)</label>
                          <input 
                            type="email" 
                            className="form-input" 
                            value={editEmail}
                            onChange={e => setEditEmail(e.target.value)}
                          />
                        </div>

                        <div className="form-group">
                          <label>ログインパスワード</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            value={editPassword}
                            onChange={e => setEditPassword(e.target.value)}
                          />
                        </div>

                        <button 
                          onClick={() => handleSaveEdit(shop.id)} 
                          className="btn btn-submit" 
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                        >
                          <Save size={16} />
                          店舗情報を保存
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div 
                      key={shop.id} 
                      className={`item-card`}
                      style={{ 
                        borderLeft: '5px solid var(--accent)',
                        background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.04), transparent)',
                        padding: '1.5rem'
                      }}
                    >
                      {/* 店舗アカウント基本情報 */}
                      <div className="item-info" style={{ gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{shop.name}</span>
                          {stats.lowStockCount > 0 && (
                            <span className="badge low" style={{ fontSize: '0.7rem' }}>
                              ⚠️ 不足 {stats.lowStockCount} 件
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          <span>ID: <code>{shop.email}</code></span>
                          
                          {/* パスワード状態表示（セキュリティのため平文表示は不可） */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                            <Key size={12} />
                            <span>パスワード:</span>
                            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#10b981' }}>
                              🔒 設定済み（セキュリティ保護中）
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 在庫・売上サマリー */}
                      <div className="item-numbers" style={{ gap: '2rem' }}>
                        <div className="num-box">
                          <span className="num-label">取扱品目</span>
                          <span className="num-value">{stats.itemTypesCount} 品目</span>
                        </div>
                        <div className="num-box">
                          <span className="num-label">在庫総資産</span>
                          <span className="num-value" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                            ¥{stats.assetValue.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* アクションボタン */}
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button 
                          onClick={() => setSelectedShopForItems(shop)} 
                          className="btn-nav"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderColor: 'rgba(255,255,255,0.15)', color: 'white', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                          title="店舗の在庫商品を管理します"
                        >
                          <ShoppingBag size={14} />
                          商品管理
                        </button>
                        <button 
                          onClick={() => startEditing(shop)} 
                          className="btn-edit"
                          style={{ marginLeft: '0.5rem' }}
                          title="店舗のログイン設定を編集します"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteShop(shop)} 
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.5rem' }}
                          title="店舗アカウントを削除します"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            </section>

            {/* 右側：新規店舗アカウントの発行 */}
            <section className="glass-card" style={{ height: 'fit-content' }}>
              <h2 className="sidebar-title">
                <Plus size={20} style={{ color: 'var(--accent)' }} />
                新規店舗を発行・設定
              </h2>
              
              <form onSubmit={handleCreateShop}>
                <div className="form-group">
                  <label>店舗名</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="例: 渋谷店" 
                    value={newShopName}
                    onChange={e => setNewShopName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>店舗メールアドレス (ログインID)</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    placeholder="shibuya@example.com" 
                    value={newShopEmail}
                    onChange={e => setNewShopEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1.75rem' }}>
                  <label>初期ログインパスワード</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="パスワードを入力" 
                    value={newShopPassword}
                    onChange={e => setNewShopPassword(e.target.value)}
                    required
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn btn-submit"
                  disabled={creating}
                >
                  {creating ? '店舗アカウント作成中...' : '店舗アカウントを発行する'}
                </button>
              </form>

              <div style={{ 
                marginTop: '1.5rem', 
                background: 'rgba(139, 92, 246, 0.05)', 
                border: '1px solid rgba(139, 92, 246, 0.1)', 
                padding: '0.85rem', 
                borderRadius: '8px',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)'
              }}>
                <span style={{ color: 'var(--accent)', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                  💡 スターター機能
                </span>
                店舗発行時に、よく使われる基本消耗品（コーヒー豆や紙カップ等）が初期在庫データとして自動的にセットされ、すぐに店舗運用デモが開始できます。
              </div>
            </section>

            {/* 本部管理者ログイン設定カード */}
            <section className="glass-card">
              <h2 className="sidebar-title">
                <Key size={18} style={{ color: '#fbbf24' }} />
                本部管理者ログイン設定
              </h2>
              
              <form onSubmit={handleUpdateAdminSettings}>
                <div className="form-group">
                  <label>管理者メールアドレス</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    value={adminEmailInput}
                    onChange={e => setAdminEmailInput(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>新規パスワード</label>
                  <input 
                    type="password" 
                    className="form-input" 
                    placeholder="変更する場合のみ入力" 
                    value={adminPasswordInput}
                    onChange={e => setAdminPasswordInput(e.target.value)}
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn" 
                  style={{ width: '100%', background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.3)' }}
                  disabled={updatingAdmin}
                >
                  {updatingAdmin ? '設定保存中...' : '管理者設定を保存する'}
                </button>
              </form>
            </section>

          </main>
        </>
      )}

      {/* 店舗別商品管理モーダル */}
      {selectedShopForItems && (
        <div className="modal-overlay" onClick={() => setSelectedShopForItems(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '850px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-primary)' }}>
                  <ShoppingBag size={22} style={{ color: 'var(--accent)' }} />
                  {selectedShopForItems.name} の在庫商品管理
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  ログインID（メールアドレス）: <code>{selectedShopForItems.email}</code>
                </p>
              </div>
              <button onClick={() => setSelectedShopForItems(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
                
                {/* 左側：商品リスト */}
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)' }}>登録済みの商品一覧</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '50vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
                    {items.filter(item => item.shop_id === selectedShopForItems.email).length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.05)' }}>
                        登録されている商品がありません。右側のフォームから追加してください。
                      </div>
                    ) : (
                      items.filter(item => item.shop_id === selectedShopForItems.email).map(item => {
                        const isEditing = editingItemId === item.id;
                        if (isEditing) {
                          return (
                            <div key={item.id} style={{ background: 'rgba(30, 41, 59, 0.9)', border: '1px solid var(--accent)', padding: '1.25rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--accent)' }}>商品を編集</span>
                              </div>

                              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                                <label style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>商品名</label>
                                <input type="text" className="form-input" value={editItemName} onChange={e => setEditItemName(e.target.value)} style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }} />
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                  <label style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>在庫数</label>
                                  <input type="number" className="form-input" value={editItemStock} onChange={e => setEditItemStock(e.target.value)} style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                  <label style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>単位</label>
                                  <select className="form-input" value={editItemUnit} onChange={e => setEditItemUnit(e.target.value)} style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}>
                                    <option value="個">個</option>
                                    <option value="箱">箱</option>
                                    <option value="袋">袋</option>
                                  </select>
                                </div>
                              </div>

                              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                                <label style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>単価 (円)</label>
                                <input type="number" className="form-input" value={editItemPrice} onChange={e => setEditItemPrice(e.target.value)} style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }} />
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                  <label style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>不足しきい値</label>
                                  <input type="number" className="form-input" value={editItemLow} onChange={e => setEditItemLow(e.target.value)} style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                  <label style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>過剰しきい値</label>
                                  <input type="number" className="form-input" value={editItemHigh} onChange={e => setEditItemHigh(e.target.value)} style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }} />
                                </div>
                              </div>

                              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                <button className="btn btn-submit" onClick={() => handleSaveProductEdit(item.id, selectedShopForItems.email)} disabled={updatingItem} style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem', marginTop: 0 }}>
                                  保存
                                </button>
                                <button className="btn btn-cancel" onClick={() => setEditingItemId(null)} style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}>
                                  キャンセル
                                </button>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', transition: 'all 0.2s' }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{item.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'flex', gap: '0.8rem' }}>
                                <span>在庫: <strong style={{ color: item.stock < item.threshold_low ? 'var(--color-low)' : 'var(--text-primary)' }}>{item.stock} {item.unit || '個'}</strong></span>
                                <span>単価: ¥{item.price.toLocaleString()}</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <button className="btn-edit" onClick={() => startEditingProduct(item)} style={{ padding: '0.4rem' }} title="商品情報を編集する">
                                <Edit2 size={14} />
                              </button>
                              <button onClick={() => handleDeleteProduct(item.id, item.name)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.4rem' }} title="商品を削除する">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 右側：新規追加フォーム */}
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)' }}>新規商品を追加</h3>
                  <form onSubmit={e => handleAddProduct(e, selectedShopForItems.email)} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', padding: '1.25rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>商品名</label>
                      <input type="text" className="form-input" placeholder="例: エスプレッソカップ" value={newItemName} onChange={e => setNewItemName(e.target.value)} required />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>初期在庫数</label>
                        <input type="number" min="0" className="form-input" value={newItemStock} onChange={e => setNewItemStock(e.target.value)} required />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>単位</label>
                        <select className="form-input" value={newItemUnit} onChange={e => setNewItemUnit(e.target.value)}>
                          <option value="個">個</option>
                          <option value="箱">箱</option>
                          <option value="袋">袋</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>単価 (円)</label>
                      <input type="number" min="0" className="form-input" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} required />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>不足しきい値</label>
                        <input type="number" min="0" className="form-input" value={newItemLow} onChange={e => setNewItemLow(e.target.value)} required />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>過剰しきい値</label>
                        <input type="number" min="0" className="form-input" value={newItemHigh} onChange={e => setNewItemHigh(e.target.value)} required />
                      </div>
                    </div>

                    <button type="submit" className="btn btn-submit" disabled={addingItem} style={{ marginTop: '0.5rem' }}>
                      {addingItem ? '商品追加中...' : '商品を登録する'}
                    </button>
                  </form>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
