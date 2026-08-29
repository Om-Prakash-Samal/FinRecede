'use client';

export default function KPICard({ label, value, subtext, icon: Icon, variant = 'gold' }) {
  return (
    <div className={`kpi-card ${variant}`}>
      <div className="kpi-icon">
        {Icon && <Icon size={22} />}
      </div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value animate-in">{value}</div>
      {subtext && <div className="kpi-sub">{subtext}</div>}
    </div>
  );
}
