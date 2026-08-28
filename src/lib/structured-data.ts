import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/seo";

const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

export const organizationStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "NGO",
      "@id": ORGANIZATION_ID,
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/logo.png"),
      },
      email: "contact@institut-pmb.fr",
      address: {
        "@type": "PostalAddress",
        streetAddress: "648 rue des Prés Caton",
        postalCode: "74190",
        addressLocality: "Passy",
        addressCountry: "FR",
      },
      areaServed: {
        "@type": "AdministrativeArea",
        name: "Pays du Mont-Blanc",
      },
      sameAs: [
        "https://www.facebook.com/people/Institut-Écocitoyen-Pays-du-Mont-Blanc/61570992711918/",
        "https://www.instagram.com/institut_ecocitoyen_du_pays_mb",
        "https://www.youtube.com/@IECPMB",
        "https://www.linkedin.com/company/institut-ecocitoyen-pays-du-mont-blanc",
      ],
    },
    {
      "@type": "WebSite",
      "@id": WEBSITE_ID,
      url: SITE_URL,
      name: SITE_NAME,
      inLanguage: "fr-FR",
      publisher: { "@id": ORGANIZATION_ID },
    },
  ],
};

type BreadcrumbItem = {
  name: string;
  path: string;
};

export function createBreadcrumbStructuredData(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

type ContentStructuredDataOptions = {
  title: string;
  description: string;
  path: string;
  image?: string;
  publishedAt: string;
  author?: string;
  location?: {
    name: string;
    address?: string;
  };
};

export function createNewsArticleStructuredData({
  title,
  description,
  path,
  image = "/logo.png",
  publishedAt,
  author,
}: ContentStructuredDataOptions) {
  const url = absoluteUrl(path);

  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "@id": `${url}#article`,
    headline: title,
    description,
    image: [absoluteUrl(image)],
    datePublished: publishedAt,
    dateModified: publishedAt,
    inLanguage: "fr-FR",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    author: author
      ? { "@type": "Person", name: author }
      : { "@id": ORGANIZATION_ID },
    publisher: { "@id": ORGANIZATION_ID },
  };
}

export function createEventStructuredData({
  title,
  description,
  path,
  image = "/logo.png",
  publishedAt,
  location,
}: ContentStructuredDataOptions) {
  const url = absoluteUrl(path);

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    "@id": `${url}#event`,
    name: title,
    description,
    image: [absoluteUrl(image)],
    startDate: publishedAt,
    eventStatus: "https://schema.org/EventScheduled",
    url,
    inLanguage: "fr-FR",
    organizer: { "@id": ORGANIZATION_ID },
    ...(location
      ? {
          location: {
            "@type": "Place",
            name: location.name,
            ...(location.address
              ? {
                  address: {
                    "@type": "PostalAddress",
                    streetAddress: location.address,
                    addressCountry: "FR",
                  },
                }
              : {}),
          },
        }
      : {}),
  };
}
