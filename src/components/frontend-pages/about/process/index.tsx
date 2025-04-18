
import { Box, Container, Grid, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { styled } from '@mui/material/styles'
import Icon1 from 'src/assets/images/svgs/icon-briefcase.svg'
import Icon2 from 'src/assets/images/frontend-pages/homepage/feature-apps.png'
import Icon3 from 'src/assets/images/svgs/icon-speech-bubble.svg'
import Icon4 from 'src/assets/images/svgs/icon-favorites.svg'

const stepsIcons = [Icon1, Icon2, Icon3, Icon4]

const StepBox = styled(Box)(({ theme }) => ({
  textAlign: 'center',
  px: 2,
  py: 4,
  backgroundColor: theme.palette.background.paper,
  borderRadius: '8px'
}))

const Process = () => {
  const { t } = useTranslation()
  const steps = t('About.Process.steps', { returnObjects: true }) as string[]

  return (
    <Box pt={10} pb={10}>
      <Container maxWidth='lg'>
        <Typography
          variant='h4'
          fontWeight={700}
          sx={{ fontSize: { lg: '40px', xs: '35px' }, textAlign: 'center', mb: 6 }}
        >
          {t('About.Process.title')}
        </Typography>
        <Grid container spacing={4}>
          {steps.map((step, idx) => (
            <Grid item xs={12} sm={6} lg={3} key={idx}>
              <StepBox>
                <img src={stepsIcons[idx]} alt={step} width={40} height={40} />
                <Typography variant='h6' mt={2}>
                  {step}
                </Typography>
              </StepBox>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  )
}

export default Process
