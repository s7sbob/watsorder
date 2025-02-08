import PageContainer from 'src/components/container/PageContainer';
import Banner from 'src/components/frontend-pages/homepage/banner/Banner';
import HeaderAlert from 'src/components/frontend-pages/shared/header/HeaderAlert';
import HpHeader from 'src/components/frontend-pages/shared/header/HpHeader';
import Features from 'src/components/frontend-pages/homepage/features/Features';
import ExceptionalFeature from 'src/components/frontend-pages/homepage/exceptional-feature';
import Pricing from 'src/components/frontend-pages/shared/pricing';
import FAQ from 'src/components/frontend-pages/homepage/faq';
import C2a from 'src/components/frontend-pages/shared/c2a';
import Footer from 'src/components/frontend-pages/shared/footer';
import ScrollToTop from 'src/components/frontend-pages/shared/scroll-to-top';

const HomePage = () => {
  return (
    <PageContainer title="WhatsApp Bot for Restaurants" description="Streamline your restaurant orders through our WhatsApp Bot">
      <HeaderAlert />
      <HpHeader />
      <Banner />
      <Features />
      <ExceptionalFeature />
      <Pricing />
      <FAQ />
      <C2a />
      <Footer />
      <ScrollToTop />
    </PageContainer>
  );
};

export default HomePage;