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
  Eye, 
  EyeOff,
  LogOut,
  ArrowRight,
  Database,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

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
  const [usingSupabase, setUsingSupabase] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; text: string; type: 'success' | 'error' | 'info' }[]>([]);

  // フォーム用ステート
  const [newShopName, setNewShopName] = useState('');
  const [newShopEmail, setNewShopEmail] = useState('');
  const [newShopPassword, setNewShopPassword] = useState('');
  const [creating, setCreating] = useState(false);

  // 本部管理者自身のアカウント設定用
  const [adminEmailInput, setAdminEmailInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [updatingAdmin, setUpdatingAdmin] = useState(false);

  // パスワード表示トグル用
  const [visiblePasswords, setVisiblePasswords] = useState<{ [key: string]: boolean }>({});

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
      const configured = isSupabaseConfigured();
      setUsingSupabase(configured);

      // セッションの確認
      const localSession = localStorage.getItem('admin_session');
      const localEmail = localStorage.getItem('admin_email');
      const localRole = localStorage.getItem('admin_role');

      if (localSession !== 'active' || localRole !== 'admin') {
        router.push('/login');
        return;
      }

      if (configured) {
        try {
          // 店舗データロード
          const { data: shopsData, error: shopsError } = await supabase
            .from('shops')
            .select('*')
            .order('created_at', { ascending: false });

          if (shopsError) throw shopsError;
          setShops(shopsData || []);

          // 全商品データロード
          const { data: itemsData, error: itemsError } = await supabase
            .from('items')
            .select('*');

          if (itemsError) throw itemsError;
          setItems(itemsData || []);

        } catch (err: any) {
          addToast(`データ取得失敗: ${err.message}`, 'error');
        }
      } else {
        // ローカルストレージからロード
        const localShops = localStorage.getItem('shops');
        if (localShops) {
          try {
            setShops(JSON.parse(localShops));
          } catch (e) {
            setShops([]);
          }
        }

        const localItems = localStorage.getItem('inventory_items');
        if (localItems) {
          try {
            setItems(JSON.parse(localItems));
          } catch (e) {
            setItems([]);
          }
        }
      }
      
      if (localEmail) {
        setAdminEmailInput(localEmail);
      }
      setLoading(false);
    }
    initPage();
  }, [router]);

  // パスワード表示トグル
  const togglePasswordVisibility = (shopId: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [shopId]: !prev[shopId]
    }));
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

    if (usingSupabase) {
      try {
        // 1. 店舗の作成
        const { data: insertedShops, error: shopError } = await supabase
          .from('shops')
          .insert([newShopPayload])
          .select();

        if (shopError) throw shopError;

        if (insertedShops && insertedShops[0]) {
          const createdShop = insertedShops[0];
          setShops(prev => [createdShop, ...prev]);

          // 2. 店舗用の初期スターターキット商品の追加
          const starterPayloads = DEFAULT_STARTER_ITEMS.map(starter => ({
            ...starter,
            shop_id: createdShop.email
          }));

          const { data: insertedItems, error: itemsError } = await supabase
            .from('items')
            .insert(starterPayloads)
            .select();

          if (!itemsError && insertedItems) {
            setItems(prev => [...prev, ...insertedItems]);
          }

          addToast(`店舗「${createdShop.name}」を発行しました（初期データ自動セット済）`, 'success');
        }
      } catch (err: any) {
        addToast(`店舗発行失敗: ${err.message}`, 'error');
      } finally {
        setCreating(false);
      }
    } else {
      // ローカルストレージでの処理
      setTimeout(() => {
        const createdShop: Shop = {
          id: Date.now().toString(),
          ...newShopPayload,
          created_at: new Date().toISOString()
        };

        const updatedShops = [createdShop, ...shops];
        localStorage.setItem('shops', JSON.stringify(updatedShops));
        setShops(updatedShops);

        // スターター商品の追加
        const localData = localStorage.getItem('inventory_items');
        let allItems: Item[] = [];
        if (localData) {
          try {
            allItems = JSON.parse(localData);
          } catch (e) {}
        }

        const starterItems: Item[] = DEFAULT_STARTER_ITEMS.map((starter, index) => ({
          id: `starter-${Date.now()}-${index}`,
          ...starter,
          shop_id: createdShop.email,
          created_at: new Date().toISOString()
        }));

        const mergedItems = [...allItems, ...starterItems];
        localStorage.setItem('inventory_items', JSON.stringify(mergedItems));
        setItems(mergedItems);

        addToast(`店舗「${createdShop.name}」をローカルに発行しました`, 'success');
        setCreating(false);
      }, 500);
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

    if (usingSupabase) {
      try {
        // 1. メールアドレスが変更された場合、関連商品の shop_id も更新する
        if (newEmail.toLowerCase() !== oldEmail.toLowerCase()) {
          const { error: itemsError } = await supabase
            .from('items')
            .update({ shop_id: newEmail })
            .eq('shop_id', oldEmail);

          if (itemsError) throw itemsError;
        }

        // 2. 店舗情報の更新
        const { error } = await supabase
          .from('shops')
          .update(updatedFields)
          .eq('id', shopId);

        if (error) throw error;

        setShops(prev => prev.map(s => s.id === shopId ? { ...s, ...updatedFields } : s));
        setItems(prev => prev.map(item => item.shop_id === oldEmail ? { ...item, shop_id: newEmail } : item));
        addToast('店舗情報を更新しました', 'success');
      } catch (err: any) {
        addToast(`更新失敗: ${err.message}`, 'error');
      }
    } else {
      // ローカルストレージ
      const updatedShops = shops.map(s => s.id === shopId ? { ...s, ...updatedFields } : s);
      localStorage.setItem('shops', JSON.stringify(updatedShops));
      setShops(updatedShops);

      const localItems = localStorage.getItem('inventory_items');
      if (localItems) {
        try {
          const allItems: Item[] = JSON.parse(localItems);
          const updatedItems = allItems.map(item => item.shop_id === oldEmail ? { ...item, shop_id: newEmail } : item);
          localStorage.setItem('inventory_items', JSON.stringify(updatedItems));
          setItems(updatedItems);
        } catch (e) {}
      }
      addToast('店舗情報を更新しました（ローカル）', 'success');
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

    if (usingSupabase) {
      try {
        // 1. 店舗に紐付く商品の削除
        const { error: itemsError } = await supabase
          .from('items')
          .delete()
          .eq('shop_id', shop.email);

        if (itemsError) throw itemsError;

        // 2. 店舗アカウントの削除
        const { error: shopError } = await supabase
          .from('shops')
          .delete()
          .eq('id', shop.id);

        if (shopError) throw shopError;

        setShops(prev => prev.filter(s => s.id !== shop.id));
        setItems(prev => prev.filter(item => item.shop_id !== shop.email));
        addToast(`店舗「${shop.name}」と関連在庫データを削除しました`, 'info');
      } catch (err: any) {
        addToast(`削除失敗: ${err.message}`, 'error');
      }
    } else {
      // ローカルストレージでの削除
      const updatedShops = shops.filter(s => s.id !== shop.id);
      localStorage.setItem('shops', JSON.stringify(updatedShops));
      setShops(updatedShops);

      const localItems = localStorage.getItem('inventory_items');
      if (localItems) {
        try {
          const allItems: Item[] = JSON.parse(localItems);
          const filteredItems = allItems.filter(item => item.shop_id !== shop.email);
          localStorage.setItem('inventory_items', JSON.stringify(filteredItems));
          setItems(filteredItems);
        } catch (e) {}
      }
      addToast(`店舗「${shop.name}」と関連在庫データを削除しました（ローカル）`, 'info');
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

    if (usingSupabase) {
      try {
        const { data, error } = await supabase
          .from('items')
          .insert([newItemPayload])
          .select();

        if (error) throw error;

        if (data && data[0]) {
          setItems(prev => [...prev, data[0]]);
          addToast(`商品「${data[0].name}」を追加しました`, 'success');
        }
      } catch (err: any) {
        addToast(`追加失敗: ${err.message}`, 'error');
      } finally {
        setAddingItem(false);
      }
    } else {
      // ローカルストレージ
      const created: Item = {
        id: `item-${Date.now()}`,
        ...newItemPayload,
        created_at: new Date().toISOString()
      };
      const localData = localStorage.getItem('inventory_items');
      let allItems: Item[] = [];
      if (localData) {
        try {
          allItems = JSON.parse(localData);
        } catch (e) {}
      }
      const updated = [...allItems, created];
      localStorage.setItem('inventory_items', JSON.stringify(updated));
      setItems(updated);
      addToast(`商品「${created.name}」を追加しました（ローカル）`, 'success');
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

    const updatedItem = {
      name: editItemName.trim(),
      price,
      stock,
      threshold_low: low,
      threshold_high: high,
      unit: editItemUnit,
      shop_id: shopEmail
    };

    if (usingSupabase) {
      try {
        const { error } = await supabase
          .from('items')
          .update(updatedItem)
          .eq('id', id);

        if (error) throw error;

        setItems(prev => prev.map(i => i.id === id ? { ...i, ...updatedItem } : i));
        addToast('商品を更新しました', 'success');
      } catch (err: any) {
        addToast(`更新失敗: ${err.message}`, 'error');
      } finally {
        setUpdatingItem(false);
      }
    } else {
      // ローカルストレージ
      const localData = localStorage.getItem('inventory_items');
      if (localData) {
        try {
          const allItems: Item[] = JSON.parse(localData);
          const updated = allItems.map(i => i.id === id ? { ...i, ...updatedItem } : i);
          localStorage.setItem('inventory_items', JSON.stringify(updated));
          setItems(updated);
        } catch (e) {}
      }
      addToast('商品を更新しました（ローカル）', 'success');
      setUpdatingItem(false);
    }

    setEditingItemId(null);
  };

  // 商品の削除
  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`商品「${name}」を削除してもよろしいですか？`)) return;

    if (usingSupabase) {
      try {
        const { error } = await supabase.from('items').delete().eq('id', id);
        if (error) throw error;
        setItems(prev => prev.filter(i => i.id !== id));
        addToast(`商品「${name}」を削除しました`, 'info');
      } catch (err: any) {
        addToast(`削除失敗: ${err.message}`, 'error');
      }
    } else {
      // ローカルストレージ
      const localData = localStorage.getItem('inventory_items');
      if (localData) {
        try {
          const allItems: Item[] = JSON.parse(localData);
          const filtered = allItems.filter(i => i.id !== id);
          localStorage.setItem('inventory_items', JSON.stringify(filtered));
          setItems(filtered);
        } catch (e) {}
      }
      addToast(`商品「${name}」を削除しました（ローカル）`, 'info');
    }
  };
 
  // ログアウト
  const handleLogout = () => {
    localStorage.removeItem('admin_session');
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

    setUpdatingAdmin(true);
    const localEmail = localStorage.getItem('admin_email') || '';

    const updatedFields: any = {
      email: adminEmailInput.trim(),
    };
    if (adminPasswordInput.trim()) {
      updatedFields.password = adminPasswordInput.trim();
    }

    if (usingSupabase) {
      try {
        const { error } = await supabase
          .from('shops')
          .update(updatedFields)
          .eq('role', 'admin')
          .eq('email', localEmail);

        if (error) throw error;

        localStorage.setItem('admin_email', adminEmailInput.trim());
        addToast('本部管理者の設定を更新しました', 'success');
        setAdminPasswordInput('');
      } catch (err: any) {
        addToast(`更新失敗: ${err.message}`, 'error');
      } finally {
        setUpdatingAdmin(false);
      }
    } else {
      setTimeout(() => {
        const localShops = localStorage.getItem('shops');
        if (localShops) {
          try {
            const shopsList: Shop[] = JSON.parse(localShops);
            const updatedList = shopsList.map(s => {
              if (s.role === 'admin' && s.email === localEmail) {
                return { ...s, ...updatedFields };
              }
              return s;
            });
            localStorage.setItem('shops', JSON.stringify(updatedList));
            setShops(updatedList);
            localStorage.setItem('admin_email', adminEmailInput.trim());
            addToast('本部管理者の設定を更新しました（ローカル）', 'success');
            setAdminPasswordInput('');
          } catch (e) {}
        }
        setUpdatingAdmin(false);
      }, 500);
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

      {/* Supabase未設定バナー */}
      {!usingSupabase && (
        <div className="supabase-banner">
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} />
            現在ローカルストレージモードで動作しています。追加した店舗や在庫データはブラウザにのみ保存されます。
          </span>
        </div>
      )}

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
                  const isPassVisible = visiblePasswords[shop.id] || false;
                  
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
                          
                          {/* パスワード表示エリア */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                            <Key size={12} />
                            <span>パスワード:</span>
                            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {isPassVisible ? (shop.password || '設定なし') : '••••••••'}
                            </span>
                            <button 
                              onClick={() => togglePasswordVisibility(shop.id)}
                              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                              {isPassVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
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
