import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // The guest list is not secret, but it has no business being indexed.
      disallow: ['/admin', '/admin/', '/api/'],
    },
  };
}
