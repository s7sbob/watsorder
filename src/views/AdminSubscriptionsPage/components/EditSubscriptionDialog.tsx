// // src/views/pages/AdminSubscriptionsPage/components/EditSubscriptionDialog.tsx
// // أو أي مسار مناسب

// import React, { useState, useEffect } from 'react'
// import {
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
//   Button,
//   TextField,
//   MenuItem
// } from '@mui/material'
// import { DatePicker } from '@mui/x-date-pickers/DatePicker'
// import dayjs from 'dayjs'
// import axios from 'src/utils/axios'
// import type { SubscriptionRenewal } from '../pages/AdminSubscriptionsPage'

// interface EditSubscriptionDialogProps {
//   open: boolean
//   onClose: () => void
//   renewal: SubscriptionRenewal
//   onSuccess: () => void
// }

// const EditSubscriptionDialog: React.FC<EditSubscriptionDialogProps> = ({
//   open,
//   onClose,
//   renewal,
//   onSuccess
// }) => {
//   // الخطة التي اختارها العميل (عرض فقط - Disabled)
//   const [planType, setPlanType] = useState<string>(renewal.planType || '')

//   // المدة التي يحددها الأدمن (month / year)
//   const [renewalPeriod, setRenewalPeriod] = useState<string>(renewal.renewalPeriod || '')

//   // المبلغ
//   const [amountPaid, setAmountPaid] = useState<number>(renewal.amountPaid || 0)

//   // تاريخ انتهاء الاشتراك
//   const [newExpireDate, setNewExpireDate] = useState<Date | null>(
//     renewal.newExpireDate ? new Date(renewal.newExpireDate) : null
//   )

//   const [loading, setLoading] = useState<boolean>(false)

//   useEffect(() => {
//     setPlanType(renewal.planType || '')
//     setRenewalPeriod(renewal.renewalPeriod || '')
//     setAmountPaid(renewal.amountPaid || 0)
//     setNewExpireDate(renewal.newExpireDate ? new Date(renewal.newExpireDate) : null)
//   }, [renewal])

//   const handleRenewalPeriodChange = (value: string) => {
//     setRenewalPeriod(value)
//     // لو تحب تحسب التاريخ أوتوماتيك
//     if (value === 'month') {
//       setNewExpireDate(dayjs().add(1, 'month').toDate())
//     } else if (value === 'year') {
//       setNewExpireDate(dayjs().add(1, 'year').toDate())
//     }
//   }

//   const handleSave = async () => {
//     if (!renewalPeriod || !newExpireDate) {
//       alert('Please fill all required fields (renewalPeriod, newExpireDate)')
//       return
//     }
//     setLoading(true)
//     try {
//       await axios.post(`/api/subscriptions/update/${renewal.id}`, {
//         renewalPeriod,
//         amountPaid,
//         newExpireDate: newExpireDate.toISOString()
//       })
//       onSuccess()
//     } catch (error: any) {
//       console.error('Error updating subscription renewal:', error)
//       alert(error?.message || 'Failed to update subscription renewal')
//     }
//     setLoading(false)
//   }

//   return (
//     <Dialog open={open} onClose={onClose}>
//       <DialogTitle>Edit Renewal Record</DialogTitle>
//       <DialogContent>
//         {/* planType للعرض فقط */}
//         <TextField
//           label='Plan Type'
//           value={planType}
//           disabled
//           fullWidth
//           margin='dense'
//         />

//         <TextField
//           select
//           label='Renewal Period'
//           value={renewalPeriod}
//           onChange={e => handleRenewalPeriodChange(e.target.value)}
//           fullWidth
//           margin='dense'
//         >
//           <MenuItem value='month'>Month</MenuItem>
//           <MenuItem value='year'>Year</MenuItem>
//         </TextField>

//         <TextField
//           label='Amount Paid'
//           type='number'
//           value={amountPaid}
//           onChange={e => setAmountPaid(Number(e.target.value))}
//           fullWidth
//           margin='dense'
//         />

//         <DatePicker
//           label='New Expiry Date'
//           value={newExpireDate ? dayjs(newExpireDate) : null}
//           onChange={newValue => setNewExpireDate(newValue ? newValue.toDate() : null)}
//           renderInput={params => <TextField {...params} fullWidth margin='dense' />}
//         />
//       </DialogContent>
//       <DialogActions>
//         <Button onClick={onClose} disabled={loading}>
//           Cancel
//         </Button>
//         <Button onClick={handleSave} disabled={loading} variant='contained' color='primary'>
//           Save
//         </Button>
//       </DialogActions>
//     </Dialog>
//   )
// }

// export default EditSubscriptionDialog
