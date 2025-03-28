/* eslint-disable @typescript-eslint/no-explicit-any */
import { IconButton, Box, AppBar, useMediaQuery, Toolbar, styled, Stack } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useSelector, useDispatch } from 'src/store/Store';
import { setDarkMode, toggleMobileSidebar } from 'src/store/customizer/CustomizerSlice';
import { IconMoon, IconSun } from '@tabler/icons-react';
// import Notifications from './Notification';
import Profile from './Profile';
import Language from './Language';
import { AppState } from 'src/store/Store';

const Header = () => {
  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));

  // drawer
  const customizer = useSelector((state: AppState) => state.customizer);
  const dispatch = useDispatch();

  const AppBarStyled = styled(AppBar)(({ theme }) => ({
    boxShadow: 'none',
    background: theme.palette.background.paper,
    justifyContent: 'center',
    backdropFilter: 'blur(4px)',
    [theme.breakpoints.up('lg')]: {
      minHeight: customizer.TopbarHeight,
    },
  }));

  const ToolbarStyled = styled(Toolbar)(({ theme }) => ({
    width: '100%',
    color: theme.palette.text.secondary,
  }));

  return (
    <AppBarStyled position="sticky" color="default">
      <ToolbarStyled>
        {/* ------------------------------------------- */}
        {/* زر قائمة الـ sidebar للأجهزة المحمولة */}
        {/* ------------------------------------------- */}
        {!lgUp && (
          <IconButton
            size="large"
            color="inherit"
            onClick={() => dispatch(toggleMobileSidebar())}
          >
            <MenuIcon />
          </IconButton>
        )}

        {/* ------------------------------------------- */}
        {/* محتويات أخرى في الهيدر */}
        {/* ------------------------------------------- */}
        {lgUp ? (
          <>
            {/* يمكنك تفعيل Navigation هنا للأجهزة الكبيرة إن رغبت */}
            {/* <Navigation /> */}
          </>
        ) : null}

        <Box flexGrow={1} />
        <Stack spacing={1} direction="row" alignItems="center">
          <Language />
          {/* ------------------------------------------- */}
          <IconButton size="large" color="inherit">
            {customizer.activeMode === 'light' ? (
              <IconMoon size="21" stroke="1.5" onClick={() => dispatch(setDarkMode('dark'))} />
            ) : (
              <IconSun size="21" stroke="1.5" onClick={() => dispatch(setDarkMode('light'))} />
            )}
          </IconButton>
          {/* <Notifications /> */}
          <Profile />
        </Stack>
      </ToolbarStyled>
    </AppBarStyled>
  );
};

export default Header;
