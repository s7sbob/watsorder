// src/components/ProductList.tsx

import React, { useEffect, useState } from 'react'
import {
  Box,
  List,
  ListItem,
  ListItemText,
  IconButton,
  TextField,
  Button,
  MenuItem
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import axiosServices from 'src/utils/axios'

interface Product {
  id: number
  product_name: string
  category_id: number
  price?: number
}

interface ProductListProps {
  sessionId: number
}

const ProductList: React.FC<ProductListProps> = ({ sessionId }) => {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<{ id: number; category_name: string }[]>([])

  // حالة تمثّل المنتج الذي نقوم بتحريره حاليًا
  const [editingProductId, setEditingProductId] = useState<number | null>(null)
  const [editedProductName, setEditedProductName] = useState('')
  const [editedCategoryId, setEditedCategoryId] = useState<number | null>(null)
  const [editedPrice, setEditedPrice] = useState<string>('') // استخدم string لتسهيل الإدخال

  const fetchProducts = async () => {
    try {
      const response = await axiosServices.get(`/api/sessions/${sessionId}/products`)
      setProducts(response.data)
    } catch (error) {
      console.error('Error fetching products', error)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await axiosServices.get(`/api/sessions/${sessionId}/categories`)
      setCategories(response.data)
    } catch (error) {
      console.error('Error fetching categories', error)
    }
  }

  useEffect(() => {
    if (sessionId) {
      fetchProducts()
      fetchCategories()
    }
  }, [sessionId])

  const handleDelete = async (productId: number) => {
    if (!window.confirm('هل تريد حذف هذا المنتج؟')) return
    try {
      await axiosServices.post(`/api/sessions/${sessionId}/product/${productId}/delete`)
      fetchProducts()
    } catch (error) {
      console.error('Error deleting product', error)
    }
  }

  // فتح وضع التعديل
  const handleEdit = (product: Product) => {
    setEditingProductId(product.id)
    setEditedProductName(product.product_name)
    setEditedCategoryId(product.category_id)
    setEditedPrice(product.price ? product.price.toString() : '')
  }

  // حفظ التعديلات
  const handleUpdate = async () => {
    if (editingProductId === null || editedCategoryId === null) return

    try {
      await axiosServices.post(`/api/sessions/${sessionId}/product/${editingProductId}/update`, {
        product_name: editedProductName,
        category_id: editedCategoryId,
        price: editedPrice ? parseFloat(editedPrice) : null
      })
      setEditingProductId(null)
      setEditedProductName('')
      setEditedCategoryId(null)
      setEditedPrice('')
      fetchProducts()
    } catch (error) {
      console.error('Error updating product', error)
    }
  }

  // إلغاء التعديل
  const handleCancelEdit = () => {
    setEditingProductId(null)
    setEditedProductName('')
    setEditedCategoryId(null)
    setEditedPrice('')
  }

  return (
    <Box>
      <List>
        {products.map(prod => (
          <ListItem key={prod.id}>
            {editingProductId === prod.id ? (
              <>
                {/* حقل اسم المنتج */}
                <TextField
                  value={editedProductName}
                  onChange={e => setEditedProductName(e.target.value)}
                  variant='outlined'
                  size='small'
                  sx={{ mr: 1 }}
                />
                {/* قائمة منسدلة لاختيار الفئة */}
                <TextField
                  select
                  value={editedCategoryId ?? ''}
                  onChange={e => setEditedCategoryId(Number(e.target.value))}
                  variant='outlined'
                  size='small'
                  sx={{ mr: 1 }}
                >
                  {categories.map(cat => (
                    <MenuItem key={cat.id} value={cat.id}>
                      {cat.category_name}
                    </MenuItem>
                  ))}
                </TextField>
                {/* حقل السعر */}
                <TextField
                  label='Price'
                  type='number'
                  value={editedPrice}
                  onChange={e => setEditedPrice(e.target.value)}
                  variant='outlined'
                  size='small'
                  sx={{ mr: 1, width: '100px' }}
                />

                <Button onClick={handleUpdate} variant='contained' color='primary' sx={{ mr: 1 }}>
                  Save
                </Button>
                <Button onClick={handleCancelEdit} variant='outlined' color='secondary'>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <ListItemText
                  primary={`${prod.product_name} (Price: ${prod.price ?? 'N/A'})`}
                  secondary={`Category ID: ${prod.category_id}`}
                />
                <IconButton onClick={() => handleEdit(prod)} sx={{ mr: 1 }}>
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
  )
}

export default ProductList
