// src/components/tabs/ProductsTab.tsx
import React, { useState } from 'react';
import { Box, Button } from '@mui/material';
import ProductList from './ProductList';
import AddDataPopup from './AddDataPopup';
import axiosServices from 'src/utils/axios';

interface ProductsTabProps {
  sessionId: number;
}

const ProductsTab: React.FC<ProductsTabProps> = ({ sessionId }) => {
  const [openAddPopup, setOpenAddPopup] = useState(false);
  const [productCategories, setProductCategories] = useState<{ value: number; label: string }[]>([]);
  const [refresh, setRefresh] = useState(false);

  const handleOpenAddProduct = async () => {
    try {
      const response = await axiosServices.get(`/api/sessions/${sessionId}/categories`);
      const cats = response.data.map((c: any) => ({ value: c.id, label: c.category_name }));
      setProductCategories(cats);
      setOpenAddPopup(true);
    } catch (error) {
      alert('Error fetching categories.');
    }
  };

  const handleAddProduct = async (data: any) => {
    try {
      await axiosServices.post(`/api/sessions/${sessionId}/product`, data);
      setOpenAddPopup(false);
      setRefresh(!refresh);
    } catch (error) {
      alert('Error adding product.');
    }
  };

  return (
    <Box>
      <Button variant="contained" onClick={handleOpenAddProduct} sx={{ mb: 2 }}>
        Add Product
      </Button>
      <ProductList sessionId={sessionId} key={refresh ? 'refresh' : 'no-refresh'} />
      <AddDataPopup
        open={openAddPopup}
        onClose={() => setOpenAddPopup(false)}
        onSubmit={handleAddProduct}
        title="Add Product"
        fields={[
          { label: 'Product Name', name: 'product_name' },
          { label: 'Category', name: 'category_id', options: productCategories },
          { label: 'Price', name: 'price' }
        ]}
      />
    </Box>
  );
};

export default ProductsTab;
