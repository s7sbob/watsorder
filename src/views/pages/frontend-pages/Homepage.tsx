import PageContainer from 'src/components/container/PageContainer'
import Banner from 'src/components/frontend-pages/homepage/banner/Banner'
import HpHeader from 'src/components/frontend-pages/shared/header/HpHeader'
import Features from 'src/components/frontend-pages/homepage/features/Features'
import Pricing from 'src/components/frontend-pages/shared/pricing'
import C2a from 'src/components/frontend-pages/shared/c2a'
import ScrollToTop from 'src/components/frontend-pages/shared/scroll-to-top'

// استيراد الترجمة
import { useTranslation } from 'react-i18next'

const HomePage = () => {
  const { t } = useTranslation()

  return (
    <PageContainer
    title={t('HomePage.mainPage.title') ?? ''} // مثلاً "WhatsApp Bot for Restaurants" 
    description={t('HomePage.mainPage.description') ?? ''} // "Streamline your restaurant orders..."
    >
      <HpHeader />
      <Banner />
      <Features />
      <Pricing />
      <C2a />
      <ScrollToTop />
    </PageContainer>
  )
}

export default HomePage
