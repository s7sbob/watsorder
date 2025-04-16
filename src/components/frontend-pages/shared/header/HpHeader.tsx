import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { AppState } from 'src/store/Store';
import AppBar from '@mui/material/AppBar';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import useMediaQuery from '@mui/material/useMediaQuery';
import { styled } from '@mui/material/styles';
import Logo from '../../../../layouts/full/shared/logo/Logo';
import Navigations from './Navigations';
import MobileSidebar from './MobileSidebar';
import { IconMenu2 } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { jwtDecode } from 'jwt-decode';
import Language from 'src/layouts/full/vertical/header/Language'; // استيراد اختيار اللغة

interface DecodedToken {
  exp: number;
  [key: string]: any;
}

const HpHeader = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const token = useSelector((state: AppState) => state.auth.token);

  const AppBarStyled = styled(AppBar)(({ theme }) => ({
    justifyContent: 'center',
    [theme.breakpoints.up('lg')]: {
      minHeight: '100px'
    },
    backgroundColor: theme.palette.primary.light
  }));

  const ToolbarStyled = styled(Toolbar)(({ theme }) => ({
    width: '100%',
    paddingLeft: '0 !important',
    paddingRight: '0 !important',
    color: theme.palette.text.secondary,
    justifyContent: 'space-between'
  }));

  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const lgDown = useMediaQuery((theme: any) => theme.breakpoints.down('lg'));

  const [open, setOpen] = React.useState(false);

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const toggleDrawer = (newOpen: boolean) => () => {
    setOpen(newOpen);
  };

  const handleLoginClick = () => {
    if (token) {
      try {
        const decoded: DecodedToken = jwtDecode(token);
        const isExpired = decoded.exp * 1000 < Date.now();

        if (!isExpired) {
          navigate('/apps/sessions');
          return;
        }
      } catch (error) {
        console.error('Invalid token:', error);
      }
    }
    navigate('/auth/login');
  };

  return (
    <AppBarStyled position='sticky' elevation={0}>
      <Container sx={{ maxWidth: '1400px !important' }}>
        <ToolbarStyled>
          <Logo />
          {lgDown && (
            <IconButton color='inherit' aria-label='menu' onClick={handleDrawerOpen}>
              <IconMenu2 size={20} />
            </IconButton>
          )}

          {lgUp && (
            <>
              <Stack spacing={1} direction='row' alignItems='center'>
                {/* تضمين مكون اختيار اللغة بنفس الشكل */}
                <Language />
                <Navigations />
              </Stack>
              <Button color='primary' variant='contained' onClick={handleLoginClick}>
                {t('HomePage.Header.login')}
              </Button>
            </>
          )}
        </ToolbarStyled>
      </Container>

      <Drawer
        anchor='left'
        open={open}
        variant='temporary'
        onClose={toggleDrawer(false)}
        PaperProps={{
          sx: {
            width: 270,
            border: '0 !important',
            boxShadow: (theme) => theme.shadows[8]
          }
        }}
      >
        <MobileSidebar />
      </Drawer>
    </AppBarStyled>
  );
};

export default HpHeader;
