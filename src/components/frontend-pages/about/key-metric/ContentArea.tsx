import { Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

const ContentArea = () => {
  const { t } = useTranslation()
  return (
    <>
      <Typography
        variant='h2'
        mb={2}
        lineHeight={1.4}
        fontWeight={700}
        sx={{ fontSize: { xs: '34px', sm: '40px' } }}
      >
        {t('About.KeyMetric.title')}
      </Typography>
      <Typography variant='body1' lineHeight={1.9}>
        {t('About.KeyMetric.description')}
      </Typography>
    </>
  )
}

export default ContentArea
