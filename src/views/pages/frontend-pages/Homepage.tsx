import PageContainer from 'src/components/container/PageContainer';
import Banner from 'src/components/frontend-pages/homepage/banner/Banner';
import HpHeader from 'src/components/frontend-pages/shared/header/HpHeader';
import Features from 'src/components/frontend-pages/homepage/features/Features';
import Pricing from 'src/components/frontend-pages/shared/pricing';
import C2a from 'src/components/frontend-pages/shared/c2a';
import ScrollToTop from 'src/components/frontend-pages/shared/scroll-to-top';

const HomePage = () => {
  return (
    <PageContainer
      title="WhatsApp Bot for Restaurants"
      description="Streamline your restaurant orders through our WhatsApp Bot"
    >
      {/* <HeaderAlert /> */}
      <HpHeader />
      <Banner />
      <Features />
      <Pricing />
      <C2a />
      <ScrollToTop />
    </PageContainer>
  );
};

export default HomePage;
