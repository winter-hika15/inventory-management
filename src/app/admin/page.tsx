"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Package, 
  Plus, 
  Trash2, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  LogOut, 
  Edit2, 
  X,
  Save, 
  User, 
  Lock,
  Store
} from 'lucide-react';

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

export default function Admin() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
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

  // アカウント/ログイン設定フォーム用
  const [adminEmail, setAdminEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [settingLoading, setSettingLoading] = useState(false);

  // トースト通知
  const addToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // セッションチェックとデータロード
  useEffect(() => {
    const initPage = async () => {
      setLoading(true);

      // サーバーサイドでセッションを検証
      try {
        const sessionRes = await fetch('/api/auth/session');
        const sessionData = await sessionRes.json();

        if (!sessionData.authenticated || !sessionData.user) {
          router.push('/login');
          return;
        }

        const { email: userEmail, role: userRole } = sessionData.user;
        setAdminRole(userRole);

        // 本部管理者（role === 'admin'）以外はアクセスを禁止し、トップページへリダイレクト
        if (userRole !== 'admin') {
          router.push('/');
          return;
        }

        const shopEmail = userEmail;
        setCurrentShopEmail(shopEmail);
        setAdminEmail(shopEmail);

        // 自店舗の商品のみロード
        try {
          const res = await fetch(`/api/items?shop_id=${encodeURIComponent(shopEmail)}`);
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          setItems(sortItems(data.items || []));
        } catch (error: any) {
          addToast(`データロード失敗: ${error.message}`, 'error');
        }
      } catch (err) {
        console.error('セッション検証エラー:', err);
        router.push('/login');
        return;
      }
      setLoading(false);
    };

    initPage();
  }, [router]);

  // ソート処理（不足「low」が最上部）
  const getStatus = (stock: number, low: number, high: number) => {
    if (stock < low) return 'low';
    if (stock > high) return 'high';
    return 'normal';
  };

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

  // 全体データのうち、現在の店舗以外のデータを崩さずに同期保存
  const syncItemsState = (shopUpdatedItems: Item[]) => {
    const sorted = sortItems(shopUpdatedItems);
    setItems(sorted);
  };

  // 商品登録
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

    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItemPayload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.item) {
        syncItemsState([...items, data.item]);
        addToast(`商品「${data.item.name}」を登録しました`, 'success');
      }
    } catch (error: any) {
      addToast(`登録失敗: ${error.message}`, 'error');
    }

    // クリア
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

    try {
      const res = await fetch(`/api/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedItem)
      });
      if (!res.ok) throw new Error((await res.json()).error);
      addToast('商品を更新しました', 'success');
    } catch (error: any) {
      addToast(`更新失敗: ${error.message}`, 'error');
    }

    setEditingItemId(null);
  };

  // 商品の削除
  const handleDeleteItem = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除してもよろしいですか？`)) return;

    const updated = items.filter(i => i.id !== id);
    syncItemsState(updated);

    try {
      const res = await fetch(`/api/items/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      addToast(`商品「${name}」を削除しました`, 'info');
    } catch (error: any) {
      addToast(`削除失敗: ${error.message}`, 'error');
    }
  };

  // アカウント/ログイン設定の保存
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    addToast('設定変更はこのフェーズでは未実装です（APIへのリファクタリング中）', 'info');
  };

  // ログアウト処理
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

      {/* 管理者ナビバー */}
      <nav className="admin-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <Store size={18} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
            {adminRole === 'admin' ? `本部管理者 (${currentShopEmail})` : `店舗アカウント: ${currentShopEmail}`}
          </span>
        </div>
        <div className="admin-nav-links">
          {adminRole === 'admin' && (
            <button onClick={() => router.push('/system-admin')} className="btn-nav" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
              <Lock size={13} />
              本部管理画面へ
            </button>
          )}
          <button onClick={() => router.push('/')} className="btn-nav">
            <ArrowLeft size={14} />
            一般画面へ戻る
          </button>
          <button onClick={handleLogout} className="btn-nav btn-logout">
            <LogOut size={14} />
            ログアウト
          </button>
        </div>
      </nav>

      <header className="app-header" style={{ marginBottom: '1.5rem' }}>
        <h1>店舗管理者設定</h1>
        <p>自店舗専用の商品の新規登録・編集・削除、およびこの店舗アカウントのセキュリティ設定を行います。</p>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          読み込み中...
        </div>
      ) : (
        <main className="dashboard-grid">
          {/* 左側：管理商品リスト */}
          <section className="glass-card">
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Package size={20} />
              自店舗商品の一覧・編集
            </h2>

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

                    <div className="item-numbers">
                      <div className="num-box">
                        <span className="num-label">在庫数</span>
                        <span className="num-value">{item.stock} {item.unit || '個'}</span>
                      </div>
                      <div className="num-box">
                        <span className="num-label">過不足基準</span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                          下限: {item.threshold_low} / 上限: {item.threshold_high}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <button 
                        onClick={() => startEditing(item)} 
                        className="btn-edit"
                        title="商品情報を編集します"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteItem(item.id, item.name)} 
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.5rem' }}
                        title="商品を削除します"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 右側：登録フォーム ＆ ログイン設定 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* 新規登録カード */}
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

            {/* ログイン設定カード */}
            <section className="glass-card">
              <h2 className="sidebar-title">
                <Lock size={18} style={{ color: '#fbbf24' }} />
                店舗ログイン設定
              </h2>
              
              <form onSubmit={handleSaveSettings}>
                <div className="form-group">
                  <label>店舗メールアドレス</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    value={adminEmail}
                    onChange={e => setAdminEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>新規パスワード</label>
                  <input 
                    type="password" 
                    className="form-input" 
                    placeholder="変更する場合のみ入力" 
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn" 
                  style={{ width: '100%', background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.3)' }}
                  disabled={settingLoading}
                >
                  {settingLoading ? '設定保存中...' : '設定を保存する'}
                </button>
              </form>
            </section>
          </div>
        </main>
      )}
    </div>
  );
}
