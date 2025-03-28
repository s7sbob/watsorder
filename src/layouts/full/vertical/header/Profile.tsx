// src/components/Profile.tsx
import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Menu,
  Avatar,
  Typography,
  Button,
  IconButton,
  Stack
} from '@mui/material';
import LogoutButton from './LogoutButton'; // تأكد من مسار الاستيراد الصحيح
import { IconMail } from '@tabler/icons-react';
import ProfileImg from 'src/assets/images/profile/user-1.jpg';
import { UserContext } from 'src/context/UserContext';

const Profile = () => {
  const [anchorEl2, setAnchorEl2] = useState<null | HTMLElement>(null);
  
  // التأكد من وجود الـ context قبل استخدامه
  const userContext = useContext(UserContext);
  if (!userContext) {
    throw new Error("UserContext is not provided");
  }
  const { currentUser } = userContext;

  const handleClick2 = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl2(event.currentTarget);
  };
  const handleClose2 = () => {
    setAnchorEl2(null);
  };

  return (
    <Box>
      <IconButton
        size="large"
        aria-label="show notifications"
        color="inherit"
        aria-controls="msgs-menu"
        aria-haspopup="true"
        sx={{
          ...(typeof anchorEl2 === 'object' && {
            color: 'primary.main',
          }),
        }}
        onClick={handleClick2}
      >
        <Avatar
          src={ProfileImg}
          alt="Profile Image"
          sx={{
            width: 35,
            height: 35,
          }}
        />
      </IconButton>
      <Menu
        id="msgs-menu"
        anchorEl={anchorEl2}
        keepMounted
        open={Boolean(anchorEl2)}
        onClose={handleClose2}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        sx={{
          '& .MuiMenu-paper': {
            width: '360px',
            p: 4,
          },
        }}
      >
        <Typography variant="h5">User Profile</Typography>
        <Stack direction="row" py={3} spacing={2} alignItems="center">
          <Avatar
            src={ProfileImg}
            alt="Profile Image"
            sx={{ width: 95, height: 95 }}
          />
          <Box>
            <Typography variant="subtitle2" color="textPrimary" fontWeight={600}>
              {currentUser ? currentUser.name : "Guest"}
            </Typography>
            <Typography variant="subtitle2" color="textSecondary">
              {currentUser ? currentUser.subscriptionType : "User"}
            </Typography>
            <Typography
              variant="subtitle2"
              color="textSecondary"
              display="flex"
              alignItems="center"
              gap={1}
            >
              <IconMail width={15} height={15} />
              {currentUser ? currentUser.phoneNumber : ""}
            </Typography>
          </Box>
        </Stack>
        <Box mt={2}>
          <Button to="/auth/login" variant="outlined" color="primary" component={Link} fullWidth>
            <LogoutButton />
          </Button>
        </Box>
      </Menu>
    </Box>
  );
};

export default Profile;
