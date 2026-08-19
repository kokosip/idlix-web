# 🎬 IDLIX Web - Modern Streaming Frontend

A high-performance, modern streaming web client built with **React 18**, **Tailwind CSS v3**, and **HLS.js**, designed specifically to interface with the IDLIX REST API v3 backend.

> 📡 **Backend API Repository**: [github.com/kokosip/idlix-api](https://github.com/kokosip/idlix-api.git)

![IDLIX Web Showcase](https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=1200&auto=format&fit=crop&q=80)

---

## ✨ Features

- 🍿 **Modern Cyber Dark Aesthetic**: Styled with Tailwind CSS, glassmorphism UI, glowing accents, and smooth horizontal scrolling rails.
- ⚡ **Lightning Fast & Responsive**: Built with Vite and React 18 for high frame-rate performance across desktop, tablet, and mobile browsers.
- 📺 **HLS `.m3u8` Video Player**: Built-in video player powered by `hls.js` supporting direct `.m3u8` video playback, iframe embeds, and `.vtt` subtitle track rendering.
- 🔍 **Real-Time Live Search**: Debounced search bar with instant autocomplete overlay and ratings.
- 🎭 **Filter & Categorization**: Browse media by Genre (Action, K-Drama, Horror, Sci-Fi), Country (Korea, USA, Indonesia, Japan), Release Year, or Streaming Network (Netflix, HBO Max, Disney+, Apple TV+).
- 🎬 **Series & Season/Episode Selector**: Dedicated modal view for TV series with season tab switching and episode lists.
- 🏆 **Leaderboard & Ranking**: Top ranked movies and TV series leaderboard display.
- 🔖 **Personal Watchlist**: Save your favorite movies and series directly to browser `localStorage`.
- ⚙️ **Dynamic API Connection Manager**: In-app modal to test API status and switch Base API URL (defaults to `http://localhost:3000`).

---

## 🚀 Tech Stack

- **Framework**: [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v3](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Video Streaming**: [HLS.js](https://github.com/video-dev/hls.js/)

---

## 📡 API Endpoints Handled

This frontend fully covers the IDLIX REST API v3 endpoints:

| Section | Endpoint | Description |
| :--- | :--- | :--- |
| **Status** | `GET /` | API Root Health Status |
| **Home** | `GET /api/home` | Flat Homepage Content |
| **Home** | `GET /api/home/sections` | Grouped Homepage Content |
| **Home** | `GET /api/featured` | Featured / Trending Items |
| **Home** | `GET /api/cinemaxxi` | CinemaXXI Movies |
| **Search** | `GET /api/search?q=:query` | Search Movies & Series |
| **Movies** | `GET /api/movie` | Browse Paginated Movies |
| **Movies** | `GET /api/movie/trending` | Trending Movies |
| **Movies** | `GET /api/movie/:slug` | Movie Detail Metadata |
| **Movies** | `GET /api/movie/:slug/stream` | Extract Movie Stream URL & Subtitles |
| **Series** | `GET /api/series` | Browse Paginated Series |
| **Series** | `GET /api/series/trending` | Trending TV Series |
| **Series** | `GET /api/series/:slug` | Series Detail & Seasons |
| **Series** | `GET /api/series/:slug/season/:s` | Season Episodes List |
| **Series** | `GET /api/series/:slug/season/:s/episode/:e/stream` | Extract Episode Stream URL & Subtitles |
| **Leaderboard** | `GET /api/leaderboard` | Top Ranked Media |
| **Genres** | `GET /api/genre` | List All Genres |
| **Genres** | `GET /api/genre/:slug` | Browse Content by Genre |
| **Countries** | `GET /api/country` | List All Countries |
| **Countries** | `GET /api/country/:slug` | Browse Content by Country |
| **Years** | `GET /api/year` | List All Release Years |
| **Years** | `GET /api/year/:year` | Browse Content by Year |
| **Networks** | `GET /api/network` | List Streaming Networks |
| **Networks** | `GET /api/network/:slug` | Browse Netflix / Network Content |

---

## 🛠️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- IDLIX REST API Server running (usually on `http://localhost:3000`)

### Installation & Running

1. **Clone or Navigate to the Workspace**:
   ```bash
   cd d:\Projects\Self\idlix-web
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173`.

4. **Build Production Bundle**:
   ```bash
   npm run build
   ```

---

## 📁 Project Structure

```text
idlix-web/
├── package.json
├── vite.config.js
├── tailwind.config.js
├── index.html
├── README.md
├── .gitignore
└── src/
    ├── main.jsx                # React Entrypoint
    ├── App.jsx                 # App Container & Router State
    ├── index.css               # Global CSS & Tailwind utilities
    ├── services/
    │   └── api.js              # API Client & Normalizer Wrapper
    ├── context/
    │   └── WatchlistContext.jsx# LocalStorage Watchlist State
    ├── components/
    │   ├── Navbar.jsx          # Header, Autocomplete Search, API Status
    │   ├── HeroBanner.jsx      # Featured Carousel Banner
    │   ├── ContentCard.jsx     # Media Card with Poster & Badges
    │   ├── ContentRail.jsx     # Horizontal Scrollable Section Rail
    │   ├── SkeletonCard.jsx    # Loading Skeleton Placeholder
    │   ├── DetailModal.jsx     # Movie/Series Metadata & Season Picker
    │   ├── VideoPlayerModal.jsx# HLS m3u8 Player & Subtitle Selector
    │   ├── ApiConfigModal.jsx  # API URL Settings & Connection Test
    │   └── FilterDrawer.jsx    # Genre / Country / Year / Network Filter
    └── views/
        ├── HomeView.jsx        # Homepage View
        ├── MoviesView.jsx      # Movies Catalogue View
        ├── SeriesView.jsx      # TV Series Catalogue View
        ├── LeaderboardView.jsx # Leaderboard Ranking View
        ├── CategoryView.jsx    # Filtered Media View
        └── WatchlistView.jsx   # Saved Watchlist View
```
