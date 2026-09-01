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

    // Монголын мобайл сүлжээнд YouTube iframe API 4 секундэд амждаггүй тул
    // хугацааг сулруулж, бүтэлгүйтлийг дахин оролдох боломжтой болгов.
    var API_TIMEOUT_MS = 15000;
    var PLAY_TIMEOUT_MS = 15000;
    var HOST_WAIT_MS = 30000;

    var ytPlayer = null;
    var ytState = "loading";
    var wantPlay = false;
    var bgStarted = false;
    var muted = false;
    var destroyed = false;
    var timers = [];
    var playerNode = null;
    var hostWaitStartedAt = 0;
    var playTimer = 0;

    function later(fn, ms) {
      var id = window.setTimeout(fn, ms);
      timers.push(id);
      return id;
    }

    function clearTimers() {
      for (var i = 0; i < timers.length; i += 1) {
        window.clearTimeout(timers[i]);
      }
      timers = [];
      playTimer = 0;
    }

    function updateSoundUI() {
      var failed = ytState === "failed";
      var loading = wantPlay && !bgStarted && !failed;
      var playingLive = bgStarted && !muted;
      if (buttonEl) {
        buttonEl.setAttribute("aria-pressed", playingLive ? "true" : "false");
        buttonEl.setAttribute("aria-busy", loading ? "true" : "false");
        buttonEl.setAttribute(
          "data-sound-state",
          failed
            ? "failed"
            : loading
            ? "loading"
            : playingLive
            ? "playing"
            : muted && bgStarted
            ? "muted"
            : "idle",
        );
      }
      if (iconEl) {
        if (loading) {
          // Emptied so the CSS spinner pseudo-element can take over.
          iconEl.textContent = "";
        } else {
          iconEl.textContent = failed
            ? "↻"
            : !bgStarted
            ? "🎵"
            : muted
            ? "🔇"
            : "🔊";
        }
      }
      if (textEl) {
        textEl.textContent = failed
          ? "дахин оролдох"
          : loading
          ? "Ачаалж байна..."
          : !bgStarted
          ? "дуу асаах"
          : muted
          ? "дуу нээх"
          : "дууг нам болгох";
      }
    }

    function apiLoaded() {
      return Boolean(window.YT && window.YT.Player);
    }

    function loadYTApi() {
      if (apiLoaded()) {
        // API аль хэдийн ачаалагдсан (өөр mount, дахин оролдлого). Ийм үед
        // window.onYouTubeIframeAPIReady дахин дуудагдахгүй тул player-ээ
        // өөрсдөө үүсгэнэ — өмнө нь энд шууд буцаад дуу хэзээ ч гардаггүй байв.
        later(createYtPlayer, 0);
        return;
      }
      if (!document.querySelector('script[data-bolzoo-yt="1"]')) {
        var script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        script.setAttribute("data-bolzoo-yt", "1");
        script.onerror = function () {
          failWith("api-script");
        };
        document.head.appendChild(script);
      }
      // Глобал callback-ийг өмнөх instance дарж магадгүй тул поллоор хүлээнэ.
      var startedAt = Date.now();
      var poll = function () {
        if (destroyed) return;
        if (apiLoaded()) {
          createYtPlayer();
          return;
        }
        if (Date.now() - startedAt >= API_TIMEOUT_MS) {
          failWith("api-timeout");
          return;
        }
        later(poll, 200);
      };
      later(poll, 150);
    }

    /**
     * YT.Player нь өгсөн элементийг iframe-ээр СОЛЬДОГ тул host div-ийг шууд
     * өгвөл React-ийн зурсан зангилаа болон түүний нуух CSS алга болно.
     * Оронд нь host дотор нэг удаагийн хүү div үүсгэж түүнийг өгнө.
     */
    function ensureMountNode() {
      var host = document.getElementById(hostElId);
      if (!host) return null;
      if (playerNode && playerNode.parentNode === host) return playerNode;
      host.textContent = "";
      var mount = document.createElement("div");
      mount.className = "mend-yt-frame";
      host.appendChild(mount);
      playerNode = mount;
      return mount;
    }

    function createYtPlayer() {
      if (destroyed || ytPlayer) return;
      if (!apiLoaded() || !VIDEO_ID) return;
      var mount = ensureMountNode();
      if (!mount) {
        // Host хараахан DOM-д ороогүй байна: түгжээтэй мэндчилгээ, in-app
        // browser gate, эсвэл ачаалж буй төлөв. Энэ нь алдаа биш тул
        // бүтэлгүйтэл гэж тэмдэглэхгүй, гарч ирэхийг нь хүлээнэ.
        if (!hostWaitStartedAt) hostWaitStartedAt = Date.now();
        if (Date.now() - hostWaitStartedAt < HOST_WAIT_MS) {
          later(createYtPlayer, 200);
        }
        return;
      }
      try {
        ytPlayer = new window.YT.Player(mount, {
          width: "320",
          height: "180",
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
            origin: window.location.origin,
          },
          events: {
            onReady: onYtReady,
            onError: onYtError,
            onStateChange: onYtState,
          },
        });
      } catch {
        failWith("player-create");
      }
    }

    function onYtReady() {
      if (destroyed) return;
      ytState = "ready";
      try {
        playerNode = ytPlayer.getIframe();
      } catch {
        /* noop */
      }
      try {
        ytPlayer.setVolume(YT_VOLUME);
      } catch {
        /* noop */
      }
      if (wantPlay && !bgStarted) startBackground();
      updateSoundUI();
    }

    function onYtState(event) {
      if (destroyed || !ytPlayer) return;
      // 1 = playing, 3 = buffering. Аль нэг нь ирсэн үед л жинхэнэ тоглолт
      // эхэлсэн гэж үзнэ (өмнө нь playVideo() дуудмагц эхэлсэн гэж таамаглаад
      // хориглосон видеон дээр UI худал "тоглож байна" гэж харуулдаг байв).
      if (event.data === 1 || event.data === 3) {
        if (!bgStarted) {
          bgStarted = true;
          if (playTimer) {
            window.clearTimeout(playTimer);
            playTimer = 0;
          }
          updateSoundUI();
        }
      }
      if (event.data === 0) {
        try {
          ytPlayer.seekTo(0);
          ytPlayer.playVideo();
        } catch {
          /* noop */
        }
      }
    }

    function onYtError() {
      // 100/101/150 — видео устсан эсвэл embed хийхийг хориглосон. Ийм үед
      // хэзээ ч тоглохгүй тул шууд алдаа болгож, хэрэглэгчид гарц үзүүлнэ.
      failWith("player-error");
    }

    function failWith() {
      if (destroyed) return;
      if (ytState === "failed") return;
      ytState = "failed";
      if (playTimer) {
        window.clearTimeout(playTimer);
        playTimer = 0;
      }
      updateSoundUI();
      try {
        onFail();
      } catch {
        /* noop */
      }
    }

    function startBackground() {
      if (destroyed || bgStarted) return;
      if (ytState === "ready" && ytPlayer) {
        try {
          ytPlayer.setVolume(YT_VOLUME);
          if (muted) ytPlayer.mute();
          else ytPlayer.unMute();
          ytPlayer.playVideo();
        } catch {
          failWith("play");
        }
      }
      updateSoundUI();
    }

    function setMuted(m) {
      muted = !!m;
      if (ytPlayer && ytState === "ready") {
        try {
          if (muted) ytPlayer.mute();
          else ytPlayer.unMute();
        } catch {
          /* noop */
        }
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
          failWith("load-video");
        }
      } else if (!ytPlayer) {
        createYtPlayer();
      }
    }

    var apiReadyHandler = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
      if (typeof apiReadyHandler === "function") {
        try {
          apiReadyHandler();
        } catch {
          /* noop */
        }
      }
      if (destroyed) return;
      createYtPlayer();
    };

    function firstGesture() {
      if (destroyed) return;
      wantPlay = true;
      // Reflect the loading state right away so the buyer sees feedback even
      // when the YouTube iframe API is still fetching.
      updateSoundUI();
      // Товшилт ирсэн үед host заавал DOM-д байгаа тул player-ээ яг одоо
      // үүсгэж болно (API эрт ачаалагдчихсан байсан ч).
      createYtPlayer();
      startBackground();
      if (playTimer) window.clearTimeout(playTimer);
      playTimer = later(function () {
        if (destroyed) return;
        if (!bgStarted) failWith("play-timeout");
      }, PLAY_TIMEOUT_MS);
    }

    function retry() {
      if (destroyed) return;
      clearTimers();
      if (ytPlayer) {
        try {
          if (ytPlayer.destroy) ytPlayer.destroy();
        } catch {
          /* noop */
        }
      }
      ytPlayer = null;
      playerNode = null;
      hostWaitStartedAt = 0;
      bgStarted = false;
      muted = false;
      ytState = "loading";
      updateSoundUI();
      loadYTApi();
      firstGesture();
    }

    function toggle() {
      if (destroyed) return;
      if (ytState === "failed") {
        retry();
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

    // Товчны click-ийг дуудагч (React onClick) өөрөө холбодог. Энд бас
    // addEventListener хийвэл нэг товшилт хоёр удаа toggle хийж, дуугаа
    // асаагаад шууд буцааж хаадаг байсан.
    function attachButton(el) {
      buttonEl = el || null;
      updateSoundUI();
    }

    attachButton(buttonEl);

    loadYTApi();
    createYtPlayer();
    updateSoundUI();

    return {
      setVideoId: setVideoId,
      setMuted: setMuted,
      start: firstGesture,
      toggle: toggle,
      retry: retry,
      attachButton: attachButton,
      attachIcon: function (el) {
        iconEl = el || null;
        updateSoundUI();
      },
      attachText: function (el) {
        textEl = el || null;
        updateSoundUI();
      },
      isReady: function () {
        return ytState === "ready";
      },
      hasFailed: function () {
        return ytState === "failed";
      },
      destroy: function () {
        destroyed = true;
        clearTimers();
        buttonEl = null;
        iconEl = null;
        textEl = null;
        try {
          if (ytPlayer && ytPlayer.destroy) ytPlayer.destroy();
        } catch {
          /* noop */
        }
        ytPlayer = null;
        playerNode = null;
      },
    };
  };

  window.BolzooAudio = BolzooAudio;
})();
