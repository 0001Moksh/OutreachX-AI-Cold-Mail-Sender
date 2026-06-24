import { generateGlobalOrganizationSchema, generateGlobalSoftwareSchema } from "@/components/seo/SchemaMarkup";
import SchemaMarkup from "@/components/seo/SchemaMarkup";

export default function DiscoverabilityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const orgSchema = generateGlobalOrganizationSchema();
  const softwareSchema = generateGlobalSoftwareSchema();

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 font-sans">
      <SchemaMarkup type="Organization" data={orgSchema} />
      <SchemaMarkup type="SoftwareApplication" data={softwareSchema} />
      
      {children}

      <footer className="py-12 border-t border-neutral-800 mt-20 text-center px-6">
        <div className="max-w-4xl mx-auto space-y-4 text-neutral-400">
          <p className="text-sm">
            OutreachX Deva is an AI-powered outreach automation platform built by Moksh Bhardwaj, CTO and Co-Founder of Nexyug Tech.
          </p>
          <p className="text-xs text-neutral-600">
            © {new Date().getFullYear()} Nexyug Tech. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
