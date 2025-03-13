// src/views/pages/session/CategoriesTab.tsx
import React, { useState } from 'react'
import { Box, Button } from '@mui/material'
import CategoryList from './CategoryList'
import AddDataPopup from './AddDataPopup'
import axiosServices from 'src/utils/axios'

// i18n
import { useTranslation } from 'react-i18next'

interface CategoriesTabProps {
  sessionId: number
}

const CategoriesTab: React.FC<CategoriesTabProps> = ({ sessionId }) => {
  const { t } = useTranslation()
  const [openAddPopup, setOpenAddPopup] = useState(false)
  const [refresh, setRefresh] = useState(false)

  const handleAddCategory = async (data: any) => {
    try {
      await axiosServices.post(`/api/sessions/${sessionId}/category`, data)
      setOpenAddPopup(false)
      setRefresh(!refresh) // لتحديث القائمة
    } catch (error) {
      alert(t('CategoriesTab.alerts.errorAdd'))
    }
  }

  return (
    <Box>
      <Button variant='contained' onClick={() => setOpenAddPopup(true)} sx={{ mb: 2 }}>
        {t('CategoriesTab.buttons.addCategory')}
      </Button>
      <CategoryList sessionId={sessionId} key={refresh ? 'refresh' : 'no-refresh'} />
      <AddDataPopup
        open={openAddPopup}
        onClose={() => setOpenAddPopup(false)}
        onSubmit={handleAddCategory}
        title={t('CategoriesTab.popup.title')}
        fields={[
          { 
            label: t('CategoriesTab.popup.fields.categoryName'), 
            name: 'category_name',
            autoFocus: true  // تفعيل التركيز التلقائي
          }
        ]}
      />
    </Box>
  )
}

export default CategoriesTab
