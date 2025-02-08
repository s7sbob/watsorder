// src/components/tabs/BroadcastTab.tsx
import React, { useState } from 'react';
import { Box, TextField, Button } from '@mui/material';
import * as XLSX from 'xlsx';
import axiosServices from 'src/utils/axios';

interface MediaFile {
  base64: string;
  mimetype: string;
  filename: string;
}

interface BroadcastData {
  phoneNumbers: string[];
  message: string;
  randomNumbers: number[];
  media: MediaFile[];
}

const BroadcastTab: React.FC<{ sessionId: number }> = ({ sessionId }) => {
  const [broadcastData, setBroadcastData] = useState<BroadcastData>({
    phoneNumbers: [],
    message: '',
    randomNumbers: [],
    media: []
  });

  const handleExcelChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const data = e.target?.result;
      if (!data) return;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });
      const phoneNumbersFromExcel = rows.map(row => row[0]).filter(Boolean);
      setBroadcastData(prev => ({
        ...prev,
        phoneNumbers: phoneNumbersFromExcel as string[]
      }));
    };
    reader.readAsBinaryString(file);
  };

  const handleDelayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    if (value.includes('-')) {
      const [startStr, endStr] = value.split('-').map(part => part.trim());
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end) && end >= start) {
        const numbers: number[] = [];
        for (let i = start; i <= end; i++) {
          numbers.push(i);
        }
        setBroadcastData(prev => ({ ...prev, randomNumbers: numbers }));
      } else {
        setBroadcastData(prev => ({ ...prev, randomNumbers: [] }));
      }
    } else {
      const numbers = value
        .split(',')
        .map(v => parseInt(v.trim(), 10))
        .filter(num => !isNaN(num));
      setBroadcastData(prev => ({ ...prev, randomNumbers: numbers }));
    }
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return;
    const files = Array.from(event.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        if (e.target?.result) {
          const base64String = e.target.result.toString();
          const base64Only = base64String.split(',')[1];
          setBroadcastData(prev => ({
            ...prev,
            media: [
              ...prev.media,
              {
                base64: base64Only,
                mimetype: file.type,
                filename: file.name
              }
            ]
          }));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleInsertPlaceholder = (placeholder: string) => {
    setBroadcastData(prev => ({
      ...prev,
      message: `${prev.message} ${placeholder}`
    }));
  };

  const getCurrentDateTime = () => {
    const now = new Date();
    return `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
  };

  const handleBroadcastSubmit = async () => {
    const { phoneNumbers, message, randomNumbers, media } = broadcastData;
    if (!phoneNumbers.length || !randomNumbers.length) {
      alert('Please fill all required fields');
      return;
    }
    try {
      const finalMessage = phoneNumbers.map(phoneNumber =>
        message
          .replace('${recipientPhone}', phoneNumber)
          .replace('${currentDateTime}', getCurrentDateTime())
      );
      await axiosServices.post(`/api/sessions/${sessionId}/broadcast`, {
        phoneNumbers,
        message: finalMessage.join(' '),
        randomNumbers,
        media
      });
      alert('Broadcast messages sent successfully');
      setBroadcastData({
        phoneNumbers: [],
        message: '',
        randomNumbers: [],
        media: []
      });
    } catch (error) {
      console.error('Error sending broadcast:', error);
      alert('Failed to send broadcast messages');
    }
  };

  return (
    <Box>
      <TextField
        label="Phone Numbers (comma separated)"
        fullWidth
        margin="normal"
        value={broadcastData.phoneNumbers.join(',')}
        onChange={(e) =>
          setBroadcastData({ ...broadcastData, phoneNumbers: e.target.value.split(',') })
        }
      />
      <Button variant="contained" component="label" sx={{ mt: 2 }}>
        Upload Excel
        <input type="file" hidden onChange={handleExcelChange} accept=".xlsx, .xls" />
      </Button>
      {broadcastData.phoneNumbers.length > 0 && (
        <Box component="ul">
          {broadcastData.phoneNumbers.map((phone, idx) => (
            <li key={idx}>{phone}</li>
          ))}
        </Box>
      )}
      <TextField
        label="Message"
        fullWidth
        margin="normal"
        multiline
        rows={4}
        value={broadcastData.message}
        onChange={(e) => setBroadcastData({ ...broadcastData, message: e.target.value })}
      />
      <Box mt={2}>
        <Button variant="outlined" onClick={() => handleInsertPlaceholder('${recipientPhone}')} sx={{ mr: 1 }}>
          Insert Recipient Phone
        </Button>
        <Button variant="outlined" onClick={() => handleInsertPlaceholder('${currentDateTime}')}>
          Insert Date/Time
        </Button>
      </Box>
      <TextField
        label="Delays (comma separated or interval e.g. 5-7)"
        fullWidth
        margin="normal"
        onChange={handleDelayChange}
      />
      <Button variant="contained" component="label" sx={{ mt: 2 }}>
        Upload Image(s)
        <input type="file" multiple hidden accept="image/*" onChange={handleImageChange} />
      </Button>
      {broadcastData.media.length > 0 && (
        <Box component="ul">
          {broadcastData.media.map((file, idx) => (
            <li key={idx}>{file.filename}</li>
          ))}
        </Box>
      )}
      <Box mt={2}>
        <Button variant="contained" onClick={handleBroadcastSubmit}>
          Send Broadcast
        </Button>
      </Box>
    </Box>
  );
};

export default BroadcastTab;
