import { useState } from 'react';
import { Box, Menu, Typography, Button, Divider, Grid } from '@mui/material';
import { Link } from 'react-router-dom';
import { IconChevronDown, IconHelp } from '@tabler/icons-react';
import AdminLinks from './AdminLinks';
import QuickLinks from './QuickLinks';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';

const AppDD = () => {
  const [anchorEl2, setAnchorEl2] = useState(null);

  const handleClick2 = (event: any) => {
    setAnchorEl2(event.currentTarget);
  };

  const handleClose2 = () => {
    setAnchorEl2(null);
  };

  return (
    <>
      <Box>
        <Button
          aria-label="show 11 new notifications"
          color="inherit"
          variant="text"
          aria-controls="msgs-menu"
          aria-haspopup="true"
          sx={{
            bgcolor: anchorEl2 ? 'primary.light' : '',
            color: anchorEl2 ? 'primary.main' : (theme) => theme.palette.text.secondary,
          }}
          onClick={handleClick2}
          endIcon={<IconChevronDown size="15" style={{ marginLeft: '-5px', marginTop: '2px' }} />}
        >
          Admin
        </Button>
        {/* ------------------------------------------- */}
        {/* Message Dropdown */}
        {/* ------------------------------------------- */}
        <Menu
          id="msgs-menu"
          anchorEl={anchorEl2}
          keepMounted
          open={Boolean(anchorEl2)}
          onClose={handleClose2}
          anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
          transformOrigin={{ horizontal: 'left', vertical: 'top' }}
          sx={{
            '& .MuiMenu-paper': {
              width: '850px',
            },
            '& .MuiMenu-paper ul': {
              p: 0,
            },
          }}
        >
          <Grid container>
            <Grid item sm={8} display="flex">
              <Box p={4} pr={0} pb={3}>
                <AdminLinks />

              </Box>
            </Grid>
          </Grid>
        </Menu>
      </Box>
      <Button color="inherit" sx={{color: (theme) => theme.palette.text.secondary}} variant="text" to="/apps/sessions" component={Link}>
        Sessions
      </Button>
      <Button color="inherit" sx={{color: (theme) => theme.palette.text.secondary}} variant="text" to="/apps/ConfirmedOrdersPage" component={Link}>
      Confirmed Orders
      </Button>
      <Button color="inherit" sx={{color: (theme) => theme.palette.text.secondary}} variant="text" to="/apps/email" component={Link}>
        Email
      </Button>
    </>
  );
};

export default AppDD;
