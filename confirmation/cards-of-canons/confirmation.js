const PAY_NOW_URL = "https://buy.stripe.com/8x214occ8bnD0jq52253O0n";
// TODO: Connect this hook to a real invoice request backend; null means this page sends nothing.
const INVOICE_REQUEST_HANDLER = null;
const STRIPE_RETURN_HASH = "#redirect-from-stripe";
const REDIRECT_WAIT_MS = 5000;
const ROCKET_STARTUP_MS = 1100;
const RETURN_RECOGNITION_MS = 800;
const RETURN_SPOOL_MS = 900;
const RETURN_LAUNCH_MS = 950;
const RETURN_SMOKE_HOLD_MS = 350;
const SMOKE_CLEAR_MS = 950;
const INVOICE_STATUS_DELAY_MS = 3000;
const INVOICE_SUCCESS_DELAY_MS = 9000;
const INVOICE_REDUCED_DELAY_MS = 1800;
const INVOICE_FINAL_FADE_MS = 420;
const PRICING = {
  websiteBuild: 40000,
  processingFees: {
    payNow: 722,
    invoice: 889,
  },
};
const termsScroll = document.querySelector("#terms-scroll");
const termsFrame = document.querySelector("#terms-frame");
const termsError = document.querySelector("#terms-error");
const termsCueText = document.querySelector("#terms-cue-text");
const termsCueIcon = document.querySelector("#terms-cue-icon");
const continueButton = document.querySelector("#continue-button");
const termsStep = document.querySelector("#terms-step");
const paymentStep = document.querySelector("#payment-step");
const costStep = document.querySelector("#cost-step");
const finalReviewStep = document.querySelector("#final-review-step");
const termsTitle = document.querySelector("#terms-title");
const paymentTitle = document.querySelector("#payment-title");
const costTitle = document.querySelector("#cost-title");
const finalReviewTitle = document.querySelector("#final-review-title");
const backToTermsButton = document.querySelector("#back-to-terms");
const backToPaymentButton = document.querySelector("#back-to-payment");
const paymentOptions = document.querySelector("#payment-options");
const paymentContinueButton = document.querySelector("#payment-continue-button");
const paymentNote = document.querySelector("#payment-note");
const selectedPaymentLabel = document.querySelector("#selected-payment-label");
const websiteBuildCost = document.querySelector("#website-build-cost");
const processingFeeCost = document.querySelector("#processing-fee-cost");
const purchaseTotal = document.querySelector("#purchase-total");
const savingsBanner = document.querySelector("#savings-banner");
const potentialSavings = document.querySelector("#potential-savings");
const switchToPayNowButton = document.querySelector("#switch-to-pay-now");
const changePaymentButton = document.querySelector("#change-payment");
const costContinueButton = document.querySelector("#continue-to-payment");
const costPaymentNote = document.querySelector("#cost-payment-note");
const backToCostButton = document.querySelector("#back-to-cost");
const changeFinalPaymentButton = document.querySelector("#change-final-payment");
const finalPaymentMethod = document.querySelector("#final-payment-method");
const finalReviewTotal = document.querySelector("#final-review-total");
const finalNextStep = document.querySelector("#final-next-step");
const finalActionButton = document.querySelector("#final-action");
const finalActionLabel = document.querySelector("#final-action-label");
const finalActionNote = document.querySelector("#final-action-note");
const purchaseContext = document.querySelector(".purchase-context");
const purchaseContextContent = document.querySelector("#purchase-context-content");
const rocketExperience = document.querySelector("#rocket-experience");
const rocketStatus = document.querySelector("#rocket-status");
const redirectExperience = document.querySelector("#redirect-experience");
const smokeTransition = document.querySelector("#smoke-transition");
const paymentSuccess = document.querySelector("#payment-success");
const successTitle = document.querySelector("#success-title");
const stripeSuccessTotal = document.querySelector("#stripe-success-total");
const finalReviewContent = document.querySelector("#final-review-content");
const invoicePreparation = document.querySelector("#invoice-preparation");
const invoicePreparationTitle = document.querySelector("#invoice-preparation-title");
const invoicePreparingMessage = document.querySelector("#invoice-preparing-message");
const invoiceDocument = document.querySelector("#invoice-document");
const invoicePen = document.querySelector("#invoice-pen");
const invoiceWritingLines = [...document.querySelectorAll(".invoice-writing-line")];
const invoiceRequestSuccess = document.querySelector("#invoice-request-success");
const invoiceSuccessTitle = document.querySelector("#invoice-success-title");
let termsReviewed = false;
let selectedPaymentMethod = "";

const formatCurrency = (cents) => `$${(cents / 100).toFixed(2)}`;

const setMoney = (element, cents) => {
  const dollars = Math.floor(cents / 100);
  const remainingCents = cents % 100;
  element.querySelector(".money-display").textContent = formatCurrency(cents);
  element.querySelector(".money-speech").textContent = `${dollars} ${dollars === 1 ? "dollar" : "dollars"} and ${String(remainingCents).padStart(2, "0")} ${remainingCents === 1 ? "cent" : "cents"} AUD`;
};

const renderCostBreakdown = () => {
  if (!selectedPaymentMethod) return;

  const processingFee = PRICING.processingFees[selectedPaymentMethod];
  const total = PRICING.websiteBuild + processingFee;
  const methodLabel = selectedPaymentMethod === "payNow" ? "Pay now" : "Pay using invoice";

  selectedPaymentLabel.textContent = methodLabel;
  setMoney(websiteBuildCost, PRICING.websiteBuild);
  setMoney(processingFeeCost, processingFee);
  setMoney(purchaseTotal, total);
  savingsBanner.hidden = selectedPaymentMethod !== "invoice";
  costPaymentNote.textContent = "";

  if (selectedPaymentMethod === "invoice") {
    setMoney(potentialSavings, PRICING.processingFees.invoice - PRICING.processingFees.payNow);
  }
};

const renderFinalReview = () => {
  if (!selectedPaymentMethod) return;

  const processingFee = PRICING.processingFees[selectedPaymentMethod];
  const total = PRICING.websiteBuild + processingFee;
  const isPayNow = selectedPaymentMethod === "payNow";

  finalPaymentMethod.textContent = isPayNow ? "Pay now" : "Invoice";
  setMoney(finalReviewTotal, total);
  finalNextStep.textContent = isPayNow
    ? "You'll be redirected to Stripe to complete your payment."
    : "We'll send you an email with your invoice so you can complete your payment when you're ready.";
  finalActionLabel.textContent = isPayNow ? "Continue to Stripe" : "Request invoice";
  finalActionNote.textContent = "";
  finalActionButton.disabled = false;
  finalActionButton.removeAttribute("aria-busy");
};

const showInvoiceSuccess = () => {
  invoicePreparation.classList.add("is-fading-out");
  window.setTimeout(() => {
    invoicePreparation.hidden = true;
    invoicePreparation.inert = true;
    invoiceRequestSuccess.hidden = false;
    invoiceRequestSuccess.inert = false;
    invoiceRequestSuccess.classList.add("is-visible");
    finalReviewStep.setAttribute("aria-labelledby", "invoice-success-title");
    finalReviewStep.removeAttribute("aria-label");
    finalReviewStep.setAttribute("aria-busy", "false");
    invoiceSuccessTitle.focus({ preventScroll: true });
  }, INVOICE_FINAL_FADE_MS);
};

const writeInvoiceLines = async () => {
  const startedAt = performance.now();
  const wait = (duration) => new Promise((resolve) => window.setTimeout(resolve, duration));
  let previousTransform = "";

  for (const [index, line] of invoiceWritingLines.entries()) {
    const scheduledAt = line.dataset.writeAfter === undefined ? index * 190 : Number(line.dataset.writeAfter);
    const pause = scheduledAt - (performance.now() - startedAt);
    if (pause > 0) await wait(pause);

    const documentBounds = invoiceDocument.getBoundingClientRect();
    const lineBounds = line.getBoundingClientRect();
    const penBounds = invoicePen.getBoundingClientRect();
    const y = lineBounds.top - documentBounds.top - penBounds.height * 0.88;
    const startX = lineBounds.left - documentBounds.left - penBounds.width * 0.25;
    const endX = lineBounds.right - documentBounds.left - penBounds.width * 0.7;
    const startTransform = `translate3d(${startX}px, ${y}px, 0) rotate(36deg)`;
    const endTransform = `translate3d(${endX}px, ${y}px, 0) rotate(36deg)`;

    if (previousTransform) {
      invoicePen.animate(
        [{ transform: previousTransform }, { transform: startTransform }],
        { duration: 55, easing: "ease-out", fill: "forwards" },
      );
      await wait(55);
    } else {
      invoicePen.style.transform = startTransform;
    }

    line.animate(
      [{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0)" }],
      { duration: 155, easing: "linear", fill: "forwards" },
    );
    invoicePen.animate(
      [{ transform: startTransform }, { transform: endTransform }],
      { duration: 155, easing: "linear", fill: "forwards" },
    );
    await wait(155);
    previousTransform = endTransform;
  }
};

const startInvoicePreparation = () => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  finalActionButton.disabled = true;
  finalActionButton.setAttribute("aria-busy", "true");
  finalReviewStep.setAttribute("aria-busy", "true");
  finalActionLabel.textContent = "Please wait...";
  finalActionButton.classList.add("is-processing");

  // TODO: Submit the invoice request through INVOICE_REQUEST_HANDLER here. The current experience is a preview and sends no request.
  if (typeof INVOICE_REQUEST_HANDLER === "function") {
    INVOICE_REQUEST_HANDLER({
      email: "chapmanjohn503@gmail.com",
      totalCents: PRICING.websiteBuild + PRICING.processingFees.invoice,
    });
  }

  finalReviewContent.inert = true;
  finalReviewContent.classList.add("is-processing-out");
  invoicePreparation.hidden = false;
  invoicePreparation.inert = false;
  invoicePreparation.classList.add("is-visible");
  finalReviewStep.removeAttribute("aria-labelledby");
  finalReviewStep.setAttribute("aria-label", "Invoice preparation");
  invoicePreparationTitle.focus({ preventScroll: true });
  window.setTimeout(() => {
    finalReviewContent.hidden = true;
  }, 320);

  if (prefersReducedMotion) {
    invoicePen.classList.add("is-static");
    invoiceWritingLines.forEach((line, index) => {
      window.setTimeout(() => line.classList.add("is-written"), index * 35);
    });
    invoicePreparingMessage.hidden = false;
    invoicePreparingMessage.classList.add("is-visible");
    window.setTimeout(showInvoiceSuccess, INVOICE_REDUCED_DELAY_MS);
    return;
  }

  invoicePen.classList.add("is-active");
  void writeInvoiceLines();
  window.setTimeout(() => {
    invoicePreparingMessage.hidden = false;
    invoicePreparingMessage.classList.add("is-visible");
  }, INVOICE_STATUS_DELAY_MS);
  window.setTimeout(showInvoiceSuccess, INVOICE_SUCCESS_DELAY_MS);
};

const showPaymentSuccess = () => {
  rocketExperience.hidden = true;
  rocketExperience.classList.remove("is-visible", "is-engine-running", "is-spooling", "is-launching", "is-returning");
  redirectExperience.hidden = true;
  smokeTransition.classList.remove("is-clearing");
  purchaseContext.style.removeProperty("min-height");
  purchaseContextContent.hidden = false;
  purchaseContextContent.inert = false;
  purchaseContextContent.removeAttribute("aria-hidden");
  purchaseContextContent.classList.remove("is-exiting");
  purchaseContextContent.classList.add("is-returning");
  window.setTimeout(() => purchaseContextContent.classList.remove("is-returning"), 650);
  finalReviewContent.hidden = true;
  finalReviewContent.inert = true;
  setMoney(stripeSuccessTotal, PRICING.websiteBuild + PRICING.processingFees.payNow);
  paymentSuccess.hidden = false;
  paymentSuccess.inert = false;
  paymentSuccess.classList.add("is-visible");
  finalReviewStep.setAttribute("aria-labelledby", "success-title");
  finalReviewStep.setAttribute("aria-busy", "false");
  document.documentElement.classList.remove("stripe-return-mode");
  successTitle.focus({ preventScroll: true });

  if (window.matchMedia("(max-width: 850px)").matches) {
    const panelTop = finalReviewStep.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: panelTop - 16, behavior: "instant" });
  }
};

const startStripeReturnExperience = () => {
  // The return hash is only a UI trigger, not proof of payment; verify Stripe session status before trusting a payment.
  selectedPaymentMethod = "payNow";
  termsReviewed = true;
  paymentOptions.querySelector('input[value="payNow"]').checked = true;
  termsCueText.textContent = "Terms reviewed";
  termsCueIcon.textContent = "✓";
  continueButton.disabled = false;
  renderCostBreakdown();
  renderFinalReview();

  [termsStep, paymentStep, costStep].forEach((step) => {
    step.hidden = true;
    step.inert = true;
  });
  finalReviewStep.hidden = false;
  finalReviewStep.inert = false;
  finalReviewStep.setAttribute("aria-busy", "true");
  finalReviewStep.setAttribute("aria-labelledby", "final-review-title");

  finalReviewContent.hidden = false;
  finalReviewContent.inert = false;
  finalActionButton.disabled = true;
  finalActionButton.setAttribute("aria-busy", "true");
  finalActionLabel.textContent = "Please wait...";
  finalActionButton.classList.add("is-processing");

  purchaseContext.classList.add("is-rocket-active");
  purchaseContextContent.hidden = false;
  purchaseContextContent.inert = true;
  purchaseContextContent.setAttribute("aria-hidden", "true");
  purchaseContextContent.classList.add("is-exiting");
  rocketExperience.hidden = false;
  rocketExperience.inert = false;
  rocketExperience.removeAttribute("aria-hidden");
  rocketExperience.classList.remove("is-igniting", "is-spooling", "is-launching");
  rocketExperience.classList.add("is-visible", "is-engine-running", "is-returning");
  rocketStatus.classList.add("is-message-visible");
  redirectExperience.hidden = true;
  document.documentElement.classList.remove("stripe-return-pending");
  document.documentElement.classList.add("stripe-return-mode");

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.setTimeout(showPaymentSuccess, RETURN_RECOGNITION_MS);
    return;
  }

  window.setTimeout(() => {
    rocketExperience.classList.remove("is-engine-running");
    rocketExperience.classList.add("is-spooling");
    redirectExperience.hidden = false;
    redirectExperience.classList.add("is-spooling");
    window.setTimeout(() => {
      rocketExperience.classList.remove("is-spooling");
      rocketExperience.classList.add("is-launching");
      redirectExperience.classList.remove("is-spooling");
      redirectExperience.classList.add("is-launching");
      window.setTimeout(() => {
        smokeTransition.classList.add("is-clearing");
        window.setTimeout(showPaymentSuccess, SMOKE_CLEAR_MS);
      }, RETURN_LAUNCH_MS + RETURN_SMOKE_HOLD_MS);
    }, RETURN_SPOOL_MS);
  }, RETURN_RECOGNITION_MS);
};

const startPayNowRedirect = () => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  finalActionButton.disabled = true;
  finalActionButton.setAttribute("aria-busy", "true");
  finalReviewStep.setAttribute("aria-busy", "true");
  finalActionLabel.textContent = "Please wait...";
  finalActionButton.classList.add("is-processing");

  purchaseContext.classList.add("is-rocket-active");
  purchaseContextContent.classList.add("is-exiting");
  purchaseContextContent.inert = true;
  purchaseContextContent.setAttribute("aria-hidden", "true");
  if (prefersReducedMotion) {
    purchaseContext.style.minHeight = `${purchaseContext.getBoundingClientRect().height}px`;
    purchaseContextContent.hidden = true;
  }
  rocketExperience.hidden = false;
  rocketExperience.inert = false;
  rocketExperience.removeAttribute("aria-hidden");
  rocketExperience.classList.add("is-visible", "is-igniting");

  const startEngine = () => {
    rocketExperience.classList.remove("is-igniting");
    rocketExperience.classList.add("is-engine-running");
    rocketStatus.classList.add("is-message-visible");
    window.setTimeout(() => window.location.assign(PAY_NOW_URL), REDIRECT_WAIT_MS);
  };

  const startupDelay = prefersReducedMotion ? 0 : ROCKET_STARTUP_MS;
  window.setTimeout(startEngine, startupDelay);
};

const showStep = (nextStep, focusTarget) => {
  [termsStep, paymentStep, costStep, finalReviewStep].forEach((step) => {
    const isActive = step === nextStep;
    step.hidden = !isActive;
    step.inert = !isActive;
    step.classList.remove("is-entering");
  });

  void nextStep.offsetWidth;
  nextStep.classList.add("is-entering");
  focusTarget.focus({ preventScroll: true });

  if (nextStep !== termsStep && window.matchMedia("(max-width: 850px)").matches) {
    requestAnimationFrame(() => {
      const stepTop = nextStep.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: stepTop - 16, behavior: "instant" });
    });
  }
};

const setTermsReviewed = () => {
  if (termsReviewed) return;

  termsReviewed = true;
  termsCueText.textContent = "Terms reviewed";
  termsCueIcon.textContent = "✓";
  continueButton.disabled = false;
  termsError.textContent = "";
  termsError.dataset.visible = "false";
  termsFrame.dataset.invalid = "false";
};

const checkTermsBottom = () => {
  if (termsScroll.scrollTop + termsScroll.clientHeight >= termsScroll.scrollHeight - 3) {
    setTermsReviewed();
  }
};

const showReadError = () => {
  termsError.textContent = "Please read all the terms and conditions before continuing.";
  termsError.dataset.visible = "true";
  termsFrame.dataset.invalid = "true";
  termsFrame.classList.remove("is-shaking");

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  void termsFrame.offsetWidth;
  termsFrame.classList.add("is-shaking");
};

if (window.location.hash === STRIPE_RETURN_HASH) {
  startStripeReturnExperience();
} else {
termsScroll.addEventListener("scroll", checkTermsBottom, { passive: true });
termsScroll.addEventListener("keydown", (event) => {
  const pageDistance = termsScroll.clientHeight;
  const scrollDistances = {
    ArrowDown: 40,
    ArrowUp: -40,
    PageDown: pageDistance,
    PageUp: -pageDistance,
    " ": event.shiftKey ? -pageDistance : pageDistance,
  };

  if (event.key === "Home") termsScroll.scrollTop = 0;
  else if (event.key === "End") termsScroll.scrollTop = termsScroll.scrollHeight;
  else if (Object.hasOwn(scrollDistances, event.key)) {
    termsScroll.scrollTop += scrollDistances[event.key];
  } else {
    return;
  }

  event.preventDefault();
  requestAnimationFrame(checkTermsBottom);
});

termsFrame.addEventListener("animationend", (event) => {
  if (event.animationName === "terms-shake") termsFrame.classList.remove("is-shaking");
});

continueButton.addEventListener("click", () => {
  if (!termsReviewed) {
    showReadError();
    return;
  }

  paymentNote.textContent = "";
  showStep(paymentStep, paymentTitle);
});

backToTermsButton.addEventListener("click", () => {
  paymentNote.textContent = "";
  showStep(termsStep, termsTitle);
});

paymentOptions.addEventListener("change", (event) => {
  if (!(event.target instanceof HTMLInputElement) || event.target.name !== "payment-method") return;

  selectedPaymentMethod = event.target.value;
  paymentContinueButton.disabled = false;
  paymentNote.textContent = "";
});

paymentContinueButton.addEventListener("click", () => {
  if (!selectedPaymentMethod) return;

  renderCostBreakdown();
  showStep(costStep, costTitle);
});

backToPaymentButton.addEventListener("click", () => {
  costPaymentNote.textContent = "";
  showStep(paymentStep, paymentTitle);
});

changePaymentButton.addEventListener("click", () => {
  costPaymentNote.textContent = "";
  showStep(paymentStep, paymentTitle);
});

switchToPayNowButton.addEventListener("click", () => {
  selectedPaymentMethod = "payNow";
  paymentOptions.querySelector('input[value="payNow"]').checked = true;
  paymentContinueButton.disabled = false;
  renderCostBreakdown();
  changePaymentButton.focus();
});

costContinueButton.addEventListener("click", () => {
  if (!selectedPaymentMethod) return;

  renderFinalReview();
  showStep(finalReviewStep, finalReviewTitle);
});

backToCostButton.addEventListener("click", () => {
  finalActionNote.textContent = "";
  showStep(costStep, costTitle);
});

changeFinalPaymentButton.addEventListener("click", () => {
  finalActionNote.textContent = "";
  showStep(paymentStep, paymentTitle);
});

finalActionButton.addEventListener("click", () => {
  if (!selectedPaymentMethod) return;

  if (selectedPaymentMethod === "payNow") {
    startPayNowRedirect();
    return;
  }

  startInvoicePreparation();
});

fetch("/terms/")
  .then((response) => {
    if (!response.ok) throw new Error("Terms could not be loaded.");
    return response.text();
  })
  .then((html) => {
    const termsDocument = new DOMParser().parseFromString(html, "text/html");
    const sourceArticle = termsDocument.querySelector(".terms-article");

    if (!sourceArticle) throw new Error("Terms content is unavailable.");

    termsScroll.replaceChildren(sourceArticle.cloneNode(true));
    termsScroll.querySelectorAll("a").forEach((link) => {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    });
    continueButton.disabled = false;
    checkTermsBottom();
  })
  .catch(() => {
    termsScroll.innerHTML = '<p class="terms-loading">Terms could not be loaded. Please visit the <a href="/terms/">Terms and Conditions page</a> and try again.</p>';
    termsCueText.textContent = "Terms unavailable";
    termsCueIcon.textContent = "!";
    termsError.textContent = "The terms must load before you can continue.";
    termsError.dataset.visible = "true";
    termsFrame.dataset.invalid = "true";
  });
}