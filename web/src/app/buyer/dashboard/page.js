'use client';

import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function BuyerDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'buyer')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Loading session...</div>;
  }

  return (
    <div style={{ padding: '1rem 0' }}>
      <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(30, 41, 59, 0.7))' }}>
        <span className="badge badge-buyer" style={{ marginBottom: '0.5rem' }}>Buyer Marketplace</span>
        <h1 style={{ fontSize: '1.8rem' }}>Welcome, {user.name}!</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Registered Buyer Account: {user.email} | Phone: {user.phone}
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '0.5rem' }}>Browse Produce Marketplace</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Produce search, State/City filtering, Cart checkout, and Paystack Escrow integration will unlock in Sprints 2 & 3.
        </p>
      </div>
    </div>
  );
}
