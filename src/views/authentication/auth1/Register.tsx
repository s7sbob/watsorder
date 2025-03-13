import { Grid, Box } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import img1 from 'src/assets/images/backgrounds/login-bg.svg';
import Logo from 'src/layouts/full/shared/logo/Logo';
import AuthRegisterFlow from '../authForms/AuthRegister';

const Register: React.FC = () => (
  <PageContainer title="Register" description="this is Register page">
    <Grid container spacing={0} sx={{ overflowX: 'hidden' }}>
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
        <Box px={3}>
          <Logo />
        </Box>
        <Box
          alignItems="center"
          justifyContent="center"
          height="calc(100vh - 75px)"
          sx={{
            display: { xs: 'none', lg: 'flex' },
          }}
        >
          <img
            src={img1}
            alt="bg"
            style={{ width: '100%', maxWidth: '500px' }}
          />
        </Box>
      </Grid>

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
        <Box p={2} sx={{ width: '100%', maxWidth: 400 }}>
          <AuthRegisterFlow />
        </Box>
      </Grid>
    </Grid>
  </PageContainer>
);

export default Register;
