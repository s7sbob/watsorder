// src/components/AddDataPopup.tsx

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  Box,
  Typography
} from '@mui/material'
import Autocomplete from '@mui/material/Autocomplete'

/**
 * تعريف واجهة الحقل الواحد
 */
interface PopupField {
  label: string
  name: string
  // لو كان الحقل select (خيارات منسدلة)
  options?: { value: any; label: string }[]
  // لو أردنا استخدام Autocomplete متعدد (مثلاً Keywords)
  isMultipleKeywords?: boolean
  // لو كان الحقل رفع ملف (صورة/ميديا)
  isFile?: boolean
  // لو كان رفع عدة ملفات مرة واحدة
  multiple?: boolean
}

/**
 * واجهة الخصائص المقبولة في المكون
 */
interface AddDataPopupProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  title: string
  fields: PopupField[]
}

const AddDataPopup: React.FC<AddDataPopupProps> = ({
  open,
  onClose,
  onSubmit,
  title,
  fields
}) => {
  // تخزين القيم في state
  // بالنسبة للحقل النصي: formData[field.name] = string
  // بالنسبة لحقل Autocomplete: formData[field.name] = string[]
  // بالنسبة لحقل الملفات: formData[field.name] = File (أو File[] لو multiple=true)
  const [formData, setFormData] = useState<Record<string, any>>({})

  useEffect(() => {
    if (!open) {
      setFormData({})
    }
  }, [open])

  // تحديث الحقول النصية
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  // عند الضغط على زر Submit
  const handleSubmit = () => {
    onSubmit(formData)
    setFormData({})
    onClose()
  }

  // رفع ملف/ملفات: نقبل FileList ونخزن إما ملف واحد أو مصفوفة ملفات بناءً على الخاصية multiple
  const handleFileChange = (
    fieldName: string,
    fileList: FileList | null,
    multiple: boolean
  ) => {
    if (!fileList || fileList.length === 0) {
      setFormData(prev => ({
        ...prev,
        [fieldName]: multiple ? [] : undefined
      }))
      return
    }

    const filesArray = Array.from(fileList)
    if (multiple) {
      setFormData(prev => ({
        ...prev,
        [fieldName]: filesArray
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [fieldName]: filesArray[0]
      }))
    }
  }

  // إزالة الملفات بالكامل للحقل المحدد
  const handleRemoveAllFiles = (fieldName: string, multiple: boolean) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: multiple ? [] : undefined
    }))
  }

  // عرض المعاينة للملفات باستخدام URL.createObjectURL
  const renderPreviews = (fieldName: string, multiple: boolean) => {
    const value = formData[fieldName]
    if (!value) return null

    if (multiple && Array.isArray(value)) {
      return (
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
          {value.map((file: File, idx: number) => {
            if (file.type.startsWith('image/')) {
              return (
                <Box key={idx} textAlign='center'>
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    style={{ width: 100, height: 100, objectFit: 'cover' }}
                  />
                  <Typography variant='caption'>{file.name}</Typography>
                </Box>
              )
            }
            return (
              <Box key={idx} textAlign='center'>
                <Typography variant='body2'>{file.name}</Typography>
              </Box>
            )
          })}
        </Box>
      )
    } else if (!multiple && value) {
      const file = value as File
      if (file.type.startsWith('image/')) {
        return (
          <Box sx={{ mt: 2 }} textAlign='center'>
            <img
              src={URL.createObjectURL(file)}
              alt={file.name}
              style={{ width: 100, height: 100, objectFit: 'cover' }}
            />
            <Typography variant='caption'>{file.name}</Typography>
          </Box>
        )
      }
      return <Box mt={2}>{file.name}</Box>
    }
    return null
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='sm'>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {fields.map(field => {
          // (1) Autocomplete متعدد (مثل Keywords)
          if (field.isMultipleKeywords) {
            const currentValue: string[] = formData[field.name] || []
            return (
              <Autocomplete
                key={field.name}
                multiple
                freeSolo
                options={[]} // يمكن وضع اقتراحات هنا
                value={currentValue}
                onChange={(_event, newValue) => {
                  setFormData(prev => ({
                    ...prev,
                    [field.name]: newValue
                  }))
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    margin='dense'
                    label={field.label}
                    variant='outlined'
                    fullWidth
                  />
                )}
                sx={{ mt: 2 }}
              />
            )
          }
          // (2) حقل select
          else if (field.options) {
            return (
              <TextField
                select
                key={field.name}
                margin='dense'
                label={field.label}
                name={field.name}
                fullWidth
                variant='outlined'
                onChange={handleTextChange}
                sx={{ mt: 2 }}
              >
                {field.options.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            )
          }
          // (3) حقل رفع ملف (isFile)
          else if (field.isFile) {
            const multiple = !!field.multiple
            const hasValue = formData[field.name]
            return (
              <Box key={field.name} mt={2}>
                <Button variant='contained' component='label'>
                  {field.label}
                  <input
                    type='file'
                    hidden
                    multiple={multiple}
                    accept='image/*'
                    onChange={(e) =>
                      handleFileChange(field.name, e.target.files, multiple)
                    }
                  />
                </Button>
                {hasValue && (
                  <Button
                    variant='outlined'
                    color='error'
                    onClick={() => handleRemoveAllFiles(field.name, multiple)}
                    sx={{ ml: 2 }}
                  >
                    Remove
                  </Button>
                )}
                {renderPreviews(field.name, multiple)}
              </Box>
            )
          }
          // (4) حقول نصية عادية
          else {
            return (
              <TextField
                key={field.name}
                margin='dense'
                label={field.label}
                name={field.name}
                fullWidth
                variant='outlined'
                onChange={handleTextChange}
                sx={{ mt: 2 }}
              />
            )
          }
        })}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color='secondary'>
          Cancel
        </Button>
        <Button onClick={handleSubmit} color='primary' variant='contained'>
          Submit
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default AddDataPopup
