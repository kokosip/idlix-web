import React, { useState } from 'react';
import { 
  User, 
  KeyRound, 
  LogOut, 
  ShieldCheck, 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  Lock, 
  Eye, 
  EyeOff,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ProfileView({ onLogoutSuccess }) {
  const { currentUser, logout, changePassword } = useAuth();

  // Password change state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  if (!currentUser) {
    return null;
  }

  const handleChangePasswordSubmit = (e) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPassError('Semua bidang password wajib diisi.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError('Konfirmasi password baru tidak cocok.');
      return;
    }

    if (newPassword.length < 4) {
      setPassError('Password baru minimal 4 karakter.');
      return;
    }

    setIsChangingPass(true);
    setTimeout(() => {
      const res = changePassword(oldPassword, newPassword);
      setIsChangingPass(false);

      if (res.success) {
        setPassSuccess('Password berhasil diubah! Gunakan password baru Anda saat login berikutnya.');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPassError(res.message || 'Gagal mengubah password.');
      }
    }, 300);
  };

  const handleLogout = () => {
    logout();
    if (onLogoutSuccess) onLogoutSuccess();
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in">
      
      {/* Top Banner Profile Header */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-dark-border relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
          {/* User Avatar */}
          <div className="relative group">
            <img
              src={currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80'}
              alt={currentUser.name}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-brand-500/50 shadow-glow-red"
            />
            <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-dark-base p-1.5 rounded-xl shadow">
              <UserCheck className="w-4 h-4 stroke-[3px]" />
            </div>
          </div>

          {/* Profile Basic Info */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                  {currentUser.name}
                </h1>
                <p className="text-sm text-brand-400 font-medium mt-0.5">
                  @{currentUser.username}
                </p>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="self-center sm:self-auto px-4 py-2 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 font-semibold text-xs sm:text-sm rounded-xl transition-all flex items-center gap-2 active:scale-95"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar (Logout)</span>
              </button>
            </div>

            <p className="text-xs sm:text-sm text-gray-300 mt-3 max-w-xl">
              {currentUser.bio || 'Anggota komunitas IDLIX Stream Web.'}
            </p>

            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-4 mt-4 text-xs text-gray-400">
              <div className="flex items-center gap-1.5 bg-dark-card/60 px-3 py-1.5 rounded-lg border border-dark-border">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Peran: <strong className="text-gray-200">{currentUser.role || 'Standard User'}</strong></span>
              </div>

              <div className="flex items-center gap-1.5 bg-dark-card/60 px-3 py-1.5 rounded-lg border border-dark-border">
                <Calendar className="w-4 h-4 text-brand-400" />
                <span>Bergabung: <strong className="text-gray-200">{currentUser.joinedAt || '2024'}</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Details & Password Management */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Detail Profile Card */}
        <div className="glass-panel p-6 rounded-3xl border border-dark-border space-y-4">
          <div className="flex items-center gap-2.5 pb-4 border-b border-dark-border/60">
            <User className="w-5 h-5 text-brand-500" />
            <h3 className="text-lg font-bold text-white">Detail Akun User</h3>
          </div>

          <div className="space-y-3.5 text-xs sm:text-sm">
            <div>
              <span className="text-gray-400 block text-[11px] uppercase font-semibold tracking-wider">Username</span>
              <span className="text-white font-mono font-medium">{currentUser.username}</span>
            </div>

            <div>
              <span className="text-gray-400 block text-[11px] uppercase font-semibold tracking-wider">Nama Lengkap</span>
              <span className="text-white font-medium">{currentUser.name}</span>
            </div>

            <div>
              <span className="text-gray-400 block text-[11px] uppercase font-semibold tracking-wider">Tipe Pengguna</span>
              <span className="text-emerald-400 font-medium">Standard Member (Semua User Sama)</span>
            </div>

            <div>
              <span className="text-gray-400 block text-[11px] uppercase font-semibold tracking-wider">Penyimpanan Database</span>
              <span className="text-gray-300">Local Database (SQLite / LocalStorage)</span>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="glass-panel p-6 rounded-3xl border border-dark-border">
          <div className="flex items-center gap-2.5 pb-4 border-b border-dark-border/60 mb-4">
            <KeyRound className="w-5 h-5 text-brand-500" />
            <h3 className="text-lg font-bold text-white">Ganti Password</h3>
          </div>

          {/* Feedback alerts */}
          {passError && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{passError}</span>
            </div>
          )}

          {passSuccess && (
            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-2.5 text-emerald-400 text-xs">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{passSuccess}</span>
            </div>
          )}

          <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
            {/* Old Password */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Password Saat Ini
              </label>
              <div className="relative">
                <input
                  type={showOldPass ? 'text' : 'password'}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Masukkan password lama..."
                  className="w-full bg-dark-card/90 border border-dark-border text-white text-xs sm:text-sm rounded-xl py-2.5 pl-9 pr-9 focus:outline-none focus:border-brand-500"
                  required
                />
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <button
                  type="button"
                  onClick={() => setShowOldPass(!showOldPass)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-white"
                >
                  {showOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Password Baru
              </label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Masukkan password baru..."
                  className="w-full bg-dark-card/90 border border-dark-border text-white text-xs sm:text-sm rounded-xl py-2.5 pl-9 pr-9 focus:outline-none focus:border-brand-500"
                  required
                />
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-white"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Konfirmasi Password Baru
              </label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password baru..."
                  className="w-full bg-dark-card/90 border border-dark-border text-white text-xs sm:text-sm rounded-xl py-2.5 pl-9 pr-4 focus:outline-none focus:border-brand-500"
                  required
                />
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isChangingPass}
              className="w-full py-2.5 px-4 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-glow-red transition-all active:scale-98"
            >
              {isChangingPass ? 'Menyimpan...' : 'Simpan Password Baru'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
