import React from 'react';
import { Button } from '@mui/material';
import { useDispatch } from 'react-redux';
import { clearToken } from 'src/store/auth/AuthSlice';
import { useNavigate } from 'react-router-dom';

const LogoutButton: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(clearToken());
    navigate('/auth/login');
  };

  return (
    <Button variant="outlined" color="primary" fullWidth onClick={handleLogout}>
      Logout
    </Button>
  );
};

export default LogoutButton;
