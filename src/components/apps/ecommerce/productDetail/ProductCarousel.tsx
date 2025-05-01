// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { useSelector } from 'src/store/Store';
import { useParams } from 'react-router-dom';

//Carousel slider for product
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import './Carousel.css';

//Carousel slider data (Placeholder images if needed)
const SliderData = [
  {
    id: 1,
    imgPath: '/images/products/placeholder.jpg',
  },
  {
    id: 2,
    imgPath: '/images/products/placeholder.jpg',
  },
  {
    id: 3,
    imgPath: '/images/products/placeholder.jpg',
  },
  {
    id: 4,
    imgPath: '/images/products/placeholder.jpg',
  },
  {
    id: 5,
    imgPath: '/images/products/placeholder.jpg',
  },
];

const ProductCarousel = () => {
  const [state, setState] = React.useState<any>({ nav1: null, nav2: null });
  const slider1 = useRef();
  const slider2 = useRef();
  const { productId } = useParams();

  // Get Products
  const products = useSelector((state) => state.ecommerceReducer.products);
  const product = products.find((p: { id: number | string }) => p.id.toString() === productId);
  const getProductImage = product ? (product as { photo: string }).photo : '';

  useEffect(() => {
    setState({
      nav1: slider1.current,
      nav2: slider2.current,
    });
  }, []);

  const { nav1, nav2 } = state;
  const settings = {
    focusOnSelect: true,
    infinite: true,
    slidesToShow: 5,
    arrows: false,
    swipeToSlide: true,
    slidesToScroll: 1,
    centerMode: true,
    className: 'centerThumb',
    speed: 500,
  };

  return (
    <Box>
      <Slider asNavFor={nav2} ref={(slider: any) => (slider1.current = slider)}>
        <Box>
          <img
            src={getProductImage}
            alt={(product as unknown as { title?: string })?.title || "صورة المنتج"}
            width="100%"
            style={{ borderRadius: '5px' }}
          />
        </Box>
        {SliderData.map((step) => (
          <Box key={step.id}>
            <img
              src={step.imgPath}
              alt={step.imgPath}
              width="100%"
              style={{ borderRadius: '5px' }}
            />
          </Box>
        ))}
      </Slider>
      <Slider asNavFor={nav1} ref={(slider: any) => (slider2.current = slider)} {...settings}>
        <Box sx={{ p: 1, cursor: 'pointer' }}>
          <img
            src={getProductImage}
            alt={(product as unknown as { title?: string })?.title || "صورة المنتج"}
            width="100%"
            style={{ borderRadius: '5px' }}
          />
        </Box>
        {SliderData.map((step) => (
          <Box key={step.id} sx={{ p: 1, cursor: 'pointer' }}>
            <img
              src={step.imgPath}
              alt={step.imgPath}
              width="100%"
              style={{ borderRadius: '5px' }}
            />
          </Box>
        ))}
      </Slider>
    </Box>
  );
};

export default ProductCarousel;
