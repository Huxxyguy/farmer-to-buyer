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

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user && token && id) {
      fetchOrderDetails();
    }
  }, [user, token, loading, id, router]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);
    setError('');
    try {
      let res = await fetch(`${API_BASE}/reviews/orders/${id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rating: Number(reviewRating), comment: reviewComment })
      });
      if (!res.ok && res.status === 404) {
        res = await fetch(`${API_BASE}/orders/${id}/review`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ rating: Number(reviewRating), comment: reviewComment })
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Review submission failed');
      setMessage('⭐ Verified review submitted successfully! Thank you for rating the seller.');
      fetchOrderDetails();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

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

  const handlePayMock = async () => {
    setActionLoading(true);
    setError('');
    try {
      let res = await fetch(`${API_BASE}/orders/${id}/pay`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ mock: true })
      });
      if (!res.ok) {
        res = await fetch(`${API_BASE}/orders/${id}/pay-mock`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Payment simulation failed');
      
      setMessage('✅ Payment completed successfully! Funds are held in escrow.');
      fetchOrderDetails();
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

  const handleOpenDispute = async () => {
    const reason = prompt('Please enter the reason for opening a dispute on this order:');
    if (!reason || reason.trim().length < 5) {
      if (reason !== null) alert('Dispute reason must be at least 5 characters long.');
      return;
    }

    setActionLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/orders/${id}/dispute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdminUpdateStatus = async (newStatus) => {
    setActionLoading(true);
    setError('');
    try {
      let res;
      if (newStatus === 'paid') {
        res = await fetch(`${API_BASE}/orders/${id}/pay`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ mock: true })
        });
      } else if (newStatus === 'fulfilled') {
        res = await fetch(`${API_BASE}/orders/${id}/fulfill`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } else if (newStatus === 'completed') {
        res = await fetch(`${API_BASE}/orders/${id}/confirm`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } else if (newStatus === 'disputed') {
        res = await fetch(`${API_BASE}/orders/${id}/dispute`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'Admin status override to disputed' })
        });
      } else {
        res = await fetch(`${API_BASE}/admin/orders/${id}/status`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Status update failed');
      setMessage(`Order status updated to ${newStatus.toUpperCase()} successfully!`);
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

  const isBuyer = user && (user.id === order.buyer_id || user.role === 'buyer');
  const isFarmer = user && user.role === 'farmer';
  const isAdmin = user && user.role === 'admin';

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
      <div className="card" style={{ marginBottom: '1.5rem', background: '#ffffff', border: '1px solid var(--border-color)', borderLeft: '4px solid var(--accent-amber)' }}>
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
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button onClick={handlePayMock} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', background: 'var(--accent-green)' }} disabled={actionLoading}>
              {actionLoading ? 'Processing...' : '⚡ Instant Pay (Dev Test) — ₦' + order.total_amount.toLocaleString()}
            </button>
            <button onClick={handlePay} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} disabled={actionLoading}>
              {actionLoading ? 'Initializing Paystack...' : '💳 Pay via Paystack Gateway'}
            </button>
          </div>
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

        {['paid', 'fulfilled'].includes(order.status) && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <button
              onClick={handleOpenDispute}
              className="btn btn-danger"
              style={{ width: '100%', justifyContent: 'center', fontSize: '0.85rem' }}
              disabled={actionLoading}
            >
              🚩 Report Issue / Open Dispute for Admin Arbitration
            </button>
          </div>
        )}

        {order.status === 'disputed' && (
          <div className="alert alert-danger" style={{ marginBottom: 0 }}>
            ⚖️ <strong>Order Under Dispute:</strong> Escrow funds remain frozen pending Admin review and resolution.
          </div>
        )}

        {order.status === 'completed' && (
          <div>
            <div className="alert alert-success" style={{ marginBottom: '1.25rem' }}>
              ✅ <strong>Order Completed:</strong> Escrow payment has been released to the farmer's balance.
            </div>

            {/* Verified Review Submission Form for Buyers */}
            {isBuyer && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', textAlign: 'left' }}>
                {order.reviews && order.reviews.some(r => r.reviewer_id === user.id) ? (
                  <div style={{ padding: '0.75rem', background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                    <h5 style={{ color: 'var(--accent-green)', marginBottom: '0.25rem' }}>
                      ⭐ You have posted a verified review for this order
                    </h5>
                    {order.reviews.filter(r => r.reviewer_id === user.id).map(rev => (
                      <p key={rev.id} style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
                        Rating: <strong>{'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)} ({rev.rating}/5)</strong> — "{rev.comment}"
                      </p>
                    ))}
                  </div>
                ) : (
                  <form onSubmit={handleSubmitReview} style={{ background: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                      ⭐ Rate & Review Your Experience with the Farmer
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                      Your order is complete. Leave a verified review to build the seller's customer reputation score.
                    </p>

                    <div className="form-group">
                      <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Star Rating Score</label>
                      <select
                        className="form-control"
                        value={reviewRating}
                        onChange={(e) => setReviewRating(e.target.value)}
                        style={{ maxWidth: '200px' }}
                      >
                        <option value={5}>⭐⭐⭐⭐⭐ (5 / 5 Stars - Excellent)</option>
                        <option value={4}>⭐⭐⭐⭐ (4 / 5 Stars - Good)</option>
                        <option value={3}>⭐⭐⭐ (3 / 5 Stars - Average)</option>
                        <option value={2}>⭐⭐ (2 / 5 Stars - Below Average)</option>
                        <option value={1}>⭐ (1 / 5 Stars - Poor)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Review Comments / Feedback</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        placeholder="e.g. Excellent quality tomatoes, fresh harvest, fast dispatch!"
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        required
                      />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ fontSize: '0.85rem' }} disabled={submittingReview}>
                      {submittingReview ? 'Submitting Review...' : 'Submit Verified Review & Rating'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        )}

        {isAdmin && (
          <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '2px dashed var(--accent-amber)', textAlign: 'left' }}>
            <h4 style={{ fontSize: '1rem', color: 'var(--accent-amber)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              👑 Administrator Status Override Panel
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              As Administrator, you can manually update the lifecycle status of this order:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
              <button
                onClick={() => handleAdminUpdateStatus('paid')}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', justifyContent: 'center' }}
                disabled={actionLoading || order.status === 'paid'}
              >
                Mark PAID
              </button>
              <button
                onClick={() => handleAdminUpdateStatus('fulfilled')}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', justifyContent: 'center' }}
                disabled={actionLoading || order.status === 'fulfilled'}
              >
                Mark FULFILLED
              </button>
              <button
                onClick={() => handleAdminUpdateStatus('completed')}
                className="btn btn-primary"
                style={{ fontSize: '0.8rem', justifyContent: 'center', background: 'var(--accent-green)' }}
                disabled={actionLoading || order.status === 'completed'}
              >
                Mark COMPLETED
              </button>
              <button
                onClick={() => handleAdminUpdateStatus('disputed')}
                className="btn btn-danger"
                style={{ fontSize: '0.8rem', justifyContent: 'center' }}
                disabled={actionLoading || order.status === 'disputed'}
              >
                Mark DISPUTED
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
