// src/views/pages/session/CategoriesTab.tsx
import React, { useState } from 'react';
import { Box, Button, Paper } from '@mui/material';
import CategoryList, { Category } from './CategoryList';
import AddDataPopup from './AddDataPopup';
import EditCategoryPopup from './EditCategoryPopup';
import axiosServices from 'src/utils/axios';
import { useTranslation } from 'react-i18next';

interface CategoriesTabProps {
  sessionId: number;
}

const CategoriesTab: React.FC<CategoriesTabProps> = ({ sessionId }) => {
  const { t } = useTranslation();
  const [openAddPopup, setOpenAddPopup] = useState(false);
  const [openEditPopup, setOpenEditPopup] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [refresh, setRefresh] = useState(false);

  const handleAddCategory = async (data: any) => {
    try {
      await axiosServices.post(`/api/sessions/${sessionId}/category`, data);
      setOpenAddPopup(false);
      setRefresh(!refresh);
    } catch (error) {
      alert(t('CategoriesTab.alerts.errorAdd'));
    }
  };

  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setOpenEditPopup(true);
  };

  const handleUpdateCategory = async (data: any) => {
    try {
      await axiosServices.post(`/api/sessions/${sessionId}/category/${selectedCategory?.id}/update`, data);
      setOpenEditPopup(false);
      setSelectedCategory(null);
      setRefresh(!refresh);
    } catch (error) {
      alert(t('CategoriesTab.errorUpdatingCategory'));
    }
  };

  return (
        <Paper elevation={3} sx={{ p: 2 }}>
    
    <Box>
      <Button variant="contained" onClick={() => setOpenAddPopup(true)} sx={{ mb: 2 }}>
        {t('CategoriesTab.buttons.addCategory')}
      </Button>
      <CategoryList sessionId={sessionId} key={refresh ? 'refresh' : 'no-refresh'} onEdit={handleEditCategory} />
      <AddDataPopup
        open={openAddPopup}
        onClose={() => setOpenAddPopup(false)}
        onSubmit={handleAddCategory}
        title={t('CategoriesTab.popup.title')}
        fields={[
          { label: t('CategoriesTab.popup.fields.categoryName'), name: 'category_name', autoFocus: true }
        ]}
      />
      {openEditPopup && selectedCategory && (
        <EditCategoryPopup
          open={openEditPopup}
          onClose={() => { setOpenEditPopup(false); setSelectedCategory(null); }}
          onSubmit={handleUpdateCategory}
          category={selectedCategory}
        />
      )}
    </Box>
        </Paper>
    
  );
};

export default CategoriesTab;
