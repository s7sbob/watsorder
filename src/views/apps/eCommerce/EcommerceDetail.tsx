// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useEffect } from 'react';
import { Grid } from '@mui/material';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'src/store/Store';
import { fetchStoreData } from 'src/store/apps/eCommerce/ECommerceSlice';
import ProductCarousel from 'src/components/apps/ecommerce/productDetail/ProductCarousel';
import PageContainer from 'src/components/container/PageContainer';
import ProductDetail from 'src/components/apps/ecommerce/productDetail/ProductDetail';
import ProductDesc from 'src/components/apps/ecommerce/productDetail/ProductDesc';
import ProductRelated from 'src/components/apps/ecommerce/productDetail/ProductRelated';
import ChildCard from 'src/components/shared/ChildCard';
import { Box, CircularProgress, Typography } from '@mui/material';

const EcommerceDetail = () => {
  const { storeName, productId } = useParams();
  const dispatch = useDispatch();
  const { products, error } = useSelector((state) => state.ecommerceReducer);

  useEffect(() => {
    if (storeName && !products.length) {
      dispatch(fetchStoreData(storeName));
    }
  }, [dispatch, storeName, products.length]);

  const product = products.find((p: { id: number | string }) => p.id.toString() === productId);



  if (!products.length) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <Typography variant="h4" color="error">
          حدث خطأ أثناء تحميل المنتج. يرجى المحاولة مرة أخرى.
        </Typography>
      </Box>
    );
  }

  if (!product) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <Typography variant="h4">
          المنتج غير موجود.
        </Typography>
      </Box>
    );
  }

  return (
    <PageContainer title={(product as any).title || "تفاصيل المنتج"} description={`تفاصيل المنتج: ${(product as any).title || "غير معروف"}`}>
      <Grid container spacing={3} sx={{ maxWidth: { lg: '1055px', xl: '1200px' } }}>
        <Grid item xs={12} sm={12} lg={12}>
          <ChildCard>
            {/* ------------------------------------------- */}
            {/* Carousel */}
            {/* ------------------------------------------- */}
            <Grid container spacing={3}>
              <Grid item xs={12} sm={12} lg={6}>
                <ProductCarousel />
              </Grid>
              <Grid item xs={12} sm={12} lg={6}>
                <ProductDetail />
              </Grid>
            </Grid>
          </ChildCard>
        </Grid>
        <Grid item xs={12} sm={12} lg={12}>
          <ProductDesc />
        </Grid>
        <Grid item xs={12} sm={12} lg={12}>
          <ProductRelated />
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default EcommerceDetail;
