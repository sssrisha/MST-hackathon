import React from 'react';
import { useParams } from 'react-router-dom';
import Placeholder from '../components/ui/Placeholder.jsx';

export function RevealBidPage() {
  const { id } = useParams();

  return (
    <Placeholder
      title={`Reveal Bid (${id || 'T001'})`}
      description="Disclose original bid value and salt to mathematically verify commitment against the tamper-evident record."
    />
  );
}

export default RevealBidPage;
