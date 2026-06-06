"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Package, 
  TrendingDown, 
  CheckCircle2, 
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
  Save
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
  created_at: string;
}

const INITIAL_ITEMS: Item[] = [
  {
    id: '1',
    name: 'プレミアムコーヒー豆',
    stock: 3,
    price: 1200,
    threshold_low: 5,
    threshold_high: 20,
    unit: '袋',
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
    created_at: new Date(Date.now() - 100000).toISOString()
  }
];

export default function Home() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingSupabase, setUsingSupabase] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; text: string; type: 'success' | 'error' | 'info' }[]>([]);

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

  // データ初期ロード
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const configured = isSupabaseConfigured();
      setUsingSupabase(configured);

      if (configured) {
        try {
          const { data, error } = await supabase.from('items').select('*');
          if (error) throw error;

          if (data && data.length > 0) {
            setItems(sortItems(data));
          } else {
            // Supabaseが空の場合、初期データを挿入
            const { error: insertError } = await supabase
              .from('items')
              .insert(INITIAL_ITEMS.map(({ id, ...rest }) => rest));

            if (insertError) throw insertError;

            const { data: refetchedData } = await supabase.from('items').select('*');
            if (refetchedData) {
              setItems(sortItems(refetchedData));
            }
          }
          addToast('Supabaseから最新データをロードしました', 'success');
        } catch (error: any) {
          console.error('Supabase接続失敗。ローカルストレージへフォールバックします:', error.message);
          setUsingSupabase(false);
          loadFromLocalStorage();
          addToast('一時的にローカルストレージデータを使用しています', 'error');
        }
      } else {
        loadFromLocalStorage();
      }
      setLoading(false);
    }

    loadData();
  }, []);

  const loadFromLocalStorage = () => {
    const localData = localStorage.getItem('inventory_items');
    if (localData) {
      try {
        setItems(sortItems(JSON.parse(localData)));
      } catch (e) {
        setItems(sortItems(INITIAL_ITEMS));
        localStorage.setItem('inventory_items', JSON.stringify(INITIAL_ITEMS));
      }
    } else {
      setItems(sortItems(INITIAL_ITEMS));
      localStorage.setItem('inventory_items', JSON.stringify(INITIAL_ITEMS));
    }
    addToast('ローカルデータを使用中', 'info');
  };

  const saveItemsState = (updatedItems: Item[]) => {
    const sorted = sortItems(updatedItems);
    setItems(sorted);
    localStorage.setItem('inventory_items', JSON.stringify(sorted));
  };

  // 1個売る
  const handleSell = async (item: Item) => {
    if (item.stock <= 0) return;
    const newStock = item.stock - 1;

    const updated = items.map(i => i.id === item.id ? { ...i, stock: newStock } : i);
    saveItemsState(updated);

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
    saveItemsState(updated);

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
    };

    if (usingSupabase) {
      try {
        const { data, error } = await supabase
          .from('items')
          .insert([newItemPayload])
          .select();

        if (error) throw error;

        if (data && data[0]) {
          saveItemsState([...items, data[0]]);
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
      saveItemsState([...items, created]);
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
      unit: editUnit
    };

    const updated = items.map(i => i.id === id ? { ...i, ...updatedItem } : i);
    saveItemsState(updated);

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
    saveItemsState(updated);

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

      {/* ヘッダー */}
      <header className="app-header">
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
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 右側サイドバー (新規商品登録 ＆ クイック設定 ＆ ログイン設定への遷移) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* 新規商品登録カード */}
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

          {/* 管理者ログイン（ログイン設定用） */}
          <section className="glass-card">
            <h2 className="sidebar-title" style={{ fontSize: '1rem', marginBottom: '0.8rem' }}>
              ⚙️ 管理者設定
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: '1.4' }}>
              管理者ログイン用のメールアドレスやパスワードを変更するには、管理者ログインを行ってください。
            </p>
            <button 
              onClick={() => router.push('/login')} 
              className="btn"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.55rem', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent' }}
            >
              <Lock size={13} />
              管理者ログイン設定へ
            </button>
          </section>

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
