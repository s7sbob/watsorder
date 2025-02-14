import React, { createContext, useEffect, useState } from "react";
import axios from "../utils/axios";

// واجهات
export interface User {
  id: number;
  name: string;
  username: string;
  password: string;
  subscriptionType: string;
  subscriptionStart: string;
  subscriptionEnd: string;
  status: string;
}

export interface SubscriptionLog {
  id: number;
  userId: number;
  oldSubscriptionType: string | null;
  newSubscriptionType: string;
  changedBy: number;
  changedAt: string;
  notes: string | null;
}

export interface Feature {
  id: number;
  featureKey: string;
  featureName: string;
}

export interface UserFeature {
  id: number;
  userId: number;
  featureId: number;
  isActive: boolean;
  startDate: string;
  endDate: string | null;
  featureKey: string;
  featureName: string;
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

  // سجل
  subscriptionLogsMap: Record<number, SubscriptionLog[]>;
  fetchSubscriptionLogs: (userId: number) => Promise<void>;

  // الميزات العامة
  features: Feature[];
  fetchAllFeatures: () => Promise<void>;
  createFeature: (data: { featureKey: string; featureName: string }) => Promise<void>;
  updateFeature: (featureId: number, data: { featureKey: string; featureName: string }) => Promise<void>;
  deleteFeature: (featureId: number) => Promise<void>;

  // ميزات المستخدم
  userFeatures: UserFeature[];
  fetchUserFeatures: (userId: number) => Promise<void>;
  addFeatureToUser: (userId: number, data: { featureId: number; startDate: string; endDate?: string }) => Promise<void>;
  updateUserFeature: (userFeatureId: number, data: Partial<UserFeature>) => Promise<void>;
  deleteUserFeature: (userFeatureId: number) => Promise<void>;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [subscriptionLogsMap, setSubscriptionLogsMap] = useState<Record<number, SubscriptionLog[]>>({});
  const [features, setFeatures] = useState<Feature[]>([]);
  const [userFeatures, setUserFeatures] = useState<UserFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // ========= دوال جلب المستخدمين =========
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/users");
      setUsers(response.data);
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
      await axios.post(`/api/users/${id}/delete`);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      if (currentUser?.id === id) {
        setCurrentUser(null);
      }
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
      const response = await axios.post(`/api/users/${updatedUser.id}/update`, updatedUser);
      setUsers((prev) =>
        prev.map((u) => (u.id === updatedUser.id ? response.data : u))
      );
      if (currentUser?.id === updatedUser.id) {
        setCurrentUser(response.data);
      }
    } catch (e) {
      console.error(e);
      setError(e as Error);
    }
  };

  // ========= سجل اشتراك =========
  const fetchSubscriptionLogs = async (userId: number) => {
    try {
      const res = await axios.get(`/api/users/${userId}/logs`);
      setSubscriptionLogsMap((prev) => ({
        ...prev,
        [userId]: res.data,
      }));
    } catch (error) {
      console.error('Error fetching subscription logs:', error);
    }
  };

  // ========= الميزات العامة =========
  const fetchAllFeatures = async () => {
    try {
      const res = await axios.get("/api/features");
      setFeatures(res.data);
    } catch (error) {
      console.error("Error fetching features:", error);
      setError(error as Error);
    }
  };

  const createFeature = async (data: { featureKey: string; featureName: string }) => {
    await axios.post('/api/admin/features', data);
    await fetchAllFeatures();
  };

  const updateFeature = async (featureId: number, data: { featureKey: string; featureName: string }) => {
    await axios.post(`/api/admin/features/${featureId}/update`, data);
    await fetchAllFeatures();
  };

  const deleteFeature = async (featureId: number) => {
    await axios.post(`/api/admin/features/${featureId}/delete`);
    await fetchAllFeatures();
  };

  // ========= ميزات المستخدم =========
  const fetchUserFeatures = async (userId: number) => {
    try {
      const res = await axios.get(`/api/features/user/${userId}`);
      setUserFeatures(res.data);
    } catch (error) {
      console.error("Error fetching user features:", error);
      setError(error as Error);
    }
  };

  const addFeatureToUser = async (userId: number, data: { featureId: number; startDate: string; endDate?: string }) => {
    try {
      await axios.post(`/api/features/user/${userId}`, data);
      await fetchUserFeatures(userId);
    } catch (error) {
      console.error("Error adding feature to user:", error);
      setError(error as Error);
    }
  };

  const updateUserFeature = async (userFeatureId: number, data: Partial<UserFeature>) => {
    try {
      await axios.post(`/api/features/user-feature/${userFeatureId}/update`, data);
      const existing = userFeatures.find((uf) => uf.id === userFeatureId);
      if (existing) {
        await fetchUserFeatures(existing.userId);
      }
    } catch (error) {
      console.error("Error updating user feature:", error);
      setError(error as Error);
    }
  };

  const deleteUserFeature = async (userFeatureId: number) => {
    try {
      await axios.post(`/api/features/user-feature/${userFeatureId}/delete`);
      const existing = userFeatures.find((uf) => uf.id === userFeatureId);
      if (existing) {
        await fetchUserFeatures(existing.userId);
      }
    } catch (error) {
      console.error("Error deleting user feature:", error);
      setError(error as Error);
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

        subscriptionLogsMap,
        fetchSubscriptionLogs,

        features,
        fetchAllFeatures,
        createFeature,
        updateFeature,
        deleteFeature,

        userFeatures,
        fetchUserFeatures,
        addFeatureToUser,
        updateUserFeature,
        deleteUserFeature
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
