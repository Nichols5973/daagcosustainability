/**
 * AGCO footer block.
 *
 * Content-first and metadata-independent: fetches the footer fragment directly
 * (dual-fetch) rather than resolving a path from page metadata. Parses the flat
 * semantic fragment and renders the dark navy footer.
 */

/**
 * Fetch the footer fragment HTML, trying the content-prefixed path first and
 * falling back to the site root.
 * @returns {Promise<string|null>} raw fragment HTML, or null if unavailable
 */
async function fetchFooterHtml() {
  const paths = ['/content/footer.plain.html', '/footer.plain.html'];
  return paths.reduce(async (prev, path) => {
    const resolved = await prev;
    if (resolved !== null) return resolved;
    try {
      const resp = await fetch(path);
      if (resp.ok) return resp.text();
    } catch (e) {
      // try next path
    }
    return null;
  }, Promise.resolve(null));
}

/**
 * Parse raw fragment HTML into a document body element.
 * @param {string} html
 * @returns {HTMLElement}
 */
function parseFragment(html) {
  return new DOMParser().parseFromString(html, 'text/html').body;
}

/**
 * Build a labelled link column from a heading and its following list.
 * @param {HTMLElement} heading source heading element
 * @param {HTMLElement} list source list element
 * @returns {HTMLElement} column element
 */
function buildLinkColumn(heading, list) {
  const column = document.createElement('div');
  column.className = 'footer-column';
  const title = document.createElement('h4');
  title.textContent = heading.textContent.trim();
  column.append(title);
  if (list) column.append(list.cloneNode(true));
  return column;
}

/**
 * Build the brand column: logo, blurb paragraphs, and the FOLLOW AGCO social row.
 * @param {HTMLElement} source top-level source section
 * @returns {HTMLElement} brand column element
 */
function buildBrandColumn(source) {
  const column = document.createElement('div');
  column.className = 'footer-column footer-brand';

  const children = [...source.children];
  const firstHeadingIndex = children.findIndex((el) => el.tagName === 'H4');
  const leadNodes = firstHeadingIndex === -1 ? children : children.slice(0, firstHeadingIndex);

  // Logo + blurb (everything before the first heading, e.g. FOLLOW AGCO).
  leadNodes.forEach((node) => {
    const clone = node.cloneNode(true);
    const img = clone.querySelector('img');
    if (img) clone.classList.add('footer-logo');
    column.append(clone);
  });

  // FOLLOW AGCO heading + social icon row.
  const followHeading = children.find(
    (el) => el.tagName === 'H4' && /follow/i.test(el.textContent),
  );
  if (followHeading) {
    const title = document.createElement('h4');
    title.textContent = followHeading.textContent.trim();
    column.append(title);

    const socialSource = followHeading.nextElementSibling;
    if (socialSource) {
      const social = document.createElement('div');
      social.className = 'footer-social';
      socialSource.querySelectorAll('a').forEach((a) => social.append(a.cloneNode(true)));
      column.append(social);
    }
  }

  return column;
}

/**
 * Build the top area (brand column + link columns) from the first source section.
 * @param {HTMLElement} source first top-level source section
 * @returns {HTMLElement} top area element
 */
function buildTopArea(source) {
  const top = document.createElement('div');
  top.className = 'footer-top';

  top.append(buildBrandColumn(source));

  // Every non-FOLLOW heading + its adjacent list becomes a link column.
  [...source.children]
    .filter((el) => el.tagName === 'H4' && !/follow/i.test(el.textContent))
    .forEach((heading) => {
      const list = heading.nextElementSibling && heading.nextElementSibling.tagName === 'UL'
        ? heading.nextElementSibling
        : null;
      top.append(buildLinkColumn(heading, list));
    });

  return top;
}

/**
 * Build the bottom legal bar (copyright + pipe-separated legal links).
 * @param {HTMLElement} source second top-level source section
 * @returns {HTMLElement} legal bar element
 */
function buildLegalBar(source) {
  const bar = document.createElement('div');
  bar.className = 'footer-legal';

  const copySource = [...source.children].find((el) => el.tagName === 'P');
  if (copySource) {
    const copyright = document.createElement('p');
    copyright.className = 'footer-copyright';
    copyright.textContent = copySource.textContent.trim();
    bar.append(copyright);
  }

  const listSource = source.querySelector('ul');
  if (listSource) {
    const links = document.createElement('ul');
    links.className = 'footer-legal-links';
    listSource.querySelectorAll('li').forEach((li) => links.append(li.cloneNode(true)));
    bar.append(links);
  }

  return bar;
}

/**
 * Loads and decorates the footer.
 * @param {Element} block the footer block element
 */
export default async function decorate(block) {
  const html = await fetchFooterHtml();
  block.textContent = '';
  if (!html) return;

  const fragment = parseFragment(html);
  const sections = [...fragment.children].filter((el) => el.tagName === 'DIV');
  if (sections.length === 0) return;

  const footer = document.createElement('div');
  footer.className = 'footer-content';

  footer.append(buildTopArea(sections[0]));
  if (sections[1]) footer.append(buildLegalBar(sections[1]));

  block.append(footer);
}
