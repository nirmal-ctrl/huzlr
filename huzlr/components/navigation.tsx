"use client";
import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { Logo } from "@/components/logo";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { TrackedLink } from "@/components/tracked-link";

const navLinks = [
  { label: "Why huzlr", href: "/#why-huzlr" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "AI Scrum Master", href: "/ai-scrum-master" },
  { label: "Blog", href: "/blog" },
];

export function Navigation() {
  return (
    <div className="relative w-full flex items-center justify-center">
      <Navbar className="top-2" />
    </div>
  );
}

function Navbar({ className }: { className?: string }) {
  return (
    <div
      className={cn("fixed top-6 inset-x-0 max-w-5xl mx-auto z-50 px-4", className)}
    >
      <nav className="relative rounded-full border border-hairline bg-paper/80 shadow-sm shadow-ink/5 flex items-center justify-between gap-6 pl-6 pr-3 py-2.5 backdrop-blur-md">
        {/* Logo */}
        <Logo />

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-[13px] font-medium text-ink/60 hover:text-ink transition-colors duration-200"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Mobile Menu */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-9 px-3 gap-1 rounded-full text-xs font-medium text-ink/70 hover:text-ink hover:bg-sand"
                >
                  Menu
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 mt-2">
                {navLinks.map((link) => (
                  <DropdownMenuItem key={link.label} asChild>
                    <Link href={link.href} className="w-full cursor-pointer font-medium">
                      {link.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <AnimatedThemeToggler className="h-9 w-9 rounded-full text-ink/60 hover:text-ink hover:bg-sand p-2 flex items-center justify-center transition-colors" />

          <Button asChild className="rounded-full cursor-pointer h-9 px-4 text-[13px] font-medium bg-clay text-white hover:bg-clay-deep transition-colors">
            <TrackedLink
              href="/signup"
              eventName="CTA Click"
              eventProperties={{ location: "navigation", destination: "signup", label: "Get started" }}
            >
              Get started
            </TrackedLink>
          </Button>
        </div>
      </nav>
    </div>
  );
}
