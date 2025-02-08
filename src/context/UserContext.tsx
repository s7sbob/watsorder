import React, { createContext, useEffect, useState } from "react";
import axios from "../utils/axios"; // تأكد من صحة المسار

export interface User {
  id: number;
  name: string;
  username: string;
  password: string;
  subscriptionType: string; // يمكن أن يكون "admin", "Regular", "Premium", إلخ
  subscriptionStart: string; // أو Date
  subscriptionEnd: string;   // أو Date
  status: string; // "Total", "Shipped", "Delivered", "Pending"
}

interface UserContextType {
  users: User[];
  currentUser: User | null;
  isAdmin: () => boolean;
  loading: boolean;
  error: Error | null;
  fetchUsers: () => Promise<void>;
  deleteUser: (id: number) => Promise<void>;
  addUser: (newUser: User) => Promise<void>;
  updateUser: (updatedUser: User) => Promise<void>;
}



export const UserContext = createContext<UserContextType | undefined>(
  undefined
);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/users");
      setUsers(response.data);

      // افتراض أن أول مستخدم يتم إرجاعه هو المستخدم الحالي
      setCurrentUser(response.data[0] || null);
      setLoading(false);
    } catch (e: any) {
      console.error(e);
      setError(e);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const isAdmin = (): boolean => {
    return currentUser?.subscriptionType === "admin";
  };

  const deleteUser = async (id: number) => {
    try {
      await axios.delete(`/api/users/${id}`);
      setUsers((prev) => prev.filter((user) => user.id !== id));
    } catch (e) {
      console.error(e);
      setError(e as Error);
    }
  };

  const addUser = async (newUser: User) => {
    try {
      const response = await axios.post("/api/users", newUser);
      setUsers((prev) => [...prev, response.data]);
    } catch (e) {
      console.error(e);
      setError(e as Error);
    }
  };

  const updateUser = async (updatedUser: User) => {
    try {
      const response = await axios.put(
        `/api/users/${updatedUser.id}`,
        updatedUser
      );
      setUsers((prev) =>
        prev.map((user) =>
          user.id === updatedUser.id ? response.data : user
        )
      );

      // تحديث المستخدم الحالي إذا تم تحديثه
      if (currentUser?.id === updatedUser.id) {
        setCurrentUser(response.data);
      }
    } catch (e) {
      console.error(e);
      setError(e as Error);
    }
  };

  return (
    <UserContext.Provider
      value={{
        users,
        currentUser,
        isAdmin,
        loading,
        error,
        fetchUsers,
        deleteUser,
        addUser,
        updateUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
