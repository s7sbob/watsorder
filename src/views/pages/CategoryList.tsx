// src/components/CategoryList.tsx
import React, { useEffect, useState } from 'react';
import { Box, List, ListItem, ListItemText, IconButton, TextField, Button } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import axiosServices from 'src/utils/axios';

interface Category {
  id: number;
  category_name: string;
}

interface CategoryListProps {
  sessionId: number;
}

const CategoryList: React.FC<CategoryListProps> = ({ sessionId }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');

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

  const handleDelete = async (categoryId: number) => {
    if (!window.confirm('هل تريد حذف هذه الفئة؟')) return;
    try {
      await axiosServices.delete(`/api/sessions/${sessionId}/category/${categoryId}`);
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category', error);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategoryId(category.id);
    setNewCategoryName(category.category_name);
  };

  const handleUpdate = async () => {
    if (editingCategoryId === null) return;
    try {
      await axiosServices.put(`/api/sessions/${sessionId}/category/${editingCategoryId}`, {
        category_name: newCategoryName
      });
      setEditingCategoryId(null);
      setNewCategoryName('');
      fetchCategories();
    } catch (error) {
      console.error('Error updating category', error);
    }
  };

  return (
    <Box>
      <List>
        {categories.map((cat) => (
          <ListItem key={cat.id}>
            {editingCategoryId === cat.id ? (
              <>
                <TextField
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  variant="outlined"
                  size="small"
                />
                <Button onClick={handleUpdate}>Save</Button>
              </>
            ) : (
              <>
                <ListItemText primary={cat.category_name} />
                <IconButton onClick={() => handleEdit(cat)}>
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
