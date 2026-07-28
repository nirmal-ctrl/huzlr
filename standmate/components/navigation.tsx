"use client";
import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

const navLinks = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Signals", href: "/#signals" },
  { label: "FAQ", href: "/#faq" },
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
      className={cn("fixed top-6 inset-x-0 max-w-2xl mx-auto z-50 px-4", className)}
    >
      <nav className="relative rounded-full border border-hairline bg-paper/80 shadow-sm shadow-ink/5 flex items-center justify-between gap-6 pl-6 pr-3 py-2.5 backdrop-blur-md">
        {/* Logo */}
        <Link href="/" className="flex items-baseline hover:opacity-80 transition-opacity">
          <span className="font-serif text-xl tracking-tight text-ink">huzlr</span>
          <span className="font-serif text-xl text-clay">.</span>
        </Link>

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

          <Link href="/signup">
            <Button className="rounded-full cursor-pointer h-9 px-4 text-[13px] font-medium bg-clay text-white hover:bg-clay-deep transition-colors">
              Join waitlist
            </Button>
          </Link>
        </div>
      </nav>
    </div>
  );
}
