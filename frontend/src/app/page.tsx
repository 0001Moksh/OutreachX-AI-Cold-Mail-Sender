"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

import Header from "@/components/landing/Header";
import HeroSection from "@/components/landing/HeroSection";
import SocialProof from "@/components/landing/SocialProof";
import WhatIsOutreachX from "@/components/landing/WhatIsOutreachX";
import MeetDeva from "@/components/landing/MeetDeva";
import WorkflowSection from "@/components/landing/WorkflowSection";
import FeatureGrid from "@/components/landing/FeatureGrid";
import ProductShowcase from "@/components/landing/ProductShowcase";
import DevaChatDemo from "@/components/landing/DevaChatDemo";
import Showcases from "@/components/landing/Showcases";
import SecuritySection from "@/components/landing/SecuritySection";
import ComparisonSection from "@/components/landing/ComparisonSection";
import HowItWorks from "@/components/landing/HowItWorks";
import Testimonials from "@/components/landing/Testimonials";
import FAQSection from "@/components/landing/FAQSection";
import PricingPreview from "@/components/landing/PricingPreview";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";

export default function LandingPage() {
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="bg-zinc-950 text-white min-h-screen selection:bg-cyan-500/30 selection:text-white">
      {/* NAVBAR */}
      <Header session={session} />

      {/* HERO & INTERACTIVE DASHBOARD */}
      <HeroSection />

      {/* SOCIAL PROOF & KEY PERFORMANCE METRICS */}
      <SocialProof />

      {/* CONCEPTUAL SUMMARY */}
      <WhatIsOutreachX />

      {/* MEET DEVA CORE ENGINE */}
      <MeetDeva />

      {/* CHAT WIDGET DIALOGUE SIMULATION */}
      <DevaChatDemo />

      {/* FULL LIFECYCLE WORKFLOW TIMELINE */}
      <WorkflowSection />

      {/* FEATURE MATRIX GRID */}
      <FeatureGrid />

      {/* INTERACTIVE WORKSPACE PREVIEW */}
      <ProductShowcase />

      {/* CAPABILITIES WALKTHROUGHS */}
      <Showcases />

      {/* ENTERPRISE CRYPTO SECURITY */}
      <SecuritySection />

      {/* TRADITIONAL OUTREACH COMPARISON */}
      <ComparisonSection />

      {/* SIMPLE ONBOARDING GUIDE */}
      <HowItWorks />

      {/* USER FEEDBACK SLIDER */}
      <Testimonials />

      {/* FAQ SECTION */}
      <FAQSection />

      {/* BETA TIERS PREVIEW */}
      <PricingPreview />

      {/* HIGH CONVERTING CTA */}
      <FinalCTA />

      {/* PREMIUM STATUS LIGHT FOOTER */}
      <Footer />
    </div>
  );
}

