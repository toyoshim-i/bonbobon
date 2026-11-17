// ============================================================================
// INTERNATIONALIZATION (i18n) CORE MODULE
// ============================================================================
(function () {
  const STORAGE_KEY = "bonbobon_lang";
  const dictionaries = {};
  const listeners = new Set();

  function detectInitialLang() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && dictionaries[saved]) return saved;
      if (saved === "ja" || saved === "en") return saved;
    } catch (_) {}
    return "ja";
  }

  const I18N = {
    lang: detectInitialLang(),
    fallbackLang: "ja",

    register(lang, dict) {
      dictionaries[lang] = Object.assign(dictionaries[lang] || {}, dict);
    },

    getAvailableLanguages() {
      return Object.keys(dictionaries);
    },

    getLang() {
      return this.lang;
    },

    t(key, params) {
      const dict = dictionaries[this.lang] || {};
      const fallback = dictionaries[this.fallbackLang] || {};
      let str = dict[key];
      if (str === undefined) str = fallback[key];
      if (str === undefined) return key;
      if (params && typeof str === "string") {
        for (const k of Object.keys(params)) {
          str = str.replaceAll(`{${k}}`, String(params[k]));
        }
      }
      return str;
    },

    setLang(lang) {
      if (!dictionaries[lang] && lang !== "ja" && lang !== "en") return;
      this.lang = lang;
      try {
        localStorage.setItem(STORAGE_KEY, lang);
      } catch (_) {}
      this.applyDom();
      for (const cb of listeners) {
        try { cb(lang); } catch (_) {}
      }
    },

    toggleLang() {
      const langs = this.getAvailableLanguages();
      if (langs.length <= 1) return this.lang;
      const idx = langs.indexOf(this.lang);
      const next = langs[(idx + 1) % langs.length];
      this.setLang(next);
      return next;
    },

    onChange(cb) {
      if (typeof cb === "function") listeners.add(cb);
    },

    applyDom(root = document) {
      if (typeof document === "undefined") return;
      document.documentElement.lang = this.lang;
      const docTitle = this.t("app.docTitle");
      if (docTitle && docTitle !== "app.docTitle") {
        document.title = docTitle;
      }

      root.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (key) el.textContent = this.t(key);
      });

      root.querySelectorAll("[data-i18n-html]").forEach(el => {
        const key = el.getAttribute("data-i18n-html");
        if (key) el.innerHTML = this.t(key);
      });

      root.querySelectorAll("[data-i18n-title]").forEach(el => {
        const key = el.getAttribute("data-i18n-title");
        if (key) el.setAttribute("title", this.t(key));
      });

      root.querySelectorAll("[data-i18n-alt]").forEach(el => {
        const key = el.getAttribute("data-i18n-alt");
        if (key) el.setAttribute("alt", this.t(key));
      });

      root.querySelectorAll("[data-i18n-src-ja]").forEach(el => {
        const jaSrc = el.getAttribute("data-i18n-src-ja");
        const langSrc = el.getAttribute(`data-i18n-src-${this.lang}`) || jaSrc;
        if (!langSrc) return;
        if (langSrc !== jaSrc) {
          el.onerror = () => {
            el.onerror = null;
            if (el.getAttribute("src") !== jaSrc) el.src = jaSrc;
          };
        } else {
          el.onerror = null;
        }
        if (el.getAttribute("src") !== langSrc) {
          el.src = langSrc;
        }
      });
    }
  };

  window.I18N = I18N;
  window.t = (key, params) => I18N.t(key, params);
})();
