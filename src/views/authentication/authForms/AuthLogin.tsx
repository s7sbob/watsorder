import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Box, Button, Stack, Typography, FormGroup, FormControlLabel, Divider, Alert } from '@mui/material';
import axiosServices from 'src/utils/axios';
import CustomCheckbox from 'src/components/forms/theme-elements/CustomCheckbox';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import { setToken } from 'src/store/auth/AuthSlice';
// استيراد مكون اختيار الدولة + إدخال الرقم
import CountryPhoneSelector from '../auth1/CountryPhoneSelector';
import { UserContext } from 'src/context/UserContext';
import { useTranslation } from 'react-i18next';

const AuthLogin = () => {
  const [fullPhone, setFullPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  // استدعاء الـ UserContext للحصول على دالة setUserFromToken
  const userContext = useContext(UserContext);

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
        // خزّن التوكن في Redux
        dispatch(setToken(token));

        // فك تشفير التوكن وتخزين بيانات المستخدم في UserContext
        userContext?.setUserFromToken(token);

        // إعادة التوجيه بعد تسجيل الدخول
        navigate('/apps/sessions');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || t('authLogin.errors.generic'));
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Typography fontWeight="700" variant="h3" mb={1}>
        {t('authLogin.title')}
      </Typography>

      <Box mt={3}>
        <Divider />
      </Box>

      {error && (
        <Box mt={2}>
          <Alert severity="error">{error}</Alert>
        </Box>
      )}

      <Stack spacing={1} mt={5}>
        {/* مكوّن اختيار الدولة + إدخال رقم الجوال المحلي */}
        <CountryPhoneSelector
          onChange={(val) => setFullPhone(val)}
          defaultCountryCode="+20"
          label={t('authLogin.label.phone') as string}
        />

        <Box>
          <CustomFormLabel htmlFor="password">{t('authLogin.label.password')}</CustomFormLabel>
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
              label={t('authLogin.label.rememberDevice')}
            />
          </FormGroup>
        </Stack>
      </Stack>

      <Box mt={2}>
        <Button color="primary" variant="contained" size="large" fullWidth type="submit">
          {t('authLogin.button.signIn')}
        </Button>
      </Box>
    </form>
  );
};

export default AuthLogin;
