'use client';

import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
      <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '1rem', background: 'linear-gradient(135deg, #2ecc71, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Farmer to Buyer Direct Marketplace
      </h1>
      <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', maxWidth: '700px', margin: '0 auto 2.5rem' }}>
        Eliminating agricultural middlemen across Nigeria. Connecting verified farmers directly with wholesale and retail produce buyers with secure escrow payments.
      </p>

      {user ? (
        <div className="card" style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
          <h3>Welcome Back, {user.name}!</h3>
          <p style={{ color: 'var(--text-secondary)', margin: '0.75rem 0 1.5rem' }}>
            Logged in as <strong style={{ color: 'var(--accent-green)', textTransform: 'capitalize' }}>{user.role}</strong>
          </p>
          <Link href={user.role === 'farmer' ? '/farmer/dashboard' : user.role === 'buyer' ? '/buyer/dashboard' : '/admin/dashboard'} className="btn btn-primary">
            Go to Your Dashboard &rarr;
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <div className="card" style={{ flex: '1', minWidth: '280px', maxWidth: '400px', textAlign: 'left' }}>
            <h3 style={{ color: 'var(--accent-green)', marginBottom: '0.5rem' }}>🌾 For Farmers</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              List your produce directly, set your own prices, reach buyers in Kano and beyond, and receive guaranteed escrow payouts upon delivery.
            </p>
            <Link href="/register?role=farmer" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Register as Farmer
            </Link>
          </div>

          <div className="card" style={{ flex: '1', minWidth: '280px', maxWidth: '400px', textAlign: 'left' }}>
            <h3 style={{ color: 'var(--accent-blue)', marginBottom: '0.5rem' }}>🛒 For Produce Buyers</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              Browse farm-fresh crops, filter produce by State & City, order at fair farm-gate prices, and inspect goods before releasing payment.
            </p>
            <Link href="/register?role=buyer" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
              Register as Buyer
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
