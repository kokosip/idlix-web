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
  UserCheck,
  Camera,
  X,
  Sparkles,
  Link as LinkIcon,
  Check,
  Server
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Collection of avatar choices (Flaticon, Unsplash & DiceBear)
const AVATAR_COLLECTION = [
  {
    category: 'Flaticon Avatars',
    avatars: [
      'https://cdn-icons-png.flaticon.com/512/4140/4140048.png',
      'https://cdn-icons-png.flaticon.com/512/4140/4140047.png',
      'https://cdn-icons-png.flaticon.com/512/4140/4140037.png',
      'https://cdn-icons-png.flaticon.com/512/4140/4140051.png',
      'https://cdn-icons-png.flaticon.com/512/4140/4140061.png',
      'https://cdn-icons-png.flaticon.com/512/4140/4140040.png',
      'https://cdn-icons-png.flaticon.com/512/4140/4140077.png',
      'https://cdn-icons-png.flaticon.com/512/6997/6997662.png',
      'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
      'https://cdn-icons-png.flaticon.com/512/3135/3135789.png',
      'https://cdn-icons-png.flaticon.com/512/4140/4140042.png',
      'https://cdn-icons-png.flaticon.com/512/149/149071.png',
    ]
  },
  {
    category: 'Cinematic & Realis',
    avatars: [
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80',
      'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&q=80',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
      'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
      'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&q=80',
      'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&q=80',
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&q=80',
    ]
  },
  {
    category: 'Animasi & Kartun',
    avatars: [
      'https://api.dicebear.com/7.x/bottts/svg?seed=IdlixHero',
      'https://api.dicebear.com/7.x/bottts/svg?seed=CyberViewer',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=CinemaBoss',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=MovieMaster',
      'https://api.dicebear.com/7.x/micah/svg?seed=StreamKing',
      'https://api.dicebear.com/7.x/micah/svg?seed=ActionStar',
      'https://api.dicebear.com/7.x/lorelei/svg?seed=AnimeFan',
      'https://api.dicebear.com/7.x/lorelei/svg?seed=IdlixPro',
    ]
  }
];

export default function ProfileView({ onLogoutSuccess, onOpenApiConfig, apiOnline }) {
  const { currentUser, logout, changePassword, editProfile } = useAuth();

  // Password change state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Avatar Modal State
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(currentUser?.avatar || '');
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [avatarSuccessMsg, setAvatarSuccessMsg] = useState('');

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

  const handleSaveAvatar = (urlToSave) => {
    const targetUrl = urlToSave || selectedAvatar;
    if (!targetUrl) return;

    const res = editProfile({ avatar: targetUrl });
    if (res.success) {
      setAvatarSuccessMsg('Avatar foto profil berhasil diperbarui!');
      setTimeout(() => setAvatarSuccessMsg(''), 3000);
      setIsAvatarModalOpen(false);
      setCustomAvatarUrl('');
    }
  };

  const handleLogout = () => {
    logout();
    if (onLogoutSuccess) onLogoutSuccess();
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in">
      
      {/* Toast Alert for Avatar Success */}
      {avatarSuccessMsg && (
        <div className="p-3.5 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl flex items-center justify-between text-emerald-400 text-xs sm:text-sm shadow-glow-green animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{avatarSuccessMsg}</span>
          </div>
          <button onClick={() => setAvatarSuccessMsg('')} className="p-1 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner Profile Header */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-dark-border relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
          {/* User Avatar with Edit Trigger */}
          <div className="relative group cursor-pointer" onClick={() => setIsAvatarModalOpen(true)}>
            <img
              src={currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80'}
              alt={currentUser.name}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-brand-500/50 shadow-glow-red group-hover:opacity-90 transition-opacity"
            />
            {/* Edit Avatar Overlay */}
            <div className="absolute inset-0 bg-dark-base/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white text-[11px] font-bold">
              <Camera className="w-5 h-5 text-brand-500" />
              <span>Ganti Foto</span>
            </div>
            
            <div className="absolute -bottom-2 -right-2 bg-brand-500 text-white p-1.5 rounded-xl shadow-glow-red hover:scale-110 transition-transform">
              <Camera className="w-4 h-4" />
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

            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-3 mt-4 text-xs text-gray-400">
              <button 
                onClick={() => setIsAvatarModalOpen(true)}
                className="flex items-center gap-1.5 bg-brand-500/15 text-brand-400 hover:bg-brand-500/25 px-3 py-1.5 rounded-lg border border-brand-500/30 font-semibold transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>Ubah Avatar Foto</span>
              </button>

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

            {/* Host API Server Setting Item */}
            {onOpenApiConfig && (
              <div className="pt-2 border-t border-dark-border/60">
                <span className="text-gray-400 block text-[11px] uppercase font-semibold tracking-wider mb-2">Host API Server</span>
                <button
                  type="button"
                  onClick={onOpenApiConfig}
                  className="w-full p-3 rounded-xl bg-dark-card/60 hover:bg-dark-hover border border-dark-border flex items-center justify-between transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg ${apiOnline ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                      <Server className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-bold text-white group-hover:text-brand-500 transition-colors">
                        Pengaturan Host Server API
                      </div>
                      <div className="text-[11px] text-gray-400">
                        Status: {apiOnline ? <span className="text-emerald-400 font-semibold">Online</span> : <span className="text-rose-400 font-semibold">Offline</span>}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-brand-400 font-semibold group-hover:underline">Atur Host &rarr;</span>
                </button>
              </div>
            )}
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

      {/* AVATAR SELECTION MODAL */}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className="glass-panel w-full max-w-xl rounded-3xl border border-dark-border p-6 shadow-2xl space-y-5 my-auto max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-dark-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand-500" />
                <h3 className="text-lg font-bold text-white">Pilih Avatar Profil</h3>
              </div>
              <button 
                onClick={() => setIsAvatarModalOpen(false)}
                className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-dark-hover"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Custom URL Input Section */}
            <div className="bg-dark-card/60 p-3.5 rounded-2xl border border-dark-border space-y-2">
              <label className="block text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-brand-400" />
                <span>Gunakan URL Gambar Kustom (Opsional)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://domain.com/gambar-saya.jpg"
                  value={customAvatarUrl}
                  onChange={(e) => setCustomAvatarUrl(e.target.value)}
                  className="flex-1 bg-dark-base border border-dark-border text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-brand-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customAvatarUrl.trim()) {
                      handleSaveAvatar(customAvatarUrl.trim());
                    }
                  }}
                  disabled={!customAvatarUrl.trim()}
                  className="px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all"
                >
                  Terapkan
                </button>
              </div>
            </div>

            {/* Avatar Collection Grid */}
            <div className="space-y-4">
              {AVATAR_COLLECTION.map((cat) => (
                <div key={cat.category} className="space-y-2">
                  <span className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
                    {cat.category}
                  </span>
                  <div className="grid grid-cols-4 sm:grid-cols-4 gap-3">
                    {cat.avatars.map((url, idx) => {
                      const isSelected = selectedAvatar === url;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setSelectedAvatar(url);
                            handleSaveAvatar(url);
                          }}
                          className={`relative rounded-2xl overflow-hidden aspect-square border-2 transition-all transform hover:scale-105 group active:scale-95 ${
                            isSelected
                              ? 'border-brand-500 shadow-glow-red ring-2 ring-brand-500/50'
                              : 'border-dark-border hover:border-brand-500/40'
                          }`}
                        >
                          <img 
                            src={url} 
                            alt={`Avatar ${idx}`} 
                            className="w-full h-full object-cover bg-dark-card"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-brand-500/30 flex items-center justify-center">
                              <Check className="w-6 h-6 text-white drop-shadow-md stroke-[3px]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-dark-border/60 flex justify-end">
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(false)}
                className="px-5 py-2.5 bg-dark-card hover:bg-dark-hover border border-dark-border text-gray-300 font-semibold text-xs rounded-xl"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
