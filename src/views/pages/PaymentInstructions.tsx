// src/views/pages/PaymentInstructions.tsx

import React from 'react';
import { Box, Typography, Button } from '@mui/material';

interface PaymentInstructionsProps {
  onDone: () => void;
}

const PaymentInstructions: React.FC<PaymentInstructionsProps> = ({ onDone }) => {

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        Payment Instructions
      </Typography>
      <Typography variant="body1" gutterBottom>
        Based on your chosen plan, you are required to pay the corresponding amount.
      </Typography>
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6">Vodafone Cash: 01000000000</Typography>
        <Typography variant="h6">InstaPay: 01200000000</Typography>
        <Typography variant="h6">For assistance, call: 190</Typography>
      </Box>
      <Button
        variant="contained"
        color="primary"
        sx={{ mt: 4 }}
        onClick={onDone}
      >
        I have paid – Send to the Manager
      </Button>
    </Box>
  );
};

export default PaymentInstructions;
