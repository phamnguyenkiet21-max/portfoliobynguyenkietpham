document.addEventListener("DOMContentLoaded", () => {

  // ═══════════════════════════════════════════════════
  //  CORE ELEMENTS & INTRO
  // ═══════════════════════════════════════════════════
  const body          = document.body;
  const navbar        = document.getElementById("navbar");
  const glow          = document.querySelector(".cursor-glow");
  const introOverlay  = document.getElementById("introOverlay");
  const enterSiteBtn  = document.getElementById("enterSiteBtn");
  const reveals       = document.querySelectorAll(".reveal");
  const sections      = document.querySelectorAll("section[id]");
  const navLinks      = document.querySelectorAll(".nav-links a");

  let hasEntered = sessionStorage.getItem("portfolioEntered");

  const revealVisibleItems = () => {
    reveals.forEach((item, index) => {
      setTimeout(() => item.classList.add("visible"), index * 45);
    });
  };

  const enterSite = () => {
    if (!introOverlay) return;
    introOverlay.classList.add("hidden");
    body.classList.remove("is-locked");
    body.classList.add("site-ready");
    sessionStorage.setItem("portfolioEntered", "true");
    setTimeout(revealVisibleItems, 150);
  };

  if (hasEntered === "true" && introOverlay) {
    introOverlay.classList.add("hidden");
    body.classList.remove("is-locked");
    body.classList.add("site-ready");
    setTimeout(revealVisibleItems, 80);
  }

  enterSiteBtn && enterSiteBtn.addEventListener("click", e => { e.stopPropagation(); enterSite(); });
  introOverlay && introOverlay.addEventListener("click", e => { if (e.target === introOverlay) enterSite(); });

  window.addEventListener("keydown", e => {
    if ((e.key === "Enter" || e.key === " ") && introOverlay && !introOverlay.classList.contains("hidden")) {
      e.preventDefault(); enterSite();
    }
  });

  let moveCount = 0;
  window.addEventListener("mousemove", () => {
    if (introOverlay && !introOverlay.classList.contains("hidden")) {
      moveCount++; if (moveCount > 10) enterSite();
    }
  });

  // ═══════════════════════════════════════════════════
  //  CURSOR GLOW & NAV SCROLL
  // ═══════════════════════════════════════════════════
  window.addEventListener("mousemove", e => {
    document.documentElement.style.setProperty("--x", `${e.clientX}px`);
    document.documentElement.style.setProperty("--y", `${e.clientY}px`);
    if (glow) glow.style.opacity = "0.6";
  });

  window.addEventListener("scroll", () => {
    if (navbar) navbar.classList.toggle("scrolled", window.scrollY > 10);
  });

  // ═══════════════════════════════════════════════════
  //  REVEAL ON SCROLL
  // ═══════════════════════════════════════════════════
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add("visible");
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });
  reveals.forEach(item => revealObserver.observe(item));

  // ═══════════════════════════════════════════════════
  //  NAV ACTIVE SECTION
  // ═══════════════════════════════════════════════════
  const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute("id");
        navLinks.forEach(link => {
          link.classList.toggle("active", link.getAttribute("href") === `#${id}`);
        });
      }
    });
  }, { rootMargin: "-35% 0px -55% 0px", threshold: 0 });
  sections.forEach(section => sectionObserver.observe(section));

  // ═══════════════════════════════════════════════════
  //  SMOOTH ANCHOR SCROLL
  // ═══════════════════════════════════════════════════
  navLinks.forEach(link => {
    link.addEventListener("click", e => {
      const href = link.getAttribute("href");
      if (!href || !href.startsWith("#")) return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const navHeight = navbar ? navbar.offsetHeight : 0;
      const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 16;
      window.scrollTo({ top, behavior: "smooth" });
    });
  });

  // ═══════════════════════════════════════════════════
  //  CLICK SPARKLE
  // ═══════════════════════════════════════════════════
  const createSparkle = (x, y) => {
    const s = document.createElement("span");
    s.className = "sparkle";
    s.style.left = `${x}px`;
    s.style.top  = `${y}px`;
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 700);
  };
  window.addEventListener("click", e => {
    if (introOverlay && !introOverlay.classList.contains("hidden")) return;
    // Don't sparkle when drawing or interacting with buttons
    if (e.target.closest(".hero-toolbar") || e.target.closest("button") || e.target.closest(".project-row")) return;
    if (document.getElementById("home") && document.getElementById("home").classList.contains("mode-draw")
        && e.target.id === "heroDrawCanvas") return;
    createSparkle(e.clientX, e.clientY);
  });


  // ═══════════════════════════════════════════════════
  //  HERO CANVAS — Draw · Drag · Colour · Size
  // ═══════════════════════════════════════════════════
  (function initHeroCanvas() {
    const section    = document.getElementById("home");
    const drawCanvas = document.getElementById("heroDrawCanvas");
    const initWrap   = document.getElementById("heroInitWrap");
    const callout    = document.getElementById("heroCallout");
    if (!section || !drawCanvas) return;

    let mode     = "draw";
    let penColor = "#20310d";
    let penSize  = 2.5;
    let isDrawing= false;
    let lastPt   = null;
    let lastMid  = null;
    let calloutFaded = false;

    const blocks = section.querySelectorAll(".hero-dblock");

    // STEP 1: Convert grid → absolute while preserving layout
    function convertToAbsolute() {
      const secRect = section.getBoundingClientRect();
      const snaps = Array.from(blocks).map(b => {
        const r = b.getBoundingClientRect();
        return { el: b, left: r.left - secRect.left, top: r.top - secRect.top, w: r.width };
      });
      // Lock section height
      section.style.height = section.offsetHeight + "px";
      section.style.minHeight = "unset";
      // Hide the grid wrapper
      if (initWrap) {
        initWrap.style.visibility = "hidden";
        initWrap.style.pointerEvents = "none";
        initWrap.style.position = "absolute";
      }
      // Place each block absolutely
      snaps.forEach(({ el, left, top, w }) => {
        el.style.position = "absolute";
        el.style.left = left + "px";
        el.style.top  = top + "px";
        el.style.width = w + "px";
        el.style.margin = "0";
        section.appendChild(el);
      });
    }

    // STEP 2: Canvas sizing
    const ctx = drawCanvas.getContext("2d");
    function resizeCanvas() {
      const old = drawCanvas.toDataURL();
      drawCanvas.width  = section.offsetWidth;
      drawCanvas.height = section.offsetHeight;
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = old;
    }

    // STEP 3: Smooth drawing
    function getPos(e) {
      const rect = drawCanvas.getBoundingClientRect();
      const src = e.touches ? e.touches[0] : e;
      return {
        x: (src.clientX - rect.left) * (drawCanvas.width / rect.width),
        y: (src.clientY - rect.top)  * (drawCanvas.height / rect.height)
      };
    }
    function begin(e) {
      if (mode !== "draw") return;
      isDrawing = true;
      lastPt  = getPos(e);
      lastMid = null;
      ctx.save();
      ctx.strokeStyle = penColor;
      ctx.fillStyle = penColor;
      ctx.lineWidth = penSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.arc(lastPt.x, lastPt.y, penSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      fadeCallout();
    }
    function continueStroke(e) {
      if (!isDrawing || mode !== "draw") return;
      e.preventDefault();
      const pt = getPos(e);
      const mid = { x: (lastPt.x + pt.x) / 2, y: (lastPt.y + pt.y) / 2 };
      ctx.save();
      ctx.strokeStyle = penColor;
      ctx.lineWidth = penSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(lastMid ? lastMid.x : lastPt.x, lastMid ? lastMid.y : lastPt.y);
      ctx.quadraticCurveTo(lastPt.x, lastPt.y, mid.x, mid.y);
      ctx.stroke();
      ctx.restore();
      lastMid = mid;
      lastPt = pt;
    }
    function end() { isDrawing = false; lastPt = null; lastMid = null; }

    drawCanvas.addEventListener("mousedown",  begin);
    drawCanvas.addEventListener("mousemove",  continueStroke);
    drawCanvas.addEventListener("mouseup",    end);
    drawCanvas.addEventListener("mouseleave", end);
    drawCanvas.addEventListener("touchstart", begin,   { passive: false });
    drawCanvas.addEventListener("touchmove",  continueStroke, { passive: false });
    drawCanvas.addEventListener("touchend",   end);

    // STEP 4: Drag blocks (plus canvas items added later)
    let dragEl = null, dragOffX = 0, dragOffY = 0;

    function canDrag(el) {
      // Draggable in move mode = any hero-dblock, canvas-item
      // Draggable in letters mode = letter-span elements
      if (mode === "move")    return el.matches(".hero-dblock, .canvas-item");
      if (mode === "letters") return el.matches(".letter-span");
      return false;
    }

    function startDrag(e) {
      const target = e.target.closest(".hero-dblock, .canvas-item, .letter-span");
      if (!target || !canDrag(target)) return;
      // Allow delete button to click through
      if (e.target.classList.contains("item-delete")) return;
      // Allow typing inside contenteditable text boxes (when not in move mode)
      if (mode !== "move" && mode !== "letters" && e.target.isContentEditable) return;

      dragEl = target;

      // If this is a letter in letters mode and not yet detached, detach it in place first
      if (mode === "letters" && dragEl.classList.contains("letter-span") && !dragEl.classList.contains("detached")) {
        detachLetter(dragEl);
      }

      dragEl.classList.add("is-dragging");
      const rect = dragEl.getBoundingClientRect();
      const src = e.touches ? e.touches[0] : e;
      dragOffX = src.clientX - rect.left;
      dragOffY = src.clientY - rect.top;
      e.preventDefault();
      fadeCallout();
    }

    function onDrag(e) {
      if (!dragEl) return;
      e.preventDefault();
      const src = e.touches ? e.touches[0] : e;
      const secRect = section.getBoundingClientRect();
      let newLeft = src.clientX - secRect.left - dragOffX;
      let newTop  = src.clientY - secRect.top  - dragOffY;
      const maxL = section.offsetWidth - dragEl.offsetWidth;
      const maxT = section.offsetHeight - dragEl.offsetHeight;
      dragEl.style.left = Math.max(0, Math.min(newLeft, maxL)) + "px";
      dragEl.style.top  = Math.max(0, Math.min(newTop, maxT)) + "px";
    }
    function endDrag() {
      if (!dragEl) return;
      dragEl.classList.remove("is-dragging");
      dragEl = null;
    }

    // Listen globally so newly-created items work automatically
    section.addEventListener("mousedown",  startDrag);
    section.addEventListener("touchstart", startDrag, { passive: false });
    window.addEventListener("mousemove",   onDrag,    { passive: false });
    window.addEventListener("touchmove",   onDrag,    { passive: false });
    window.addEventListener("mouseup",     endDrag);
    window.addEventListener("touchend",    endDrag);

    // STEP 5: Toolbar
    function setMode(m) {
      mode = m;
      section.classList.toggle("mode-draw",    m === "draw");
      section.classList.toggle("mode-move",    m === "move");
      section.classList.toggle("mode-letters", m === "letters");
      document.getElementById("tbDraw").classList.toggle("active",     m === "draw");
      document.getElementById("tbMove").classList.toggle("active",     m === "move");
      document.getElementById("tbLetters").classList.toggle("active",  m === "letters");

      // Splitting/unsplitting letters when entering/leaving letters mode
      if (m === "letters") splitLetters();
      // (we don't un-split — detached letters stay where user left them)
    }

    document.getElementById("tbDraw").addEventListener("click", () => setMode("draw"));
    document.getElementById("tbMove").addEventListener("click", () => setMode("move"));
    document.getElementById("tbLetters").addEventListener("click", () => setMode("letters"));

    document.getElementById("tbClear").addEventListener("click", clearAll);

    function clearAll() {
      ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
      // Remove canvas items too
      section.querySelectorAll(".canvas-item").forEach(el => el.remove());

      // Re-attach detached letters: move each back in front of its ghost, then remove the ghost
      section.querySelectorAll(".letter-span.detached").forEach(l => {
        l.classList.remove("detached");
        l.style.left = "";
        l.style.top  = "";
        l.style.position = "";
        l.style.width = "";
        l.style.height = "";
        // Find the nearest preceding ghost (we inserted it before the letter originally)
        // Actually we inserted ghost BEFORE the letter, so ghost is the previousSibling
        const ghost = l.previousSibling;
        if (ghost && ghost.classList && ghost.classList.contains("letter-ghost")) {
          ghost.remove();
        }
      });
      // Safety: remove any orphaned ghosts
      section.querySelectorAll(".letter-ghost").forEach(g => g.remove());
    }

    section.querySelectorAll(".tb-swatch").forEach(sw => {
      sw.addEventListener("click", function() {
        section.querySelectorAll(".tb-swatch").forEach(s => s.classList.remove("active"));
        this.classList.add("active");
        penColor = this.dataset.color;
        setMode("draw");
      });
    });
    section.querySelectorAll(".tb-size").forEach(btn => {
      btn.addEventListener("click", function() {
        section.querySelectorAll(".tb-size").forEach(b => b.classList.remove("active"));
        this.classList.add("active");
        penSize = parseFloat(this.dataset.size);
      });
    });

    // ── ADD TEXT ────────────────────────────────────────────
    const tbAddText = document.getElementById("tbAddText");
    tbAddText && tbAddText.addEventListener("click", () => {
      const item = document.createElement("div");
      item.className = "canvas-item";
      item.style.left = "50%";
      item.style.top  = "45%";
      item.style.transform = "translate(-50%, -50%)";

      const textBox = document.createElement("div");
      textBox.className = "canvas-text";
      textBox.contentEditable = "true";
      textBox.textContent = "Type something ✦";
      textBox.spellcheck = false;

      // Click to enter/exit edit
      textBox.addEventListener("focus", () => {
        if (textBox.textContent === "Type something ✦") {
          textBox.textContent = "";
        }
      });
      textBox.addEventListener("blur", () => {
        if (textBox.textContent.trim() === "") {
          textBox.textContent = "Type something ✦";
        }
      });

      // In move mode, clicking shouldn't focus for typing
      textBox.addEventListener("mousedown", e => {
        if (mode === "move") e.preventDefault();
      });

      const del = makeDeleteButton(item);

      item.appendChild(textBox);
      item.appendChild(del);
      section.appendChild(item);

      // Remove centering transform after first placement
      requestAnimationFrame(() => {
        const r = item.getBoundingClientRect();
        const secR = section.getBoundingClientRect();
        item.style.left = (r.left - secR.left) + "px";
        item.style.top  = (r.top  - secR.top)  + "px";
        item.style.transform = "";
        // Focus for immediate typing
        if (mode !== "move" && mode !== "letters") {
          textBox.focus();
          document.execCommand("selectAll", false, null);
        }
      });
      fadeCallout();
    });

    // ── ADD STICKER (via picker popover) ───────────────────
    const tbAddSticker  = document.getElementById("tbAddSticker");
    const stickerPicker = document.getElementById("stickerPicker");
    const spGrid        = document.getElementById("spGrid");
    const spClose       = document.getElementById("spClose");

    const STICKERS = [
      "✦","✧","✨","⭐","🌟","💫","🌈",
      "❤️","💕","💖","💘","💝","💟","💌",
      "🌸","🌼","🌺","🌻","🌷","🌹","🥀",
      "🎀","🎁","🎈","🎉","🎊","🎃","🎄",
      "☕","🍕","🍰","🎂","🍩","🍪","🍦",
      "📸","🎨","🎭","🎪","🎬","🎵","🎶",
      "😊","😎","🥰","🤩","😇","🙃","😌",
      "🔥","💎","👑","🦄","🌙","☁️","⚡",
    ];

    if (spGrid) {
      STICKERS.forEach(emoji => {
        const b = document.createElement("button");
        b.className = "sp-item";
        b.textContent = emoji;
        b.type = "button";
        b.addEventListener("click", () => addSticker(emoji));
        spGrid.appendChild(b);
      });
    }

    function toggleStickerPicker(open) {
      if (!stickerPicker) return;
      stickerPicker.hidden = false;
      requestAnimationFrame(() => {
        stickerPicker.classList.toggle("show", open);
      });
      if (!open) {
        // hide after transition
        setTimeout(() => {
          if (!stickerPicker.classList.contains("show")) stickerPicker.hidden = true;
        }, 320);
      }
    }

    tbAddSticker && tbAddSticker.addEventListener("click", e => {
      e.stopPropagation();
      toggleStickerPicker(!stickerPicker.classList.contains("show"));
    });
    spClose && spClose.addEventListener("click", () => toggleStickerPicker(false));
    document.addEventListener("click", e => {
      if (!stickerPicker || stickerPicker.hidden) return;
      if (!stickerPicker.contains(e.target) && e.target !== tbAddSticker && !tbAddSticker.contains(e.target)) {
        toggleStickerPicker(false);
      }
    });

    function addSticker(emoji) {
      const item = document.createElement("div");
      item.className = "canvas-item";
      // Random-ish placement around the center
      const secR = section.getBoundingClientRect();
      item.style.left = (secR.width * 0.3 + Math.random() * secR.width * 0.4) + "px";
      item.style.top  = (secR.height * 0.3 + Math.random() * secR.height * 0.3) + "px";

      const sticker = document.createElement("span");
      sticker.className = "canvas-sticker";
      sticker.textContent = emoji;

      const del = makeDeleteButton(item);

      item.appendChild(sticker);
      item.appendChild(del);
      section.appendChild(item);

      toggleStickerPicker(false);
      fadeCallout();
    }

    // ── ADD IMAGE ──────────────────────────────────────────
    const tbAddImage   = document.getElementById("tbAddImage");
    const tbImageInput = document.getElementById("tbImageInput");

    tbAddImage && tbAddImage.addEventListener("click", () => {
      tbImageInput.value = "";  // reset so same file can be re-added
      tbImageInput.click();
    });

    tbImageInput && tbImageInput.addEventListener("change", e => {
      const file = e.target.files[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) return;

      const reader = new FileReader();
      reader.onload = evt => {
        const item = document.createElement("div");
        item.className = "canvas-item canvas-image";
        const secR = section.getBoundingClientRect();
        item.style.left = (secR.width * 0.35) + "px";
        item.style.top  = (secR.height * 0.25) + "px";

        const img = document.createElement("img");
        img.src = evt.target.result;
        img.alt = "Added image";
        img.draggable = false;

        const del = makeDeleteButton(item);

        item.appendChild(img);
        item.appendChild(del);
        section.appendChild(item);
        fadeCallout();
      };
      reader.readAsDataURL(file);
    });

    // ── Delete button factory ──────────────────────────────
    function makeDeleteButton(itemEl) {
      const btn = document.createElement("button");
      btn.className = "item-delete";
      btn.textContent = "×";
      btn.type = "button";
      btn.setAttribute("aria-label", "Remove");
      btn.addEventListener("click", e => {
        e.stopPropagation();
        itemEl.remove();
      });
      btn.addEventListener("mousedown", e => e.stopPropagation());
      btn.addEventListener("touchstart", e => e.stopPropagation());
      return btn;
    }

    // ── LETTER SPLITTING ───────────────────────────────────
    // Wraps every letter in .hero-dblock text nodes into <span class="letter-span">
    // so they become individually draggable in letters mode.
    let lettersSplit = false;
    function splitLetters() {
      if (lettersSplit) return;
      lettersSplit = true;

      const textBearers = section.querySelectorAll(
        "#db-h1 h1, #db-para p, #db-eyebrow .eyebrow, #db-stickers .sticker, #db-note .note-text, #db-note .note-kicker"
      );

      textBearers.forEach(host => {
        splitNode(host);
      });
    }

    function splitNode(node) {
      // Walk direct children; text nodes → wrap each char, element nodes → recurse
      const childNodes = Array.from(node.childNodes);
      childNodes.forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          const chars = child.textContent.split("");
          chars.forEach(ch => {
            if (ch === " ") {
              // preserve spaces as a non-draggable space (inline, no wrap)
              frag.appendChild(document.createTextNode(" "));
            } else {
              const span = document.createElement("span");
              span.className = "letter-span";
              span.textContent = ch;
              frag.appendChild(span);
            }
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          // Skip elements that are already wrappers (e.g. <em>) — recurse into them
          if (!child.classList.contains("letter-span")) {
            splitNode(child);
          }
        }
      });
    }

    function detachLetter(letterEl) {
      // Measure BEFORE changing anything
      const rect = letterEl.getBoundingClientRect();
      const secRect = section.getBoundingClientRect();
      const left = rect.left - secRect.left;
      const top  = rect.top  - secRect.top;
      const w = rect.width;
      const h = rect.height;

      // Leave an invisible placeholder with the exact same dimensions
      // so the rest of the word doesn't collapse/reflow.
      const ghost = document.createElement("span");
      ghost.className = "letter-ghost";
      ghost.setAttribute("aria-hidden", "true");
      ghost.style.display = "inline-block";
      ghost.style.width = w + "px";
      ghost.style.height = h + "px";
      ghost.style.verticalAlign = "baseline";
      letterEl.parentNode.insertBefore(ghost, letterEl);

      // Now promote the letter itself to absolute positioning
      letterEl.classList.add("detached");
      letterEl.style.width = w + "px";
      letterEl.style.height = h + "px";
      letterEl.style.left = left + "px";
      letterEl.style.top  = top  + "px";
    }

    // Keyboard shortcuts
    window.addEventListener("keydown", e => {
      if (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA") return;
      if (document.activeElement.isContentEditable) return;
      if (introOverlay && !introOverlay.classList.contains("hidden")) return;
      switch (e.key.toLowerCase()) {
        case "d": setMode("draw"); break;
        case "m": setMode("move"); break;
        case "l": setMode("letters"); break;
        case "t": document.getElementById("tbAddText").click(); break;
        case "s": document.getElementById("tbAddSticker").click(); break;
        case "i": document.getElementById("tbAddImage").click(); break;
        case "c": clearAll(); break;
        case "1": document.querySelector('.tb-size[data-size="2.5"]').click(); break;
        case "2": document.querySelector('.tb-size[data-size="6"]').click(); break;
        case "3": document.querySelector('.tb-size[data-size="14"]').click(); break;
      }
    });

    function fadeCallout() {
      if (calloutFaded || !callout) return;
      calloutFaded = true;
      callout.classList.add("faded");
    }

    function boot() {
      convertToAbsolute();
      resizeCanvas();
      setMode("draw");
      setTimeout(fadeCallout, 8000);
    }

    window.addEventListener("resize", () => {
      // On resize, just resize canvas (keep block positions)
      drawCanvas.width  = section.offsetWidth;
      drawCanvas.height = section.offsetHeight;
    });

    if (document.body.classList.contains("site-ready")) {
      setTimeout(boot, 200);
    } else {
      const obs = new MutationObserver(() => {
        if (document.body.classList.contains("site-ready")) {
          obs.disconnect();
          setTimeout(boot, 200);
        }
      });
      obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    }
  })();


  // ═══════════════════════════════════════════════════
  //  PROJECT ROW — Cursor-follow Thumbnail (Readymag style)
  // ═══════════════════════════════════════════════════
  (function initProjectCursor() {
    const rows = document.querySelectorAll(".project-row");
    const thumb = document.getElementById("projectCursorImg");
    if (!rows.length || !thumb) return;

    const thumbImg = thumb.querySelector("img");
    let currentSrc = null;
    let rafId = null;
    let targetX = 0, targetY = 0;
    let currentX = 0, currentY = 0;

    // Preload images
    rows.forEach(r => {
      const src = r.dataset.img;
      if (src) { const i = new Image(); i.src = src; }
    });

    function animate() {
      currentX += (targetX - currentX) * 0.18;
      currentY += (targetY - currentY) * 0.18;
      thumb.style.transform = `translate(calc(${currentX}px - 50%), calc(${currentY}px - 50%)) scale(${thumb.classList.contains("visible") ? 1 : 0.8})`;
      rafId = requestAnimationFrame(animate);
    }

    rows.forEach(row => {
      row.addEventListener("mouseenter", () => {
        const src = row.dataset.img;
        if (src && src !== currentSrc) {
          thumbImg.src = src;
          currentSrc = src;
        }
        thumb.classList.add("visible");
        if (!rafId) animate();
      });

      row.addEventListener("mousemove", e => {
        targetX = e.clientX;
        targetY = e.clientY;
        // Set initial pos instantly on first enter
        if (currentX === 0 && currentY === 0) {
          currentX = targetX;
          currentY = targetY;
        }
      });

      row.addEventListener("mouseleave", () => {
        thumb.classList.remove("visible");
        setTimeout(() => {
          if (!thumb.classList.contains("visible")) {
            cancelAnimationFrame(rafId);
            rafId = null;
          }
        }, 400);
      });

      // Prevent navigation for now (placeholder links)
      row.addEventListener("click", e => {
        if (row.getAttribute("href") === "#") e.preventDefault();
      });
    });
  })();


  // ═══════════════════════════════════════════════════
  //  PLAY — Gesture Camera (ILY detection)
  // ═══════════════════════════════════════════════════
  (function initPlay() {
    const playVideo       = document.getElementById("playVideo");
    const playCanvas      = document.getElementById("playCanvas");
    const playDotLeft     = document.getElementById("playDotLeft");
    const playDotRight    = document.getElementById("playDotRight");
    const playInstruction = document.getElementById("playInstruction");
    const playToast       = document.getElementById("playToast");
    const playReset       = document.getElementById("playReset");
    const playCamToggle   = document.getElementById("playCamToggle");
    const playCamBadge    = document.getElementById("playCamBadge");
    const playPlaceholder = document.getElementById("playCamPlaceholder");
    const heartCanvas     = document.getElementById("playHeartCanvas");
    if (!playVideo || !playCanvas) return;

    const pCtx = playCanvas.getContext("2d");
    let hCtx, hearts = [], heartsRunning = false;

    if (heartCanvas) {
      heartCanvas.width = window.innerWidth;
      heartCanvas.height = window.innerHeight;
      hCtx = heartCanvas.getContext("2d");
      window.addEventListener("resize", () => {
        heartCanvas.width = window.innerWidth;
        heartCanvas.height = window.innerHeight;
      });
    }

    function drawHeart(ctx, x, y, size) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x, y - size*0.3, x - size*0.5, y - size*0.7, x - size*0.5, y - size*0.5);
      ctx.bezierCurveTo(x - size*0.5, y - size*1.0, x, y - size*1.0, x, y - size*0.7);
      ctx.bezierCurveTo(x, y - size*1.0, x + size*0.5, y - size*1.0, x + size*0.5, y - size*0.5);
      ctx.bezierCurveTo(x + size*0.5, y - size*0.7, x, y - size*0.3, x, y);
      ctx.closePath();
    }
    function spawnHeart() {
      if (!heartCanvas) return;
      hearts.push({
        x: Math.random() * heartCanvas.width,
        y: heartCanvas.height + 20,
        size: Math.random() * 16 + 8,
        speed: Math.random() * 2 + 0.8,
        drift: (Math.random() - 0.5) * 1.2,
        opacity: 1,
        wobble: Math.random() * Math.PI * 2,
        hue: Math.random() > 0.5 ? 340 : 40,
      });
    }
    function animHearts() {
      if (!hCtx || !heartCanvas) return;
      hCtx.clearRect(0, 0, heartCanvas.width, heartCanvas.height);
      if (heartsRunning && Math.random() < 0.25) spawnHeart();
      hearts = hearts.filter(h => h.opacity > 0.02);
      hearts.forEach(h => {
        h.y -= h.speed;
        h.wobble += 0.04;
        h.x += h.drift + Math.sin(h.wobble) * 0.4;
        h.opacity -= 0.004;
        hCtx.save();
        hCtx.globalAlpha = h.opacity;
        hCtx.fillStyle = `hsla(${h.hue}, 80%, 65%, 1)`;
        drawHeart(hCtx, h.x, h.y, h.size);
        hCtx.fill();
        hCtx.restore();
      });
      requestAnimationFrame(animHearts);
    }
    animHearts();

    function fingerUp(lm, tip, pip) { return lm[tip].y < lm[pip].y; }
    function thumbUp(lm, side) { return side === "Left" ? lm[4].x > lm[3].x : lm[4].x < lm[3].x; }
    function isILY(lm, side) {
      return thumbUp(lm, side) && fingerUp(lm, 8, 6) && !fingerUp(lm, 12, 10)
             && !fingerUp(lm, 16, 14) && fingerUp(lm, 20, 18);
    }

    function drawSkeleton(lm, color) {
      const CONNS = [
        [0,1],[1,2],[2,3],[3,4], [0,5],[5,6],[6,7],[7,8],
        [9,10],[10,11],[11,12], [13,14],[14,15],[15,16],
        [0,17],[17,18],[18,19],[19,20], [5,9],[9,13],[13,17],
      ];
      pCtx.strokeStyle = color;
      pCtx.lineWidth = 2;
      CONNS.forEach(([a,b]) => {
        pCtx.beginPath();
        pCtx.moveTo(lm[a].x * playCanvas.width, lm[a].y * playCanvas.height);
        pCtx.lineTo(lm[b].x * playCanvas.width, lm[b].y * playCanvas.height);
        pCtx.stroke();
      });
      lm.forEach(p => {
        pCtx.beginPath();
        pCtx.arc(p.x * playCanvas.width, p.y * playCanvas.height, 3.5, 0, Math.PI * 2);
        pCtx.fillStyle = "#fff";
        pCtx.fill();
      });
    }

    let isSuccess = false, toastTimer = null, gracePeriod = null, camRunning = false;

    function showSuccess() {
      if (isSuccess) return;
      isSuccess = true;
      heartsRunning = true;
      if (heartCanvas) heartCanvas.style.display = "block";
      playInstruction.textContent = "💖 Love detected!";
      playInstruction.classList.add("success");
      playToast.classList.add("show");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => playToast.classList.remove("show"), 3500);
    }
    function hideSuccess() {
      if (!isSuccess) return;
      isSuccess = false;
      heartsRunning = false;
      setTimeout(() => { if (!heartsRunning && heartCanvas) heartCanvas.style.display = "none"; }, 1800);
      playInstruction.classList.remove("success");
    }
    function resetGesture() {
      hideSuccess();
      playDotLeft.classList.remove("active");
      playDotRight.classList.remove("active");
      playInstruction.textContent = "Make the 🤟 ILY sign with both hands";
    }
    playReset && playReset.addEventListener("click", resetGesture);

    function startMediaPipe() {
      if (camRunning) return;
      camRunning = true;
      const hands = new Hands({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.75,
        minTrackingConfidence: 0.6,
      });
      hands.onResults(results => {
        playCanvas.width  = playVideo.videoWidth  || 640;
        playCanvas.height = playVideo.videoHeight || 480;
        pCtx.clearRect(0, 0, playCanvas.width, playCanvas.height);
        let leftILY = false, rightILY = false;
        if (results.multiHandLandmarks && results.multiHandedness) {
          results.multiHandLandmarks.forEach((lm, i) => {
            const side = results.multiHandedness[i].label;
            const ily = isILY(lm, side);
            const color = ily ? "rgba(255,123,184,0.85)" : "rgba(33,73,227,0.45)";
            drawSkeleton(lm, color);
            if (side === "Right") leftILY = ily;
            else rightILY = ily;
          });
        }
        playDotLeft.classList.toggle("active", leftILY);
        playDotRight.classList.toggle("active", rightILY);
        if (leftILY && rightILY) { clearTimeout(gracePeriod); showSuccess(); }
        else if (isSuccess) {
          clearTimeout(gracePeriod);
          gracePeriod = setTimeout(() => { if (!(leftILY && rightILY)) hideSuccess(); }, 700);
        }
        if (!isSuccess) {
          if (!leftILY && !rightILY) playInstruction.textContent = "Make the 🤟 ILY sign with both hands";
          else if (leftILY) playInstruction.textContent = "Great left! Now the right 🤟";
          else playInstruction.textContent = "Great right! Now the left 🤟";
        }
      });
      const cam = new Camera(playVideo, {
        onFrame: async () => { await hands.send({ image: playVideo }); },
        width: 1280, height: 960,
      });
      cam.start();
    }

    playCamToggle && playCamToggle.addEventListener("click", async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } },
          audio: false,
        });
        playVideo.srcObject = stream;
        playVideo.style.display = "block";
        if (playPlaceholder) playPlaceholder.style.display = "none";
        if (playCamBadge)    playCamBadge.style.display = "flex";
        playCamToggle.style.display = "none";
        if (playReset) playReset.style.display = "inline-flex";
        playVideo.onloadedmetadata = () => {
          playVideo.play();
          playInstruction.textContent = "Make the 🤟 ILY sign with both hands";
          startMediaPipe();
        };
      } catch (err) {
        playCamToggle.textContent = "⚠️ Camera access denied";
        playCamToggle.disabled = true;
      }
    });
  })();


  // ═══════════════════════════════════════════════════
  //  I18N — English ⇄ Vietnamese translation engine 🇻🇳🇺🇸
  //  Tagging: elements use [data-i18n="key"] for textContent
  //  or [data-i18n-html="key"] for innerHTML (preserves <em>/<strong>)
  // ═══════════════════════════════════════════════════
  (function initI18n() {
    const langBtn   = document.getElementById("langToggle");
    const langLabel = document.getElementById("langLabel");
    if (!langBtn) return;

    // Translation dictionary — edit these freely to refine wording
    const DICT = {
      // ── NAVIGATION ─────────────────────────────────
      "nav.projects":  { en: "✦Projects",   vi: "✦Dự án" },
      "nav.gallery":   { en: "✦Gallery",    vi: "✦Bộ sưu tập" },
      "nav.about":     { en: "✦About",      vi: "✦Giới thiệu" },
      "nav.booth":     { en: "✦Photo Booth", vi: "✦Chụp ảnh" },
      "nav.play":      { en: "✦Play",       vi: "✦Vui chơi" },
      "nav.contact":   { en: "✦Contact",    vi: "✦Liên hệ" },

      // ── MENU OVERLAY ──────────────────────────────
      "menu.kicker":   { en: "Navigate ✦",  vi: "Điều hướng ✦" },
      "menu.home":     { en: "Home",        vi: "Trang chủ" },
      "menu.projects": { en: "Projects",    vi: "Dự án" },
      "menu.gallery":  { en: "Gallery",     vi: "Bộ sưu tập" },
      "menu.about":    { en: "About Me",    vi: "Về mình" },
      "menu.booth":    { en: "Photobooth",  vi: "Chụp ảnh" },
      "menu.play":     { en: "Play",        vi: "Vui chơi" },
      "menu.contact":  { en: "Contact",     vi: "Liên hệ" },

      // ── INTRO CARD ────────────────────────────────
      "intro.kicker":  { en: "✦ Nguyen Kiet Pham's Portfolio ✦", vi: "✦ Portfolio của Nguyễn Kiệt Phạm ✦" },
      "intro.title":   { en: "Hey, welcome in.", vi: "Chào bạn, mời vào xem nhé." },
      "intro.button":  { en: "Open Portfolio →", vi: "Mở Portfolio →" },

      // ── HERO ───────────────────────────────────────
      "hero.eyebrow":       { en: "Graphic Design · UX · Minneapolis", vi: "Thiết kế đồ họa · UX · Minneapolis" },
      "hero.h1":            { en: "Design that <em>lets the work</em> speak.", vi: "Thiết kế để <em>tác phẩm tự</em> cất lời." },
      "hero.body":          { en: "I'm a graphic designer and UX minor at the University of Minnesota. My work lives at the intersection of typography, research, and digital experience - focused on clarity, narrative, and thoughtful decisions that solve real communication problems.",
                              vi: "Mình là sinh viên Thiết kế Đồ họa chuyên ngành phụ UX tại Đại học Minnesota. Công việc của mình nằm ở giao điểm của typography, nghiên cứu và trải nghiệm số - tập trung vào sự rõ ràng, câu chuyện, và những quyết định chu đáo giúp giải quyết các vấn đề giao tiếp thực sự." },
      "hero.viewProjects":  { en: "View Projects →",   vi: "Xem dự án →" },
      "hero.letsConnect":   { en: "Let's Connect",     vi: "Kết nối nhé" },
      "hero.stickerA":      { en: "Story-led ✦",       vi: "Kể chuyện ✦" },
      "hero.stickerB":      { en: "UM Design TA",      vi: "Trợ giảng UMN" },
      "hero.stickerC":      { en: "Curious always",    vi: "Luôn tò mò" },
      "hero.direction":     { en: "Direction",         vi: "Định hướng" },
      "hero.directionBody": { en: "Fresh color, playful energy - and a system that still lets the work lead.",
                              vi: "Màu sắc tươi mới, năng lượng vui nhộn - nhưng hệ thống vẫn để tác phẩm dẫn dắt." },
      "hero.callout":       { en: "Draw · type text · add stickers · drag letters one by one!",
                              vi: "Vẽ · gõ chữ · thêm sticker · kéo từng chữ cái một!" },

      // ── WORK ──────────────────────────────────────
      "work.kicker":        { en: "Selected Work",       vi: "Dự án tiêu biểu" },
      "work.title":         { en: "Projects, <em>2023–2026</em>", vi: "Dự án, <em>2023–2026</em>" },
      "proj.meta.research": { en: "Research · Typography · Web", vi: "Nghiên cứu · Typography · Web" },
      "proj.meta.web":      { en: "Web · Experience",    vi: "Web · Trải nghiệm" },
      "proj.meta.editorial":{ en: "Editorial · Typography", vi: "Biên tập · Typography" },
      "proj.meta.brand":    { en: "Branding · Identity", vi: "Thương hiệu · Nhận diện" },
      "proj.meta.brandVideo":{ en: "Branding · Identity · Edit Video", vi: "Thương hiệu · Nhận diện · Dựng phim" },
      "proj.meta.uiux":     { en: "Web · Experience and UI · UX · Prototype", vi: "Web · Trải nghiệm UI · UX · Prototype" },
      "proj.01.title":      { en: "The Physical Origins of Chinese & Roman Letterforms",
                              vi: "Nguồn gốc vật lý của chữ Hán & chữ La Mã" },
      "proj.02.title":      { en: "Floating Worlds inPrint Ukiyo-e & the rise of modern visual communication",
                              vi: "Thế giới nổi trong bản in Ukiyo-e & sự trỗi dậy của truyền thông thị giác hiện đại" },
      "proj.03.title":      { en: "Van Gogh Shop",                vi: "Cửa hàng Van Gogh" },
      "proj.04.title":      { en: "Social Media: Oyo!",          vi: "Mạng xã hội: Oyo!" },
      "proj.05.title":      { en: "Vietnamese Food Magazine",     vi: "Tạp chí Ẩm thực Việt Nam" },
      "proj.06.title":      { en: "Corleone Pizza - Brand Identity", vi: "Corleone Pizza - Nhận diện thương hiệu" },
      "proj.07.title":      { en: "Dream City - Concert Poster & Video Animation", vi: "Dream City - Poster hòa nhạc & Video Animation" },

      // ── GALLERY ───────────────────────────────────
      "gallery.kicker": { en: "Gallery",        vi: "Bộ sưu tập" },
      "gallery.title":  { en: "Work in <em>motion</em>.", vi: "Tác phẩm đang <em>chuyển động</em>." },

      // ── ABOUT ─────────────────────────────────────
      "about.kicker":  { en: "About",  vi: "Về mình" },
      "about.title":   { en: "Hi! I'm <em>Kiet</em> - a designer who cares about every little detail.",
                         vi: "Chào! Mình là <em>Kiệt</em> - một designer chăm chút từng chi tiết nhỏ." },
      "about.lead":    { en: "BFA in Graphic Design · UX Design minor at the <strong>University of Minnesota, College of Design</strong> · Class of 2028 · <strong>GPA 3.50</strong>.",
                         vi: "Cử nhân Mỹ thuật ngành Thiết kế Đồ họa · Chuyên ngành phụ UX tại <strong>Đại học Minnesota, College of Design</strong> · Khóa 2028 · <strong>GPA 3.50</strong>." },
      "about.paragraph": { en: "By day I'm a <strong>Teaching Assistant</strong> at UMN College of Design, a <strong>Student Web Coordinator</strong> for the Medical School, and a <strong>Communications Assistant</strong> in the Department of Psychology. By night I'm usually drawing something - or building weird websites like this one.",
                         vi: "Ban ngày thì mình là <strong>Trợ giảng</strong> tại UMN College of Design, <strong>Trợ lý Điều phối Web</strong> cho Trường Y, và <strong>Trợ lý Truyền thông</strong> ở Khoa Tâm lý học. Ban đêm mình thường vẽ vời gì đó - hoặc xây dựng những trang web kỳ quặc như thế này." },
      "about.paragraph2": { en: "I care deeply about typography, research, and the process of design - and I believe good design should feel inevitable, not loud. I'm always looking for ways to learn, grow, and create work that communicates clearly and thoughtfully.",
                              vi: "Mình rất quan tâm đến typography, nghiên cứu, và quá trình thiết kế - và mình tin rằng thiết kế đẹp nên khiến người ta cảm thấy nó là tất yếu, chứ không ồn ào. Mình luôn tìm cách để học hỏi, phát triển, và tạo ra những tác phẩm giao tiếp rõ ràng và chu đáo." },
      "about.quickfacts": { en: "Quick facts ✦", vi: "Thông tin nhanh ✦" },
      "about.timeline": { en: "What I'm doing right now", vi: "Mình đang làm gì hiện tại" },
      "about.philosophy": { en: "\"Good design feels like it was always going to be that way.\"",
                           vi: "\"Thiết kế đẹp khiến người ta cảm giác như nó luôn phải như vậy.\"" },
      "about.downloadResume": { en: "Download full resume ↓", vi: "Tải CV đầy đủ ↓" },
      
      // Quick facts
      "qf.location":  { en: "Minneapolis, MN · originally Ho Chi Minh City",
                         vi: "Minneapolis, MN · quê gốc Thành phố Hồ Chí Minh" },
      "qf.languages": { en: "Fluent in Vietnamese · English second language",
                         vi: "Tiếng Việt thành thạo · Tiếng Anh là ngôn ngữ thứ hai" },
      "qf.design":    { en: "Fluent in Illustrator, Photoshop, InDesign, Figma, XD",
                         vi: "Thạo Illustrator, Photoshop, InDesign, Figma, XD" },
      "qf.dev":       { en: "Also reasonably dangerous in VS Code · GitHub · Drupal",
                         vi: "Cũng xài khá ổn VS Code · GitHub · Drupal" },
      "qf.tiktok":    { en: "TikTok content creator <em>@phamnguyenkiet2004</em>",
                         vi: "Nhà sáng tạo nội dung TikTok <em>@phamnguyenkiet2004</em>" },
      "qf.belief":    { en: "Believes good design feels inevitable, not loud",
                         vi: "Tin rằng thiết kế đẹp là tất yếu, chứ không ồn ào" },

      // Timeline
      "tl.present":         { en: "Dec 2025 - Present",          vi: "Tháng 12/2025 - Hiện tại" },
      "tl.webCoord.role":   { en: "Student Web Coordinator",     vi: "Trợ lý Điều phối Web" },
      "tl.webCoord.org":    { en: "UMN Medical School · Marketing & Communications",
                               vi: "Trường Y UMN · Marketing & Truyền thông" },
      "tl.webCoord.desc":   { en: "Keeping the Medical School websites clear, accessible, and on-brand - while quietly improving navigation and readability behind the scenes.",
                               vi: "Duy trì trang web của Trường Y rõ ràng, dễ tiếp cận và đúng nhận diện - đồng thời âm thầm cải thiện điều hướng và khả năng đọc phía sau hậu trường." },
      "tl.comms.role":      { en: "Communications Assistant",    vi: "Trợ lý Truyền thông" },
      "tl.comms.org":       { en: "Department of Psychology, UMN", vi: "Khoa Tâm lý học, UMN" },
      "tl.comms.desc":      { en: "Drafting digital content and designing flyers, social graphics, and email announcements for student-facing messaging.",
                               vi: "Soạn nội dung số và thiết kế flyer, đồ họa mạng xã hội, email thông báo phục vụ sinh viên." },
      "tl.ta.date":         { en: "Sep 2025 - Jan 2026",         vi: "Tháng 9/2025 - Tháng 1/2026" },
      "tl.ta.role":         { en: "Teaching Assistant",          vi: "Trợ giảng" },
      "tl.ta.org":          { en: "UMN College of Design",       vi: "Trường Thiết kế UMN" },
      "tl.ta.desc":         { en: "Leading critiques, mentoring students on balance, rhythm, and contrast - and honestly learning just as much from them.",
                               vi: "Dẫn dắt buổi phê bình, hướng dẫn sinh viên về cân bằng, nhịp điệu và tương phản - và thú thật mình học được không kém từ các bạn." },

      "tl.intern.date":     { en: "Summer 2025",                vi: "Mùa hè 2025" },
      "tl.intern.role":     { en: "Design Intern",              vi: "Thực tập sinh Thiết kế" },
      "tl.intern.org":      { en: "University of Minnesota · College of Design", vi: "Đại học Minnesota · Trường Thiết kế" },
      "tl.intern.desc":     { en: "Assisting with design projects across the college - from social media graphics to signage to wayfinding systems.",
                               vi: "Hỗ trợ các dự án thiết kế trong trường - từ đồ họa mạng xã hội đến biển hiệu và hệ thống chỉ dẫn." },    
      
      "tl.social.date":   { en: "2024 - 2025",                vi: "2024 - 2025" },
      "tl.social.role":   { en: "Social Media Content Creator", vi: "Nhà sáng tạo nội dung Mạng xã hội" },
      "tl.social.org":    { en: "Van Gogh Museum (unofficial)", vi: "Bảo tàng Van Gogh (không chính thức)" },
      "tl.social.desc":   { en: "Creating short-form video content about art history and design for TikTok - reaching over 6K followers and 2M likes.",
                             vi: "Tạo nội dung video ngắn về lịch sử nghệ thuật và thiết kế cho TikTok - đạt hơn 6K người theo dõi và 2 triệu lượt thích." },

      // ── BOOTH ──────────────────────────────────────
      "booth.kicker":     { en: "Photo Booth", vi: "Chụp ảnh" },
      "booth.title":      { en: "Say <em>cheese</em> to take a photo strip to remember me by.",
                            vi: "Nói <em>cheese</em> để chụp một dải ảnh làm kỷ niệm nhé." },
      "booth.body":       { en: "A little souvenir from visiting my portfolio. Click start, strike four poses, and I'll print you a vintage strip you can download or share. No signup, no data saved. It all happens in your browser.",
                            vi: "Một chút quà lưu niệm khi ghé thăm portfolio của mình. Bấm bắt đầu, tạo bốn dáng, mình sẽ in cho bạn một dải ảnh kiểu vintage để tải về hoặc chia sẻ. Không đăng ký, không lưu dữ liệu. Tất cả diễn ra ngay trên trình duyệt của bạn." },
      "booth.ready":      { en: "Ready when you are.",         vi: "Sẵn sàng khi bạn muốn." },
      "booth.subinfo":    { en: "4 photos · ~20 seconds total", vi: "4 ảnh · khoảng 20 giây" },
      "booth.privacy":    { en: "Runs locally in your browser. No photos uploaded anywhere.",
                            vi: "Chạy cục bộ trong trình duyệt. Không ảnh nào được tải lên đâu cả." },
      "booth.filter":     { en: "Filter",           vi: "Bộ lọc" },
      "booth.frame":      { en: "Frame",            vi: "Khung ảnh" },
      "booth.enableCam":  { en: "📷 Enable camera", vi: "📷 Bật camera" },
      "booth.download":   { en: "↓ Download strip", vi: "↓ Tải dải ảnh" },
      "booth.retake":     { en: "↺ Retake",         vi: "↺ Chụp lại" },

      // ── PLAY ──────────────────────────────────────
      "play.kicker":     { en: "Play",            vi: "Vui chơi" },
      "play.title":      { en: "Throw an <em>ILY 🤟</em> with both hands.",
                           vi: "Tạo dấu <em>ILY 🤟</em> bằng cả hai tay." },
      "play.clickEnable":{ en: "Click \"Enable Camera\" to start", vi: "Bấm \"Bật Camera\" để bắt đầu" },
      "play.desc":       { en: "A little experiment: your webcam detects the <strong>🤟 ILY sign</strong> - raise thumb, index, and pinky on <em>both hands</em> at once.",
                           vi: "Một thử nghiệm nhỏ: webcam sẽ nhận diện dấu <strong>🤟 ILY</strong> - giơ ngón cái, trỏ và út của <em>cả hai tay</em> cùng lúc." },
      "play.left":       { en: "Left",   vi: "Trái" },
      "play.right":      { en: "Right",  vi: "Phải" },
      "play.enableCam":  { en: "Enable camera to begin", vi: "Bật camera để bắt đầu" },
      "play.reset":      { en: "↺ Reset", vi: "↺ Đặt lại" },
      "play.enableCamBtn":{ en: "📷 Enable Camera", vi: "📷 Bật Camera" },
      "play.privacy":    { en: "Camera runs locally - nothing recorded or sent.",
                           vi: "Camera chạy cục bộ - không ghi lại hay gửi đi đâu cả." },

      // ── CONTACT ───────────────────────────────────
      "contact.kicker":  { en: "Contact",                 vi: "Liên hệ" },
      "contact.title":   { en: "Let's make <em>something</em> together.",
                           vi: "Cùng tạo ra <em>điều gì đó</em> nhé." },
      "contact.lead":    { en: "Open for internships, freelance, and collaborations. Reach out any time trust me, I reply really fast.",
                           vi: "Luôn sẵn sàng cho thực tập, dự án freelance và hợp tác. Liên hệ bất cứ lúc nào - tin mình đi, mình trả lời rất nhanh." },
      "contact.email":   { en: "Email",                   vi: "Email" },

      // ── FOOTER ────────────────────────────────────
      "footer.copy":     { en: "© 2026 Nguyen Kiet Pham", vi: "© 2026 Nguyễn Kiệt Phạm" },
      "footer.tag":      { en: "Designed with color, clarity & personality ✦",
                           vi: "Thiết kế bằng màu sắc, sự rõ ràng & cá tính ✦" },
    };

    // ── Detect initial language ──────────────────────
    let currentLang = "en";
    try {
      const saved = localStorage.getItem("portfolioLang");
      if (saved === "vi" || saved === "en") {
        currentLang = saved;
      } else {
        // Auto-detect: Vietnamese browser = Vietnamese default
        const nav = (navigator.language || navigator.userLanguage || "").toLowerCase();
        if (nav.startsWith("vi")) currentLang = "vi";
      }
    } catch(e) {}

    // ── Apply translations to the whole page ─────────
    function applyLanguage(lang) {
      currentLang = lang;
      document.documentElement.lang = lang;

      // Text-only elements
      document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        const entry = DICT[key];
        if (entry && entry[lang] !== undefined) {
          el.textContent = entry[lang];
        }
      });

      // HTML elements (preserve <em>/<strong> markup)
      document.querySelectorAll("[data-i18n-html]").forEach(el => {
        const key = el.getAttribute("data-i18n-html");
        const entry = DICT[key];
        if (entry && entry[lang] !== undefined) {
          el.innerHTML = entry[lang];
        }
      });

      // Update the button label — shows the language you'd SWITCH to
      if (langLabel) langLabel.textContent = (lang === "en") ? "VI" : "EN";
      langBtn.setAttribute("aria-label", lang === "en" ? "Switch to Vietnamese" : "Switch to English");
      langBtn.setAttribute("title", lang === "en" ? "Switch to Vietnamese (L)" : "Chuyển sang Tiếng Anh (L)");

      // Save preference
      try { localStorage.setItem("portfolioLang", lang); } catch(e) {}

      // Let other modules know (for future: toasts, cat names, etc.)
      window.dispatchEvent(new CustomEvent("langchange", { detail: { lang } }));
    }

    // Apply initial
    applyLanguage(currentLang);

    // Toggle handler
    langBtn.addEventListener("click", () => {
      applyLanguage(currentLang === "en" ? "vi" : "en");
    });

    // Keyboard shortcut: L  (but only outside inputs/contenteditable)
    window.addEventListener("keydown", e => {
      if (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA") return;
      if (document.activeElement.isContentEditable) return;
      if (e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return;
      // Note: the hero canvas uses L for Letters mode — but only when hero is focused.
      // This global L handler fires regardless. Users can still access letters mode via clicking the toolbar button.
      if (e.key.toLowerCase() === "l") {
        // Only toggle language if hero canvas L-shortcut isn't the expected behavior.
        // We'll scope this to: only when the hero section is NOT in the current viewport.
        const hero = document.querySelector(".hero-canvas-section");
        if (hero) {
          const rect = hero.getBoundingClientRect();
          const heroInView = rect.bottom > 100 && rect.top < window.innerHeight * 0.6;
          if (heroInView) return;  // let hero canvas handle L
        }
        langBtn.click();
      }
    });

    // Expose for other modules to read current lang
    window.__portfolioGetLang = () => currentLang;
  })();


  // ═══════════════════════════════════════════════════
  //  THEME TOGGLE — light ⇄ dark, persisted
  // ═══════════════════════════════════════════════════
  (function initTheme() {

    const toggle = document.getElementById("themeToggle");
    if (!toggle) return;

    // Detect initial theme
    let saved = null;
    try { saved = localStorage.getItem("portfolioTheme"); } catch(e) {}
    const systemDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldDark = saved === "dark" || (!saved && systemDark);

    if (shouldDark) document.body.classList.add("dark");

    toggle.addEventListener("click", () => {
      document.body.classList.toggle("dark");
      const isDark = document.body.classList.contains("dark");
      try { localStorage.setItem("portfolioTheme", isDark ? "dark" : "light"); } catch(e) {}
    });

    // Keyboard shortcut: Shift+T (changed from T to avoid conflict with hero Add Text)
    window.addEventListener("keydown", e => {
      if (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA") return;
      if (document.activeElement.isContentEditable) return;
      if (introOverlay && !introOverlay.classList.contains("hidden")) return;
      if (e.shiftKey && e.key.toLowerCase() === "t") toggle.click();
    });
  })();


  // ═══════════════════════════════════════════════════
  //  KIẾT MART 🏪 — convenience store theme toggle
  //  Transforms the whole site into a Vietnamese corner-shop
  // ═══════════════════════════════════════════════════
  (function initStore() {
    const toggle = document.getElementById("storeToggle");
    const chime  = document.getElementById("kstoreChime");
    const receiptMeta = document.getElementById("receiptMeta");
    if (!toggle) return;

    let storeMode = false;
    try {
      if (localStorage.getItem("kstoreEnabled") === "true") storeMode = true;
    } catch(e) {}

    function updateReceiptNumber() {
      if (!receiptMeta) return;
      // Fake a receipt number based on time — feels fresh each visit
      const n = Math.floor(Math.random() * 9000 + 1000);
      const d = new Date();
      const dateStr = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
      receiptMeta.textContent = `NO. ${n} · ${dateStr}`;
    }

    function applyStoreMode(on, animate) {
      storeMode = on;
      document.body.classList.toggle("kstore", on);
      toggle.classList.toggle("active", on);
      try { localStorage.setItem("kstoreEnabled", on ? "true" : "false"); } catch(e) {}

      if (on) {
        updateReceiptNumber();
        // Re-trigger chime animation
        if (chime && animate !== false) {
          chime.style.animation = "none";
          void chime.offsetWidth;
          chime.style.animation = "";
        }
      }
    }

    // Apply saved state without playing the chime animation (avoids chime on every page load)
    if (storeMode) {
      applyStoreMode(true, false);
      // Chime already runs via CSS animation when class is added — stop it by hiding the chime on initial load
      if (chime) chime.style.display = "none";
      // Re-enable chime element for future toggles
      setTimeout(() => { if (chime) chime.style.display = ""; }, 100);
    }

    toggle.addEventListener("click", () => {
      applyStoreMode(!storeMode, true);
    });

    // Keyboard shortcut: S
    window.addEventListener("keydown", e => {
      if (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA") return;
      if (document.activeElement.isContentEditable) return;
      if (e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return;
      // S is also sticker-picker shortcut in hero — only toggle store when hero is out of view
      if (e.key.toLowerCase() === "s") {
        const hero = document.querySelector(".hero-canvas-section");
        if (hero) {
          const rect = hero.getBoundingClientRect();
          const heroInView = rect.bottom > 100 && rect.top < window.innerHeight * 0.6;
          if (heroInView) return;
        }
        toggle.click();
      }
    });
  })();



  // ═══════════════════════════════════════════════════
  //  BACKGROUND MUSIC PLAYER
  //  ⚠ Replace these URLs with your own MP3 files
  //    (or swap in a Spotify embed — see bottom of this block)
  // ═══════════════════════════════════════════════════
  (function initMusic() {
    const audio      = document.getElementById("bgAudio");
    const toggle     = document.getElementById("musicToggle");
    const player     = document.getElementById("musicPlayer");
    const titleEl    = document.getElementById("mpTitle");
    const playBtn    = document.getElementById("mpPlayPause");
    const nextBtn    = document.getElementById("mpNext");
    const prevBtn    = document.getElementById("mpPrev");
    const viz        = document.getElementById("mpViz");
    if (!audio || !toggle) return;

    // 🎵 TRACK LIST — swap these with your own MP3 URLs
    const tracks = [
      { title: "Dangrangto - Love is",  src: "soundmusic/dangrangto Love is.mp3" },
      { title: "(FREE) Lo-fi Type Beat - I Need a Girl",             src: "soundmusic/(FREE) Lo-fi Type Beat - I Need a Girl.mp3" },
      { title: "(FREE) Lo-fi Type Beat - Dreaming",                  src: "soundmusic/[Free] Pop x RnB Type Beat  Mộng Mơ  Prod. by DPablo.mp3" },
      { title: "Death Bed (Instrumental) - Powfu (feat. beabadoobee)",           src: "soundmusic/Death Bed (Instrumental) - Powfu (feat. beabadoobee).mp3" },
      { title: "SIXTYUPTOWN - ngủ đúng giờ (ft. Trung Trần)",             src: "soundmusic/SIXTYUPTOWN - ngủ đúng giờ (ft. Trung Trần).mp3" },
      { title: "Wrong Times x Sứ Thanh Hoa x Chạy Về Khóc Với Anh (prod. Renard 狐)  THIÊN SỨ ĐIỆN TỬ_ Vol.3",             src: "soundmusic/Wrong Times x Sứ Thanh Hoa x Chạy Về Khóc Với Anh (prod. Renard 狐)  THIÊN SỨ ĐIỆN TỬ_ Vol.3.mp3" },
    ];

    let current = 0;
    let isPlaying = false;
    let playerVisible = false;

    function loadTrack(idx) {
      current = (idx + tracks.length) % tracks.length;
      audio.src = tracks[current].src;
      titleEl.textContent = tracks[current].title;
    }

    function play() {
      audio.play().then(() => {
        isPlaying = true;
        document.body.classList.add("music-on");
        toggle.classList.add("active");
        viz.classList.add("active");
      }).catch(err => {
        console.warn("Audio play failed:", err);
        // Attempt next track on error
        setTimeout(() => next(), 300);
      });
    }

    function pause() {
      audio.pause();
      isPlaying = false;
      document.body.classList.remove("music-on");
      toggle.classList.remove("active");
      viz.classList.remove("active");
    }

    function next() {
      const wasPlaying = isPlaying;
      loadTrack(current + 1);
      if (wasPlaying) play();
    }

    function prev() {
      const wasPlaying = isPlaying;
      loadTrack(current - 1);
      if (wasPlaying) play();
    }

    function togglePlayer() {
      playerVisible = !playerVisible;
      player.classList.toggle("show", playerVisible);

      if (playerVisible) {
        // First time: load & play
        if (!audio.src) {
          loadTrack(0);
          play();
        } else if (!isPlaying) {
          play();
        }
      } else {
        // Hiding the card also pauses for quiet browsing
        pause();
      }
    }

    // Events
    toggle.addEventListener("click", togglePlayer);

    playBtn.addEventListener("click", e => {
      e.stopPropagation();
      if (!audio.src) loadTrack(0);
      if (isPlaying) pause(); else play();
    });

    nextBtn.addEventListener("click", e => { e.stopPropagation(); next(); });
    prevBtn.addEventListener("click", e => { e.stopPropagation(); prev(); });

    audio.addEventListener("ended", next);
    audio.addEventListener("error", () => {
      console.warn("Track failed to load, skipping:", tracks[current]?.src);
      setTimeout(next, 500);
    });

    // Keyboard shortcut: N (next) & Space inside player
    window.addEventListener("keydown", e => {
      if (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA") return;
      if (introOverlay && !introOverlay.classList.contains("hidden")) return;
      if (e.key.toLowerCase() === "n") toggle.click();
    });


    /* ──── SPOTIFY EMBED ALTERNATIVE ────
       If you'd rather embed a Spotify playlist instead of the custom player,
       replace the #musicPlayer contents in homepage.html with:

       <iframe
         style="border-radius:12px;width:300px;height:80px"
         src="https://open.spotify.com/embed/playlist/YOUR_PLAYLIST_ID"
         frameborder="0"
         allow="autoplay; clipboard-write; encrypted-media"
         loading="lazy">
       </iframe>

       …and remove the (function initMusic)() block above. */
  })();


  // ═══════════════════════════════════════════════════
  //  FULL-SCREEN MENU OVERLAY (FIXED)
  // ═══════════════════════════════════════════════════
  (function initMenu() {
    const toggle   = document.getElementById("menuToggle");
    const overlay  = document.getElementById("menuOverlay");
    const closeBtn = document.getElementById("menuClose");
    if (!toggle || !overlay) return;

    const links = overlay.querySelectorAll(".menu-link");

    function open()  {
      overlay.classList.add("open");
      overlay.setAttribute("aria-hidden", "false");
      document.body.classList.add("menu-open");
    }
    function close() {
      overlay.classList.remove("open");
      overlay.setAttribute("aria-hidden", "true");
      document.body.classList.remove("menu-open");
    }

    toggle.addEventListener("click", open);
    closeBtn.addEventListener("click", close);

    // Click outside menu-inner (on overlay bg) closes
    overlay.addEventListener("click", e => {
      if (e.target === overlay) close();
    });

    // ESC key closes
    window.addEventListener("keydown", e => {
      if (e.key === "Escape" && overlay.classList.contains("open")) close();
    });

    // Link clicks: close menu, then smooth-scroll to section
    links.forEach(link => {
      link.addEventListener("click", () => {
        close();
      });
    });
  })(); // <--- THIS WAS MISSING!

  // ═══════════════════════════════════════════════════
  //  SECTION TOAST — cute "you're here!" notifications
  // ═══════════════════════════════════════════════════
  (function initSectionToast() {
    const toast      = document.getElementById("sectionToast");
    const nameEl     = document.getElementById("toastName");
    const phraseEl   = document.getElementById("toastPhrase");
    const iconEl     = document.getElementById("toastIcon");
    if (!toast || !nameEl || !phraseEl) return;

    // 💬 Section copy — add/edit phrases to taste
    const SECTIONS = {
      home: {
        icon: "✦",
        en: { name: "Home", lines: [
          "Draw · type · sticker · even drag letters!",
          "Your playground — pick up a letter and move it.",
          "Full creative sandbox. Try the ✦ toolbar below.",
        ]},
        vi: { name: "Trang chủ", lines: [
          "Vẽ · gõ chữ · dán sticker · kéo cả từng chữ!",
          "Sân chơi của bạn — nhặt một chữ lên và di chuyển.",
          "Hộp sáng tạo đầy đủ. Thử thanh công cụ ✦ bên dưới.",
        ]},
      },
      work: {
        icon: "📁",
        en: { name: "Projects", lines: [
          "Peek inside my sketchbook.",
          "These are the keepers — carefully picked.",
          "Hover any row to catch a glimpse ✧",
        ]},
        vi: { name: "Dự án", lines: [
          "Ghé xem sổ phác của mình nhé.",
          "Đây là những tác phẩm được chọn lọc kỹ.",
          "Rê chuột vào từng hàng để xem trước ✧",
        ]},
      },
      gallery: {
        icon: "🎨",
        en: { name: "Gallery", lines: [
          "Just vibes — it loops forever.",
          "A rolling scrapbook of references.",
          "Hover to pause, let it drift to browse.",
        ]},
        vi: { name: "Bộ sưu tập", lines: [
          "Thuần vibe — lặp vô tận.",
          "Một cuốn scrapbook tham khảo đang cuộn.",
          "Rê chuột để dừng, thả ra để lướt tiếp.",
        ]},
      },
      about: {
        icon: "🌱",
        en: { name: "About Me", lines: [
          "The human behind the pixels.",
          "Designer · curious always · cat appreciator.",
          "A little about who I am and how I work.",
        ]},
        vi: { name: "Về mình", lines: [
          "Người đứng sau những pixel.",
          "Designer · luôn tò mò · mê mèo.",
          "Một chút về mình và cách mình làm việc.",
        ]},
      },
      play: {
        icon: "🤟",
        en: { name: "Play", lines: [
          "Fun zone — wave hi with both hands!",
          "An experiment, just because.",
          "Camera required · nothing is recorded.",
        ]},
        vi: { name: "Vui chơi", lines: [
          "Khu vui chơi — vẫy chào bằng cả hai tay!",
          "Một thử nghiệm nhỏ, chỉ vì vui thôi.",
          "Cần camera · không ghi lại gì cả.",
        ]},
      },
      booth: {
        icon: "📸",
        en: { name: "Photo Booth", lines: [
          "Take four photos. Strike four poses.",
          "Your souvenir from visiting ✦",
          "Vintage strips, straight to your download.",
        ]},
        vi: { name: "Chụp ảnh", lines: [
          "Chụp bốn tấm. Tạo bốn dáng.",
          "Quà lưu niệm khi bạn ghé thăm ✦",
          "Dải ảnh vintage, tải về liền tay.",
        ]},
      },
      contact: {
        icon: "💌",
        en: { name: "Contact", lines: [
          "Slide into my inbox — I reply fast.",
          "Let's make something together.",
          "Open for coffee chats & collaborations.",
        ]},
        vi: { name: "Liên hệ", lines: [
          "Nhắn tin cho mình — trả lời nhanh lắm.",
          "Cùng tạo ra điều gì đó nhé.",
          "Sẵn sàng cho chuyện cà phê & hợp tác.",
        ]},
      },
    };

    function getLang() {
      return (typeof window.__portfolioGetLang === "function") ? window.__portfolioGetLang() : "en";
    }

    let currentId  = null;
    let hideTimer  = null;
    let debounceTimer = null;
    let introGrace = true;   // suppress toast for first 2s after entry

    // Start grace period once site is ready
    function startGrace() {
      setTimeout(() => { introGrace = false; }, 2000);
    }
    if (document.body.classList.contains("site-ready")) {
      startGrace();
    } else {
      const obs = new MutationObserver(() => {
        if (document.body.classList.contains("site-ready")) {
          obs.disconnect();
          startGrace();
        }
      });
      obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    }

    function showToast(id) {
      const data = SECTIONS[id];
      if (!data) return;
      if (document.body.classList.contains("menu-open")) return; // don't interrupt menu
      if (introGrace) return;

      const lang = getLang();
      const localized = data[lang] || data.en;
      const phrase = localized.lines[Math.floor(Math.random() * localized.lines.length)];
      iconEl.textContent   = data.icon;
      nameEl.textContent   = localized.name;
      phraseEl.textContent = phrase;

      // Also translate the "You're in ✦" fixed label
      const labelEl = toast.querySelector(".toast-label");
      if (labelEl) labelEl.textContent = lang === "vi" ? "Bạn đang ở ✦" : "You're in ✦";

      // Restart animation even if already showing (retrigger bounce)
      toast.classList.remove("show");
      void toast.offsetWidth; // force reflow
      toast.classList.add("show");

      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => toast.classList.remove("show"), 3500);
    }

    function onSectionChange(id) {
      if (id === currentId) return;
      currentId = id;
      // Debounce — only fire if user settles in section for 400ms
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (currentId === id) showToast(id);
      }, 400);
    }

    // Observe sections — centre of viewport decides "current"
    const sectionEls = document.querySelectorAll("section[id]");
    const obs = new IntersectionObserver(entries => {
      // Pick entry with largest intersection ratio
      let best = null, bestRatio = -1;
      entries.forEach(en => {
        if (en.isIntersecting && en.intersectionRatio > bestRatio) {
          best = en.target;
          bestRatio = en.intersectionRatio;
        }
      });
      if (best) onSectionChange(best.getAttribute("id"));
    }, {
      rootMargin: "-30% 0px -55% 0px",
      threshold: [0, 0.25, 0.5, 0.75, 1],
    });
    sectionEls.forEach(s => obs.observe(s));
  })();


  // ═══════════════════════════════════════════════════
  //  TIMEZONE MARQUEE — live clocks for 6 cities
  // ═══════════════════════════════════════════════════
  (function initTimezones() {
    const items = document.querySelectorAll(".tz-item[data-tz]");
    if (!items.length) return;

    function updateAll() {
      const now = new Date();
      items.forEach(item => {
        const tz = item.dataset.tz;
        const timeEl = item.querySelector(".tz-time");
        if (!timeEl) return;
        try {
          timeEl.textContent = new Intl.DateTimeFormat("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: tz,
          }).format(now);
        } catch (err) {
          timeEl.textContent = "--:--";
        }
      });
    }

    updateAll();
    // Align to the next full minute, then tick every minute
    const msToNextMinute = 60000 - (Date.now() % 60000);
    setTimeout(() => {
      updateAll();
      setInterval(updateAll, 60000);
    }, msToNextMinute);
  })();


  // ═══════════════════════════════════════════════════════
  //  PHOTO BOOTH — vintage 4-shot strip generator
  // ═══════════════════════════════════════════════════════
  (function initPhotoBooth() {
    const cam         = document.getElementById("boothCam");
    const video       = document.getElementById("boothVideo");
    const canvas      = document.getElementById("boothCanvas");
    const placeholder = document.getElementById("boothPlaceholder");
    const startBtn    = document.getElementById("boothStart");
    const downloadBtn = document.getElementById("boothDownload");
    const retakeBtn   = document.getElementById("boothRetake");
    const countdown   = document.getElementById("boothCountdown");
    const countNumber = document.getElementById("boothCountNumber");
    const flash       = document.getElementById("boothFlash");
    const strip       = document.getElementById("boothStrip");
    const stripDate   = document.getElementById("stripDate");
    const pips        = document.querySelectorAll(".pip");
    const slots       = document.querySelectorAll(".strip-slot");
    const filterBtns  = document.querySelectorAll(".filter-btn");
    const frameBtns   = document.querySelectorAll(".frame-btn");

    if (!cam || !video || !canvas) return;

    let stream = null;
    let camReady = false;
    let isCapturing = false;
    let currentFilter = "color";
    let currentFrame  = "classic";
    const shots = [];    // array of dataURLs

    // ── Filter buttons ─────────────────────────────────
    filterBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        filterBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentFilter = btn.dataset.filter;
        cam.classList.remove("filter-color", "filter-bw", "filter-sepia");
        cam.classList.add(`filter-${currentFilter}`);
      });
    });

    // ── Frame buttons ──────────────────────────────────
    frameBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        frameBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentFrame = btn.dataset.frame;
        strip.classList.remove("frame-classic","frame-doodle","frame-love","frame-sparkle");
        if (currentFrame !== "classic") strip.classList.add(`frame-${currentFrame}`);
      });
    });

    // ── Set strip date ─────────────────────────────────
    function updateStripDate() {
      const d = new Date();
      const mm = String(d.getMonth()+1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const yy = String(d.getFullYear()).slice(-2);
      stripDate.textContent = `${mm}·${dd}·${yy}`;
    }
    updateStripDate();

    // ── Enable camera ──────────────────────────────────
    async function enableCamera() {
      if (camReady) { startSequence(); return; }
      try {
        startBtn.disabled = true;
        startBtn.textContent = "Starting camera…";
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } },
          audio: false,
        });
        video.srcObject = stream;
        await video.play();
        camReady = true;
        cam.classList.add("live");
        placeholder.classList.add("hidden");
        startBtn.disabled = false;
        startBtn.textContent = "📸 Start sequence";
      } catch (err) {
        console.warn("[booth] camera denied:", err);
        startBtn.textContent = "⚠️ Camera access needed";
        startBtn.disabled = false;
      }
    }

    // ── Capture one frame from video → dataURL ─────────
    function capturePhoto() {
      const vw = video.videoWidth  || 1280;
      const vh = video.videoHeight || 960;
      canvas.width = vw;
      canvas.height = vh;
      const ctx = canvas.getContext("2d");
      ctx.save();
      // Mirror horizontally to match what user sees
      ctx.translate(vw, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, vw, vh);
      ctx.restore();

      // Apply filter at canvas level for the saved output
      if (currentFilter === "bw" || currentFilter === "sepia") {
        const imgData = ctx.getImageData(0, 0, vw, vh);
        const d = imgData.data;
        if (currentFilter === "bw") {
          for (let i = 0; i < d.length; i += 4) {
            const g = d[i]*0.299 + d[i+1]*0.587 + d[i+2]*0.114;
            d[i] = d[i+1] = d[i+2] = g;
          }
        } else { // sepia
          for (let i = 0; i < d.length; i += 4) {
            const r = d[i], g = d[i+1], b = d[i+2];
            d[i]   = Math.min(255, r*0.393 + g*0.769 + b*0.189);
            d[i+1] = Math.min(255, r*0.349 + g*0.686 + b*0.168);
            d[i+2] = Math.min(255, r*0.272 + g*0.534 + b*0.131);
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }

      return canvas.toDataURL("image/jpeg", 0.9);
    }

    // ── Countdown helper ───────────────────────────────
    function countdownTick(n) {
      return new Promise(resolve => {
        countNumber.textContent = n;
        countdown.classList.add("active");
        // Re-trigger the CSS animation
        countNumber.style.animation = "none";
        void countNumber.offsetWidth;
        countNumber.style.animation = "";
        setTimeout(resolve, 1000);
      });
    }

    function flashNow() {
      flash.classList.remove("flash");
      void flash.offsetWidth;
      flash.classList.add("flash");
    }

    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    // ── Main sequence ──────────────────────────────────
    async function startSequence() {
      if (isCapturing || !camReady) return;
      isCapturing = true;
      shots.length = 0;
      slots.forEach(s => {
        s.classList.remove("has-photo");
        const existingImg = s.querySelector("img");
        if (existingImg) existingImg.remove();
      });
      pips.forEach(p => p.classList.remove("done"));
      downloadBtn.disabled = true;
      retakeBtn.disabled = true;
      startBtn.disabled = true;
      startBtn.textContent = "📸 Rolling…";

      for (let shot = 1; shot <= 4; shot++) {
        // 3-2-1 countdown
        await countdownTick(3);
        await countdownTick(2);
        await countdownTick(1);

        // Capture
        countdown.classList.remove("active");
        flashNow();
        const dataURL = capturePhoto();
        shots.push(dataURL);

        // Put into slot
        const slot = slots[shot - 1];
        const img = document.createElement("img");
        img.src = dataURL;
        img.alt = `Photo ${shot}`;
        slot.appendChild(img);
        slot.classList.add("has-photo");

        // Mark pip
        pips[shot - 1].classList.add("done");

        // Brief pause before next round (unless last)
        if (shot < 4) await sleep(700);
      }

      // Done
      isCapturing = false;
      updateStripDate();
      downloadBtn.disabled = false;
      retakeBtn.disabled = false;
      startBtn.disabled = false;
      startBtn.textContent = "📸 Take again";
    }

    // ── Reset ──────────────────────────────────────────
    function resetStrip() {
      shots.length = 0;
      slots.forEach(s => {
        s.classList.remove("has-photo");
        const existingImg = s.querySelector("img");
        if (existingImg) existingImg.remove();
      });
      pips.forEach(p => p.classList.remove("done"));
      downloadBtn.disabled = true;
      retakeBtn.disabled = true;
      startBtn.textContent = camReady ? "📸 Start sequence" : "📷 Enable camera";
    }

    // ── Download: render the strip to a canvas ─────────
    function downloadStrip() {
      if (shots.length !== 4) return;

      // Render a tall strip canvas at print-ready resolution
      const W = 600;
      const PHOTO_H = 450;                     // 4:3 aspect
      const PAD = 24;
      const FOOTER_H = 90;
      const GAP = 16;
      const H = PAD + (PHOTO_H * 4) + (GAP * 3) + FOOTER_H + PAD;

      const out = document.createElement("canvas");
      out.width = W;
      out.height = H;
      const ctx = out.getContext("2d");

      // Background based on frame
      let bg = "#f8f5e8";
      if (currentFrame === "doodle")  bg = "#fff8c7";
      if (currentFrame === "love")    bg = "#ffe8ee";
      if (currentFrame === "sparkle") {
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, "#fff8c7");
        grad.addColorStop(1, "#ffe8ee");
        bg = grad;
      }
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Load each shot and draw it
      const photoW = W - (PAD * 2);
      let loaded = 0;
      const imgs = shots.map(() => new Image());
      shots.forEach((src, i) => { imgs[i].src = src; });

      function tryCompose() {
        loaded++;
        if (loaded < 4) return;

        // Draw photos
        imgs.forEach((img, i) => {
          const y = PAD + i * (PHOTO_H + GAP);
          // Cover fit crop
          const srcAspect = img.width / img.height;
          const dstAspect = photoW / PHOTO_H;
          let sx = 0, sy = 0, sw = img.width, sh = img.height;
          if (srcAspect > dstAspect) {
            sw = img.height * dstAspect;
            sx = (img.width - sw) / 2;
          } else {
            sh = img.width / dstAspect;
            sy = (img.height - sh) / 2;
          }
          ctx.drawImage(img, sx, sy, sw, sh, PAD, y, photoW, PHOTO_H);
        });

        // Frame accents
        if (currentFrame === "doodle") {
          ctx.fillStyle = "#2149e3";
          ctx.font = "bold 30px Inter, sans-serif";
          ctx.textAlign = "left";
          ctx.globalAlpha = 0.7;
          ctx.fillText("✦", 12, 36);
          ctx.textAlign = "right";
          ctx.fillText("✦", W - 12, H - FOOTER_H - 8);
          ctx.globalAlpha = 1;
        } else if (currentFrame === "love") {
          ctx.fillStyle = "#ff7bb8";
          ctx.font = "24px Inter, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("♥ ♥ ♥ ♥ ♥", W/2, 28);
        } else if (currentFrame === "sparkle") {
          ctx.fillStyle = "#c9a020";
          ctx.font = "18px Inter, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("✦ · ✦ · ✦ · ✦ · ✦", W/2, 24);
        }

        // Footer
        const footerY = PAD + (PHOTO_H * 4) + (GAP * 3) + 32;
        ctx.fillStyle = "#425b05";
        ctx.font = "bold 18px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.letterSpacing = "0.22em";
        ctx.fillText("NGUYEN KIET PHAM", W/2, footerY);

        ctx.font = "italic 16px 'Instrument Serif', Georgia, serif";
        ctx.fillStyle = "#5a6e2c";
        ctx.fillText(stripDate.textContent, W/2, footerY + 28);

        // Trigger download
        const dataURL = out.toDataURL("image/png");
        const link = document.createElement("a");
        link.download = `kiet-photobooth-${Date.now()}.png`;
        link.href = dataURL;
        link.click();
      }

      imgs.forEach(img => {
        img.onload = tryCompose;
        img.onerror = tryCompose;
      });
    }

    // ── Wire up buttons ────────────────────────────────
    startBtn.addEventListener("click", () => {
      if (!camReady) enableCamera().then(() => { if (camReady) startSequence(); });
      else startSequence();
    });
    retakeBtn.addEventListener("click", () => { resetStrip(); startSequence(); });
    downloadBtn.addEventListener("click", downloadStrip);

    // Set default filter class
    cam.classList.add("filter-color");
  })();


  // ═══════════════════════════════════════════════════════
  //  PETS 🐱🐕 — cats wander, dogs jump, hearts everywhere
  // ═══════════════════════════════════════════════════════
  (function initCats() {
    const layer  = document.getElementById("catLayer");
    const toggle = document.getElementById("catToggle");
    if (!layer || !toggle) return;

    const catEls = Array.from(layer.querySelectorAll(".cat"));
    const dogEls = Array.from(layer.querySelectorAll(".dog"));
    const allEls = [...catEls, ...dogEls];
    if (!allEls.length) return;

    // ── Pet state — works for both cats & dogs ────────
    function makePet(el, idx, total, kind) {
      return {
        el,
        kind,   // "cat" or "dog"
        name: el.dataset.name,
        // Spread them across viewport width on init
        x: window.innerWidth  * ((idx + 0.5) / total),
        y: window.innerHeight - 100 - (idx % 3) * 40,   // stagger heights
        targetX: 0,
        targetY: 0,
        speed: kind === "dog"
          ? 1.2 + Math.random() * 0.5     // dogs faster
          : 0.9 + Math.random() * 0.4,    // cats slower
        state: "walking",
        stateTimer: 0,
        facingRight: idx % 2 === 0,   // half face right initially for variety
        petCount: 0,
        lastPetTime: 0,
        jumpCooldown: 0,
        eyesOpen: el.querySelector(kind === "dog" ? ".dog-eyes-open" : ".cat-eyes-open"),
        eyesClosed: el.querySelector(kind === "dog" ? ".dog-eyes-closed" : ".cat-eyes-closed"),
        blush: el.querySelector(kind === "dog" ? ".dog-blush" : ".cat-blush"),
      };
    }

    const PETS = [];
    catEls.forEach((el, i) => PETS.push(makePet(el, i, allEls.length, "cat")));
    dogEls.forEach((el, i) => PETS.push(makePet(el, catEls.length + i, allEls.length, "dog")));

    // Mouse tracking
    let mouseX = -1000, mouseY = -1000;
    let mouseMoveTime = 0;
    window.addEventListener("mousemove", e => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      mouseMoveTime = performance.now();
    });

    // ── Helpers ───────────────────────────────────────
    function pickRandomTarget(pet) {
      const minX = 80;
      const maxX = window.innerWidth - 100;
      const minY = window.innerHeight * 0.35;
      const maxY = window.innerHeight - 100;
      pet.targetX = minX + Math.random() * (maxX - minX);
      pet.targetY = minY + Math.random() * (maxY - minY);
    }

    function setState(pet, state) {
      if (pet.state === state) return;
      pet.state = state;
      pet.el.classList.remove("walking", "sleeping", "happy", "sitting", "jumping");
      pet.stateTimer = 0;
      if (state === "walking" || state === "following") {
        pet.el.classList.add("walking");
        setEyes(pet, true);
      } else if (state === "sleeping") {
        pet.el.classList.add("sleeping");
        setEyes(pet, false);
      } else if (state === "happy") {
        pet.el.classList.add("happy");
        setEyes(pet, true);
        if (pet.blush) pet.blush.style.opacity = "1";
      } else if (state === "sitting") {
        pet.el.classList.add("sitting");
        setEyes(pet, true);
      } else if (state === "jumping") {
        pet.el.classList.add("happy", "jumping");
        setEyes(pet, true);
        if (pet.blush) pet.blush.style.opacity = "1";
      }
      if (state !== "happy" && state !== "jumping" && pet.blush) {
        pet.blush.style.opacity = "0";
      }
    }

    function setEyes(pet, open) {
      if (!pet.eyesOpen || !pet.eyesClosed) return;
      if (open) {
        pet.eyesOpen.style.display = "";
        pet.eyesClosed.style.display = "none";
      } else {
        pet.eyesOpen.style.display = "none";
        pet.eyesClosed.style.display = "";
      }
    }

    function spawnHeart(pet) {
      const heart = document.createElement("span");
      heart.className = "cat-heart";
      heart.textContent = "♥";
      const rect = pet.el.getBoundingClientRect();
      heart.style.left = (rect.left + rect.width / 2) + "px";
      heart.style.top  = (rect.top - 6) + "px";
      heart.style.setProperty("--r", (Math.random() - 0.5) * 30 + "deg");
      document.body.appendChild(heart);
      setTimeout(() => heart.remove(), 1300);
    }

    function spawnSparkles(pet) {
      // Burst of sparkles/stars when a dog jumps
      const rect = pet.el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const symbols = ["✦", "✧", "⭐", "✨", "♥"];
      const colors = ["var(--accent-yellow)", "var(--accent-pink)", "var(--accent-blue)", "var(--accent-coral)"];
      for (let i = 0; i < 5; i++) {
        const s = document.createElement("span");
        s.className = "dog-sparkle";
        s.textContent = symbols[Math.floor(Math.random() * symbols.length)];
        s.style.color = colors[Math.floor(Math.random() * colors.length)];
        s.style.left = cx + "px";
        s.style.top  = cy + "px";
        const angle = (Math.PI * 2 * i) / 5 + Math.random() * 0.5;
        const dist = 40 + Math.random() * 30;
        s.style.setProperty("--dx", Math.cos(angle) * dist + "px");
        s.style.setProperty("--dy", (Math.sin(angle) * dist - 20) + "px");
        document.body.appendChild(s);
        setTimeout(() => s.remove(), 850);
      }
    }

    function jumpDog(pet) {
      // Interrupt whatever the dog is doing and trigger jump animation
      pet.el.classList.remove("walking", "sitting", "sleeping");
      pet.el.classList.add("happy");
      if (pet.blush) pet.blush.style.opacity = "1";
      // Remove + re-add 'jumping' to restart animation if it's already running
      pet.el.classList.remove("jumping");
      void pet.el.offsetWidth;
      pet.el.classList.add("jumping");
      spawnSparkles(pet);
      spawnHeart(pet);
      pet.state = "jumping";
      pet.stateTimer = 0;
      pet.jumpCooldown = 650;   // tiny cooldown before next jump
    }

    // ── Pet interaction ───────────────────────────────
    PETS.forEach(pet => {
      pet.el.addEventListener("mousemove", () => {
        const now = performance.now();
        if (now - pet.lastPetTime > 250) {
          pet.lastPetTime = now;
          pet.petCount++;
          spawnHeart(pet);
          if (pet.kind === "dog" && pet.jumpCooldown <= 0) {
            jumpDog(pet);
          } else if (pet.kind === "cat") {
            setState(pet, "happy");
            pet.stateTimer = 0;
          }
        }
      });

      pet.el.addEventListener("click", () => {
        if (pet.kind === "dog") {
          jumpDog(pet);
          spawnSparkles(pet);
        } else {
          setState(pet, "happy");
          spawnHeart(pet);
          spawnHeart(pet);
        }
      });
    });

    // ── Main animation loop ───────────────────────────
    let lastTime = performance.now();
    function tick(now) {
      const dt = Math.min(50, now - lastTime);
      lastTime = now;

      const mouseIsRecent = (now - mouseMoveTime) < 8000;

      PETS.forEach(pet => {
        pet.stateTimer += dt;
        if (pet.jumpCooldown > 0) pet.jumpCooldown -= dt;

        // State transitions
        if (pet.state === "jumping") {
          // Jump animation lasts ~550ms
          if (pet.stateTimer > 560) {
            setState(pet, "walking");
            pickRandomTarget(pet);
          }
          // Don't move during jump
        } else if (pet.state === "happy") {
          if (pet.stateTimer > 2500) {
            setState(pet, "walking");
            pickRandomTarget(pet);
          }
        } else if (pet.state === "sleeping") {
          const dx = mouseX - (pet.x + pet.el.offsetWidth / 2);
          const dy = mouseY - (pet.y + pet.el.offsetHeight / 2);
          const dist = Math.hypot(dx, dy);
          if (dist < 140 && mouseIsRecent) {
            setState(pet, "walking");
            pickRandomTarget(pet);
          }
        } else if (pet.state === "sitting") {
          if (pet.stateTimer > 4000 + Math.random() * 3000) {
            // Dogs almost never sleep, cats sometimes do
            const sleepChance = pet.kind === "dog" ? 0.05 : 0.2;
            if (Math.random() < sleepChance) {
              setState(pet, "sleeping");
            } else {
              setState(pet, "walking");
              pickRandomTarget(pet);
            }
          }
        } else if (pet.state === "walking" || pet.state === "following") {
          const dxM = mouseX - (pet.x + pet.el.offsetWidth / 2);
          const dyM = mouseY - (pet.y + pet.el.offsetHeight / 2);
          const distToMouse = Math.hypot(dxM, dyM);

          // Dogs follow eagerly (even without being petted); cats need trust
          const followThreshold = pet.kind === "dog" ? 380 : 320;
          const needsPetting = pet.kind === "cat";
          const willFollow = mouseIsRecent
            && distToMouse < followThreshold
            && distToMouse > 90
            && (!needsPetting || pet.petCount > 0);

          if (willFollow) {
            pet.targetX = mouseX - pet.el.offsetWidth / 2;
            pet.targetY = mouseY - 10;
            pet.state = "following";
            pet.el.classList.add("walking");
          } else if (pet.state === "following") {
            pet.state = "walking";
            pickRandomTarget(pet);
          }

          const dx = pet.targetX - pet.x;
          const dy = pet.targetY - pet.y;
          const dist = Math.hypot(dx, dy);

          if (dist < 8) {
            if (pet.state === "following") {
              setState(pet, "sitting");
            } else {
              const r = Math.random();
              if (pet.kind === "dog") {
                // Dogs: mostly sit briefly, rarely sleep, sometimes self-jump
                if (r < 0.55) setState(pet, "sitting");
                else if (r < 0.62) {
                  // Random happy bounce
                  jumpDog(pet);
                } else {
                  pickRandomTarget(pet);
                }
              } else {
                // Cats: sit / sleep / keep wandering
                if (r < 0.4) setState(pet, "sitting");
                else if (r < 0.55) setState(pet, "sleeping");
                else pickRandomTarget(pet);
              }
            }
          } else {
            const speed = pet.speed * (dt / 16);
            const step = Math.min(dist, speed);
            pet.x += (dx / dist) * step;
            pet.y += (dy / dist) * step;

            // SVGs are drawn facing LEFT by default. The .facing-right class flips them.
            const wasFacingRight = pet.facingRight;
            pet.facingRight = dx > 0;
            if (wasFacingRight !== pet.facingRight) {
              pet.el.classList.toggle("facing-right", pet.facingRight);
            }
          }
        }

        // Bounds
        pet.x = Math.max(10, Math.min(window.innerWidth  - pet.el.offsetWidth  - 10, pet.x));
        pet.y = Math.max(60, Math.min(window.innerHeight - pet.el.offsetHeight - 10, pet.y));

        pet.el.style.transform = `translate(${pet.x}px, ${pet.y}px)`;
      });

      requestAnimationFrame(tick);
    }

    PETS.forEach(pet => {
      pet.el.classList.toggle("facing-right", pet.facingRight);
      pickRandomTarget(pet);
      setState(pet, "walking");
    });
    requestAnimationFrame(tick);

    // ── Toggle show/hide — separate for cats and dogs ──
    const dogToggle = document.getElementById("dogToggle");

    let catsEnabled = true;
    let dogsEnabled = true;
    try {
      if (localStorage.getItem("catsEnabled") === "false") catsEnabled = false;
      if (localStorage.getItem("dogsEnabled") === "false") dogsEnabled = false;
    } catch(e) {}

    function applyVisibility() {
      // Per-element display control
      catEls.forEach(el => {
        el.style.display = catsEnabled ? "" : "none";
      });
      dogEls.forEach(el => {
        el.style.display = dogsEnabled ? "" : "none";
      });
      // Button active states
      toggle.classList.toggle("active", catsEnabled);
      if (dogToggle) dogToggle.classList.toggle("active", dogsEnabled);
      // Persist
      try {
        localStorage.setItem("catsEnabled", catsEnabled ? "true" : "false");
        localStorage.setItem("dogsEnabled", dogsEnabled ? "true" : "false");
      } catch(e) {}
    }
    applyVisibility();

    toggle.addEventListener("click", () => {
      catsEnabled = !catsEnabled;
      applyVisibility();
    });

    if (dogToggle) {
      dogToggle.addEventListener("click", () => {
        dogsEnabled = !dogsEnabled;
        applyVisibility();
      });
    }

    window.addEventListener("keydown", e => {
      if (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA") return;
      if (document.activeElement.isContentEditable) return;
      if (e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "k") toggle.click();         // K = toggle cats
      else if (k === "g") { if (dogToggle) dogToggle.click(); }  // G = toggle dogs
    });

    window.addEventListener("resize", () => {
      PETS.forEach(pet => {
        pet.x = Math.min(pet.x, window.innerWidth  - pet.el.offsetWidth  - 10);
        pet.y = Math.min(pet.y, window.innerHeight - pet.el.offsetHeight - 10);
      });
    });

  })();

});