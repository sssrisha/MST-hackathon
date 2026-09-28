import React, { useEffect, useState } from 'react';
import Placeholder from '../components/ui/Placeholder.jsx';
import * as supplierRegistry from '../services/supplierRegistry.js';

export function SuppliersListPage() {
  const [suppliers, setSuppliers] = useState(null);

  useEffect(() => {
    supplierRegistry.getSuppliers().then((list) => {
      setSuppliers({
        totalVerifiedSuppliers: list.length,
        suppliers: list
      });
    });
  }, []);

  return (
    <Placeholder
      title="Verified Supplier Registry"
      description="Verifiable on-chain supplier profiles, reputation metrics, past performance scores, and dispute histories."
      data={suppliers}
    />
  );
}

export default SuppliersListPage;
