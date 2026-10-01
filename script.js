const projectLink = document.querySelector(".project-link");
const workMenuWrap = document.querySelector(".work-menu-wrap");
const workMenuButton = document.querySelector(".work-link");
const workMenu = document.querySelector(".work-menu");

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

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isMenuOpen()) {
      event.preventDefault();
      setMenuOpen(false, { restoreFocus: true });
    }
  });
}
