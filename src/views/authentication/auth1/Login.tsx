import { Link } from 'react-router-dom';
import { Grid, Box, Stack, Typography } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import img1 from 'src/assets/images/backgrounds/login-bg.svg';
import Logo from 'src/layouts/full/shared/logo/Logo';
import AuthLogin from '../authForms/AuthLogin';
import { useTranslation } from 'react-i18next';

const Login = () => {
  const { t } = useTranslation();
  return (
    <PageContainer title={t('loginPage.title') as string} description={t('loginPage.description') as string}>
                  <Box px={3}>
              <Logo />
            </Box>
      <Grid container spacing={0} sx={{ overflowX: 'hidden' }}>
        {/* ←— FORM ON THE LEFT */}
        
        <Grid
          item
          xs={12}
          sm={12}
          lg={5}
          xl={4}
          display="flex"
          justifyContent="center"
          alignItems="center"
        >
          <Box p={4} sx={{ width: '100%', maxWidth: 400 }}>
            <AuthLogin />
            <Stack direction="row" spacing={1} mt={3} justifyContent="center">
              <Typography color="textSecondary" variant="h6" fontWeight="500">
                {t('loginPage.newToWatsOrder')}
              </Typography>
              <Typography
                component={Link}
                to="/auth/register"
                fontWeight="500"
                sx={{ textDecoration: 'none', color: 'primary.main' }}
              >
                {t('loginPage.link.createAccount')}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} mt={2} justifyContent="center">
              <Typography color="textSecondary" variant="h6" fontWeight="500">
                {t('loginPage.forgotPassword')}
              </Typography>
              <Typography
                component={Link}
                to="/auth/forgot-password"
                fontWeight="500"
                sx={{ textDecoration: 'none', color: 'primary.main' }}
              >
                {t('loginPage.link.resetPassword')}
              </Typography>
            </Stack>
          </Box>
        </Grid>

        {/* ILLUSTRATION ON THE RIGHT */}
        <Grid
          item
          xs={12}
          sm={12}
          lg={7}
          xl={8}
          sx={{
            position: 'relative',
            '&:before': {
              content: '""',
              background: 'radial-gradient(#d2f1df, #d3d7fa, #bad8f4)',
              backgroundSize: '400% 400%',
              animation: 'gradient 15s ease infinite',
              position: 'absolute',
              height: '100%',
              width: '100%',
              opacity: '0.3',
            },
          }}
        >
          <Box position="relative">

            <Box
              alignItems="center"
              justifyContent="center"
              height="calc(100vh - 75px)"
              sx={{ display: { xs: 'none', lg: 'flex' } }}
            >
              <img src={img1} alt="bg" style={{ width: '100%', maxWidth: '500px' }} />
            </Box>
          </Box>
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default Login;
