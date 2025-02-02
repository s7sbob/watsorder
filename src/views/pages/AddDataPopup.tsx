// src/components/AddDataPopup.tsx

import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  Box
} from '@mui/material'
import Autocomplete from '@mui/material/Autocomplete'

/**
 * تعريف واجهة الحقل الواحد
 */
interface PopupField {
  label: string
  name: string
  options?: { value: any; label: string }[]     // لو كان الحقل من نوع select
  isMultipleKeywords?: boolean                  // لو أردنا استخدام Autocomplete متعدد
  isFile?: boolean                              // لو كان الحقل رفع ملف (صورة/ميديا)
}

/**
 * واجهة الخصائص المقبولة في المكوّن
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
  // formData سيحمل القيم المُدخلة من المستخدم لكل حقل
  // بالنسبة للحقول العادية => formData[field.name] = "القيمة"
  // بالنسبة لحقل الملف => formData[field.name] = { base64: string, mimetype: string, filename: string }
  const [formData, setFormData] = useState<any>({})

  // عند تغيير القيمة في الحقول العادية
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  // عند النقر على زر "Submit"
  const handleSubmit = () => {
    onSubmit(formData)
    // تفريغ الـ formData
    setFormData({})
    onClose()
  }

  // دالة رفع الملف (صورة/ميديا) وتحويله إلى Base64
  const handleFileChange = (fieldName: string, file?: File) => {
    if (!file) {
      // لو المستخدم ألغى الاختيار
      setFormData((prev: any) => ({
        ...prev,
        [fieldName]: undefined
      }))
      return
    }

    const reader = new FileReader()
    reader.onload = e => {
      if (e.target?.result) {
        const base64String = e.target.result.toString()
        const justBase64 = base64String.split(',')[1] // الجزء بعد "base64,"
        setFormData((prev: any) => ({
          ...prev,
          [fieldName]: {
            base64: justBase64,
            mimetype: file.type,
            filename: file.name
          }
        }))
      }
    }
    reader.readAsDataURL(file)
  }

  // دالة لإزالة الملف
  const handleRemoveFile = (fieldName: string) => {
    setFormData((prev: any) => ({
      ...prev,
      [fieldName]: undefined
    }))
  }

  // عرض Preview للصورة/الميديا (لو كانت صورة)
  const renderFilePreview = (fieldName: string) => {
    const fileData = formData[fieldName]
    if (!fileData) return null

    // إذا كانت mimetype صورة => نعرضها
    if (fileData.mimetype?.startsWith('image/')) {
      return (
        <Box mt={2}>
          <img
            src={`data:${fileData.mimetype};base64,${fileData.base64}`}
            alt={fileData.filename}
            style={{ maxWidth: '200px', maxHeight: '200px' }}
          />
        </Box>
      )
    }

    // أو لو أردت عرض اسم الملف فقط:
    return <Box mt={2}>{fileData.filename}</Box>
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='sm'>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {fields.map(field => {
          // ============= (1) Autocomplete متعدد =============
          if (field.isMultipleKeywords) {
            const currentValue: string[] = formData[field.name] || []
            return (
              <Autocomplete
                key={field.name}
                multiple
                freeSolo
                options={[]} // يمكن وضع قائمة افتراضية للاقتراحات هنا
                value={currentValue}
                onChange={(event, newValue) => {
                  setFormData({ ...formData, [field.name]: newValue })
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

          // ============= (2) حقل select =============
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
                onChange={handleChange}
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

          // ============= (3) حقل ملف (isFile) =============
          else if (field.isFile) {
            const fileData = formData[field.name]
            return (
              <Box key={field.name} mt={2}>
                <Button variant='contained' component='label'>
                  {field.label}
                  <input
                    type='file'
                    hidden
                    onChange={e =>
                      handleFileChange(
                        field.name,
                        e.target.files?.[0]
                      )
                    }
                  />
                </Button>
                {/* زر إزالة الملف (لو وجد ملف بالفعل) */}
                {fileData && (
                  <Button
                    variant='outlined'
                    color='error'
                    onClick={() => handleRemoveFile(field.name)}
                    sx={{ ml: 2 }}
                  >
                    Remove
                  </Button>
                )}
                {/* عرض المعاينة إن وجد */}
                {renderFilePreview(field.name)}
              </Box>
            )
          }

          // ============= (4) حقول نصية عادية =============
          else {
            return (
              <TextField
                key={field.name}
                margin='dense'
                label={field.label}
                name={field.name}
                fullWidth
                variant='outlined'
                onChange={handleChange}
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
