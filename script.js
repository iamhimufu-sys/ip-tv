(() => {
  "use strict";

  const CATEGORIES = [
    {
      id: "animation",
      name: "Animation",
      url: "https://iptv-org.github.io/iptv/categories/animation.m3u",
    },
    {
      id: "auto",
      name: "Auto",
      url: "https://iptv-org.github.io/iptv/categories/auto.m3u",
    },
    {
      id: "business",
      name: "Business",
      url: "https://iptv-org.github.io/iptv/categories/business.m3u",
    },
    {
      id: "classic",
      name: "Classic",
      url: "https://iptv-org.github.io/iptv/categories/classic.m3u",
    },
    {
      id: "comedy",
      name: "Comedy",
      url: "https://iptv-org.github.io/iptv/categories/comedy.m3u",
    },
    {
      id: "movies",
      name: "Movies",
      url: "https://iptv-org.github.io/iptv/categories/movies.m3u",
    },
    {
      id: "music",
      name: "Music",
      url: "https://iptv-org.github.io/iptv/categories/music.m3u",
    },
    {
      id: "news",
      name: "News",
      url: "https://iptv-org.github.io/iptv/categories/news.m3u",
    },
  ];

  const Storage = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (error) {
        return fallback;
      }
    },
    set(key, value) {
      localStorage.setItem(key, JSON.stringify(value));
    },
  };

  const state = {
    currentCategory: null,
    viewMode: "all",
    searchTerm: "",
    cache: new Map(),
    favorites: new Map(),
    recent: [],
    currentChannel: null,
    visibleMap: new Map(),
    hls: null,
    observer: null,
  };

  const els = {
    app: document.getElementById("app"),
    categoryList: document.getElementById("categoryList"),
    searchInput: document.getElementById("searchInput"),
    channelGrid: document.getElementById("channelGrid"),
    sectionTitle: document.getElementById("sectionTitle"),
    sectionSubtitle: document.getElementById("sectionSubtitle"),
    resultCount: document.getElementById("resultCount"),
    connectionStatus: document.getElementById("connectionStatus"),
    viewAllBtn: document.getElementById("viewAllBtn"),
    viewFavoritesBtn: document.getElementById("viewFavoritesBtn"),
    viewRecentBtn: document.getElementById("viewRecentBtn"),
    themeToggle: document.getElementById("themeToggle"),
    currentChannelName: document.getElementById("currentChannelName"),
    liveIndicator: document.getElementById("liveIndicator"),
    streamStatus: document.getElementById("streamStatus"),
    video: document.getElementById("video"),
    playerOverlay: document.getElementById("playerOverlay"),
    overlayText: document.getElementById("overlayText"),
    playerError: document.getElementById("playerError"),
    errorMessage: document.getElementById("errorMessage"),
    retryBtn: document.getElementById("retryBtn"),
    fullscreenBtn: document.getElementById("fullscreenBtn"),
    volumeRange: document.getElementById("volumeRange"),
    playerCard: document.getElementById("playerCard"),
  };

  const debounce = (fn, delay = 250) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  };

  const hash = (value) => {
    let h = 0;
    for (let i = 0; i < value.length; i += 1) {
      h = (h << 5) - h + value.charCodeAt(i);
      h |= 0;
    }
    return `c${Math.abs(h)}`;
  };

  const loadPersisted = () => {
    const favorites = Storage.get("iptv_favorites", []);
    favorites.forEach((channel) => state.favorites.set(channel.id, channel));
    state.recent = Storage.get("iptv_recent", []);

    const theme = Storage.get("iptv_theme", "dark");
    setTheme(theme);
  };

  const setTheme = (theme) => {
    els.app.dataset.theme = theme;
    els.themeToggle.textContent = theme === "dark" ? "Light" : "Dark";
    Storage.set("iptv_theme", theme);
  };

  const toggleTheme = () => {
    const next = els.app.dataset.theme === "dark" ? "light" : "dark";
    setTheme(next);
  };

  const updateConnectionStatus = (label) => {
    els.connectionStatus.textContent = label;
  };

  const setOverlay = (active, text = "Loading stream…") => {
    els.playerOverlay.classList.toggle("active", active);
    els.overlayText.textContent = text;
  };

  const setError = (active, message = "We could not load this stream.") => {
    els.playerError.classList.toggle("active", active);
    els.errorMessage.textContent = message;
  };

  const setStreamStatus = (label) => {
    els.streamStatus.textContent = label;
  };

  const buildCategoryList = () => {
    els.categoryList.innerHTML = "";
    const fragment = document.createDocumentFragment();
    CATEGORIES.forEach((category) => {
      const button = document.createElement("button");
      button.className = "category-btn";
      button.textContent = category.name;
      button.dataset.id = category.id;
      fragment.appendChild(button);
    });
    els.categoryList.appendChild(fragment);
  };

  const setActiveCategoryButton = (id) => {
    els.categoryList.querySelectorAll(".category-btn").forEach((button) => {
      button.classList.toggle("active", button.dataset.id === id);
    });
  };

  const parseAttributes = (raw) => {
    const attrs = {};
    const regex = /([a-zA-Z0-9-]+)="([^"]*)"/g;
    let match;
    while ((match = regex.exec(raw))) {
      attrs[match[1]] = match[2];
    }
    return attrs;
  };

  const parsePlaylist = (content, categoryName) => {
    const lines = content.split(/\r?\n/);
    const channels = [];
    let current = null;

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      if (trimmed.startsWith("#EXTINF")) {
        const parts = trimmed.split(",");
        const title = parts.slice(1).join(",").trim() || "Unknown";
        const meta = parts[0];
        const attrs = parseAttributes(meta);
        current = {
          id: "",
          name: title,
          logo: attrs["tvg-logo"] || "",
          group: attrs["group-title"] || categoryName,
          url: "",
          category: categoryName,
        };
      } else if (!trimmed.startsWith("#") && current) {
        current.url = trimmed;
        current.id = hash(`${current.name}|${current.url}`);
        channels.push(current);
        current = null;
      }
    });

    return channels;
  };

  const fetchCategory = async (category) => {
    if (state.cache.has(category.id)) {
      return state.cache.get(category.id);
    }

    updateConnectionStatus(`Loading ${category.name}…`);
    renderSkeleton(12);

    try {
      const response = await fetch(category.url);
      if (!response.ok) {
        throw new Error("Playlist fetch failed");
      }
      const text = await response.text();
      const channels = parsePlaylist(text, category.name);
      state.cache.set(category.id, channels);
      updateConnectionStatus("Ready");
      return channels;
    } catch (error) {
      updateConnectionStatus("Offline");
      renderEmptyState("Unable to load playlist. Check your connection.");
      return [];
    }
  };

  const renderSkeleton = (count) => {
    els.channelGrid.innerHTML = "";
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < count; i += 1) {
      const skeleton = document.createElement("div");
      skeleton.className = "skeleton";
      fragment.appendChild(skeleton);
    }
    els.channelGrid.appendChild(fragment);
    els.resultCount.textContent = "Loading…";
  };

  const renderEmptyState = (message) => {
    els.channelGrid.innerHTML = "";
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = message;
    els.channelGrid.appendChild(empty);
    els.resultCount.textContent = "0 channels";
  };

  const renderChannels = (channels) => {
    els.channelGrid.innerHTML = "";
    state.visibleMap.clear();

    if (!channels.length) {
      renderEmptyState("No channels found.");
      return;
    }

    const fragment = document.createDocumentFragment();

    channels.forEach((channel) => {
      state.visibleMap.set(channel.id, channel);

      const card = document.createElement("article");
      card.className = "channel-card";
      card.dataset.id = channel.id;

      const favBtn = document.createElement("button");
      favBtn.className = "fav-btn";
      favBtn.type = "button";
      favBtn.textContent = "*";
      favBtn.setAttribute("aria-label", "Toggle favorite");
      if (state.favorites.has(channel.id)) {
        favBtn.classList.add("active");
      }

      const logoWrap = document.createElement("div");
      logoWrap.className = "logo-wrap";

      const img = document.createElement("img");
      img.className = "channel-logo";
      img.alt = channel.name;
      img.loading = "lazy";

      if (channel.logo) {
        img.dataset.src = channel.logo;
      } else {
        img.classList.add("no-logo");
      }

      const fallback = document.createElement("span");
      fallback.className = "logo-fallback";
      fallback.textContent = channel.name.slice(0, 2).toUpperCase();

      logoWrap.appendChild(img);
      logoWrap.appendChild(fallback);

      const info = document.createElement("div");
      info.className = "channel-info";

      const name = document.createElement("div");
      name.className = "channel-name";
      name.textContent = channel.name;

      const group = document.createElement("div");
      group.className = "channel-group";
      group.textContent = channel.group;

      info.appendChild(name);
      info.appendChild(group);

      card.appendChild(favBtn);
      card.appendChild(logoWrap);
      card.appendChild(info);

      fragment.appendChild(card);
    });

    els.channelGrid.appendChild(fragment);
    els.resultCount.textContent = `${channels.length} channels`;

    initLazyImages();
  };

  const initLazyImages = () => {
    if (state.observer) {
      state.observer.disconnect();
    }

    state.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const img = entry.target;
          const src = img.dataset.src;
          if (src) {
            img.src = src;
            img.onload = () => img.classList.add("loaded");
            img.onerror = () => img.classList.add("no-logo");
          }
          state.observer.unobserve(img);
        });
      },
      { rootMargin: "200px", threshold: 0.1 }
    );

    document.querySelectorAll("img[data-src]").forEach((img) => {
      state.observer.observe(img);
    });
  };

  const setViewMode = (mode) => {
    state.viewMode = mode;
    els.viewAllBtn.setAttribute("aria-pressed", mode === "all");
    els.viewFavoritesBtn.setAttribute("aria-pressed", mode === "favorites");
    els.viewRecentBtn.setAttribute("aria-pressed", mode === "recent");

    if (mode === "favorites") {
      els.sectionTitle.textContent = "Favorites";
      els.sectionSubtitle.textContent = "Saved channels";
    } else if (mode === "recent") {
      els.sectionTitle.textContent = "Recently Watched";
      els.sectionSubtitle.textContent = "Keep watching";
    } else if (state.currentCategory) {
      els.sectionTitle.textContent = state.currentCategory.name;
      els.sectionSubtitle.textContent = "Streaming channels";
    }

    applyFilters();
  };

  const getBaseList = () => {
    if (state.viewMode === "favorites") {
      return Array.from(state.favorites.values());
    }
    if (state.viewMode === "recent") {
      return state.recent;
    }
    if (state.currentCategory && state.cache.has(state.currentCategory.id)) {
      return state.cache.get(state.currentCategory.id);
    }
    return [];
  };

  const applyFilters = () => {
    const list = getBaseList();
    const term = state.searchTerm.toLowerCase().trim();
    const filtered = term
      ? list.filter(
          (channel) =>
            channel.name.toLowerCase().includes(term) ||
            channel.group.toLowerCase().includes(term)
        )
      : list;

    renderChannels(filtered);
  };

  const selectCategory = async (category) => {
    state.currentCategory = category;
    setActiveCategoryButton(category.id);
    setViewMode("all");

    const channels = await fetchCategory(category);
    if (!channels.length) return;
    renderChannels(channels);
  };

  const toggleFavorite = (channel) => {
    if (state.favorites.has(channel.id)) {
      state.favorites.delete(channel.id);
    } else {
      state.favorites.set(channel.id, channel);
    }
    Storage.set("iptv_favorites", Array.from(state.favorites.values()));
    applyFilters();
  };

  const updateRecent = (channel) => {
    const filtered = state.recent.filter((item) => item.id !== channel.id);
    filtered.unshift(channel);
    state.recent = filtered.slice(0, 20);
    Storage.set("iptv_recent", state.recent);
    if (state.viewMode === "recent") {
      applyFilters();
    }
  };

  const cleanupPlayer = () => {
    if (state.hls) {
      state.hls.destroy();
      state.hls = null;
    }
    els.video.pause();
    els.video.removeAttribute("src");
    els.video.load();
  };

  const playChannel = (channel) => {
    if (!channel || !channel.url) return;

    state.currentChannel = channel;
    els.currentChannelName.textContent = channel.name;
    setStreamStatus("Connecting…");
    setError(false);
    setOverlay(true, "Buffering stream…");
    els.playerCard.classList.add("is-switching");

    cleanupPlayer();

    if (window.Hls && window.Hls.isSupported()) {
      state.hls = new window.Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 60,
      });
      state.hls.loadSource(channel.url);
      state.hls.attachMedia(els.video);
      state.hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
        els.video.play().catch(() => {});
      });
      state.hls.on(window.Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setOverlay(false);
          setError(true, "Stream failed. Try another channel.");
          setStreamStatus("Error");
          els.playerCard.classList.remove("is-switching");
        }
      });
    } else if (els.video.canPlayType("application/vnd.apple.mpegurl")) {
      els.video.src = channel.url;
      els.video.play().catch(() => {});
    } else {
      setError(true, "HLS not supported in this browser.");
      setStreamStatus("Unsupported");
    }

    updateRecent(channel);
  };

  const handleGridClick = (event) => {
    const favBtn = event.target.closest(".fav-btn");
    if (favBtn) {
      const card = favBtn.closest(".channel-card");
      const channel = state.visibleMap.get(card.dataset.id);
      if (channel) toggleFavorite(channel);
      return;
    }

    const card = event.target.closest(".channel-card");
    if (!card) return;
    const channel = state.visibleMap.get(card.dataset.id);
    playChannel(channel);
  };

  const bindEvents = () => {
    els.categoryList.addEventListener("click", (event) => {
      const button = event.target.closest(".category-btn");
      if (!button) return;
      const category = CATEGORIES.find((item) => item.id === button.dataset.id);
      if (category) selectCategory(category);
    });

    els.channelGrid.addEventListener("click", handleGridClick);

    els.viewAllBtn.addEventListener("click", () => setViewMode("all"));
    els.viewFavoritesBtn.addEventListener("click", () => setViewMode("favorites"));
    els.viewRecentBtn.addEventListener("click", () => setViewMode("recent"));

    els.themeToggle.addEventListener("click", toggleTheme);

    els.searchInput.addEventListener(
      "input",
      debounce((event) => {
        state.searchTerm = event.target.value;
        applyFilters();
      }, 200)
    );

    document.addEventListener("keydown", (event) => {
      if (event.key === "/" && document.activeElement !== els.searchInput) {
        event.preventDefault();
        els.searchInput.focus();
      }
    });

    els.retryBtn.addEventListener("click", () => {
      if (state.currentChannel) playChannel(state.currentChannel);
    });

    els.fullscreenBtn.addEventListener("click", () => {
      const container = els.video.parentElement;
      if (!document.fullscreenElement) {
        container.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });

    els.volumeRange.addEventListener("input", (event) => {
      els.video.volume = Number(event.target.value);
    });

    els.video.addEventListener("waiting", () => {
      setOverlay(true, "Buffering stream…");
      setStreamStatus("Buffering");
    });

    els.video.addEventListener("playing", () => {
      setOverlay(false);
      setStreamStatus("Live");
      els.playerCard.classList.remove("is-switching");
    });

    els.video.addEventListener("error", () => {
      setError(true, "Playback error. Try another channel.");
      setStreamStatus("Error");
      setOverlay(false);
      els.playerCard.classList.remove("is-switching");
    });
  };

  const init = () => {
    buildCategoryList();
    bindEvents();
    loadPersisted();
    els.video.volume = Number(els.volumeRange.value);
    selectCategory(CATEGORIES[0]);
  };

  init();
})();





