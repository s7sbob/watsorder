import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import axios from 'src/utils/axios';

interface AddUserDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  name: string;
  phoneNumber: string;
  password: string;
  subscriptionType: string;
  subscriptionStart: string;
  subscriptionEnd: string;
  maxSessions: number;
  subUserRole: string;
}

const AddUserDialog: React.FC<AddUserDialogProps> = ({ open, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phoneNumber: '',
    password: '',
    subscriptionType: 'user',
    subscriptionStart: '',
    subscriptionEnd: '',
    maxSessions: 1,
    subUserRole: '',
  });
  const [loading, setLoading] = useState<boolean>(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    if (!formData.phoneNumber || !formData.password) {
      alert(t('phoneAndPasswordRequired'));
      return;
    }
    setLoading(true);
    try {
      await axios.post('/api/users', formData);
      onSuccess();
    } catch (error: any) {
      console.error(error);
      alert(error.message || t('errorCreatingUser'));
    }
    setLoading(false);
  };

  const handleClose = () => {
    setFormData({
      name: '',
      phoneNumber: '',
      password: '',
      subscriptionType: 'user',
      subscriptionStart: '',
      subscriptionEnd: '',
      maxSessions: 1,
      subUserRole: '',
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>{t('addUser')}</DialogTitle>
      <DialogContent>
        <TextField
          margin="dense"
          label={t('name')}
          name="name"
          fullWidth
          value={formData.name}
          onChange={handleChange}
        />
        <TextField
          margin="dense"
          label={t('phoneNumber')}
          name="phoneNumber"
          fullWidth
          value={formData.phoneNumber}
          onChange={handleChange}
        />
        <TextField
          margin="dense"
          label={t('password')}
          name="password"
          type="password"
          fullWidth
          value={formData.password}
          onChange={handleChange}
        />
        <TextField
          select
          margin="dense"
          label={t('role')}
          name="subscriptionType"
          fullWidth
          value={formData.subscriptionType}
          onChange={handleChange}
        >
          <MenuItem value="admin">{t('admin')}</MenuItem>
          <MenuItem value="user">{t('user')}</MenuItem>
        </TextField>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {t('cancel')}
        </Button>
        <Button onClick={handleSubmit} color="primary" disabled={loading}>
          {t('submit')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddUserDialog;
