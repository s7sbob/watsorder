// src/views/pages/authForms/AuthRegisterFlow.tsx
import React, { useState } from 'react';
import axiosServices from 'src/utils/axios';
import {
  Box,
  Button,
  Stack,
  Typography,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Link,
} from '@mui/material';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CountryPhoneSelector from '../auth1/CountryPhoneSelector'; // رقم الهاتف الرئيسي
import CountrySelector from '../auth1/CountrySelector'; // لاستخدامه في اختيار الدولة
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';

// تنسيق خانات OTP
const OtpContainer = styled('div')({
  display: 'flex',
  justifyContent: 'center',
  gap: '4px', // تقليل المسافة بين خانات OTP
});
const OtpInput = styled(TextField)({
  width: 45,
  textAlign: 'center',
});

function AuthRegister() {
  // الحقول الأساسية
  const [name, setName] = useState('');
  const [fullPhone, setFullPhone] = useState('');
  const [password, setPassword] = useState('');

  // الحقول الجديدة (اختيارية)
  const [companyName, setCompanyName] = useState('');
  const [, setCountry] = useState(''); // سيستخدم CountrySelector لتعيين الدولة
  const [address, setAddress] = useState('');
  const [contactFullPhone, setContactFullPhone] = useState('');

  const [openOtpDialog, setOpenOtpDialog] = useState(false);
  const [otpValues, setOtpValues] = useState(['', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // تحقق من الحقول الأساسية فقط
    if (!name) {
      setError('Please enter your name.');
      return;
    }
    if (!fullPhone) {
      setError('Please enter your phone number.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    try {
      // إرسال OTP للتسجيل
      await axiosServices.post('/api/otp/send-registration-otp', {
        phoneNumber: fullPhone,
      });
      setOpenOtpDialog(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleChangeOtp = (index: number, value: string) => {
    if (value.length > 1) return;
    const newArr = [...otpValues];
    newArr[index] = value.replace(/\D/, '');
    setOtpValues(newArr);
    if (value && index < 3) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleVerifyClick = async () => {
    const code = otpValues.join('');
    if (code.length < 4) {
      setError('Please enter the 4-digit code.');
      return;
    }
    try {
      const resp = await axiosServices.post('/api/auth/register', {
        phoneNumber: fullPhone,
        name,
        password,
        otpCode: code,
        companyName,      // اختياري
        address,          // اختياري
        contactPhone: contactFullPhone, // اختياري
      });
      setOpenOtpDialog(false);
      setSuccessMsg(resp.data.message || 'Registered successfully!');
      navigate('/auth/login');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'OTP verification failed.');
      setOtpValues(['', '', '', '']);
    }
  };

  const handleResendCode = async () => {
    setError(null);
    setSuccessMsg(null);
    try {
      await axiosServices.post('/api/otp/send-registration-otp', {
        phoneNumber: fullPhone,
      });
      setSuccessMsg('Code resent successfully. Please check your WhatsApp again.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error resending code.');
    }
  };

  return (
    <>
      <form onSubmit={handleRegister}>
        <Typography fontWeight="700" variant="h4" mb={1}>
          Create a New Account
        </Typography>

        {/* تقليل المسافات الرأسية */}
        <Divider sx={{ mb: 1 }} />

        {error && (
          <Alert severity="error" sx={{ mb: 1 }}>
            {error}
          </Alert>
        )}
        {successMsg && (
          <Alert severity="success" sx={{ mb: 1 }}>
            {successMsg}
          </Alert>
        )}

        {/* استخدام Stack مع spacing صغير لتقليل المسافات بين الحقول */}
        <Stack spacing={0} mt={1}>
          <Box>
            <CustomFormLabel htmlFor="name">Full Name</CustomFormLabel>
            <CustomTextField
              id="name"
              variant="outlined"
              fullWidth
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            />
          </Box>

          {/* رقم الهاتف الرئيسي */}
          <CountryPhoneSelector
            onChange={(val: string) => setFullPhone(val)}
            defaultCountryCode="+20"
            label="Phone Number"
          />

          <Box>
            <CustomFormLabel htmlFor="password">Password</CustomFormLabel>
            <CustomTextField
              id="password"
              type="password"
              variant="outlined"
              fullWidth
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            />
          </Box>

          {/* الحقول الجديدة اختيارية */}
          <Box>
            <CustomFormLabel htmlFor="companyName">Company Name (Optional)</CustomFormLabel>
            <CustomTextField
              id="companyName"
              variant="outlined"
              fullWidth
              value={companyName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCompanyName(e.target.value)}
            />
          </Box>
          <Box>
            <CustomFormLabel htmlFor="countrySelector">Country (Optional)</CustomFormLabel>
            <CountrySelector
              onChange={(country) => {
                // تخزين اسم الدولة فقط
                setCountry(country.label);
              }}
            />
          </Box>
          <Box>
            <CustomFormLabel htmlFor="address">Address (Optional)</CustomFormLabel>
            <CustomTextField
              id="address"
              variant="outlined"
              fullWidth
              value={address}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddress(e.target.value)}
            />
          </Box>
          <Box>
            <CustomFormLabel htmlFor="contactPhone">Contact Phone (Optional)</CustomFormLabel>
            <CountryPhoneSelector
              onChange={(val: string) => setContactFullPhone(val)}
              defaultCountryCode="+20"
              label=""
            />
          </Box>
        </Stack>

        <Button
          color="primary"
          variant="contained"
          size="large"
          fullWidth
          type="submit"
          sx={{ mt: 2 }}
        >
          Register
        </Button>

        <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
          Already have an account?{' '}
          <Link href="/auth/login" underline="none" color="primary">
            Sign In
          </Link>
        </Typography>
      </form>

      {/* Dialog لإدخال OTP */}
      <Dialog open={openOtpDialog} onClose={() => {}} disableEscapeKeyDown>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Verify your number</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 1 }}>
            Please confirm your WhatsApp number by entering the code that we sent to you
          </Typography>

          <OtpContainer>
            {otpValues.map((val, idx) => (
              <OtpInput
                key={idx}
                id={`otp-${idx}`}
                value={val}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChangeOtp(idx, e.target.value)}
              />
            ))}
          </OtpContainer>

          <Button
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mt: 2 }}
            onClick={handleVerifyClick}
          >
            Verify
          </Button>

          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              textAlign: 'center',
              mt: 1,
              cursor: 'pointer',
            }}
            onClick={handleResendCode}
          >
            Resend code
          </Typography>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default AuthRegister;
