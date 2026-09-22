'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_BASE = 'http://localhost:5000/api/v1';

export default function MarketplacePage() {
  const { user, token, logout } = useAuth();
  const router = useRouter();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [stateFilter, setStateFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Shopping Cart state: { [productId]: { product, quantity } }
  const [cart, setCart] = useState({});
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  // Delivery Checkout Form state
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryState, setDeliveryState] = useState('Kano');
  const [deliveryCity, setDeliveryCity] = useState('Kano');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [orderSuccess, setOrderSuccess] = useState('');

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

  const addToCart = (product) => {
    setCart((prev) => {
      const currentQty = prev[product.id] ? prev[product.id].quantity : 0;
      if (currentQty >= product.quantity_available) return prev;
      return {
        ...prev,
        [product.id]: {
          product,
          quantity: currentQty + 1
        }
      };
    });
  };

  const removeFromCart = (productId) => {
    setCart((prev) => {
      const updated = { ...prev };
      if (updated[productId]) {
        if (updated[productId].quantity > 1) {
          updated[productId].quantity -= 1;
        } else {
          delete updated[productId];
        }
      }
      return updated;
    });
  };

  const cartItems = Object.values(cart);
  const cartTotal = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    setOrderError('');
    setOrderSuccess('');

    if (!user || !token) {
      router.push('/login');
      return;
    }

    if (user.role !== 'buyer') {
      setOrderError('Only registered Buyer accounts can place orders. Please switch to a Buyer account.');
      return;
    }

    if (cartItems.length === 0) {
      setOrderError('Your cart is empty.');
      return;
    }

    setPlacingOrder(true);
    try {
      // 1. Create Order
      const itemsPayload = cartItems.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity
      }));

      const orderRes = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          items: itemsPayload,
          delivery_address: deliveryAddress,
          delivery_state: deliveryState,
          delivery_city: deliveryCity
        })
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        if (orderRes.status === 401) {
          logout?.();
          throw new Error('Your session has expired. Please log in again to place your order.');
        }
        throw new Error(orderData.message || 'Order creation failed');
      }

      const createdOrder = orderData.order;

      // 2. Initialize Paystack Escrow Payment
      const payRes = await fetch(`${API_BASE}/orders/${createdOrder.id}/pay`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const payData = await payRes.json();
      if (!payRes.ok) {
        if (payRes.status === 401) {
          logout?.();
          throw new Error('Your session has expired. Please log in again.');
        }
        throw new Error(payData.message || 'Payment initialization failed');
      }

      setOrderSuccess(`Order #${createdOrder.id.slice(0, 8)} created! Redirecting to Paystack Checkout...`);
      setCart({});
      
      // Redirect to Paystack Checkout URL
      setTimeout(() => {
        window.location.href = payData.authorization_url;
      }, 1500);

    } catch (err) {
      setOrderError(err.message);
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem 0' }}>
      {/* Floating Cart Indicator Banner */}
      {cartCount > 0 && (
        <div style={{
          position: 'sticky',
          top: '80px',
          zIndex: 100,
          background: '#ffffff',
          padding: '1rem 1.5rem',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-main)',
          border: '1px solid var(--accent-green)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🛒</span>
            <div>
              <strong style={{ color: 'var(--accent-green)', fontSize: '1.1rem' }}>
                {cartCount} Produce Item(s) in Cart
              </strong>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Subtotal: <strong style={{ color: 'var(--text-primary)' }}>₦{cartTotal.toLocaleString()}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowCheckoutModal(true)}
            className="btn btn-primary"
            style={{ fontSize: '1rem', padding: '0.6rem 1.5rem' }}
          >
            Proceed to Checkout (₦{cartTotal.toLocaleString()}) →
          </button>
        </div>
      )}

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
          {products.map((p) => {
            const cartQuantity = cart[p.id] ? cart[p.id].quantity : 0;

            return (
              <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ width: '100%', height: '160px', background: '#f1f5f9', borderRadius: 'var(--radius-md)', marginBottom: '1rem', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)' }}>
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

                  {cartQuantity > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', background: '#f8fafc', border: '1px solid var(--border-color)', padding: '0.4rem', borderRadius: 'var(--radius-md)' }}>
                      <button onClick={() => removeFromCart(p.id)} className="btn btn-secondary" style={{ padding: '0.3rem 0.8rem' }}>
                        -
                      </button>
                      <span style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>
                        {cartQuantity} in Cart
                      </span>
                      <button onClick={() => addToCart(p)} className="btn btn-primary" style={{ padding: '0.3rem 0.8rem' }} disabled={cartQuantity >= p.quantity_available}>
                        +
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => addToCart(p)} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                      Add to Order Cart
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <h3>No Produce Found</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            No verified produce listings match your selected filter criteria.
          </p>
        </div>
      )}

      {/* Checkout Drawer / Modal */}
      {showCheckoutModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: '520px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.4rem' }}>Checkout & Delivery Information</h2>
              <button onClick={() => setShowCheckoutModal(false)} className="btn btn-secondary" style={{ padding: '0.2rem 0.6rem' }}>
                ✕
              </button>
            </div>

            {orderError && <div className="alert alert-danger">{orderError}</div>}
            {orderSuccess && <div className="alert alert-success">{orderSuccess}</div>}

            {/* Cart Summary List */}
            <div style={{ marginBottom: '1.5rem', background: '#f8fafc', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <h4 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>Order Cart Summary</h4>
              {cartItems.map((item) => (
                <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  <span>{item.product.name} ({item.quantity}x)</span>
                  <strong style={{ color: 'var(--accent-green)' }}>
                    ₦{(item.product.price * item.quantity).toLocaleString()}
                  </strong>
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                <span>Total Amount Due:</span>
                <span style={{ color: 'var(--accent-green)', fontSize: '1.2rem' }}>
                  ₦{cartTotal.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Delivery Shipping Address Form */}
            <form onSubmit={handleCheckoutSubmit}>
              <div className="form-group">
                <label>Delivery Address</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. No 14 Zoo Road, Kano"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Delivery State</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Kano"
                    value={deliveryState}
                    onChange={(e) => setDeliveryState(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Delivery City / LGA</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Kano City"
                    value={deliveryCity}
                    onChange={(e) => setDeliveryCity(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCheckoutModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 2, justifyContent: 'center' }}
                  disabled={placingOrder}
                >
                  {placingOrder ? 'Processing Payment...' : `Pay ₦${cartTotal.toLocaleString()} via Paystack`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
