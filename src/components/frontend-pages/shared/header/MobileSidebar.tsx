
import { Stack, Box, Button } from '@mui/material';
import { useSelector } from 'src/store/Store';

import { useTranslation } from 'react-i18next';
import { AppState } from 'src/store/Store';
import Language from 'src/layouts/full/vertical/header/Language'; // استيراد مكون اختيار اللغة
import { jwtDecode } from 'jwt-decode';
import Logo from 'src/layouts/full/shared/logo/Logo';
import { useNavigate } from 'react-router';

interface DecodedToken {
  exp: number;
  [key: string]: any;
}

const MobileSidebar = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const token = useSelector((state: AppState) => state.auth.token);

  const handleLoginClick = () => {
    if (token) {
      try {
        const decoded: DecodedToken = jwtDecode(token);
        const isExpired = decoded.exp * 1000 < Date.now();

        if (!isExpired) {
          navigate('/apps/sessions');
          return;
        }
      } catch (error) {
        console.error('Invalid token:', error);
      }
    }
    navigate('/auth/login');
  };

  return (
    <>
      <Box px={3}>
        <Logo />
      </Box>
      <Box p={3}>
        <Stack direction="column" spacing={2}>
          {/* تضمين مكون اختيار اللغة بنفس الشكل */}
          <Language />
          <Button color="primary" variant="contained" onClick={handleLoginClick}>
            {t('HomePage.Header.login')}
          </Button>
        </Stack>
      </Box>
    </>
  );
};

export default MobileSidebar;
