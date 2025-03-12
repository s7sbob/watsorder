import React, { useState, useEffect } from 'react';
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

interface EditUserDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: {
    ID: number;
    name: string;
    phoneNumber: string;
    subscriptionType: string;
    subscriptionStart?: string;
    subscriptionEnd?: string;
    maxSessions?: number;
    subUserRole?: string;
    parentId?: number;
  };
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

const EditUserDialog: React.FC<EditUserDialogProps> = ({ open, onClose, onSuccess, user }) => {
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

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phoneNumber: user.phoneNumber || '',
        password: '',
        subscriptionType: user.subscriptionType || 'user',
        subscriptionStart: user.subscriptionStart || '',
        subscriptionEnd: user.subscriptionEnd || '',
        maxSessions: user.maxSessions || 1,
        subUserRole: user.subUserRole || '',
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await axios.post(`/api/users/${user.ID}/update`, formData);
      onSuccess();
    } catch (error: any) {
      console.error(error);
      alert(error.message || t('errorUpdatingUser'));
    }
    setLoading(false);
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>{t('editUser')}</DialogTitle>
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
          helperText={t('leaveBlankToKeepCurrent')}
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
          <MenuItem value="banned">{t('banned')}</MenuItem>
        </TextField>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {t('cancel')}
        </Button>
        <Button onClick={handleSubmit} color="primary" disabled={loading}>
          {t('save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditUserDialog;
