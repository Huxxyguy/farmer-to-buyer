'use client';

import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const API_BASE = 'http://localhost:5000/api/v1';

export default function BuyerDashboard() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  const [orders, setOrders] = useState([]);
  const [fetchingOrders, setFetchingOrders] = useState(true);
  const [productCount, setProductCount] = useState(0);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'buyer')) {
      router.push('/login');
    } else if (user && token) {
      fetchBuyerData();
    }
  }, [user, token, loading, router]);

  const fetchBuyerData = async () => {
    setFetchingOrders(true);
    try {
      // Fetch Buyer Orders
      const ordersRes = await fetch(`${API_BASE}/orders/my-orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setOrders(data.orders || []);
      }

      // Fetch Active Marketplace Produce Count
      const prodRes = await fetch(`${API_BASE}/products`);
      if (prodRes.ok) {
        const data = await prodRes.json();
        setProductCount(data.count || 0);
      }
    } catch (err) {
      console.error('Error fetching buyer dashboard data:', err);
    } finally {
      setFetchingOrders(false);
    }
  };

  if (loading || !user) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Loading session...</div>;
  }

  return (
    <div style={{ padding: '1rem 0' }}>
      {/* Welcome Banner */}
      <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(30, 41, 59, 0.7))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span className="badge badge-buyer" style={{ marginBottom: '0.5rem' }}>Buyer Marketplace</span>
            <h1 style={{ fontSize: '1.8rem' }}>Welcome, {user?.name || 'Buyer'}!</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Account: <strong>{user?.email}</strong> | Phone: <strong>{user?.phone}</strong>
            </p>
          </div>
          <Link href="/marketplace" className="btn btn-primary">
            🛒 Go to Produce Marketplace ({productCount} items)
          </Link>
        </div>
      </div>

      {/* Quick Access Card */}
      <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--accent-blue)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ marginBottom: '0.3rem' }}>🌾 Fresh Produce Marketplace Unlocked</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Browse farm-gate produce across Nigerian states, filter by LGA/City, place orders, and pay securely via Paystack Escrow.
            </p>
          </div>
          <Link href="/marketplace" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
            Browse Marketplace
          </Link>
        </div>
      </div>

      {/* Buyer Orders & Escrow Tracking */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3>📦 Your Recent Orders & Escrow Tracking</h3>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {orders.length} Order(s) Placed
          </span>
        </div>

        {fetchingOrders ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading your orders...</p>
        ) : orders.length > 0 ? (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.75rem 0' }}>Order ID</th>
                  <th>Date</th>
                  <th>Destination</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((ord) => (
                  <tr key={ord.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.75rem 0', fontWeight: 'bold' }}>#{ord.id.slice(0, 8)}</td>
                    <td>{new Date(ord.created_at).toLocaleDateString()}</td>
                    <td>{ord.delivery_city}, {ord.delivery_state}</td>
                    <td style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>₦{ord.total_amount.toLocaleString()}</td>
                    <td>
                      <span className={`badge badge-${ord.status === 'completed' ? 'farmer' : 'buyer'}`}>
                        {ord.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link href={`/orders/${ord.id}`} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>
                        Track & Release Escrow →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)' }}>
            <p>You haven't placed any orders yet.</p>
            <Link href="/marketplace" className="btn btn-primary" style={{ marginTop: '0.75rem' }}>
              Explore Marketplace & Place First Order
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
