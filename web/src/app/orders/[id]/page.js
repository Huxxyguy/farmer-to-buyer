'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_BASE = 'http://localhost:5000/api/v1';

export default function OrderDetailPage({ params }) {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const { id } = params;

  const [order, setOrder] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user && token && id) {
      fetchOrderDetails();
    }
  }, [user, token, loading, id, router]);

  const fetchOrderDetails = async () => {
    setFetching(true);
    try {
      const res = await fetch(`${API_BASE}/orders/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrder(data.order);
      } else {
        setError('Order not found');
      }
    } catch (err) {
      console.error('Error fetching order:', err);
    } finally {
      setFetching(false);
    }
  };

  const handlePay = async () => {
    setActionLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/orders/${id}/pay`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Payment initialization failed');
      
      setMessage(`Redirecting to Paystack Checkout... (Reference: ${data.reference})`);
      window.location.href = data.authorization_url;
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFulfill = async () => {
    setActionLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/orders/${id}/fulfill`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Fulfillment failed');
      setMessage('Order marked as fulfilled/dispatched successfully!');
      fetchOrderDetails();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReceipt = async () => {
    setActionLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/orders/${id}/confirm`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Confirmation failed');
      setMessage('Receipt confirmed! Escrow funds released to farmer balance.');
      fetchOrderDetails();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || fetching) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Loading order details...</div>;
  }

  if (!order) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <h3>Order Not Found</h3>
        <Link href="/orders" className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Back to Orders
        </Link>
      </div>
    );
  }

  const isBuyer = user && user.id === order.buyer_id;
  const isFarmer = user && user.role === 'farmer';

  return (
    <div style={{ maxWidth: '800px', margin: '1.5rem auto' }}>
      {/* Header */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Order ID: #{order.id}</span>
            <h2 style={{ fontSize: '1.5rem', marginTop: '0.2rem' }}>Order Details & Escrow Tracking</h2>
          </div>
          <span className={`badge badge-${order.status === 'completed' ? 'farmer' : 'buyer'}`} style={{ fontSize: '0.9rem' }}>
            STATUS: {order.status.toUpperCase()}
          </span>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      {/* Escrow Status Banner */}
      <div className="card" style={{ marginBottom: '1.5rem', background: 'rgba(30, 41, 59, 0.9)', borderLeft: '4px solid var(--accent-amber)' }}>
        <h4 style={{ color: 'var(--accent-amber)', marginBottom: '0.4rem' }}>
          🛡️ Platform Escrow Protection
        </h4>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          {order.payment ? (
            <>Payment State: <strong style={{ color: 'var(--text-primary)' }}>{order.payment.status.toUpperCase()}</strong> (Gateway Ref: {order.payment.gateway_reference})</>
          ) : (
            'Payment Pending'
          )}
        </p>
      </div>

      {/* Order Items & Price Snapshot Table */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Items Ordered (Snapshotted Pricing)</h3>
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.75rem 0' }}>Item Name</th>
                <th>Price Snapshot</th>
                <th>Quantity</th>
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {order.orderItems.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.75rem 0' }}>{item.product.name}</td>
                  <td>₦{item.price_at_purchase.toLocaleString()} / {item.product.unit}</td>
                  <td>{item.quantity}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                    ₦{(item.price_at_purchase * item.quantity).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Total Amount Paid/Due:</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-green)' }}>
            ₦{order.total_amount.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Delivery Shipping Destination */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>Delivery Destination</h3>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
          Address: <strong>{order.delivery_address}</strong><br />
          Location: <strong>{order.delivery_city}, {order.delivery_state} State</strong>
        </p>
      </div>

      {/* Interactive Action Bar */}
      <div className="card" style={{ textAlign: 'center' }}>
        {isBuyer && order.status === 'pending' && (
          <button onClick={handlePay} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={actionLoading}>
            {actionLoading ? 'Initializing Paystack...' : 'Pay ₦' + order.total_amount.toLocaleString() + ' via Paystack'}
          </button>
        )}

        {isFarmer && order.status === 'paid' && (
          <button onClick={handleFulfill} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={actionLoading}>
            {actionLoading ? 'Updating Status...' : 'Mark Produce Dispatched / Fulfilled'}
          </button>
        )}

        {isBuyer && order.status === 'fulfilled' && (
          <div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
              Please inspect your delivered produce before confirming receipt.
            </p>
            <button onClick={handleConfirmReceipt} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={actionLoading}>
              {actionLoading ? 'Releasing Escrow...' : 'CONFIRM RECEIPT & RELEASE FUNDS TO FARMER'}
            </button>
          </div>
        )}

        {order.status === 'completed' && (
          <div className="alert alert-success" style={{ marginBottom: 0 }}>
            ✅ <strong>Order Completed:</strong> Escrow payment has been released to the farmer's balance.
          </div>
        )}
      </div>
    </div>
  );
}
