// src/views/pages/authForms/AuthForgotPassword.tsx
import React, { useState } from 'react';
import { Box, Button, Stack, Typography, Alert, Dialog, DialogTitle, DialogContent, Divider } from '@mui/material';
import axiosServices from 'src/utils/axios';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CountryPhoneSelector from '../auth1/CountryPhoneSelector';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';

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
  // Basic state for phone number and OTP
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  const [otpCode, setOtpCode] = useState(['', '', '', '']);
  // Stage 1: OTP stage; Stage 2: New password stage
  const [otpStage, setOtpStage] = useState(1);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const navigate = useNavigate();

  // Send OTP for password reset
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    if (!phoneNumber) {
      setError('Please enter your phone number.');
      return;
    }
    try {
      const res = await axiosServices.post('/api/auth/forgot-password/send-otp', { phoneNumber });
      setSuccessMsg(res.data.message || 'OTP has been sent successfully.');
      // Open the dialog and set OTP stage to 1
      setOtpStage(1);
      setOtpDialogOpen(true);
    } catch (err: any) {
      console.error('OTP error:', err);
      setError(err.message || 'Error sending OTP. Please try again.');
    }
  };

  // Handle OTP input change
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

  // Verify OTP without resetting password
  const handleVerifyOtp = async () => {
    setError(null);
    setSuccessMsg(null);
    const code = otpCode.join('');
    if (code.length < 4) {
      setError('Please enter the 4-digit OTP.');
      return;
    }
    try {
      // Call an endpoint that verifies OTP only (make sure you implement this in your backend)
      const res = await axiosServices.post('/api/auth/forgot-password/verify-otp', {
        phoneNumber,
        otpCode: code,
      });
      setSuccessMsg(res.data.message || 'OTP verified successfully.');
      // Move to the password entry stage
      setOtpStage(2);
    } catch (err: any) {
      console.error('OTP verification error:', err);
      setError(err.message || 'Error verifying OTP. Please try again.');
    }
  };

  // Reset password after OTP verification
  const handleResetPassword = async () => {
    setError(null);
    setSuccessMsg(null);
    if (!newPassword || !confirmPassword) {
      setError('Please enter and confirm your new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    try {
      // Now call the endpoint to reset the password
      const res = await axiosServices.post('/api/auth/forgot-password/reset', {
        phoneNumber,
        newPassword,
      });
      setSuccessMsg(res.data.message || 'Password reset successfully.');
      setOtpDialogOpen(false);
      navigate('/auth/login');
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(err.message || 'Error resetting password. Please try again.');
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await axiosServices.post('/api/auth/forgot-password/send-otp', { phoneNumber });
      setSuccessMsg(res.data.message || 'OTP has been resent successfully.');
      // Reset OTP fields
      setOtpCode(['', '', '', '']);
    } catch (err: any) {
      console.error('Resend OTP error:', err);
      setError(err.message || 'Error resending OTP. Please try again.');
    }
  };

  // Cancel the OTP dialog and reset state
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
        <Typography variant="h4" fontWeight="700" mb={1}>
          Forgot Your Password?
        </Typography>
        <Typography variant="body1" mb={2}>
          Enter the phone number associated with your account. We will send you an OTP to verify your identity.
        </Typography>
        <CountryPhoneSelector
          onChange={(val: string) => setPhoneNumber(val)}
          defaultCountryCode="+20"
          label="Registered Phone Number"
        />
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {successMsg && <Alert severity="success" sx={{ mt: 2 }}>{successMsg}</Alert>}
        <Button variant="contained" color="primary" fullWidth type="submit" sx={{ mt: 2 }}>
          Send OTP
        </Button>
        <Button variant="text" fullWidth sx={{ mt: 1 }} onClick={() => navigate('/auth/login')}>
          Back to Login
        </Button>
        <Divider sx={{ my: 2 }} />
        <Typography variant="body2" align="center">
          New to WatsOrder?{' '}
          <Button variant="text" onClick={() => navigate('/auth/register')}>
            Create an account
          </Button>
        </Typography>
      </form>

      <Dialog open={otpDialogOpen} onClose={handleCancelOtp} disableEscapeKeyDown>
        <DialogTitle>
          {otpStage === 1 ? 'Enter OTP' : 'Reset Your Password'}
        </DialogTitle>
        <DialogContent>
          {otpStage === 1 && (
            <>
              <Typography variant="body1" mb={1}>
                Enter the 4-digit OTP sent to your phone.
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
                  Verify OTP
                </Button>
                <Button variant="outlined" color="secondary" fullWidth onClick={handleResendOtp}>
                  Resend OTP
                </Button>
              </Stack>
              <Button variant="text" color="error" fullWidth sx={{ mt: 1 }} onClick={handleCancelOtp}>
                Cancel
              </Button>
            </>
          )}
          {otpStage === 2 && (
            <>
              <Typography variant="body1" mb={1}>
                OTP verified! Now, enter your new password.
              </Typography>
              <Box mt={2}>
                <CustomFormLabel htmlFor="newPassword">New Password</CustomFormLabel>
                <CustomTextField
                  id="newPassword"
                  type="password"
                  fullWidth
                  value={newPassword}
                  onChange={(e: { target: { value: React.SetStateAction<string>; }; }) => setNewPassword(e.target.value)}
                />
              </Box>
              <Box mt={2}>
                <CustomFormLabel htmlFor="confirmPassword">Confirm New Password</CustomFormLabel>
                <CustomTextField
                  id="confirmPassword"
                  type="password"
                  fullWidth
                  value={confirmPassword}
                  onChange={(e: { target: { value: React.SetStateAction<string>; }; }) => setConfirmPassword(e.target.value)}
                />
              </Box>
              {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
              {successMsg && <Alert severity="success" sx={{ mt: 2 }}>{successMsg}</Alert>}
              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <Button variant="contained" color="primary" fullWidth onClick={handleResetPassword}>
                  Reset Password
                </Button>
                <Button variant="outlined" color="secondary" fullWidth onClick={handleCancelOtp}>
                  Cancel
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
