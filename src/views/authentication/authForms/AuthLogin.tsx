// src/views/pages/authForms/AuthLogin.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  Box,
  Button,
  Stack,
  Typography,
  FormGroup,
  FormControlLabel,
  Divider,
  Alert
} from '@mui/material';

import axiosServices from 'src/utils/axios';
import CustomCheckbox from 'src/components/forms/theme-elements/CustomCheckbox';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import { setToken } from 'src/store/auth/AuthSlice';

// استيراد مكون اختيار الدولة + إدخال الرقم
import CountryPhoneSelector from '../auth1/CountryPhoneSelector';

const AuthLogin = () => {
  const [fullPhone, setFullPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      // طلب تسجيل الدخول
      const response = await axiosServices.post('/api/auth/login', {
        phoneNumber: fullPhone,
        password,
      });
      const { token } = response.data;

      if (token) {
        dispatch(setToken(token));
        navigate('/apps/sessions');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'An error occurred. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Typography fontWeight="700" variant="h3" mb={1}>
        Welcome to WatsOrder
      </Typography>

      <Box mt={3}>
        <Divider />
      </Box>

      {error && (
        <Box mt={2}>
          <Alert severity="error">{error}</Alert>
        </Box>
      )}

      <Stack spacing={2} mt={3}>
        {/* مكوّن اختيار الدولة + إدخال رقم الجوال المحلي */}
        <CountryPhoneSelector
          onChange={(val) => setFullPhone(val)}
          defaultCountryCode="+20"
          label="Phone Number (Whatsapp Number)"
        />

        <Box>
          <CustomFormLabel htmlFor="password">Password</CustomFormLabel>
          <CustomTextField
            id="password"
            type="password"
            variant="outlined"
            fullWidth
            value={password}
            onChange={(e: { target: { value: React.SetStateAction<string>; }; }) => setPassword(e.target.value)}
          />
        </Box>

        <Stack justifyContent="space-between" direction="row" alignItems="center">
          <FormGroup>
            <FormControlLabel
              control={<CustomCheckbox defaultChecked />}
              label="Remember this Device"
            />
          </FormGroup>
          {/* إذا لديك صفحة نسيان كلمة المرور */}
          {/* <Typography
            component={Link}
            to="/auth/forgot-password"
            fontWeight="500"
            sx={{ textDecoration: 'none', color: 'primary.main' }}
          >
            Forgot Password?
          </Typography> */}
        </Stack>
      </Stack>

      <Box mt={2}>
        <Button color="primary" variant="contained" size="large" fullWidth type="submit">
          Sign In
        </Button>
      </Box>
    </form>
  );
};

export default AuthLogin;
