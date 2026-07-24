import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, UserRole } from '../types';

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
  adminCreateUser: (email: string, password: string, name: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
  adminUpdateUser: (id: string, name: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
  adminDeleteUser: (id: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  users: User[]; // Keep this to simulate a loaded "directory" of all users for dropdowns
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const LOCAL_USERS_KEY = 'tc_admin_users_cache';

  const saveUsersToCache = (userList: User[]) => {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(userList));
  };

  const loadUsersFromCache = (): User[] => {
    try {
      const raw = localStorage.getItem(LOCAL_USERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  };

  // Fetch all profiles to simulate a user directory
  const fetchUsers = async () => {
    const { data, error } = await supabase.from('profiles').select('*');
    
    // Load cached users (includes any admin-created users)
    const cachedUsers = loadUsersFromCache();
    
    if (data && !error) {
      // 1. Map any users already in the DB
      const formattedUsers: User[] = data.map((p: any) => ({
        id: p.id,
        name: p.name || p.email?.split('@')[0] || 'Unknown',
        email: p.email || cachedUsers.find(u => u.id === p.id)?.email || 'unknown@domain.com',
        role: (p.role as UserRole) || 'intern',
        createdAt: p.created_at,
        isActive: true,
      }));

      // 2. See if there are users in local cache that ARE NOT in Supabase
      const mergedIds = new Set(formattedUsers.map(u => u.id));
      const extraCached = cachedUsers.filter(u => !mergedIds.has(u.id));

      if (extraCached.length > 0) {
        console.log("Migrating cached users up to Supabase profiles...", extraCached);
        // Push them to DB so they sync everywhere
        for (const u of extraCached) {
          await supabase.from('profiles').upsert([{
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role
          }], { onConflict: 'id' });
        }
      }

      const merged = [...formattedUsers, ...extraCached];
      saveUsersToCache(merged);
      setUsers(merged);
    } else {
      // Fallback to cache if RLS blocks the query or table missing
      if (cachedUsers.length > 0) {
        setUsers(cachedUsers);
      }
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await loadUserProfile(session.user);
      }
      setIsLoaded(true);
      fetchUsers();
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await loadUserProfile(session.user);
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
      }
      // Re-fetch directory on changes
      fetchUsers();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (user: any) => {
    const userId = user.id;
    const email = user.email || '';
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    
    if (data && !error) {
      setCurrentUser({
        id: userId,
        email,
        name: data.name,
        role: data.role as UserRole,
        createdAt: data.created_at,
        isActive: true
      });
    } else {
      // Fallback if profile row is missing or blocked by RLS
      // We stored name and role in user_metadata during signUp
      const metadata = user.user_metadata || {};
      
      setCurrentUser({
        id: userId,
        email,
        name: metadata.name || 'Unknown User',
        role: metadata.role || 'tester',
        createdAt: user.created_at || new Date().toISOString(),
        isActive: true
      });
      
      // Attempt to self-heal by inserting the missing profile row 
      // (This will only work if RLS allows users to insert their own rows)
      if (metadata.name) {
         await supabase.from('profiles').insert([
            { id: userId, name: metadata.name, role: metadata.role || 'tester' }
         ]);
      }
    }
  };

  const login = async (email: string, password = 'password123'): Promise<{ success: boolean; error?: string }> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  };

  const register = async (email: string, password: string, name: string, role: UserRole): Promise<{ success: boolean; error?: string }> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role
        }
      }
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // Insert into profiles table (note: might require RLS configuration or we do it via trigger, but we'll try client-side insertion if policy allows)
    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert([
        { id: data.user.id, name, role }
      ]);
      if (profileError) {
        console.error("Failed to create profile:", profileError);
        // Supabase often uses a database trigger to insert profile rows automatically on signup.
        // We'll log it if the manual insert fails (likely due to RLS).
      }
    }

    return { success: true };
  };

  const adminCreateUser = async (email: string, password: string, name: string, role: UserRole): Promise<{ success: boolean; error?: string }> => {
    try {
      // Use a secondary supabase client with persistSession:false so we don't kick the admin out
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseAdmin = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          }
        }
      );

      // Step 1: Create the auth user with name & role in metadata
      const { data, error } = await supabaseAdmin.auth.signUp({
        email,
        password,
        options: {
          data: { name, role }
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'User creation succeeded but no user was returned.' };
      }

      // Step 2: Upsert the profile row with email (safe even if trigger already created it)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([{ id: data.user.id, name, role, email }], { onConflict: 'id' });

      if (profileError) {
        // Profile insert failed (likely RLS) — not fatal, metadata fallback still works on login
        console.warn('Profile upsert failed (user can still login via metadata fallback):', profileError.message);
      }

      // Step 3: Immediately add to the local users cache so the admin sees them right away
      const newUser: User = {
        id: data.user.id,
        name,
        email,
        role,
        createdAt: new Date().toISOString(),
        isActive: true,
      };
      const existing = loadUsersFromCache();
      const alreadyExists = existing.some(u => u.id === data.user!.id);
      if (!alreadyExists) {
        const updated = [...existing, newUser];
        saveUsersToCache(updated);
        setUsers(updated);
      }

      // Step 4: Also re-fetch from Supabase to sync any server-side changes
      await fetchUsers();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const adminUpdateUser = async (id: string, name: string, role: UserRole): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.from('profiles').update({ name, role }).eq('id', id);
      if (error) {
        console.warn('Profile update failed:', error.message);
      }
      
      // Update local state and cache regardless of Supabase success (for UI demo)
      const existing = loadUsersFromCache();
      const updated = existing.map(u => u.id === id ? { ...u, name, role } : u);
      saveUsersToCache(updated);
      
      setUsers(prev => prev.map(u => u.id === id ? { ...u, name, role } : u));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const adminDeleteUser = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) {
        console.warn('Profile delete failed:', error.message);
      }
      
      // Update local state and cache regardless of Supabase success (for UI demo)
      const existing = loadUsersFromCache();
      const updated = existing.filter(u => u.id !== id);
      saveUsersToCache(updated);
      
      setUsers(prev => prev.filter(u => u.id !== id));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  if (!isLoaded) {
    return <div className="h-screen w-full flex items-center justify-center text-white/50 bg-[#FFF8F2]">Loading session...</div>;
  }

  return (
    <AuthContext.Provider value={{ currentUser, login, register, adminCreateUser, adminUpdateUser, adminDeleteUser, logout, isAuthenticated: !!currentUser, users }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
