import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField
} from '@mui/material'
import { useTranslation } from 'react-i18next'

interface CancelOrderDialogProps {
  open: boolean
  orderId: number | null
  onClose: () => void
  onSubmit: (reason: string) => void
}

const CancelOrderDialog: React.FC<CancelOrderDialogProps> = ({
  open,
  orderId,
  onClose,
  onSubmit
}) => {
  const { t } = useTranslation()
  const [reason, setReason] = useState<string>('')

  // reset on open
  useEffect(() => {
    if (open) setReason('')
  }, [open])

  const handleSubmit = () => {
    onSubmit(reason.trim())
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>
        {t('Orders.CancelOrderDialog.title', {
          orderId: orderId ?? ''
        })}
      </DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          multiline
          rows={4}
          label={t('Orders.CancelOrderDialog.reasonLabel', 'سبب الرفض')}
          value={reason}
          onChange={e => setReason(e.target.value)}
          margin='normal'
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          {t('Orders.CancelOrderDialog.buttons.cancel', 'إلغاء')}
        </Button>
        <Button
          onClick={handleSubmit}
          variant='contained'
          color='error'
          disabled={!reason.trim()}
        >
          {t('Orders.CancelOrderDialog.buttons.submit', 'إرسال')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default CancelOrderDialog
