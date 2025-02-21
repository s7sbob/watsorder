import { Box, Stack, Typography, Grid, Container } from '@mui/material';
import FeatureTitle from './FeatureTitle';

import LogoIcon from 'src/assets/images/logos/logoIcon.svg';
import whatsappLogo from 'src/assets/images/frontend-pages/homepage/whatsapp-logo.png';
import otpServices from 'src/assets/images/frontend-pages/homepage/otpservices.svg';
import ApiIntegration from 'src/assets/images/frontend-pages/homepage/api-Integration.svg';
import Automation from 'src/assets/images/frontend-pages/homepage/automation2.gif';
import Deliver from 'src/assets/images/frontend-pages/homepage/Delivery.gif';
const Features = () => {
  return (
    <Box pt={10} pb={10}>
      <Container maxWidth="lg">
        <FeatureTitle />

        <Grid container spacing={3} mt={3}>
          <Grid item xs sm={6} lg>
            <Box mb={3} bgcolor="warning.light" borderRadius="24px">
              <Box px={4} py="65px">
                <Stack direction="column" spacing={2} textAlign="center">
                  <Box textAlign="center">
                    <img src={otpServices} alt="icon1" width={120} height={120} />
                  </Box>
                  <Typography variant="h6" fontWeight={700}>
                    OTP Services{' '}
                  </Typography>
                  <Typography variant="body1">
                    this service enables you to check for your Clients Phone numbers with just
                    single click throught sending confirmation message .
                  </Typography>
                </Stack>
              </Box>
            </Box>
            <Box textAlign="center" mb={3} bgcolor="secondary.light" borderRadius="24px">
              <Box px={4} py="50px">
                <Box height="70px" paddingBottom={20}>
                  <img src={Deliver} alt="icon1" width={250} height={100} />
                </Box>
                <Stack direction="column" spacing={2} textAlign="center">
                  <Typography variant="h6" fontWeight={700}>
                    Boost your delivery services
                  </Typography>
                  <Typography variant="body1">
                    {' '}
                    Enhance your delivery Services using our automated system that enables you to
                    receive orders through Whats App system.
                  </Typography>
                </Stack>
              </Box>
            </Box>
          </Grid>
          {/* Our Services  */}
          <Grid
            item
            xs={12}
            lg={5}
            sx={{
              order: {
                xs: 3,
                lg: 2,
              },
            }}
          >
            <Box textAlign="center" mb={3} bgcolor="primary.light" borderRadius="24px">
              <Box pb="10px" px={5}>
                <img src={LogoIcon} alt="logo" height="250" width="250" />
                <Typography
                  variant="h2"
                  fontWeight="700"
                  mt={4}
                  sx={{
                    fontSize: {
                      lg: '40px',
                      xs: '30px',
                    },
                  }}
                >
                  Our Services
                </Typography>
                <Typography variant="body1" mt={2}>
                  receiving the orders through Whats App system: unique service that enables you to
                  receive your orders easily throught{' '}
                  <Typography component="span" fontWeight={600}>
                    Whats-App
                  </Typography>
                  <Typography component="span" fontWeight={600}>
                    <Box mt={2} mb={2}>
                      <img
                        src={whatsappLogo}
                        alt="icon1"
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
                lg: 3,
              },
            }}
          >
            {/* Api integration services  */}
            <Box textAlign="center" mb={3} bgcolor="success.light" borderRadius="24px">
              <Box px={4} py="65px">
                <Stack direction="column" spacing={2} textAlign="center">
                  <Box textAlign="center">
                    <img src={ApiIntegration} alt="icon1" width={220} height={150} />
                  </Box>
                  <Typography variant="h6" fontWeight={700}>
                    Api integrations services
                  </Typography>
                  <Typography variant="body1">
                    {' '}
                    this enables you to use our multible services and integrate with any external
                    systems .
                  </Typography>
                </Stack>
              </Box>
            </Box>
            <Box textAlign="center" mb={3} bgcolor="error.light" borderRadius="24px">
              <Box px={4} py="65px">
                <Stack direction="column" spacing={2} textAlign="center">
                  <Box textAlign="center">
                    <img src={Automation} alt="icon1" width={250} height={150} />
                  </Box>
                  <Typography variant="h6" fontWeight={700}>
                    Automation services .
                  </Typography>
                  <Typography variant="body1">
                    {' '}
                    A rich collection for seamless user experiences.
                  </Typography>
                </Stack>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Features;
