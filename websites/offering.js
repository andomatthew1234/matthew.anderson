(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const revealNodes = [...document.querySelectorAll("[data-offering-reveal]")];

  root.classList.add("offering-enhanced");

  if (reduceMotion.matches || !("IntersectionObserver" in window)) {
    revealNodes.forEach((node) => node.classList.add("is-visible"));
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8%", threshold: 0.12 },
    );
    revealNodes.forEach((node) => observer.observe(node));
  }

  const browser = document.querySelector("[data-offering-browser]");
  let browserRect;
  let pendingPointer;
  let pointerFrame;

  const setBrowserPosition = (x = 0, y = 0) => {
    if (!browser) return;
    browser.style.setProperty("--cursor-x", x.toFixed(3));
    browser.style.setProperty("--cursor-y", y.toFixed(3));
    browser.dataset.layout = Math.abs(x) + Math.abs(y) > 0.7 ? "alternate" : "default";
  };

  const renderPointer = () => {
    pointerFrame = undefined;
    if (!pendingPointer || !browserRect) return;
    const x = Math.max(-1, Math.min(1, ((pendingPointer.x - browserRect.left) / browserRect.width - 0.5) * 2));
    const y = Math.max(-1, Math.min(1, ((pendingPointer.y - browserRect.top) / browserRect.height - 0.5) * 2));
    setBrowserPosition(x, y);
  };

  if (browser && !reduceMotion.matches) {
    browser.addEventListener("pointerenter", () => { browserRect = browser.getBoundingClientRect(); });
    browser.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch") return;
      pendingPointer = { x: event.clientX, y: event.clientY };
      if (!pointerFrame) pointerFrame = requestAnimationFrame(renderPointer);
    });
    browser.addEventListener("pointerleave", () => setBrowserPosition());
    browser.addEventListener("focus", () => setBrowserPosition(0.8, -0.45));
    browser.addEventListener("blur", () => setBrowserPosition());
    browser.addEventListener("click", () => {
      if (!matchMedia("(hover: none)").matches) return;
      const alternate = browser.dataset.layout !== "alternate";
      setBrowserPosition(alternate ? 0.8 : 0, alternate ? -0.45 : 0);
    });
    window.addEventListener("resize", () => { browserRect = undefined; }, { passive: true });
  }

  const flipCards = [...document.querySelectorAll("[data-flip-card]")];
  const setCardState = (card, open) => {
    const title = card.querySelector(".why-card__title")?.textContent.trim() || "this card";
    card.setAttribute("aria-pressed", String(open));
    card.setAttribute("aria-label", open ? `Close details about ${title}` : `Read more about ${title}`);
    card.querySelector(".why-card__front")?.setAttribute("aria-hidden", String(open));
    card.querySelector(".why-card__back")?.setAttribute("aria-hidden", String(!open));
  };

  flipCards.forEach((card) => {
    setCardState(card, false);
    card.addEventListener("click", () => {
      const willOpen = card.getAttribute("aria-pressed") !== "true";
      flipCards.forEach((other) => setCardState(other, other === card && willOpen));
    });
  });

  const projects = window.PORTFOLIO_PROJECTS || [];
  const projectItems = [...document.querySelectorAll("[data-project-index]")].filter((node) => node.matches("button"));
  const projectPreview = document.querySelector(".project-index__preview");
  const projectImage = document.querySelector("[data-project-image]");
  const projectName = document.querySelector("[data-project-name]");
  const projectCategory = document.querySelector("[data-project-category]");
  const projectCount = document.querySelector("[data-project-count]");
  const projectLinks = [...document.querySelectorAll("[data-project-link]")];
  let persistentIndex = 0;
  let imageRequest = 0;

  const applyProject = (index) => {
    const project = projects[index];
    if (!project || !projectImage) return;
    const request = ++imageRequest;
    projectPreview?.classList.add("is-changing");
    projectName.textContent = project.name;
    projectCategory.textContent = project.category;
    projectCount.textContent = `${String(index + 1).padStart(2, "0")} / ${String(projects.length).padStart(2, "0")}`;
    projectLinks.forEach((link) => { link.href = project.url; });
    projectItems.forEach((item, itemIndex) => {
      const active = itemIndex === index;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-selected", String(active));
      item.tabIndex = active ? 0 : -1;
    });
    projectPreview?.setAttribute("aria-labelledby", `project-tab-${index + 1}`);

    const swapImage = () => {
      if (request !== imageRequest) return;
      projectImage.src = project.image;
      projectImage.alt = project.alt;
      projectImage.width = project.width;
      projectImage.height = project.height;
      requestAnimationFrame(() => projectPreview?.classList.remove("is-changing"));
    };
    if (projectImage.src === project.image) {
      swapImage();
      return;
    }
    const preload = new Image();
    preload.onload = swapImage;
    preload.onerror = swapImage;
    preload.src = project.image;
  };

  projectItems.forEach((item, index) => {
    item.id = `project-tab-${index + 1}`;
    item.addEventListener("click", () => {
      persistentIndex = index;
      applyProject(index);
    });
    item.addEventListener("focus", () => applyProject(index));
    item.addEventListener("pointerenter", (event) => {
      if (event.pointerType !== "touch") applyProject(index);
    });
    item.addEventListener("keydown", (event) => {
      const keys = ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Home", "End"];
      if (!keys.includes(event.key)) return;
      event.preventDefault();
      const direction = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
      const nextIndex = event.key === "Home"
        ? 0
        : event.key === "End"
          ? projectItems.length - 1
          : (index + direction + projectItems.length) % projectItems.length;
      persistentIndex = nextIndex;
      projectItems[nextIndex].focus();
      applyProject(nextIndex);
    });
  });

  if (projectItems.length && projects.length) applyProject(0);
})();
