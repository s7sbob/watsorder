import { Box, Stack, Typography, Grid, Container } from '@mui/material'
import FeatureTitle from './FeatureTitle'

import LogoIcon from 'src/assets/images/logos/logoIcon.svg'
import whatsappLogo from 'src/assets/images/frontend-pages/homepage/whatsapp-logo.png'
import otpServices from 'src/assets/images/frontend-pages/homepage/otpservices.svg'
import ApiIntegration from 'src/assets/images/frontend-pages/homepage/api-Integration.svg'
import Automation from 'src/assets/images/frontend-pages/homepage/automation2.gif'
import Deliver from 'src/assets/images/frontend-pages/homepage/Delivery.gif'

// الترجمة
import { useTranslation } from 'react-i18next'

const Features = () => {
  const { t } = useTranslation()

  return (
    <Box pt={10} pb={10}>
      <Container maxWidth='lg'>
        <FeatureTitle />

        <Grid container spacing={3} mt={3}>
          <Grid item xs sm={6} lg>
            {/* OTP Services */}
            <Box mb={3} bgcolor='warning.light' borderRadius='24px'>
              <Box px={4} py='65px'>
                <Stack direction='column' spacing={2} textAlign='center'>
                  <Box textAlign='center'>
                    <img src={otpServices} alt='icon1' width={120} height={120} />
                  </Box>
                  <Typography variant='h6' fontWeight={700}>
                    {t('HomePage.Features.otpServices.title')}
                  </Typography>
                  <Typography variant='body1'>
                    {t('HomePage.Features.otpServices.desc')}
                  </Typography>
                </Stack>
              </Box>
            </Box>

            {/* Delivery */}
            <Box textAlign='center' mb={3} bgcolor='secondary.light' borderRadius='24px'>
              <Box px={4} py='50px'>
                <Box height='70px' paddingBottom={20}>
                  <img src={Deliver} alt='icon1' width={250} height={100} />
                </Box>
                <Stack direction='column' spacing={2} textAlign='center'>
                  <Typography variant='h6' fontWeight={700}>
                    {t('HomePage.Features.delivery.title')}
                  </Typography>
                  <Typography variant='body1'>
                    {t('HomePage.Features.delivery.desc')}
                  </Typography>
                </Stack>
              </Box>
            </Box>
          </Grid>

          {/* Our Services */}
          <Grid
            item
            xs={12}
            lg={5}
            sx={{
              order: {
                xs: 3,
                lg: 2
              }
            }}
          >
            <Box textAlign='center' mb={3} bgcolor='primary.light' borderRadius='24px'>
              <Box pb='10px' px={5}>
                <img src={LogoIcon} alt='logo' height='250' width='250' />
                <Typography
                  variant='h2'
                  fontWeight='700'
                  mt={4}
                  sx={{
                    fontSize: {
                      lg: '40px',
                      xs: '30px'
                    }
                  }}
                >
                  {t('HomePage.Features.ourServicesTitle')}
                </Typography>
                <Typography variant='body1' mt={2}>
                  {t('HomePage.Features.ourServicesDesc.part1')}{' '}
                  <Typography component='span' fontWeight={600}>
                    {t('HomePage.Features.ourServicesDesc.part2')}
                  </Typography>
                  <Typography component='span' fontWeight={600}>
                    <Box mt={2} mb={2}>
                      <img
                        src={whatsappLogo}
                        alt='icon1'
                        width={5}
                        height={5}
                        style={{ width: '30%', height: 'auto' }}
                      />
                    </Box>
                    .
                  </Typography>
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid
            item
            xs
            sm={6}
            lg
            sx={{
              order: {
                xs: 2,
                lg: 3
              }
            }}
          >
            {/* Api integration services */}
            <Box textAlign='center' mb={3} bgcolor='success.light' borderRadius='24px'>
              <Box px={4} py='65px'>
                <Stack direction='column' spacing={2} textAlign='center'>
                  <Box textAlign='center'>
                    <img src={ApiIntegration} alt='icon1' width={220} height={150} />
                  </Box>
                  <Typography variant='h6' fontWeight={700}>
                    {t('HomePage.Features.apiIntegration.title')}
                  </Typography>
                  <Typography variant='body1'>
                    {t('HomePage.Features.apiIntegration.desc')}
                  </Typography>
                </Stack>
              </Box>
            </Box>

            {/* Automation services */}
            <Box textAlign='center' mb={3} bgcolor='error.light' borderRadius='24px'>
              <Box px={4} py='65px'>
                <Stack direction='column' spacing={2} textAlign='center'>
                  <Box textAlign='center'>
                    <img src={Automation} alt='icon1' width={250} height={150} />
                  </Box>
                  <Typography variant='h6' fontWeight={700}>
                    {t('HomePage.Features.automation.title')}
                  </Typography>
                  <Typography variant='body1'>
                    {t('HomePage.Features.automation.desc')}
                  </Typography>
                </Stack>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  )
}

export default Features
