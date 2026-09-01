'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Stethoscope, 
  ShieldCheck, 
  ReceiptIndianRupee, 
  Activity, 
  Layers
} from 'lucide-react';

import Image from 'next/image';

const NAV_ITEMS = [
  { name: 'Executive Overview', href: '/', icon: LayoutDashboard },
  { name: 'Root Cause Diagnostics', href: '/diagnostics', icon: Stethoscope },
  { name: 'Audit & Compliance', href: '/audit', icon: ShieldCheck },
  { name: 'B2B Receivables', href: '/receivables', icon: ReceiptIndianRupee },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside style={{
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      width: 'var(--sidebar-width)',
      background: 'var(--bg-sidebar)',
      backdropFilter: 'var(--glass-blur-heavy)',
      WebkitBackdropFilter: 'var(--glass-blur-heavy)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 50,
      padding: '24px 16px',
    }}>
      {/* Brand Logo */}
      <div style={{ padding: '0 8px 24px 8px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            overflow: 'hidden',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(59, 130, 246, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            flexShrink: 0,
            padding: '2px',
          }}>
            <Image
              src="/logo.png"
              alt="FinRecede Logo"
              width={36}
              height={36}
              style={{ objectFit: 'contain', width: '100%', height: '100%' }}
              priority
            />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.18rem', letterSpacing: '-0.02em', color: '#fff' }}>
              Fin<span style={{ color: 'var(--gold)' }}>Recede</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              AI Recovery Agent
            </div>
          </div>
        </div>
      </div>

      {/* Nav Links */}
      <nav style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: '10px',
                fontSize: '0.85rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#fff' : 'var(--text-secondary)',
                background: isActive ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
                border: isActive ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid transparent',
                transition: 'all var(--transition-fast)',
              }}
            >
              <Icon size={18} color={isActive ? 'var(--gold)' : 'currentColor'} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* System Status Footer */}
      <div style={{
        padding: '14px',
        borderRadius: '12px',
        background: 'rgba(15, 23, 42, 0.5)',
        border: '1px solid var(--border-subtle)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Agent Core</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: 'var(--success)' }}>
            <span className="live-dot" /> Active
          </span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          State Machine: <strong style={{ color: '#fff' }}>v2.4 Ready</strong>
        </div>
      </div>
    </aside>
  );
}
