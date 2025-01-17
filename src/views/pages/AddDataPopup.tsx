// src/components/AddDataPopup.tsx
import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem
} from '@mui/material'
import Autocomplete from '@mui/material/Autocomplete'

// تعريف واجهة الحقل الواحد
interface PopupField {
  label: string
  name: string
  options?: { value: any; label: string }[]     // لو كان الحقل من نوع select
  isMultipleKeywords?: boolean                  // لو أردنا استخدام Autocomplete متعدد
}

// واجهة الخصائص المقبولة في المكوّن
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
  const [formData, setFormData] = useState<any>({})

  // عند تغيير القيمة في الحقول العادية
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  // عند النقر على زر "Submit"
  const handleSubmit = () => {
    onSubmit(formData)
    setFormData({})
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='sm'>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {fields.map(field => {
          // (1) إذا كان لدينا حقل يريد Autocomplete متعدد:
          if (field.isMultipleKeywords) {
            // نتوقّع أن formData[field.name] يكون مصفوفة من السلاسل النصية
            const currentValue: string[] = formData[field.name] || []

            return (
              <Autocomplete
                key={field.name}
                multiple
                freeSolo
                options={[]} // يمكن وضع قائمة افتراضية للاقتراحات هنا إن وجدت
                value={currentValue}
                onChange={(event, newValue) => {
                  // newValue مصفوفة من السلاسل النصية
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
          // (2) إذا كان الحقل من نوع select (أي لديه options)
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
          // (3) الحقول النصية العادية
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
