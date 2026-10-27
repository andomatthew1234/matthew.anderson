(() => {
  const projects = window.PORTFOLIO_PROJECTS;
  const section = document.querySelector(".portfolio-section");
  const stage = section?.querySelector(".portfolio-stage");
  const heading = section?.querySelector(".portfolio-heading-group");
  const viewport = section?.querySelector(".portfolio-viewport");
  const track = section?.querySelector(".portfolio-track");
  const previousButton = section?.querySelector(".portfolio-arrow--previous");
  const nextButton = section?.querySelector(".portfolio-arrow--next");
  const count = section?.querySelector(".portfolio-count");
  const progressLines = Array.from(section?.querySelectorAll(".portfolio-progress-line") ?? []);

  if (!projects?.length || !section || !stage || !heading || !viewport || !track) return;

  const formatNumber = (value) => String(value).padStart(2, "0");
  const trackMovementShare = 0.86;

  track.innerHTML = projects
    .map(
      (project, index) => `
        <article class="project-card" data-project-index="${index}">
          <a
            class="project-visual"
            href="${project.url}"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Visit ${project.name} website (opens in a new tab)"
          >
            <img
              src="${project.image}"
              alt="${project.alt}"
              width="${project.width}"
              height="${project.height}"
              loading="lazy"
              decoding="async"
            />
            <span class="project-visit-mark" aria-hidden="true">↗</span>
          </a>
          <div class="project-details">
            <div>
              <p class="project-eyebrow">${formatNumber(index + 1)} / ${formatNumber(projects.length)} · ${project.category}</p>
              <h3 class="project-name">${project.name}</h3>
            </div>
            <a class="project-visit-link" href="${project.url}" target="_blank" rel="noopener noreferrer">
              Visit website <span aria-hidden="true">↗</span>
            </a>
          </div>
        </article>
      `,
    )
    .join("");

  const cards = Array.from(track.querySelectorAll(".project-card"));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let activeIndex = -1;
  let horizontalTrigger = null;
  let targetProgresses = cards.map((_, index) => index / Math.max(cards.length - 1, 1));
  let mobileObserver = null;
  let gsapMatchMedia = null;

  const updateNavigation = (nextIndex) => {
    const boundedIndex = Math.max(0, Math.min(cards.length - 1, nextIndex));
    if (boundedIndex === activeIndex && count?.textContent) return;

    activeIndex = boundedIndex;
    if (count) count.textContent = `${formatNumber(activeIndex + 1)} / ${formatNumber(cards.length)}`;
    if (previousButton) previousButton.disabled = activeIndex === 0;
    if (nextButton) nextButton.disabled = activeIndex === cards.length - 1;

    progressLines.forEach((line, index) => {
      line.classList.toggle("is-active", index <= activeIndex);
    });

    cards.forEach((card, index) => {
      card.classList.toggle("is-active", index === activeIndex);
    });
  };

  const getOverflow = () => Math.max(0, track.scrollWidth - viewport.clientWidth);
  const getPinStart = () =>
    section.offsetTop +
    section.clientTop +
    Number.parseFloat(getComputedStyle(section).paddingTop) -
    window.innerHeight * 0.12;

  const calculateTargetProgresses = () => {
    const overflow = getOverflow();
    if (!overflow) {
      targetProgresses = cards.map(() => 0);
      return;
    }

    const inset = Math.min(viewport.clientWidth * 0.035, 30);
    targetProgresses = cards.map((card) =>
      Math.max(0, Math.min(1, (card.offsetLeft - inset) / overflow)) * trackMovementShare,
    );
  };

  const nearestProjectIndex = (progress) => {
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    targetProgresses.forEach((target, index) => {
      const distance = Math.abs(progress - target);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });
    return nearestIndex;
  };

  const goToProject = (index) => {
    const boundedIndex = Math.max(0, Math.min(cards.length - 1, index));
    const behavior = reduceMotion.matches ? "auto" : "smooth";

    if (horizontalTrigger) {
      const progress = targetProgresses[boundedIndex] ?? 0;
      const scrollTop = horizontalTrigger.start + progress * (horizontalTrigger.end - horizontalTrigger.start);
      window.scrollTo({ top: scrollTop, behavior });
    } else {
      viewport.scrollTo({ left: cards[boundedIndex].offsetLeft, behavior });
    }

    updateNavigation(boundedIndex);
  };

  previousButton?.addEventListener("click", () => goToProject(activeIndex - 1));
  nextButton?.addEventListener("click", () => goToProject(activeIndex + 1));

  const initialiseMobileTracking = () => {
    mobileObserver?.disconnect();
    mobileObserver = new IntersectionObserver(
      (entries) => {
        const mostVisible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (mostVisible) updateNavigation(Number(mostVisible.target.dataset.projectIndex));
      },
      { root: viewport, threshold: [0.45, 0.65, 0.85] },
    );
    cards.forEach((card) => mobileObserver.observe(card));
  };

  const initialiseGsap = () => {
    if (!window.gsap || !window.ScrollTrigger || reduceMotion.matches) {
      initialiseMobileTracking();
      return;
    }

    window.gsap.registerPlugin(window.ScrollTrigger);
    document.documentElement.classList.add("has-gsap");
    gsapMatchMedia = window.gsap.matchMedia();

    gsapMatchMedia.add("(min-width: 901px) and (prefers-reduced-motion: no-preference)", () => {
      const context = window.gsap.context(() => {
        calculateTargetProgresses();

        window.gsap.fromTo(
          heading,
          { autoAlpha: 0, y: 34 },
          {
            autoAlpha: 1,
            y: 0,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top 88%",
              end: "top 58%",
              scrub: 0.5,
            },
          },
        );

        window.gsap.fromTo(
          cards[0].querySelector(".project-visual"),
          { scale: 0.94, y: 24 },
          {
            scale: 1,
            y: 0,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top 90%",
              end: "top 52%",
              scrub: 0.6,
            },
          },
        );

        const horizontalTimeline = window.gsap.timeline({
          scrollTrigger: {
            id: "portfolio-horizontal",
            trigger: stage,
            start: getPinStart,
            end: () => `+=${Math.max(getOverflow() * 1.35, window.innerHeight * 2.4)}`,
            pin: true,
            pinType: "transform",
            pinSpacing: true,
            scrub: 0.65,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onRefresh: (self) => {
              horizontalTrigger = self;
              calculateTargetProgresses();
            },
            onUpdate: (self) => {
              horizontalTrigger = self;
              const focusProgress = Math.min(self.progress, trackMovementShare);
              const step = trackMovementShare / Math.max(cards.length - 1, 1);

              cards.forEach((card, index) => {
                const distance = Math.abs(focusProgress - (targetProgresses[index] ?? 0));
                const focus = Math.max(0, 1 - distance / Math.max(step, 0.001));
                window.gsap.set(card, { scale: 0.955 + focus * 0.045 });
                window.gsap.set(card.querySelector(".project-details"), {
                  autoAlpha: 0.46 + focus * 0.54,
                  y: (1 - focus) * 12,
                });
              });

              updateNavigation(nearestProjectIndex(focusProgress));
            },
          },
        });

        horizontalTimeline
          .to(track, {
            x: () => -getOverflow(),
            duration: trackMovementShare,
            ease: "none",
          })
          .to({}, { duration: 1 - trackMovementShare });

        horizontalTrigger = horizontalTimeline.scrollTrigger;
      }, section);

      return () => {
        horizontalTrigger = null;
        context.revert();
        window.gsap.set(cards, { clearProps: "transform" });
        window.gsap.set(cards.map((card) => card.querySelector(".project-details")), {
          clearProps: "transform,opacity,visibility",
        });
      };
    });

    gsapMatchMedia.add("(max-width: 900px), (prefers-reduced-motion: reduce)", () => {
      initialiseMobileTracking();
      return () => mobileObserver?.disconnect();
    });
  };

  updateNavigation(0);
  initialiseGsap();

  Promise.allSettled([
    document.fonts?.ready ?? Promise.resolve(),
    ...Array.from(track.querySelectorAll("img")).map((image) =>
      image.complete ? image.decode?.() ?? Promise.resolve() : new Promise((resolve) => image.addEventListener("load", resolve, { once: true })),
    ),
  ]).then(() => window.ScrollTrigger?.refresh());

  const refreshPinnedLayout = () => {
    requestAnimationFrame(() => {
      window.ScrollTrigger?.refresh();
      window.ScrollTrigger?.update();
    });
  };

  window.addEventListener("pageshow", refreshPinnedLayout);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refreshPinnedLayout();
  });

  window.addEventListener("pagehide", (event) => {
    if (event.persisted) return;
    mobileObserver?.disconnect();
    gsapMatchMedia?.revert();
  });
})();
