'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function RegisterForm() {
  const { register, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [role, setRole] = useState('farmer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const paramRole = searchParams.get('role');
    if (paramRole === 'farmer' || paramRole === 'buyer') {
      setRole(paramRole);
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      if (user.role === 'farmer') router.push('/farmer/dashboard');
      else if (user.role === 'buyer') router.push('/buyer/dashboard');
      else if (user.role === 'admin') router.push('/admin/dashboard');
    }
  }, [user, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setSubmitting(true);
    try {
      const newUser = await register({ name, email, phone, password, role });
      if (newUser.role === 'farmer') router.push('/farmer/dashboard');
      else router.push('/buyer/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '480px', margin: '2rem auto' }}>
      <div className="card">
        <h2 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Create Account</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Select your platform role to get started
        </p>

        {error && <div className="alert alert-danger">{error}</div>}

        <div className="role-selector">
          <div
            className={`role-card ${role === 'farmer' ? 'active' : ''}`}
            onClick={() => setRole('farmer')}
          >
            <div style={{ fontSize: '1.5rem' }}>🌾</div>
            <strong>Farmer</strong>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Sell Produce</p>
          </div>

          <div
            className={`role-card ${role === 'buyer' ? 'active' : ''}`}
            onClick={() => setRole('buyer')}
          >
            <div style={{ fontSize: '1.5rem' }}>🛒</div>
            <strong>Buyer</strong>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Buy Fresh Produce</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Musa Ibrahim"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              className="form-control"
              placeholder="e.g. musa@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="tel"
              className="form-control"
              placeholder="e.g. +2348012345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
            disabled={submitting}
          >
            {submitting ? 'Creating Account...' : `Register as ${role === 'farmer' ? 'Farmer' : 'Buyer'}`}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Already have an account? <Link href="/login" style={{ color: 'var(--accent-blue)' }}>Login here</Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Loading form...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
