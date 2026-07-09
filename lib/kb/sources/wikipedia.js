/* Wikipedia adapter — the RESEARCH stage (docs/KNOWLEDGE-BASE-PLAN.md §3).
   Hits the Wikimedia REST `page/summary/<title>` endpoint (one GET, no key),
   returns a normalized concept summary + CC BY-SA attribution. See
   ./_shared.js for the adapter contract. */
import { USER_AGENT } from './_shared.js';

const REST_SUMMARY = 'https://en.wikipedia.org/api/rest_v1/page/summary/';

// CC BY-SA is a Wikipedia licensing REQUIREMENT: every rendered card must show
// attribution + a link back to the article (§10 "Licensing").
function attributionFor(url) {
  return {
    source: 'Wikipedia',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    url: url || 'https://en.wikipedia.org/',
    text: 'From Wikipedia, the free encyclopedia — text available under CC BY-SA 4.0.',
  };
}

export const wikipedia = {
  source: 'wikipedia',

  queryKey(concept) {
    if (!concept || typeof concept.wikipedia !== 'string' || !concept.wikipedia) return null;
    return concept.wikipedia; // en.wikipedia page title, e.g. 'Dot_product'
  },

  // Pure normalization of a REST page/summary JSON body.
  parse(raw) {
    const r = raw && typeof raw === 'object' ? raw : {};
    const url =
      (r.content_urls && r.content_urls.desktop && r.content_urls.desktop.page) ||
      (r.content_urls && r.content_urls.mobile && r.content_urls.mobile.page) ||
      (typeof r.title === 'string'
        ? 'https://en.wikipedia.org/wiki/' + encodeURIComponent(r.title.replace(/ /g, '_'))
        : 'https://en.wikipedia.org/');
    return {
      title: r.title || r.displaytitle || null,
      summary: typeof r.extract === 'string' ? r.extract : '',
      url,
      attribution: attributionFor(url),
    };
  },

  async fetch(queryKey, { fetchImpl = fetch } = {}) {
    const url = REST_SUMMARY + encodeURIComponent(queryKey);
    const res = await fetchImpl(url, {
      headers: { 'User-Agent': USER_AGENT, 'Api-User-Agent': USER_AGENT, Accept: 'application/json' },
    });
    if (!res.ok) throw new Error('wikipedia: HTTP ' + res.status + ' for ' + queryKey);
    return wikipedia.parse(await res.json());
  },
};
