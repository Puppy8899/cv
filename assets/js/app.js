(function () {
  function normalizeLang(lang) {
    return lang && String(lang).toLowerCase() === 'ru' ? 'ru' : 'en';
  }

  var currentLang = 'ru';
  try { currentLang = normalizeLang(localStorage.getItem('lang') || 'ru'); } catch (e) { }

  var SECTION_H2_RULES = [
    { re: /^About$/i, id: 'about' },
    { re: /^Обо мне$/i, id: 'about' },
    { re: /^Articles$/i, id: 'articles' },
    { re: /^Публикации$/i, id: 'articles' },
    { re: /^Дипломы и Сертификаты$/i, id: 'certificates' },
    { re: /^Diplomas and Certificates$/i, id: 'certificates' }
  ];

  var CONTENT_VERSION = '4';

  var meta = {
    ru: {
      title: 'Ваганова Ольга',
      authorName: 'Ваганова Ольга',
      authorBio: 'Студент 4-го курса СПбПУ, ГИ. Зарубежное регионоведение.',
      langToggle: 'English version',
      sectionNav: { about: 'Обо мне', articles: 'Публикации', certificates: 'Дипломы и Сертификаты' },
      navToggleLabel: 'Меню'
    },
    en: {
      title: 'Olga Vaganova',
      authorName: 'Olga Vaganova',
      authorBio: '4th-year student, SPbPU, Institute of Humanities. Foreign Regional Studies.',
      langToggle: 'Версия на русском',
      sectionNav: { about: 'About', articles: 'Articles', certificates: 'Diplomas and Certificates' },
      navToggleLabel: 'Menu'
    }
  };

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function updateUI() {
    var m = meta[currentLang];
    document.title = m.title;
    document.documentElement.lang = currentLang;
    setText('site-title', m.title);
    setText('author-name', m.authorName);
    setText('author-bio', m.authorBio);
    setText('lang-toggle', m.langToggle);
    setText('footer-name', m.authorName);
    Object.keys(m.sectionNav).forEach(function (id) {
      setText('nav-link-' + id, m.sectionNav[id]);
    });
    var navToggle = document.getElementById('nav-toggle');
    if (navToggle) navToggle.setAttribute('aria-label', m.navToggleLabel);
  }

  function closeMobileNav() {
    var sectionNav = document.getElementById('section-nav');
    var navToggle = document.getElementById('nav-toggle');
    if (sectionNav) sectionNav.classList.remove('is-open');
    if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
  }

  function assignSectionIds(root) {
    root.querySelectorAll('h2').forEach(function (h2) {
      var text = h2.textContent.trim();
      for (var i = 0; i < SECTION_H2_RULES.length; i++) {
        if (SECTION_H2_RULES[i].re.test(text)) {
          h2.id = SECTION_H2_RULES[i].id;
          return;
        }
      }
    });
  }

  var revealObserver = null;

  function initReveal(root) {
    if (revealObserver) revealObserver.disconnect();
    if (!('IntersectionObserver' in window) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    document.documentElement.classList.add('js-anim');
    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    Array.prototype.forEach.call(root.children, function (el) {
      el.classList.add('reveal');
      revealObserver.observe(el);
    });
  }

  function initScrollSpy() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.section-nav__link'));
    var items = [];
    links.forEach(function (a) {
      var id = a.id === 'nav-link-about' ? 'about' : (a.getAttribute('href') || '').replace(/^#/, '');
      var el = id && document.getElementById(id);
      if (el) items.push({ link: a, el: el });
    });
    var current = null;
    function onScroll() {
      var active = null;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var progress = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      var line = window.innerHeight * (0.35 + 0.65 * progress * progress);
      items.forEach(function (it) {
        if (it.el.getBoundingClientRect().top <= line) active = it;
      });
      var activeLink = active && active.link;
      if (activeLink === current) return;
      current = activeLink;
      links.forEach(function (a) {
        a.classList.toggle('is-active', a === activeLink);
      });
    }
    if (window._spyHandler) window.removeEventListener('scroll', window._spyHandler);
    window._spyHandler = onScroll;
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function renderMarkdown(html) {
    var root = document.getElementById('markdown-root');
    if (!root) return;
    root.innerHTML = html;
    assignSectionIds(root);
    initReveal(root);
    initScrollSpy();
    root.classList.remove('is-switching');
  }

  function loadContent() {
    var path = 'content/' + currentLang + '.md?v=' + CONTENT_VERSION;
    fetch(path)
      .then(function (r) {
        if (!r.ok) throw new Error('Failed to load ' + path);
        return r.text();
      })
      .then(function (md) {
        if (typeof marked !== 'undefined') {
          marked.setOptions({ gfm: true });
          renderMarkdown(marked.parse(md));
        } else {
          renderMarkdown('<pre>' + md.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</pre>');
        }
      })
      .catch(function (err) {
        var root = document.getElementById('markdown-root');
        if (root) {
          root.innerHTML = '<p>Не удалось загрузить :(</p>';
          root.classList.remove('is-switching');
        }
        console.error(err);
      });
  }

  function toggleLanguage() {
    currentLang = currentLang === 'ru' ? 'en' : 'ru';
    try { localStorage.setItem('lang', currentLang); } catch (e) { }
    updateUI();
    var root = document.getElementById('markdown-root');
    if (root) root.classList.add('is-switching');
    setTimeout(loadContent, 180);
  }

  function init() {
    updateUI();
    loadContent();
    setText('year', new Date().getFullYear());

    var bar = document.createElement('div');
    bar.className = 'scroll-progress';
    document.body.appendChild(bar);
    window.addEventListener('scroll', function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? window.scrollY / max : 0) + ')';
    }, { passive: true });

    var followBtn = document.querySelector('.author__urls-btn');
    var urlsList = document.querySelector('.author__urls');
    if (followBtn && urlsList) {
      if (window.matchMedia('(max-width: 924px)').matches) urlsList.setAttribute('hidden', '');
      followBtn.addEventListener('click', function () {
        if (urlsList.hasAttribute('hidden')) urlsList.removeAttribute('hidden');
        else urlsList.setAttribute('hidden', '');
      });
    }

    var langBtn = document.getElementById('lang-toggle');
    if (langBtn) langBtn.addEventListener('click', toggleLanguage);

    var navToggle = document.getElementById('nav-toggle');
    var sectionNav = document.getElementById('section-nav');
    if (navToggle && sectionNav) {
      navToggle.addEventListener('click', function () {
        var open = sectionNav.classList.toggle('is-open');
        navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      window.matchMedia('(min-width: 925px)').addEventListener('change', function (e) {
        if (e.matches) closeMobileNav();
      });
    }

    var aboutNav = document.getElementById('nav-link-about');
    if (aboutNav) {
      aboutNav.addEventListener('click', function (e) {
        e.preventDefault();
        closeMobileNav();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, '', window.location.pathname + (window.location.search || ''));
        }
      });
    }

    document.querySelectorAll('.section-nav__link').forEach(function (link) {
      if (link.id === 'nav-link-about') return;
      link.addEventListener('click', function (e) {
        closeMobileNav();
        var href = link.getAttribute('href');
        if (href && href.indexOf('#') === 0 && href.length > 1) {
          var target = document.getElementById(href.slice(1));
          if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
