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
  CheckCircle2,
  Calendar,
  FileText,
  TrendingUp,
  Download
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

interface RestockHistory {
  id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  price: number;
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
  const [toasts, setToasts] = useState<{ id: number; text: string; type: 'success' | 'error' | 'info' }[]>([]);
  const [currentShopEmail, setCurrentShopEmail] = useState('');
  const [adminRole, setAdminRole] = useState('store');

  // 補充履歴用ステート
  const [restockHistory, setRestockHistory] = useState<RestockHistory[]>([]);
  // アクティブタブステート ('inventory' | 'report')
  const [activeTab, setActiveTab] = useState<'inventory' | 'report'>('inventory');
  // レポート表示用の選択された年月 (例: '2026-06')
  const [selectedMonth, setSelectedMonth] = useState('');


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

  // 補充・出庫の一括保存用ステート { [itemId: string]: number } (差分)
  const [pendingDiffs, setPendingDiffs] = useState<{ [key: string]: number }>({});
  const [isSaving, setIsSaving] = useState(false);

  // 補充履歴編集用ステート
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editLogQuantity, setEditLogQuantity] = useState('0');
  const [editLogPrice, setEditLogPrice] = useState('0');

  // 商品別補充実績サマリー編集用ステート
  const [editingSummaryKey, setEditingSummaryKey] = useState<string | null>(null);
  const [editSummaryQuantity, setEditSummaryQuantity] = useState('0');

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

  // ソート処理（登録日時が新しい順）
  const sortItems = (itemsList: Item[]): Item[] => {
    return [...itemsList].sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  };

  // CSVダウンロード用共通ヘルパー関数
  const handleDownloadCSV = (filename: string, headers: string[], rows: string[][]) => {
    const escapeCSV = (val: string) => {
      let result = val.replace(/"/g, '""');
      if (result.includes(',') || result.includes('\n') || result.includes('"')) {
        result = `"${result}"`;
      }
      return result;
    };

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    // Excelでの文字化けを防ぐため、UTF-8 BOMを付加
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('CSVファイルをダウンロードしました', 'success');
  };

  // 在庫一覧CSVのダウンロード
  const downloadInventoryCSV = () => {
    if (items.length === 0) {
      addToast('ダウンロードする商品データがありません', 'error');
      return;
    }
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `在庫一覧_${currentShopEmail}_${today}.csv`;
    const headers = ['商品ID', '商品名', '在庫数', '単位', '単価(円)', '合計金額(円)', '不足しきい値', '過剰しきい値', '状況'];
    
    const rows = items.map(item => {
      const status = getStatus(item.stock, item.threshold_low, item.threshold_high);
      const statusLabel = status === 'low' ? '不足 (要発注)' : status === 'high' ? '過剰' : '適正';
      return [
        item.id,
        item.name,
        item.stock.toString(),
        item.unit || '個',
        item.price.toString(),
        (item.stock * item.price).toString(),
        item.threshold_low.toString(),
        item.threshold_high.toString(),
        statusLabel
      ];
    });

    // 末尾にサマリー行を追加
    const totalValue = items.reduce((sum, item) => sum + (item.stock * item.price), 0);
    const totalStockCount = items.reduce((sum, item) => sum + item.stock, 0);
    rows.push([]);
    rows.push(['総品目数', `${items.length} 品目`]);
    rows.push(['総在庫数', `${totalStockCount} 点`]);
    rows.push(['在庫総資産額', `¥${totalValue.toLocaleString()}`]);

    handleDownloadCSV(filename, headers, rows);
  };

  // 選択月の商品別補充実績CSV of ダウンロード
  const downloadMonthlyReportCSV = () => {
    if (filteredHistory.length === 0) {
      addToast('ダウンロードする補充データがありません', 'error');
      return;
    }
    const filename = `商品別補充実績_${currentShopEmail}_${selectedMonth}.csv`;
    const headers = ['商品名', '補充時単価(円)', '補充数量', '合計金額(円)'];
    
    interface ProductSummary {
      itemName: string;
      quantity: number;
      price: number;
      total: number;
    }
    const summaries: { [key: string]: ProductSummary } = {};
    let totalRestockAmount = 0;
    let totalRestockQuantity = 0;
    const itemNamesSet = new Set<string>();

    filteredHistory.forEach(log => {
      const key = `${log.item_name}-${log.price}`;
      const itemTotal = log.quantity * log.price;
      totalRestockAmount += itemTotal;
      totalRestockQuantity += log.quantity;
      itemNamesSet.add(log.item_name);

      if (summaries[key]) {
        summaries[key].quantity += log.quantity;
        summaries[key].total += itemTotal;
      } else {
        summaries[key] = {
          itemName: log.item_name,
          quantity: log.quantity,
          price: log.price,
          total: itemTotal,
        };
      }
    });

    const rows = Object.values(summaries).map(summary => [
      summary.itemName,
      summary.price.toString(),
      summary.quantity.toString(),
      summary.total.toString()
    ]);

    // 末尾にサマリー行を追加
    const [smYear, smMonth] = selectedMonth.split('-');
    rows.push([]);
    rows.push(['対象月', `${smYear}年${smMonth}月`]);
    rows.push(['総補充品目数', `${itemNamesSet.size} 品目`]);
    rows.push(['総補充数量', `${totalRestockQuantity} 点`]);
    rows.push(['総補充額', `¥${totalRestockAmount.toLocaleString()}`]);

    handleDownloadCSV(filename, headers, rows);
  };

  // 選択月の補充詳細ログCSVのダウンロード
  const downloadDetailLogCSV = () => {
    if (filteredHistory.length === 0) {
      addToast('ダウンロードする補充データがありません', 'error');
      return;
    }
    const filename = `補充詳細ログ_${currentShopEmail}_${selectedMonth}.csv`;
    const headers = ['日時', '商品ID', '商品名', '補充数量', '補充時単価(円)', '合計金額(円)'];
    
    const rows = filteredHistory.map(log => {
      const logDate = new Date(log.created_at);
      const formattedDate = `${logDate.getFullYear()}/${logDate.getMonth() + 1}/${logDate.getDate()} ${String(logDate.getHours()).padStart(2, '0')}:${String(logDate.getMinutes()).padStart(2, '0')}`;
      return [
        formattedDate,
        log.item_id || '',
        log.item_name,
        log.quantity.toString(),
        log.price.toString(),
        (log.quantity * log.price).toString()
      ];
    });

    // 末尾にサマリー行を追加
    let totalRestockAmount = 0;
    let totalRestockQuantity = 0;
    const itemNamesSet = new Set<string>();

    filteredHistory.forEach(log => {
      totalRestockAmount += log.quantity * log.price;
      totalRestockQuantity += log.quantity;
      itemNamesSet.add(log.item_name);
    });

    const [smYear2, smMonth2] = selectedMonth.split('-');
    rows.push([]);
    rows.push(['対象月', `${smYear2}年${smMonth2}月`]);
    rows.push(['総補充品目数', `${itemNamesSet.size} 品目`]);
    rows.push(['総補充数量', `${totalRestockQuantity} 点`]);
    rows.push(['総補充額', `¥${totalRestockAmount.toLocaleString()}`]);

    handleDownloadCSV(filename, headers, rows);
  };

  // 特定店舗の商品データのロード
  const loadShopItems = async (shopEmail: string) => {
    if (!shopEmail) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/items?shop_id=${encodeURIComponent(shopEmail)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.items && data.items.length > 0) {
        setItems(sortItems(data.items));
      } else {
        setItems([]);
      }
      addToast(`店舗 ${shopEmail} のデータをロードしました`, 'success');
    } catch (error: any) {
      console.error('データ取得エラー:', error.message);
      addToast(`取得エラー: ${error.message}`, 'error');
      setItems([]);
    }
    setLoading(false);
  };

  // 特定店舗の補充履歴のロード
  const loadShopRestockHistory = async (shopEmail: string) => {
    if (!shopEmail) return;

    try {
      const res = await fetch(`/api/restock?shop_id=${encodeURIComponent(shopEmail)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRestockHistory(data.history || []);
    } catch (error: any) {
      console.error('補充履歴ロード失敗:', error.message);
      setRestockHistory([]);
    }
  };

  // 補充履歴の記録
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
      const res = await fetch('/api/restock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLogPayload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.log) {
        setRestockHistory(prev => [data.log, ...prev]);
      }
    } catch (error: any) {
      console.error('補充履歴の保存に失敗しました:', error.message);
      addToast(`補充履歴の保存失敗: ${error.message}`, 'error');
    }
  };


  // セッションチェックと初期初期化
  useEffect(() => {
    async function initPage() {
      // サーバーサイドでセッションを検証
      try {
        const sessionRes = await fetch('/api/auth/session');
        const sessionData = await sessionRes.json();

        if (!sessionData.authenticated || !sessionData.user) {
          router.push('/login');
          return;
        }

        const { email: userEmail, role: userRole, name: userName } = sessionData.user;
        setAdminRole(userRole);

        // UI表示用にローカルストレージも同期
        localStorage.setItem('admin_email', userEmail);
        localStorage.setItem('admin_role', userRole);
        localStorage.setItem('admin_name', userName);

        let initialShopEmail = userEmail;

        // 本部管理者の場合、店舗リストを読み込んで最初の店舗を初期表示にする
        if (userRole === 'admin') {
          let loadedShops: Shop[] = [];
          try {
            const shopsRes = await fetch('/api/shops');
            const shopsData = await shopsRes.json();
            if (shopsRes.ok && shopsData.shops) {
              loadedShops = shopsData.shops.filter((s: Shop) => s.role === 'store');
            }
          } catch (e) {
            console.error('店舗リストの取得失敗:', e);
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
      } catch (err) {
        console.error('セッション検証エラー:', err);
        router.push('/login');
      }
    }

    initPage();
  }, [router]);

  // 表示店舗の切り替え検知
  useEffect(() => {
    if (currentShopEmail) {
      setPendingDiffs({}); // 店舗切り替え時に未保存データをリセット
      loadShopItems(currentShopEmail);
      loadShopRestockHistory(currentShopEmail);
    }
  }, [currentShopEmail]);

  // 全体データのうち、現在の店舗以外のデータを崩さずにローカル状態および保存用を同期する
  const syncItemsState = (shopUpdatedItems: Item[]) => {
    const sorted = sortItems(shopUpdatedItems);
    setItems(sorted);
  };

  // 1個売る（ローカルのみ）
  const handleSell = (item: Item) => {
    if (item.stock <= 0) return;
    const newStock = item.stock - 1;

    const updated = items.map(i => i.id === item.id ? { ...i, stock: newStock } : i);
    syncItemsState(updated);

    setPendingDiffs(prev => ({
      ...prev,
      [item.id]: (prev[item.id] || 0) - 1
    }));
  };

  // 1個補充する（ローカルのみ）
  const handleRestock = (item: Item) => {
    const newStock = item.stock + 1;

    const updated = items.map(i => i.id === item.id ? { ...i, stock: newStock } : i);
    syncItemsState(updated);

    setPendingDiffs(prev => ({
      ...prev,
      [item.id]: (prev[item.id] || 0) + 1
    }));
  };

  // 変更を一括保存
  const handleSaveChanges = async () => {
    const changes = Object.entries(pendingDiffs).filter(([_, diff]) => diff !== 0);
    if (changes.length === 0) return;

    setIsSaving(true);
    let successCount = 0;
    let errorCount = 0;

    for (const [itemId, diff] of changes) {
      const item = items.find(i => i.id === itemId);
      if (!item) continue;

      try {
        // 在庫の更新
        const res = await fetch(`/api/items/${itemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stock: item.stock })
        });
        if (!res.ok) throw new Error((await res.json()).error);

        // プラスの変更（補充）なら履歴を追加
        if (diff > 0) {
          await addRestockLog(item.id, item.name, diff, item.price, currentShopEmail);
        }
        successCount++;
      } catch (err: any) {
        console.error(`商品ID ${itemId} の更新失敗:`, err);
        errorCount++;
      }
    }

    setIsSaving(false);
    if (errorCount === 0) {
      addToast('すべての変更を保存しました', 'success');
      setPendingDiffs({});
    } else {
      addToast(`${successCount}件保存、${errorCount}件失敗しました。`, 'error');
      // 失敗した場合は最新データを再ロード
      loadShopItems(currentShopEmail);
      setPendingDiffs({});
    }
  };

  // 変更をキャンセル
  const handleCancelChanges = () => {
    loadShopItems(currentShopEmail);
    setPendingDiffs({});
    addToast('変更をキャンセルしました', 'info');
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
        if (stock > 0) {
          addRestockLog(data.item.id, data.item.name, stock, price, currentShopEmail);
        }
        addToast(`商品「${data.item.name}」を追加しました`, 'success');
      }
    } catch (error: any) {
      addToast(`追加失敗: ${error.message}`, 'error');
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

    // 編集前の商品データを取得して、在庫増の場合は補充履歴を記録
    const originalItem = items.find(i => i.id === id);
    const oldStock = originalItem ? originalItem.stock : 0;
    const restockQty = stock - oldStock;

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

    if (restockQty > 0) {
      addRestockLog(id, updatedItem.name, restockQty, price, currentShopEmail);
    }

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

  // 補充履歴のインライン編集の開始
  const startEditingLog = (log: RestockHistory) => {
    setEditingLogId(log.id);
    setEditLogQuantity(log.quantity.toString());
    setEditLogPrice(log.price.toString());
  };

  // 補充履歴の保存
  const handleSaveEditLog = async (id: string) => {
    const qty = parseInt(editLogQuantity) || 0;
    const price = parseInt(editLogPrice) || 0;

    try {
      const res = await fetch(`/api/restock/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: qty, price })
      });
      if (!res.ok) throw new Error((await res.json()).error);
      
      setRestockHistory(prev => prev.map(log => log.id === id ? { ...log, quantity: qty, price } : log));
      addToast('補充履歴を更新しました', 'success');
      setEditingLogId(null);
    } catch (err: any) {
      addToast(`履歴更新エラー: ${err.message}`, 'error');
    }
  };

  // 補充履歴の削除
  const handleDeleteLog = async (id: string, itemName: string) => {
    if (!confirm(`「${itemName}」の補充履歴を本当に削除しますか？`)) return;

    try {
      const res = await fetch(`/api/restock/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);

      setRestockHistory(prev => prev.filter(log => log.id !== id));
      addToast('補充履歴を削除しました', 'info');
    } catch (err: any) {
      addToast(`履歴削除エラー: ${err.message}`, 'error');
    }
  };

  // 商品別補充実績（サマリー）のインライン編集開始
  const startEditingSummary = (summaryKey: string, qty: number) => {
    setEditingSummaryKey(summaryKey);
    setEditSummaryQuantity(qty.toString());
  };

  // 商品別補充実績（サマリー）の保存
  const handleSaveSummaryEdit = async (itemName: string, price: number) => {
    const newQty = parseInt(editSummaryQuantity) || 0;
    const targetLogs = filteredHistory.filter(l => l.item_name === itemName && l.price === price);
    
    if (targetLogs.length === 0) return;

    try {
      // 1. 既存の該当ログをすべて削除
      for (const log of targetLogs) {
        await fetch(`/api/restock/${log.id}`, { method: 'DELETE' });
      }

      // 2. 新しい数量が0より大きければ、まとめて1つの新しいログとして追加
      if (newQty > 0) {
        const itemId = targetLogs[0].item_id || '';
        const res = await fetch('/api/restock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            item_id: itemId,
            item_name: itemName,
            quantity: newQty,
            price,
            shop_id: currentShopEmail,
          })
        });
        if (!res.ok) throw new Error((await res.json()).error);
      }

      addToast(`${itemName}の補充実績を更新しました`, 'success');
      setEditingSummaryKey(null);
      // 再取得して画面を更新
      loadShopRestockHistory(currentShopEmail);
    } catch (err: any) {
      addToast(`実績更新エラー: ${err.message}`, 'error');
    }
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

  // 履歴から存在する年月（YYYY-MM）を抽出して降順ソート
  const availableMonths = Array.from(
    new Set(
      restockHistory.map(log => {
        const date = new Date(log.created_at);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        return `${yyyy}-${mm}`;
      })
    )
  ).sort((a, b) => b.localeCompare(a));

  // デフォルトで最新の月を選択する
  useEffect(() => {
    if (availableMonths.length > 0 && !selectedMonth) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth]);

  // 選択された月の補充履歴を抽出
  const filteredHistory = restockHistory.filter(log => {
    const date = new Date(log.created_at);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}` === selectedMonth;
  });

  // 選択された月の商品別集計
  interface ProductSummary {
    itemName: string;
    quantity: number;
    price: number;
    total: number;
  }
  
  const productSummaries: { [key: string]: ProductSummary } = {};
  let totalRestockAmount = 0;
  let totalRestockQuantity = 0;

  filteredHistory.forEach(log => {
    const key = `${log.item_name}-${log.price}`; // 商品名と単価で集計
    const itemTotal = log.quantity * log.price;
    totalRestockAmount += itemTotal;
    totalRestockQuantity += log.quantity;

    if (productSummaries[key]) {
      productSummaries[key].quantity += log.quantity;
      productSummaries[key].total += itemTotal;
    } else {
      productSummaries[key] = {
        itemName: log.item_name,
        quantity: log.quantity,
        price: log.price,
        total: itemTotal,
      };
    }
  });

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
        {/* 左側：在庫リスト または レポート */}
        <section className="glass-card">
          {/* タブヘッダー */}
          <div className="tab-container">
            <button 
              className={`tab-button ${activeTab === 'inventory' ? 'active' : ''}`}
              onClick={() => setActiveTab('inventory')}
            >
              <Package size={16} />
              商品在庫一覧
            </button>
            <button 
              className={`tab-button ${activeTab === 'report' ? 'active' : ''}`}
              onClick={() => setActiveTab('report')}
            >
              <TrendingUp size={16} />
              月別補充レポート
            </button>
          </div>

          {activeTab === 'inventory' ? (
            <>
              <div className="list-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h2>在庫状況一覧</h2>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    全 {items.length} 品目 (総在庫数: {totalStockCount}点)
                  </span>
                </div>
                <button 
                  onClick={downloadInventoryCSV}
                  className="btn-download"
                  title="在庫一覧をExcel対応のCSV形式でダウンロードします"
                  disabled={items.length === 0}
                >
                  <Download size={14} />
                  CSV保存 (Excel対応)
                </button>
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
            </>
          ) : (
            /* 月別補充レポート表示 */
            <div className="animate-fade-in">
              <div className="month-selector-container">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={18} style={{ color: 'var(--accent)' }} />
                  <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>集計対象月の選択</span>
                </div>
                <div>
                  {availableMonths.length === 0 ? (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>補充データがありません</span>
                  ) : (
                    <select 
                      className="form-input" 
                      value={selectedMonth} 
                      onChange={e => setSelectedMonth(e.target.value)}
                      style={{ cursor: 'pointer', minWidth: '150px', background: 'rgba(15, 23, 42, 0.8)' }}
                    >
                      {availableMonths.map(m => {
                        const [year, month] = m.split('-');
                        return (
                          <option key={m} value={m}>
                            {year}年{month}月
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>
              </div>

              {filteredHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
                  <FileText size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                  <p>選択した月の補充（発注）実績はありません。</p>
                </div>
              ) : (
                <>
                  {/* レポートサマリー */}
                  <div className="report-summary-grid">
                    <div className="report-summary-card accent">
                      <div className="report-summary-icon">
                        <DollarSign size={18} />
                      </div>
                      <div className="summary-info">
                        <span className="summary-label">補充総額</span>
                        <span className="summary-value" style={{ color: 'var(--text-primary)' }}>
                          ¥{totalRestockAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="report-summary-card">
                      <div className="report-summary-icon">
                        <Package size={18} />
                      </div>
                      <div className="summary-info">
                        <span className="summary-label">補充総数量</span>
                        <span className="summary-value">
                          {totalRestockQuantity} 点
                        </span>
                      </div>
                    </div>
                    <div className="report-summary-card">
                      <div className="report-summary-icon">
                        <FileText size={18} />
                      </div>
                      <div className="summary-info">
                        <span className="summary-label">補充品目数</span>
                        <span className="summary-value">
                          {Object.keys(productSummaries).length} 品目
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 品目別集計表 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                      <Package size={16} style={{ color: 'var(--accent)' }} />
                      商品別補充実績
                    </h3>
                    <button 
                      onClick={downloadMonthlyReportCSV}
                      className="btn-download"
                      title="商品別補充実績をExcel対応のCSV形式でダウンロードします"
                    >
                      <Download size={14} />
                      集計CSV保存 (Excel対応)
                    </button>
                  </div>
                  <div className="report-table-wrapper">
                    <table className="report-table">
                      <thead>
                        <tr>
                          <th>商品名</th>
                          <th style={{ textAlign: 'right' }}>補充時単価</th>
                          <th style={{ textAlign: 'right' }}>補充数量</th>
                          <th style={{ textAlign: 'right' }}>合計金額</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(productSummaries).map(([key, summary]) => {
                          const isEditing = editingSummaryKey === key;

                          if (isEditing) {
                            return (
                              <tr key={key} style={{ background: 'rgba(255,255,255,0.05)' }}>
                                <td style={{ fontWeight: 600 }}>{summary.itemName}</td>
                                <td style={{ textAlign: 'right' }}>¥{summary.price.toLocaleString()}</td>
                                <td style={{ textAlign: 'right' }}>
                                  <input 
                                    type="number" 
                                    className="form-input" 
                                    style={{ width: '80px', display: 'inline-block', textAlign: 'right', padding: '0.2rem' }} 
                                    value={editSummaryQuantity} 
                                    onChange={e => setEditSummaryQuantity(e.target.value)} 
                                  />
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                    <button onClick={() => handleSaveSummaryEdit(summary.itemName, summary.price)} className="btn btn-submit" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}>保存</button>
                                    <button onClick={() => setEditingSummaryKey(null)} className="btn" style={{ background: 'transparent', border: '1px solid var(--border)', padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}>取消</button>
                                  </div>
                                </td>
                              </tr>
                            );
                          }

                          return (
                            <tr key={key}>
                              <td style={{ fontWeight: 600 }}>{summary.itemName}</td>
                              <td style={{ textAlign: 'right' }}>¥{summary.price.toLocaleString()}</td>
                              <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                {summary.quantity}
                                {adminRole === 'admin' && (
                                  <button onClick={() => startEditingSummary(key, summary.quantity)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginLeft: '0.5rem' }} title="実績を編集">
                                    <Edit2 size={13} />
                                  </button>
                                )}
                              </td>
                              <td style={{ textAlign: 'right', color: 'var(--text-primary)', fontWeight: 600 }}>
                                ¥{summary.total.toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* 詳細ログ（タイムライン） */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                      <Calendar size={16} style={{ color: 'var(--accent)' }} />
                      補充詳細ログ（タイムライン）
                    </h3>
                    <button 
                      onClick={downloadDetailLogCSV}
                      className="btn-download"
                      title="詳細履歴ログをExcel対応のCSV形式でダウンロードします"
                    >
                      <Download size={14} />
                      詳細ログCSV保存 (Excel対応)
                    </button>
                  </div>
                  <div className="timeline-container">
                    {filteredHistory.map((log) => {
                      const logDate = new Date(log.created_at);
                      const formattedDate = `${logDate.getMonth() + 1}/${logDate.getDate()} ${String(logDate.getHours()).padStart(2, '0')}:${String(logDate.getMinutes()).padStart(2, '0')}`;
                      
                      const isEditingLog = editingLogId === log.id;
                      if (isEditingLog) {
                        return (
                          <div key={log.id} className="timeline-item" style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                            <div style={{ marginBottom: '0.5rem', fontWeight: 600 }}>「{log.item_name}」の履歴を編集</div>
                            <div className="form-grid-2">
                              <div className="form-group">
                                <label>補充数量</label>
                                <input type="number" className="form-input" value={editLogQuantity} onChange={e => setEditLogQuantity(e.target.value)} />
                              </div>
                              <div className="form-group">
                                <label>補充単価(円)</label>
                                <input type="number" className="form-input" value={editLogPrice} onChange={e => setEditLogPrice(e.target.value)} />
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                              <button onClick={() => handleSaveEditLog(log.id)} className="btn btn-submit" style={{ padding: '0.4rem 1rem' }}>保存</button>
                              <button onClick={() => setEditingLogId(null)} className="btn" style={{ background: 'transparent', border: '1px solid var(--border)' }}>キャンセル</button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={log.id} className="timeline-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div className="timeline-date">{formattedDate}</div>
                            <div className="timeline-content">
                              商品 <span className="timeline-highlight">「{log.item_name}」</span> を 
                              <span className="timeline-badge" style={{ marginLeft: '0.4rem', marginRight: '0.4rem' }}>
                                {log.quantity} 個
                              </span> 
                              補充しました (単価: ¥{log.price.toLocaleString()})
                            </div>
                          </div>
                          {adminRole === 'admin' && (
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                              <button onClick={() => startEditingLog(log)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} title="履歴を編集">
                                <Edit2 size={15} />
                              </button>
                              <button onClick={() => handleDeleteLog(log.id, log.item_name)} style={{ background: 'transparent', border: 'none', color: 'var(--color-low)', cursor: 'pointer' }} title="履歴を削除">
                                <Trash2 size={15} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
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
      {/* 保存アクションバー */}
      {Object.keys(pendingDiffs).length > 0 && Object.values(pendingDiffs).some(d => d !== 0) && (
        <div className="save-action-bar animate-fade-in glass-card" style={{
          position: 'fixed',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          padding: '1rem 2rem',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
          border: '1px solid var(--accent)',
          borderRadius: '12px'
        }}>
          <div>
            <span style={{ fontWeight: 600, marginRight: '1rem', color: 'var(--text-primary)' }}>未保存の変更があります</span>
          </div>
          <button className="btn btn-submit" onClick={handleSaveChanges} disabled={isSaving} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Save size={16} />
            {isSaving ? '保存中...' : '変更を保存する'}
          </button>
          <button className="btn" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-primary)' }} onClick={handleCancelChanges} disabled={isSaving}>
            キャンセル
          </button>
        </div>
      )}

    </div>
  );
}
