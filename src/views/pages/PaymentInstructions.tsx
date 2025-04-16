import React, { useState } from 'react'
import { Box, Typography, Button } from '@mui/material'
import { useTranslation } from 'react-i18next'
import axiosServices from 'src/utils/axios'
import { AlertColor } from '@mui/material'

interface SelectedPlan {
  planType: string
  billing: 'monthly' | 'yearly'
  price: number
}

interface PaymentInstructionsProps {
  sessionId: number
  selectedPlan: SelectedPlan
  onDone: () => void
  onAlert?: (msg: string, severity: AlertColor) => void
}

const PaymentInstructions: React.FC<PaymentInstructionsProps> = ({
  sessionId,
  selectedPlan,
  onDone,
  onAlert
}) => {
  const { t } = useTranslation()

  // استخدام السعر الذي تم تمريره في الكائن
  const { planType, billing, price } = selectedPlan

  // ملف إثبات الدفع
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0])
    }
  }

  const handleSubmit = async () => {
    if (!selectedFile) {
      onAlert?.('Please choose a payment proof image first!', 'error')
      return
    }

    setIsSubmitting(true)

    try {
      // 1) رفع الصورة
      const formData = new FormData()
      formData.append('paymentProof', selectedFile)
      await axiosServices.post(`/api/sessions/${sessionId}/payment-proof`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      // 2) إنشاء سجل في SubscriptionRenewals مع إرسال تفاصيل الخطة المختارة
      await axiosServices.post('/api/subscriptions', {
        sessionId,
        planType: planType,
        billing,
        amountPaid: price
      })

      // 3) تغيير حالة الجلسة إلى Paid وإرسالها للمدير
      await axiosServices.post(`/api/sessions/${sessionId}/send-to-manager`)

      onAlert?.(
        `Payment proof uploaded successfully. Plan = ${planType} (${billing}), Price = ${price} EGP`,
        'success'
      )
      onDone()
    } catch (error) {
      console.error('Error submitting payment proof:', error)
      onAlert?.('Failed to submit payment proof or payment request!', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Box sx={{ p: 4, minWidth: 300 }}>
      <Typography variant='h4' gutterBottom>
        {t('PaymentInstructions.title')}
      </Typography>

      <Typography variant='body1' gutterBottom>
        {t('PaymentInstructions.subTitle')}
      </Typography>

      {/* تعليمات طريقة الدفع */}
      <Box sx={{ mt: 2 }}>
        <Typography variant='body2' gutterBottom>
          {t('PaymentInstructions.vodafoneCash')}
        </Typography>
      </Box>

      {/* عرض الخطة المختارة وسعرها */}
      <Box sx={{ mt: 2 }}>
        <Typography variant='h6'>
          {t('PaymentInstructions.selectedPlan')}: {planType} ({billing})
        </Typography>
        <Typography variant='h6'>
          {t('PaymentInstructions.planPrice')}: {price} EGP
        </Typography>
      </Box>

      {/* حقل رفع إثبات الدفع */}
      <Box sx={{ mt: 2 }}>
        <input type='file' onChange={handleFileChange} />
      </Box>

      <Button
        variant='contained'
        color='primary'
        sx={{ mt: 3 }}
        disabled={!selectedFile || isSubmitting}
        onClick={handleSubmit}
      >
        {isSubmitting
          ? t('PaymentInstructions.submitting')
          : !selectedFile
          ? t('PaymentInstructions.uploadProofFirst')
          : t('PaymentInstructions.submitPayment')}
      </Button>
    </Box>
  )
}

export default PaymentInstructions
