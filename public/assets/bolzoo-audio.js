(function () {
  if (typeof window === "undefined") return;

  function BolzooAudio() {}

  BolzooAudio.init = function init(opts) {
    var VIDEO_ID = opts.videoId || "";
    var YT_VOLUME = typeof opts.volume === "number" ? opts.volume : 55;
    var hostElId = opts.hostElId || "ytHost";
    var buttonEl = opts.buttonEl || null;
    var iconEl = opts.iconEl || null;
    var textEl = opts.textEl || null;
    var onFail = typeof opts.onFail === "function" ? opts.onFail : function () {};

    var ytApiReady = false;
    var ytPlayer = null;
    var ytState = "loading";
    var wantPlay = false;
    var bgStarted = false;
    var muted = false;
    var firstGestureAt = 0;
    var destroyed = false;

    function updateSoundUI() {
      var loading = wantPlay && !bgStarted && ytState !== "failed";
      var playingLive = bgStarted && !muted;
      if (buttonEl) {
        buttonEl.setAttribute("aria-pressed", playingLive ? "true" : "false");
        buttonEl.setAttribute("aria-busy", loading ? "true" : "false");
        buttonEl.setAttribute(
          "data-sound-state",
          loading ? "loading" : playingLive ? "playing" : muted && bgStarted ? "muted" : "idle",
        );
      }
      if (iconEl) {
        if (loading) {
          // Emptied so the CSS spinner pseudo-element can take over.
          iconEl.textContent = "";
        } else {
          iconEl.textContent = !bgStarted ? "🎵" : muted ? "🔇" : "🔊";
        }
      }
      if (textEl) {
        textEl.textContent = loading
          ? "Ачаалж байна..."
          : !bgStarted
          ? "дуу асаах"
          : muted
          ? "дуу нээх"
          : "дууг нам болгох";
      }
    }

    function loadYTApi() {
      if (window.YT && window.YT.Player) {
        ytApiReady = true;
        return;
      }
      var existing = document.querySelector('script[data-bolzoo-yt="1"]');
      if (!existing) {
        var script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        script.setAttribute("data-bolzoo-yt", "1");
        script.onerror = ytFail;
        document.head.appendChild(script);
      }
      setTimeout(function () {
        if (destroyed) return;
        if (ytState === "loading" && !(window.YT && window.YT.Player)) ytFail();
      }, 4000);
    }

    function createYtPlayer() {
      if (destroyed) return;
      if (!(window.YT && window.YT.Player)) return;
      var host = document.getElementById(hostElId);
      if (!host) return;
      if (!VIDEO_ID) return;
      try {
        ytPlayer = new window.YT.Player(hostElId, {
          videoId: VIDEO_ID,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            loop: 1,
            playlist: VIDEO_ID,
            playsinline: 1,
            modestbranding: 1,
            rel: 0,
            fs: 0,
          },
          events: {
            onReady: onYtReady,
            onError: ytFail,
            onStateChange: onYtState,
          },
        });
      } catch {
        ytFail();
      }
    }

    function onYtReady() {
      if (destroyed) return;
      ytState = "ready";
      try { ytPlayer.setVolume(YT_VOLUME); } catch { /* noop */ }
      if (wantPlay && !bgStarted) startBackground();
    }

    function onYtState(event) {
      if (destroyed || !ytPlayer) return;
      if (event.data === 0) {
        try {
          ytPlayer.seekTo(0);
          ytPlayer.playVideo();
        } catch { /* noop */ }
      }
    }

    function ytFail() {
      if (destroyed) return;
      if (ytState === "ready") return;
      ytState = "failed";
      try { onFail(); } catch { /* noop */ }
      updateSoundUI();
    }

    function startBackground() {
      if (destroyed || bgStarted) return;
      if (ytState === "ready" && ytPlayer) {
        try {
          ytPlayer.setVolume(YT_VOLUME);
          if (muted) ytPlayer.mute(); else ytPlayer.unMute();
          ytPlayer.playVideo();
          bgStarted = true;
        } catch {
          ytFail();
        }
      }
      updateSoundUI();
    }

    function setMuted(m) {
      muted = !!m;
      if (ytPlayer && ytState === "ready") {
        try {
          if (muted) ytPlayer.mute(); else ytPlayer.unMute();
        } catch { /* noop */ }
      }
      updateSoundUI();
    }

    function setVideoId(id) {
      if (destroyed) return;
      if (!id || id === VIDEO_ID) return;
      VIDEO_ID = id;
      if (ytPlayer && ytState === "ready") {
        try {
          ytPlayer.loadVideoById(id);
          ytPlayer.setVolume(YT_VOLUME);
          if (bgStarted) ytPlayer.playVideo();
        } catch {
          ytFail();
        }
      } else if (!ytPlayer && ytApiReady) {
        createYtPlayer();
      }
    }

    var apiReadyHandler = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
      if (typeof apiReadyHandler === "function") {
        try { apiReadyHandler(); } catch { /* noop */ }
      }
      ytApiReady = true;
      if (destroyed) return;
      if (!opts.deferPlayerCreation) createYtPlayer();
      else if (VIDEO_ID) createYtPlayer();
    };

    function firstGesture() {
      if (destroyed) return;
      firstGestureAt = Date.now();
      wantPlay = true;
      // Reflect the loading state right away so the buyer sees feedback even
      // when the YouTube iframe API is still fetching.
      updateSoundUI();
      startBackground();
      setTimeout(function () {
        if (destroyed) return;
        if (!bgStarted) {
          ytState = "failed";
          onFail();
          updateSoundUI();
        }
      }, 4500);
    }

    function toggle() {
      if (destroyed) return;
      if (Date.now() - firstGestureAt < 350) {
        setMuted(false);
        return;
      }
      if (!wantPlay || !bgStarted) {
        muted = false;
        firstGesture();
        setMuted(false);
      } else {
        setMuted(!muted);
      }
    }

    var clickHandler = function () { toggle(); };
    var attachedBtn = null;
    function attachButton(el) {
      if (attachedBtn === el) return;
      if (attachedBtn) {
        try { attachedBtn.removeEventListener("click", clickHandler); } catch { /* noop */ }
      }
      attachedBtn = el || null;
      if (attachedBtn) {
        attachedBtn.addEventListener("click", clickHandler);
      }
      buttonEl = attachedBtn;
    }

    attachButton(buttonEl);

    loadYTApi();
    updateSoundUI();

    return {
      setVideoId: setVideoId,
      setMuted: setMuted,
      start: firstGesture,
      toggle: toggle,
      attachButton: attachButton,
      attachIcon: function (el) { iconEl = el || null; updateSoundUI(); },
      attachText: function (el) { textEl = el || null; updateSoundUI(); },
      isReady: function () { return ytState === "ready"; },
      hasFailed: function () { return ytState === "failed"; },
      destroy: function () {
        destroyed = true;
        if (attachedBtn) {
          try { attachedBtn.removeEventListener("click", clickHandler); } catch { /* noop */ }
          attachedBtn = null;
        }
        try {
          if (ytPlayer && ytPlayer.destroy) ytPlayer.destroy();
        } catch { /* noop */ }
        ytPlayer = null;
      },
    };
  };

  window.BolzooAudio = BolzooAudio;
})();
