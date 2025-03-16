import React, { useState } from 'react';
import { Box, Button } from '@mui/material';
import ProductList from './ProductList';
import AddDataPopup from './AddDataPopup';
import axiosServices from 'src/utils/axios';
import { useTranslation } from 'react-i18next';

interface ProductsTabProps {
  sessionId: number;
}

const ProductsTab: React.FC<ProductsTabProps> = ({ sessionId }) => {
  const { t } = useTranslation();
  const [openAddPopup, setOpenAddPopup] = useState(false);
  const [productCategories, setProductCategories] = useState<{ value: number; label: string }[]>([]);
  const [refresh, setRefresh] = useState(false);

  // حفظ آخر قسم مختار
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

  return (
    <Box>
      <Button variant="contained" onClick={handleOpenAddProduct} sx={{ mb: 2 }}>
        {t('ProductsTab.buttons.addProduct')}
      </Button>
      <ProductList sessionId={sessionId} key={refresh ? 'refresh' : 'no-refresh'} />
      <AddDataPopup
        open={openAddPopup}
        onClose={() => setOpenAddPopup(false)}
        onSubmit={handleAddProduct}
        title={t('ProductsTab.popup.title')}
        fields={[
          {
            label: t('ProductsTab.popup.fields.productName'),
            name: 'product_name',
            autoFocus: true, // يبدأ التركيز هنا
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
    </Box>
  );
};

export default ProductsTab;
