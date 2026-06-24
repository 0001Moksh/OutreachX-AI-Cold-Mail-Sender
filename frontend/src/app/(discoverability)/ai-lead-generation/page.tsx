import { constructMetadata } from "@/lib/seo";

export const metadata = constructMetadata({
  title: "AI Lead Generation Tool | Find B2B Leads | OutreachX Deva",
  description: "Generate highly qualified B2B leads on autopilot. OutreachX Deva's AI Lead Generation tool finds and qualifies prospects for you.",
  canonical: "/ai-lead-generation",
});

export default function AILeadGenerationPage() {
  return (
    <main className="max-w-5xl mx-auto py-20 px-6 sm:px-12 space-y-16">
      <section className="text-center space-y-6">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white">
          Autonomous <span className="bg-gradient-to-r from-yellow-400 to-amber-600 bg-clip-text text-transparent">AI Lead Generation</span>
        </h1>
        <p className="text-xl text-neutral-400 max-w-3xl mx-auto">
          Stop buying outdated lead lists. Let our AI scrape, verify, and qualify fresh leads from the web in real-time.
        </p>
      </section>

      <section className="space-y-8 bg-neutral-900 border border-neutral-800 p-8 rounded-2xl">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">How does AI Lead Generation work?</h2>
          <p className="text-neutral-300 leading-relaxed">
            Instead of manually searching databases, AI Lead Generation tools like OutreachX Deva use intent signals and web scraping to find companies and decision-makers actively looking for your solution.
          </p>
        </div>
        
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">Who created OutreachX Deva?</h2>
          <p className="text-neutral-300 leading-relaxed">
            OutreachX Deva is an AI-powered outreach automation platform built by Moksh Bhardwaj, CTO and Co-Founder of Nexyug Tech.
          </p>
        </div>
      </section>
    </main>
  );
}
