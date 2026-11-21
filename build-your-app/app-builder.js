import { MODES, FEATURES, createInitialState, normaliseState, calculateEstimate, formatMoneyRange, formatAmount } from './app-data.mjs';
import { createAppQuoteSnapshot, encodeAppQuote, decodeAppQuote } from './app-code.mjs';

const $ = (selector) => document.querySelector(selector);
const escape = (value) => String(value).replace(/[&<>"']/g, (character) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const storageKey = 'bbm-mobile-app-draft-v1';
const platforms = { both: 'iOS + Android', ios: 'iOS only', android: 'Android only' };
let state = createInitialState();
let snapshot = null;
let code = '';
let step = 0;
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
  if (saved) {
    state = normaliseState(saved.state);
    if (typeof saved.code === 'string' && saved.code) { snapshot = decodeAppQuote(saved.code); code = saved.code; }
  }
} catch { /* A missing or damaged local draft must never prevent a new quote. */ }

const money = (range) => formatMoneyRange(range).replace(/ AUD$/, '');
const stale = () => snapshot && JSON.stringify(normaliseState(state)) !== JSON.stringify(snapshot.configuration);
function persist() {
  try { localStorage.setItem(storageKey, JSON.stringify({ state, code })); } catch { /* Quoting also works without browser storage. */ }
}
function choice(name, value, title, description, price, checkbox = false) {
  return `<label class="choice"><input type="${checkbox ? 'checkbox' : 'radio'}" name="${name}" value="${escape(value)}" /><span class="choice-copy"><span class="choice-title">${escape(title)}</span>${description ? `<span class="choice-description">${escape(description)}</span>` : ''}</span><span class="choice-price">${escape(price)}</span></label>`;
}
const descriptions = {
  nativeMirror: 'Your website’s experience, rebuilt with native components and a design made for mobile.',
  connectedMirror: 'Your familiar website layout in an app, without a major redesign. Less native polish, a smaller starting price.',
  new: 'Start from scratch. Choose your features and shape an app around your idea.',
};
for (const mode of Object.values(MODES)) {
  $(mode.id === 'new' ? '#new-option' : '#mirror-options').insertAdjacentHTML('beforeend', choice('mode', mode.id, mode.label, descriptions[mode.id], money({ min: mode.baseCents[0], max: mode.baseCents[1] })));
}
$('#platform-options').innerHTML = Object.entries(platforms).map(([id, label]) => choice('platform', id, label, '', 'Included')).join('');
$('#account-options').innerHTML = [
  ['none', 'No accounts needed', 'People can use your app without signing in.', 'Included'],
  ['standard', 'Accounts & profiles', 'Sign in and keep a personal profile.', '$100'],
  ['twoFactor', 'Accounts & profiles with 2FA', 'Accounts plus a two-factor authentication suite.', '$230'],
].map(([id, label, description, price]) => choice('accounts', id, label, description, price)).join('');
const requiredHints = { bookings: 'Requires the $100 admin dashboard (added once).', store: 'Requires the $100 admin dashboard (added once).', forms: 'Requires the $100 dashboard.', news: 'Requires the $100 dashboard.', reviews: 'Requires accounts and a dashboard.', favourites: 'Requires accounts.', loyalty: 'Requires a store, accounts, and a dashboard.' };
for (const feature of FEATURES) {
  const description = [feature.description, requiredHints[feature.id]].filter(Boolean).join(' ');
  $(['bookings','push','store'].includes(feature.id) ? '#popular-features' : '#more-features').insertAdjacentHTML('beforeend', choice('feature', feature.id, feature.label, description, `+${formatAmount(feature.priceCents)}`, true));
}

function syncInputs() {
  for (const input of document.querySelectorAll('input[name=mode],input[name=platform],input[name=accounts]')) input.checked = state[input.name] === input.value;
  for (const input of document.querySelectorAll('input[name=feature]')) input.checked = state.features.includes(input.value);
  $('#website').value = state.website;
  $('#sync-website').value = state.website;
  $('#sync').value = state.sync;
  $('#notes').value = state.notes;
}
function linesMarkup(quote) {
  return quote.lines.map((line) => `<div class="estimate-line"><span>${escape(line.label)}${line.automatic ? '<small>Required · included in total</small>' : ''}</span><span>${escape(money(line.amountCents))}</span></div>`).join('');
}
function update() {
  const isNew = state.mode === 'new';
  if (!isNew && step > 1) step = 1;
  $('[data-step="2"]').hidden = !isNew;
  for (const panel of document.querySelectorAll('[data-panel]')) panel.hidden = Number(panel.dataset.panel) !== step;
  for (const button of document.querySelectorAll('[data-step]')) {
    if (Number(button.dataset.step) === step) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
  }
  $('#mirror-address').hidden = isNew;
  $('#sync-address').hidden = state.sync !== 'connect';
  $('#back').hidden = step === 0;
  $('#continue').textContent = step === (isNew ? 2 : 1) ? 'Generate quote →' : 'Continue →';
  const estimate = calculateEstimate(state);
  $('#estimate-total').textContent = money(estimate.totalCents);
  $('#estimate-lines').innerHTML = linesMarkup(estimate);
  $('#dependency-notes').innerHTML = estimate.dependencies.map(({reason}) => `<p class="dependency-note">${escape(reason)}</p>`).join('');
  $('#unpriced-notes').innerHTML = estimate.unpriced.map((note) => `<p class="unpriced-note">${escape(note)} Not included in the total.</p>`).join('');
  updateQuoteValidity();
  persist();
}
function validateWebsite() {
  const needsWebsite = state.mode !== 'new' || state.sync === 'connect';
  if (!needsWebsite) return true;
  try {
    const url = new URL(state.website);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.') || url.username || url.password) throw new Error();
    return true;
  } catch {
    $('#form-error').textContent = 'Please enter your website’s full address, starting with https://.';
    step = state.mode === 'new' ? 2 : 0;
    update();
    const input = $(state.mode === 'new' ? '#sync-website' : '#website');
    if (state.mode === 'new') input.closest('details').open = true;
    input.focus();
    return false;
  }
}
function goToStep(next) {
  if (next > step && state.mode !== 'new' && !validateWebsite()) return;
  step = next;
  $('#form-error').textContent = '';
  update();
  $(`[data-panel="${step}"] h2`).focus();
}
$('#app-form').addEventListener('change', (event) => {
  const input = event.target;
  if (input.name === 'mode') {
    state = normaliseState({ ...state, mode: input.value });
    if (state.mode === 'new' && state.sync === 'none') state.website = '';
    syncInputs();
  } else if (['platform','accounts'].includes(input.name)) state[input.name] = input.value;
  else if (input.name === 'feature') state.features = [...document.querySelectorAll('input[name=feature]:checked')].map((item) => item.value);
  else if (input.id === 'sync') {
    state.sync = input.value;
    if (input.value !== 'connect') { state.website = ''; $('#sync-website').value = ''; }
  }
  update();
});
for (const id of ['website', 'sync-website', 'notes']) {
  $(`#${id}`).addEventListener('input', (event) => {
    state[id === 'notes' ? 'notes' : 'website'] = event.target.value;
    $('#form-error').textContent = '';
    update();
  });
}
document.querySelectorAll('[data-step]').forEach((button) => button.addEventListener('click', () => goToStep(Number(button.dataset.step))));
$('#back').addEventListener('click', () => goToStep(Math.max(0, step - 1)));
$('#app-form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (!validateWebsite()) return;
  if (step < (state.mode === 'new' ? 2 : 1)) { goToStep(step + 1); return; }
  state = normaliseState(state);
  snapshot = createAppQuoteSnapshot(state);
  code = encodeAppQuote(snapshot);
  renderQuote();
  persist();
  $('#generated-quote').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  $('#quote-heading').focus({ preventScroll: true });
});

function breakdown() {
  if (!snapshot) return '';
  const {quote, configuration} = snapshot;
  return [
    'BuiltByMatthew — Mobile app estimate',
    `App: ${MODES[configuration.mode].label}`, `Platform: ${platforms[configuration.platform]}`,
    configuration.website ? `Website: ${configuration.website}` : '', '',
    ...quote.lines.map((line) => `${line.label}${line.automatic ? ' (required)' : ''}: ${formatMoneyRange(line.amountCents)}`),
    `Estimated development total: ${formatMoneyRange(quote.totalCents)}`,
    ...quote.dependencies.map(({reason}) => reason), ...quote.unpriced,
    configuration.notes ? `Custom request: ${configuration.notes}` : '',
    'Unpriced requests, recurring hosting, app-store accounts and third-party charges are excluded. Final scope and price must be agreed before work begins.',
    `Generated: ${snapshot.generatedAt}`, `Pricing: ${snapshot.pricingVersion}`, '', `Configuration code: ${code}`,
  ].filter((line) => line !== '').join('\n');
}
function renderQuote() {
  if (!snapshot) return;
  const { quote, configuration } = snapshot;
  $('#generated-quote').hidden = false;
  $('#quote-code').value = code;
  $('#quote-content').innerHTML = `<p class="quote-meta">${escape(MODES[configuration.mode].label)} · ${escape(platforms[configuration.platform])}<br />Generated ${escape(new Date(snapshot.generatedAt).toLocaleDateString('en-AU'))}</p>${linesMarkup(quote)}${quote.dependencies.map(({reason}) => `<p class="dependency-note">${escape(reason)}</p>`).join('')}<p class="quote-total"><span>${quote.unpriced.length ? 'Known estimated total' : 'Estimated total'}</span><strong>${escape(formatMoneyRange(quote.totalCents))}</strong></p>${quote.unpriced.map((note) => `<p class="unpriced-note">${escape(note)} Not included in the total.</p>`).join('')}${configuration.website ? `<p class="quote-meta">Website: ${escape(configuration.website)}</p>` : ''}${configuration.notes ? `<p class="quote-meta">Custom request: ${escape(configuration.notes)}</p>` : ''}<p class="field-help">One-time development only. Recurring hosting, app-store accounts, subscriptions, and third-party usage charges are separate. Final scope and price are agreed before work begins.</p>`;
  updateQuoteValidity();
}
function updateQuoteValidity() {
  if (!snapshot) return;
  const outdated = Boolean(stale());
  $('#quote-status').dataset.stale = String(outdated);
  $('#quote-status').textContent = outdated ? 'Your choices have changed. Generate a new quote before emailing, copying, or printing it.' : 'Your estimate is ready. Save the configuration code to recover these exact prices later.';
  for (const id of ['copy-quote', 'copy-code', 'print-quote']) $(`#${id}`).disabled = outdated;
  const email = $('#email-quote');
  email.setAttribute('aria-disabled', String(outdated));
  if (outdated) { email.removeAttribute('href'); email.setAttribute('tabindex', '-1'); }
  else {
    email.removeAttribute('tabindex');
    // Keep mailto short enough for mail clients; the full portable code can be pasted separately.
    const body = `Hi Matthew,\n\nI'd like to discuss my mobile app.\n\nMy name:\nA little about my idea:\n\nApp: ${MODES[snapshot.configuration.mode].label}\nPlatform: ${platforms[snapshot.configuration.platform]}\nEstimated development: ${formatMoneyRange(snapshot.quote.totalCents)}\n\nI'll paste my copied quote below:\n\nThanks!`;
    email.href = `mailto:matthew@andomail.com?subject=${encodeURIComponent('Mobile app enquiry')}&body=${encodeURIComponent(body)}`;
  }
}
async function copy(value) {
  try {
    await navigator.clipboard.writeText(value);
    $('#copy-status').textContent = 'Copied. You can paste it into your email or save it for later.';
  } catch {
    $('#quote-code').closest('details').open = true;
    $('#quote-code').focus(); $('#quote-code').select();
    $('#copy-status').textContent = 'Clipboard access is unavailable. Your code is selected — copy it with your device’s copy command.';
  }
}
$('#copy-quote').addEventListener('click', () => { if (snapshot && !stale()) copy(breakdown()); });
$('#copy-code').addEventListener('click', () => { if (snapshot && !stale()) copy(code); });
$('#print-quote').addEventListener('click', () => { if (snapshot && !stale()) window.print(); });
$('#email-quote').addEventListener('click', (event) => { if (stale()) event.preventDefault(); });
syncInputs();
update();
renderQuote();
$('#builder-layout').hidden = false;
