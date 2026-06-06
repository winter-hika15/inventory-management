"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Database, AlertCircle, ArrowLeft, Key } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [usingSupabase, setUsingSupabase] = useState(false);

  useEffect(() => {
    // すでにログインしているかチェック
    const checkSession = async () => {
      const configured = isSupabaseConfigured();
      setUsingSupabase(configured);

      if (configured) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.push('/admin');
        }
      } else {
        const localSession = localStorage.getItem('admin_session');
        if (localSession === 'active') {
          router.push('/admin');
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
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        router.push('/admin');
      } catch (err: any) {
        setErrorMsg(err.message || 'ログインに失敗しました。認証情報を確認してください。');
      } finally {
        setLoading(false);
      }
    } else {
      // ローカルストレージ動作時の模擬ログイン
      setTimeout(() => {
        // 設定されたローカルパスワードを取得（なければデフォルト admin123）
        const savedPassword = localStorage.getItem('local_admin_password') || 'admin123';
        const savedEmail = localStorage.getItem('local_admin_email') || 'admin@example.com';

        if (email === savedEmail && password === savedPassword) {
          localStorage.setItem('admin_session', 'active');
          router.push('/admin');
        } else {
          setErrorMsg('メールアドレスまたはパスワードが正しくありません。');
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
            <Key size={30} />
          </div>
        </div>
        
        <h1 className="login-title">管理者ログイン</h1>
        <p className="login-subtitle">商品の新規登録・編集などの管理者機能へアクセスします。</p>

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
              placeholder="admin@example.com" 
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
            {loading ? 'ログイン中...' : 'ログインする'}
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
            fontSize: '0.8rem',
            color: 'var(--text-secondary)'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#fbbf24', fontWeight: 600, marginBottom: '0.4rem' }}>
              <Database size={14} />
              ローカル開発用アカウント
            </span>
            <p>メールアドレス: <code>admin@example.com</code></p>
            <p>パスワード: <code>admin123</code></p>
            <p style={{ marginTop: '0.4rem', fontSize: '0.75rem', opacity: 0.8 }}>※ログイン後、管理者設定画面から変更可能です。</p>
          </div>
        )}

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button 
            onClick={() => router.push('/')} 
            className="btn-nav"
            style={{ border: 'none' }}
          >
            <ArrowLeft size={14} />
            一般画面へ戻る
          </button>
        </div>
      </div>
    </div>
  );
}
