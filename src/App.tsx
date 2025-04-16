import { CssBaseline, ThemeProvider } from '@mui/material';
import { useRoutes } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ThemeSettings } from './theme/Theme';
import RTL from './layouts/full/shared/customizer/RTL';
import ScrollToTop from './components/shared/ScrollToTop';
import routes from './routes/Router';
import { AppState } from './store/Store';
import { UserProvider } from 'src/context/UserContext';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

function App() {
  const routing = useRoutes(routes);
  const theme = ThemeSettings();
  const customizer = useSelector((state: AppState) => state.customizer);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <ThemeProvider theme={theme}>
        <UserProvider>
          <RTL direction={customizer.activeDir ?? 'ltr'}>
            <CssBaseline />
            <ScrollToTop>{routing}</ScrollToTop>
          </RTL>
        </UserProvider>
      </ThemeProvider>
    </LocalizationProvider>
  );
}

export default App;
