// src/components/tabs/GreetingTab.tsx
import React, { useState } from 'react';
import { Box, TextField, FormControlLabel, Checkbox, Button } from '@mui/material';
import axiosServices from 'src/utils/axios';

interface GreetingTabProps {
  sessionId: number;
}

const GreetingTab: React.FC<GreetingTabProps> = ({ sessionId }) => {
  const [greetingData, setGreetingData] = useState<{ greetingMessage: string; greetingActive: boolean }>({
    greetingMessage: '',
    greetingActive: false
  });

  const handleGreetingUpdate = async () => {
    try {
      await axiosServices.put(`/api/sessions/${sessionId}/greeting`, {
        greetingMessage: greetingData.greetingMessage,
        greetingActive: greetingData.greetingActive
      });
      alert('Greeting message updated successfully.');
    } catch (error) {
      console.error('Error updating greeting:', error);
      alert('An error occurred while updating the greeting message.');
    }
  };

  return (
    <Box>
      <TextField
        label="Greeting Message"
        fullWidth
        multiline
        rows={3}
        value={greetingData.greetingMessage}
        onChange={(e) => setGreetingData({ ...greetingData, greetingMessage: e.target.value })}
        sx={{ mt: 2 }}
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={greetingData.greetingActive}
            onChange={(e) => setGreetingData({ ...greetingData, greetingActive: e.target.checked })}
          />
        }
        label="Enable Greeting Message"
        sx={{ mt: 2 }}
      />
      <Box mt={2}>
        <Button variant="contained" onClick={handleGreetingUpdate}>
          Save
        </Button>
      </Box>
    </Box>
  );
};

export default GreetingTab;
