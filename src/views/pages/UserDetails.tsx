// import { useParams } from 'react-router-dom';
// import { useEffect, useContext, useState } from 'react';
// import { UserContext, User } from 'src/context/UserContext';
// import { Card, CardContent, Typography } from '@mui/material';
// import UserFeatureList from 'src/components/apps/userFeatures/UserFeatureList';

// const UserDetails = () => {
//   const { id } = useParams();  
//   const userId = Number(id);

//   // لو رقم المسار غير صالح (NaN) => عرض رسالة بدلًا من الخطأ
//   if (!id || isNaN(userId) || userId <= 0) {
//     return <div>Invalid user ID in URL: {id}</div>;
//   }

//   const { users, fetchUsers } = useContext(UserContext)!;
//   const [currentUser, setCurrentUser] = useState<User | null>(null);

//   useEffect(() => {
//     // إذا لم نجلب المستخدمين بعد
//     if (!users.length) {
//       fetchUsers();
//     }
//   }, [users.length]);

//   useEffect(() => {
//     const found = users.find(u => u.id === userId);
//     if (found) {
//       setCurrentUser(found);
//     }
//   }, [users, userId]);

//   // إن لم نجد المستخدم المطلوب:
//   if (users.length && !currentUser) {
//     return <div>User not found with ID: {id}</div>;
//   }

//   if (!currentUser) {
//     // قد تكون في حالة تحميل أو انتظار
//     return <div>Loading user data...</div>;
//   }

//   return (
//     <div>
//       <Typography variant="h4" mb={2}>
//         User Details (ID: {currentUser.id})
//       </Typography>

//       <Card>
//         <CardContent>
//           <Typography>Name: {currentUser.name}</Typography>
//           <Typography>Username: {currentUser.username}</Typography>
//           <Typography>Subscription Type: {currentUser.subscriptionType}</Typography>
//           <Typography>Subscription Start: {currentUser.subscriptionStart || 'N/A'}</Typography>
//           <Typography>Subscription End: {currentUser.subscriptionEnd || 'N/A'}</Typography>
//         </CardContent>
//       </Card>

//       {/* عرض ميزات المستخدم */}
//       <UserFeatureList userId={currentUser.id} />
//     </div>
//   );
// };

// export default UserDetails;
