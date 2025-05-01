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
    { label: 'Product Name', name: 'product_name', autoFocus: true, defaultValue: product.product_name },
    { label: 'Price', name: 'price', type: 'number', defaultValue: product.price?.toString() || '' },
    { label: 'Category', name: 'category_id', options: productCategories, defaultValue: product.category_id.toString() },
    { label: 'Product Photo', name: 'productPhoto', isFile: true, multiple: false },
    { label: 'Product Description', name: 'productDescription', defaultValue: product.productDescription || '' },
    { label: 'Enable E-Commerce', name: 'isEcommerce', type: 'checkbox', defaultValue: product.isEcommerce.toString() },
    { label: 'Order', name: 'order', type: 'number', defaultValue: product.order.toString() || '0' },
    { label: 'Active', name: 'isActive', type: 'checkbox', defaultValue: product.isActive.toString() },
  ];

  return (
    <AddDataPopup
      open={open}
      onClose={onClose}
      onSubmit={onSubmit}
      title="Edit Product"
      fields={fields}
    />
  );
};

export default EditProductPopup;
