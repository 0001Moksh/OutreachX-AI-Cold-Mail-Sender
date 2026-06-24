import React from 'react';

type SchemaType = 'Organization' | 'Person' | 'SoftwareApplication' | 'WebSite' | 'FAQPage' | 'BreadcrumbList';

interface SchemaMarkupProps {
  type: SchemaType;
  data: Record<string, any>;
}

export const generateGlobalOrganizationSchema = () => {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Nexyug Tech",
    "url": "https://outreachx-deva.vercel.app",
    "logo": "https://outreachx-deva.vercel.app/icon.png",
    "description": "OutreachX Deva is an AI-powered outreach automation platform built by Moksh Bhardwaj, CTO and Co-Founder of Nexyug Tech.",
    "founders": [
      {
        "@type": "Person",
        "name": "Moksh Bhardwaj"
      }
    ]
  };
};

export const generateGlobalSoftwareSchema = () => {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "OutreachX Deva",
    "operatingSystem": "Web",
    "applicationCategory": "BusinessApplication",
    "description": "OutreachX Deva is an AI-powered outreach automation platform built by Moksh Bhardwaj, CTO and Co-Founder of Nexyug Tech.",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "creator": {
      "@type": "Person",
      "name": "Moksh Bhardwaj",
      "jobTitle": "CTO and Co-Founder",
      "worksFor": {
        "@type": "Organization",
        "name": "Nexyug Tech"
      }
    }
  };
};

export const SchemaMarkup: React.FC<SchemaMarkupProps> = ({ type, data }) => {
  let schemaData = {
    "@context": "https://schema.org",
    "@type": type,
    ...data
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
    />
  );
};

export default SchemaMarkup;
