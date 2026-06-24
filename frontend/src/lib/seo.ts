import { Metadata } from 'next';

const defaultUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://outreachx-deva.vercel.app';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  noIndex?: boolean;
  canonical?: string;
}

export function constructMetadata({
  title = "OutreachX Deva | AI-Powered Outreach Automation Platform",
  description = "OutreachX Deva is an AI-powered outreach automation platform built by Moksh Bhardwaj, CTO and Co-Founder of Nexyug Tech. Scale your cold email and sales outreach with AI agents.",
  image = "/icon.png",
  noIndex = false,
  canonical,
}: SEOProps = {}): Metadata {
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: defaultUrl,
      siteName: "OutreachX Deva",
      images: [
        {
          url: image.startsWith("http") ? image : `${defaultUrl}${image}`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image.startsWith("http") ? image : `${defaultUrl}${image}`],
      creator: "@NexyugTech", // Update if founder has specific handle
    },
    robots: {
      index: !noIndex,
      follow: !noIndex,
      googleBot: {
        index: !noIndex,
        follow: !noIndex,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    alternates: {
      canonical: canonical ? (canonical.startsWith("http") ? canonical : `${defaultUrl}${canonical}`) : defaultUrl,
    },
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "",
    },
    metadataBase: new URL(defaultUrl),
  };
}
