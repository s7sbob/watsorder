// src/views/pages/authentication/AuthLogin.tsx
import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import {
  Box,
  Button,
  Stack,
  Typography,
  FormGroup,
  FormControlLabel,
  Divider,
  Alert
} from '@mui/material'
import axiosServices from '../../../utils/axios'
import CustomCheckbox from '../../../components/forms/theme-elements/CustomCheckbox'
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField'
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel'
import { loginType } from 'src/types/auth/auth'
import { setToken } from 'src/store/auth/AuthSlice' // نستخدم setToken

const AuthLogin = ({ title, subtitle, subtext }: loginType) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const navigate = useNavigate()
  const dispatch = useDispatch()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      const response = await axiosServices.post('/api/auth/login', {
        username,
        password
      })
      // نفترض الـ backend يعيد: { message, token }
      const { token } = response.data

      if (token) {
        // خزّن التوكن في الـ Redux => فيه يتم التخزين في الكوكي
        dispatch(setToken(token))

        // اذهب للصفحة الرئيسية (أو أي مكان)
        navigate('/apps/sessions')
      }
    } catch (error: any) {
      setError(error?.message || 'An error occurred. Please try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {title && (
        <Typography fontWeight='700' variant='h3' mb={1}>
          {title}
        </Typography>
      )}
      {subtext}
      <Box mt={3}>
        <Divider />
      </Box>

      {error && (
        <Box mt={2}>
          <Alert severity='error'>{error}</Alert>
        </Box>
      )}

      <Stack spacing={2} mt={3}>
        <Box>
          <CustomFormLabel htmlFor='username'>Username</CustomFormLabel>
          <CustomTextField
            id='username'
            variant='outlined'
            fullWidth
            value={username}
            onChange={(e: { target: { value: React.SetStateAction<string> } }) => setUsername(e.target.value)}
          />
        </Box>
        <Box>
          <CustomFormLabel htmlFor='password'>Password</CustomFormLabel>
          <CustomTextField
            id='password'
            type='password'
            variant='outlined'
            fullWidth
            value={password}
            onChange={(e: { target: { value: React.SetStateAction<string> } }) => setPassword(e.target.value)}
          />
        </Box>
        <Stack justifyContent='space-between' direction='row' alignItems='center'>
          <FormGroup>
            <FormControlLabel
              control={<CustomCheckbox defaultChecked />}
              label='Remember this Device'
            />
          </FormGroup>
          <Typography
            component={Link}
            to='/auth/forgot-password'
            fontWeight='500'
            sx={{ textDecoration: 'none', color: 'primary.main' }}
          >
            Forgot Password?
          </Typography>
        </Stack>
      </Stack>

      <Box mt={2}>
        <Button color='primary' variant='contained' size='large' fullWidth type='submit'>
          Sign In
        </Button>
      </Box>
      {subtitle}
    </form>
  )
}

export default AuthLogin
