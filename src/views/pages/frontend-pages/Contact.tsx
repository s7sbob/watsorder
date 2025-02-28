import PageContainer from 'src/components/container/PageContainer';
import HpHeader from '../../../components/frontend-pages/shared/header/HpHeader';

import C2a from '../../../components/frontend-pages/shared/c2a';
import Footer from '../../../components/frontend-pages/shared/footer';
import Banner from '../../../components/frontend-pages/contact/banner';
import Form from '../../../components/frontend-pages/contact/form';
import ScrollToTop from '../../../components/frontend-pages/shared/scroll-to-top';

const Contact = () => {
    return (
        <PageContainer title="Contact" description="this is Contact">

            <HpHeader />
            <Banner />
            <Form />
            <C2a />
            <Footer />
            <ScrollToTop />
        </PageContainer>
    );
};

export default Contact;
