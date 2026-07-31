'use client';

import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Loading session...</div>;
  }

  return (
    <div style={{ padding: '1rem 0' }}>
      <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(243, 156, 18, 0.15), rgba(30, 41, 59, 0.7))' }}>
        <span className="badge badge-admin" style={{ marginBottom: '0.5rem' }}>Platform Governance</span>
        <h1 style={{ fontSize: '1.8rem' }}>Admin Control Center</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Logged in as Administrator: {user.name} ({user.email})
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        <div className="card">
          <h3>Farm Verification Queue</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            Verification audit trail (`verified_by`, `verified_at`) will unlock in Sprint 4.
          </p>
        </div>

        <div className="card">
          <h3>Dispute Resolution Center</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            Escrow hold/refund arbitration queue will unlock in Sprint 4.
          </p>
        </div>
      </div>
    </div>
  );
}
