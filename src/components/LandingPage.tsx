import React from 'react';
import Navbar from './landing/Navbar';
import Hero from './landing/Hero';
import TrustStatement from './landing/TrustStatement';
import ProductOverview from './landing/ProductOverview';
import FeatureDetailSections from './landing/FeatureDetailSections';
import FeaturesOverview from './landing/FeaturesOverview';
import ProductShowcase from './landing/ProductShowcase';
import SchoolWorkflow from './landing/SchoolWorkflow';
import HowItWorks from './landing/HowItWorks';
import BenefitsSection from './landing/BenefitsSection';
import WhyDugsiPro from './landing/WhyDugsiPro';
import PricingSection from './landing/PricingSection';
import FaqSection from './landing/FaqSection';
import FinalCta from './landing/FinalCta';
import Footer from './landing/Footer';

interface LandingPageProps {
  onNavigate: (route: 'login' | 'signup' | 'dashboard') => void;
  isAuthenticated?: boolean;
  userEmail?: string;
}

export default function LandingPage({
  onNavigate,
  isAuthenticated = false,
  userEmail,
}: LandingPageProps) {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="landing-root min-h-screen bg-[#06080f] text-[#f8fafc] antialiased selection:bg-[#6366f1]/30 selection:text-white">
      {/* 01. STICKY 3-ZONE NAVBAR */}
      <Navbar
        onNavigate={onNavigate}
        isAuthenticated={isAuthenticated}
        userEmail={userEmail}
        onScrollTo={scrollToSection}
      />

      <main>
        {/* 02. HERO SECTION WITH INTERACTIVE PRODUCT WORKSPACE PREVIEW */}
        <Hero
          onNavigate={onNavigate}
          isAuthenticated={isAuthenticated}
          onViewDemo={() => scrollToSection('preview')}
        />

        {/* 03. TRUST STRIP & QUANTITATIVE CAPABILITY BENCHMARKS */}
        <TrustStatement />

        {/* 04. PRODUCT OVERVIEW — UNIFIED SCHOOL ECOSYSTEM ARCHITECTURE */}
        <ProductOverview
          onNavigate={onNavigate}
          isAuthenticated={isAuthenticated}
        />

        {/* 05. FEATURE STORYTELLING PART I (MODULES 01–06: ACADEMIC & FINANCIAL CORE) */}
        <FeatureDetailSections
          onNavigate={onNavigate}
          isAuthenticated={isAuthenticated}
        />

        {/* 06. FEATURE STORYTELLING PART II (MODULES 07–12: OPERATIONS & GOVERNANCE) */}
        <FeaturesOverview
          onNavigate={onNavigate}
          isAuthenticated={isAuthenticated}
        />

        {/* 07. INTERACTIVE LIVE DEMO WORKSPACE EXPLORER */}
        <ProductShowcase />

        {/* 08. END-TO-END SCHOOL OPERATING PIPELINE */}
        <SchoolWorkflow />

        {/* 09. SOLUTIONS BY INSTITUTIONAL ROLE & ATTRIBUTABLE OUTCOMES */}
        <BenefitsSection />

        {/* 10. HOW IT WORKS — 3-STEP INSTITUTIONAL ONBOARDING */}
        <HowItWorks
          onNavigate={onNavigate}
          isAuthenticated={isAuthenticated}
        />

        {/* 11. ARCHITECTURAL PRINCIPLES — WHY DUGSI PRO */}
        <WhyDugsiPro />

        {/* 12. TRANSPARENT INSTITUTIONAL PRICING */}
        <PricingSection
          onNavigate={onNavigate}
          isAuthenticated={isAuthenticated}
        />

        {/* 13. RESOURCES, GUIDES & FREQUENTLY ASKED QUESTIONS */}
        <FaqSection />

        {/* 14. FINAL CONVERSION CALL TO ACTION */}
        <FinalCta
          onNavigate={onNavigate}
          isAuthenticated={isAuthenticated}
          onViewDemo={() => scrollToSection('preview')}
        />
      </main>

      {/* 15. ENTERPRISE SAAS FOOTER */}
      <Footer
        onNavigate={onNavigate}
        isAuthenticated={isAuthenticated}
        onScrollTo={scrollToSection}
      />
    </div>
  );
}
