import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Placeholder from '../components/ui/Placeholder.jsx';
import * as riskService from '../services/riskService.js';

export function RiskAnalysisPage() {
  const { id } = useParams();
  const tenderId = id || 'T002';
  const [report, setReport] = useState(null);

  useEffect(() => {
    riskService.getRiskReport(tenderId).then((r) => {
      setReport(r);
    });
  }, [tenderId]);

  return (
    <Placeholder
      title={`AI Risk Analysis (${tenderId})`}
      description="Inspect statistical bid anomaly signals, price clustering correlations, and AI-driven risk assessment flags."
      data={report}
    />
  );
}

export default RiskAnalysisPage;
