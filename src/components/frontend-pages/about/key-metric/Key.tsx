import { Grid, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

const Key = () => {
  const { t } = useTranslation()
  const metrics = t('About.KeyMetric.metrics', { returnObjects: true }) as Array<{
    label: string
    value: string
    sub: string
  }>

  return (
    <Grid container spacing={2}>
      {metrics.map((m, i) => (
        <Grid item xs={6} key={i}>
          <Typography color='primary.main' textTransform='uppercase' fontSize='13px'>
            {m.label}
          </Typography>
          <Typography variant='h4' lineHeight={1} fontWeight={700} my={1}>
            {m.value}
          </Typography>
          <Typography variant='body2'>{m.sub}</Typography>
        </Grid>
      ))}
    </Grid>
  )
}

export default Key
