"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Menu } from "@/components/ui/navbar-menu";
import { cn } from "@/lib/utils";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { Button } from "./ui/button";

export function Navigation() {
  return (
    <div className="relative w-full flex items-center justify-center">
      <Navbar className="top-2" />
    </div>
  );
}

function Navbar({ className }: { className?: string }) {
  const [, setActive] = useState<string | null>(null);

  return (
    <div
      className={cn("fixed top-10 inset-x-0 max-w-xl mx-auto z-50 px-4", className)}
    >
      <Menu setActive={setActive}>
        <div className="w-full flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center justify-center h-full hover:opacity-80 transition-opacity">
            <span className="text-xl font-bold tracking-tight text-foreground">huzlr.</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden sm:flex items-center gap-8">
            <Link href="/blog" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer relative py-1 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 hover:after:w-full after:bg-primary after:transition-all after:duration-200">
              Blog
            </Link>
            <Link href="/case-studies" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer relative py-1 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 hover:after:w-full after:bg-primary after:transition-all after:duration-200">
              Case Studies
            </Link>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-4">
            <Link href="/signup">
              <Button variant="outline" className="rounded-full cursor-pointer h-9 px-4 text-xs font-semibold">
                Get started
              </Button>
            </Link>
            <AnimatedThemeToggler className="h-8 w-8 rounded-full border border-border bg-background shadow-sm hover:bg-accent hover:text-accent-foreground p-1.5 flex items-center justify-center" />
          </div>
        </div>
      </Menu>
    </div>
  );
}
