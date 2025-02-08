// src/components/frontend-pages/homepage/Banner.tsx
import React from 'react';
import { Box, Container, Grid, Typography, Stack, AvatarGroup, Avatar, Button, Dialog, DialogActions, DialogContent } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import iconPlay from 'src/assets/images/frontend-pages/homepage/icon-play.svg';
import BannerTopLeft from 'src/assets/images/frontend-pages/homepage/banner-top-left.svg';
import BannerTopRight from 'src/assets/images/frontend-pages/homepage/banner-top-right.svg';
import BannerBottomPart from 'src/assets/images/frontend-pages/homepage/bottom-part.svg';
import user1 from 'src/assets/images/profile/user-1.jpg';
import user2 from 'src/assets/images/profile/user-2.jpg';
import user3 from 'src/assets/images/profile/user-3.jpg';

const Banner = () => {
  const theme = useTheme();
  const lgUp = useMediaQuery(theme.breakpoints.up('lg'));
  const [open, setOpen] = React.useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Box bgcolor="primary.light" pt={7}>
      <Container sx={{ maxWidth: '1400px !important', position: 'relative' }}>
        <Grid container spacing={3} justifyContent="center" mb={4}>
          {lgUp && (
            <Grid item xs={12} lg={2} display="flex" alignItems="end">
              <img
                src={BannerTopLeft}
                alt="banner-left"
                style={{ borderRadius: '16px', position: 'absolute', left: '24px', boxShadow: theme.shadows[10] }}
                width={360}
                height={200}
              />
            </Grid>
          )}
          <Grid item xs={12} lg={7} textAlign="center">
            <Typography
              variant="h1"
              fontWeight={700}
              lineHeight="1.2"
              sx={{ fontSize: { xs: '40px', sm: '56px' } }}
            >
              Transform Your Restaurant Orders with Our&nbsp;
              <Typography variant="h1" component="span" color="primary.main" fontWeight={700}
                sx={{ fontSize: { xs: '40px', sm: '56px' } }}>
                WhatsApp Bot
              </Typography>
            </Typography>
            <Stack my={3} direction={{ xs: 'column', sm: 'row' }} spacing="20px" alignItems="center" justifyContent="center">
              <AvatarGroup>
                <Avatar alt="User 1" src={user1} sx={{ width: 40, height: 40 }} />
                <Avatar alt="User 2" src={user2} sx={{ width: 40, height: 40 }} />
                <Avatar alt="User 3" src={user3} sx={{ width: 40, height: 40 }} />
              </AvatarGroup>
              <Typography variant="h6" fontWeight={500}>
                Join 50,000+ restaurants automating their order process
              </Typography>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems="center" spacing={3} mb={4} justifyContent="center">
              <Button color="primary" size="large" variant="contained" href="/auth/login">
                Restaurant Login
              </Button>
              <Button
                variant="text"
                color="inherit"
                onClick={handleClickOpen}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  color: 'text.primary',
                  fontWeight: 500,
                  fontSize: '15px',
                  '&:hover': { color: 'primary.main' },
                }}
              >
                <img src={iconPlay} alt="play icon" width={40} height={40} /> See how it works
              </Button>
              <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
                <DialogContent>
                  <iframe
                    width="800"
                    height="500"
                    src="https://www.youtube.com/embed/P94DBd1hJkw?si=WLnH9g-KAdDJkUZN"
                    title="YouTube video player"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </DialogContent>
                <DialogActions>
                  <Button onClick={handleClose} autoFocus>
                    Close
                  </Button>
                </DialogActions>
              </Dialog>
            </Stack>
          </Grid>
          {lgUp && (
            <Grid item xs={12} lg={2} display="flex" alignItems="end">
              <img
                src={BannerTopRight}
                alt="banner-right"
                style={{ borderRadius: '16px', position: 'absolute', right: '24px', boxShadow: theme.shadows[10] }}
                width={350}
                height={220}
              />
            </Grid>
          )}
        </Grid>
        {lgUp && (
          <img
            src={BannerBottomPart}
            alt="banner-bottom"
            style={{ width: '100%', marginBottom: '-11px' }}
            width={500}
            height={300}
          />
        )}
      </Container>
    </Box>
  );
};

export default Banner;
