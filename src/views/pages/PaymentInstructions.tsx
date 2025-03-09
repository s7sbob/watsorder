import React from 'react'
import { Box, Typography, Button } from '@mui/material'
import { useTranslation } from 'react-i18next'

interface PaymentInstructionsProps {
  onDone: () => void
}

const PaymentInstructions: React.FC<PaymentInstructionsProps> = ({ onDone }) => {
  const { t } = useTranslation()

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant='h4' gutterBottom>
        {t('PaymentInstructions.title')}
      </Typography>
      <Typography variant='body1' gutterBottom>
        {t('PaymentInstructions.subTitle')}
      </Typography>

      <Box sx={{ mt: 2 }}>
        <Typography variant='h6'>{t('PaymentInstructions.vodafoneCash')}</Typography>
        <Typography variant='h6'>{t('PaymentInstructions.instaPay')}</Typography>
        <Typography variant='h6'>{t('PaymentInstructions.assistance')}</Typography>
      </Box>

      <Button variant='contained' color='primary' sx={{ mt: 4 }} onClick={onDone}>
        {t('PaymentInstructions.doneButton')}
      </Button>
    </Box>
  )
}

export default PaymentInstructions
