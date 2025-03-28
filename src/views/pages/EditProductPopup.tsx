// src/views/pages/session/EditProductPopup.tsx
import React from 'react';
import AddDataPopup, { PopupField } from './AddDataPopup';
import { Product } from './ProductTreeView';

interface EditProductPopupProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  product: Product;
  productCategories: { value: number; label: string }[];
}

const EditProductPopup: React.FC<EditProductPopupProps> = ({ open, onClose, onSubmit, product, productCategories }) => {
  const fields: PopupField[] = [
    { label: 'Product Name', name: 'product_name', autoFocus: true },
    { label: 'Price', name: 'price', type: 'number' },
    { label: 'Category', name: 'category_id', options: productCategories }
  ];

  // تأكيد ملء الحقول الافتراضية بناءً على المنتج المحدد
  const preFilledFields = fields.map(field => ({
    ...field,
    defaultValue: product ? `${product[field.name as keyof Product]}` : ''
}));

  return (
    <AddDataPopup
      open={open}
      onClose={onClose}
      onSubmit={onSubmit}
      title="Edit Product"
      fields={preFilledFields}
    />
  );
};

export default EditProductPopup;
