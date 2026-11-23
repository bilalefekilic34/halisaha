import { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import type { Pitch, Reservation, ScheduleSlot } from '../types';

const HOURS = Array.from({ length: 14 }, (_, i) => i + 10); // 10:00 - 23:00

// UTC kayması (gece 00:00 - 03:00 arası dünün tarihini verme hatası) olmaması için yerel tarih üretici
function getLocalTodayISO() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function BookingDashboard() {
    const todayISO = getLocalTodayISO();

    const [pitches, setPitches] = useState<Pitch[]>([]);
    const [selectedPitchId, setSelectedPitchId] = useState<number | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>(todayISO);
    const [bookedSlots, setBookedSlots] = useState<ScheduleSlot[]>([]);
    const [selectedHour, setSelectedHour] = useState<number | null>(null);
    const [duration, setDuration] = useState<number>(1);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const loadPitchesAndReservations = async () => {
        try {
            const [pitchList, resList] = await Promise.all([
                apiRequest<Pitch[]>('/pitches'),
                apiRequest<Reservation[]>('/reservations'),
            ]);
            setPitches(pitchList);
            setReservations(resList);
            if (pitchList.length > 0 && !selectedPitchId) {
                setSelectedPitchId(pitchList[0].id);
            }
        } catch (err) {
            setMessage({ type: 'err', text: err instanceof Error ? err.message : 'Veriler alınamadı.' });
        }
    };

    useEffect(() => {
        loadPitchesAndReservations();
    }, []);

    useEffect(() => {
        if (!selectedPitchId || !selectedDate) return;
        setSelectedHour(null);

        apiRequest<ScheduleSlot[]>(
            `/reservations/schedule?pitchId=${selectedPitchId}&date=${selectedDate}`
        )
            .then(setBookedSlots)
            .catch(() => setBookedSlots([]));
    }, [selectedPitchId, selectedDate]);

    const isHourBooked = (hour: number) => {
        return bookedSlots.some((slot) => {
            const startH = new Date(slot.startTime).getHours();
            const endH = new Date(slot.endTime).getHours() || 24;
            return hour >= startH && hour < endH;
        });
    };

    // Seçilen tarih geçmişse veya bugün seçiliyse şu anki saat (ve öncesi) geçmiş sayılır
    const isHourPast = (hour: number) => {
        const currentToday = getLocalTodayISO();
        if (selectedDate < currentToday) return true;
        if (selectedDate === currentToday) {
            const currentHour = new Date().getHours();
            return hour <= currentHour;
        }
        return false;
    };

    const handleDateChange = (newDate: string) => {
        // Kullanıcı klavyeyle geçmiş bir tarih yazarsa bugüne sabitle
        if (newDate < getLocalTodayISO()) {
            setSelectedDate(getLocalTodayISO());
            return;
        }
        setSelectedDate(newDate);
    };

    const handleBook = async () => {
        if (!selectedPitchId || selectedHour === null) return;
        setSubmitting(true);
        setMessage(null);

        const paddedHour = String(selectedHour).padStart(2, '0');
        const startTime = `${selectedDate}T${paddedHour}:00:00`;

        try {
            await apiRequest<Reservation>('/reservations', {
                method: 'POST',
                body: JSON.stringify({
                    pitchId: selectedPitchId,
                    startTime,
                    durationHours: duration,
                }),
            });
            setMessage({ type: 'ok', text: 'Rezervasyon talebiniz alındı, tesis onayı bekleniyor.' });
            setSelectedHour(null);

            const [updatedSlots, updatedRes] = await Promise.all([
                apiRequest<ScheduleSlot[]>(
                    `/reservations/schedule?pitchId=${selectedPitchId}&date=${selectedDate}`
                ),
                apiRequest<Reservation[]>('/reservations'),
            ]);
            setBookedSlots(updatedSlots);
            setReservations(updatedRes);
        } catch (err) {
            setMessage({
                type: 'err',
                text: err instanceof Error ? err.message : 'Rezervasyon oluşturulamadı.',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = async (id: number) => {
        try {
            await apiRequest(`/reservations/${id}/cancel`, { method: 'PATCH' });
            setMessage({ type: 'ok', text: 'Rezervasyon iptal edildi.' });
            await loadPitchesAndReservations();
            if (selectedPitchId) {
                const updatedSlots = await apiRequest<ScheduleSlot[]>(
                    `/reservations/schedule?pitchId=${selectedPitchId}&date=${selectedDate}`
                );
                setBookedSlots(updatedSlots);
            }
        } catch (err) {
            setMessage({
                type: 'err',
                text: err instanceof Error ? err.message : 'İptal işlemi başarısız.',
            });
        }
    };

    const activePitch = pitches.find((p) => p.id === selectedPitchId);

    return (
        <div>
            {message && (
                <div className={message.type === 'ok' ? 'alert-success' : 'alert-error'}>
                    {message.text}
                </div>
            )}

            <div className="shs-layout">
                {/* SOL KOLON: SAHA SEÇİMİ, SAAT ÇİZELGESİ VE GEÇMİŞ MAÇLAR */}
                <div>
                    <div className="shs-card">
                        <div className="shs-card-header">
                            <div className="shs-card-title">
                                <span className="shs-dot" /> Tesis Sahaları ve Müsaitlik Durumu
                            </div>
                            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                {selectedDate}
                            </span>
                        </div>

                        <div className="pitch-cards">
                            {pitches.map((p) => (
                                <div
                                    key={p.id}
                                    onClick={() => setSelectedPitchId(p.id)}
                                    className={`pitch-card ${selectedPitchId === p.id ? 'active' : ''}`}
                                >
                                    <div style={{ fontWeight: 700, fontSize: '0.98rem' }}>{p.name}</div>
                                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                        Zemin: {p.surfaceType}
                                    </div>
                                    <div className="pitch-price">{p.hourlyPrice} ₺ / saat</div>
                                </div>
                            ))}
                        </div>

                        <label>Seans Saati Seçin</label>
                        <div className="slots-grid">
                            {HOURS.map((hour) => {
                                const booked = isHourBooked(hour);
                                const past = isHourPast(hour);
                                const disabled = booked || past;
                                const selected = selectedHour === hour;

                                let stateClass = 'available';
                                let statusText = 'Müsait';

                                if (booked) {
                                    stateClass = 'booked';
                                    statusText = 'Dolu';
                                } else if (past) {
                                    stateClass = 'past';
                                    statusText = 'Geçti';
                                } else if (selected) {
                                    stateClass = 'selected';
                                    statusText = 'Seçildi';
                                }

                                return (
                                    <button
                                        key={hour}
                                        type="button"
                                        disabled={disabled}
                                        onClick={() => setSelectedHour(hour)}
                                        className={`slot-btn ${stateClass}`}
                                    >
                                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                                            {String(hour).padStart(2, '0')}:00
                                        </div>
                                        <div style={{ fontSize: '0.72rem', marginTop: '0.1rem' }}>
                                            {statusText}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="shs-card">
                        <div className="shs-card-header">
                            <div className="shs-card-title">
                                <span className="shs-dot" /> Rezervasyonlarım
                            </div>
                        </div>

                        {reservations.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                Kayıtlı maç rezervasyonunuz bulunmuyor.
                            </p>
                        ) : (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Saha</th>
                                        <th>Tarih / Saat</th>
                                        <th>Süre</th>
                                        <th>Tutar</th>
                                        <th>Durum</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reservations.map((r) => {
                                        const hours =
                                            (new Date(r.endTime).getTime() - new Date(r.startTime).getTime()) / 3600000;
                                        return (
                                            <tr key={r.id}>
                                                <td style={{ fontWeight: 600 }}>{r.pitchName}</td>
                                                <td>
                                                    {new Date(r.startTime).toLocaleDateString('tr-TR')} •{' '}
                                                    {new Date(r.startTime).toLocaleTimeString('tr-TR', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </td>
                                                <td>{hours} Saat</td>
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
                                                    {r.status !== 'Cancelled' && (
                                                        <button className="btn-danger-sm" onClick={() => handleCancel(r.id)}>
                                                            İptal Et
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* SAĞ KOLON: MAÇINI BUL & REZERVASYON ÖZETİ WIDGET'I */}
                <aside className="shs-card" style={{ position: 'sticky', top: '5rem' }}>
                    <div className="shs-card-header">
                        <div className="shs-card-title">
                            <span className="shs-dot" /> Maçını Ayarla
                        </div>
                    </div>

                    <label>Saha Tercihi</label>
                    <select
                        value={selectedPitchId ?? ''}
                        onChange={(e) => setSelectedPitchId(Number(e.target.value))}
                    >
                        {pitches.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name}
                            </option>
                        ))}
                    </select>

                    <label>Maç Tarihi</label>
                    <input
                        type="date"
                        min={todayISO}
                        value={selectedDate}
                        onChange={(e) => handleDateChange(e.target.value)}
                    />

                    <label>Oynama Süresi</label>
                    <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                        <option value={1}>1 Saat (Standart Maç)</option>
                        <option value={2}>2 Saat (Uzun Turnuva)</option>
                    </select>

                    <div
                        style={{
                            background: '#f8fafc',
                            border: '1px solid var(--border)',
                            borderRadius: 8,
                            padding: '0.85rem',
                            marginBottom: '1rem',
                            fontSize: '0.88rem',
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Seçili Saat:</span>
                            <strong>
                                {selectedHour !== null
                                    ? `${String(selectedHour).padStart(2, '0')}:00 - ${String(selectedHour + duration).padStart(2, '0')}:00`
                                    : 'Soldan saat seçiniz'}
                            </strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Toplam Tutar:</span>
                            <strong style={{ color: 'var(--pitch-green)', fontSize: '1.05rem' }}>
                                {activePitch ? `${activePitch.hourlyPrice * duration} ₺` : '-'}
                            </strong>
                        </div>
                    </div>

                    <button
                        className="btn-primary"
                        style={{ width: '100%' }}
                        disabled={selectedHour === null || submitting}
                        onClick={handleBook}
                    >
                        {submitting ? 'Kaydediliyor...' : 'Rezervasyon Talebi Gönder'}
                    </button>
                </aside>
            </div>
        </div>
    );
}