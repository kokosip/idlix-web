import React, { useState } from 'react';
import { LogIn, User, Lock, Eye, EyeOff, ShieldAlert, Film, Play, Tv } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginView({ onSuccessLogin }) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim() || !password.trim()) {
      setErrorMsg('Username dan Password wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const result = login(username, password);
      setIsSubmitting(false);

      if (result.success) {
        if (onSuccessLogin) onSuccessLogin();
      } else {
        setErrorMsg(result.message || 'Login gagal. Periksa username dan password.');
      }
    }, 300);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative bg-dark-base overflow-hidden px-4 py-8">
      
      {/* Decorative Hero Background Glows & Grids */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-900/30 via-dark-base to-dark-base pointer-events-none" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-brand-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-rose-600/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10 animate-fade-in">
        
        {/* Landing Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-700 via-brand-500 to-rose-400 p-0.5 shadow-glow-red mb-4">
            <div className="w-full h-full bg-dark-base rounded-[14px] flex items-center justify-center">
              <span className="text-2xl font-black text-brand-500 tracking-tighter">ID</span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-wider text-white">
            IDLIX <span className="text-brand-500 text-sm px-2 py-0.5 rounded bg-brand-500/10 border border-brand-500/30 font-bold">v3</span>
          </h1>
          
          <p className="text-xs sm:text-sm text-gray-400 mt-2 max-w-sm mx-auto">
            Selamat Datang di IDLIX Stream Hub. Silakan masuk untuk mengakses menu & katalog streaming.
          </p>

          <div className="flex items-center justify-center gap-4 mt-3 text-[11px] text-gray-400 font-medium">
            <span className="flex items-center gap-1"><Film className="w-3.5 h-3.5 text-brand-500" /> Ribuan Film</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Tv className="w-3.5 h-3.5 text-rose-500" /> TV Series</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Play className="w-3.5 h-3.5 text-emerald-400" /> Stream HD</span>
          </div>
        </div>

        {/* Card Form */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-dark-border/80 shadow-2xl relative overflow-hidden backdrop-blur-2xl">
          
          <div className="flex items-center justify-between border-b border-dark-border/60 pb-4 mb-6">
            <div className="flex items-center gap-2">
              <LogIn className="w-5 h-5 text-brand-500" />
              <h2 className="text-base font-bold text-white">Masuk Pengguna</h2>
            </div>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3 text-rose-400 text-xs animate-fade-in">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username..."
                  className="w-full bg-dark-card/90 border border-dark-border text-white text-sm rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all placeholder:text-gray-500"
                  required
                />
                <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password..."
                  className="w-full bg-dark-card/90 border border-dark-border text-white text-sm rounded-xl py-3 pl-11 pr-11 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all placeholder:text-gray-500"
                  required
                />
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-gray-400 hover:text-white transition-colors"
                  title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-bold text-sm rounded-xl shadow-glow-red transition-all transform active:scale-98 flex items-center justify-center gap-2 mt-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{isSubmitting ? 'Memproses Login...' : 'Masuk Sekarang'}</span>
            </button>
          </form>

        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-xs text-gray-500">
          IDLIX Web Stream • Personal Streaming Hub
        </div>

      </div>
    </div>
  );
}
