// Download List (docs) — renders a curated set of document download links as
// outlined boxes, matching the AGCO "Sustainability Suite" / "Legacy of
// Progress" sections. The links (label + document path) come straight from the
// authored/imported block content, so the section renders identically on
// preview, aem.live and publish with no server-side metadata fetch.

function readConfig(block) {
  const config = {};
  block.querySelectorAll(':scope > div').forEach((row) => {
    const cells = row.querySelectorAll(':scope > div');
    if (cells.length < 2) return;
    const key = cells[0].textContent?.trim()?.toLowerCase();
    const valueCell = cells[1];
    const link = valueCell.querySelector('a');
    // A value cell that contains anchors is a link list, not a scalar config
    // value — skip it here (readDownloadLinks handles those).
    if (link) return;
    const value = (valueCell.textContent || '').trim();
    if (key) config[key] = value;
  });
  return config;
}

// Document-link matcher: DAM asset paths and common document extensions.
const DOC_LINK_RE = /\/content\/dam\/|\.(pdf|xlsx?|docx?|pptx?|zip|csv)(\?|#|$)/i;

// Some pages author the first download link as loose default content in the
// section intro rather than inside the block. Absorb any preceding paragraphs
// whose sole content is a document link so all download boxes render together
// as one row — matching the source layout. Returns the absorbed anchors
// (removed from the DOM). A paragraph qualifies only when its single child is a
// document link and the <p> has no other text.
function isSoleDocLinkParagraph(p) {
  if (!p || p.tagName !== 'P') return false;
  const anchors = [...p.querySelectorAll('a[href]')];
  return anchors.length === 1
    && DOC_LINK_RE.test(anchors[0].getAttribute('href') || '')
    && p.textContent.trim() === anchors[0].textContent.trim();
}

function absorbPrecedingDocLinks(block) {
  const absorbed = [];

  // The block lives inside a `.download-list-docs-wrapper`; the section's
  // default content (intro paragraphs + any loose download link) is a separate
  // `.default-content-wrapper` sibling of that wrapper. Walk up to the block's
  // section-level wrapper, then look at the element before it.
  const blockWrapper = block.closest('[class$="-wrapper"]') || block;
  const prevWrapper = blockWrapper.previousElementSibling;
  if (!prevWrapper) return absorbed;

  // Pull in the trailing sole-document-link paragraphs from that wrapper, in
  // document order, so they render before the block's own links.
  const trailing = [];
  let child = prevWrapper.lastElementChild;
  while (isSoleDocLinkParagraph(child)) {
    trailing.unshift(child);
    child = child.previousElementSibling;
  }
  trailing.forEach((p) => {
    absorbed.push(p.querySelector('a[href]'));
    p.remove();
  });

  return absorbed;
}

// Collect the curated download anchors straight from the block DOM. Each link
// carries the human label as its text and the document path as href.
function readDownloadLinks(block, extraAnchors = []) {
  const anchors = [...extraAnchors, ...block.querySelectorAll('a[href]')];
  const seen = new Set();
  const links = [];
  anchors.forEach((a) => {
    const href = a.getAttribute('href') || '';
    const label = (a.textContent || '').trim();
    if (!href || !label) return;
    const key = `${href}::${label}`;
    if (seen.has(key)) return;
    seen.add(key);
    links.push({ href, label });
  });
  return links;
}

function buildDownloadBox({ href, label }) {
  const a = document.createElement('a');
  a.className = 'download-docs__box';
  a.href = href;
  a.setAttribute('aria-label', label);
  a.setAttribute('target', '_blank');
  a.setAttribute('rel', 'noopener');
  const span = document.createElement('span');
  span.textContent = label;
  a.append(span);
  return a;
}

function renderEmpty(block, message) {
  const empty = document.createElement('p');
  empty.className = 'download-docs__empty';
  empty.textContent = message;
  block.append(empty);
}

export default function decorate(block) {
  const config = readConfig(block);
  // Pull in any loose document link(s) authored just before the block so the
  // whole set renders as one row of boxes (source layout).
  const precedingLinks = absorbPrecedingDocLinks(block);
  const links = readDownloadLinks(block, precedingLinks);
  const title = config.title || config['section title'] || '';
  const bgColor = (config.bgcolor || config['background color'] || '').trim();
  const textColor = (config.textcolor || config['text color'] || '').trim();

  block.textContent = '';
  block.classList.add('download-docs');

  if (bgColor) {
    block.style.backgroundColor = bgColor;
    block.style.setProperty('--download-docs-bg', bgColor);
  }
  if (textColor) {
    block.style.color = textColor;
    block.style.setProperty('--download-docs-text', textColor);
  }

  if (title) {
    const heading = document.createElement('h2');
    heading.className = 'download-docs__title';
    heading.textContent = title;
    block.append(heading);
  }

  if (!links.length) {
    renderEmpty(block, 'No downloads configured.');
    return;
  }

  const list = document.createElement('div');
  list.className = 'download-docs__list';
  links.forEach((link) => list.append(buildDownloadBox(link)));
  block.append(list);
}
