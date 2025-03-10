// src/views/pages/authForms/AuthRegisterFlow.tsx

import React, { useState } from 'react';
import axiosServices from 'src/utils/axios';  // <-- تأكد من مسار axiosServices في مشروعك
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
} from '@mui/material';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CountryPhoneSelector from '../auth1/CountryPhoneSelector'; // <-- عدّل المسار حسب مكانه
import { styled } from '@mui/material/styles';

// تنسيق بسيط لخانات الـ OTP
const OtpContainer = styled('div')({
  display: 'flex',
  justifyContent: 'center',
  gap: '8px',
});

const OtpInput = styled(TextField)({
  width: 50,
  textAlign: 'center',
});

function AuthRegister() {
  // حقول التسجيل
  const [name, setName] = useState('');
  const [fullPhone, setFullPhone] = useState('');
  const [password, setPassword] = useState('');

  // حوار إدخال الـ OTP
  const [openOtpDialog, setOpenOtpDialog] = useState(false);

  // خانات الـ 4 أرقام
  const [otpValues, setOtpValues] = useState(['', '', '', '']);

  // رسائل الخطأ والنجاح
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ------------------------------------------------------------------
  // 1) عند الضغط على زر Register
  // ------------------------------------------------------------------
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // تحقق مبكر من الحقول
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
      // استدعاء المسار الذي يرسل OTP
      await axiosServices.post('/api/otp/send-registration-otp', {
        phoneNumber: fullPhone,
      });
      // إذا نجح => افتح نافذة إدخال OTP
      setOpenOtpDialog(true);
    } catch (err: any) {
      // لو السيرفر أرجع خطأ => تظهر في واجهة المستخدم
      setError(err.message);
    }
  };

  // ------------------------------------------------------------------
  // 2) عند تغيير أي خانة من خانات الكود
  // ------------------------------------------------------------------
  const handleChangeOtp = (index: number, value: string) => {
    // نقبل رقم واحد فقط
    if (value.length > 1) return;

    const newArr = [...otpValues];
    newArr[index] = value.replace(/\D/, ''); // منع الأحرف غير الرقمية
    setOtpValues(newArr);

    // لو المستخدم كتب رقم في خانة وليست الأخيرة => ننقل المؤشر تلقائياً للخانة التالية
    if (value && index < 3) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  // ------------------------------------------------------------------
  // 3) عند الضغط على زر Verify داخل الـ Dialog
  // ------------------------------------------------------------------
  const handleVerifyClick = async () => {
    const code = otpValues.join('');
    if (code.length < 4) {
      setError('Please enter the 4-digit code.');
      return;
    }

    try {
      // استدعاء /api/auth/register => يتحقق من الـ OTP + إنشاء المستخدم
      const resp = await axiosServices.post('/api/auth/register', {
        phoneNumber: fullPhone,
        name,
        password,
        otpCode: code,
      });
      // لو نجح
      setOpenOtpDialog(false);
      setSuccessMsg(resp.data.message || 'Registered successfully!');
    } catch (err: any) {
      // لو الكود خطأ أو أي شيء آخر
      setError(err?.response?.data?.message || 'OTP verification failed.');
      // أعد ضبط الخانات
      setOtpValues(['', '', '', '']);
    }
  };

  // ------------------------------------------------------------------
  // 4) عند الضغط على "Resend code"
  // ------------------------------------------------------------------
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
        <Typography fontWeight="700" variant="h3" mb={1}>
          Create a New Account
        </Typography>

        <Box mt={3}>
          <Divider />
        </Box>

        {/* في حال وجود خطأ من السيرفر أو تحقق الفرونت */}
        {error && (
          <Box mt={2}>
            <Alert severity="error">{error}</Alert>
          </Box>
        )}
        {/* في حال وجود رسالة نجاح */}
        {successMsg && (
          <Box mt={2}>
            <Alert severity="success">{successMsg}</Alert>
          </Box>
        )}

        <Stack mb={3} spacing={2} mt={2}>
          <Box>
            <CustomFormLabel htmlFor="name">Full Name</CustomFormLabel>
            <CustomTextField
              id="name"
              variant="outlined"
              fullWidth
              value={name}
              onChange={(e: { target: { value: React.SetStateAction<string>; }; }) => setName(e.target.value)}
            />
          </Box>

          {/* مكوّن اختيار الدولة + إدخال الرقم المحلي */}
          <CountryPhoneSelector
            onChange={(val) => setFullPhone(val)}
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
              onChange={(e: { target: { value: React.SetStateAction<string>; }; }) => setPassword(e.target.value)}
            />
          </Box>
        </Stack>

        <Button color="primary" variant="contained" size="large" fullWidth type="submit">
          Register
        </Button>
      </form>

      {/* نافذة إدخال الـ 4 أرقام للـ OTP */}
      <Dialog open={openOtpDialog} onClose={() => {}} disableEscapeKeyDown>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Verify your number</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Please confirm your whatsapp number by entering the code that we sent to you
          </Typography>

          <OtpContainer>
            {otpValues.map((val, idx) => (
              <OtpInput
                key={idx}
                id={`otp-${idx}`}
                value={val}
                onChange={(e) => handleChangeOtp(idx, e.target.value)}
              />
            ))}
          </OtpContainer>

          {/* زر Verify */}
          <Button
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mt: 3 }}
            onClick={handleVerifyClick}
          >
            Verify
          </Button>

          {/* رابط Resend code */}
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              textAlign: 'center',
              mt: 2,
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
