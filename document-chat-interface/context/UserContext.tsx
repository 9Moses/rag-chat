"use client";

import React, { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { User } from "@/lib/types";
import { getUserId, getUserEmail, setUserId, setUserEmail, clearUser } from "@/lib/storage";

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const userId = getUserId();
    const email = getUserEmail();

    if (userId && email) {
      setUserState({ id: userId, email });
    }

    setIsLoading(false);
  }, []);

  const setUser = (newUser: User) => {
    setUserId(newUser.id);
    setUserEmail(newUser.email);
    setUserState(newUser);
  };

  const logout = () => {
    clearUser();
    setUserState(null);
  };

  return (
    <UserContext.Provider value={{ user, isLoading, setUser, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within UserProvider");
  }
  return context;
}
