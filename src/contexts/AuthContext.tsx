import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { retryOperation } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, affiliatedInstructor: string | null) => Promise<{ user: User | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  impersonatedUser: User | null;
  startImpersonation: (userId: string) => Promise<void>;
  stopImpersonation: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [impersonatedUser, setImpersonatedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();

        if (mounted) {
          setUser(session?.user ?? null);
          setLoading(false);
        }

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (mounted) {
            if (event === 'SIGNED_OUT') {
              setUser(null);
              setImpersonatedUser(null);
              navigate('/login');
            } else if (event === 'PASSWORD_RECOVERY') {
              navigate('/reset-password');
            } else if (session) {
              setUser(session.user);
            }
          }
        });

        return () => {
          mounted = false;
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    }

    initializeAuth();
  }, [navigate]);

  const signIn = async (email: string, password: string) => {
    try {
      const { data: existingProfile } = await retryOperation(
        () => supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .maybeSingle(),
        3
      );

      if (!existingProfile) {
        throw new Error('No account found with this email address');
      }

      const { error } = await retryOperation(
        () => supabase.auth.signInWithPassword({ email, password }),
        3
      );
      
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Incorrect password');
        }
        if (error.message.includes('Email not confirmed')) {
          throw new Error('Please verify your email address before signing in');
        }
        throw error;
      }

      const { data: profile, error: profileError } = await retryOperation(
        async () => {
          const userData = await supabase.auth.getUser();
          return supabase
            .from('profiles')
            .select('id')
            .eq('id', userData.data.user?.id)
            .single();
        },
        3
      );

      if (profileError || !profile) {
        await supabase.auth.signOut();
        throw new Error('Profile not found. Please contact support.');
      }

      navigate('/dashboard');
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred. Please try again.');
    }
  };

  const signUp = async (email: string, password: string, fullName: string, affiliatedInstructor: string | null) => {
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    try {
      const { data: existingProfile } = await retryOperation(
        () => supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .maybeSingle(),
        3
      );

      if (existingProfile) {
        throw new Error('An account with this email already exists');
      }

      const { data, error: signUpError } = await retryOperation(
        () => supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        }),
        3
      );
      
      if (signUpError) {
        if (signUpError.message.includes('User already registered')) {
          throw new Error('An account with this email already exists');
        }
        throw signUpError;
      }

      if (!data.user) {
        throw new Error('Failed to create user account');
      }

      const { error: profileError } = await retryOperation(
        () => supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              full_name: fullName,
              email,
              role: 'student',
              affiliated_instructor: affiliatedInstructor
            },
          ])
          .select()
          .single(),
        3
      );
        
      if (profileError) {
        console.error('Profile creation error:', profileError);
        try {
          await supabase.auth.admin.deleteUser(data.user.id);
        } catch (deleteError) {
          console.error('Failed to clean up auth user:', deleteError);
        }
        throw new Error('Failed to create user profile. Please try again.');
      }

      return { user: data.user };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred during signup');
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password#recovery`,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Password reset error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to send password reset email');
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      
      // After successful password update, redirect to login
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Password update error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to update password');
    }
  };

  const signOut = async () => {
    try {
      setUser(null);
      setImpersonatedUser(null);
      const { error } = await retryOperation(
        async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            return supabase.auth.signOut();
          }
          return { error: null };
        },
        3
      );

      if (error && !error.message.includes('session')) {
        throw error;
      }
      
      navigate('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const startImpersonation = async (userId: string) => {
    try {
      // Get the user to impersonate
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError || !userData) {
        throw new Error('User not found');
      }

      // Store the impersonated user data
      const impersonatedUserData = {
        id: userId,
        email: userData.email,
        user_metadata: {
          full_name: userData.full_name,
          role: userData.role
        },
        app_metadata: {
          role: userData.role
        },
        aud: 'authenticated',
        created_at: userData.created_at
      } as User;

      setImpersonatedUser(impersonatedUserData);
      
      // Navigate to dashboard after successful impersonation
      navigate('/dashboard');
    } catch (error) {
      console.error('Impersonation error:', error);
      setImpersonatedUser(null);
      throw new Error('Failed to impersonate user');
    }
  };

  const stopImpersonation = async () => {
    setImpersonatedUser(null);
    navigate('/dashboard');
  };

  const currentUser = impersonatedUser || user;

  return (
    <AuthContext.Provider value={{ 
      user: currentUser,
      impersonatedUser,
      loading, 
      signIn, 
      signUp, 
      signOut,
      resetPassword,
      updatePassword,
      startImpersonation,
      stopImpersonation
    }}>
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