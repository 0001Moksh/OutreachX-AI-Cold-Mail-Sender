"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Sparkles, Menu, X } from "lucide-react";

interface HeaderProps {
  session: any;
}

export default function Header({ session }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "Meet Deva", href: "#deva" },
    { label: "Workflow", href: "#workflow" },
    { label: "Features", href: "#features" },
    { label: "Showcase", href: "#showcase" },
    { label: "Security", href: "#security" },
    { label: "Pricing", href: "#pricing" },
  ];

  return (
    <>
      <nav className="bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 lg:py-4 flex items-center justify-between">

          {/* LOGO */}
          <Link href="/" className="flex items-center gap-x-2 sm:gap-x-3 group min-w-0">
            <div className="relative shrink-0">
              <div className="absolute inset-0 bg-cyan-500/25 blur-md rounded-full group-hover:bg-cyan-500/40 transition-colors" />
              <Image
                src="/logo1.png"
                alt="OutreachX Logo"
                width={48}
                height={48}
                className="h-8 sm:h-10 w-auto relative z-10 hover:scale-105 transition-transform duration-300"
              />
            </div>

            <span className="heading-font text-lg sm:text-xl lg:text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent whitespace-nowrap">
              OutreachX
            </span>

            <span className="hidden sm:flex px-2 py-0.5 text-[10px] font-semibold bg-cyan-400 text-zinc-950 rounded-full items-center gap-x-0.5 shrink-0">
              DEVA
              <Sparkles size={10} className="fill-zinc-950" />
            </span>
          </Link>

          {/* DESKTOP NAV */}
          <div className="hidden lg:flex items-center gap-x-8 text-sm font-medium text-zinc-400">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="hover:text-cyan-400 transition-all"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* RIGHT SIDE */}
          <div className="flex items-center gap-x-3">

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-x-3">
              {session ? (
                <Link
                  href="/dashboard"
                  className="px-4 lg:px-6 py-2 bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 text-zinc-950 text-xs lg:text-sm font-semibold rounded-full flex items-center gap-x-2 shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/25 transition-all whitespace-nowrap"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-4 lg:px-5 py-2 text-sm font-medium text-zinc-300 border border-zinc-800 hover:border-zinc-700 hover:text-white rounded-full transition-all whitespace-nowrap"
                  >
                    Log in
                  </Link>

                  <Link
                    href="/login"
                    className="px-4 lg:px-6 py-2 bg-white text-zinc-950 hover:bg-cyan-400 hover:text-white text-sm font-semibold rounded-full flex items-center gap-x-2 shadow-lg shadow-white/5 hover:shadow-cyan-500/25 transition-all whitespace-nowrap"
                  >
                    Start Free
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden text-zinc-300 hover:text-white transition-colors"
            >
              <Menu size={26} />
            </button>
          </div>
        </div>
      </nav>

      {/* MOBILE DRAWER */}
      <div
        className={`fixed inset-0 z-[100] transition-all duration-300 ${mobileMenuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
          }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/70"
          onClick={() => setMobileMenuOpen(false)}
        />

        {/* Drawer */}
        <div
          className={`absolute right-0 top-0 h-full w-[85%] max-w-sm bg-zinc-950 border-l border-zinc-800 transform transition-transform duration-300 ${mobileMenuOpen ? "translate-x-0" : "translate-x-full"
            }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <Image
                src="/logo1.png"
                alt="OutreachX"
                width={36}
                height={36}
              />
              <span className="text-lg font-bold text-white">
                OutreachX
              </span>
            </div>

            <button
              onClick={() => setMobileMenuOpen(false)}
              className="text-zinc-400 hover:text-white"
            >
              <X size={24} />
            </button>
          </div>

          {/* Links */}
          <div className="flex flex-col p-5">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="py-4 border-b border-zinc-900 text-zinc-300 hover:text-cyan-400 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* CTA */}
          <div className="p-5">
            {session ? (
              <Link
                href="/dashboard"
                className="w-full flex justify-center px-5 py-3 bg-gradient-to-r from-cyan-400 to-cyan-300 text-zinc-950 font-semibold rounded-full"
              >
                Go to Dashboard
              </Link>
            ) : (
              <div className="flex flex-col gap-3">
                <Link
                  href="/login"
                  className="w-full text-center px-5 py-3 border border-zinc-800 text-zinc-300 rounded-full"
                >
                  Log in
                </Link>

                <Link
                  href="/login"
                  className="w-full text-center px-5 py-3 bg-white text-zinc-950 rounded-full font-semibold"
                >
                  Start Campaign Free
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}