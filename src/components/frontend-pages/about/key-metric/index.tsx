import { Box, Container, Grid } from '@mui/material'
import ContentArea from './ContentArea'
import Key from './Key'

const KeyMetric = () => (
  <Box
    sx={{
      pt: { xs: '40px', lg: '90px' },
      pb: { xs: '40px', lg: '90px' },
      boxShadow: (theme) => theme.shadows[10]
    }}
  >
    <Container maxWidth='lg'>
      <Grid container spacing={5} justifyContent='space-between'>
        <Grid item xs={12} lg={5}>
          <ContentArea />
        </Grid>
        <Grid item xs={12} lg={6}>
          <Key />
        </Grid>
      </Grid>
    </Container>
  </Box>
)

export default KeyMetric
