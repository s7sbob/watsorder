// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useEffect } from 'react';
import { Box, Stack, Typography, CardContent, Grid, Skeleton } from '@mui/material';
import { useSelector } from 'src/store/Store';
import { Link, useParams } from 'react-router-dom';
import BlankCard from 'src/components/shared/BlankCard';

const ProductRelated = () => {
  const { storeName } = useParams();
  const products = useSelector((state) => state.ecommerceReducer.products);
  
  // عرض 4 منتجات عشوائية كمنتجات ذات صلة
  const relatedProducts = products.slice(0, 4);

  // skeleton
  const [isLoading, setLoading] = React.useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 700);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <Box>
      <Typography variant="h4" mb={2} mt={5}>
        منتجات ذات صلة
      </Typography>
      <Grid container spacing={3}>
        {relatedProducts.map((product) => (
          <Grid item xs={12} lg={3} sm={4} display="flex" alignItems="stretch" key={(product as any).id}>
            {/* ------------------------------------------- */}
            {/* Product Card */}
            {/* ------------------------------------------- */}
            <BlankCard sx={{ p: 0 }} className="hoverCard">
              <Typography component={Link} to={`/store/${storeName}/product/${(product as any).id}`}>
                {isLoading ? (
                  <Skeleton variant="rectangular" animation="wave" width="100%" height={270}></Skeleton>
                ) : (
                  <img src={(product as any).photo || ''} alt={(product as any).title || ''} width="100%" />
                )}
              </Typography>
              <CardContent sx={{ p: 3, pt: 2 }}>
                <Typography fontWeight={600}>{(product as any).title}</Typography>
                <Stack direction="row" alignItems="center" justifyContent="space-between" mt={1}>
                  <Typography variant="h5">${(product as any).price}</Typography>
                </Stack>
              </CardContent>
            </BlankCard>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ProductRelated;
