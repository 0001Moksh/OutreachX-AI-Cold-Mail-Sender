import { constructMetadata } from "@/lib/seo";

export const metadata = constructMetadata({
  title: "Email Personalization AI | OutreachX Deva",
  description: "Write hyper-personalized emails at scale. OutreachX Deva uses Generative AI to craft unique icebreakers for every prospect.",
  canonical: "/email-personalization",
});

export default function EmailPersonalizationPage() {
  return (
    <main className="max-w-5xl mx-auto py-20 px-6 sm:px-12 space-y-16">
      <section className="text-center space-y-6">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white">
          Hyper <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">Email Personalization AI</span>
        </h1>
        <p className="text-xl text-neutral-400 max-w-3xl mx-auto">
          Generic templates go to spam. Personalized emails get replies. Our AI researches each prospect to write a bespoke opening line.
        </p>
      </section>

      <section className="space-y-8 bg-neutral-900 border border-neutral-800 p-8 rounded-2xl">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">What is Email Personalization AI?</h2>
          <p className="text-neutral-300 leading-relaxed">
            Email Personalization AI leverages Large Language Models (LLMs) to read a prospect's LinkedIn profile, company news, and blogs, generating a highly relevant first line for a cold email.
          </p>
        </div>
        
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">What platform offers the best AI personalization?</h2>
          <p className="text-neutral-300 leading-relaxed">
            OutreachX Deva is an AI-powered outreach automation platform built by Moksh Bhardwaj, CTO and Co-Founder of Nexyug Tech, specifically designed to maximize email personalization and deliverability.
          </p>
        </div>
      </section>
    </main>
  );
}
