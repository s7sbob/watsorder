// src/views/pages/session/EditCategoryPopup.tsx
import React from 'react';
import AddDataPopup, { PopupField } from './AddDataPopup';
import { Category } from './CategoryList';

interface EditCategoryPopupProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  category: Category;
}

const EditCategoryPopup: React.FC<EditCategoryPopupProps> = ({ open, onClose, onSubmit, category }) => {
  const fields: PopupField[] = [
    { label: 'Category Name', name: 'category_name', autoFocus: true }
  ];

  const preFilledFields = fields.map(field => ({
    ...field,
    defaultValue: category ? `${category[field.name as keyof Category]}` : ''
  }));

  return (
    <AddDataPopup
      open={open}
      onClose={onClose}
      onSubmit={onSubmit}
      title="Edit Category"
      fields={preFilledFields}
    />
  );
};

export default EditCategoryPopup;
