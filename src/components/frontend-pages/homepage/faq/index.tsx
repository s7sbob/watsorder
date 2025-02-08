// src/components/frontend-pages/homepage/FAQ.tsx
import { Box, Grid, Typography, Container, Link, Divider, Stack } from '@mui/material';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import { IconMinus, IconPlus } from '@tabler/icons-react';
import { useState } from 'react';
import { styled } from '@mui/material/styles';
import { useTheme } from '@mui/material/styles';

const StyledAccordion = styled(Accordion)(({ theme }) => ({
  borderRadius: '8px',
  marginBottom: '16px !important',
  boxShadow: theme.palette.mode === 'light' ? '0px 3px 0px rgba(235, 241, 246, 0.25)' : 'unset',
  border: `1px solid ${theme.palette.divider}`,
  '&:before': { display: 'none' },
  '&.Mui-expanded': { margin: 0 },
}));

const FAQ = () => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState<string | false>(false);

  const handleChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  return (
    <Container maxWidth="lg" sx={{ pb: { xs: '30px', lg: '60px' } }}>
      <Grid container spacing={3} justifyContent="center">
        <Grid item xs={12} lg={8}>
          <Typography variant="h4" textAlign="center" fontWeight="700" mb={4}>
            Frequently Asked Questions
          </Typography>
          <Box>
            <StyledAccordion expanded={expanded === 'panel1'} onChange={handleChange('panel1')}>
              <AccordionSummary
                expandIcon={expanded === 'panel1' ? <IconMinus size={21} /> : <IconPlus size={21} />}
                aria-controls="panel1-content"
                id="panel1-header"
              >
                How does the WhatsApp Bot work for restaurants?
              </AccordionSummary>
              <AccordionDetails>
                <Typography>
                  Our bot integrates with your restaurant's order system. Customers can place orders via WhatsApp,
                  and the orders are sent directly to your dashboard for review and confirmation.
                </Typography>
              </AccordionDetails>
            </StyledAccordion>
            <StyledAccordion expanded={expanded === 'panel2'} onChange={handleChange('panel2')}>
              <AccordionSummary
                expandIcon={expanded === 'panel2' ? <IconMinus size={21} /> : <IconPlus size={21} />}
                aria-controls="panel2-content"
                id="panel2-header"
              >
                What support options are available?
              </AccordionSummary>
              <AccordionDetails>
                <Typography>
                  We offer email support, live chat, and dedicated support for our Premium and Ultimate plans.
                </Typography>
              </AccordionDetails>
            </StyledAccordion>
            <StyledAccordion expanded={expanded === 'panel3'} onChange={handleChange('panel3')}>
              <AccordionSummary
                expandIcon={expanded === 'panel3' ? <IconMinus size={21} /> : <IconPlus size={21} />}
                aria-controls="panel3-content"
                id="panel3-header"
              >
                Are there any setup fees or recurring costs?
              </AccordionSummary>
              <AccordionDetails>
                <Typography>
                  There are no recurring fees for our one-time purchase plans. Choose the plan that fits your needs.
                </Typography>
              </AccordionDetails>
            </StyledAccordion>
          </Box>
        </Grid>
      </Grid>
      <Grid container spacing={3} justifyContent="center">
        <Grid item xs={12} lg={5}>
          <Box
            mt={5}
            borderRadius="8px"
            display="inline-flex"
            justifyContent="center"
            gap="4px"
            alignItems="center"
            fontWeight={500}
            sx={{
              border: `1px dashed ${theme.palette.divider}`,
              padding: '7px 10px',
              cursor: 'pointer',
              '&:hover': { borderColor: 'primary.main' },
            }}
          >
            <Typography>Still have a question?</Typography>
            <Link
              href="https://discord.com/invite/XujgB8ww4n"
              color="inherit"
              underline="always"
              sx={{ '&:hover': { color: 'primary.main' } }}
            >
              Ask on Discord
            </Link>
            <Typography>or</Typography>
            <Link
              href="https://your-support-link.com"
              color="inherit"
              underline="always"
              sx={{ '&:hover': { color: 'primary.main' } }}
            >
              submit a ticket
            </Link>
            .
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
};

export default FAQ;
