import React, { useState } from 'react'
import { Box, Button } from '@mui/material'
import ProductList from './ProductList'
import AddDataPopup from './AddDataPopup'
import axiosServices from 'src/utils/axios'
import { useTranslation } from 'react-i18next'

interface ProductsTabProps {
  sessionId: number
}

const ProductsTab: React.FC<ProductsTabProps> = ({ sessionId }) => {
  const { t } = useTranslation()
  const [openAddPopup, setOpenAddPopup] = useState(false)
  const [productCategories, setProductCategories] = useState<{ value: number; label: string }[]>([])
  const [refresh, setRefresh] = useState(false)

  const handleOpenAddProduct = async () => {
    try {
      const response = await axiosServices.get(`/api/sessions/${sessionId}/categories`)
      const cats = response.data.map((c: any) => ({ value: c.id, label: c.category_name }))
      setProductCategories(cats)
      setOpenAddPopup(true)
    } catch (error) {
      alert(t('ProductsTab.errorFetchingCategories'))
    }
  }

  const handleAddProduct = async (data: any) => {
    try {
      await axiosServices.post(`/api/sessions/${sessionId}/product`, data)
      setOpenAddPopup(false)
      setRefresh(!refresh)
    } catch (error) {
      alert(t('ProductsTab.errorAddingProduct'))
    }
  }

  return (
    <Box>
      <Button variant='contained' onClick={handleOpenAddProduct} sx={{ mb: 2 }}>
        {t('ProductsTab.buttons.addProduct')}
      </Button>
      <ProductList sessionId={sessionId} key={refresh ? 'refresh' : 'no-refresh'} />
      <AddDataPopup
        open={openAddPopup}
        onClose={() => setOpenAddPopup(false)}
        onSubmit={handleAddProduct}
        title={t('ProductsTab.popup.title')}
        fields={[
          { label: t('ProductsTab.popup.fields.productName'), name: 'product_name' },
          { label: t('ProductsTab.popup.fields.category'), name: 'category_id', options: productCategories },
          { label: t('ProductsTab.popup.fields.price'), name: 'price' }
        ]}
      />
    </Box>
  )
}

export default ProductsTab
