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

  const processSection = document.querySelector(".offering-process");
  const processLine = document.querySelector("[data-process-line]");
  let processFrame;

  const updateProcess = () => {
    processFrame = undefined;
    if (!processSection || !processLine) return;
    const rect = processSection.getBoundingClientRect();
    const distance = Math.max(1, rect.height + innerHeight * 0.35);
    const progress = Math.max(0, Math.min(1, (innerHeight * 0.78 - rect.top) / distance));
    processLine.style.setProperty("--process-progress", `${(progress * 100).toFixed(2)}%`);
  };

  if (processSection && !reduceMotion.matches) {
    const queueProcessUpdate = () => {
      if (!processFrame) processFrame = requestAnimationFrame(updateProcess);
    };
    window.addEventListener("scroll", queueProcessUpdate, { passive: true });
    window.addEventListener("resize", queueProcessUpdate, { passive: true });
    updateProcess();
  } else if (processLine) {
    processLine.style.setProperty("--process-progress", "100%");
  }
})();
