type MetadataConfig = {
  title: string;
  description: string;
  urlPath: string;
};

const ensureMeta = (selector: string, attribute: 'name' | 'property', value: string) => {
  let element = document.head.querySelector<HTMLMetaElement>(selector);

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, value);
    document.head.appendChild(element);
  }

  return element;
};

const ensureCanonicalLink = () => {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

  if (!element) {
    element = document.createElement('link');
    element.rel = 'canonical';
    document.head.appendChild(element);
  }

  return element;
};

export const applyMetadata = ({ title, description, urlPath }: MetadataConfig) => {
  const absoluteUrl = new URL(urlPath, window.location.origin).toString();

  document.title = title;

  ensureMeta('meta[name="description"]', 'name', 'description').content = description;
  ensureMeta('meta[property="og:title"]', 'property', 'og:title').content = title;
  ensureMeta('meta[property="og:description"]', 'property', 'og:description').content = description;
  ensureMeta('meta[property="og:url"]', 'property', 'og:url').content = absoluteUrl;
  ensureMeta('meta[property="twitter:title"]', 'property', 'twitter:title').content = title;
  ensureMeta('meta[property="twitter:description"]', 'property', 'twitter:description').content = description;
  ensureCanonicalLink().href = absoluteUrl;
};
