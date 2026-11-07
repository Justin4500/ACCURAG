import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Key,
  Palette,
  Lock,
  LogOut,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Laptop,
} from 'lucide-react';
import { UserSettingsData } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { settingsService } from '../../services/settingsService';

export const SettingsView: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const [settings, setSettings] = useState<UserSettingsData | null>(null);
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [chunkSize, setChunkSize] = useState(600);
  const [topK, setTopK] = useState(5);
  const [aiProvider, setAiProvider] = useState('gemini');

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const data = await settingsService.getSettings();
      setSettings(data);
      setChunkSize(data.chunk_size || 600);
      setTopK(data.top_k || 5);
      setAiProvider(data.ai_provider || 'gemini');
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAiSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaveStatus('Saving...');
      await settingsService.updateSettings({
        ai_provider: aiProvider,
        custom_gemini_key: geminiKeyInput.trim() ? geminiKeyInput.trim() : undefined,
        chunk_size: chunkSize,
        top_k: topK,
      });
      setSaveStatus('Saved successfully!');
      setTimeout(() => setSaveStatus(null), 3000);
      loadSettings();
    } catch (err) {
      setSaveStatus('Failed to save settings.');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    try {
      // Use reset token for current user
      const resetToken = `token-for-${user?.id}`;
      const { authService } = await import('../../services/authService');
      await authService.resetPassword(resetToken, newPassword);
      setPasswordMsg({ type: 'success', text: 'Password successfully updated!' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to update password.',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-slate-400 text-xs">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-100">Application Settings</h1>
        <p className="text-xs md:text-sm text-slate-400 mt-1">
          Configure your profile, AI credentials, retrieval parameters, and visual appearance.
        </p>
      </div>

      {/* Profile Section */}
      <div className="rounded-xl border border-[#1e2230] bg-[#141724] p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-blue-400" />
          <span>User Profile</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Email Address</label>
            <input
              type="text"
              disabled
              value={user?.email || ''}
              className="w-full bg-[#10121a] border border-[#232738] rounded-xl px-3 py-2 text-slate-400 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Full Name</label>
            <input
              type="text"
              disabled
              value={user?.full_name || 'Accurate User'}
              className="w-full bg-[#10121a] border border-[#232738] rounded-xl px-3 py-2 text-slate-400 cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Theme Selection */}
      <div className="rounded-xl border border-[#1e2230] bg-[#141724] p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Palette className="w-4 h-4 text-indigo-400" />
          <span>Theme & Appearance</span>
        </h3>

        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setTheme('dark')}
            className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-xs transition-colors cursor-pointer ${
              theme === 'dark'
                ? 'border-blue-500 bg-blue-500/10 text-slate-100 font-medium'
                : 'border-[#222638] bg-[#161a29] text-slate-400 hover:text-slate-200'
            }`}
          >
            <Moon className="w-5 h-5" />
            <span>Dark (Default)</span>
          </button>

          <button
            onClick={() => setTheme('light')}
            className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-xs transition-colors cursor-pointer ${
              theme === 'light'
                ? 'border-blue-500 bg-blue-500/10 text-slate-100 font-medium'
                : 'border-[#222638] bg-[#161a29] text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sun className="w-5 h-5" />
            <span>Light</span>
          </button>

          <button
            onClick={() => setTheme('system')}
            className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-xs transition-colors cursor-pointer ${
              theme === 'system'
                ? 'border-blue-500 bg-blue-500/10 text-slate-100 font-medium'
                : 'border-[#222638] bg-[#161a29] text-slate-400 hover:text-slate-200'
            }`}
          >
            <Laptop className="w-5 h-5" />
            <span>System</span>
          </button>
        </div>
      </div>

      {/* AI Provider & API Key Configuration */}
      <form onSubmit={handleSaveAiSettings} className="rounded-xl border border-[#1e2230] bg-[#141724] p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" />
            <span>AI Model & Credentials</span>
          </h3>

          {/* Status Badge */}
          {settings?.system_has_gemini_key ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-medium">
              <CheckCircle2 className="w-3 h-3" /> System API Key Active
            </span>
          ) : settings?.has_custom_key ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-medium">
              <CheckCircle2 className="w-3 h-3" /> Custom Key Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-medium">
              <AlertCircle className="w-3 h-3" /> Key Missing
            </span>
          )}
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Accurate AI connects directly to Google Gemini for generating answers. You can provide your personal Gemini API key below or configure `GEMINI_API_KEY` in the server's `.env` file.
        </p>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Google Gemini API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                placeholder={settings?.has_custom_key ? '••••••••••••••••••••••••' : 'AIzaSy...'}
                value={geminiKeyInput}
                onChange={(e) => setGeminiKeyInput(e.target.value)}
                className="w-full bg-[#10121a] border border-[#232738] rounded-xl px-3 py-2 pr-10 text-slate-200 focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Get an API key from{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:underline"
              >
                Google AI Studio
              </a>
              . Your key is securely stored in your isolated user settings.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Top-K Retrieved Chunks ({topK})
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={topK}
                onChange={(e) => setTopK(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">
                Number of most relevant excerpts retrieved per query
              </span>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Chunk Size in Tokens ({chunkSize})
              </label>
              <input
                type="range"
                min="300"
                max="1200"
                step="50"
                value={chunkSize}
                onChange={(e) => setChunkSize(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">
                Default: ~600 tokens per semantic segment
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {saveStatus && (
            <span
              className={`text-xs ${
                saveStatus.includes('success') ? 'text-green-400' : 'text-slate-400'
              }`}
            >
              {saveStatus}
            </span>
          )}
          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all cursor-pointer ml-auto"
          >
            <Save className="w-4 h-4" />
            <span>Save AI Settings</span>
          </button>
        </div>
      </form>

      {/* Password Management */}
      <form onSubmit={handlePasswordChange} className="rounded-xl border border-[#1e2230] bg-[#141724] p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-400" />
          <span>Security & Password</span>
        </h3>

        {passwordMsg && (
          <div
            className={`p-3 rounded-xl text-xs ${
              passwordMsg.type === 'success'
                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}
          >
            {passwordMsg.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">New Password</label>
            <input
              type="password"
              placeholder="Minimum 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-[#10121a] border border-[#232738] rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Confirm New Password</label>
            <input
              type="password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-[#10121a] border border-[#232738] rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-[#1e2335] hover:bg-[#282f47] text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            Update Password
          </button>
        </div>
      </form>

      {/* Account Logout */}
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5 flex items-center justify-between">
        <div>
          <h4 className="text-xs font-semibold text-red-400">Sign Out of Session</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            End your authenticated session on this computer.
          </p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );
};
