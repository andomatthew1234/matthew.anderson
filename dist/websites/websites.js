(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const revealNodes = [...document.querySelectorAll("[data-anatomy-reveal]")];

  root.classList.add("anatomy-enhanced");

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

  const anatomyVisual = document.querySelector("[data-anatomy-visual]");
  const anatomyCaption = document.querySelector("[data-anatomy-caption]");
  const layerControls = [...document.querySelectorAll("[data-layer]")];
  const layerCaptions = {
    idea: "The reason the website needs to exist.",
    structure: "The paths that make information easy to find.",
    identity: "The visual voice that makes the experience recognisable.",
    content: "The words and images that give people something worth finding.",
    interaction: "The responses that make the page feel intuitive and alive.",
    technology: "The reliable foundation underneath everything people see.",
  };

  const activateLayer = (layer) => {
    if (!anatomyVisual || !layerCaptions[layer]) return;
    anatomyVisual.dataset.activeLayer = layer;
    anatomyCaption.textContent = layerCaptions[layer];
    layerControls.forEach((control) => {
      const active = control.dataset.layer === layer;
      control.classList.toggle("is-active", active);
      control.setAttribute("aria-pressed", String(active));
    });
  };

  layerControls.forEach((control) => {
    control.addEventListener("click", () => activateLayer(control.dataset.layer));
    control.addEventListener("focus", () => activateLayer(control.dataset.layer));
    control.addEventListener("pointerenter", (event) => {
      if (event.pointerType !== "touch") activateLayer(control.dataset.layer);
    });
  });

  const assemblyBrowser = document.querySelector("[data-assembly-browser]");
  const assemblyControls = [...document.querySelectorAll("[data-part]")];
  const assemblyLabel = document.querySelector("[data-assembly-label]");
  const assemblyTitle = document.querySelector("[data-assembly-title]");
  const assemblyCopy = document.querySelector("[data-assembly-copy]");
  const assemblyKey = [...document.querySelectorAll(".anatomy-assembly__key span")];
  const assemblyParts = {
    navigation: {
      label: "Navigation",
      title: "Help people find their way.",
      copy: "A clear, compact navigation gives visitors confidence without competing with the story.",
    },
    typography: {
      label: "Typography",
      title: "Give the project a voice.",
      copy: "Type carries tone before a sentence has even been read, making the idea feel distinct and intentional.",
    },
    content: {
      label: "Content",
      title: "Say the right thing clearly.",
      copy: "A useful hierarchy gives the main idea room to land, then offers enough detail for someone to keep going.",
    },
    interaction: {
      label: "Interaction",
      title: "Make the next step feel natural.",
      copy: "Subtle response and movement can guide attention without getting between the visitor and what they came to do.",
    },
  };

  const activatePart = (part) => {
    const content = assemblyParts[part];
    if (!assemblyBrowser || !content) return;
    assemblyBrowser.dataset.activePart = part;
    assemblyLabel.textContent = content.label;
    assemblyTitle.textContent = content.title;
    assemblyCopy.textContent = content.copy;
    const activeIndex = Object.keys(assemblyParts).indexOf(part);
    assemblyControls.forEach((control) => {
      const active = control.dataset.part === part;
      control.classList.toggle("is-active", active);
      control.setAttribute("aria-pressed", String(active));
    });
    assemblyKey.forEach((item, index) => item.classList.toggle("is-active", index === activeIndex));
  };

  assemblyControls.forEach((control) => {
    control.addEventListener("click", () => activatePart(control.dataset.part));
    control.addEventListener("focus", () => activatePart(control.dataset.part));
    control.addEventListener("pointerenter", (event) => {
      if (event.pointerType !== "touch") activatePart(control.dataset.part);
    });
  });
})();
