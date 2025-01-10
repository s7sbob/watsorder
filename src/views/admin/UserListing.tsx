import Breadcrumb from 'src/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from 'src/components/container/PageContainer';
import BlankCard from 'src/components/shared/BlankCard';
import { CardContent } from '@mui/material';
import { UserProvider } from 'src/context/UserContext';
import UserList from 'src/components/apps/user/UserList'; // سننشئ هذا المكون

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'User List',
  },
];

const UserListing = () => {
  return (
    <UserProvider>
      <PageContainer title="User List" description="List of Users">
        <Breadcrumb title="User List" items={BCrumb} />
        <BlankCard>
          <CardContent>
            <UserList />
          </CardContent>
        </BlankCard>
      </PageContainer>
    </UserProvider>
  );
};

export default UserListing;
