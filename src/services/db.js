// Client-side Local Database Service (SQLite-style Storage)
// Stores pre-seeded users, profile info, and handles credential verification & password updates.

const DB_KEY = 'idlix_sqlite_users_v1';

// Default development users (digunakan jika tidak ada variabel .env di VPS/Server)
const DEFAULT_DEV_USERS = [
  {
    id: 'usr_001',
    username: 'user',
    password: '123456',
    name: 'User Member IDLIX',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80',
    bio: 'Pencinta Film & TV Series Action.',
    joinedAt: '2024-01-15',
    role: 'Standard User'
  },
  {
    id: 'usr_002',
    username: 'idlixuser',
    password: 'idlix123',
    name: 'IDLIX Viewer Pro',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&q=80',
    bio: 'Streaming mania IDLIX.',
    joinedAt: '2024-02-01',
    role: 'Standard User'
  }
];

/**
 * Mendapatkan Seed Users awal.
 * Mengambil dari Environment Variables (VITE_INITIAL_USERS / VITE_USER_1_...) jika ada di VPS,
 * jika tidak ada maka menggunakan DEFAULT_DEV_USERS.
 */
const getInitialSeedUsers = () => {
  try {
    // 1. Cek VITE_INITIAL_USERS (format JSON di .env VPS)
    const envUsersJson = import.meta.env.VITE_INITIAL_USERS;
    if (envUsersJson) {
      const parsed = JSON.parse(envUsersJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((u, idx) => ({
          id: u.id || `usr_vps_${idx + 1}`,
          username: u.username,
          password: u.password,
          name: u.name || u.username,
          avatar: u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80',
          bio: u.bio || 'Akun Pengguna VPS',
          joinedAt: u.joinedAt || '2026-01-01',
          role: u.role || 'Standard User'
        }));
      }
    }

    // 2. Cek VITE_USER_1 s/d VITE_USER_5 secara statis (Vite butuh referensi statis untuk build time replacement)
    const envUsers = [];
    if (import.meta.env.VITE_USER_1_USERNAME && import.meta.env.VITE_USER_1_PASSWORD) {
      envUsers.push({
        id: 'usr_vps_1',
        username: import.meta.env.VITE_USER_1_USERNAME,
        password: import.meta.env.VITE_USER_1_PASSWORD,
        name: import.meta.env.VITE_USER_1_NAME || import.meta.env.VITE_USER_1_USERNAME,
        avatar: import.meta.env.VITE_USER_1_AVATAR || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80',
        bio: 'Akun Pengguna VPS',
        joinedAt: '2026-01-01',
        role: 'Standard User'
      });
    }

    if (import.meta.env.VITE_USER_2_USERNAME && import.meta.env.VITE_USER_2_PASSWORD) {
      envUsers.push({
        id: 'usr_vps_2',
        username: import.meta.env.VITE_USER_2_USERNAME,
        password: import.meta.env.VITE_USER_2_PASSWORD,
        name: import.meta.env.VITE_USER_2_NAME || import.meta.env.VITE_USER_2_USERNAME,
        avatar: import.meta.env.VITE_USER_2_AVATAR || 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&q=80',
        bio: 'Akun Pengguna VPS',
        joinedAt: '2026-01-01',
        role: 'Standard User'
      });
    }

    if (import.meta.env.VITE_USER_3_USERNAME && import.meta.env.VITE_USER_3_PASSWORD) {
      envUsers.push({
        id: 'usr_vps_3',
        username: import.meta.env.VITE_USER_3_USERNAME,
        password: import.meta.env.VITE_USER_3_PASSWORD,
        name: import.meta.env.VITE_USER_3_NAME || import.meta.env.VITE_USER_3_USERNAME,
        avatar: import.meta.env.VITE_USER_3_AVATAR || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80',
        bio: 'Akun Pengguna VPS',
        joinedAt: '2026-01-01',
        role: 'Standard User'
      });
    }

    if (import.meta.env.VITE_USER_4_USERNAME && import.meta.env.VITE_USER_4_PASSWORD) {
      envUsers.push({
        id: 'usr_vps_4',
        username: import.meta.env.VITE_USER_4_USERNAME,
        password: import.meta.env.VITE_USER_4_PASSWORD,
        name: import.meta.env.VITE_USER_4_NAME || import.meta.env.VITE_USER_4_USERNAME,
        avatar: import.meta.env.VITE_USER_4_AVATAR || 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&q=80',
        bio: 'Akun Pengguna VPS',
        joinedAt: '2026-01-01',
        role: 'Standard User'
      });
    }

    if (import.meta.env.VITE_USER_5_USERNAME && import.meta.env.VITE_USER_5_PASSWORD) {
      envUsers.push({
        id: 'usr_vps_5',
        username: import.meta.env.VITE_USER_5_USERNAME,
        password: import.meta.env.VITE_USER_5_PASSWORD,
        name: import.meta.env.VITE_USER_5_NAME || import.meta.env.VITE_USER_5_USERNAME,
        avatar: import.meta.env.VITE_USER_5_AVATAR || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80',
        bio: 'Akun Pengguna VPS',
        joinedAt: '2026-01-01',
        role: 'Standard User'
      });
    }

    if (envUsers.length > 0) return envUsers;
  } catch (err) {
    console.error('Gagal membaca pengguna dari .env:', err);
  }

  // Fallback ke default development users
  return DEFAULT_DEV_USERS;
};

export const SEED_USERS = getInitialSeedUsers();

/**
 * Initialize local database table if not present, and auto-sync any new SEED_USERS.
 */
export const initDatabase = () => {
  try {
    const seed = getInitialSeedUsers();
    const existingRaw = localStorage.getItem(DB_KEY);
    if (!existingRaw) {
      localStorage.setItem(DB_KEY, JSON.stringify(seed));
    } else {
      // Auto-merge any new SEED_USERS added in env/code that aren't in localStorage yet
      const existing = JSON.parse(existingRaw);
      let isUpdated = false;

      seed.forEach((seedUser) => {
        const found = existing.find(
          (u) => u.username.toLowerCase() === seedUser.username.toLowerCase()
        );
        if (!found) {
          existing.push(seedUser);
          isUpdated = true;
        }
      });

      if (isUpdated) {
        localStorage.setItem(DB_KEY, JSON.stringify(existing));
      }
    }
  } catch (error) {
    console.error('Failed to initialize local SQLite database:', error);
  }
};

/**
 * Get all users from local database.
 */
export const getUsers = () => {
  initDatabase();
  try {
    const raw = localStorage.getItem(DB_KEY);
    return raw ? JSON.parse(raw) : getInitialSeedUsers();
  } catch (e) {
    return getInitialSeedUsers();
  }
};

/**
 * Find user by username.
 */
export const findUser = (username) => {
  const users = getUsers();
  return users.find(
    (u) => u.username.toLowerCase() === username.trim().toLowerCase()
  );
};

/**
 * Verify user login credentials.
 * @returns {{ success: boolean, user?: object, message?: string }}
 */
export const verifyCredentials = (username, password) => {
  if (!username || !password) {
    return { success: false, message: 'Username dan password wajib diisi!' };
  }

  const user = findUser(username);
  if (!user) {
    return { success: false, message: 'Username tidak ditemukan!' };
  }

  if (user.password !== password) {
    return { success: false, message: 'Password salah!' };
  }

  // Omit password from returned user object for safety
  const { password: _, ...userWithoutPassword } = user;
  return { success: true, user: userWithoutPassword };
};

/**
 * Change user password in local database.
 */
export const updatePassword = (username, oldPassword, newPassword) => {
  if (!oldPassword || !newPassword) {
    return { success: false, message: 'Password lama dan baru harus diisi!' };
  }
  if (newPassword.length < 4) {
    return { success: false, message: 'Password baru minimal 4 karakter!' };
  }

  const users = getUsers();
  const index = users.findIndex(
    (u) => u.username.toLowerCase() === username.trim().toLowerCase()
  );

  if (index === -1) {
    return { success: false, message: 'User tidak ditemukan!' };
  }

  if (users[index].password !== oldPassword) {
    return { success: false, message: 'Password lama salah!' };
  }

  // Update password in database
  users[index].password = newPassword;
  localStorage.setItem(DB_KEY, JSON.stringify(users));

  return { success: true, message: 'Password berhasil diperbarui!' };
};

/**
 * Update profile details (e.g., display name or bio).
 */
export const updateProfile = (username, updatedFields) => {
  const users = getUsers();
  const index = users.findIndex(
    (u) => u.username.toLowerCase() === username.trim().toLowerCase()
  );

  if (index === -1) {
    return { success: false, message: 'User tidak ditemukan!' };
  }

  users[index] = { ...users[index], ...updatedFields };
  localStorage.setItem(DB_KEY, JSON.stringify(users));

  const { password: _, ...userWithoutPassword } = users[index];
  return { success: true, user: userWithoutPassword, message: 'Profil berhasil diperbarui!' };
};
