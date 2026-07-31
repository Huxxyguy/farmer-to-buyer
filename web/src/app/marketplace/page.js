'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const API_BASE = 'http://localhost:5000/api/v1';

export default function MarketplacePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [stateFilter, setStateFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  useEffect(() => {
    fetchProducts();
  }, [stateFilter, categoryFilter]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (stateFilter) params.append('state', stateFilter);
      if (cityFilter) params.append('city', cityFilter);
      if (categoryFilter) params.append('category', categoryFilter);
      if (searchQuery) params.append('search', searchQuery);
      if (minPrice) params.append('min_price', minPrice);
      if (maxPrice) params.append('max_price', maxPrice);

      const res = await fetch(`${API_BASE}/products?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error('Error fetching marketplace produce:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProducts();
  };

  return (
    <div style={{ padding: '1.5rem 0' }}>
      {/* Hero Header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Farm Produce Marketplace
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
          Direct farm-gate pricing from verified Nigerian farmers. Filter by State, City, and Category.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <form onSubmit={handleSearchSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', alignItems: 'end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>State Location</label>
              <select className="form-control" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
                <option value="">All States</option>
                <option value="Kano">Kano</option>
                <option value="Kaduna">Kaduna</option>
                <option value="Jigawa">Jigawa</option>
                <option value="Plateau">Plateau</option>
                <option value="Benue">Benue</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>City / LGA</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Wudil"
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Category</label>
              <select className="form-control" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="">All Categories</option>
                <option value="Grains">Grains & Cereals</option>
                <option value="Vegetables">Vegetables</option>
                <option value="Fruits">Fruits</option>
                <option value="Tubers">Tubers</option>
                <option value="Livestock">Livestock</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Search Keyword</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Rice, Maize"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ height: '42px', justifyContent: 'center' }}>
              Filter Produce
            </button>
          </div>
        </form>
      </div>

      {/* Produce Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading marketplace listings...</div>
      ) : products.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {products.map((p) => (
            <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                {/* Produce Image or Placeholder */}
                <div style={{ width: '100%', height: '160px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '1rem', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {p.photo_url ? (
                    <img src={p.photo_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '3rem' }}>🌾</span>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span className="badge badge-farmer">{p.category}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    📍 {p.farm.city}, {p.farm.state}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>{p.name}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  Farm: <strong>{p.farm.farm_name}</strong>
                </p>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '0.75rem 0' }}>
                  <span style={{ fontSize: '1.35rem', fontWeight: 'bold', color: 'var(--accent-green)' }}>
                    ₦{p.price.toLocaleString()}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>/ {p.unit}</span>
                </div>

                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Stock Available: <strong>{p.quantity_available} units</strong>
                </p>

                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  Add to Order Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <h3>No Produce Found</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            No verified produce listings match your selected filter criteria. Try resetting filters.
          </p>
          <button
            onClick={() => {
              setStateFilter('');
              setCityFilter('');
              setCategoryFilter('');
              setSearchQuery('');
              setMinPrice('');
              setMaxPrice('');
            }}
            className="btn btn-secondary"
            style={{ marginTop: '1rem' }}
          >
            Reset All Filters
          </button>
        </div>
      )}
    </div>
  );
}
