/** Small enhancement layer. Every article and link works without this script. */
export function initPublicNavigation(root) {
  const header = root.querySelector('.lp-header');
  const nav = header?.querySelector('.lp-nav');
  const navToggle = header?.querySelector('.lp-nav-toggle');
  const links = header?.querySelector('.lp-nav-links');
  const dropdown = root.querySelector('[data-dropdown]');
  const toggle = dropdown?.querySelector('.lp-dropdown-toggle');
  const listeners = new AbortController();
  const options = { signal: listeners.signal };
  const setDropdownOpen = (open) => {
    dropdown?.classList.toggle('open', open);
    toggle?.setAttribute('aria-expanded', String(open));
  };
  const setNavOpen = (open) => {
    header?.toggleAttribute('data-nav-open', open);
    navToggle?.setAttribute('aria-expanded', String(open));
    if (!open) setDropdownOpen(false);
  };
  if (navToggle) {
    navToggle.addEventListener('click', () => setNavOpen(!header.hasAttribute('data-nav-open')), options);
    links.addEventListener('click', (event) => {
      const link = event.target.closest('a[href]');
      if (!link || !header.hasAttribute('data-nav-open')) return;
      setNavOpen(false);
      // A same-page link must move keyboard focus out of the closed panel.
      const href = link.getAttribute('href');
      const target = href.startsWith('#') ? document.getElementById(href.slice(1)) : null;
      if (target) {
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      }
    }, options);
    nav.addEventListener('focusout', (event) => {
      if (!nav.contains(event.relatedTarget)) setNavOpen(false);
    }, options);
    const mobile = globalThis.matchMedia?.('(max-width: 900px)');
    mobile?.addEventListener('change', () => {
      if (!mobile.matches) setNavOpen(false);
    }, options);
  }
  if (toggle) {
    toggle.addEventListener('click', () => setDropdownOpen(!dropdown.classList.contains('open')), options);
    dropdown.addEventListener('focusout', (event) => {
      if (!dropdown.contains(event.relatedTarget)) setDropdownOpen(false);
    }, options);
  }
  document.addEventListener('click', (event) => {
    if (!dropdown?.contains(event.target)) setDropdownOpen(false);
    if (!header?.contains(event.target)) setNavOpen(false);
  }, options);
  root.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (dropdown?.classList.contains('open')) {
      setDropdownOpen(false);
      toggle.focus();
    } else if (header?.hasAttribute('data-nav-open')) {
      setNavOpen(false);
      navToggle.focus();
    }
  }, options);
  return () => listeners.abort();
}

export function initResourceSearch(root) {
  const input = root.querySelector('[data-resource-search]');
  if (!input) return;
  const cards = [...root.querySelectorAll('[data-resource]')];
  const status = root.querySelector('[data-search-status]');
  const empty = root.querySelector('[data-search-empty]');
  const update = () => {
    const terms = input.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
    let count = 0;
    for (const card of cards) {
      const text = card.textContent.toLowerCase();
      card.hidden = !terms.every((term) => text.includes(term));
      if (!card.hidden) count += 1;
    }
    for (const group of root.querySelectorAll('[data-resource-group]')) {
      group.hidden = ![...group.querySelectorAll('[data-resource]')].some((card) => !card.hidden);
    }
    empty.hidden = count !== 0;
    status.textContent = `${count} ${count === 1 ? 'article' : 'articles'}${terms.length ? ' found' : ' in this section'}`;
  };
  input.addEventListener('input', update);
  root.querySelector('[data-search-clear]').addEventListener('click', () => {
    input.value = '';
    update();
    input.focus();
  });
  update();
}

const root = document.querySelector('.site-public');
initPublicNavigation(root);
initResourceSearch(root);
