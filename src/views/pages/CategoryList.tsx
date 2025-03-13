// src/views/pages/session/Categories/CategoryList.tsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  IconButton,
  TextField,
  Button,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import axiosServices from 'src/utils/axios';
import { useTranslation } from 'react-i18next';

interface Category {
  id: number;
  category_name: string;
}

interface CategoryListProps {
  sessionId: number;
}

const CategoryList: React.FC<CategoryListProps> = ({ sessionId }) => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [filterText, setFilterText] = useState('');

  const fetchCategories = async () => {
    try {
      const response = await axiosServices.get(`/api/sessions/${sessionId}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories', error);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [sessionId]);

  // فلترة التصنيفات حسب filterText
  const filteredCategories = categories.filter((cat) =>
    cat.category_name.toLowerCase().includes(filterText.toLowerCase())
  );

  const handleDelete = async (categoryId: number) => {
    if (!window.confirm(t('CategoryList.confirmDelete') as string)) return;
    try {
      await axiosServices.post(`/api/sessions/${sessionId}/category/${categoryId}/delete`);
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category', error);
      alert(t('CategoryList.errorDeleting'));
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategoryId(category.id);
    setNewCategoryName(category.category_name);
  };

  const handleUpdate = async () => {
    if (editingCategoryId === null) return;
    try {
      await axiosServices.post(
        `/api/sessions/${sessionId}/category/${editingCategoryId}/update`,
        {
          category_name: newCategoryName,
        }
      );
      setEditingCategoryId(null);
      setNewCategoryName('');
      fetchCategories();
    } catch (error) {
      console.error('Error updating category', error);
      alert(t('CategoryList.errorUpdating'));
    }
  };

  const handleCancelEdit = () => {
    setEditingCategoryId(null);
    setNewCategoryName('');
  };

  return (
    <Box>
      {/* حقل الفلتر */}
      <TextField
        label={t('CategoryList.filterLabel')}
        variant="outlined"
        size="small"
        fullWidth
        sx={{ mb: 2 }}
        value={filterText}
        onChange={(e) => setFilterText(e.target.value)}
      />

      <List>
        {filteredCategories.map((cat) => (
          <ListItem key={cat.id}>
            {editingCategoryId === cat.id ? (
              <>
                <TextField
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  variant="outlined"
                  size="small"
                  sx={{ mr: 1 }}
                />
                <Button
                  onClick={handleUpdate}
                  variant="contained"
                  color="primary"
                  sx={{ mr: 1 }}
                >
                  {t('CategoryList.save')}
                </Button>
                <Button onClick={handleCancelEdit} variant="outlined" color="secondary">
                  {t('CategoryList.cancel')}
                </Button>
              </>
            ) : (
              <>
                <ListItemText primary={cat.category_name} />
                <IconButton onClick={() => handleEdit(cat)} sx={{ mr: 1 }}>
                  <EditIcon />
                </IconButton>
                <IconButton onClick={() => handleDelete(cat.id)}>
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

export default CategoryList;
