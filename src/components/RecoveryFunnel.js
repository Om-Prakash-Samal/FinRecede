'use client';

import PlotlyChart from './PlotlyChart';

export default function RecoveryFunnel({ statusCounts }) {
  const detected = statusCounts?.detected || 0;
  const diagnosed = statusCounts?.diagnosed || 0;
  const inRecovery = statusCounts?.in_recovery || 0;
  const recovered = statusCounts?.recovered || 0;
  const escalated = statusCounts?.escalated || 0;
  const paused = statusCounts?.paused || 0;
  const failed = statusCounts?.failed || 0;

  // Sankey node labels:
  // 0: Detected
  // 1: Diagnosed
  // 2: In Recovery
  // 3: Recovered (Success)
  // 4: Escalated (Compliance/Human)
  // 5: Paused / Failed
  const nodes = [
    'Detected Risks', 
    'AI Diagnosed', 
    'Workflow Interventions', 
    'Recovered (Won Back)', 
    'Compliant Escalations', 
    'Paused / Unresolved'
  ];

  // If there's no data yet, provide placeholder demo flows
  const total = detected + diagnosed + inRecovery + recovered + escalated + paused + failed;
  
  const nodeColors = [
    'rgba(59, 130, 246, 0.8)',   // Detected (Blue)
    'rgba(139, 92, 246, 0.8)',  // Diagnosed (Purple)
    'rgba(245, 158, 11, 0.8)',  // In Recovery (Gold)
    'rgba(16, 185, 129, 0.9)',  // Recovered (Emerald)
    'rgba(239, 68, 68, 0.9)',   // Escalated (Red)
    'rgba(100, 116, 139, 0.7)', // Paused / Failed (Gray)
  ];

  const sourceIndices = [];
  const targetIndices = [];
  const linkValues = [];
  const linkColors = [];

  if (total > 0) {
    // Detected -> Diagnosed
    const toDiagnosed = diagnosed + inRecovery + recovered + escalated + paused + failed;
    if (toDiagnosed > 0) {
      sourceIndices.push(0);
      targetIndices.push(1);
      linkValues.push(toDiagnosed);
      linkColors.push('rgba(139, 92, 246, 0.25)');
    }

    // Diagnosed -> In Recovery
    const toRecovery = inRecovery + recovered + escalated;
    if (toRecovery > 0) {
      sourceIndices.push(1);
      targetIndices.push(2);
      linkValues.push(toRecovery);
      linkColors.push('rgba(245, 158, 11, 0.25)');
    }

    // In Recovery -> Recovered
    if (recovered > 0) {
      sourceIndices.push(2);
      targetIndices.push(3);
      linkValues.push(recovered);
      linkColors.push('rgba(16, 185, 129, 0.35)');
    }

    // In Recovery / Diagnosed -> Escalated
    if (escalated > 0) {
      sourceIndices.push(2);
      targetIndices.push(4);
      linkValues.push(escalated);
      linkColors.push('rgba(239, 68, 68, 0.35)');
    }

    // In Recovery / Diagnosed -> Paused/Failed
    if (paused + failed > 0) {
      sourceIndices.push(1);
      targetIndices.push(5);
      linkValues.push(paused + failed);
      linkColors.push('rgba(100, 116, 139, 0.25)');
    }
  }

  const data = [{
    type: 'sankey',
    orientation: 'h',
    node: {
      pad: 18,
      thickness: 20,
      line: {
        color: 'rgba(255, 255, 255, 0.1)',
        width: 1,
      },
      label: nodes,
      color: nodeColors,
    },
    link: {
      source: sourceIndices.length > 0 ? sourceIndices : [0],
      target: targetIndices.length > 0 ? targetIndices : [1],
      value: linkValues.length > 0 ? linkValues : [1],
      color: linkColors.length > 0 ? linkColors : ['rgba(148, 163, 184, 0.1)'],
    },
  }];

  const layout = {
    height: 320,
    margin: { t: 10, r: 10, l: 10, b: 10 },
  };

  return (
    <div style={{ width: '100%', height: '320px' }}>
      <PlotlyChart data={data} layout={layout} />
    </div>
  );
}
