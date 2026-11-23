import { useEffect, useState, type FormEvent } from 'react';
import { apiRequest } from '../api';
import type { Pitch, Reservation } from '../types';

export function AdminPanel() {
    const [pitches, setPitches] = useState<Pitch[]>([]);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [name, setName] = useState('');
    const [surfaceType, setSurfaceType] = useState('FIFA Onaylı Suni Çim');
    const [hourlyPrice, setHourlyPrice] = useState('1600');
    const [msg, setMsg] = useState<string | null>(null);

    const loadAll = async () => {
        const [p, r] = await Promise.all([
            apiRequest<Pitch[]>('/pitches?includeInactive=true'),
            apiRequest<Reservation[]>('/reservations'),
        ]);
        setPitches(p);
        setReservations(r);
    };

    useEffect(() => {
        loadAll();
    }, []);

    const handleAddPitch = async (e: FormEvent) => {
        e.preventDefault();
        setMsg(null);
        await apiRequest('/pitches', {
            method: 'POST',
            body: JSON.stringify({
                name,
                surfaceType,
                hourlyPrice: Number(hourlyPrice),
            }),
        });
        setName('');
        setMsg('Yeni saha tesise eklendi.');
        await loadAll();
    };

    const togglePitchActive = async (pitch: Pitch) => {
        await apiRequest(`/pitches/${pitch.id}`, {
            method: 'PUT',
            body: JSON.stringify({
                name: pitch.name,
                surfaceType: pitch.surfaceType,
                hourlyPrice: pitch.hourlyPrice,
                isActive: !pitch.isActive,
            }),
        });
        await loadAll();
    };

    const handleApproveReservation = async (id: number) => {
        setMsg(null);
        await apiRequest(`/reservations/${id}/approve`, { method: 'PATCH' });
        setMsg('Rezervasyon onaylandı.');
        await loadAll();
    };

    const handleCancelReservation = async (id: number) => {
        setMsg(null);
        await apiRequest(`/reservations/${id}/cancel`, { method: 'PATCH' });
        setMsg('Rezervasyon iptal edildi.');
        await loadAll();
    };

    return (
        <div>
            {msg && <div className="alert-success">{msg}</div>}

            <div className="shs-card">
                <div className="shs-card-header">
                    <div className="shs-card-title">
                        <span className="shs-dot" /> Yeni Saha Tanımla
                    </div>
                </div>
                <form
                    onSubmit={handleAddPitch}
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                        gap: '0.85rem',
                        alignItems: 'end',
                    }}
                >
                    <div>
                        <label>Saha Adı</label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Örn: Saha 3 (Kapalı)"
                            required
                            style={{ marginBottom: 0 }}
                        />
                    </div>
                    <div>
                        <label>Zemin Özellikleri</label>
                        <input
                            value={surfaceType}
                            onChange={(e) => setSurfaceType(e.target.value)}
                            required
                            style={{ marginBottom: 0 }}
                        />
                    </div>
                    <div>
                        <label>Saatlik Ücret (₺)</label>
                        <input
                            type="number"
                            value={hourlyPrice}
                            onChange={(e) => setHourlyPrice(e.target.value)}
                            required
                            style={{ marginBottom: 0 }}
                        />
                    </div>
                    <button className="btn-primary" type="submit">
                        Sahayı Ekle
                    </button>
                </form>
            </div>

            <div className="shs-card">
                <div className="shs-card-header">
                    <div className="shs-card-title">
                        <span className="shs-dot" /> Tesis Sahaları
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Saha</th>
                            <th>Zemin</th>
                            <th>Saatlik Ücret</th>
                            <th>Durum</th>
                            <th style={{ textAlign: 'right' }}>İşlem</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pitches.map((p) => (
                            <tr key={p.id}>
                                <td style={{ fontWeight: 600 }}>{p.name}</td>
                                <td>{p.surfaceType}</td>
                                <td>{p.hourlyPrice} ₺</td>
                                <td>
                                    <span className={`badge ${p.isActive ? 'badge-ok' : 'badge-cancel'}`}>
                                        {p.isActive ? 'Yayında' : 'Bakımda / Pasif'}
                                    </span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <button className="btn-dark" onClick={() => togglePitchActive(p)}>
                                        {p.isActive ? 'Pasife Al' : 'Yayına Al'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="shs-card">
                <div className="shs-card-header">
                    <div className="shs-card-title">
                        <span className="shs-dot" /> Tüm Tesis Rezervasyonları
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Saha</th>
                            <th>Kaptan / Müşteri</th>
                            <th>Telefon</th>
                            <th>Maç Saati</th>
                            <th>Tutar</th>
                            <th>Durum</th>
                            <th style={{ textAlign: 'right' }}>İşlem</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reservations.map((r) => (
                            <tr key={r.id}>
                                <td style={{ fontWeight: 600 }}>{r.pitchName}</td>
                                <td>{r.userFullName}</td>
                                <td>{r.userPhone}</td>
                                <td>{new Date(r.startTime).toLocaleString('tr-TR')}</td>
                                <td style={{ fontWeight: 600 }}>{r.totalPrice} ₺</td>
                                <td>
                                    <span
                                        className={`badge ${r.status === 'Confirmed'
                                                ? 'badge-ok'
                                                : r.status === 'Pending'
                                                    ? 'badge-pending'
                                                    : 'badge-cancel'
                                            }`}
                                    >
                                        {r.status === 'Confirmed'
                                            ? 'Onaylandı'
                                            : r.status === 'Pending'
                                                ? 'Onay Bekliyor'
                                                : 'İptal'}
                                    </span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    {r.status === 'Pending' && (
                                        <button
                                            className="btn-approve-sm"
                                            onClick={() => handleApproveReservation(r.id)}
                                        >
                                            Onayla
                                        </button>
                                    )}
                                    {r.status !== 'Cancelled' && (
                                        <button
                                            className="btn-danger-sm"
                                            onClick={() => handleCancelReservation(r.id)}
                                        >
                                            {r.status === 'Pending' ? 'Reddet' : 'İptal Et'}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}