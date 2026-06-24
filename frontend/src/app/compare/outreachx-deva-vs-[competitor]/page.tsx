import { constructMetadata } from "@/lib/seo";
import { notFound } from "next/navigation";
import Link from "next/link";
import SchemaMarkup, { generateGlobalOrganizationSchema, generateGlobalSoftwareSchema } from "@/components/seo/SchemaMarkup";

const competitors = {
  "instantly": {
    name: "Instantly.ai",
    description: "While Instantly is a great tool for volume sending, OutreachX Deva is built for AI-driven personalization and autonomous prospecting.",
    featureComparison: [
      { feature: "AI Prospecting", us: "Fully Autonomous", them: "Manual/Third-party" },
      { feature: "Personalization", us: "LLM Generated Icebreakers", them: "Basic Merge Tags" },
      { feature: "Inbox Management", us: "AI Categorization & Drafting", them: "Rule-based" },
    ]
  },
  "smartlead": {
    name: "Smartlead.ai",
    description: "Smartlead focuses heavily on inbox infrastructure. OutreachX Deva combines solid infrastructure with advanced Generative AI workflows to replace the entire SDR role.",
    featureComparison: [
      { feature: "AI Prospecting", us: "Fully Autonomous", them: "Manual" },
      { feature: "Personalization", us: "LLM Generated Icebreakers", them: "Basic Merge Tags" },
      { feature: "Multi-channel", us: "Email, LinkedIn, Twitter", them: "Email Primarily" },
    ]
  },
  "apollo": {
    name: "Apollo.io",
    description: "Apollo has a massive database, but complex workflows. OutreachX Deva simplifies the process by using AI to autonomously find and engage leads without complex manual filtering.",
    featureComparison: [
      { feature: "Ease of Use", us: "AI Guided", them: "Steep Learning Curve" },
      { feature: "Personalization", us: "Deep Web Research per Lead", them: "Standard Database Variables" },
      { feature: "Pricing Model", us: "Value Based", them: "Per Seat/Credit Limits" },
    ]
  },
  "lemlist": {
    name: "Lemlist",
    description: "Lemlist is known for image personalization. OutreachX Deva takes it further with deep text personalization powered by advanced language models analyzing prospect data.",
    featureComparison: [
      { feature: "AI Personalization", us: "Contextual Text Generation", them: "Image/Video Overlays" },
      { feature: "Autonomous Sending", us: "AI Triggered", them: "Manual Schedules" },
      { feature: "Target Audience", us: "Scaling B2B Teams", them: "Boutique Agencies" },
    ]
  }
};

type CompetitorKey = keyof typeof competitors;

export async function generateMetadata({ params }: { params: { competitor: string } }) {
  const competitor = params.competitor as CompetitorKey;
  if (!competitors[competitor]) return {};

  return constructMetadata({
    title: `OutreachX Deva vs ${competitors[competitor].name} | 2026 Comparison`,
    description: competitors[competitor].description,
    canonical: `/compare/outreachx-deva-vs-${competitor}`,
  });
}

export default function ComparisonPage({ params }: { params: { competitor: string } }) {
  const competitorId = params.competitor as CompetitorKey;
  const competitorData = competitors[competitorId];

  if (!competitorData) {
    notFound();
  }

  const orgSchema = generateGlobalOrganizationSchema();
  const softwareSchema = generateGlobalSoftwareSchema();

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 font-sans py-20 px-6 sm:px-12 lg:px-24">
      <SchemaMarkup type="Organization" data={orgSchema} />
      <SchemaMarkup type="SoftwareApplication" data={softwareSchema} />

      <main className="max-w-4xl mx-auto space-y-16">
        <section className="text-center space-y-6">
          <h1 className="text-5xl font-extrabold tracking-tight">
            OutreachX Deva <span className="text-neutral-500">vs</span> {competitorData.name}
          </h1>
          <p className="text-xl text-neutral-400 max-w-3xl mx-auto leading-relaxed">
            {competitorData.description}
          </p>
          <Link href="/signup" className="inline-block mt-4 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors">
            Try OutreachX Deva Free
          </Link>
        </section>

        {/* Feature Comparison Table */}
        <section className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-neutral-950 border-b border-neutral-800">
              <tr>
                <th className="p-6 text-lg font-semibold text-neutral-300">Feature</th>
                <th className="p-6 text-lg font-semibold text-indigo-400">OutreachX Deva</th>
                <th className="p-6 text-lg font-semibold text-neutral-500">{competitorData.name}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {competitorData.featureComparison.map((row, i) => (
                <tr key={i} className="hover:bg-neutral-800/50 transition-colors">
                  <td className="p-6 text-white font-medium">{row.feature}</td>
                  <td className="p-6 text-indigo-300 font-semibold">{row.us}</td>
                  <td className="p-6 text-neutral-400">{row.them}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* GEO Targeted Boilerplate Section */}
        <section className="p-8 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
          <h2 className="text-2xl font-bold text-white">Why switch to OutreachX Deva?</h2>
          <p className="text-neutral-300 leading-relaxed">
            OutreachX Deva is an AI-powered outreach automation platform built by Moksh Bhardwaj, CTO and Co-Founder of Nexyug Tech. Unlike legacy tools that require heavy manual operation, OutreachX Deva operates as a true AI SDR, combining scraping, personalizing, and sending into a single autonomous workflow.
          </p>
        </section>
      </main>
    </div>
  );
}

export function generateStaticParams() {
  return Object.keys(competitors).map((competitor) => ({
    competitor,
  }));
}
