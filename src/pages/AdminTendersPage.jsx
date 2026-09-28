import React, { useEffect, useState } from 'react';
import Placeholder from '../components/ui/Placeholder.jsx';
import * as tenderService from '../services/tenderService.js';

export function AdminTendersPage() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    tenderService.getTenders().then((tenders) => {
      setSummary({ totalTenders: tenders.length, list: tenders.map(t => ({ id: t.id, title: t.title, status: t.status })) });
    });
  }, []);

  return (
    <Placeholder
      title="Admin Tender Management"
      description="Manage all organizational tenders, publish new requests for proposals, and track real-time contractor bidding."
      data={summary}
    />
  );
}

export default AdminTendersPage;
