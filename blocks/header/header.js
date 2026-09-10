// AGCO desktop header / navigation.
// Content-first: all links, labels and images live in /content/nav.plain.html.
// This module fetches that fragment (metadata-independent dual fetch), then
// builds the two-row transparent header, the megamenu dropdowns, the search
// control, the locale selector and the utility bar. Generic, reusable helpers
// only — no site-specific function names.

const DESKTOP_MQ = window.matchMedia('(min-width: 900px)');

/**
 * Fetch the nav fragment, trying the content path first and then the root path.
 * Deliberately does not use metadata so it works in any environment.
 * @returns {Promise<string>} raw HTML of the fragment (empty string on failure)
 */
async function fetchNavFragment() {
  const paths = ['/content/nav.plain.html', '/nav.plain.html'];
  for (let i = 0; i < paths.length; i += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const resp = await fetch(paths[i]);
      if (resp.ok) {
        // eslint-disable-next-line no-await-in-loop
        return await resp.text();
      }
    } catch (e) {
      // try next path
    }
  }
  return '';
}

/** Parse a raw HTML string into an array of top-level section elements. */
function parseSections(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return [...doc.body.children];
}

/** Close every open dropdown/panel within the given nav element. */
function closeAllPanels(nav) {
  nav.querySelectorAll('[aria-expanded="true"]').forEach((el) => {
    el.setAttribute('aria-expanded', 'false');
  });
  nav.classList.remove('nav-open');
  nav.querySelector('.nav-search')?.classList.remove('nav-search-active');
}

/** Build the brand bar (logo + brand logos) from the first section. */
function buildBrandBar(section) {
  const bar = document.createElement('div');
  bar.className = 'nav-brand-bar';

  const paragraphs = [...section.querySelectorAll('p')];
  const logoP = paragraphs[0];
  const brandsP = paragraphs[1];

  if (logoP) {
    const logo = document.createElement('div');
    logo.className = 'nav-logo';
    // The logo may arrive as a linked image (<a><img></a>) or, after a JCR
    // round-trip that unwraps solo linked-images, as a bare <picture>/<img>.
    // Handle both: prefer an existing link, otherwise append the image itself.
    const link = logoP.querySelector('a');
    const img = logoP.querySelector('picture, img');
    if (link && link.querySelector('picture, img, svg')) {
      logo.append(link);
    } else if (img) {
      logo.append(img);
    } else if (link) {
      logo.append(link);
    }
    bar.append(logo);
  }

  if (brandsP) {
    const brands = document.createElement('div');
    brands.className = 'nav-brand-logos';
    brandsP.querySelectorAll('a').forEach((link) => {
      link.classList.add('nav-brand-logo');
      brands.append(link);
    });
    bar.append(brands);
  }

  return bar;
}

/** Build the search control (icon button that reveals an input on click). */
function buildSearch() {
  const search = document.createElement('div');
  search.className = 'nav-search';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'nav-search-toggle';
  toggle.setAttribute('aria-label', 'Search');
  toggle.setAttribute('aria-expanded', 'false');

  const field = document.createElement('div');
  field.className = 'nav-search-field';

  const input = document.createElement('input');
  input.type = 'search';
  input.placeholder = 'Search';
  input.className = 'nav-search-input';
  field.append(input);

  toggle.addEventListener('click', () => {
    const active = search.classList.toggle('nav-search-active');
    toggle.setAttribute('aria-expanded', active ? 'true' : 'false');
    if (active) input.focus();
  });

  search.append(toggle, field);
  return search;
}

/**
 * Build the locale selector from a language list (heading + <ul>).
 * @param {HTMLHeadingElement} heading the "Language" heading element
 * @param {HTMLUListElement} list the list of locale links
 */
function buildLocaleSelector(heading, list) {
  const locale = document.createElement('div');
  locale.className = 'nav-locale';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'nav-locale-toggle';
  toggle.setAttribute('aria-expanded', 'false');
  const current = list.querySelector('li a');
  toggle.textContent = current ? current.textContent.trim().slice(0, 2).toUpperCase() : 'EN';

  const panel = document.createElement('div');
  panel.className = 'nav-locale-panel';
  panel.append(list);
  if (heading) heading.remove();

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  });

  locale.append(toggle, panel);
  return locale;
}

/**
 * Wire a top-level nav item that owns a dropdown panel (has content beyond
 * its own link) for hover and click behavior.
 */
function wireDropdown(item, nav) {
  const link = item.querySelector(':scope > a');
  const hasPanel = item.querySelector(':scope > ul, :scope > h3');
  if (!hasPanel) {
    item.classList.add('nav-plain-link');
    return;
  }

  item.classList.add('nav-drop');
  item.setAttribute('aria-expanded', 'false');

  // Wrap the panel content into a dark card, grouping each heading + its list
  // into a column so the megamenu lays out as clean multi-column groups.
  const panel = document.createElement('div');
  panel.className = 'nav-panel';
  let column = null;
  [...item.children].forEach((child) => {
    if (child === link) return;
    if (child.tagName === 'H3') {
      column = document.createElement('div');
      column.className = 'nav-col';
      column.append(child);
      panel.append(column);
    } else if (child.tagName === 'UL') {
      if (!column) {
        column = document.createElement('div');
        column.className = 'nav-col';
        panel.append(column);
      }
      column.append(child);
      column = null;
    }
  });
  item.append(panel);

  const openPanel = () => {
    nav.querySelectorAll('.nav-drop[aria-expanded="true"]').forEach((el) => {
      if (el !== item) el.setAttribute('aria-expanded', 'false');
    });
    item.setAttribute('aria-expanded', 'true');
    nav.classList.add('nav-open');
  };
  const closePanel = () => {
    item.setAttribute('aria-expanded', 'false');
    if (!nav.querySelector('.nav-drop[aria-expanded="true"]')) {
      nav.classList.remove('nav-open');
    }
  };

  item.addEventListener('mouseenter', () => {
    if (DESKTOP_MQ.matches) openPanel();
  });
  item.addEventListener('mouseleave', () => {
    if (DESKTOP_MQ.matches) closePanel();
  });
  if (link) {
    link.addEventListener('click', (e) => {
      if (!DESKTOP_MQ.matches) {
        e.preventDefault();
        const expanded = item.getAttribute('aria-expanded') === 'true';
        if (expanded) closePanel();
        else openPanel();
      }
    });
  }
}

/** Build the main nav (primary links + megamenu panels) from the middle section. */
function buildMainNav(section, nav) {
  const wrapper = document.createElement('div');
  wrapper.className = 'nav-main';

  const primaryList = section.querySelector(':scope > ul');
  if (primaryList) {
    primaryList.classList.add('nav-primary');
    [...primaryList.children].forEach((item) => wireDropdown(item, nav));
    wrapper.append(primaryList);
  }

  const tools = document.createElement('div');
  tools.className = 'nav-tools';
  tools.append(buildSearch());

  // Language heading + list -> locale selector.
  const langHeading = [...section.querySelectorAll(':scope > h3')].find(
    (h) => /language/i.test(h.textContent),
  );
  const localeList = langHeading ? langHeading.nextElementSibling : null;
  if (localeList && localeList.tagName === 'UL') {
    tools.append(buildLocaleSelector(langHeading, localeList));
  }

  wrapper.append(tools);
  return wrapper;
}

/** Build the bottom utility bar from the last section. */
function buildUtilityBar(section) {
  const bar = document.createElement('div');
  bar.className = 'nav-utility-bar';
  const list = section.querySelector(':scope > ul');
  if (list) {
    list.classList.add('nav-utility');
    bar.append(list);
  }
  return bar;
}

/**
 * Decorate the header block.
 * @param {Element} block the header block element
 */
export default async function decorate(block) {
  const html = await fetchNavFragment();
  block.textContent = '';
  if (!html) return;

  const sections = parseSections(html);
  const brandSection = sections[0];
  const mainSection = sections[1];
  const utilitySection = sections[2];

  const nav = document.createElement('nav');
  nav.className = 'nav-transparent';
  nav.setAttribute('aria-label', 'Main navigation');

  if (brandSection && mainSection) {
    const topRow = document.createElement('div');
    topRow.className = 'nav-row nav-row-top';
    topRow.append(buildBrandBar(brandSection));
    topRow.append(buildMainNav(mainSection, nav));
    // Move brand logos into the right-hand tools cluster for the AGCO layout.
    const brandLogos = topRow.querySelector('.nav-brand-logos');
    const tools = topRow.querySelector('.nav-tools');
    if (brandLogos && tools) tools.append(brandLogos);
    nav.append(topRow);
  }

  if (utilitySection) {
    const bottomRow = document.createElement('div');
    bottomRow.className = 'nav-row nav-row-bottom';
    bottomRow.append(buildUtilityBar(utilitySection));
    nav.append(bottomRow);
  }

  block.append(nav);

  // Solid background when the page is scrolled past the hero.
  const onScroll = () => {
    if (window.scrollY > 10) nav.classList.add('nav-scrolled');
    else nav.classList.remove('nav-scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Close panels when clicking outside the header.
  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target)) closeAllPanels(nav);
  });

  // Close panels on Escape.
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') closeAllPanels(nav);
  });

  // Close open menus when crossing the desktop/mobile breakpoint.
  const onBreakpointChange = () => closeAllPanels(nav);
  if (DESKTOP_MQ.addEventListener) {
    DESKTOP_MQ.addEventListener('change', onBreakpointChange);
  } else if (DESKTOP_MQ.addListener) {
    DESKTOP_MQ.addListener(onBreakpointChange);
  }
}
