// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'src/store/Store';

import {
  Box,
  Typography,
  Tabs,
  Tab,
} from '@mui/material';
import ChildCard from 'src/components/shared/ChildCard';

interface TabProps {
  children: React.ReactNode;
  index: number;
  value?: number;
}

const TabPanel = (props: TabProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

const a11yProps = (index: number) => {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
};

const ProductDesc = () => {
  const [value, setValue] = React.useState(0);
  const { productId } = useParams();
  const products = useSelector((state) => state.ecommerceReducer.products);
  const product = products.find((p: { id: number | string }) => p.id.toString() === productId);

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <ChildCard>
      <Box>
        <Box sx={{ borderBottom: 1, borderColor: 'grey.100' }}>
          <Tabs
            value={value}
            onChange={handleChange}
            aria-label="basic tabs example"
            textColor="primary"
            allowScrollButtonsMobile
            scrollButtons
            indicatorColor="primary"
          >
            <Tab label="الوصف" {...a11yProps(0)} />
          </Tabs>
        </Box>
        {/* ------------------------------------------- */}
        {/* Decription */}
        {/* ------------------------------------------- */}
        <TabPanel value={value} index={0}>
          <Typography variant="h5">
            لا يوجد وصف متاح لهذا المنتج.
          </Typography>
          <Typography color="textSecondary" mt={4}>
            يمكنك الاطلاع على تفاصيل المنتج والمواصفات الكاملة. نحن نضمن جودة منتجاتنا ونوفر خدمة ما بعد البيع.
          </Typography>
          <Typography color="textSecondary" variant="body1" fontWeight={400} mt={4}>
            للاستفسارات أو طلب المزيد من المعلومات، يرجى التواصل مع خدمة العملاء.
          </Typography>
        </TabPanel>
      </Box>
    </ChildCard>
  );
};

export default ProductDesc;
