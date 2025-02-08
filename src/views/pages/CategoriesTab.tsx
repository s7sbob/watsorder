// src/components/tabs/CategoriesTab.tsx
import React, { useState } from 'react';
import { Box, Button } from '@mui/material';
import CategoryList from './CategoryList';
import AddDataPopup from './AddDataPopup';
import axiosServices from 'src/utils/axios';

interface CategoriesTabProps {
  sessionId: number;
}

const CategoriesTab: React.FC<CategoriesTabProps> = ({ sessionId }) => {
  const [openAddPopup, setOpenAddPopup] = useState(false);
  const [refresh, setRefresh] = useState(false);

  const handleAddCategory = async (data: any) => {
    try {
      await axiosServices.post(`/api/sessions/${sessionId}/category`, data);
      setOpenAddPopup(false);
      setRefresh(!refresh); // لتحديث القائمة
    } catch (error) {
      alert('Error adding category.');
    }
  };

  return (
    <Box>
      <Button variant="contained" onClick={() => setOpenAddPopup(true)} sx={{ mb: 2 }}>
        Add Category
      </Button>
      <CategoryList sessionId={sessionId} key={refresh ? 'refresh' : 'no-refresh'} />
      <AddDataPopup
        open={openAddPopup}
        onClose={() => setOpenAddPopup(false)}
        onSubmit={handleAddCategory}
        title="Add Category"
        fields={[{ label: 'Category Name', name: 'category_name' }]}
      />
    </Box>
  );
};

export default CategoriesTab;
