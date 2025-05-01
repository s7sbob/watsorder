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
  productPhoto?: string;
  productDescription?: string;
  isEcommerce: boolean;
}

export type SelectedItem =
  | { type: 'category'; data: Category }
  | { type: 'product';  data: Product }
  | null;

interface ProductTreeViewProps {
  sessionId: number;
  onEdit: (item: SelectedItem) => void;
  onDelete: (item: SelectedItem) => void;
}

const ProductTreeView: React.FC<ProductTreeViewProps> = ({ sessionId, onEdit }) => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchText, setSearchText] = useState('');

  useEffect(() => { if (sessionId) { fetchCategories(); fetchProducts(); } }, [sessionId]);

  const fetchCategories = async () => {
    try {
      const res = await axiosServices.get(`/api/sessions/${sessionId}/categories`);
      setCategories(res.data.sort((a:Category,b:Category)=>a.order-b.order));
    } catch (err) { console.error(err); }
  };

  const fetchProducts = async () => {
    try {
      const res = await axiosServices.get(`/api/sessions/${sessionId}/products`);
      setProducts(res.data.sort((a:Product,b:Product)=>a.order-b.order));
    } catch (err) { console.error(err); }
  };

  const productsByCategory: Record<number,Product[]> = {};
  products.forEach(p => {
    if (!productsByCategory[p.category_id]) productsByCategory[p.category_id] = [];
    productsByCategory[p.category_id].push(p);
  });

  const filteredCategories = categories.filter(cat => {
    const matchCat = cat.category_name.toLowerCase().includes(searchText.toLowerCase());
    const prods = productsByCategory[cat.id] || [];
    const matchProd = prods.some(p => p.product_name.toLowerCase().includes(searchText.toLowerCase()));
    return matchCat || matchProd;
  });

  const handleDragEnd = async (result: DropResult, catId: number) => {
    if (!result.destination) return;
    const prev = [...products];
    const items = Array.from(productsByCategory[catId] || []);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    const updated = items.map((itm, idx) => ({ ...itm, order: idx + 1 }));
    setProducts(products.map(p => p.category_id === catId ? updated.find(u => u.id === p.id) || p : p));
    try {
      await axiosServices.post(`/api/sessions/${sessionId}/products/reorder`, { products: updated });
      fetchProducts();
    } catch {
      setProducts(prev);
      Swal.fire(t('ProductTreeView.reorderError') as string);
    }
  };

  const toggleField = async (
    product: Product,
    field: 'isActive' | 'isEcommerce',
    newVal: boolean
  ) => {
    const prev = [...products];
    setProducts(products.map(p => p.id === product.id ? { ...p, [field]: newVal } : p));
    try {
      await axiosServices.post(
        `/api/sessions/${sessionId}/product/${product.id}/update`,
        {
          product_name:       product.product_name,
          category_id:        product.category_id,
          price:              product.price,
          isActive:           field === 'isActive' ? newVal : product.isActive,
          order:              product.order,
          productDescription: product.productDescription,
          isEcommerce:        field === 'isEcommerce' ? newVal : product.isEcommerce
        }
      );
    } catch {
      setProducts(prev);
      Swal.fire(
        field === 'isActive'
          ? t('ProductTreeView.toggleError') as string
          : t('ProductTreeView.toggleEcomError') as string
      );
    }
  };

  const confirmDeleteProduct = async (product: Product) => {
    const res = await Swal.fire({
      title: t('confirmDeleteTitle') as string,
      text: t('confirmDeleteText') as string,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t('confirmDeleteConfirm') as string,
      cancelButtonText: t('confirmDeleteCancel') as string
    });
    if (res.isConfirmed) {
      try { await axiosServices.post(`/api/sessions/${sessionId}/product/${product.id}/delete`); fetchProducts(); }
      catch { Swal.fire(t('ProductTreeView.errorDeletingProduct') as string); }
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Box mb={2}>
        <TextField
          fullWidth variant="outlined"
          label={t('ProductList.filterLabel')}
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
        />
      </Box>
      <TreeView defaultCollapseIcon={<ExpandMoreIcon />} defaultExpandIcon={<ChevronRightIcon />}>
        {filteredCategories.map(cat => (
          <TreeItem
            key={cat.id}
            nodeId={`cat-${cat.id}`}
            label={
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Typography>{cat.category_name}</Typography>
                <Switch
                  checked={cat.isActive}
                  onChange={e => e.stopPropagation()}
                  onClick={e => e.stopPropagation()}
                />
                {!cat.isActive && (
                  <Typography variant="caption" color="error" sx={{ ml: 1 }}>
                    Disabled
                  </Typography>
                )}
              </Box>
            }
          >
            <DragDropContext onDragEnd={res => handleDragEnd(res, cat.id)}>
              <Droppable droppableId={`droppable-${cat.id}`}> 
                {provided => (
                  <Box ref={provided.innerRef} {...provided.droppableProps}>
                    {(productsByCategory[cat.id] || [])
                      .filter(p => p.product_name.toLowerCase().includes(searchText.toLowerCase()))
                      .map((product, idx) => (
                        <Draggable key={product.id} draggableId={`prod-${product.id}`} index={idx}>
                          {providedDraggable => (
                            <TreeItem
                              nodeId={`prod-${product.id}`}
                              key={product.id}
                              label={
                                <Box display="flex" alignItems="center" justifyContent="space-between">
                                  <Typography>
                                    {`${product.order} - ${product.product_name} ($${product.price ?? 'N/A'})`}
                                  </Typography>
                                  <Box display="flex" alignItems="center">
                                    <Switch
                                      checked={product.isActive}
                                      onChange={e => {
                                        e.stopPropagation();
                                        toggleField(product, 'isActive', e.target.checked);
                                      }}
                                      onClick={e => e.stopPropagation()}
                                    />
                                    <Switch
                                      checked={product.isEcommerce}
                                      onChange={e => {
                                        e.stopPropagation();
                                        toggleField(product, 'isEcommerce', e.target.checked);
                                      }}
                                      onClick={e => e.stopPropagation()}
                                    />
                                    <Typography variant="caption" sx={{ ml: 1 }}>
                                      {t('ProductTreeView.labels.ecommerce')}
                                    </Typography>
                                    <IconButton
                                      onClick={e => { e.stopPropagation(); onEdit({ type: 'product', data: product }); }}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                      onClick={e => { e.stopPropagation(); confirmDeleteProduct(product); }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Box>
                                </Box>
                              }
                              ref={providedDraggable.innerRef}
                              {...providedDraggable.draggableProps}
                              {...providedDraggable.dragHandleProps}
                              sx={{ mb: 1 }}
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
        ))}
      </TreeView>
    </Paper>
  );
};

export default ProductTreeView;