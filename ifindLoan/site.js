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

  /* ---- sticky mobile CTA: show after hero / form leave the viewport ---- */
  var sticky = document.getElementById("stickyCta");
  var hero = document.querySelector(".hero");
  var formCard = document.querySelector(".hero .form-card") || document.getElementById("loan-funnel");
  if (sticky && hero && "IntersectionObserver" in window) {
    sticky.style.opacity = "0";
    sticky.style.pointerEvents = "none";
    sticky.setAttribute("aria-hidden", "true");
    var heroVisible = true;
    var formVisible = true;
    function syncSticky() {
      /* Keep sticky hidden while the hero OR the loan form is on screen */
      var hide = heroVisible || formVisible;
      sticky.style.opacity = hide ? "0" : "1";
      sticky.style.pointerEvents = hide ? "none" : "auto";
      sticky.setAttribute("aria-hidden", String(hide));
    }
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.target === hero) heroVisible = en.isIntersecting;
        else formVisible = en.isIntersecting;
      });
      syncSticky();
    }, { threshold: 0, rootMargin: "0px 0px -8% 0px" });
    so.observe(hero);
    if (formCard && formCard !== hero) so.observe(formCard);
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
       No scrollTo — avoids page nudges. */
    var syncMountHeight = function () {
      var host = funnel.querySelector("epc-funnel, .EPC-FUNNEL");
      if (host) injectShadowStyles(host);

      syncing = true;
      funnel.style.minHeight = "0px";
      var hostH = host ? Math.ceil(host.getBoundingClientRect().height) : 0;
      var h = Math.max(Math.ceil(funnel.getBoundingClientRect().height), hostH);
      if (h < 120) {
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
})();
