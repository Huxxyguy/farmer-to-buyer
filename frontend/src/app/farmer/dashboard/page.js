'use client';

import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function FarmerDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'farmer')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Loading session...</div>;
  }

  return (
    <div style={{ padding: '1rem 0' }}>
      <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(46, 204, 113, 0.15), rgba(30, 41, 59, 0.7))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span className="badge badge-farmer" style={{ marginBottom: '0.5rem' }}>Farmer Portal</span>
            <h1 style={{ fontSize: '1.8rem' }}>Welcome, {user.name}!</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Account Verification Status: <strong style={{ color: user.verified ? 'var(--accent-green)' : 'var(--accent-amber)' }}>{user.verified ? 'VERIFIED' : 'PENDING ADMIN APPROVAL'}</strong>
            </p>
          </div>
          <button className="btn btn-primary" disabled>
            + Add Produce Listing (Sprint 2)
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Storefront Status</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0.5rem 0' }}>Sprint 1 Active</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Authentication & Role Guard confirmed working. Farm profile setup available in Sprint 2.
          </p>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Withdrawable Balance</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0.5rem 0', color: 'var(--accent-green)' }}>₦0.00</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Escrow earnings ledger linked via `transactions` table.
          </p>
        </div>
      </div>
    </div>
  );
}
