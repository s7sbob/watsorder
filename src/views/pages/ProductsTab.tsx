// src/views/pages/session/ProductsTab.tsx
import React, { useState } from 'react';
import { Box, Button } from '@mui/material';
import ProductTreeView, { SelectedItem } from './ProductTreeView';
import AddDataPopup from './AddDataPopup';
import EditProductPopup from './EditProductPopup';
import axiosServices from 'src/utils/axios';
import { useTranslation } from 'react-i18next';

interface ProductsTabProps {
  sessionId: number;
}

const ProductsTab: React.FC<ProductsTabProps> = ({ sessionId }) => {
  const { t } = useTranslation();
  const [openAddPopup, setOpenAddPopup] = useState(false);
  const [openEditPopup, setOpenEditPopup] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SelectedItem>(null);
  const [productCategories, setProductCategories] = useState<{ value: number; label: string }[]>([]);
  const [refresh, setRefresh] = useState(false);
  const [lastCategoryId, setLastCategoryId] = useState<number | null>(null);

  const handleOpenAddProduct = async () => {
    try {
      const response = await axiosServices.get(`/api/sessions/${sessionId}/categories`);
      const cats = response.data.map((c: any) => ({ value: c.id, label: c.category_name }));
      setProductCategories(cats);
      setOpenAddPopup(true);
    } catch (error) {
      alert(t('ProductsTab.errorFetchingCategories'));
    }
  };

  const handleAddProduct = async (data: any) => {
    try {
      await axiosServices.post(`/api/sessions/${sessionId}/product`, data);
      setOpenAddPopup(false);
      setRefresh(!refresh);
      if (data.category_id) {
        setLastCategoryId(Number(data.category_id));
      }
    } catch (error) {
      alert(t('ProductsTab.errorAddingProduct'));
    }
  };

  const handleEditProduct = (item: SelectedItem) => {
    if (item && item.type === 'product') {
      setSelectedItem(item);
      setOpenEditPopup(true);
    } else {
      alert(t('ProductsTab.selectProductToEdit') || 'Please select a product to edit.');
    }
  };

  const handleDeleteProduct = async (item: SelectedItem) => {
    if (item && item.type === 'product') {
      try {
        await axiosServices.post(`/api/sessions/${sessionId}/product/${item.data.id}/delete`);
        setRefresh(!refresh);
      } catch (error) {
        alert(t('ProductsTab.errorDeletingProduct'));
      }
    }
  };

  const handleUpdateProduct = async (data: any) => {
    if (selectedItem && selectedItem.type === 'product') {
      try {
        await axiosServices.post(`/api/sessions/${sessionId}/product/${selectedItem.data.id}/update`, data);
        setOpenEditPopup(false);
        setSelectedItem(null);
        setRefresh(!refresh);
      } catch (error) {
        alert(t('ProductsTab.errorUpdatingProduct'));
      }
    }
  };

  return (
    <Box>
      <Button variant="contained" onClick={handleOpenAddProduct} sx={{ mb: 2 }}>
        {t('ProductsTab.buttons.addProduct')}
      </Button>
      <ProductTreeView
        sessionId={sessionId}
        key={refresh ? 'refresh' : 'no-refresh'}
        onEdit={handleEditProduct}
        onDelete={handleDeleteProduct}
      />
      <AddDataPopup
        open={openAddPopup}
        onClose={() => setOpenAddPopup(false)}
        onSubmit={handleAddProduct}
        title={t('ProductsTab.popup.title')}
        fields={[
          {
            label: t('ProductsTab.popup.fields.productName'),
            name: 'product_name',
            autoFocus: true,
            style: { display: 'inline-block', width: '48%', marginRight: '4%' },
          },
          {
            label: t('ProductsTab.popup.fields.price'),
            name: 'price',
            type: 'number',
            style: { display: 'inline-block', width: '48%' },
          },
          {
            label: t('ProductsTab.popup.fields.category'),
            name: 'category_id',
            options: productCategories,
            defaultValue: lastCategoryId ? lastCategoryId.toString() : '',
            style: { marginTop: '16px' },
          },
        ]}
      />
      {openEditPopup && selectedItem && selectedItem.type === 'product' && (
        <EditProductPopup
          open={openEditPopup}
          onClose={() => { setOpenEditPopup(false); setSelectedItem(null); }}
          onSubmit={handleUpdateProduct}
          product={selectedItem.data}
          productCategories={productCategories}
        />
      )}
    </Box>
  );
};

export default ProductsTab;
