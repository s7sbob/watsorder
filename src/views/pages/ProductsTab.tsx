import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await axiosServices.get(`/api/sessions/${sessionId}/categories`);
        const cats = response.data.map((c: any) => ({ value: c.id, label: c.category_name }));
        setProductCategories(cats);
      } catch (error) {
        console.error('Error fetching categories', error);
      }
    };
    if (sessionId) loadCategories();
  }, [sessionId]);

  const handleOpenAddProduct = () => setOpenAddPopup(true);

  const handleAddProduct = async (data: any) => {
    try {
      if (data.isActive === undefined) data.isActive = true;
      if (data.order === undefined) data.order = 0;
      // إذا كانت هناك صورة، يتم إرسال البيانات كـ FormData
      const formData = new FormData();
      for (const key in data) {
        if (key === 'productPhoto' && data[key]) {
          formData.append(key, data[key]);
        } else {
          formData.append(key, data[key].toString());
        }
      }
      await axiosServices.post(`/api/sessions/${sessionId}/product`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setOpenAddPopup(false);
      setRefresh(prev => !prev);
      if (data.category_id) setLastCategoryId(Number(data.category_id));
    } catch {
      alert(t('ProductsTab.errorAddingProduct'));
    }
  };  

  const handleEditProduct = async (item: SelectedItem) => {
    if (item?.type === 'product') {
      if (!productCategories.length) {
        try {
          const response = await axiosServices.get(`/api/sessions/${sessionId}/categories`);
          const cats = response.data.map((c: any) => ({ value: c.id, label: c.category_name }));
          setProductCategories(cats);
        } catch {
          alert(t('ProductsTab.errorFetchingCategories'));
          return;
        }
      }
      setSelectedItem(item);
      setOpenEditPopup(true);
    } else {
      alert(t('ProductsTab.selectProductToEdit'));
    }
  };

  const handleDeleteProduct = async (item: SelectedItem) => {
    if (item?.type === 'product') {
      try {
        await axiosServices.post(`/api/sessions/${sessionId}/product/${item.data.id}/delete`);
        setRefresh(prev => !prev);
      } catch {
        alert(t('ProductsTab.errorDeletingProduct'));
      }
    }
  };

  const handleUpdateProduct = async (data: any) => {
    if (selectedItem?.type === 'product') {
      try {
        if (data.isActive === undefined) data.isActive = true;
        if (data.order === undefined) data.order = selectedItem.data.order || 0;
        // إذا كانت هناك صورة، يتم إرسال البيانات كـ FormData
        const formData = new FormData();
        for (const key in data) {
          if (key === 'productPhoto' && data[key]) {
            // if data.productPhoto is FileList, take the first item
            formData.append(key, Array.isArray(data[key]) ? data[key][0] : data[key]);
          } else {
            formData.append(key, data[key]);
          }
        }
        await axiosServices.post(
          `/api/sessions/${sessionId}/product/${selectedItem.data.id}/update`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );
        setOpenEditPopup(false);
        setSelectedItem(null);
        setRefresh(prev => !prev);
      } catch (error) {
        console.error('Error updating product:', error);
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
          {
            label: t('ProductsTab.popup.fields.productPhoto'),
            name: 'productPhoto',
            isFile: true,
            multiple: false,
            style: { marginTop: '16px' },
          },
          {
            label: t('ProductsTab.popup.fields.productDescription'),
            name: 'productDescription',
            style: { marginTop: '16px' },
          },
          {
            label: t('ProductsTab.popup.fields.isEcommerce'),
            name: 'isEcommerce',
            type: 'checkbox',
            style: { marginTop: '16px' },
          },
          {
            label: t('ProductsTab.popup.fields.order'),
            name: 'order',
            type: 'number',
            defaultValue: '0',
            style: { marginTop: '16px' },
          },
        ]}
      />

      {openEditPopup && selectedItem?.type === 'product' && (
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
