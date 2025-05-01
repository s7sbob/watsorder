// src/components/apps/ecommerce/productCheckout/HorizontalStepper.tsx
import React from 'react';
import { Box, Button } from '@mui/material';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

interface Props {
  children: JSX.Element | JSX.Element[];
  steps: string[];
  activeStep: number;
  handleReset: () => void;
  finalStep: JSX.Element | JSX.Element[];
}

const HorizontalStepper: React.FC<Props> = ({ children, steps, activeStep, handleReset, finalStep }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { storeName } = useParams<{ storeName: string }>(); // جلب storeName من الـ URL

  return (
    <Box sx={{ width: '100%' }}>
      <Stepper activeStep={activeStep} alternativeLabel>
        {steps.map((label) => {
          const stepProps = {};
          const labelProps = {};
          return (
            <Step key={label} {...stepProps}>
              <StepLabel {...labelProps}>{label}</StepLabel>
            </Step>
          );
        })}
      </Stepper>
      {activeStep === steps.length ? (
        <React.Fragment>
          <Box>{finalStep}</Box>
          <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2 }}>
            <Button variant="contained" color="success" onClick={() => navigate(`/${storeName}`)}>
              {t('Ecommerce.continueShopping')}
            </Button>
            <Box sx={{ flex: '1 1 auto' }} />
            <Button variant="contained">{t('Ecommerce.downloadReceipt')}</Button>
            <Button onClick={handleReset}>{t('Ecommerce.reset')}</Button>
          </Box>
        </React.Fragment>
      ) : (
        <React.Fragment>
          <Box sx={{ mt: 2, mb: 1 }}>{children}</Box>
        </React.Fragment>
      )}
    </Box>
  );
};

export default HorizontalStepper;
