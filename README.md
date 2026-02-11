📺 IPTV Live TV Web Application

Frontend Engineering Project | HTML · CSS · JavaScript · HLS

A production-style IPTV Live TV web application that dynamically fetches and parses M3U playlists, organizes channels by category, and plays live streams directly in the browser using HLS streaming.

This project is designed to demonstrate real-world frontend engineering skills, not just UI design.

🧠 Project Overview

This application consumes real IPTV playlist data (.m3u files), converts it into structured JavaScript objects, and renders a responsive Live TV interface with category-based navigation and streaming playback.

The focus of this project is on:

Asynchronous data handling

Media streaming in browsers

Clean frontend architecture

Framework-free JavaScript engineering

🚀 Key Features

📡 Live TV Streaming

HTTP Live Streaming (HLS)

Adaptive playback with HLS.js

Stream cleanup on channel switch

🗂 Category-Based Navigation

Animation

Auto

Business

Classic

Comedy

Movies

Music

News

🧩 Playlist Parsing

Dynamic fetching of .m3u files

EXTINF metadata extraction

Conversion of raw playlist text into structured data

🎨 UI & UX

IPTV-style dark theme

Responsive layout (mobile → desktop)

Clear separation of UI and logic

Lightweight, fast-loading interface

Tech Stack
| Area         | Technology                        |
| ------------ | --------------------------------- |
| Markup       | HTML5 (Semantic)                  |
| Styling      | CSS3 (Flexbox, Responsive Design) |
| Logic        | JavaScript (ES6+)                 |
| Streaming    | HLS.js                            |
| Architecture | Modular, framework-free           |




📡 IPTV Playlist Sources

This project uses publicly available IPTV playlists provided by iptv-org:

https://iptv-org.github.io/iptv/categories/animation.m3u

https://iptv-org.github.io/iptv/categories/auto.m3u

https://iptv-org.github.io/iptv/categories/business.m3u

https://iptv-org.github.io/iptv/categories/classic.m3u

https://iptv-org.github.io/iptv/categories/comedy.m3u

https://iptv-org.github.io/iptv/categories/movies.m3u

https://iptv-org.github.io/iptv/categories/music.m3u

https://iptv-org.github.io/iptv/categories/news.m3u

⚙️ Application Flow

Fetch IPTV playlists asynchronously using fetch()

Parse M3U data into structured JavaScript objects

Render channels dynamically by category

Load selected streams into the video player

Handle playback using HLS.js

Update UI without page reloads



🧠 Engineering Challenges Addressed

Parsing non-standard data formats (.m3u)

Handling live media streams in browsers

Managing async state and UI updates

Preventing memory leaks during stream switching

Building scalable UI without frontend frameworks

🔮 Planned Enhancements

Channel search and filtering

Favorites system (LocalStorage)

Electronic Program Guide (EPG)

Backend proxy (Node.js) for CORS handling

User profiles and authentication

Android WebView packaging

📜 License

This project is licensed under the MIT License.
See the LICENSE
 file for details.

⚠️ Content Disclaimer

This project does not host, provide, or redistribute IPTV streams.
All playlist sources are publicly available third-party links.
This project is intended strictly for educational and portfolio demonstration purposes.

👤 Author

Ranjit
Frontend Developer | JavaScript Applications | Media Streaming UI
