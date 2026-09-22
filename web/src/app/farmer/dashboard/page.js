'use client';

import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const API_BASE = 'http://localhost:5000/api/v1';

export default function FarmerDashboard() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  const [farm, setFarm] = useState(null);
  const [fetchingFarm, setFetchingFarm] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Storefront Setup Form state
  const [farmName, setFarmName] = useState('');
  const [state, setState] = useState('Kano');
  const [city, setCity] = useState('Wudil');
  const [address, setAddress] = useState('');
  const [creatingFarm, setCreatingFarm] = useState(false);

  // Produce Creation Form state
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('Grains');
  const [prodPrice, setProdPrice] = useState('');
  const [prodUnit, setProdUnit] = useState('50kg Bag');
  const [prodStock, setProdStock] = useState('');
  const [prodPhoto, setProdPhoto] = useState('');
  const [creatingProduct, setCreatingProduct] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'farmer')) {
      router.push('/login');
    } else if (user && token) {
      fetchMyFarm();
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
      } else {
        setFarm(null);
      }
    } catch (err) {
      console.error('Error fetching farm:', err);
    } finally {
      setFetchingFarm(false);
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

  if (loading || fetchingFarm || !user) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Loading storefront data...</div>;
  }

  return (
    <div style={{ padding: '1rem 0' }}>
      {/* Welcome Header */}
      <div className="card" style={{ marginBottom: '1.5rem', background: '#ffffff', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span className="badge badge-farmer" style={{ marginBottom: '0.5rem' }}>Farmer Portal</span>
            <h1 style={{ fontSize: '1.8rem' }}>Welcome, {user?.name || 'Farmer'}!</h1>
            {farm && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                Storefront: <strong>{farm.farm_name}</strong> | Location: <strong>{farm.city}, {farm.state}</strong> | Status:{' '}
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

      {/* Case 1: No Farm Storefront Setup Yet */}
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

      {/* Produce Creation Form Modal / Card */}
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

      {/* Case 2: Active Storefront Overview & Product Inventory List */}
      {farm && (
        <>
          {farm.verification_status !== 'verified' && (
            <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
              ⚠️ <strong>Storefront Pending Verification:</strong> Your farm storefront is currently awaiting admin verification. Per platform safety rules, your produce listings will automatically appear in public searches once approved.
            </div>
          )}

          <h3 style={{ marginBottom: '1rem' }}>Your Active Produce Inventory</h3>

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
                      onClick={() => handleToggleProductStatus(p.id, p.is_active)}
                      className={`btn ${p.is_active ? 'btn-danger' : 'btn-primary'}`}
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
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
        </>
      )}
    </div>
  );
}
