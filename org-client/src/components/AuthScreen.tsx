import { useState, type FormEvent } from 'react';
import { apiRequest } from '../api';
import { useAuth } from '../AuthContext';
import type { AuthUser } from '../types';

export function AuthScreen() {
    const { login } = useAuth();
    const [isRegister, setIsRegister] = useState(false);
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const endpoint = isRegister ? '/auth/register' : '/auth/login';
            const body = isRegister
                ? { fullName, email, phone, password }
                : { email, password };

            const data = await apiRequest<AuthUser>(endpoint, {
                method: 'POST',
                body: JSON.stringify(body),
            });
            login(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Giriş yapılamadı.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <header className="shs-navbar">
                <div className="shs-nav-inner">
                    <div className="shs-brand">
                        <div className="shs-logo-badge">⚽</div>
                        <div>
                            <div className="shs-brand-title">SOSYAL HALISAHA</div>
                            <div className="shs-brand-sub">Online Saha Rezervasyon</div>
                        </div>
                    </div>
                </div>
            </header>

            <section className="shs-hero" style={{ padding: '1.75rem 1.5rem' }}>
                <div className="shs-hero-inner">
                    <div>
                        <span className="shs-hero-tag">7/24 Online Randevu</span>
                        <h1 className="shs-hero-title">
                            TAKIMINI KUR, <span>SAHANI AYIRT</span>
                        </h1>
                        <p className="shs-hero-desc">
                            Müsait saatleri anlık görüntüle, telefon trafiğiyle uğraşmadan saniyeler içinde maç saatini kilitle.
                        </p>
                    </div>
                </div>
            </section>

            <div className="shs-container" style={{ maxWidth: 440, marginTop: '0.5rem' }}>
                <div className="shs-card">
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                        <button
                            type="button"
                            onClick={() => {
                                setIsRegister(false);
                                setError(null);
                            }}
                            style={{
                                flex: 1,
                                padding: '0.6rem',
                                border: 'none',
                                borderBottom: !isRegister ? '3px solid var(--pitch-green)' : '1px solid var(--border)',
                                background: 'transparent',
                                fontWeight: 700,
                                color: !isRegister ? 'var(--text-dark)' : 'var(--text-muted)',
                                cursor: 'pointer',
                            }}
                        >
                            Üye Girişi
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setIsRegister(true);
                                setError(null);
                            }}
                            style={{
                                flex: 1,
                                padding: '0.6rem',
                                border: 'none',
                                borderBottom: isRegister ? '3px solid var(--pitch-green)' : '1px solid var(--border)',
                                background: 'transparent',
                                fontWeight: 700,
                                color: isRegister ? 'var(--text-dark)' : 'var(--text-muted)',
                                cursor: 'pointer',
                            }}
                        >
                            Kayıt Ol
                        </button>
                    </div>

                    {error && <div className="alert-error">{error}</div>}

                    <form onSubmit={handleSubmit}>
                        {isRegister && (
                            <>
                                <label>Ad Soyad</label>
                                <input
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                    placeholder="Adınız ve soyadınız"
                                />
                                <label>Cep Telefonu</label>
                                <input
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    required
                                    placeholder="05XX XXX XX XX"
                                />
                            </>
                        )}

                        <label>E-posta Adresi</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="ornek@mail.com"
                            required
                        />

                        <label>Parola</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />

                        <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
                            {loading ? 'İşlem yapılıyor...' : isRegister ? 'Hesap Oluştur' : 'Giriş Yap'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}