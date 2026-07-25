import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, User as UserIcon, Lock, ArrowRight, Loader2, Bug, Mail, Key, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserRole } from '../types';

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('tester');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      if (isSignUp) {
        if (password.length < 6) {
          setError('Password must be at least 6 characters long.');
          setIsLoading(false);
          return;
        }
        const { success, error: authError } = await register(email, password, name, role);
        if (success) {
          setSuccessMsg('Registration successful! Logging you in...');
          const { success: loginSuccess } = await login(email, password);
          if (loginSuccess) {
            navigate(from, { replace: true });
          } else {
            setError('Account created, but failed to log in automatically. Please sign in.');
            setIsSignUp(false);
          }
        } else {
          setError(authError || 'Registration failed. Please try again.');
        }
      } else {
        const { success, error: authError } = await login(email, password);
        if (success) {
          navigate(from, { replace: true });
        } else {
          setError(authError || 'Invalid login credentials.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FFF8F2] flex items-center justify-center p-4 overflow-hidden relative font-sans">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#E7D6C4]/40 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#8B5A2B]/10 blur-[120px]" />
      
      <div className="max-w-[480px] w-full z-10 relative">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white border border-[#E7D6C4] rounded-2xl p-8 shadow-xl shadow-[#8B5A2B]/5 flex flex-col"
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-[#FFF8F2] flex items-center justify-center border border-[#E7D6C4]">
              <Bug className="w-7 h-7 text-[#8B5A2B]" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-[#3B2A1D] tracking-tight text-center mb-1">
            {isSignUp ? 'Create an Account' : 'Welcome Back'}
          </h1>
          <p className="text-[#7A6A5A] text-sm text-center mb-8">
            {isSignUp ? 'Sign up to access the testing platform' : 'Enter your credentials to access your workspace'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            <AnimatePresence mode="popLayout">
              {isSignUp && (
                <motion.div
                  initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                  animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
                  exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-semibold text-[#7A6A5A] mb-1.5">Full Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <UserIcon className="h-5 w-5 text-[#7A6A5A]/60" />
                      </div>
                      <input
                        id="fullName"
                        name="fullName"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 bg-white border border-[#E7D6C4] rounded-xl text-[#3B2A1D] placeholder-[#7A6A5A]/50 focus:outline-none focus:ring-2 focus:ring-[#8B5A2B]/50 focus:border-[#8B5A2B] transition-all"
                        placeholder="John Doe"
                        required={isSignUp}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#7A6A5A] mb-1.5">Platform Role</label>
                    <select
                      id="role"
                      name="role"
                      value={role}
                      onChange={(e) => setRole(e.target.value as UserRole)}
                      className="block w-full pl-3 pr-10 py-2.5 bg-white border border-[#E7D6C4] rounded-xl text-[#3B2A1D] focus:outline-none focus:ring-2 focus:ring-[#8B5A2B]/50 focus:border-[#8B5A2B] transition-all appearance-none cursor-pointer"
                    >
                      <option value="admin">Administrator — Full access</option>
                      <option value="team_lead">Team Lead — Manage & assign bugs</option>
                      <option value="developer">Developer — Fix & update bugs</option>
                      <option value="tester">QA Tester — Report & test bugs</option>
                      <option value="intern">Intern — Resolve bugs & assigned access</option>
                    </select>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-sm font-semibold text-[#7A6A5A] mb-1.5">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-[#7A6A5A]/60" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-white border border-[#E7D6C4] rounded-xl text-[#3B2A1D] placeholder-[#7A6A5A]/50 focus:outline-none focus:ring-2 focus:ring-[#8B5A2B]/50 focus:border-[#8B5A2B] transition-all"
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#7A6A5A] mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-[#7A6A5A]/60" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-white border border-[#E7D6C4] rounded-xl text-[#3B2A1D] placeholder-[#7A6A5A]/50 focus:outline-none focus:ring-2 focus:ring-[#8B5A2B]/50 focus:border-[#8B5A2B] transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm flex items-start gap-2">
                <ShieldCheck className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            {successMsg && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{successMsg}</span>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full py-2.5 px-4 bg-[#8B5A2B] hover:bg-[#A66B37] disabled:bg-[#8B5A2B]/50 disabled:cursor-not-allowed text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm mt-6"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isSignUp ? (
                <>Create Account <UserPlus className="w-4 h-4" /></>
              ) : (
                <>Sign In <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-[#7A6A5A]">
            {isSignUp ? "Already have an account? " : "Don't have an account? "}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setSuccessMsg('');
              }}
              className="font-bold text-[#8B5A2B] hover:underline"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </div>

        </motion.div>
      </div>
    </div>
  );
}
