// src/views/pages/common/AddDataPopup.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  Box,
  Typography,
  Switch
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { useTranslation } from 'react-i18next';

export interface PopupField {
  label: string;
  name: string;
  options?: { value: any; label: string }[];
  isMultipleKeywords?: boolean;
  isFile?: boolean;
  multiple?: boolean;
  autoFocus?: boolean;
  type?: string;
  defaultValue?: string;
  style?: React.CSSProperties;
}

interface AddDataPopupProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  title: string | React.ReactNode;
  fields: PopupField[];
}

const AddDataPopup: React.FC<AddDataPopupProps> = ({ open, onClose, onSubmit, title, fields }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (open) {
      const initialData: Record<string, any> = {};
      fields.forEach(field => {
        initialData[field.name] = field.defaultValue !== undefined
          ? field.defaultValue
          : (field.type === 'checkbox' ? false : '');
      });
      setFormData(initialData);
    } else {
      setFormData({});
    }
  }, [open, fields]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = (fieldName: string, fileList: FileList | null, multiple: boolean) => {
    if (!fileList || fileList.length === 0) {
      setFormData(prev => ({ ...prev, [fieldName]: multiple ? [] : undefined }));
      return;
    }
    const filesArray = Array.from(fileList);
    setFormData(prev => ({ ...prev, [fieldName]: multiple ? filesArray : filesArray[0] }));
  };

  const handleRemoveAllFiles = (fieldName: string, multiple: boolean) => {
    setFormData(prev => ({ ...prev, [fieldName]: multiple ? [] : undefined }));
  };

  const renderPreviews = (fieldName: string, multiple: boolean) => {
    const value = formData[fieldName];
    if (!value) return null;
    if (multiple && Array.isArray(value)) {
      return (
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
          {value.map((file: File, idx: number) => (
            file.type.startsWith('image/') ? (
              <Box key={idx} textAlign="center">
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  style={{ width: 100, height: 100, objectFit: 'cover' }}
                />
                <Typography variant="caption">{file.name}</Typography>
              </Box>
            ) : (
              <Box key={idx} textAlign="center">
                <Typography variant="body2">{file.name}</Typography>
              </Box>
            )
          ))}
        </Box>
      );
    } else if (!multiple && value) {
      const file = value as File;
      return (
        <Box mt={2} textAlign="center">
          {file.type.startsWith('image/') ? (
            <>
              <img
                src={URL.createObjectURL(file)}
                alt={file.name}
                style={{ width: 100, height: 100, objectFit: 'cover' }}
              />
              <Typography variant="caption">{file.name}</Typography>
            </>
          ) : (
            <Typography variant="body2">{file.name}</Typography>
          )}
        </Box>
      );
    }
    return null;
  };

  const handleSubmit = () => {
    onSubmit(formData);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {fields.map(field => {
          if (field.isMultipleKeywords) {
            const currentValue: string[] = formData[field.name] || [];
            return (
              <Autocomplete
                key={field.name}
                multiple
                freeSolo
                options={[]}
                value={currentValue}
                onChange={(_e, newVal) => setFormData(prev => ({ ...prev, [field.name]: newVal }))}
                renderInput={params => (
                  <TextField
                    {...params}
                    margin="dense"
                    label={field.label}
                    variant="outlined"
                    fullWidth
                  />
                )}
                sx={{ mt: 2 }}
              />
            );
          } else if (field.options) {
            return (
              <TextField
                select
                key={field.name}
                margin="dense"
                label={field.label}
                name={field.name}
                fullWidth
                variant="outlined"
                onChange={handleTextChange}
                value={formData[field.name] || ''}
                sx={{ mt: 2, ...field.style }}
              >
                {field.options.map(opt => (
                  <MenuItem key={opt.value} value={opt.value.toString()}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
            );
          } else if (field.isFile) {
            const multiple = !!field.multiple;
            const hasValue = formData[field.name];
            return (
              <Box key={field.name} mt={2}>
                <Button variant="contained" component="label">
                  {field.label}
                  <input
                    type="file"
                    hidden
                    multiple={multiple}
                    onChange={e => handleFileChange(field.name, e.target.files, multiple)}
                  />
                </Button>
                {hasValue && (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => handleRemoveAllFiles(field.name, multiple)}
                    sx={{ ml: 2 }}
                  >
                    {t('AddDataPopup.buttons.remove')}
                  </Button>
                )}
                {renderPreviews(field.name, multiple)}
              </Box>
            );
          } else if (field.type === 'checkbox') {
            const checked = !!formData[field.name];
            return (
              <Box
                key={field.name}
                display="flex"
                alignItems="center"
                mt={2}
                style={field.style}
              >
                <Switch
                  checked={checked}
                  onChange={(_e, newVal) =>
                    setFormData(prev => ({ ...prev, [field.name]: newVal }))
                  }
                />
                <Typography>{field.label}</Typography>
              </Box>
            );
          } else {
            return (
              <TextField
                key={field.name}
                margin="dense"
                label={field.label}
                name={field.name}
                fullWidth
                variant="outlined"
                onChange={handleTextChange}
                value={formData[field.name] || ''}
                autoFocus={field.autoFocus}
                type={field.type}
                sx={{ mt: 2, ...field.style }}
              />
            );
          }
        })}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">
          {t('AddDataPopup.buttons.cancel')}
        </Button>
        <Button onClick={handleSubmit} color="primary" variant="contained">
          {t('AddDataPopup.buttons.submit')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddDataPopup;