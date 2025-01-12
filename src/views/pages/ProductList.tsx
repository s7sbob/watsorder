// src/components/ProductList.tsx
import React, { useEffect, useState } from 'react';
import { Box, List, ListItem, ListItemText, IconButton, TextField, Button, MenuItem } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import axiosServices from 'src/utils/axios';

interface Product {
  id: number;
  product_name: string;
  category_id: number;
}

interface ProductListProps {
  sessionId: number;
}

const ProductList: React.FC<ProductListProps> = ({ sessionId }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: number; category_name: string }[]>([]);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [editedProductName, setEditedProductName] = useState('');
  const [editedCategoryId, setEditedCategoryId] = useState<number | null>(null);

  const fetchProducts = async () => {
    try {
      const response = await axiosServices.get(`/api/sessions/${sessionId}/products`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axiosServices.get(`/api/sessions/${sessionId}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories', error);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [sessionId]);

  const handleDelete = async (productId: number) => {
    if (!window.confirm('هل تريد حذف هذا المنتج؟')) return;
    try {
      await axiosServices.delete(`/api/sessions/${sessionId}/product/${productId}`);
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product', error);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProductId(product.id);
    setEditedProductName(product.product_name);
    setEditedCategoryId(product.category_id);
  };

  const handleUpdate = async () => {
    if (editingProductId === null || editedCategoryId === null) return;
    try {
      await axiosServices.put(`/api/sessions/${sessionId}/product/${editingProductId}`, {
        product_name: editedProductName,
        category_id: editedCategoryId
      });
      setEditingProductId(null);
      setEditedProductName('');
      setEditedCategoryId(null);
      fetchProducts();
    } catch (error) {
      console.error('Error updating product', error);
    }
  };

  return (
    <Box>
      <List>
        {products.map((prod) => (
          <ListItem key={prod.id}>
            {editingProductId === prod.id ? (
              <>
                <TextField
                  value={editedProductName}
                  onChange={(e) => setEditedProductName(e.target.value)}
                  variant="outlined"
                  size="small"
                  sx={{ mr: 1 }}
                />
                <TextField
                  select
                  value={editedCategoryId ?? ''}
                  onChange={(e) => setEditedCategoryId(Number(e.target.value))}
                  variant="outlined"
                  size="small"
                  sx={{ mr: 1 }}
                >
                  {categories.map((cat) => (
                    <MenuItem key={cat.id} value={cat.id}>
                      {cat.category_name}
                    </MenuItem>
                  ))}
                </TextField>
                <Button onClick={handleUpdate}>Save</Button>
              </>
            ) : (
              <>
                <ListItemText primary={prod.product_name} secondary={`Category ID: ${prod.category_id}`} />
                <IconButton onClick={() => handleEdit(prod)}>
                  <EditIcon />
                </IconButton>
                <IconButton onClick={() => handleDelete(prod.id)}>
                  <DeleteIcon />
                </IconButton>
              </>
            )}
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default ProductList;
