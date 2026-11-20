const projectLink = document.querySelector(".project-link");
const workMenuWrap = document.querySelector(".work-menu-wrap");
const workMenuButton = document.querySelector(".work-link");
const workMenu = document.querySelector(".work-menu");
const dreamGridHeading = document.querySelector(".dream-grid-heading");
const dreamGridItems = Array.from(document.querySelectorAll(".dream-grid-item"));
const dreamCards = Array.from(document.querySelectorAll(".dream-card"));

if (projectLink) {
  projectLink.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "touch") return;

    const bounds = projectLink.getBoundingClientRect();
    const enteredFromRight = event.clientX > bounds.left + bounds.width / 2;
    projectLink.style.setProperty("--fill-start", enteredFromRight ? "102%" : "-102%");
  });
}

if (workMenuWrap && workMenuButton && workMenu) {
  const menuItems = Array.from(workMenu.querySelectorAll("a[role='menuitem']"));

  const setMenuOpen = (isOpen, { focusFirst = false, restoreFocus = false } = {}) => {
    workMenuButton.setAttribute("aria-expanded", String(isOpen));
    workMenu.setAttribute("aria-hidden", String(!isOpen));
    workMenu.toggleAttribute("inert", !isOpen);

    if (isOpen) {
      workMenu.dataset.open = "true";
      if (focusFirst) menuItems[0]?.focus();
    } else {
      delete workMenu.dataset.open;
      if (restoreFocus) workMenuButton.focus();
    }
  };

  const isMenuOpen = () => workMenuButton.getAttribute("aria-expanded") === "true";

  workMenuButton.addEventListener("click", () => {
    setMenuOpen(!isMenuOpen());
  });

  workMenuButton.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setMenuOpen(true, { focusFirst: true });
    }
  });

  workMenu.addEventListener("keydown", (event) => {
    if (!menuItems.length) return;

    const currentIndex = menuItems.indexOf(document.activeElement);
    let nextIndex = currentIndex;

    if (event.key === "ArrowDown") nextIndex = (currentIndex + 1) % menuItems.length;
    if (event.key === "ArrowUp") nextIndex = (currentIndex - 1 + menuItems.length) % menuItems.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = menuItems.length - 1;

    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      menuItems[nextIndex]?.focus();
    }
  });

  document.addEventListener("pointerdown", (event) => {
    if (isMenuOpen() && !workMenuWrap.contains(event.target)) setMenuOpen(false);
  });

  document.addEventListener("focusin", (event) => {
    if (isMenuOpen() && !workMenuWrap.contains(event.target)) setMenuOpen(false);
  });

  menuItems.forEach((item) => item.addEventListener("click", () => setMenuOpen(false)));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isMenuOpen()) {
      event.preventDefault();
      setMenuOpen(false, { restoreFocus: true });
    }
  });
}

if (dreamGridHeading && dreamGridItems.length && dreamCards.length) {
  document.documentElement.classList.add("has-dream-grid");

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealTargets = [dreamGridHeading, ...dreamGridItems];

  if (reducedMotion || !("IntersectionObserver" in window)) {
    revealTargets.forEach((target) => target.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8%", threshold: 0.12 },
    );

    revealTargets.forEach((target) => revealObserver.observe(target));
  }

  dreamCards.forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch" || reducedMotion) return;

      const bounds = card.getBoundingClientRect();
      const relativeX = (event.clientX - bounds.left) / bounds.width;
      const relativeY = (event.clientY - bounds.top) / bounds.height;
      card.style.setProperty("--dream-x", `${(relativeX - 0.5) * 10}px`);
      card.style.setProperty("--dream-y", `${(relativeY - 0.5) * 10}px`);
      card.style.setProperty("--dream-origin-x", `${relativeX * 100}%`);
      card.style.setProperty("--dream-origin-y", `${relativeY * 100}%`);
    });

    card.addEventListener("pointerleave", () => {
      card.style.setProperty("--dream-x", "0px");
      card.style.setProperty("--dream-y", "0px");
    });
  });
}
