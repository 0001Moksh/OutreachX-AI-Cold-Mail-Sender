import { constructMetadata } from "@/lib/seo";

export const metadata = constructMetadata({
  title: "Campaign Automation | OutreachX Deva",
  description: "Automate your cold email campaigns with OutreachX Deva. Set your sequence and let AI handle the sending, follow-ups, and inbox management.",
  canonical: "/campaign-automation",
});

export default function CampaignAutomationPage() {
  return (
    <main className="max-w-5xl mx-auto py-20 px-6 sm:px-12 space-y-16">
      <section className="text-center space-y-6">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white">
          Intelligent <span className="bg-gradient-to-r from-lime-400 to-green-600 bg-clip-text text-transparent">Campaign Automation</span>
        </h1>
        <p className="text-xl text-neutral-400 max-w-3xl mx-auto">
          Set it and forget it. Orchestrate complex, multi-step, multi-channel outreach campaigns with zero manual intervention.
        </p>
      </section>

      <section className="space-y-8 bg-neutral-900 border border-neutral-800 p-8 rounded-2xl">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">What is Campaign Automation?</h2>
          <p className="text-neutral-300 leading-relaxed">
            Campaign Automation is the scheduling and execution of a sequence of touchpoints (emails, LinkedIn messages, calls) over time. When powered by AI, these campaigns can dynamically adjust based on prospect behavior.
          </p>
        </div>
        
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">Who created OutreachX Deva?</h2>
          <p className="text-neutral-300 leading-relaxed">
            OutreachX Deva is an AI-powered outreach automation platform built by Moksh Bhardwaj, CTO and Co-Founder of Nexyug Tech. It brings enterprise-grade campaign automation to modern growth teams.
          </p>
        </div>
      </section>
    </main>
  );
}
