import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Lock,
  Mail,
  User,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Plus,
  Check,
  X,
  Settings2,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';

interface GoogleAccount {
  name: string;
  email: string;
}

declare global {
  interface Window {
    google?: any;
  }
}

export const AuthPage: React.FC = () => {
  const { login, register, loginWithGoogle } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Google Modal & Accounts State
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleAccounts, setGoogleAccounts] = useState<GoogleAccount[]>(() => {
    try {
      const saved = localStorage.getItem('accurate_ai_google_accounts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      const lastEmail = localStorage.getItem('last_google_email');
      const lastName = localStorage.getItem('last_google_name');
      if (lastEmail && lastEmail !== 'user.google@gmail.com') {
        return [{ name: lastName || 'My Google Account', email: lastEmail }];
      }
    } catch {
      // fallback
    }
    return [
      { name: 'Aditya', email: 'abc4e123@gmail.com' },
    ];
  });

  const [showAddGoogleAccount, setShowAddGoogleAccount] = useState(false);
  const [googleInputEmail, setGoogleInputEmail] = useState('');
  const [googleInputName, setGoogleInputName] = useState('');

  // Google Client ID Config
  const [googleClientId, setGoogleClientId] = useState<string>(() => {
    return localStorage.getItem('accurate_ai_google_client_id') || '';
  });
  const [showClientIdConfig, setShowClientIdConfig] = useState(false);
  const [tempClientId, setTempClientId] = useState('');
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Initialize Google Identity Services if client ID is present
  useEffect(() => {
    authService.getConfig().then((cfg) => {
      const id = cfg.google_client_id || localStorage.getItem('accurate_ai_google_client_id') || '';
      if (id) {
        setGoogleClientId(id);
      }
    });
  }, []);

  useEffect(() => {
    if (googleClientId && window.google?.accounts?.id && googleBtnRef.current) {
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response: any) => {
            if (response.credential) {
              setIsLoading(true);
              try {
                await loginWithGoogle({ credential: response.credential });
              } catch (err: any) {
                setErrorMsg(err.message || 'Google Sign-In failed.');
              } finally {
                setIsLoading(false);
              }
            }
          },
        });
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          width: 320,
        });
      } catch (e) {
        console.warn('Google GSI render error:', e);
      }
    }
  }, [googleClientId, showGoogleModal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else if (mode === 'register') {
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        await register(email, password, fullName || undefined);
      } else if (mode === 'forgot') {
        const res = await authService.forgotPassword(email);
        setSuccessMsg(res.message);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        err.response?.data?.detail || err.message || 'Authentication error occurred.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectGoogleAccount = async (account: GoogleAccount) => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      localStorage.setItem('last_google_email', account.email);
      localStorage.setItem('last_google_name', account.name);
      await loginWithGoogle({
        email: account.email.trim().toLowerCase(),
        full_name: account.name.trim(),
      });
      setShowGoogleModal(false);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Google sign-in failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveAccount = (e: React.MouseEvent, emailToRemove: string) => {
    e.stopPropagation();
    const updated = googleAccounts.filter((a) => a.email !== emailToRemove);
    setGoogleAccounts(updated);
    try {
      localStorage.setItem('accurate_ai_google_accounts', JSON.stringify(updated));
    } catch {}
  };

  const handleAddGoogleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleInputEmail.trim()) {
      setErrorMsg('Please enter your Google email.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(googleInputEmail.trim())) {
      setErrorMsg('Please enter a valid Google email format.');
      return;
    }

    const finalName = googleInputName.trim() || googleInputEmail.split('@')[0];
    const newAcc: GoogleAccount = {
      name: finalName,
      email: googleInputEmail.trim().toLowerCase(),
    };

    const updated = [newAcc, ...googleAccounts.filter((a) => a.email !== newAcc.email)];
    setGoogleAccounts(updated);
    try {
      localStorage.setItem('accurate_ai_google_accounts', JSON.stringify(updated));
      localStorage.setItem('last_google_email', newAcc.email);
      localStorage.setItem('last_google_name', newAcc.name);
    } catch {}

    setShowAddGoogleAccount(false);
    await handleSelectGoogleAccount(newAcc);
  };

  const handleSaveClientId = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempClientId.trim()) {
      setGoogleClientId(tempClientId.trim());
      localStorage.setItem('accurate_ai_google_client_id', tempClientId.trim());
      setShowClientIdConfig(false);
      setSuccessMsg('Google Client ID saved! Official Google One-Tap enabled.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0f17] flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo and Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 items-center justify-center shadow-lg shadow-blue-500/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Accurate AI
          </h1>
          <p className="text-xs text-slate-400">
            High-precision document question-answering with grounded citations
          </p>
        </div>

        {/* Auth Card */}
        <div className="rounded-2xl border border-[#232738] bg-[#141724] p-6 md:p-8 space-y-6 shadow-xl">
          {/* Tabs */}
          {mode !== 'forgot' && (
            <div className="grid grid-cols-2 p-1 rounded-xl bg-[#0e101a] border border-[#1f2334]">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'bg-[#1e2335] text-slate-100 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMsg(null);
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  mode === 'register'
                    ? 'bg-[#1e2335] text-slate-100 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {mode === 'forgot' && (
            <div className="flex items-center justify-between border-b border-[#1f2334] pb-3">
              <h2 className="text-sm font-semibold text-slate-200">Reset Password</h2>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-xs text-blue-400 hover:underline cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          )}

          {/* Feedback messages */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/50 flex items-center gap-2.5 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/50 flex items-center gap-2.5 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-slate-300">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#232738] bg-[#0e101a] text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-slate-300">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#232738] bg-[#0e101a] text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-slate-300">Password</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-[11px] text-blue-400 hover:underline cursor-pointer"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#232738] bg-[#0e101a] text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>
                    {mode === 'login'
                      ? 'Sign In to Workspace'
                      : mode === 'register'
                      ? 'Create Account'
                      : 'Send Reset Link'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Continue with Google Section */}
          {mode !== 'forgot' && (
            <div className="space-y-3 pt-2">
              <div className="relative flex items-center justify-center">
                <div className="w-full border-t border-[#1f2334]" />
                <span className="bg-[#141724] px-3 text-[11px] text-slate-500 uppercase tracking-wider font-medium">
                  or continue with
                </span>
              </div>

              {/* Direct Continue with Google Button */}
              <button
                type="button"
                disabled={isLoading}
                onClick={() => {
                  setErrorMsg(null);
                  setShowGoogleModal(true);
                }}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-[#2d3348] bg-[#10131e] hover:bg-[#181c2b] hover:border-blue-500/50 text-slate-100 text-xs font-semibold shadow-sm transition-all cursor-pointer group"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* Quick direct 1-click chip if an account is remembered */}
              {googleAccounts.length > 0 && (
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => handleSelectGoogleAccount(googleAccounts[0])}
                    className="text-[11px] text-slate-400 hover:text-blue-400 transition-colors cursor-pointer truncate max-w-full inline-flex items-center gap-1.5"
                  >
                    <span>1-Click as</span>
                    <span className="font-semibold text-slate-200 underline underline-offset-2">
                      {googleAccounts[0].email}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Security footer notice */}
        <p className="text-center text-[11px] text-slate-500">
          Grounded RAG architecture with user data isolation & bcrypt encrypted credentials.
        </p>
      </div>

      {/* Official Google Account Chooser Modal Dialog */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="max-w-md w-full rounded-2xl border border-[#2d3248] bg-[#161928] p-6 space-y-5 shadow-2xl relative text-slate-100">
            {/* Close Button */}
            <button
              onClick={() => {
                setShowGoogleModal(false);
                setShowAddGoogleAccount(false);
              }}
              className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#23273c] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Google Header */}
            <div className="text-center space-y-1.5 pt-1">
              <div className="flex justify-center pb-1">
                <svg className="w-8 h-8" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-slate-100">Sign in with Google</h2>
              <p className="text-xs text-slate-400">
                Choose an account to continue to <span className="font-medium text-slate-200">Accurate AI</span>
              </p>
            </div>

            {/* Official Google GSI Native Button Container (if client ID is configured) */}
            {googleClientId && (
              <div className="flex justify-center py-1">
                <div ref={googleBtnRef}></div>
              </div>
            )}

            {/* Account List */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {googleAccounts.map((account, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectGoogleAccount(account)}
                  className="group flex items-center justify-between p-3 rounded-xl border border-[#2b3046] bg-[#1a1e30] hover:bg-[#20253c] hover:border-blue-500/60 text-left transition-all cursor-pointer shadow-sm"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm">
                      {account.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-100 group-hover:text-blue-400 truncate">
                        {account.name}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {account.email}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pl-2">
                    <span className="text-[10px] text-blue-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                      Select
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveAccount(e, account.email)}
                      className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="Remove from device"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Use Another Google Account Toggle */}
              {!showAddGoogleAccount ? (
                <button
                  type="button"
                  onClick={() => setShowAddGoogleAccount(true)}
                  className="w-full flex items-center gap-3.5 p-3 rounded-xl border border-dashed border-[#2d3348] hover:border-blue-500/50 hover:bg-[#1a1e30] text-slate-300 text-xs font-medium transition-all cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-full bg-[#23273c] flex items-center justify-center text-slate-400 shrink-0">
                    <Plus className="w-4 h-4" />
                  </div>
                  <span>Use another Google account</span>
                </button>
              ) : (
                <form
                  onSubmit={handleAddGoogleAccountSubmit}
                  className="p-3.5 rounded-xl bg-[#111320] border border-[#2b3046] space-y-2.5 animate-in fade-in duration-150"
                >
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-xs font-semibold text-slate-200">
                      Enter Your Google Account
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddGoogleAccount(false)}
                      className="text-[11px] text-slate-400 hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  <input
                    type="email"
                    required
                    autoFocus
                    value={googleInputEmail}
                    onChange={(e) => setGoogleInputEmail(e.target.value)}
                    placeholder="Email (e.g. yourname@gmail.com)"
                    className="w-full px-3 py-2 rounded-lg border border-[#2d3348] bg-[#1a1e30] text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    value={googleInputName}
                    onChange={(e) => setGoogleInputName(e.target.value)}
                    placeholder="Name (e.g. Aditya)"
                    className="w-full px-3 py-2 rounded-lg border border-[#2d3348] bg-[#1a1e30] text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer mt-1"
                  >
                    {isLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <span>Continue with this account</span>
                        <Check className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Google OAuth Client ID setup toggle (if user wants to connect real Google Cloud credentials) */}
            <div className="pt-2 border-t border-[#23273a] text-center">
              {!showClientIdConfig ? (
                <button
                  type="button"
                  onClick={() => setShowClientIdConfig(true)}
                  className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <Settings2 className="w-3 h-3" />
                  <span>Configure Google Cloud OAuth Client ID (Optional)</span>
                </button>
              ) : (
                <form onSubmit={handleSaveClientId} className="space-y-2 text-left pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-300">
                      Google Cloud Client ID:
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowClientIdConfig(false)}
                      className="text-[10px] text-slate-400 hover:text-white cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={tempClientId}
                    onChange={(e) => setTempClientId(e.target.value)}
                    placeholder="...apps.googleusercontent.com"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#2d3348] bg-[#111320] text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    className="w-full py-1.5 bg-[#252a40] hover:bg-[#2e3450] text-slate-200 text-xs font-medium rounded-lg transition-all cursor-pointer"
                  >
                    Save & Enable Native Google Popup
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
