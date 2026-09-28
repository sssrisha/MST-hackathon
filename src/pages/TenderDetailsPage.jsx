import React from 'react';
import { useParams } from 'react-router-dom';
import Placeholder from '../components/ui/Placeholder.jsx';

export function TenderDetailsPage() {
  const { id } = useParams();

  return (
    <Placeholder
      title={`Tender Details (${id || 'T001'})`}
      description="View tender specifications, timeline, registered bidder commitments, and current lifecycle state."
    />
  );
}

export default TenderDetailsPage;
