'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';

const API_BASE = 'http://localhost:5000/api/v1';

export default function AdminDashboard() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  const [analytics, setAnalytics] = useState(null);
  const [pendingFarms, setPendingFarms] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [allFarms, setAllFarms] = useState([]);
  const [allOrders, setAllOrders] = useState([]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/login');
    } else if (user && token && user.role === 'admin') {
      fetchAdminData();
    }
  }, [user, token, loading, router]);

  const fetchAdminData = async () => {
    setFetching(true);
    try {
      // 0. Fetch All Farms Directory
      const allFarmRes = await fetch(`${API_BASE}/admin/farms`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (allFarmRes.ok) {
        const data = await allFarmRes.json();
        setAllFarms(data.farms || []);
      }

      // 0b. Fetch All Orders & Escrow Audit Directory
      let allOrdRes = await fetch(`${API_BASE}/admin/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!allOrdRes.ok) {
        allOrdRes = await fetch(`${API_BASE}/orders/my-orders`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
      if (allOrdRes.ok) {
        const data = await allOrdRes.json();
        setAllOrders(data.orders || []);
      }

      // 1. Fetch Analytics
      const analRes = await fetch(`${API_BASE}/admin/analytics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (analRes.ok) {
        const data = await analRes.json();
        setAnalytics(data.analytics);
      }

      // 2. Fetch Pending Farms Queue
      const farmRes = await fetch(`${API_BASE}/admin/farms/pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (farmRes.ok) {
        const data = await farmRes.json();
        setPendingFarms(data.farms || []);
      }

      // 3. Fetch Disputes Queue
      const dispRes = await fetch(`${API_BASE}/admin/disputes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (dispRes.ok) {
        const data = await dispRes.json();
        setDisputes(data.disputes || []);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setFetching(false);
    }
  };

  const handleVerifyFarm = async (farmId, status) => {
    setActionLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/admin/farms/${farmId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Farm verification failed');
      setMessage(`Farm storefront ${status} successfully! Audit timestamp recorded.`);
      fetchAdminData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveDispute = async (disputeId, resolution) => {
    setActionLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/admin/disputes/${disputeId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ resolution })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Dispute resolution failed');
      setMessage(data.message);
      fetchAdminData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdminUpdateStatus = async (orderId, newStatus) => {
    setActionLoading(true);
    setError('');
    setMessage('');
    try {
      let res;
      if (newStatus === 'paid') {
        res = await fetch(`${API_BASE}/orders/${orderId}/pay`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ mock: true })
        });
      } else if (newStatus === 'fulfilled') {
        res = await fetch(`${API_BASE}/orders/${orderId}/fulfill`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } else if (newStatus === 'completed') {
        res = await fetch(`${API_BASE}/orders/${orderId}/confirm`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } else if (newStatus === 'disputed') {
        res = await fetch(`${API_BASE}/orders/${orderId}/dispute`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'Admin status override to disputed' })
        });
      } else {
        res = await fetch(`${API_BASE}/admin/orders/${orderId}/status`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Status update failed');
      setMessage(`Order status updated to ${newStatus.toUpperCase()} successfully!`);
      fetchAdminData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || fetching || !user) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Loading Admin Governance Center...</div>;
  }

  return (
    <div style={{ padding: '1rem 0' }}>
      {/* Admin Welcome Header */}
      <div className="card" style={{ marginBottom: '1.5rem', background: '#ffffff', border: '1px solid var(--border-color)' }}>
        <span className="badge badge-admin" style={{ marginBottom: '0.5rem' }}>Platform Governance</span>
        <h1 style={{ fontSize: '1.8rem' }}>Admin Control Center</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Logged in as Administrator: {user?.name || 'Admin'} ({user?.email || ''})
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      {/* Platform Analytics Bar */}
      {analytics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div className="card" style={{ padding: '1.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Platform Users</span>
            <p style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--accent-blue)', margin: '0.2rem 0' }}>
              {analytics.totalUsers}
            </p>
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Verified Storefronts</span>
            <p style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--accent-green)', margin: '0.2rem 0' }}>
              {analytics.verifiedFarms}
            </p>
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Pending Storefronts</span>
            <p style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--accent-amber)', margin: '0.2rem 0' }}>
              {analytics.pendingFarms}
            </p>
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Open Disputes Queue</span>
            <p style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--accent-red)', margin: '0.2rem 0' }}>
              {analytics.openDisputes}
            </p>
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total GMV Volume</span>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-green)', margin: '0.2rem 0' }}>
              ₦{analytics.totalVolume.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* All Farm Storefronts Directory & Status Manager */}
      <div className="card" style={{ marginBottom: '2.5rem' }}>
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          🚜 All Platform Farm Storefronts Directory <span className="badge badge-admin">{allFarms.length} Total Farms</span>
        </h3>

        {allFarms.length > 0 ? (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.75rem 0' }}>Farm Name</th>
                  <th>Owner</th>
                  <th>Location</th>
                  <th>Listings</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Verification Action</th>
                </tr>
              </thead>
              <tbody>
                {allFarms.map((farm) => (
                  <tr key={farm.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem 0', fontWeight: 'bold' }}>{farm.farm_name}</td>
                    <td>{farm.user?.name} ({farm.user?.phone})</td>
                    <td>{farm.city}, {farm.state}</td>
                    <td>{farm._count?.products || 0} Products</td>
                    <td>
                      <span className={`badge badge-${farm.verification_status === 'verified' ? 'farmer' : 'admin'}`}>
                        {farm.verification_status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {farm.verification_status !== 'verified' ? (
                        <button
                          onClick={() => handleVerifyFarm(farm.id, 'verified')}
                          className="btn btn-primary"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                          disabled={actionLoading}
                        >
                          Approve
                        </button>
                      ) : (
                        <button
                          onClick={() => handleVerifyFarm(farm.id, 'rejected')}
                          className="btn btn-danger"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                          disabled={actionLoading}
                        >
                          Revoke / Reject
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)' }}>No registered farm storefronts found.</p>
        )}
      </div>

      {/* All Marketplace Orders & Escrow Audit Table */}
      <div className="card" style={{ marginBottom: '2.5rem' }}>
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          📦 All Marketplace Orders & Escrow Audit Table <span className="badge badge-admin">{allOrders.length} Total Orders</span>
        </h3>

        {allOrders.length > 0 ? (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.75rem 0' }}>Order ID</th>
                  <th>Buyer Name</th>
                  <th>Delivery Location</th>
                  <th>Total Amount</th>
                  <th>Escrow State</th>
                  <th>Order Status</th>
                  <th style={{ textAlign: 'right' }}>Inspection</th>
                </tr>
              </thead>
              <tbody>
                {allOrders.map((ord) => (
                  <tr key={ord.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem 0', fontWeight: 'bold' }}>#{ord.id.slice(0, 8)}</td>
                    <td>{ord.buyer?.name} ({ord.buyer?.phone || ord.buyer?.email})</td>
                    <td>{ord.delivery_city}, {ord.delivery_state}</td>
                    <td style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>₦{ord.total_amount.toLocaleString()}</td>
                    <td>
                      <span className="badge badge-admin" style={{ fontSize: '0.75rem' }}>
                        {ord.payment ? ord.payment.status.toUpperCase() : 'UNPAID'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${ord.status === 'completed' ? 'farmer' : 'buyer'}`}>
                        {ord.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', alignItems: 'center' }}>
                      <select
                        value={ord.status}
                        onChange={(e) => handleAdminUpdateStatus(ord.id, e.target.value)}
                        className="btn btn-secondary"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', background: '#ffffff', cursor: 'pointer' }}
                        disabled={actionLoading}
                      >
                        <option value="pending">PENDING</option>
                        <option value="paid">PAID</option>
                        <option value="fulfilled">FULFILLED</option>
                        <option value="completed">COMPLETED</option>
                        <option value="disputed">DISPUTED</option>
                      </select>
                      <a href={`/orders/${ord.id}`} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>
                        Audit Details →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)' }}>No orders placed on the marketplace yet.</p>
        )}
      </div>

      {/* Farm Verification Queue Section */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          🌾 Pending Farm Verification Queue <span className="badge badge-admin">{pendingFarms.length} Pending</span>
        </h3>

        {pendingFarms.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {pendingFarms.map((farm) => (
              <div key={farm.id} className="card" style={{ padding: '1.25rem' }}>
                <h4 style={{ fontSize: '1.15rem', marginBottom: '0.25rem' }}>{farm.farm_name}</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Owner: <strong>{farm.user?.name}</strong> ({farm.user?.email}) | Phone: <strong>{farm.user?.phone}</strong>
                </p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  📍 Location: {farm.address}, {farm.city}, {farm.state} State
                </p>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={() => handleVerifyFarm(farm.id, 'verified')}
                    className="btn btn-primary"
                    style={{ flex: 1, justifyContent: 'center', fontSize: '0.85rem' }}
                    disabled={actionLoading}
                  >
                    Approve Farm
                  </button>
                  <button
                    onClick={() => handleVerifyFarm(farm.id, 'rejected')}
                    className="btn btn-danger"
                    style={{ flex: 1, justifyContent: 'center', fontSize: '0.85rem' }}
                    disabled={actionLoading}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No farm storefronts currently awaiting verification.
          </div>
        )}
      </div>

      {/* Dispute Resolution Queue Section */}
      <div>
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          ⚖️ Dispute Resolution Queue <span className="badge badge-admin">{disputes.length} Open</span>
        </h3>

        {disputes.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
            {disputes.map((disp) => (
              <div key={disp.id} className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent-red)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Dispute ID: #{disp.id} | Order: #{disp.order_id}</span>
                    <h4 style={{ fontSize: '1.2rem', marginTop: '0.2rem' }}>
                      Reason: "{disp.reason}"
                    </h4>
                  </div>
                  <span className="badge badge-admin">STATUS: {disp.status.toUpperCase()}</span>
                </div>

                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem', padding: '0.75rem', background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                  Buyer: <strong>{disp.order?.buyer?.name}</strong> ({disp.order?.buyer?.email}) | Total Amount in Escrow: <strong style={{ color: 'var(--accent-green)' }}>₦{disp.order?.payment?.amount?.toLocaleString()}</strong>
                </div>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleResolveDispute(disp.id, 'resolved_refund')}
                    className="btn btn-secondary"
                    style={{ flex: 1, justifyContent: 'center' }}
                    disabled={actionLoading}
                  >
                    Refund Buyer (₦{disp.order?.payment?.amount?.toLocaleString()})
                  </button>

                  <button
                    onClick={() => handleResolveDispute(disp.id, 'resolved_release')}
                    className="btn btn-primary"
                    style={{ flex: 1, justifyContent: 'center' }}
                    disabled={actionLoading}
                  >
                    Release Payout to Farmer
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No open disputes requiring admin arbitration.
          </div>
        )}
      </div>
    </div>
  );
}
