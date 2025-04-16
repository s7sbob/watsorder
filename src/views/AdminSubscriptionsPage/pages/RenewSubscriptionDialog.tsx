// src/views/pages/RenewSubscriptionDialog.tsx

import React, { useState } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem } from '@mui/material'
import axios from 'src/utils/axios'

interface RenewSubscriptionDialogProps {
  open: boolean
  onClose: () => void
  sessionId: number
  onSuccess: () => void
}

const RenewSubscriptionDialog: React.FC<RenewSubscriptionDialogProps> = ({
  open,
  onClose,
  sessionId,
  onSuccess
}) => {
  const [planType, setPlanType] = useState('All Features')
  const [renewalPeriod, setRenewalPeriod] = useState('month')
  const [amountPaid, setAmountPaid] = useState<number>(0)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!planType || !renewalPeriod || !amountPaid) {
      alert('Please fill all fields.')
      return
    }
    setLoading(true)
    try {
      await axios.post('/api/subscriptions/renew', {
        sessionId,
        planType,
        renewalPeriod,
        amountPaid
      })
      onSuccess()
    } catch (error) {
      console.error(error)
      alert('Failed to renew subscription.')
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Renew Subscription</DialogTitle>
      <DialogContent>
        <TextField
          label='Plan Type'
          value={planType}
          onChange={(e) => setPlanType(e.target.value)}
          fullWidth
          margin='dense'
        />

        <TextField
          select
          label='Renewal Period'
          value={renewalPeriod}
          onChange={(e) => setRenewalPeriod(e.target.value)}
          fullWidth
          margin='dense'
        >
          <MenuItem value='month'>Month</MenuItem>
          <MenuItem value='year'>Year</MenuItem>
        </TextField>

        <TextField
          label='Amount Paid'
          type='number'
          value={amountPaid}
          onChange={(e) => setAmountPaid(Number(e.target.value))}
          fullWidth
          margin='dense'
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={loading} variant='contained' color='primary'>
          Confirm Renew
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default RenewSubscriptionDialog
