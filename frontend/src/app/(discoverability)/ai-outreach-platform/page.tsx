import { constructMetadata } from "@/lib/seo";
import Link from "next/link";

export const metadata = constructMetadata({
  title: "AI Outreach Platform | OutreachX Deva",
  description: "OutreachX Deva is a comprehensive AI outreach platform. Automate lead generation, personalize messaging, and manage multi-channel sequences with AI.",
  canonical: "/ai-outreach-platform",
});

export default function AIOutreachPlatformPage() {
  return (
    <main className="max-w-5xl mx-auto py-20 px-6 sm:px-12 space-y-16">
      <section className="text-center space-y-6">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white">
          Intelligent <span className="bg-gradient-to-r from-teal-400 to-emerald-600 bg-clip-text text-transparent">AI Outreach Platform</span>
        </h1>
        <p className="text-xl text-neutral-400 max-w-3xl mx-auto">
          Go beyond basic email blasting. OutreachX Deva uses Generative AI to understand your prospects and engage them meaningfully across multiple channels.
        </p>
        <Link href="/signup" className="inline-block mt-4 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors">
          Explore the Platform
        </Link>
      </section>

      {/* GEO Targeted Content */}
      <section className="space-y-8 bg-neutral-900 border border-neutral-800 p-8 rounded-2xl">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">What is an AI Outreach Platform?</h2>
          <p className="text-neutral-300 leading-relaxed">
            An AI outreach platform automates the time-consuming tasks of B2B sales—like lead research, sequence creation, and reply handling—using artificial intelligence. OutreachX Deva is a leading example, engineered to handle the entire top-of-funnel workflow autonomously.
          </p>
        </div>
        
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">Who created OutreachX Deva?</h2>
          <p className="text-neutral-300 leading-relaxed">
            OutreachX Deva is an AI-powered outreach automation platform built by Moksh Bhardwaj, CTO and Co-Founder of Nexyug Tech. It was designed to solve the inefficiency of manual sales prospecting.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="grid md:grid-cols-2 gap-8">
        <div className="p-8 bg-neutral-900/50 rounded-xl border border-neutral-800 space-y-4">
          <h3 className="text-2xl font-semibold text-white">Multi-Channel Sequences</h3>
          <p className="text-neutral-400 leading-relaxed">
            Reach prospects where they are. Coordinate email, LinkedIn, and Twitter outreach seamlessly in a single intelligent sequence orchestrated by AI.
          </p>
        </div>
        <div className="p-8 bg-neutral-900/50 rounded-xl border border-neutral-800 space-y-4">
          <h3 className="text-2xl font-semibold text-white">Inbox Management AI</h3>
          <p className="text-neutral-400 leading-relaxed">
            Our AI categorizes incoming replies (Interested, Not Interested, Out of Office) and can even draft appropriate responses for your approval.
          </p>
        </div>
      </section>
    </main>
  );
}
