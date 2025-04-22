let cockpit = document.getElementById("cockpit");
let activeTooltip = null;
let hotspotDots = []; // Store all hotspot elements
let currentHotspot = null;

window.addEventListener("DOMContentLoaded", () => {
  if (cockpit.complete) {
    centerImage();
  } else {
    cockpit.onload = centerImage;
  }
});

function loadFlow(flowName) {
  console.log(`Loading flow: ${flowName}`);
  removeHotspots();
  hotspotDots = [];

  fetch(`data/${flowName}.json`)
    .then((res) => res.json())
    .then((flow) => {
      const container = document.querySelector(".image-container");
      const imgWidth = cockpit.offsetWidth;
      const imgHeight = cockpit.offsetHeight;

      flow.forEach((step, index) => {
        const dot = document.createElement("div");
        dot.classList.add("hotspot");

        const number = document.createElement("span");
        number.classList.add("hotspot-number");
        number.textContent = index + 1;
        dot.appendChild(number);

        if (step.relative) {
          dot.style.left = `${(step.x * imgWidth) / 100}px`;
          dot.style.top = `${(step.y * imgHeight) / 100}px`;
        } else {
          dot.style.left = `${step.x}px`;
          dot.style.top = `${step.y}px`;
        }

        dot.addEventListener("click", () => {
          // Remove the active class from the previous active hotspot if there's one
          if (currentHotspot) {
            currentHotspot.classList.remove("active-hotspot");
          }

          // Toggle tooltip if clicking the same hotspot again
          if (activeTooltip && currentHotspot === dot) {
            activeTooltip.remove();
            activeTooltip = null;
            currentHotspot = null;
            return;
          }

          // Remove existing tooltip if clicking another hotspot
          if (activeTooltip) {
            activeTooltip.remove();
            activeTooltip = null;
          }

          // Add the active class to the clicked hotspot
          dot.classList.add("active-hotspot");

          // Create tooltip
          const tooltip = document.createElement("div");
          tooltip.classList.add("tooltip");
          tooltip.innerHTML = `
            <strong>${step.label || "Step"}</strong><br/>
            <p class="tooltip-step" id="step-${index}">${
            step.steps ? step.steps.join("</p><p class='tooltip-step'>") : ""
          }</p>
            <div class="nav-buttons">
              <button class="prev-btn">Previous</button>
              <button class="next-btn">Next</button>
            </div>
          `;
          document.body.appendChild(tooltip);

          // Position the tooltip relative to the dot
          const dotRect = dot.getBoundingClientRect();
          const tooltipRect = tooltip.getBoundingClientRect();
          const spacing = 10;

          let top = dotRect.top + window.scrollY - tooltipRect.height - spacing;
          let left =
            dotRect.left +
            window.scrollX -
            tooltipRect.width / 2 +
            dotRect.width / 2;

          // If there's not enough space above, position below
          if (top < 0) {
            top = dotRect.bottom + window.scrollY + spacing;
          }

          // Prevent tooltip from going off-screen horizontally
          if (left < 0) left = spacing;
          if (left + tooltipRect.width > window.innerWidth) {
            left = window.innerWidth - tooltipRect.width - spacing;
          }

          tooltip.style.left = `${left}px`;
          tooltip.style.top = `${top}px`;
          tooltip.style.visibility = "visible";
          activeTooltip = tooltip;
          currentHotspot = dot;

          // Navigation buttons
          const currentIndex = hotspotDots.indexOf(dot);
          const nextButton = tooltip.querySelector(".next-btn");
          const prevButton = tooltip.querySelector(".prev-btn");

          nextButton.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Only move to the next step if it's not the last one
            if (currentIndex < hotspotDots.length - 1) {
              const nextDot = hotspotDots[currentIndex + 1];
              nextDot.click();
              scrollToHotspot(nextDot);
            }
          });

          prevButton.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Only move to the previous step if it's not the first one
            if (currentIndex > 0) {
              const prevDot = hotspotDots[currentIndex - 1];
              prevDot.click();
              scrollToHotspot(prevDot);
            }
          });
        });

        hotspotDots.push(dot);
        container.appendChild(dot);
      });

      drawLinesBetweenHotspots();
    })
    .catch((err) => {
      console.error(`Error loading flow "${flowName}":`, err);
    });
}

// Function to hide the tooltip with fade-out effect
function hideTooltip() {
  if (activeTooltip) {
    activeTooltip.classList.add("fade-out"); // Add fade-out class
    activeTooltip.addEventListener("animationend", () => {
      activeTooltip.remove(); // Remove tooltip after fade-out completes
      activeTooltip = null;
      currentHotspot = null;
    });
  }
}

function removeHotspots() {
  document.querySelectorAll(".hotspot").forEach((dot) => dot.remove());
  const svg = document.getElementById("hotspot-lines");
  if (svg) svg.innerHTML = "";
  if (activeTooltip) {
    hideTooltip(); // Use hideTooltip function to remove active tooltip
  }
}

function centerImage() {
  const container = document.querySelector(".image-container");
  if (cockpit.offsetHeight < window.innerHeight) {
    container.classList.add("center-image");
  } else {
    container.classList.remove("center-image");
  }
}

cockpit.onload = centerImage;
window.addEventListener("resize", centerImage);

cockpit.addEventListener("click", function (e) {
  const rect = cockpit.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  const relX = (clickX / cockpit.offsetWidth) * 100;
  const relY = (clickY / cockpit.offsetHeight) * 100;

  console.log(`Click at: X = ${relX.toFixed(2)}%, Y = ${relY.toFixed(2)}%`);
});

function scrollToHotspot(dot) {
  const rect = dot.getBoundingClientRect();
  const containerRect = cockpit.getBoundingClientRect();
  const imageHeight = cockpit.scrollHeight;
  const viewportHeight = window.innerHeight;

  const offsetFromTop = rect.top - containerRect.top;
  const offsetFromBottom = containerRect.bottom - rect.bottom;
  const maxScrollTop = imageHeight - viewportHeight;

  if (offsetFromTop < 0) {
    cockpit.scrollTo({
      top: Math.max(cockpit.scrollTop + offsetFromTop - 10, 0),
      behavior: "smooth",
    });
  } else if (offsetFromBottom < 0) {
    cockpit.scrollTo({
      top: Math.min(cockpit.scrollTop + offsetFromBottom + 10, maxScrollTop),
      behavior: "smooth",
    });
  } else {
    dot.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center",
    });
  }
}

document
  .querySelector(".image-container")
  .addEventListener("scroll", function () {
    const el = this;
    if (el.scrollTop + el.clientHeight > el.scrollHeight - 1) {
      el.scrollTop = el.scrollHeight - el.clientHeight;
    }
  });

function loadMemoryFlow(memoryId) {
  if (!memoryId) return;
  loadFlow(memoryId);
}

// === SVG LINE DRAWING FUNCTION ===
function drawLinesBetweenHotspots() {
  const svg = document.getElementById("hotspot-lines");
  if (!svg) return;
  svg.innerHTML = "";

  const containerRect = cockpit.getBoundingClientRect();

  for (let i = 0; i < hotspotDots.length - 1; i++) {
    const dot1 = hotspotDots[i];
    const dot2 = hotspotDots[i + 1];

    const rect1 = dot1.getBoundingClientRect();
    const rect2 = dot2.getBoundingClientRect();

    const x1 = rect1.left + rect1.width / 2 - containerRect.left;
    const y1 = rect1.top + rect1.height / 2 - containerRect.top;
    const x2 = rect2.left + rect2.width / 2 - containerRect.left;
    const y2 = rect2.top + rect2.height / 2 - containerRect.top;

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);
    line.setAttribute("stroke", "#ec008c");
    line.setAttribute("stroke-width", "2");
    svg.appendChild(line);
  }
}

// Close tooltip when clicking outside of it
document.addEventListener("click", function (e) {
  if (
    activeTooltip &&
    !activeTooltip.contains(e.target) &&
    !currentHotspot.contains(e.target)
  ) {
    hideTooltip();
  }
});
