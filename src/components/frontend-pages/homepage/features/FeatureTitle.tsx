import { Box, Grid, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

const FeatureTitle = () => {
  const { t } = useTranslation()

  return (
    <Grid container spacing={3} justifyContent='center'>
      <Grid item xs={12} lg={6} textAlign='center'>
        <Typography variant='body1'>
          {t('HomePage.FeaturesTitle.descPart1')}{' '}
          <Box fontWeight={500} component='span'>
            {t('HomePage.FeaturesTitle.descPart2')}
          </Box>
          , {t('HomePage.FeaturesTitle.descPart3')}
        </Typography>
      </Grid>
    </Grid>
  )
}

export default FeatureTitle
