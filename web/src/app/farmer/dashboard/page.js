'use client';

import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const API_BASE = 'http://localhost:5000/api/v1';

export default function FarmerDashboard() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  const [farm, setFarm] = useState(null);
  const [farmerOrders, setFarmerOrders] = useState([]);
  const [reviewsData, setReviewsData] = useState({ average_rating: 0, total_reviews: 0, reviews: [] });
  const [fetchingFarm, setFetchingFarm] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Storefront Setup Form state
  const [farmName, setFarmName] = useState('');
  const [state, setState] = useState('Kano');
  const [city, setCity] = useState('Wudil');
  const [address, setAddress] = useState('');
  const [creatingFarm, setCreatingFarm] = useState(false);

  // Produce Listing Creation state
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('Grains');
  const [prodPrice, setProdPrice] = useState('');
  const [prodUnit, setProdUnit] = useState('50kg Bag');
  const [prodStock, setProdStock] = useState('');
  const [prodPhoto, setProdPhoto] = useState('');
  const [creatingProduct, setCreatingProduct] = useState(false);

  // Produce Listing Edit state
  const [editingProduct, setEditingProduct] = useState(null);
  const [editPrice, setEditPrice] = useState('');
  const [editStock, setEditStock] = useState('');

  // Bank Withdrawal state
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankName, setBankName] = useState('First Bank of Nigeria');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  // Incoming Orders Filter state
  const [orderTab, setOrderTab] = useState('active'); // 'active', 'completed', 'all'

  const activeIncomingOrders = farmerOrders.filter(o => o.status !== 'completed' && o.status !== 'cancelled');
  const completedOrders = farmerOrders.filter(o => o.status === 'completed');

  const displayedOrders = orderTab === 'active'
    ? activeIncomingOrders
    : orderTab === 'completed'
    ? completedOrders
    : farmerOrders;

  const handleWithdrawSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setWithdrawing(true);
    try {
      const res = await fetch(`${API_BASE}/farms/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: Number(withdrawAmount),
          bank_name: bankName,
          account_number: accountNumber,
          account_name: accountName
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Bank withdrawal failed');
      setSuccess(data.message);
      setShowWithdraw(false);
      setWithdrawAmount('');
      setAccountNumber('');
      setAccountName('');
      fetchMyFarm();
    } catch (err) {
      setError(err.message);
    } finally {
      setWithdrawing(false);
    }
  };

  useEffect(() => {
    if (!loading && (!user || user.role !== 'farmer')) {
      router.push('/login');
    } else if (user && token) {
      fetchMyFarm();
      fetchMyOrders();
    }
  }, [user, token, loading, router]);

  const fetchMyFarm = async () => {
    setFetchingFarm(true);
    try {
      const res = await fetch(`${API_BASE}/farms/my-farm`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFarm(data.farm);
        if (data.farm) {
          if (data.farm.reviews) {
            setReviewsData({
              average_rating: data.farm.average_rating || 0,
              total_reviews: data.farm.total_reviews || 0,
              reviews: data.farm.reviews || []
            });
          }
          fetchFarmReviews(data.farm.id);
        }
      } else {
        setFarm(null);
      }
    } catch (err) {
      console.error('Error fetching farm:', err);
    } finally {
      setFetchingFarm(false);
    }
  };

  const fetchMyOrders = async () => {
    try {
      const res = await fetch(`${API_BASE}/orders/my-orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFarmerOrders(data.orders || []);
      }
    } catch (err) {
      console.error('Error fetching farmer orders:', err);
    }
  };

  const fetchFarmReviews = async (farmId) => {
    try {
      let res = await fetch(`${API_BASE}/farms/${farmId}/reviews`);
      if (!res.ok) {
        res = await fetch(`${API_BASE}/reviews/farms/${farmId}/reviews`);
      }
      if (res.ok) {
        const data = await res.json();
        setReviewsData({
          average_rating: data.average_rating || 0,
          total_reviews: data.total_reviews || 0,
          reviews: data.reviews || []
        });
      }
    } catch (err) {
      console.error('Error fetching farm reviews:', err);
    }
  };

  const handleCreateFarm = async (e) => {
    e.preventDefault();
    setError('');
    setCreatingFarm(true);
    try {
      const res = await fetch(`${API_BASE}/farms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ farm_name: farmName, state, city, address })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to register farm');
      setFarm(data.farm);
      setSuccess('Farm storefront registered successfully!');
      fetchFarmReviews(data.farm.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingFarm(false);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setError('');
    setCreatingProduct(true);
    try {
      const res = await fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          farm_id: farm.id,
          name: prodName,
          category: prodCategory,
          price: Number(prodPrice),
          unit: prodUnit,
          quantity_available: Number(prodStock),
          photo_url: prodPhoto || null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add produce listing');
      setSuccess('Produce listing added successfully!');
      setShowAddProduct(false);
      setProdName('');
      setProdPrice('');
      setProdStock('');
      setProdPhoto('');
      fetchMyFarm();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingProduct(false);
    }
  };

  const handleToggleProductStatus = async (productId, currentStatus) => {
    try {
      const res = await fetch(`${API_BASE}/products/${productId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: !currentStatus })
      });
      if (res.ok) {
        fetchMyFarm();
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/products/${editingProduct.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          price: Number(editPrice),
          quantity_available: Number(editStock)
        })
      });
      if (res.ok) {
        setSuccess('Produce listing price & stock updated!');
        setEditingProduct(null);
        fetchMyFarm();
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to update product');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFulfillOrder = async (orderId) => {
    setActionLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/fulfill`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Fulfillment failed');
      setSuccess(`Order #${orderId.slice(0, 8)} marked as dispatched/fulfilled!`);
      fetchMyOrders();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || fetchingFarm || !user) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Loading Seller Portal...</div>;
  }

  return (
    <div style={{ padding: '1rem 0' }}>
      {/* Seller Welcome Header */}
      <div className="card" style={{ marginBottom: '1.5rem', background: '#ffffff', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span className="badge badge-farmer" style={{ marginBottom: '0.5rem' }}>Farmer Seller Portal</span>
            <h1 style={{ fontSize: '1.8rem' }}>Welcome, {user?.name || 'Farmer'}!</h1>
            {farm && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                Storefront: <strong>{farm.farm_name}</strong> | Location: <strong>{farm.city}, {farm.state} State</strong> | Status:{' '}
                <strong style={{ color: farm.verification_status === 'verified' ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
                  {farm.verification_status.toUpperCase()}
                </strong>
              </p>
            )}
          </div>

          {farm && (
            <button onClick={() => setShowAddProduct(!showAddProduct)} className="btn btn-primary">
              {showAddProduct ? 'Cancel' : '+ Add Produce Listing'}
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Seller Metrics Bar */}
      {farm && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Available Farm Balance</span>
                <p style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--accent-green)', margin: '0.2rem 0' }}>
                  ₦{farm.balance ? farm.balance.toLocaleString() : '0'}
                </p>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Released Escrow Payouts</span>
              </div>
              <button
                onClick={() => setShowWithdraw(!showWithdraw)}
                className="btn btn-primary"
                style={{ marginTop: '0.75rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: '100%', justifyContent: 'center' }}
              >
                {showWithdraw ? 'Cancel Withdrawal' : '💸 Withdraw to Bank'}
              </button>
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Active Inventory Listings</span>
              <p style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--accent-blue)', margin: '0.2rem 0' }}>
                {farm.products ? farm.products.length : 0}
              </p>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Catalog Produce Items</span>
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Incoming Buyer Orders</span>
              <p style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--accent-amber)', margin: '0.2rem 0' }}>
                {activeIncomingOrders.length}
              </p>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Active Pending Orders</span>
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Customer Reputation</span>
              <p style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--accent-amber)', margin: '0.2rem 0' }}>
                ⭐ {reviewsData.average_rating > 0 ? reviewsData.average_rating : 'New'}
              </p>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{reviewsData.total_reviews} Verified Reviews</span>
            </div>
          </div>

          {/* Bank Withdrawal Form Modal */}
          {showWithdraw && (
            <div className="card" style={{ marginBottom: '2rem', border: '1px solid var(--accent-green)', background: '#f0fdf4' }}>
              <h3 style={{ marginBottom: '0.5rem', color: 'var(--accent-green)' }}>🏦 Instant Bank Payout Withdrawal</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                Transfer earnings from your <strong>Available Farm Balance (₦{farm.balance ? farm.balance.toLocaleString() : '0'})</strong> directly to your Nigerian commercial bank account via automated NIBSS clearing.
              </p>

              <form onSubmit={handleWithdrawSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Amount to Withdraw (₦)</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="e.g. 50000"
                      min="100"
                      max={farm.balance || 0}
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Select Commercial / Digital Bank</label>
                    <select className="form-control" value={bankName} onChange={(e) => setBankName(e.target.value)}>
                      <option value="First Bank of Nigeria">First Bank of Nigeria</option>
                      <option value="Guaranty Trust Bank (GTBank)">Guaranty Trust Bank (GTBank)</option>
                      <option value="Zenith Bank">Zenith Bank</option>
                      <option value="Access Bank">Access Bank</option>
                      <option value="United Bank for Africa (UBA)">United Bank for Africa (UBA)</option>
                      <option value="Kuda Microfinance Bank">Kuda Microfinance Bank</option>
                      <option value="Moniepoint Microfinance Bank">Moniepoint MFB</option>
                      <option value="OPay Digital Bank">OPay Digital Services</option>
                      <option value="Fidelity Bank">Fidelity Bank</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>10-Digit NUBAN Account Number</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 0123456789"
                      maxLength="10"
                      pattern="\d{10}"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Account Holder Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Aminu Abubakar"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="submit" className="btn btn-primary" disabled={withdrawing}>
                    {withdrawing ? 'Processing Transfer...' : 'Confirm Bank Payout Transfer'}
                  </button>
                  <button type="button" onClick={() => setShowWithdraw(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}

      {/* Case 1: Storefront Setup Form */}
      {!farm && (
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ marginBottom: '0.5rem' }}>Register Your Farm Storefront</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Set up your farm profile to begin listing produce on the marketplace.
          </p>

          <form onSubmit={handleCreateFarm}>
            <div className="form-group">
              <label>Farm Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Aminu Organic Produce Farm"
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>State</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Kano"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>City / LGA</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Wudil"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Physical Address</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. KM 12 Kano-Wudil Express Way"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={creatingFarm}>
              {creatingFarm ? 'Registering Storefront...' : 'Register Farm Storefront'}
            </button>
          </form>
        </div>
      )}

      {/* Add Produce Form */}
      {farm && showAddProduct && (
        <div className="card" style={{ marginBottom: '2rem', border: '1px solid var(--accent-green)' }}>
          <h3 style={{ marginBottom: '1rem' }}>Add New Produce Listing</h3>
          <form onSubmit={handleAddProduct}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Produce Title</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Fresh Yellow Maize"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <select className="form-control" value={prodCategory} onChange={(e) => setProdCategory(e.target.value)}>
                  <option value="Grains">Grains & Cereals</option>
                  <option value="Vegetables">Vegetables</option>
                  <option value="Fruits">Fruits</option>
                  <option value="Tubers">Tubers (Yam/Cassava)</option>
                  <option value="Livestock">Livestock & Poultry</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Price per Unit (₦)</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="e.g. 22000"
                  value={prodPrice}
                  onChange={(e) => setProdPrice(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Selling Unit</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 50kg Bag, Basket, kg"
                  value={prodUnit}
                  onChange={(e) => setProdUnit(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Stock Quantity Available</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="e.g. 25"
                  value={prodStock}
                  onChange={(e) => setProdStock(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Photo URL (Optional)</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. https://images.unsplash.com/photo-1551754655-cd27e38d2076"
                value={prodPhoto}
                onChange={(e) => setProdPhoto(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={creatingProduct}>
              {creatingProduct ? 'Saving Listing...' : 'Publish Produce Listing'}
            </button>
          </form>
        </div>
      )}

      {/* Quick Edit Produce Modal */}
      {editingProduct && (
        <div className="card" style={{ marginBottom: '2rem', border: '1px solid var(--accent-amber)', background: '#fffbeb' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>Edit Listing: {editingProduct.name}</h3>
          <form onSubmit={handleUpdateProduct} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label>Price (₦ / {editingProduct.unit})</label>
              <input
                type="number"
                className="form-control"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label>Available Stock Count</label>
              <input
                type="number"
                className="form-control"
                value={editStock}
                onChange={(e) => setEditStock(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={actionLoading}>Save Changes</button>
            <button type="button" onClick={() => setEditingProduct(null)} className="btn btn-secondary">Cancel</button>
          </form>
        </div>
      )}

      {/* Case 2: Farm Produce Inventory */}
      {farm && (
        <>
          {farm.verification_status !== 'verified' && (
            <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
              ⚠️ <strong>Storefront Pending Verification:</strong> Your farm storefront is currently awaiting admin verification. Per platform safety rules, your produce listings will automatically appear in public searches once approved.
            </div>
          )}

          {/* Incoming Sales Orders Section */}
          <div className="card" style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                📦 Incoming Sales Orders & Dispatch Queue
              </h3>

              {/* Filter Tabs */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setOrderTab('active')}
                  className={`btn ${orderTab === 'active' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                >
                  ⚡ Active Pending ({activeIncomingOrders.length})
                </button>
                <button
                  onClick={() => setOrderTab('completed')}
                  className={`btn ${orderTab === 'completed' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                >
                  ✅ Completed Payouts ({completedOrders.length})
                </button>
                <button
                  onClick={() => setOrderTab('all')}
                  className={`btn ${orderTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                >
                  📋 All ({farmerOrders.length})
                </button>
              </div>
            </div>

            {displayedOrders.length > 0 ? (
              <div style={{ width: '100%', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '0.75rem 0' }}>Order ID</th>
                      <th>Buyer</th>
                      <th>Items Ordered</th>
                      <th>Total Amount</th>
                      <th>Payment State</th>
                      <th>Order Status</th>
                      <th style={{ textAlign: 'right' }}>Dispatch Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedOrders.map((ord) => (
                      <tr key={ord.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.75rem 0', fontWeight: 'bold' }}>#{ord.id.slice(0, 8)}</td>
                        <td>
                          <strong>{ord.buyer?.name}</strong>
                          {ord.buyer?.phone && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              📞 <a href={`tel:${ord.buyer.phone}`} style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>{ord.buyer.phone}</a>
                            </div>
                          )}
                        </td>
                        <td>
                          {ord.orderItems?.map(i => `${i.product?.name || 'Produce'} (x${i.quantity})`).join(', ')}
                        </td>
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
                          {ord.status === 'paid' && (
                            <button
                              onClick={() => handleFulfillOrder(ord.id)}
                              className="btn btn-primary"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                              disabled={actionLoading}
                            >
                              Dispatch Order
                            </button>
                          )}
                          <Link href={`/orders/${ord.id}`} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                            View →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)' }}>
                {orderTab === 'active'
                  ? 'No active pending buyer orders requiring dispatch right now.'
                  : orderTab === 'completed'
                  ? 'No completed payout orders recorded yet.'
                  : 'No buyer orders received for your farm produce yet.'}
              </p>
            )}
          </div>

          {/* Produce Inventory Management Section */}
          <div style={{ marginBottom: '2.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Produce Inventory Catalog</h3>

            {farm.products && farm.products.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {farm.products.map((p) => (
                  <div key={p.id} className="card" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <span className="badge badge-farmer">{p.category}</span>
                      <span style={{ fontSize: '0.8rem', color: p.is_active ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                        ● {p.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{p.name}</h4>
                    <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--accent-green)', margin: '0.4rem 0' }}>
                      ₦{p.price.toLocaleString()} <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>/ {p.unit}</span>
                    </p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                      Stock Available: <strong>{p.quantity_available} units</strong>
                    </p>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => {
                          setEditingProduct(p);
                          setEditPrice(p.price);
                          setEditStock(p.quantity_available);
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', flex: 1, justifyContent: 'center' }}
                      >
                        Edit Price/Stock
                      </button>
                      <button
                        onClick={() => handleToggleProductStatus(p.id, p.is_active)}
                        className={`btn ${p.is_active ? 'btn-danger' : 'btn-primary'}`}
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', flex: 1, justifyContent: 'center' }}
                      >
                        {p.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
                <p style={{ color: 'var(--text-secondary)' }}>You haven't listed any produce yet.</p>
                <button onClick={() => setShowAddProduct(true)} className="btn btn-primary" style={{ marginTop: '1rem' }}>
                  + List Your First Produce
                </button>
              </div>
            )}
          </div>

          {/* Financial Transactions & Bank Payout Ledger */}
          <div className="card" style={{ marginBottom: '2.5rem' }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              💳 Financial Ledger & Bank Payout History
            </h3>

            {farm.transactions && farm.transactions.length > 0 ? (
              <div style={{ width: '100%', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '0.75rem 0' }}>Date</th>
                      <th>Transaction Type</th>
                      <th>Description</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {farm.transactions.map((tx) => (
                      <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.75rem 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          {new Date(tx.created_at).toLocaleString()}
                        </td>
                        <td>
                          <span className={`badge badge-${tx.type === 'credit' ? 'farmer' : 'admin'}`} style={{ fontSize: '0.75rem' }}>
                            {tx.type.toUpperCase()}
                          </span>
                        </td>
                        <td>{tx.description}</td>
                        <td style={{
                          textAlign: 'right',
                          fontWeight: 'bold',
                          color: tx.type === 'credit' ? 'var(--accent-green)' : 'var(--accent-red)'
                        }}>
                          {tx.type === 'credit' ? '+' : '-'}₦{tx.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)' }}>No financial transactions or bank payouts recorded yet.</p>
            )}
          </div>

          {/* Customer Reviews & Reputation Section */}
          <div className="card">
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ⭐ Verified Customer Reviews & Rating ({reviewsData.average_rating} / 5.0)
            </h3>

            {reviewsData.reviews && reviewsData.reviews.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {reviewsData.reviews.map((rev) => (
                  <div key={rev.id} style={{ padding: '0.75rem', background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <strong>{rev.reviewer?.name || 'Verified Buyer'}</strong>
                      <span style={{ color: 'var(--accent-amber)', fontWeight: 'bold' }}>
                        {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)} ({rev.rating}/5)
                      </span>
                    </div>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>"{rev.comment}"</p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)' }}>No customer reviews received yet. Reviews unlock after buyers complete orders.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
