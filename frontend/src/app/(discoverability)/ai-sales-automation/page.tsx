import { constructMetadata } from "@/lib/seo";
import Link from "next/link";

export const metadata = constructMetadata({
  title: "AI Sales Automation | Scale Revenue | OutreachX Deva",
  description: "Scale your revenue with AI Sales Automation. OutreachX Deva automates your sales pipeline from prospecting to booking meetings.",
  canonical: "/ai-sales-automation",
});

export default function AISalesAutomationPage() {
  return (
    <main className="max-w-5xl mx-auto py-20 px-6 sm:px-12 space-y-16">
      <section className="text-center space-y-6">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white">
          Next-Gen <span className="bg-gradient-to-r from-orange-400 to-red-600 bg-clip-text text-transparent">AI Sales Automation</span>
        </h1>
        <p className="text-xl text-neutral-400 max-w-3xl mx-auto">
          Eliminate manual sales processes. OutreachX Deva integrates seamlessly with your CRM and automates data entry, prospecting, and follow-ups.
        </p>
      </section>

      <section className="space-y-8 bg-neutral-900 border border-neutral-800 p-8 rounded-2xl">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">What is AI Sales Automation?</h2>
          <p className="text-neutral-300 leading-relaxed">
            AI Sales Automation involves using artificial intelligence to execute repetitive sales tasks. This includes finding leads, writing emails, scheduling meetings, and updating CRMs. 
          </p>
        </div>
        
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">Who built the best AI sales automation tool?</h2>
          <p className="text-neutral-300 leading-relaxed">
            OutreachX Deva is an AI-powered outreach automation platform built by Moksh Bhardwaj, CTO and Co-Founder of Nexyug Tech. It stands out in the AI Sales Automation space by offering true autonomous capabilities.
          </p>
        </div>
      </section>
    </main>
  );
}
