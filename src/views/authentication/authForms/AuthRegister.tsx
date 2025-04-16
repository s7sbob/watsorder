import React, { useState, useEffect } from 'react';
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
  CircularProgress,
} from '@mui/material';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CountryPhoneSelector from '../auth1/CountryPhoneSelector'; // رقم الهاتف الرئيسي
import CountrySelector from '../auth1/CountrySelector'; // لتعيين الدولة
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// تنسيق خانات OTP
const OtpContainer = styled('div')({
  display: 'flex',
  justifyContent: 'center',
  gap: '4px',
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

  // الحقول الإضافية (اختيارية)
  const [companyName, setCompanyName] = useState('');
  const [, setCountry] = useState(''); // سيتم تعيين الدولة عبر CountrySelector
  const [address, setAddress] = useState('');
  const [contactFullPhone, setContactFullPhone] = useState('');

  // الحقول الخاصة بالـ OTP
  const [openOtpDialog, setOpenOtpDialog] = useState(false);
  const [otpValues, setOtpValues] = useState(['', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);

  // تنبيهات الخطأ والنجاح
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const navigate = useNavigate();
  const { t } = useTranslation();

  // إرسال طلب التسجيل الأولي لإرسال OTP
  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // عرض التنبيهات خارج نافذة OTP فقط إذا لم تكن النافذة مفتوحة
    if (!openOtpDialog) {
      setError(null);
      setSuccessMsg(null);
    }

    if (!name) {
      setError(t('authRegister.errors.enterName'));
      return;
    }
    if (!fullPhone) {
      setError(t('authRegister.errors.enterPhone'));
      return;
    }
    if (!password) {
      setError(t('authRegister.errors.enterPassword'));
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

  // تغيير قيمة خانة OTP والتركيز على الخانة التالية عند الإدخال
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

  // التحقق من OTP (يُستدعى تلقائيًا عندما يكون طول الكود 4)
  const handleVerifyClick = async () => {
    const code = otpValues.join('');
    if (code.length < 4) {
      setError(t('authRegister.errors.enter4DigitCode'));
      return;
    }
    setIsVerifying(true);
    setError(null);
    try {
      // استدعاء API التسجيل الذي يشمل التحقق من OTP وإنشاء الحساب
      const registerResp = await axiosServices.post('/api/auth/register', {
        phoneNumber: fullPhone,
        name,
        password,
        otpCode: code,
        companyName,      // اختياري
        address,          // اختياري
        contactPhone: contactFullPhone, // اختياري
      });

      // إخفاء نافذة OTP بعد نجاح التسجيل
      setOpenOtpDialog(false);

      // إرسال تنبيه بالتسجيل الجديد
      await axiosServices.post('/api/registration-notification/notify', {
        userName: name,
        userPhone: fullPhone,
        additionalData: `Company: ${companyName}, Address: ${address}, Contact: ${contactFullPhone}`,
      });

      setSuccessMsg(registerResp.data.message || t('authRegister.success.registered'));
      // إعادة التوجيه لصفحة تسجيل الدخول بعد تأخير بسيط
      setTimeout(() => {
        navigate('/auth/login');
      }, 2000);
    } catch (err: any) {
      setError(err?.response?.data?.message || t('authRegister.errors.otpVerificationFailed'));
      setOtpValues(['', '', '', '']);
    } finally {
      setIsVerifying(false);
    }
  };

  // استخدام useEffect للتأكد من بدء التحقق تلقائيًا عند إدخال 4 أرقام
  useEffect(() => {
    const code = otpValues.join('');
    if (code.length === 4 && !isVerifying) {
      handleVerifyClick();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpValues]);

  // إعادة إرسال رمز OTP
  const handleResendCode = async () => {
    setError(null);
    setSuccessMsg(null);
    try {
      await axiosServices.post('/api/otp/send-registration-otp', {
        phoneNumber: fullPhone,
      });
      setSuccessMsg(t('authRegister.success.codeResent'));
    } catch (err: any) {
      setError(err?.response?.data?.message || t('authRegister.errors.resendCode'));
    }
  };

  return (
    <>
      <form onSubmit={handleRegister}>
        <Typography fontWeight="700" variant="h4" mb={1}>
          {t('authRegister.title')}
        </Typography>

        <Divider sx={{ mb: 1 }} />

        {/* التنبيهات الخاصة بالتسجيل تظهر فقط إذا لم تكن نافذة OTP مفتوحة */}
        {!openOtpDialog && error && (
          <Alert severity="error" sx={{ mb: 1 }}>
            {error}
          </Alert>
        )}
        {!openOtpDialog && successMsg && (
          <Alert severity="success" sx={{ mb: 1 }}>
            {successMsg}
          </Alert>
        )}

        <Stack spacing={0} mt={1}>
          <Box>
            <CustomFormLabel htmlFor="name">{t('authRegister.label.fullName')}</CustomFormLabel>
            <CustomTextField
              id="name"
              variant="outlined"
              fullWidth
              value={name}
              onChange={(e: { target: { value: React.SetStateAction<string>; }; }) => setName(e.target.value)}
            />
          </Box>

          <CountryPhoneSelector
            onChange={(val: string) => setFullPhone(val)}
            defaultCountryCode="+20"
            label={t('authRegister.label.phoneNumber') as string}
          />

          <Box>
            <CustomFormLabel htmlFor="password">{t('authRegister.label.password')}</CustomFormLabel>
            <CustomTextField
              id="password"
              type="password"
              variant="outlined"
              fullWidth
              value={password}
              onChange={(e: { target: { value: React.SetStateAction<string>; }; }) => setPassword(e.target.value)}
            />
          </Box>

          {/* الحقول الاختيارية */}
          <Box>
            <CustomFormLabel htmlFor="companyName">
              {t('authRegister.label.companyName')} ({t('authRegister.optional')})
            </CustomFormLabel>
            <CustomTextField
              id="companyName"
              variant="outlined"
              fullWidth
              value={companyName}
              onChange={(e: { target: { value: React.SetStateAction<string>; }; }) => setCompanyName(e.target.value)}
            />
          </Box>
          <Box>
            <CustomFormLabel htmlFor="countrySelector">
              {t('authRegister.label.country')} ({t('authRegister.optional')})
            </CustomFormLabel>
            <CountrySelector
              onChange={(country) => {
                setCountry(country.label);
              }}
            />
          </Box>
          <Box>
            <CustomFormLabel htmlFor="address">
              {t('authRegister.label.address')} ({t('authRegister.optional')})
            </CustomFormLabel>
            <CustomTextField
              id="address"
              variant="outlined"
              fullWidth
              value={address}
              onChange={(e: { target: { value: React.SetStateAction<string>; }; }) => setAddress(e.target.value)}
            />
          </Box>
          <Box>
            <CustomFormLabel htmlFor="contactPhone">
              {t('authRegister.label.contactPhone')} ({t('authRegister.optional')})
            </CustomFormLabel>
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
          {t('authRegister.registerButton')}
        </Button>

        <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
          {t('authRegister.alreadyAccount')}{' '}
          <Link href="/auth/login" underline="none" color="primary">
            {t('authRegister.signIn')}
          </Link>
        </Typography>
      </form>

      {/* Dialog لإدخال OTP */}
      <Dialog open={openOtpDialog} onClose={() => {}} disableEscapeKeyDown>
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          {t('authRegister.otpDialog.title')}
        </DialogTitle>
        <DialogContent>
          {/* التنبيهات الخاصة بالـ OTP تظهر داخل النافذة */}
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

          <Typography variant="body1" sx={{ mb: 1 }}>
            {t('authRegister.otpDialog.prompt')}
          </Typography>

          {isVerifying ? (
            <Box display="flex" flexDirection="column" alignItems="center" mt={2}>
              <CircularProgress />
              <Typography variant="body1" sx={{ mt: 1 }}>
                {t('authRegister.otpDialog.verifying')}
              </Typography>
            </Box>
          ) : (
            <>
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
              <Button
                variant="contained"
                color="primary"
                fullWidth
                sx={{ mt: 2 }}
                onClick={handleVerifyClick}
                disabled={otpValues.join('').length < 4 || isVerifying}
              >
                {t('authRegister.otpDialog.verify')}
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
                {t('authRegister.otpDialog.resend')}
              </Typography>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default AuthRegister;
