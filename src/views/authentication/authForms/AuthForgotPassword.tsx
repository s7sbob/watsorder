import React, { useState } from 'react';
import { Box, Button, Stack, Typography, Alert, Dialog, DialogTitle, DialogContent, Divider, IconButton, InputAdornment } from '@mui/material';
import axiosServices from 'src/utils/axios';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CountryPhoneSelector from '../auth1/CountryPhoneSelector';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useTranslation } from 'react-i18next';

const OtpContainer = styled('div')({
  display: 'flex',
  justifyContent: 'center',
  gap: '4px',
});
const OtpInput = styled(CustomTextField)({
  width: 45,
  textAlign: 'center',
});

const AuthForgotPassword: React.FC = () => {
  const { t } = useTranslation();
  // حالات تخزين رقم الهاتف والـ OTP وكلمة المرور الجديدة
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  const [otpCode, setOtpCode] = useState(['', '', '', '']);
  // المرحلة 1: خطوة إدخال OTP؛ المرحلة 2: خطوة إدخال كلمة المرور الجديدة
  const [otpStage, setOtpStage] = useState(1);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // حالات إظهار/إخفاء كلمة المرور
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();

  // إرسال OTP لإعادة تعيين كلمة المرور
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    if (!phoneNumber) {
      setError(t('authForgotPassword.errors.enterPhone'));
      return;
    }
    try {
      const res = await axiosServices.post('/api/auth/forgot-password/send-otp', { phoneNumber });
      setSuccessMsg(res.data.message || t('authForgotPassword.success.otpSent'));
      // فتح الديالوج وتحديد المرحلة الأولى لإدخال OTP
      setOtpStage(1);
      setOtpDialogOpen(true);
    } catch (err: any) {
      console.error('OTP error:', err);
      setError(err.message || t('authForgotPassword.errors.sendOtp'));
    }
  };

  // التعامل مع تغيير حقل OTP
  const handleChangeOtp = (index: number, value: string) => {
    if (value.length > 1) return;
    const newArr = [...otpCode];
    newArr[index] = value.replace(/\D/, '');
    setOtpCode(newArr);
    if (value && index < 3) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  // التحقق من OTP بدون إعادة تعيين كلمة المرور
  const handleVerifyOtp = async () => {
    setError(null);
    setSuccessMsg(null);
    const code = otpCode.join('');
    if (code.length < 4) {
      setError(t('authForgotPassword.errors.enter4DigitOtp'));
      return;
    }
    try {
      // استدعاء endpoint للتحقق من OTP فقط
      const res = await axiosServices.post('/api/auth/forgot-password/verify-otp', {
        phoneNumber,
        otpCode: code,
      });
      setSuccessMsg(res.data.message || t('authForgotPassword.success.otpVerified'));
      // الانتقال إلى مرحلة إدخال كلمة المرور الجديدة
      setOtpStage(2);
    } catch (err: any) {
      console.error('OTP verification error:', err);
      setError(err.message || t('authForgotPassword.errors.verifyOtp'));
    }
  };

  // إعادة تعيين كلمة المرور بعد التحقق من OTP
  const handleResetPassword = async () => {
    setError(null);
    setSuccessMsg(null);
    if (!newPassword || !confirmPassword) {
      setError(t('authForgotPassword.errors.enterNewPasswords'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('authForgotPassword.errors.passwordsMismatch'));
      return;
    }
    try {
      const res = await axiosServices.post('/api/auth/forgot-password/reset', {
        phoneNumber,
        newPassword,
      });
      setSuccessMsg(res.data.message || t('authForgotPassword.success.passwordReset'));
      setOtpDialogOpen(false);
      navigate('/auth/login');
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(err.message || t('authForgotPassword.errors.resetPassword'));
    }
  };

  // إعادة إرسال OTP
  const handleResendOtp = async () => {
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await axiosServices.post('/api/auth/forgot-password/send-otp', { phoneNumber });
      setSuccessMsg(res.data.message || t('authForgotPassword.success.otpResent'));
      setOtpCode(['', '', '', '']);
    } catch (err: any) {
      console.error('Resend OTP error:', err);
      setError(err.message || t('authForgotPassword.errors.resendOtp'));
    }
  };

  // إلغاء الديالوج وإعادة ضبط الحالات
  const handleCancelOtp = () => {
    setOtpDialogOpen(false);
    setOtpCode(['', '', '', '']);
    setOtpStage(1);
    setError(null);
    setSuccessMsg(null);
  };

  return (
    <Box>
      <form onSubmit={handleSendOtp}>
        <CountryPhoneSelector
          onChange={(val: string) => setPhoneNumber(val)}
          defaultCountryCode="+20"
          label={t('authForgotPassword.label.phone') as string}
        />
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {successMsg && <Alert severity="success" sx={{ mt: 2 }}>{successMsg}</Alert>}
        <Button variant="contained" color="primary" fullWidth type="submit" sx={{ mt: 2 }}>
          {t('authForgotPassword.button.sendOtp')}
        </Button>
        <Button variant="text" fullWidth sx={{ mt: 1 }} onClick={() => navigate('/auth/login')}>
          {t('authForgotPassword.button.backToLogin')}
        </Button>
        <Divider sx={{ my: 2 }} />
        <Typography variant="body2" align="center">
          {t('authForgotPassword.label.newUser')}{' '}
          <Button variant="text" onClick={() => navigate('/auth/register')}>
            {t('authForgotPassword.link.createAccount')}
          </Button>
        </Typography>
      </form>

      <Dialog open={otpDialogOpen} onClose={handleCancelOtp} disableEscapeKeyDown>
        <DialogTitle>
          {otpStage === 1 ? t('authForgotPassword.dialog.enterOtpTitle') : t('authForgotPassword.dialog.resetPasswordTitle')}
        </DialogTitle>
        <DialogContent>
          {otpStage === 1 && (
            <>
              <Typography variant="body1" mb={1}>
                {t('authForgotPassword.dialog.enterOtpPrompt')}
              </Typography>
              <OtpContainer>
                {otpCode.map((val, idx) => (
                  <OtpInput
                    key={idx}
                    id={`otp-${idx}`}
                    value={val}
                    onChange={(e: { target: { value: string; }; }) => handleChangeOtp(idx, e.target.value)}
                  />
                ))}
              </OtpContainer>
              {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
              {successMsg && <Alert severity="success" sx={{ mt: 2 }}>{successMsg}</Alert>}
              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <Button variant="contained" color="primary" fullWidth onClick={handleVerifyOtp}>
                  {t('authForgotPassword.button.verifyOtp')}
                </Button>
                <Button variant="outlined" color="secondary" fullWidth onClick={handleResendOtp}>
                  {t('authForgotPassword.button.resendOtp')}
                </Button>
              </Stack>
              <Button variant="text" color="error" fullWidth sx={{ mt: 1 }} onClick={handleCancelOtp}>
                {t('authForgotPassword.button.cancel')}
              </Button>
            </>
          )}
          {otpStage === 2 && (
            <>
              <Typography variant="body1" mb={1}>
                {t('authForgotPassword.dialog.otpVerifiedPrompt')}
              </Typography>
              <Box mt={2}>
                <CustomFormLabel htmlFor="newPassword">{t('authForgotPassword.label.newPassword')}</CustomFormLabel>
                <CustomTextField
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  fullWidth
                  value={newPassword}
                  onChange={(e: { target: { value: React.SetStateAction<string>; }; }) => setNewPassword(e.target.value)}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowNewPassword(!showNewPassword)} edge="end">
                          {showNewPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
              <Box mt={2}>
                <CustomFormLabel htmlFor="confirmPassword">{t('authForgotPassword.label.confirmPassword')}</CustomFormLabel>
                <CustomTextField
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  fullWidth
                  value={confirmPassword}
                  onChange={(e: { target: { value: React.SetStateAction<string>; }; }) => setConfirmPassword(e.target.value)}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end">
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
              {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
              {successMsg && <Alert severity="success" sx={{ mt: 2 }}>{successMsg}</Alert>}
              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <Button variant="contained" color="primary" fullWidth onClick={handleResetPassword}>
                  {t('authForgotPassword.button.resetPassword')}
                </Button>
                <Button variant="outlined" color="secondary" fullWidth onClick={handleCancelOtp}>
                  {t('authForgotPassword.button.cancel')}
                </Button>
              </Stack>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default AuthForgotPassword;
