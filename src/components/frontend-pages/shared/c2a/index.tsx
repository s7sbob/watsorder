import { Box, Container, Typography, Stack, Button } from '@mui/material'
import { useTranslation } from 'react-i18next'

const C2a = () => {
  const { t } = useTranslation()

  return (
    <Container
      sx={{
        maxWidth: '1400px !important',
        py: { xs: '40px', lg: '70px' }
      }}
    >
      <Box
        bgcolor='primary.light'
        borderRadius='24px'
        overflow='hidden'
        position='relative'
        px={4}
        py={6}
      >
        <Typography
          variant='h4'
          mb={3}
          fontWeight={700}
          textAlign='center'
        >
          {t('About.C2a.title')}
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} justifyContent='center' mb={2}>
          <Button variant='contained' size='large' href='/auth/login'>
            {t('About.C2a.buttons.login')}
          </Button>
          <Button variant='outlined' size='large' href='/auth/register'>
            {t('About.C2a.buttons.register')}
          </Button>
        </Stack>
        <Typography fontSize='14px' textAlign='center'>
          {t('About.C2a.note')}
        </Typography>
      </Box>
    </Container>
  )
}

export default C2a
