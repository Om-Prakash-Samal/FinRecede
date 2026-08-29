'use client';

import dynamic from 'next/dynamic';

// Dynamically import Plotly with SSR disabled
const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
      <div className="skeleton" style={{ width: '100%', height: '100%' }} />
    </div>
  ),
});

export default function PlotlyChart({ data, layout, config, style }) {
  const defaultLayout = {
    autosize: true,
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: {
      family: 'Inter, sans-serif',
      color: '#94a3b8',
      size: 11,
    },
    margin: { t: 30, r: 20, l: 40, b: 40 },
    xaxis: {
      gridcolor: 'rgba(148, 163, 184, 0.08)',
      zerolinecolor: 'rgba(148, 163, 184, 0.12)',
    },
    yaxis: {
      gridcolor: 'rgba(148, 163, 184, 0.08)',
      zerolinecolor: 'rgba(148, 163, 184, 0.12)',
    },
    ...layout,
  };

  const defaultConfig = {
    responsive: true,
    displayModeBar: false,
    ...config,
  };

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '300px', ...style }}>
      <Plot
        data={data}
        layout={defaultLayout}
        config={defaultConfig}
        useResizeHandler
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
