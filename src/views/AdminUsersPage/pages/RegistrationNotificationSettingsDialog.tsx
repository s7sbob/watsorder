import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Switch,
  FormControlLabel,
  TextField,
  Alert,
  CircularProgress,
} from '@mui/material';
import axiosServices from 'src/utils/axios';

interface RegistrationSettings {
  isActive: boolean;
  notificationPhoneNumber: string;
  notificationMessage: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

const RegistrationNotificationSettingsDialog: React.FC<Props> = ({ open, onClose }) => {
  const [settings, setSettings] = useState<RegistrationSettings>({
    isActive: false,
    notificationPhoneNumber: '',
    notificationMessage: '',
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  useEffect(() => {
    if (open) {
      setLoading(true);
      // جلب الإعدادات الحالية من الباك إند
      axiosServices
        .get('/api/registration-notification/settings')
        .then((res) => {
          setSettings(res.data);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setError(err?.response?.data?.message || 'Error fetching settings');
          setLoading(false);
        });
    }
  }, [open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await axiosServices.post('/api/registration-notification/settings', settings);
      setSuccess('Settings updated successfully');
      setLoading(false);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error updating settings');
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Registration Notification Settings</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        {loading ? (
          <CircularProgress />
        ) : (
          <>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.isActive}
                  onChange={handleChange}
                  name="isActive"
                />
              }
              label="Activate Notification"
            />
            <TextField
              margin="dense"
              label="Notification Phone Number"
              fullWidth
              name="notificationPhoneNumber"
              value={settings.notificationPhoneNumber}
              onChange={handleChange}
            />
            <TextField
              margin="dense"
              label="Notification Message"
              fullWidth
              multiline
              minRows={3}
              name="notificationMessage"
              value={settings.notificationMessage}
              onChange={handleChange}
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" color="primary" disabled={loading}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RegistrationNotificationSettingsDialog;
