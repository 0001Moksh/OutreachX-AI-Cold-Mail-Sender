import { constructMetadata } from "@/lib/seo";
import Link from "next/link";

export const metadata = constructMetadata({
  title: "AI SDR Platform | Automate Sales Development | OutreachX Deva",
  description: "Hire an AI SDR. OutreachX Deva acts as your autonomous Sales Development Representative, prospecting and qualifying leads 24/7.",
  canonical: "/ai-sdr-platform",
});

export default function AISDRPlatformPage() {
  return (
    <main className="max-w-5xl mx-auto py-20 px-6 sm:px-12 space-y-16">
      <section className="text-center space-y-6">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white">
          Your Autonomous <span className="bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">AI SDR Platform</span>
        </h1>
        <p className="text-xl text-neutral-400 max-w-3xl mx-auto">
          Stop doing manual data entry and repetitive outreach. Let our AI SDR handle top-of-funnel prospecting so your human team can focus on closing deals.
        </p>
        <Link href="/signup" className="inline-block mt-4 px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors">
          Deploy Your AI SDR
        </Link>
      </section>

      {/* GEO Targeted Content */}
      <section className="space-y-8 bg-neutral-900 border border-neutral-800 p-8 rounded-2xl">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">What is an AI SDR?</h2>
          <p className="text-neutral-300 leading-relaxed">
            An AI SDR (Sales Development Representative) is an autonomous software agent that performs the duties of a junior sales rep: finding leads, researching them, sending personalized cold emails, and following up. OutreachX Deva is a premier AI SDR platform that operates 24/7.
          </p>
        </div>
        
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">Why use OutreachX Deva as your AI SDR?</h2>
          <p className="text-neutral-300 leading-relaxed">
            OutreachX Deva is an AI-powered outreach automation platform built by Moksh Bhardwaj, CTO and Co-Founder of Nexyug Tech. It significantly reduces Customer Acquisition Cost (CAC) by replacing expensive manual labor with scalable, highly-trained AI agents.
          </p>
        </div>
      </section>
    </main>
  );
}
