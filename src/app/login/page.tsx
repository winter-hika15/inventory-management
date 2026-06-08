"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Database, AlertCircle, Store } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

interface Shop {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'store';
  created_at: string;
}

const DEFAULT_INITIAL_SHOPS: Shop[] = [
  {
    id: 'admin-id',
    name: '本部管理者',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin',
    created_at: new Date().toISOString()
  },
  {
    id: 'shopA-id',
    name: '店舗A',
    email: 'shopA@example.com',
    password: 'shopA123',
    role: 'store',
    created_at: new Date().toISOString()
  },
  {
    id: 'shopB-id',
    name: '店舗B',
    email: 'shopB@example.com',
    password: 'shopB123',
    role: 'store',
    created_at: new Date().toISOString()
  }
];

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [usingSupabase, setUsingSupabase] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const configured = isSupabaseConfigured();
      setUsingSupabase(configured);

      // ローカルストレージの初期店舗データの初期化
      const localShops = localStorage.getItem('shops');
      if (!localShops) {
        localStorage.setItem('shops', JSON.stringify(DEFAULT_INITIAL_SHOPS));
      }

      // すでにログインしているかチェック。セッションがあれば適切なダッシュボードへ
      const localSession = localStorage.getItem('admin_session');
      const localEmail = localStorage.getItem('admin_email');
      const localRole = localStorage.getItem('admin_role') || 'store';

      if (localSession === 'active' && localEmail) {
        if (localRole === 'admin') {
          router.push('/system-admin');
        } else {
          router.push('/');
        }
      }
    };
    checkSession();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (usingSupabase) {
      try {
        // Supabase の shops テーブルから認証
        const { data: shops, error } = await supabase
          .from('shops')
          .select('*')
          .eq('email', email)
          .eq('password', password);

        if (error) throw error;

        if (shops && shops.length > 0) {
          const shop = shops[0];
          localStorage.setItem('admin_session', 'active');
          localStorage.setItem('admin_email', shop.email);
          localStorage.setItem('admin_role', shop.role || 'store');
          localStorage.setItem('admin_name', shop.name);

          if (shop.role === 'admin') {
            router.push('/system-admin');
          } else {
            router.push('/');
          }
        } else {
          setErrorMsg('店舗メールアドレスまたはパスワードが正しくありません。');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'ログインに失敗しました。データベースの接続を確認してください。');
      } finally {
        setLoading(false);
      }
    } else {
      // ローカルストレージ動作時のログイン
      setTimeout(() => {
        const localShopsData = localStorage.getItem('shops');
        let shops: Shop[] = [];
        if (localShopsData) {
          try {
            shops = JSON.parse(localShopsData);
          } catch (e) {
            shops = DEFAULT_INITIAL_SHOPS;
          }
        }

        const matchedShop = shops.find(s => s.email === email && s.password === password);

        if (matchedShop) {
          localStorage.setItem('admin_session', 'active');
          localStorage.setItem('admin_email', matchedShop.email);
          localStorage.setItem('admin_role', matchedShop.role);
          localStorage.setItem('admin_name', matchedShop.name);

          if (matchedShop.role === 'admin') {
            router.push('/system-admin');
          } else {
            router.push('/');
          }
        } else {
          setErrorMsg('店舗メールアドレスまたはパスワードが正しくありません。');
        }
        setLoading(false);
      }, 600);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <div style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent)', padding: '0.75rem', borderRadius: '50%' }}>
            <Store size={30} />
          </div>
        </div>
        
        <h1 className="login-title">在庫管理システム ログイン</h1>
        <p className="login-subtitle">アカウント情報（本部管理者または各店舗）を入力してログインしてください。</p>

        {errorMsg && (
          <div style={{ 
            background: 'rgba(255, 77, 77, 0.1)', 
            border: '1px solid rgba(255, 77, 77, 0.3)', 
            color: 'var(--color-low)', 
            padding: '0.75rem 1rem', 
            borderRadius: '8px', 
            fontSize: '0.85rem', 
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>メールアドレス</label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="store@example.com" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label>パスワード</label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="••••••••" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-submit" 
            style={{ width: '100%', padding: '0.8rem' }}
            disabled={loading}
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        {/* ローカルログインのヒント */}
        {!usingSupabase && (
          <div style={{ 
            marginTop: '2rem', 
            background: 'rgba(245, 158, 11, 0.05)', 
            border: '1px solid rgba(245, 158, 11, 0.1)', 
            padding: '1rem', 
            borderRadius: '10px',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#fbbf24', fontWeight: 600, marginBottom: '0.4rem' }}>
              <Database size={14} />
              ローカル開発用アカウント
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div>
                <strong>🔑 本部管理者:</strong>
                <p>アドレス: <code>admin@example.com</code></p>
                <p>パスワード: <code>admin123</code></p>
              </div>
              <div style={{ borderTop: '1px dashed rgba(255, 255, 255, 0.1)', paddingTop: '0.4rem' }}>
                <strong>🏪 店舗A:</strong>
                <p>アドレス: <code>shopA@example.com</code></p>
                <p>パスワード: <code>shopA123</code></p>
              </div>
              <div style={{ borderTop: '1px dashed rgba(255, 255, 255, 0.1)', paddingTop: '0.4rem' }}>
                <strong>🏪 店舗B:</strong>
                <p>アドレス: <code>shopB@example.com</code></p>
                <p>パスワード: <code>shopB123</code></p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

