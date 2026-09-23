'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_BASE = 'http://localhost:5000/api/v1';

export default function OrdersListPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  const [orders, setOrders] = useState([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user && token) {
      fetchMyOrders();
    }
  }, [user, token, loading, router]);

  const fetchMyOrders = async () => {
    setFetching(true);
    try {
      const res = await fetch(`${API_BASE}/orders/my-orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error('Error fetching orders list:', err);
    } finally {
      setFetching(false);
    }
  };

  const handlePayMock = async (orderId) => {
    try {
      let res = await fetch(`${API_BASE}/orders/${orderId}/pay`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ mock: true })
      });
      if (!res.ok) {
        res = await fetch(`${API_BASE}/orders/${orderId}/pay-mock`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
      if (res.ok) {
        fetchMyOrders();
      } else {
        const data = await res.json();
        alert(data.message || 'Payment failed');
      }
    } catch (err) {
      console.error('Error executing mock payment:', err);
    }
  };

  if (loading || fetching) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Loading orders list...</div>;
  }

  const isFarmer = user && user.role === 'farmer';

  return (
    <div style={{ padding: '1rem 0' }}>
      <div className="card" style={{ marginBottom: '1.5rem', background: '#ffffff', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span className={`badge badge-${isFarmer ? 'farmer' : 'buyer'}`} style={{ marginBottom: '0.5rem' }}>
              {isFarmer ? 'Farmer Sales & Dispatch' : 'Buyer Orders & Receipts'}
            </span>
            <h1 style={{ fontSize: '1.8rem' }}>Order Management & Escrow Tracking</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {isFarmer
                ? 'Track incoming buyer orders, update dispatch status, and monitor payout releases.'
                : 'Track order timeline status, inspect produce delivery, and release escrow payouts to farmers.'}
            </p>
          </div>
          {!isFarmer && (
            <Link href="/marketplace" className="btn btn-primary">
              🛒 Go to Produce Marketplace
            </Link>
          )}
        </div>
      </div>

      <div className="card">
        {orders.length > 0 ? (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.75rem 0' }}>Order ID</th>
                  <th>Date</th>
                  <th>{isFarmer ? 'Buyer Name' : 'Delivery Destination'}</th>
                  <th>Total Amount</th>
                  <th>Payment State</th>
                  <th>Order Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((ord) => (
                  <tr key={ord.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem 0', fontWeight: 'bold' }}>#{ord.id.slice(0, 8)}</td>
                    <td>{new Date(ord.created_at).toLocaleDateString()}</td>
                    <td>{isFarmer ? ord.buyer?.name : `${ord.delivery_city}, ${ord.delivery_state}`}</td>
                    <td style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>₦{ord.total_amount.toLocaleString()}</td>
                    <td>
                      <span className="badge badge-admin" style={{ fontSize: '0.75rem' }}>
                        {ord.payment ? ord.payment.status.toUpperCase() : 'PENDING'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${ord.status === 'completed' ? 'farmer' : 'buyer'}`}>
                        {ord.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', alignItems: 'center' }}>
                      {!isFarmer && ord.status === 'pending' && (
                        <button
                          onClick={() => handlePayMock(ord.id)}
                          className="btn btn-primary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem', background: 'var(--accent-green)', whiteSpace: 'nowrap' }}
                        >
                          ⚡ Instant Pay
                        </button>
                      )}
                      <Link href={`/orders/${ord.id}`} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                        View Details →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
            <h3>No Orders Found</h3>
            <p style={{ marginTop: '0.5rem' }}>
              {isFarmer ? 'No buyer orders have been placed for your farm produce yet.' : 'You have not placed any produce orders yet.'}
            </p>
            {!isFarmer && (
              <Link href="/marketplace" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                Browse Produce Marketplace
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
