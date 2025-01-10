import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Stack, Typography, Divider } from '@mui/material';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import { registerType } from 'src/types/auth/auth';

const AuthRegister = ({ title, subtitle, subtext }: registerType) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState(''); // استخدم username بدلاً من email
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/api/auth/register', {
        username,
        name,
        password,
        // subscriptionType سيتم تعيينها افتراضياً من الخادم
      });
      console.log(response.data);
      navigate('/auth/login'); // توجيه المستخدم لتسجيل الدخول بعد التسجيل الناجح
    } catch (error: any) {
      console.error('Registration error:', error.response?.data || error.message);
      // هنا يمكن عرض رسالة خطأ للمستخدم إذا لزم الأمر
    }
  };

  return (
    <form onSubmit={handleRegister}>
      {title && (
        <Typography fontWeight="700" variant="h3" mb={1}>
          {title}
        </Typography>
      )}
      {subtext}
      <Box mt={3}>
        <Divider>
        </Divider>
      </Box>

      <Box>
        <Stack mb={3}>
          <CustomFormLabel htmlFor="name">Name</CustomFormLabel>
          <CustomTextField
            id="name"
            variant="outlined"
            fullWidth
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          />
          <CustomFormLabel htmlFor="username">Username</CustomFormLabel>
          <CustomTextField
            id="username"
            variant="outlined"
            fullWidth
            value={username}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
          />
          <CustomFormLabel htmlFor="password">Password</CustomFormLabel>
          <CustomTextField
            id="password"
            variant="outlined"
            fullWidth
            type="password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          />
        </Stack>
        <Button color="primary" variant="contained" size="large" fullWidth type="submit">
          Sign Up
        </Button>
      </Box>
      {subtitle}
    </form>
  );
};

export default AuthRegister;
