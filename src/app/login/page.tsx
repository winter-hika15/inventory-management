"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Store } from 'lucide-react';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // 既存セッションのチェック
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();

        if (data.authenticated && data.user) {
          if (data.user.role === 'admin') {
            router.push('/system-admin');
          } else {
            router.push('/');
          }
          return;
        }
      } catch (err) {
        console.error('セッション確認エラー:', err);
      }
      setChecking(false);
    };
    checkSession();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      // サーバーサイドの認証API を呼び出す
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'ログインに失敗しました');
        setLoading(false);
        return;
      }

      if (data.success && data.user) {
        // セッションCookieは自動的にSet-Cookieヘッダーで設定される
        // ページ遷移のためにローカルストレージにも最小限の情報を保存（UI表示用のみ）
        localStorage.setItem('admin_email', data.user.email);
        localStorage.setItem('admin_role', data.user.role);
        localStorage.setItem('admin_name', data.user.name);

        if (data.user.role === 'admin') {
          router.push('/system-admin');
        } else {
          router.push('/');
        }
      }
    } catch (err) {
      console.error('ログインエラー:', err);
      setErrorMsg('ネットワークエラーが発生しました。接続を確認してください。');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="login-container">
        <div className="login-card animate-fade-in" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>セッションを確認中...</p>
        </div>
      </div>
    );
  }

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

        {/* セキュリティ情報表示 */}
        <div style={{ 
          marginTop: '2rem', 
          background: 'rgba(16, 185, 129, 0.05)', 
          border: '1px solid rgba(16, 185, 129, 0.1)', 
          padding: '0.75rem', 
          borderRadius: '10px',
          fontSize: '0.75rem',
          color: 'var(--text-secondary)'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#10b981', fontWeight: 600, marginBottom: '0.3rem' }}>
            🔒 セキュア認証
          </span>
          <p>ログイン情報はサーバーサイドで安全に検証されます。パスワードはハッシュ化されて保存され、通信経路にも公開されません。</p>
        </div>

        {/* テスト用ログインのヒント */}
        <div style={{ 
          marginTop: '1rem', 
          background: 'rgba(245, 158, 11, 0.05)', 
          border: '1px solid rgba(245, 158, 11, 0.1)', 
          padding: '1rem', 
          borderRadius: '10px',
          fontSize: '0.75rem',
          color: 'var(--text-secondary)'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#fbbf24', fontWeight: 600, marginBottom: '0.4rem' }}>
            テスト用アカウント
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
          </div>
        </div>
      </div>
    </div>
  );
}
