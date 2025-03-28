// src/views/pages/session/CategoryList.tsx
import React, { useEffect, useState } from 'react';
import { Box, IconButton, Typography, Switch } from '@mui/material';
import { TreeView, TreeItem } from '@mui/lab';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import axiosServices from 'src/utils/axios';
import Swal from 'sweetalert2';
import { useTranslation } from 'react-i18next';

export interface Category {
  id: number;
  category_name: string;
  isActive: boolean;
  order: number;
}

interface CategoryListProps {
  sessionId: number;
  onEdit: (category: Category) => void;
}

const CategoryList: React.FC<CategoryListProps> = ({ sessionId, onEdit }) => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  const fetchCategories = async () => {
    try {
      const response = await axiosServices.get(`/api/sessions/${sessionId}/categories`);
      // ترتيب التصنيفات حسب order
      const sorted = response.data.sort((a: Category, b: Category) => a.order - b.order);
      setCategories(sorted);
    } catch (error) {
      console.error('Error fetching categories', error);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchCategories();
    }
  }, [sessionId]);

  const handleSelect = (id: number) => {
    setSelectedCategoryId(id);
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const prevCategories = [...categories];
    const reordered = Array.from(categories);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);

    const updatedCategories = reordered.map((item, index) => ({ ...item, order: index + 1 }));
    setCategories(updatedCategories);

    try {
      await axiosServices.post(`/api/sessions/${sessionId}/categories/reorder`, { categories: updatedCategories });
    } catch (error) {
      console.error('Error updating order', error);
      setCategories(prevCategories);
      Swal.fire(t('CategoryList.reorderError') || 'Error updating order. Reverting changes.');
    }
  };

  const handleToggleCategory = async (category: Category, newValue: boolean) => {
    const prevCategories = [...categories];
    const updatedCategories = categories.map(cat =>
      cat.id === category.id ? { ...cat, isActive: newValue } : cat
    );
    setCategories(updatedCategories);
    try {
      await axiosServices.post(`/api/sessions/${sessionId}/category/${category.id}/update`, {
        category_name: category.category_name,
        isActive: newValue,
        order: category.order
      });
    } catch (error) {
      console.error('Error toggling category', error);
      setCategories(prevCategories);
      Swal.fire(t('CategoryList.toggleError') || 'Error updating status. Reverting changes.');
    }
  };

  const handleDelete = async () => {
    if (!selectedCategoryId) return;
    const confirmed = await Swal.fire({
      title: t('CategoryList.confirmDeleteTitle') || 'Are you sure?',
      text: t('CategoryList.confirmDeleteText') || 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t('CategoryList.confirmDeleteConfirm') || 'Yes, delete it!',
      cancelButtonText: t('CategoryList.confirmDeleteCancel') || 'Cancel'
    });
    if (confirmed.isConfirmed) {
      try {
        await axiosServices.post(`/api/sessions/${sessionId}/category/${selectedCategoryId}/delete`);
        setSelectedCategoryId(null);
        fetchCategories();
      } catch (error) {
        console.error('Error deleting category', error);
        Swal.fire(t('CategoryList.errorDeleting') || 'Error deleting category');
      }
    }
  };

  const handleEdit = () => {
    if (!selectedCategoryId) return;
    const category = categories.find(c => c.id === selectedCategoryId);
    if (category) {
      onEdit(category);
    }
  };

  return (
    <Box>
      {/* أزرار التعديل والحذف ثابتة في الأعلى */}
      <Box display="flex" alignItems="center" mb={2}>
        <IconButton onClick={handleEdit} disabled={!selectedCategoryId}>
          <EditIcon />
        </IconButton>
        <IconButton onClick={handleDelete} disabled={!selectedCategoryId}>
          <DeleteIcon />
        </IconButton>
      </Box>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="categoryList">
          {(provided) => (
            <TreeView
              {...provided.droppableProps}
              ref={provided.innerRef}
              defaultCollapseIcon={<Typography>-</Typography>}
              defaultExpandIcon={<Typography>+</Typography>}
            >
              {categories.map((cat, index) => (
                <Draggable key={cat.id.toString()} draggableId={cat.id.toString()} index={index}>
                  {(providedDraggable) => (
                    <TreeItem
                      nodeId={cat.id.toString()}
                      label={
                        <Box display="flex" alignItems="center" justifyContent="space-between" onClick={() => handleSelect(cat.id)}>
                          <Typography>{cat.category_name}</Typography>
                          <Box display="flex" alignItems="center">
                            <Switch
                              checked={cat.isActive}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleToggleCategory(cat, e.target.checked);
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            {!cat.isActive && (
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
                      style={{
                        backgroundColor: selectedCategoryId === cat.id ? '#e0e0e0' : 'inherit',
                        marginBottom: 4,
                        ...providedDraggable.draggableProps.style
                      }}
                    />
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </TreeView>
          )}
        </Droppable>
      </DragDropContext>
    </Box>
  );
};

export default CategoryList;
