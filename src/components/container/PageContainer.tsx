import React from 'react';
import { Helmet } from 'react-helmet';

type Props = {
  description?: string;
  children: React.ReactNode;   // ✅ بدلاً من JSX.Element | JSX.Element[]
  title?: string;
};

const PageContainer: React.FC<Props> = ({ title, description, children }) => (
  <>
    <Helmet>
      <title>{title}</title>
      {description && <meta name="description" content={description} />}
    </Helmet>
    {children}
  </>
);

export default PageContainer;
