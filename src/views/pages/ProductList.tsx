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

// i18n
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<{ id: number; category_name: string }[]>([])

  const [editingProductId, setEditingProductId] = useState<number | null>(null)
  const [editedProductName, setEditedProductName] = useState('')
  const [editedCategoryId, setEditedCategoryId] = useState<number | null>(null)
  const [editedPrice, setEditedPrice] = useState<string>('')

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
    if (!window.confirm(t('ProductList.confirmDelete') as string)) return
    try {
      await axiosServices.post(`/api/sessions/${sessionId}/product/${productId}/delete`)
      fetchProducts()
    } catch (error) {
      console.error('Error deleting product', error)
      alert(t('ProductList.errorDeleting'))
    }
  }

  const handleEdit = (product: Product) => {
    setEditingProductId(product.id)
    setEditedProductName(product.product_name)
    setEditedCategoryId(product.category_id)
    setEditedPrice(product.price ? product.price.toString() : '')
  }

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
      alert(t('ProductList.errorUpdating'))
    }
  }

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
                <TextField
                  value={editedProductName}
                  onChange={e => setEditedProductName(e.target.value)}
                  variant='outlined'
                  size='small'
                  sx={{ mr: 1 }}
                />
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
                <TextField
                  label={t('ProductList.price')}
                  type='number'
                  value={editedPrice}
                  onChange={e => setEditedPrice(e.target.value)}
                  variant='outlined'
                  size='small'
                  sx={{ mr: 1, width: '100px' }}
                />

                <Button onClick={handleUpdate} variant='contained' color='primary' sx={{ mr: 1 }}>
                  {t('ProductList.buttons.save')}
                </Button>
                <Button onClick={handleCancelEdit} variant='outlined' color='secondary'>
                  {t('ProductList.buttons.cancel')}
                </Button>
              </>
            ) : (
              <>
                <ListItemText
                  primary={`${prod.product_name} (${t('ProductList.price')}: ${prod.price ?? 'N/A'})`}
                  secondary={`${t('ProductList.categoryId')}: ${prod.category_id}`}
                />
                <IconButton onClick={() => handleEdit(prod)} sx={{ mr: 1 }} color='primary'>
                  <EditIcon />
                </IconButton>
                <IconButton onClick={() => handleDelete(prod.id)} color='error'>
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
