let fileToDownload = null;

document.addEventListener("DOMContentLoaded", () => {
  // ===== 1. Подписка и скачивание =====
  function confirmSubscription() {
    if (fileToDownload === "ARCHIVE_MODE") {
      document.getElementById("downloadForm").submit();
    } else if (fileToDownload) {
      const a = document.createElement("a");
      a.href = `/static/${fileToDownload}`;
      a.setAttribute("download", "");
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    fileToDownload = null;
    document.getElementById("subscribeModal").style.display = "none";
  }

  function closeSubscribeModal() {
    document.getElementById("subscribeModal").style.display = "none";
    fileToDownload = null;
  }

  document.getElementById("confirmSubscribeBtn")?.addEventListener("click", confirmSubscription);
  document.getElementById("closeSubscribeBtn")?.addEventListener("click", closeSubscribeModal);

  document.querySelectorAll(".download-mp3").forEach((link) => {
    const filename = link.dataset.filename;
    link.addEventListener("click", (e) => {
      e.preventDefault();
      fileToDownload = filename;
      document.getElementById("subscribeModal").style.display = "flex";
    });
  });

  document.getElementById("downloadAllImage")?.addEventListener("click", (e) => {
    e.preventDefault();
    fileToDownload = "ARCHIVE_MODE";
    document.getElementById("subscribeModal").style.display = "flex";
  });

  document.getElementById("toggleSubscribeInfoBtn")?.addEventListener("click", () => {
    const info = document.getElementById("subscribeInfo");
    if (info) {
      info.style.display = info.style.display === "none" || !info.style.display ? "block" : "none";
    }
  });

  // ===== 2. Избранные голоса =====
  const favKey = "ttsFavorites";
  let favList = JSON.parse(localStorage.getItem(favKey) || "[]");
  document.querySelectorAll(".voice-fav").forEach((star) => {
    const voiceId = star.dataset.id;
    if (favList.includes(voiceId)) star.classList.add("active");
    star.addEventListener("click", (e) => {
      e.stopPropagation();
      if (favList.includes(voiceId)) {
        favList = favList.filter((v) => v !== voiceId);
        star.classList.remove("active");
      } else {
        favList.push(voiceId);
        star.classList.add("active");
      }
      localStorage.setItem(favKey, JSON.stringify(favList));
    });
  });

  // ===== 3. Глобальный контроль громкости =====
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const globalGainNode = audioCtx.createGain();
  globalGainNode.connect(audioCtx.destination);
  globalGainNode.gain.value = 1;

  function connectAudio(audioEl) {
    if (audioEl._gainConnected) return;
    try {
      const source = audioCtx.createMediaElementSource(audioEl);
      source.connect(globalGainNode);
      audioEl._gainConnected = true;
      audioEl.addEventListener("play", () => {
        if (audioCtx.state === "suspended") audioCtx.resume();
      });
    } catch (e) {
      console.warn("Ошибка подключения audio:", e);
    }
  }

  document.querySelectorAll("audio").forEach(el => {
    if (el.id !== "sharedAudio") connectAudio(el);
  });

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach(node => {
        if (node.tagName === "AUDIO" && node.id !== "sharedAudio") {
          connectAudio(node);
        } else if (node.querySelectorAll) {
          node.querySelectorAll("audio").forEach(el => {
            if (el.id !== "sharedAudio") connectAudio(el);
          });
        }
      });
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  const audioPlayer = document.getElementById("audioPlayer");
  if (audioPlayer) {
    connectAudio(audioPlayer);
    audioPlayer.play().catch(err => console.warn("Фоновый звук не запустился:", err));
  }

  const sharedAudio = document.getElementById("sharedAudio");
  if (sharedAudio && !sharedAudio._gainConnected) {
    try {
      const source = audioCtx.createMediaElementSource(sharedAudio);
      source.connect(globalGainNode);
      sharedAudio._gainConnected = true;
      sharedAudio.addEventListener("play", () => {
        if (audioCtx.state === "suspended") audioCtx.resume();
      });
    } catch (e) {
      console.warn("sharedAudio already connected:", e);
    }
  }

  // ===== 4. Отображение громкости =====
  function updateVolumeText() {
    const display = document.getElementById("volumeDisplay");
    if (display) display.textContent = `${Math.round(globalGainNode.gain.value * 100)}%`;
  }

  const wrapper = document.querySelector(".title-with-visualizer");
  if (wrapper) {
    wrapper.addEventListener("wheel", (e) => {
      e.preventDefault();
      if (audioCtx.state === "suspended") audioCtx.resume();
      let current = globalGainNode.gain.value;
      current = Math.min(1, Math.max(0, current + (e.deltaY < 0 ? 0.05 : -0.05)));
      globalGainNode.gain.value = current;
      updateVolumeText();
    });

    wrapper.addEventListener("mouseenter", () => {
      document.getElementById("volumeDisplay")?.style.setProperty("display", "inline");
      document.getElementById("volumeHint")?.style.setProperty("display", "none");
    });

    wrapper.addEventListener("mouseleave", () => {
      document.getElementById("volumeDisplay")?.style.setProperty("display", "none");
      document.getElementById("volumeHint")?.style.setProperty("display", "inline");
    });
  }

  updateVolumeText();

  // ===== 5. Счётчик символов =====
  const textarea = document.getElementById("mainTextarea");
  const barFill = document.querySelector(".bar-fill");
  const remainingSpan = document.getElementById("remaining");
  const LIMIT = 5000;

  if (textarea && barFill && remainingSpan) {
    function updateCounter() {
      const length = textarea.value.length;
      const remaining = LIMIT - length;
      remainingSpan.textContent = `${remaining}/${LIMIT}`;
      let percent = (length / LIMIT) * 100;
      barFill.style.width = `${Math.max(0, Math.min(percent, 100))}%`;
      barFill.classList.toggle("over-limit", length > LIMIT);
    }

    textarea.addEventListener("input", updateCounter);
    textarea.addEventListener("keyup", updateCounter);
    document.getElementById("clearTextareaBtn")?.addEventListener("click", () => {
      textarea.value = "";
      updateCounter();
    });

    updateCounter();
  }
});

// ===== 6. Видеоурок по кнопке TV =====
const tvBtn = document.getElementById("visualizerBtn");
const cardFront = document.querySelector(".card-front");
const cardBack = document.querySelector(".card-back");
const iframe = document.getElementById("ytIframe");
const closeBtn = document.getElementById("closeVideoBtn");
const historyWrapper = document.getElementById("historyListWrapper");
const formBlock = document.getElementById("formBlock");
const videoUrl = "https://www.youtube.com/embed/KvZwn4RP6TY?start=78&autoplay=1";
const iconPanel = document.getElementById("iconPanel");

if (tvBtn && cardFront && cardBack && iframe && closeBtn) {
  tvBtn.addEventListener("click", () => {
    cardFront.style.display = "none";
    cardBack.style.display = "flex";
    iframe.src = videoUrl;
    if (historyWrapper) historyWrapper.style.display = "none";
if (iconPanel) iconPanel.style.setProperty("display", "none", "important");


  });

  closeBtn.addEventListener("click", () => {
    iframe.src = "";
    cardBack.style.display = "none";
    cardFront.style.display = "block";
    if (historyWrapper) historyWrapper.style.display = "block";
if (iconPanel) iconPanel.style.setProperty("display", "block", "important");

    
  });
}
const txtInput = document.getElementById("txtInput");
const txtUploadBtn = document.getElementById("txtUploadBtn");
const textarea = document.getElementById("mainTextarea");

if (txtUploadBtn && txtInput && textarea) {
  txtUploadBtn.addEventListener("click", () => {
    txtInput.click();
  });

  txtInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file || !file.name.endsWith(".txt")) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      textarea.value = e.target.result;
      textarea.dispatchEvent(new Event("input")); // чтобы обновился счётчик
    };
    reader.readAsText(file);
  });
}
const favKey = "ttsFavorites";

function rebuildVoiceList() {
  const container = document.querySelector(".custom-options");
  if (!container) return;

  const favList = JSON.parse(localStorage.getItem(favKey) || "[]");

  const options = Array.from(container.querySelectorAll(".custom-option"))
    .filter(opt => !opt.classList.contains("disabled-group"));

  const all = options.map(opt => {
    const fav = opt.querySelector(".voice-fav");
    const id = fav?.dataset?.id;
    return { el: opt, id };
  });

  const favorites = [];
  const others = [];

  all.forEach(({ el, id }) => {
    if (id && favList.includes(id)) {
      favorites.push(el);
    } else {
      others.push(el);
    }
  });

  container.innerHTML = "";

  if (favorites.length > 0) {
    const favTitle = document.createElement("div");
    favTitle.className = "custom-option disabled-group";
    favTitle.textContent = "⭐ Избранные";
    container.appendChild(favTitle);
    favorites.forEach(opt => container.appendChild(opt));
  }

  if (others.length > 0) {
    const allTitle = document.createElement("div");
    allTitle.className = "custom-option disabled-group";
    allTitle.textContent = "Все голоса";
    container.appendChild(allTitle);
    others.forEach(opt => container.appendChild(opt));
  }

  container.querySelectorAll(".voice-fav").forEach(star => {
    const voiceId = star.dataset.id;
    const favs = JSON.parse(localStorage.getItem(favKey) || "[]");

    star.classList.toggle("active", favs.includes(voiceId));

    star.onclick = (e) => {
      e.stopPropagation();
      let updated = JSON.parse(localStorage.getItem(favKey) || "[]");
      if (updated.includes(voiceId)) {
        updated = updated.filter(v => v !== voiceId);
      } else {
        updated.push(voiceId);
      }
      localStorage.setItem(favKey, JSON.stringify(updated));
      rebuildVoiceList();
    };
  });
}

rebuildVoiceList();
document.addEventListener("DOMContentLoaded", () => {
  const heart = document.querySelector('.like-heart');
  const plus = document.querySelector('.like-plus');
  const counter = document.querySelector('.like-counter');

  let likes = 0;

  const storageKey = 'tts-like-sent';

  // Проверяем: лайк уже поставлен?
  if (localStorage.getItem(storageKey)) {
    heart.classList.add('liked');
    counter.textContent = '1';
    heart.style.opacity = '0.5';
    heart.style.pointerEvents = 'none';
    return;
  }

  heart.addEventListener('click', () => {
    // Не даём лайкать повторно
    if (localStorage.getItem(storageKey)) return;

    likes += 1;
    counter.textContent = likes;

    // Анимация +1
    plus.style.opacity = '1';
    plus.style.transform = 'translateY(-8px)';

    setTimeout(() => {
      plus.style.opacity = '0';
      plus.style.transform = 'translateY(0)';
    }, 600);

    // Запоминаем, что лайк уже был
    localStorage.setItem(storageKey, 'true');

    // Визуально выключаем сердечко
    heart.classList.add('liked');
    heart.style.opacity = '0.5';
    heart.style.pointerEvents = 'none';
  });
});

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll('[data-modal]').forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const modalId = link.getAttribute("data-modal");
      const modal = document.getElementById(modalId);
      if (modal) modal.style.display = "flex";
    });
  });

  document.querySelectorAll('.glass-modal .close-btn').forEach(btn => {
    btn.addEventListener("click", () => {
      btn.closest('.glass-modal').style.display = "none";
    });
  });

  document.querySelectorAll('.glass-modal').forEach(modal => {
    modal.addEventListener("click", e => {
      if (e.target === modal) modal.style.display = "none";
    });
  });
});
function toggleFooterPanel() {
  const panel = document.getElementById('footerMenu');
  if (panel) panel.classList.toggle('mobile-hidden');
}
document.querySelectorAll('.card').forEach(el => {
  el.style.background = 'rgba(15, 0, 30, 0.85)';
});


