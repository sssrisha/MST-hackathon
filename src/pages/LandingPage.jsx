import React from 'react';
import Placeholder from '../components/ui/Placeholder.jsx';

export function LandingPage() {
  return (
    <div className="py-12 px-6 max-w-5xl mx-auto">
      <Placeholder
        title="OpenTender Platform"
        description="AI-assisted, blockchain-verified public procurement platform. Enforcing fair bidding through cryptographic commitments and tamper-evident audit records."
      />
    </div>
  );
}

export default LandingPage;
