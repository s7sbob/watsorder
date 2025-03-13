// // src/views/pages/UserListing.tsx
// import Breadcrumb from 'src/layouts/full/shared/breadcrumb/Breadcrumb';
// import PageContainer from 'src/components/container/PageContainer';
// import BlankCard from 'src/components/shared/BlankCard';
// import { CardContent } from '@mui/material';
// import { UserProvider } from 'src/context/UserContext';
// import UserList from 'src/components/apps/user/UserList';

// const BCrumb = [
//   { to: '/', title: 'Home' },
//   { title: 'User Management' },
// ];

// const UserListing = () => {
//   return (
//     <UserProvider>
//       <PageContainer title="User Management" description="Manage all user details">
//         <Breadcrumb title="User Management" items={BCrumb} />
//         <BlankCard>
//           <CardContent>
//             <UserList />
//           </CardContent>
//         </BlankCard>
//       </PageContainer>
//     </UserProvider>
//   );
// };

// export default UserListing;
