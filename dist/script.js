const projectLink = document.querySelector(".project-link");

if (projectLink) {
  projectLink.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "touch") return;

    const bounds = projectLink.getBoundingClientRect();
    const enteredFromRight = event.clientX > bounds.left + bounds.width / 2;
    projectLink.style.setProperty("--fill-start", enteredFromRight ? "102%" : "-102%");
  });
}
