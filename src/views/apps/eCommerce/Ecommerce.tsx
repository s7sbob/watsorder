import React, { useEffect, useState } from 'react';
import {
  Box, Button, CircularProgress, Container, Stack, Typography, IconButton, Badge
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'src/store/Store';
import { fetchStoreData, filterProducts } from 'src/store/apps/eCommerce/ECommerceSlice';
import { useTranslation } from 'react-i18next';
import PageContainer from 'src/components/container/PageContainer';
import ProductSidebar from 'src/components/apps/ecommerce/productGrid/ProductSidebar';
import ProductList from 'src/components/apps/ecommerce/productGrid/ProductList';
import AppCard from 'src/components/shared/AppCard';
import { IconShoppingCart } from '@tabler/icons-react';
import FloatingCart from './FloatingCart';
import Cart from './Cart'; // إضافة مكون السلة

const Ecommerce: React.FC = () => {
  const { t } = useTranslation();
  const { storeName } = useParams<{ storeName: string }>();
  const dispatch = useDispatch();
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false); // التحكم في فتح الـ Side Drawer
  const [cartVisible, setCartVisible] = useState(false); // التحكم في ظهور السلة السفلية

  const { storeInfo, products, error, categories, filters, cart } = useSelector(
    (state) => state.ecommerceReducer,
  );

  useEffect(() => {
    if (storeName) {
      dispatch(fetchStoreData(storeName));
      const timer = setTimeout(() => setLoading(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [dispatch, storeName]);

  // إظهار السلة السفلية عند وجود عناصر في السلة
  useEffect(() => {
    if (cart.length > 0) {
      setCartVisible(true);
    } else {
      setCartVisible(false);
    }
  }, [cart]);

  /* ------------- حالات التحميل / الخطأ ------------- */
  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Container>
    );
  }
  if (error) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Typography variant="h4" color="error">{t('Ecommerce.errorLoading')}</Typography>
      </Container>
    );
  }
  if (products.length === 0) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Typography variant="h4">{t('Ecommerce.noProducts')}</Typography>
      </Container>
    );
  }

  /* ------------- واجهة المتجر ------------- */
  return (
    <PageContainer title={storeInfo.name} description={storeInfo.about}>
      {/* رمز السلة في الأعلى */}
      <Box sx={{ position: 'fixed', top: 20, right: 20, zIndex: 100 }}>
        <IconButton
          color="primary"
          sx={{ backgroundColor: '#5d87ff', color: '#fff', '&:hover': { backgroundColor: '#4a6fa5' } }}
          onClick={() => setCartDrawerOpen(true)} // فتح الـ Side Drawer
        >
          <Badge badgeContent={cart.length} color="error">
            <IconShoppingCart size={24} />
          </Badge>
        </IconButton>
      </Box>

      {/* الغلاف */}
      <Box
        sx={{
          position: 'relative',
          minHeight: 240,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 4,
          backgroundImage: `url(${storeInfo.logo})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderRadius: 2,
          boxShadow: 3,
        }}
      >
        <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.55)', borderRadius: 2 }} />
        <Box sx={{ position: 'relative', zIndex: 2, textAlign: 'center', color: '#fff', py: 6 }}>
          <Typography variant="h2" fontWeight={700} mb={1} sx={{ fontSize: { xs: 28, sm: 38 } }}>
            {storeInfo.name}
          </Typography>
          {storeInfo.about && <Typography variant="h6">{storeInfo.about}</Typography>}
        </Box>
      </Box>

      {/* فلاتر الفئات أفقية */}
      {categories.length ? (
        <Stack direction="row" spacing={2} justifyContent="center" mb={3} flexWrap="wrap">
          {['All', ...categories].map((cat) => (
            <Button
              key={cat}
              color={filters.category === cat ? 'primary' : 'inherit'}
              variant={filters.category === cat ? 'contained' : 'outlined'}
              onClick={() => dispatch(filterProducts({ category: cat }))}
              size="large"
              sx={{ minWidth: 120, fontWeight: 600 }}
            >
              {cat === 'All' ? t('Ecommerce.all') : cat}
            </Button>
          ))}
        </Stack>
      ) : null}

      {/* المحتوى الرئيسي */}
      <AppCard sx={{ display: 'flex', flexDirection: 'row', gap: 3, background: '#fafbff' }}>
        <ProductSidebar
          isMobileSidebarOpen={isMobileSidebarOpen}
          onSidebarClose={() => setMobileSidebarOpen(false)}
        />
        <Box p={3} flexGrow={1}>
          <ProductList onCartUpdate={() => setCartVisible(true)} />
        </Box>
      </AppCard>

      {/* السلة السفلية مع Animation */}
      <FloatingCart visible={cartVisible} onClose={() => setCartVisible(false)} onViewCart={() => setCartDrawerOpen(true)} />

      {/* الـ Side Drawer للسلة */}
      <Cart open={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />
    </PageContainer>
  );
};

export default Ecommerce;
