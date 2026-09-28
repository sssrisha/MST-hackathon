import React from 'react';
import { useParams } from 'react-router-dom';
import Placeholder from '../components/ui/Placeholder.jsx';

export function SubmitBidPage() {
  const { id } = useParams();

  return (
    <Placeholder
      title={`Submit Sealed Bid (${id || 'T002'})`}
      description="Submit sealed cryptographic bid commitments with client-side salt hashing before the deadline."
    />
  );
}

export default SubmitBidPage;
