import { Box, Avatar, Typography, IconButton, Tooltip, useMediaQuery } from '@mui/material';
import { useSelector } from 'src/store/Store';
import img1 from 'src/assets/images/profile/user-1.jpg';
import { IconPower } from '@tabler/icons-react';
import { AppState } from 'src/store/Store';
import { Link } from 'react-router-dom';
import { useContext } from 'react';
import { UserContext } from 'src/context/UserContext';

export const Profile = () => {
  const customizer = useSelector((state: AppState) => state.customizer);
  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const hideMenu = lgUp ? customizer.isCollapse && !customizer.isSidebarHover : '';

  // الحصول على بيانات المستخدم من الـ context
  const userContext = useContext(UserContext);
  if (!userContext) {
    throw new Error("UserContext is not provided");
  }
  const { currentUser } = userContext;

  return (
    <Box
      display={'flex'}
      alignItems="center"
      gap={2}
      sx={{ m: 3, p: 2, bgcolor: 'secondary.light' }}
    >
      {!hideMenu ? (
        <>
          <Avatar alt="User Avatar" src={img1} />
          <Box>
            <Typography variant="h6">
              {currentUser ? currentUser.name : "Guest"}
            </Typography>
            <Typography variant="caption">
              {currentUser ? currentUser.subscriptionType : "User"}
            </Typography>
          </Box>
          <Box sx={{ ml: 'auto' }}>
            <Tooltip title="Logout" placement="top">
              <IconButton
                color="primary"
                component={Link}
                to="auth/login"
                aria-label="logout"
                size="small"
              >
                <IconPower size="20" />
              </IconButton>
            </Tooltip>
          </Box>
        </>
      ) : (
        ''
      )}
    </Box>
  );
};
