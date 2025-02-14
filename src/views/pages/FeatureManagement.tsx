// src/views/pages/FeatureManagement.tsx

import React, { useContext, useEffect, useState } from 'react';
import { UserContext, Feature } from 'src/context/UserContext';
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import { IconEdit, IconTrash } from '@tabler/icons-react';

const FeatureManagement: React.FC = () => {
  const {
    features,
    fetchAllFeatures,
    createFeature,
    updateFeature,
    deleteFeature,
    isAdmin
  } = useContext(UserContext)!;

  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);

  const [featureKey, setFeatureKey] = useState('');
  const [featureName, setFeatureName] = useState('');

  useEffect(() => {
    if (isAdmin()) {
      fetchAllFeatures();
    }
  }, []);

  // فتح حوار الإضافة
  const handleOpenAdd = () => {
    setDialogMode('add');
    setEditingFeature(null);
    setFeatureKey('');
    setFeatureName('');
    setOpenDialog(true);
  };

  // فتح حوار التعديل
  const handleOpenEdit = (f: Feature) => {
    setDialogMode('edit');
    setEditingFeature(f);
    setFeatureKey(f.featureKey);
    setFeatureName(f.featureName);
    setOpenDialog(true);
  };

  // حذف ميزة
  const handleDelete = async (id: number) => {
    if (!isAdmin()) return;
    if (window.confirm('Are you sure to delete this feature?')) {
      await deleteFeature(id);
    }
  };

  // حفظ (إضافة أو تعديل)
  const handleSave = async () => {
    if (!isAdmin()) return;
    if (dialogMode === 'add') {
      await createFeature({ featureKey, featureName });
    } else if (editingFeature) {
      await updateFeature(editingFeature.id, { featureKey, featureName });
    }
    setOpenDialog(false);
  };

  if (!isAdmin()) {
    return <div>Forbidden: Admin only.</div>;
  }

  return (
    <div>
      <h2>Feature Management</h2>
      <Button variant="contained" color="primary" onClick={handleOpenAdd}>
        Add Feature
      </Button>

      <Table sx={{ mt: 2 }}>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Key</TableCell>
            <TableCell>Name</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {features.map((f) => (
            <TableRow key={f.id}>
              <TableCell>{f.id}</TableCell>
              <TableCell>{f.featureKey}</TableCell>
              <TableCell>{f.featureName}</TableCell>
              <TableCell align="right">
                <IconButton color="success" onClick={() => handleOpenEdit(f)}>
                  <IconEdit />
                </IconButton>
                <IconButton color="error" onClick={() => handleDelete(f.id)}>
                  <IconTrash />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>{dialogMode === 'add' ? 'Add Feature' : 'Edit Feature'}</DialogTitle>
        <DialogContent>
          <TextField
            label="featureKey"
            value={featureKey}
            onChange={(e) => setFeatureKey(e.target.value)}
            margin="normal"
            fullWidth
          />
          <TextField
            label="featureName"
            value={featureName}
            onChange={(e) => setFeatureName(e.target.value)}
            margin="normal"
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            {dialogMode === 'add' ? 'Add' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default FeatureManagement;
