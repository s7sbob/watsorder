// src/views/pages/PaymentInstructions.tsx
import React, { useState } from 'react'
import { Box, Typography, Button } from '@mui/material'
import { useTranslation } from 'react-i18next'
import axiosServices from 'src/utils/axios'
import { AlertColor } from '@mui/material'

interface PaymentInstructionsProps {
  sessionId: number
  planType: string  // أضفنا هذا؛ سيمرر من الكود الذي يستدعي PaymentInstructions
  onDone: () => void
  onAlert?: (msg: string, severity: AlertColor) => void
}

const PaymentInstructions: React.FC<PaymentInstructionsProps> = ({ sessionId, planType, onDone, onAlert }) => {
  const { t } = useTranslation()

  // ملف الصورة الذي يختاره المستخدم
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // هنا نحدد السعر بناءً على الخطة
  let price = 500 // الافتراضي = 500 للـ OTP
  if (planType === 'All Features') {
    price = 700
  }

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
      // 1) رفع الصورة (Payment Proof)
      const formData = new FormData()
      formData.append('paymentProof', selectedFile) // اسم الحقل يطابق multer.single('paymentProof')

      await axiosServices.post(`/api/sessions/${sessionId}/payment-proof`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      // 2) بعد نجاح الرفع => إرسال الطلب لجعل الحالة Paid (مثلاً)
      await axiosServices.post(`/api/sessions/${sessionId}/send-to-manager`)

      onAlert?.(`Payment proof uploaded successfully. Plan = ${planType}, Price = ${price} EGP`, 'success')
      onDone() // إغلاق الـ Dialog أو عمل أي إجراء آخر
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

      {/* سطور توضح طريقة الدفع ... */}
      <Box sx={{ mt: 2 }}>
        <Typography variant='body2' gutterBottom>
          {t('PaymentInstructions.vodafoneCash')}
        </Typography>
        {/* ... etc ... */}
      </Box>

      {/* نعرض للمستخدم قيمة السعر المطلوبة لهذه الخطة */}
      <Box sx={{ mt: 2 }}>
        <Typography variant='h6'>
          {t('PaymentInstructions.selectedPlan')}: {planType}
        </Typography>
        <Typography variant='h6'>
          {t('PaymentInstructions.planPrice')}: {price} EGP
        </Typography>
      </Box>

      {/* حقل واحد لاختيار الملف */}
      <Box sx={{ mt: 2 }}>
        <input type='file' onChange={handleFileChange} />
      </Box>

      {/* زر موحد لرفع إثبات الدفع وتحويل الحالة إلى Paid */}
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
