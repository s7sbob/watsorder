// src/components/AddDataPopup.tsx
import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, MenuItem } from '@mui/material';

interface AddDataPopupProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  title: string;
  fields: { label: string; name: string; options?: { value: any; label: string }[] }[];
}

const AddDataPopup: React.FC<AddDataPopupProps> = ({ open, onClose, onSubmit, title, fields }) => {
  const [formData, setFormData] = useState<any>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    onSubmit(formData);
    setFormData({});
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {fields.map((field) => (
          field.options ? (
            <TextField
              select
              key={field.name}
              margin="dense"
              label={field.label}
              name={field.name}
              fullWidth
              variant="outlined"
              onChange={handleChange}
            >
              {field.options.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <TextField
              key={field.name}
              margin="dense"
              label={field.label}
              name={field.name}
              fullWidth
              variant="outlined"
              onChange={handleChange}
            />
          )
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">Cancel</Button>
        <Button onClick={handleSubmit} color="primary">Submit</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddDataPopup;
