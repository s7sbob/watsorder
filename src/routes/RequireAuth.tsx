import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { AppState } from '../store/Store';

interface RequireAuthProps {
  children: React.ReactNode;
}

const RequireAuth: React.FC<RequireAuthProps> = ({ children }) => {
  const token = useSelector((state: AppState) => state.auth.token);
  if (!token) {
    return <Navigate to="/auth/login" replace />;
  }
  return <>{children}</>;
};

export default RequireAuth;
