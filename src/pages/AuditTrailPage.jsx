import React from 'react';
import { useParams } from 'react-router-dom';
import Placeholder from '../components/ui/Placeholder.jsx';

export function AuditTrailPage() {
  const { id } = useParams();

  return (
    <Placeholder
      title={`Blockchain Audit Trail (${id || 'T001'})`}
      description="Tamper-evident record of all procurement events, cryptographic commitments, reveals, and state changes."
    />
  );
}

export default AuditTrailPage;
