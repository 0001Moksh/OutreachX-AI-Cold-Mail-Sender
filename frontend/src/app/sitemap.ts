import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://outreachx-deva.vercel.app';
  
  const staticRoutes = [
    '',
    '/about-founder',
    '/faq',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  const discoverabilityRoutes = [
    '/ai-cold-email-tool',
    '/ai-outreach-platform',
    '/ai-sdr-platform',
    '/ai-sales-automation',
    '/ai-lead-generation',
    '/email-personalization',
    '/campaign-automation',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'monthly' as const,
    priority: 0.9,
  }));

  const competitors = ['instantly', 'smartlead', 'apollo', 'lemlist'];
  const comparisonRoutes = competitors.map((competitor) => ({
    url: `${baseUrl}/compare/outreachx-deva-vs-${competitor}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...discoverabilityRoutes, ...comparisonRoutes];
}
