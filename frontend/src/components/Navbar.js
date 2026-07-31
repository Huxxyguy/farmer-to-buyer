'use client';

import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const getDashboardLink = () => {
    if (!user) return '/login';
    if (user.role === 'farmer') return '/farmer/dashboard';
    if (user.role === 'buyer') return '/buyer/dashboard';
    if (user.role === 'admin') return '/admin/dashboard';
    return '/';
  };

  return (
    <nav className="navbar">
      <Link href="/" className="brand">
        <div className="brand-icon">🌱</div>
        <span>FarmDirect NG</span>
      </Link>

      <div className="nav-links">
        {user ? (
          <>
            <span className={`badge badge-${user.role}`}>
              {user.role}
            </span>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              {user.name}
            </span>
            <Link href={getDashboardLink()} className="btn btn-secondary">
              Dashboard
            </Link>
            <button onClick={handleLogout} className="btn btn-danger">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="btn btn-secondary">
              Login
            </Link>
            <Link href="/register" className="btn btn-primary">
              Get Started
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
