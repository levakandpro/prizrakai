// static/js/lang-switcher.js

const dictionary = {
  "PRIZRAK – AI Озвучка":                "PRIZRAK – AI TTS",
  "Создавай озвучку мирового уровня — выбери голос, вбей текст и скачай результат. Быстро. Красиво. AI.":
                                         "Create world-class voiceovers—pick a voice, enter text and download. Fast. Stylish. AI.",
  "Призрак":                              "Ghost",
  "Озвучка...":                           "Voicing…",
  "👻 Бууу! Твоё аудио готово!":          "👻 Boo! Your audio is ready!",
  "Загрузить .txt":                       "Upload .txt",
  "Загрузить текст":                      "Upload text",
  "Сменить язык":                         "Toggle language",
  "Язык":                                 "Language",
  "Напишите, что озвучить...":            "Type what to speak...",
  "Осталось:":                            "Remaining:",
  "/5000":                                "/5000",
  "⚠️ Слишком много текста! Укороти, чтобы продолжить.":
                                         "⚠️ Too much text! Shorten to continue.",
  "ВЫБЕРИТЕ ГОЛОС":                       "CHOOSE VOICE",
  "ОЗВУЧИТЬ":                             "SPEAK",
  "История":                              "HISTORY",
  "Очистить историю":                     "Clear history",
  "Скачать всё":                         "Download all",
  "Сгенерировано раз: 678":               "Generated: 678",
  "FAQ — Часто задаваемые вопросы":       "FAQ — Frequently Asked Questions",
  "Как работает LEVAKAND TTS Studio?":    "How does LEVAKAND TTS Studio work?",
  "Вы вводите текст, выбираете голос — и система создаёт MP3-файл...":
                                         "You enter text, choose a voice—and the system creates an MP3...",
  "Выбор языка / Language":               "Language Selection / Выбор языка"
  // …добавьте остальные ключи, которые используются в data-i18n
};

let currentLang = "ru";

function applyRu() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const ru = el.getAttribute("data-i18n");
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.hasAttribute("placeholder")) {
      el.placeholder = ru;
    } else {
      el.textContent = ru;
    }
  });
}

function applyEn() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const ruKey = el.getAttribute("data-i18n");
    const en = dictionary[ruKey] || ruKey;
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.hasAttribute("placeholder")) {
      el.placeholder = en;
    } else {
      el.textContent = en;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("langToggleBtn");

  applyRu();
  toggleBtn.classList.remove("active");

  toggleBtn.addEventListener("click", () => {
    if (currentLang === "ru") {
      currentLang = "en";
      applyEn();
      toggleBtn.classList.add("active");
    } else {
      currentLang = "ru";
      applyRu();
      toggleBtn.classList.remove("active");
    }
  });
});

console.log("lang-switcher.js запущен");
