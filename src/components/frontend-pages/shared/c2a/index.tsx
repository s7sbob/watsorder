/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/frontend-pages/homepage/C2a.tsx
import { Box, Grid, Typography, Container, Stack, Button } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import DesignCol from 'src/assets/images/frontend-pages/homepage/design-collection.png'; // عدل الصورة لتكون مناسبة

const C2a = () => {
  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const smUp = useMediaQuery((theme: any) => theme.breakpoints.only('sm'));

  return (
    <Container
      sx={{
        maxWidth: '1400px !important',
        py: { xs: '20px', lg: '30px' },
      }}
    >
      <Box
        bgcolor="primary.light"
        borderRadius="24px"
        overflow="hidden"
        position="relative"
        sx={{ py: { xs: '40px', lg: '70px' } }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} lg={6} sm={8}>
              <Typography variant="h4" mb={3} fontWeight={700} lineHeight="1.4">
                Boost Your Restaurant's Efficiency with Our WhatsApp Bot
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} alignItems="center" spacing={3} mb={3}>
                <Button variant="contained" size="large" href="/auth/login">
                  Restaurant Login
                </Button>
                <Button variant="outlined" size="large" href="/auth/register">
                  Get Started Today
                </Button>
              </Stack>
              <Typography fontSize="14px">One-time setup with no recurring fees.</Typography>
            </Grid>
          </Grid>
        </Container>

        {lgUp && (
          <img
            src={DesignCol}
            alt="design"
            width={900}
            height={365}
            style={{ position: 'absolute', right: 0, top: 0, width: 'auto', height: '100%' }}
          />
        )}

        {smUp && (
          <img
            src={DesignCol}
            alt="design"
            width={900}
            height={365}
            style={{ position: 'absolute', right: '-200px', top: 0, width: 'auto', height: '100%' }}
          />
        )}
      </Box>
    </Container>
  );
};

export default C2a;
