import { useState } from 'react';
import { useAuth } from './AuthContext';
import { AuthScreen } from './components/AuthScreen';
import { BookingDashboard } from './components/BookingDashboard';
import { AdminPanel } from './components/AdminPanel';

export default function App() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<'booking' | 'admin'>('booking');

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div>
      <header className="shs-navbar">
        <div className="shs-nav-inner">
          <div className="shs-brand" onClick={() => setTab('booking')}>
            <div className="shs-logo-badge">⚽</div>
            <div>
              <div className="shs-brand-title">SOSYAL HALISAHA</div>
              <div className="shs-brand-sub">Saha & Rezervasyon</div>
            </div>
          </div>

          <nav className="shs-nav-links">
            <button
              className={`shs-nav-link ${tab === 'booking' ? 'active' : ''}`}
              onClick={() => setTab('booking')}
            >
              Saha Rezervasyonu
            </button>
            {user.role === 'Admin' && (
              <button
                className={`shs-nav-link ${tab === 'admin' ? 'active' : ''}`}
                onClick={() => setTab('admin')}
              >
                Tesis Yönetimi
              </button>
            )}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <span style={{ fontSize: '0.88rem', color: '#e5e7eb' }}>{user.fullName}</span>
            <button className="shs-outline-btn" onClick={logout}>
              ÇIKIŞ YAP
            </button>
          </div>
        </div>
      </header>

      <section className="shs-hero">
        <div className="shs-hero-inner">
          <div>
            <span className="shs-hero-tag">
              {tab === 'admin' ? 'Tesis Yönetim Paneli' : 'Anlık Saha Doluluk Takvimi'}
            </span>
            <h1 className="shs-hero-title">
              {tab === 'admin' ? (
                <>
                  SAHA VE <span>REZERVASYON KONTROLÜ</span>
                </>
              ) : (
                <>
                  MAÇ SAATİNİ SEÇ, <span>SAHAYA ÇIK</span>
                </>
              )}
            </h1>
          </div>
        </div>
      </section>

      <main className="shs-container">
        {user.role === 'Admin' && tab === 'admin' ? (
          <AdminPanel />
        ) : (
          <BookingDashboard />
        )}
      </main>
    </div>
  );
}