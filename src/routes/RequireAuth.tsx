import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { AppState } from '../store/Store';
import { isTokenValid } from '../store/auth/AuthSlice';

interface RequireAuthProps {
  children: React.ReactNode;
}

const RequireAuth: React.FC<RequireAuthProps> = ({ children }) => {
  const token = useSelector((state: AppState) => state.auth.token);
  const tokenValid = isTokenValid(token);

  if (!tokenValid) {
    return <Navigate to="/auth/login" replace />;
  }

  return <>{children}</>;
};

export default RequireAuth;
