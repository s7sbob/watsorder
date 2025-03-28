// src/views/pages/session/ProductTreeView.tsx
import React, { useState, useEffect } from 'react';
import { Box, IconButton, Paper, Typography, Switch, TextField } from '@mui/material';
import { TreeView, TreeItem } from '@mui/lab';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import axiosServices from 'src/utils/axios';
import Swal from 'sweetalert2';
import { useTranslation } from 'react-i18next';

export interface Category {
  id: number;
  category_name: string;
  isActive: boolean;
  order: number;
}

export interface Product {
  id: number;
  product_name: string;
  category_id: number;
  price?: number;
  isActive: boolean;
  order: number;
}

export type SelectedItem = 
  | { type: 'category'; data: Category }
  | { type: 'product'; data: Product }
  | null;

export interface ProductTreeViewProps {
  sessionId: number;
  onEdit: (item: SelectedItem) => void;
  onDelete: (item: SelectedItem) => void;
}

const ProductTreeView: React.FC<ProductTreeViewProps> = ({ sessionId, onEdit, onDelete }) => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedItem, setSelectedItem] = useState<SelectedItem>(null);
  const [searchText, setSearchText] = useState('');

  // جلب التصنيفات
  const fetchCategories = async () => {
    try {
      const response = await axiosServices.get(`/api/sessions/${sessionId}/categories`);
      const sortedCategories = response.data.sort((a: Category, b: Category) => a.order - b.order);
      setCategories(sortedCategories);
    } catch (error) {
      console.error('Error fetching categories', error);
    }
  };

  // جلب المنتجات
  const fetchProducts = async () => {
    try {
      const response = await axiosServices.get(`/api/sessions/${sessionId}/products`);
      const sortedProducts = response.data.sort((a: Product, b: Product) => a.order - b.order);
      setProducts(sortedProducts);
    } catch (error) {
      console.error('Error fetching products', error);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchCategories();
      fetchProducts();
    }
  }, [sessionId]);

  // تجميع المنتجات حسب التصنيف
  const productsByCategory: { [key: number]: Product[] } = {};
  products.forEach(product => {
    if (!productsByCategory[product.category_id]) {
      productsByCategory[product.category_id] = [];
    }
    productsByCategory[product.category_id].push(product);
  });

  // تطبيق البحث على التصنيفات والمنتجات
  const filteredCategories = categories.filter(category => {
    const catMatches = category.category_name.toLowerCase().includes(searchText.toLowerCase());
    const productsForCat = productsByCategory[category.id] || [];
    const filteredProds = productsForCat.filter(product =>
      product.product_name.toLowerCase().includes(searchText.toLowerCase())
    );
    return catMatches || filteredProds.length > 0;
  });

  const handleDragEnd = async (result: DropResult, categoryId: number) => {
    if (!result.destination) return;
    const prevProducts = [...products];
    const items = Array.from(productsByCategory[categoryId] || []);
    const [removed] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, removed);
    const updatedItems = items.map((item, index) => ({ ...item, order: index + 1 }));
    const updatedProducts = products.map(prod => {
      if (prod.category_id === categoryId) {
        const updated = updatedItems.find(item => item.id === prod.id);
        return updated ? updated : prod;
      }
      return prod;
    });
    setProducts(updatedProducts);
    try {
      await axiosServices.post(`/api/sessions/${sessionId}/products/reorder`, { products: updatedItems });
      fetchProducts();
    } catch (error) {
      console.error('Error updating order', error);
      setProducts(prevProducts);
      Swal.fire(t('ProductTreeView.reorderError') || 'Error updating order. Reverting changes.');
    }
  };

  const handleToggleProduct = async (product: Product, newValue: boolean) => {
    const prevProducts = [...products];
    const updatedProducts = products.map(p => p.id === product.id ? { ...p, isActive: newValue } : p);
    setProducts(updatedProducts);
    try {
      await axiosServices.post(`/api/sessions/${sessionId}/product/${product.id}/update`, {
        product_name: product.product_name,
        category_id: product.category_id,
        price: product.price,
        isActive: newValue,
        order: product.order
      });
    } catch (error) {
      console.error('Error toggling product', error);
      setProducts(prevProducts);
      Swal.fire(t('ProductTreeView.toggleError') || 'Error updating status. Reverting changes.');
    }
  };

  const handleSelectItem = (item: SelectedItem) => {
    setSelectedItem(item);
  };

  const handleEditClick = () => {
    if (selectedItem && selectedItem.type === 'product') {
      onEdit(selectedItem);
    }
  };

  const handleDeleteClick = async () => {
    if (selectedItem && selectedItem.type === 'product') {
      const confirmed = await Swal.fire({
        title: t('confirmDeleteTitle') || 'Are you sure?',
        text: t('confirmDeleteText') || 'This action cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: t('confirmDeleteConfirm') || 'Yes, delete it!',
        cancelButtonText: t('confirmDeleteCancel') || 'Cancel'
      });
      if (confirmed.isConfirmed) {
        onDelete(selectedItem);
        setSelectedItem(null);
      }
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      {/* حقل البحث */}
      <Box mb={2}>
        <TextField
          label={t('ProductList.filterLabel') || "Search"}
          variant="outlined"
          fullWidth
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </Box>
      {/* أيقونات التعديل والحذف ثابتة في الأعلى */}
      <Box display="flex" alignItems="center" mb={2}>
        <IconButton onClick={handleEditClick} disabled={!selectedItem || selectedItem.type !== 'product'}>
          <EditIcon />
        </IconButton>
        <IconButton onClick={handleDeleteClick} disabled={!selectedItem || selectedItem.type !== 'product'}>
          <DeleteIcon />
        </IconButton>
      </Box>
      <TreeView defaultCollapseIcon={<ExpandMoreIcon />} defaultExpandIcon={<ChevronRightIcon />}>
        {filteredCategories.map(category => {
          // داخل كل فئة، نحسب المنتجات التي تتطابق مع البحث
          const productsForCat = productsByCategory[category.id] || [];
          const filteredProductsForCat = searchText
            ? productsForCat.filter(product =>
                product.product_name.toLowerCase().includes(searchText.toLowerCase())
              )
            : productsForCat;
          return (
            <TreeItem
              key={`category-${category.id}`}
              nodeId={`category-${category.id}`}
              label={
                <Box display="flex" alignItems="center" justifyContent="space-between" onClick={() => handleSelectItem({ type: 'category', data: category })}>
                  <Typography>{category.category_name}</Typography>
                  <Box display="flex" alignItems="center">
                    <Switch
                      checked={category.isActive}
                      onChange={(e) => {
                        e.stopPropagation();
                        // يمكنك إضافة دالة toggle للتصنيف هنا لو أردت
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    {!category.isActive && (
                      <Typography variant="caption" color="error" sx={{ ml: 1 }}>
                        Disabled
                      </Typography>
                    )}
                  </Box>
                </Box>
              }
            >
              <DragDropContext onDragEnd={(result) => handleDragEnd(result, category.id)}>
                <Droppable droppableId={`droppable-${category.id}`}>
                  {(provided) => (
                    <Box ref={provided.innerRef} {...provided.droppableProps}>
                      {filteredProductsForCat.map((product, index) => (
                        <Draggable key={product.id.toString()} draggableId={`product-${product.id}`} index={index}>
                          {(providedDraggable) => (
                            <TreeItem
                              key={`product-${product.id}`}
                              nodeId={`product-${product.id}`}
                              label={
                                <Box display="flex" alignItems="center" justifyContent="space-between" onClick={() => handleSelectItem({ type: 'product', data: product })}>
                                  <Typography>{`${product.order} - ${product.product_name}  ($${product.price ?? 'N/A'})`}</Typography>
                                  <Box display="flex" alignItems="center">
                                    <Switch
                                      checked={product.isActive}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        handleToggleProduct(product, e.target.checked);
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    {!product.isActive && (
                                      <Typography variant="caption" color="error" sx={{ ml: 1 }}>
                                        Disabled
                                      </Typography>
                                    )}
                                  </Box>
                                </Box>
                              }
                              ref={providedDraggable.innerRef}
                              {...providedDraggable.draggableProps}
                              {...providedDraggable.dragHandleProps}
                              sx={{
                                backgroundColor:
                                  selectedItem &&
                                  selectedItem.type === 'product' &&
                                  selectedItem.data.id === product.id
                                    ? '#e0e0e0'
                                    : 'inherit',
                                mb: 1,
                              }}
                            />
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </Box>
                  )}
                </Droppable>
              </DragDropContext>
            </TreeItem>
          );
        })}
      </TreeView>
    </Paper>
  );
};

export default ProductTreeView;
