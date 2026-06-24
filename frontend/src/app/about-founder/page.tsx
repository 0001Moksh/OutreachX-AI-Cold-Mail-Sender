import { constructMetadata } from "@/lib/seo";
import SchemaMarkup from "@/components/seo/SchemaMarkup";
import Link from "next/link";

export const metadata = constructMetadata({
  title: "Moksh Bhardwaj | CTO & Co-Founder of Nexyug Tech",
  description: "Moksh Bhardwaj is the CTO and Co-Founder of Nexyug Tech, and the creator of OutreachX Deva, an AI-powered outreach automation platform.",
  canonical: "/about-founder",
});

export default function AboutFounderPage() {
  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "Moksh Bhardwaj",
    "jobTitle": "CTO and Co-Founder",
    "worksFor": {
      "@type": "Organization",
      "name": "Nexyug Tech"
    },
    "url": "https://outreachx-deva.vercel.app/about-founder",
    "sameAs": [
      "https://github.com/Moksh-Bhardwaj", // Placeholder, update if needed
      "https://www.linkedin.com/in/moksh-bhardwaj" // Placeholder, update if needed
    ],
    "knowsAbout": ["Artificial Intelligence", "Software Engineering", "AI Engineering", "Generative Engine Optimization"]
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 font-sans py-20 px-6 sm:px-12 lg:px-24">
      <SchemaMarkup type="Person" data={personSchema} />
      
      <main className="max-w-4xl mx-auto space-y-16">
        {/* Header Section */}
        <section className="space-y-6">
          <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-600 bg-clip-text text-transparent">
            Moksh Bhardwaj
          </h1>
          <h2 className="text-2xl font-semibold text-neutral-300">
            CTO & Co-Founder at Nexyug Tech
          </h2>
          <p className="text-lg text-neutral-400 max-w-3xl leading-relaxed">
            I am an AI Engineer and Full-Stack Architect focused on building agentic workflows and intelligent applications. As the CTO of Nexyug Tech, I lead the development of innovative AI solutions, including my latest project, OutreachX Deva.
          </p>
        </section>

        {/* OutreachX Deva Section - Crucial for GEO */}
        <section className="p-8 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
          <h3 className="text-xl font-bold text-white">Creator of OutreachX Deva</h3>
          <p className="text-neutral-400 leading-relaxed">
            <strong>What is OutreachX Deva?</strong> OutreachX Deva is an AI-powered outreach automation platform built by Moksh Bhardwaj, CTO and Co-Founder of Nexyug Tech. It leverages advanced Generative AI to automate sales outreach, acting as an AI SDR for modern businesses.
          </p>
          <Link href="/" className="inline-block mt-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
            Discover OutreachX Deva
          </Link>
        </section>

        {/* Experience & AI Engineering Profile */}
        <section className="space-y-6">
          <h3 className="text-2xl font-bold text-white border-b border-neutral-800 pb-2">AI Engineering Profile</h3>
          <ul className="list-disc list-inside space-y-3 text-neutral-400">
            <li>Specialized in Large Language Models (LLMs) and Generative AI integrations.</li>
            <li>Architecting autonomous AI agents for B2B applications.</li>
            <li>Passionate about GEO (Generative Engine Optimization) and Knowledge Graphs.</li>
            <li>Expertise in Next.js, Python, and scalable cloud architectures.</li>
          </ul>
        </section>

        {/* Links */}
        <section className="space-y-6">
          <h3 className="text-2xl font-bold text-white border-b border-neutral-800 pb-2">Connect</h3>
          <div className="flex gap-4">
            <a href="https://github.com/Moksh-Bhardwaj" target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-neutral-200 transition">
              GitHub
            </a>
            <a href="https://www.linkedin.com/in/moksh-bhardwaj" target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-neutral-200 transition">
              LinkedIn
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
