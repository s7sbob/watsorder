// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import Loadable from '../layouts/full/shared/loadable/Loadable';
import RequireAuth from './RequireAuth'; // استيراد RequireAuth
import Homepage from 'src/views/pages/frontend-pages/Homepage';
import Landingpage from 'src/views/pages/landingpage/Landingpage';
import BlogPost from 'src/views/apps/blog/BlogPost';
import About from 'src/views/pages/frontend-pages/About';
import BlogPage from 'src/views/pages/frontend-pages/Blog';
import Contact from 'src/views/pages/frontend-pages/Contact';
import Portfolio from 'src/views/pages/frontend-pages/Portfolio';
import FeatureManagement from 'src/views/pages/FeatureManagement.tsx';

/* ***Layouts**** */
const FullLayout = Loadable(lazy(() => import('../layouts/full/FullLayout')));
const BlankLayout = Loadable(lazy(() => import('../layouts/blank/BlankLayout')));

/* ****Pages***** */
const ModernDash = Loadable(lazy(() => import('../views/dashboard/Modern')));

/* ****Apps***** */
const UserList = Loadable(lazy(() => import('../views/admin/UserListing')));
const Sessions = Loadable(lazy(() => import('../views/pages/SessionListing.tsx')));
const ConfirmedOrdersPage = Loadable(
  lazy(() => import('../views/pages/orders/ConfirmedOrdersPage.tsx')),
);
const ApiDocumentation = Loadable(lazy(() => import('../views/pages/ApiDocumentation.tsx')));
const SessionSettings = Loadable(lazy(() => import('../views/pages/SessionSettings.tsx')));
const UserDetails = Loadable(lazy(() => import('../views/pages/UserDetails')));

const PagePricing = Loadable(lazy(() => import('../views/pages/frontend-pages/Pricing')));

/* ****Authentication Pages**** */
const Login = Loadable(lazy(() => import('../views/authentication/auth1/Login')));
const Register = Loadable(lazy(() => import('../views/authentication/auth1/Register')));
const ForgotPassword = Loadable(lazy(() => import('../views/authentication/auth1/ForgotPassword')));
const Error = Loadable(lazy(() => import('../views/authentication/Error')));

/* ****Router Configuration**** */
const Router = [
  {
    element: (
      <RequireAuth>
        <FullLayout />
      </RequireAuth>
    ),
    children: [
      { path: '/dashboards/modern', exact: true, element: <ModernDash /> },
      { path: '/UserList', element: <UserList /> },
      { path: '/apps/sessions', element: <Sessions /> },
      { path: '/apps/ConfirmedOrdersPage', element: <ConfirmedOrdersPage /> },
      { path: '/sessions/:sessionId/settings', element: <SessionSettings /> },
      { path: '/users/:id/details', element: <UserDetails /> },
      {
        path: '/admin/features',
        element: <FeatureManagement />,
      },

      { path: '*', element: <Navigate to="/auth/404" /> },
    ],
  },
  {
    element: <BlankLayout />,
    children: [
      { path: '/', element: <Navigate to="/frontend-pages/homepage" /> },
      { path: '/frontend-pages/homepage', element: <Homepage /> },
      { path: '/landingpage', element: <Landingpage /> },
      { path: '/api-docs', element: <ApiDocumentation /> },

      { path: '/frontend-pages/about', element: <About /> },
      { path: '/frontend-pages/contact', element: <Contact /> },
      { path: '/frontend-pages/portfolio', element: <Portfolio /> },
      { path: '/frontend-pages/pricing', element: <PagePricing /> },
      { path: '/frontend-pages/blog', element: <BlogPage /> },
      { path: '/frontend-pages/blog/detail/:id', element: <BlogPost /> },
      { path: '404', element: <Error /> },
      { path: '/auth/login', element: <Login /> },
      { path: 'auth/register', element: <Register /> },
      { path: '/auth/forgot-password', element: <ForgotPassword /> },
      // ... أي مسارات عامة أخرى تحت /auth
      { path: '*', element: <Navigate to="/auth/404" /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/auth/404" />,
  },
];

export default Router;
