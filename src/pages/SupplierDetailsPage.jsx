import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Placeholder from '../components/ui/Placeholder.jsx';
import * as supplierRegistry from '../services/supplierRegistry.js';

export function SupplierDetailsPage() {
  const { id } = useParams();
  const [supplier, setSupplier] = useState(null);

  useEffect(() => {
    supplierRegistry.getSupplier(id || 'TG-1042').then((sup) => {
      setSupplier(sup);
    });
  }, [id]);

  return (
    <Placeholder
      title={`Supplier Profile: ${supplier?.name || id || 'TG-1042'}`}
      description="Verifiable reputation index, completed contracts, average performance ratings, and escrow performance bonds."
      data={supplier}
    />
  );
}

export default SupplierDetailsPage;
