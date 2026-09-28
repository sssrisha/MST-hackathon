import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Placeholder from '../components/ui/Placeholder.jsx';
import * as tenderService from '../services/tenderService.js';

export function DecisionReportPage() {
  const { id } = useParams();
  const tenderId = id || 'T001';
  const [decision, setDecision] = useState(null);

  useEffect(() => {
    tenderService.getDecisionReport(tenderId).then((report) => {
      setDecision(report);
    });
  }, [tenderId]);

  return (
    <Placeholder
      title={`Explainable Decision Report (${tenderId})`}
      description="Inspect deterministic multi-criteria scoring breakdowns, factor weights, and verifiable ranking rationale."
      data={decision}
    />
  );
}

export default DecisionReportPage;
