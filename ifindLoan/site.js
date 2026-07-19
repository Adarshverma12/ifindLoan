/* iFindLoan — site behaviour (vanilla, deferred, no dependencies) */
(function () {
  "use strict";

  /* ---- mobile menu ---- */
  var burger = document.getElementById("hamburger");
  var menu = document.getElementById("mobileMenu");
  if (burger && menu) {
    menu.setAttribute("aria-hidden", "true");
    Array.prototype.forEach.call(burger.querySelectorAll("span"), function (s) {
      s.setAttribute("aria-hidden", "true");
    });
    function setMenu(open) {
      menu.style.display = open ? "flex" : "none";
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      burger.classList.toggle("is-open", open);
      menu.setAttribute("aria-hidden", String(!open));
      document.body.classList.toggle("nav-open", open);
    }
    burger.addEventListener("click", function () {
      setMenu(menu.style.display !== "flex");
    });
    menu.addEventListener("click", function (e) {
      if (e.target.tagName === "A") { setMenu(false); }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.style.display === "flex") {
        setMenu(false);
        burger.focus();
      }
    });
  }

  /* ---- sticky header elevation on scroll ---- */
  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---- soft scroll for same-page hash buttons/links ----
     Mobile: slower custom ease (~1.5s). Desktop: native smooth. */
  var prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mobileScrollMq = window.matchMedia ? window.matchMedia("(max-width: 860px)") : null;
  var mobileScrollRaf = 0;

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function isMobileViewport() {
    return !!(mobileScrollMq && mobileScrollMq.matches);
  }

  function slowScrollTo(target) {
    var headerEl = document.querySelector(".site-header");
    var offset = headerEl ? Math.ceil(headerEl.getBoundingClientRect().height) + 8 : 72;
    var end = Math.max(0, Math.round((window.pageYOffset || window.scrollY || 0) + target.getBoundingClientRect().top - offset));
    var start = window.pageYOffset || window.scrollY || 0;
    var dist = end - start;
    if (Math.abs(dist) < 2) return;
    var duration = 1500;
    var t0 = null;
    if (mobileScrollRaf) cancelAnimationFrame(mobileScrollRaf);
    /* Force instant programmatic steps so CSS smooth does not accelerate them */
    var root = document.documentElement;
    var prevBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    function step(now) {
      if (t0 == null) t0 = now;
      var p = Math.min(1, (now - t0) / duration);
      var y = start + dist * easeInOutCubic(p);
      window.scrollTo(0, y);
      if (p < 1) {
        mobileScrollRaf = requestAnimationFrame(step);
      } else {
        mobileScrollRaf = 0;
        root.style.scrollBehavior = prevBehavior;
      }
    }
    mobileScrollRaf = requestAnimationFrame(step);
  }

  document.addEventListener("click", function (e) {
    var link = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!link) return;
    var href = link.getAttribute("href");
    if (!href || href === "#") return;
    var id = decodeURIComponent(href.slice(1));
    if (!id) return;
    var target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    e.stopPropagation();
    if (prefersReducedMotion) {
      target.scrollIntoView({ behavior: "auto", block: "start" });
    } else if (isMobileViewport()) {
      slowScrollTo(target);
    } else {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (history.pushState) {
      try { history.pushState(null, "", href); } catch (err) { /* ignore */ }
    }
  }, true);

  /* ---- decorative SVGs: hide from AT when not already labeled ---- */
  document.querySelectorAll("svg").forEach(function (svg) {
    if (svg.hasAttribute("aria-hidden") || svg.hasAttribute("aria-label") || svg.getAttribute("role") === "img") {
      return;
    }
    var parent = svg.parentElement;
    if (parent && (parent.getAttribute("aria-hidden") === "true" || parent.getAttribute("aria-label"))) {
      return;
    }
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
  });

  /* ---- scroll reveals (stagger siblings for polish) ---- */
  var reveal = document.querySelectorAll(".rv");
  if ("IntersectionObserver" in window && reveal.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        var siblings = el.parentElement ? el.parentElement.querySelectorAll(":scope > .rv") : [];
        var idx = Array.prototype.indexOf.call(siblings, el);
        var delay = idx > -1 ? Math.min(idx * 70, 280) : 0;
        if (delay) el.style.transitionDelay = delay + "ms";
        el.classList.add("in");
        io.unobserve(el);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -24px 0px" });
    reveal.forEach(function (el) { io.observe(el); });
    /* Reveal anything already in the first viewport without waiting for scroll */
    requestAnimationFrame(function () {
      var vh = window.innerHeight || 800;
      reveal.forEach(function (el) {
        if (el.classList.contains("in")) return;
        var r = el.getBoundingClientRect();
        if (r.top < vh * 0.92 && r.bottom > 0) {
          el.classList.add("in");
          io.unobserve(el);
        }
      });
    });
  } else {
    reveal.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---- sticky mobile CTA: show after hero/form (home) or page-hero/aside (interior) leave view ---- */
  var sticky = document.getElementById("stickyCta");
  if (sticky && "IntersectionObserver" in window) {
    sticky.style.opacity = "0";
    sticky.style.pointerEvents = "none";
    sticky.setAttribute("aria-hidden", "true");

    var hero = document.querySelector(".hero");
    var formCard = document.querySelector(".hero .form-card") || document.getElementById("loan-funnel");
    var pageHero = document.querySelector(".page-hero");
    var asideCard = document.querySelector(".aside .form-card");

    if (hero) {
      var heroVisible = true;
      var formVisible = true;
      function syncStickyHome() {
        var hide = heroVisible || formVisible;
        sticky.style.opacity = hide ? "0" : "1";
        sticky.style.pointerEvents = hide ? "none" : "auto";
        sticky.setAttribute("aria-hidden", String(hide));
      }
      var soHome = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.target === hero) heroVisible = en.isIntersecting;
          else formVisible = en.isIntersecting;
        });
        syncStickyHome();
      }, { threshold: 0, rootMargin: "0px 0px -8% 0px" });
      soHome.observe(hero);
      if (formCard && formCard !== hero) soHome.observe(formCard);
    } else if (pageHero) {
      var topVisible = true;
      var asideVisible = false;
      function syncStickyInterior() {
        var hide = topVisible || asideVisible;
        sticky.style.opacity = hide ? "0" : "1";
        sticky.style.pointerEvents = hide ? "none" : "auto";
        sticky.setAttribute("aria-hidden", String(hide));
      }
      var soIn = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.target === pageHero) topVisible = en.isIntersecting;
          else if (asideCard && en.target === asideCard) asideVisible = en.isIntersecting;
        });
        syncStickyInterior();
      }, { threshold: 0, rootMargin: "0px 0px -12% 0px" });
      soIn.observe(pageHero);
      if (asideCard) soIn.observe(asideCard);
    }
  }

  /* ---- EPC funnel: skeleton ready + content-hugging height + ring clearance ---- */
  var funnel = document.getElementById("loan-funnel");
  if (funnel) {
    var syncedH = 0;
    var syncRaf = 0;
    var syncing = false;

    var markReady = function () {
      var kids = funnel.children;
      var hasReal = false;
      for (var i = 0; i < kids.length; i++) {
        if (!kids[i].classList.contains("form-skeleton")) {
          hasReal = true;
          break;
        }
      }
      if (
        hasReal ||
        funnel.querySelector("epc-funnel, .EPC-FUNNEL, iframe, form, input, button, select")
      ) {
        funnel.classList.add("is-ready");
      }
    };

    /* Shadow styles: ring clearance only. No min-height floors (those caused
       empty space on mobile start and after Back). Never hide APR/legal copy. */
    var injectShadowStyles = function (host) {
      if (!host || !host.shadowRoot) return false;
      var root = host.shadowRoot;
      var style = root.getElementById("ifind-stable-floor");
      if (!style) {
        style = document.createElement("style");
        style.id = "ifind-stable-floor";
        root.appendChild(style);
      }
      style.textContent =
        ":host{display:block!important;box-sizing:border-box!important;min-height:0!important}" +
        "#epc-root,#epc-root > .flex{box-sizing:border-box!important;min-height:0!important}" +
        "section[data-step]{box-sizing:border-box!important;min-height:0!important;" +
        "padding-top:5.75rem!important;padding-bottom:0.25rem!important}" +
        "section[data-step] > div.absolute[class*=\"-top-\"]{top:-3.75rem!important}" +
        "@media (max-width:640px){" +
        "section[data-step]{padding-top:5.5rem!important;padding-bottom:0.35rem!important}" +
        "}";
      return true;
    };

    /* Hug current step height (up AND down) so Back never leaves a hollow gap.
       Prefer host height — measuring the mount while min-height is set can stick tall. */
    var syncMountHeight = function () {
      var host = funnel.querySelector("epc-funnel, .EPC-FUNNEL");
      if (host) injectShadowStyles(host);

      syncing = true;
      var prev = funnel.style.minHeight;
      funnel.style.minHeight = "0px";
      /* force layout so shrink is measurable this frame */
      void funnel.offsetHeight;
      var hostH = host ? Math.ceil(host.getBoundingClientRect().height) : 0;
      var h = hostH > 0 ? hostH : Math.ceil(funnel.getBoundingClientRect().height);
      if (h < 120) {
        funnel.style.minHeight = prev || "0px";
        syncing = false;
        return;
      }
      if (Math.abs(h - syncedH) > 1) syncedH = h;
      funnel.style.minHeight = syncedH + "px";
      requestAnimationFrame(function () { syncing = false; });
    };

    var scheduleSync = function () {
      if (syncing) return;
      if (syncRaf) cancelAnimationFrame(syncRaf);
      syncRaf = requestAnimationFrame(function () {
        syncRaf = 0;
        markReady();
        syncMountHeight();
      });
    };

    markReady();
    scheduleSync();

    if ("MutationObserver" in window) {
      var mo = new MutationObserver(function () { scheduleSync(); });
      mo.observe(funnel, { childList: true, subtree: true, attributes: true });
    }

    if ("ResizeObserver" in window) {
      var ro = new ResizeObserver(function () {
        if (!syncing) scheduleSync();
      });
      ro.observe(funnel);
      var watchHost = function () {
        var host = funnel.querySelector("epc-funnel, .EPC-FUNNEL");
        if (host) {
          try { ro.observe(host); } catch (e) { /* ignore */ }
          injectShadowStyles(host);
          return true;
        }
        return false;
      };
      if (!watchHost()) {
        var hostMo = new MutationObserver(function () {
          if (watchHost()) hostMo.disconnect();
        });
        hostMo.observe(funnel, { childList: true, subtree: true });
      }
    }

    funnel.addEventListener("click", scheduleSync, true);
    funnel.addEventListener("input", scheduleSync, true);
    funnel.addEventListener("change", scheduleSync, true);
  }

  /* ---- mailto / simple forms: validation UX ---- */
  document.querySelectorAll("form.simple-form").forEach(function (form) {
    var status = form.querySelector(".form-status");
    if (!status) {
      status = document.createElement("p");
      status.className = "form-status";
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      form.appendChild(status);
    }
    form.addEventListener("submit", function (e) {
      status.textContent = "";
      status.classList.remove("is-error", "is-ok");
      if (!form.checkValidity()) {
        e.preventDefault();
        status.textContent = "Please fill in all required fields correctly.";
        status.classList.add("is-error");
        var invalid = form.querySelector(":invalid");
        if (invalid) invalid.focus();
        return;
      }
      status.textContent = "Opening your email app…";
      status.classList.add("is-ok");
    });
  });

  /* ---- FAQ: only one open at a time ---- */
  var faqRoot = document.querySelector(".faq");
  if (faqRoot) {
    faqRoot.addEventListener("toggle", function (e) {
      var t = e.target;
      if (t.tagName !== "DETAILS" || !t.open) return;
      faqRoot.querySelectorAll("details[open]").forEach(function (d) {
        if (d !== t) d.open = false;
      });
    }, true);
  }

  /* ---- mark current nav link for interior pages ---- */
  try {
    var path = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    if (!path || path === "") path = "index.html";
    document.querySelectorAll(".nav-links a, .mobile-menu a").forEach(function (a) {
      var href = (a.getAttribute("href") || "").split("#")[0].toLowerCase();
      if (href && href === path) a.setAttribute("aria-current", "page");
    });
  } catch (err) { /* ignore */ }

  /* ---- copyright year ---- */
  var yr = document.getElementById("yr");
  if (yr) yr.textContent = new Date().getFullYear();

  /* ---- Page modals: footer content pages (keep SEO URLs intact) ---- */
  (function initPageModals() {
    var MODAL_PAGES = {
      "how-it-works.html": "How It Works",
      "about-us.html": "About Us",
      "why-choose-us.html": "Why Choose Us",
      "questions.html": "Questions",
      "definitions.html": "Definitions",
      "rates-fees.html": "Rates & Fees",
      "unsubscribe.html": "Unsubscribe",
      "contact.html": "Contact",
      "privacy-policy.html": "Privacy Policy",
      "terms-of-use.html": "Terms of Use",
      "disclaimer.html": "Disclaimer",
      "advertising-disclosure.html": "Advertising Disclosure",
      "do-not-sell-my-info.html": "Do Not Sell My Info"
    };

    var cache = {};
    var open = false;
    var lastFocus = null;
    var modal = null;
    var titleEl = null;
    var bodyEl = null;
    var dialogEl = null;
    var closeBtn = null;

    function modalFile(href) {
      if (!href) return null;
      var clean = String(href).split("#")[0].split("?")[0];
      var file = clean.split("/").pop();
      if (!file) return null;
      file = file.toLowerCase();
      return MODAL_PAGES.hasOwnProperty(file) ? file : null;
    }

    function ensureModal() {
      if (modal) return modal;
      modal = document.createElement("div");
      modal.id = "pageModal";
      modal.className = "legal-modal";
      modal.hidden = true;
      modal.setAttribute("aria-hidden", "true");
      modal.innerHTML =
        '<div class="legal-modal__backdrop" data-modal-close tabindex="-1"></div>' +
        '<div class="legal-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="pageModalTitle" tabindex="-1">' +
          '<div class="legal-modal__header">' +
            '<h2 id="pageModalTitle" class="legal-modal__title"></h2>' +
            '<button type="button" class="legal-modal__close" data-modal-close aria-label="Close dialog">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18"></path></svg>' +
            "</button>" +
          "</div>" +
          '<div class="legal-modal__body prose" id="pageModalBody"></div>' +
        "</div>";
      document.body.appendChild(modal);
      titleEl = document.getElementById("pageModalTitle");
      bodyEl = document.getElementById("pageModalBody");
      dialogEl = modal.querySelector(".legal-modal__dialog");
      closeBtn = modal.querySelector(".legal-modal__close");

      modal.addEventListener("click", function (e) {
        var closer = e.target.closest ? e.target.closest("[data-modal-close]") : null;
        if (closer) {
          e.preventDefault();
          e.stopPropagation();
          closeModal();
        }
      });

      if (closeBtn) {
        closeBtn.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          closeModal();
        });
      }

      bodyEl.addEventListener("click", function (e) {
        var a = e.target.closest ? e.target.closest("a") : null;
        if (!a) return;
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        var file = modalFile(a.getAttribute("href"));
        if (!file) return;
        e.preventDefault();
        openPage(file, a.getAttribute("href"));
      });

      return modal;
    }

    function getFocusable() {
      if (!dialogEl) return [];
      return Array.prototype.slice.call(
        dialogEl.querySelectorAll(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
      ).filter(function (el) {
        return !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true";
      });
    }

    function onKeydown(e) {
      if (!open) return;
      if (e.key === "Escape" || e.key === "Esc") {
        e.preventDefault();
        closeModal();
        return;
      }
      if (e.key !== "Tab") return;
      var nodes = getFocusable();
      if (!nodes.length) return;
      var first = nodes[0];
      var last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    function closeModal() {
      if (!modal) return;
      open = false;
      modal.hidden = true;
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("legal-modal-open");
      document.removeEventListener("keydown", onKeydown, true);
      if (lastFocus && typeof lastFocus.focus === "function") {
        try { lastFocus.focus(); } catch (err) { /* ignore */ }
      }
      lastFocus = null;
    }

    function parsePageHtml(html, file) {
      var doc = new DOMParser().parseFromString(html, "text/html");
      var prose = doc.querySelector(".prose.wide") || doc.querySelector(".prose") || doc.querySelector("main #main .section .wrap") || doc.querySelector("main");
      return {
        title: MODAL_PAGES[file] || "Details",
        html: prose ? prose.innerHTML : "<p>Unable to load this document.</p>"
      };
    }

    function loadPage(file) {
      if (cache[file]) return Promise.resolve(cache[file]);

      var pathFile = (location.pathname.split("/").pop() || "").toLowerCase();
      if (!pathFile || pathFile === "") pathFile = "index.html";
      if (pathFile === file) {
        var live = document.querySelector(".prose.wide") || document.querySelector(".prose");
        if (live) {
          cache[file] = {
            title: MODAL_PAGES[file],
            html: live.innerHTML
          };
          return Promise.resolve(cache[file]);
        }
      }

      return fetch(file, { credentials: "same-origin" })
        .then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res.text();
        })
        .then(function (html) {
          cache[file] = parsePageHtml(html, file);
          return cache[file];
        });
    }

    function bindModalForms() {
      var forms = bodyEl.querySelectorAll("form.simple-form");
      Array.prototype.forEach.call(forms, function (form) {
        if (form.getAttribute("data-modal-bound")) return;
        form.setAttribute("data-modal-bound", "1");
        var status = form.querySelector(".form-status");
        if (!status) {
          status = document.createElement("p");
          status.className = "form-status";
          status.setAttribute("role", "status");
          status.setAttribute("aria-live", "polite");
          form.appendChild(status);
        }
        form.addEventListener("submit", function (e) {
          status.textContent = "";
          status.classList.remove("is-error", "is-ok");
          if (!form.checkValidity()) {
            e.preventDefault();
            status.textContent = "Please complete the required fields.";
            status.classList.add("is-error");
            var bad = form.querySelector(":invalid");
            if (bad) bad.focus();
          } else {
            status.textContent = "Opening your email app…";
            status.classList.add("is-ok");
          }
        });
      });
    }

    function openPage(file) {
      ensureModal();
      lastFocus = document.activeElement;
      titleEl.textContent = MODAL_PAGES[file] || "Details";
      bodyEl.innerHTML = '<p class="legal-modal__loading">Loading…</p>';
      modal.hidden = false;
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("legal-modal-open");
      open = true;
      document.addEventListener("keydown", onKeydown, true);
      if (closeBtn) closeBtn.focus();
      else if (dialogEl) dialogEl.focus();

      loadPage(file)
        .then(function (doc) {
          if (!open) return;
          titleEl.textContent = doc.title;
          bodyEl.innerHTML = doc.html;
          bindModalForms();
          bodyEl.scrollTop = 0;
          if (closeBtn) closeBtn.focus();
        })
        .catch(function () {
          closeModal();
          window.location.href = file;
        });
    }

    function isHomePage() {
      var path = (location.pathname.split("/").pop() || "").toLowerCase();
      return !path || path === "" || path === "index.html" || path === "index.htm";
    }

    document.addEventListener("click", function (e) {
      var a = e.target.closest ? e.target.closest("a") : null;
      if (!a) return;
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      var href = a.getAttribute("href") || "";
      if (!href || href.charAt(0) === "#" || href.indexOf("mailto:") === 0 || href.indexOf("tel:") === 0) return;

      var fromFooter = a.closest && a.closest(".footer-nav");
      var marked = a.hasAttribute("data-legal-modal") || a.hasAttribute("data-page-modal");
      var onHome = isHomePage();
      /* Homepage: all content pages open as modal. Interior: footer / marked only. */
      if (!onHome && !fromFooter && !marked) return;

      var file = modalFile(href);
      var clean = String(href).split("#")[0].split("?")[0];
      var rawFile = (clean.split("/").pop() || "").toLowerCase();

      // Home link: stay on / scroll to top (no navigation / no modal)
      if (rawFile === "index.html" || rawFile === "" || rawFile === "index.htm") {
        if (fromFooter || onHome) {
          e.preventDefault();
          if (open) closeModal();
          try {
            window.scrollTo({ top: 0, behavior: "smooth" });
          } catch (err) {
            window.scrollTo(0, 0);
          }
        }
        return;
      }

      // Known content page → modal (keeps user on homepage)
      if (!file) return;

      e.preventDefault();
      openPage(file);
    }, false);
  })();
})();
