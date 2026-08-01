"use client";

import { ProcessIndicator } from "@/components/process-indicator";
import { ChatSimulation, SimulationPhase, ConversationTopic } from "@/components/chat-simulation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

interface HowItWorksProps {
  bottomSection?: {
    title: string;
    description: string;
  };
}

export const HowItWorks = ({
  bottomSection = {
    title: "A project brain that never forgets.",
    description:
      "huzlr reads intent, execution flow, and people dynamics  then surfaces the few things that genuinely need your attention.",
  },
}: HowItWorksProps = {}) => {
  const [simulationState, setSimulationState] = useState<SimulationPhase>("IDLE");
  const [, setCurrentTopic] = useState<ConversationTopic>("sprint");

  return (
    <section id="how-it-works" className="relative py-24 sm:py-28 border-t border-hairline overflow-hidden">
      <div className="relative max-w-6xl mx-auto px-6">
        {/* Section header */}
        <div className="max-w-2xl mx-auto text-center mb-14">
          <p className="text-xs font-medium tracking-[0.18em] uppercase text-clay">
            See it in action
          </p>
          <h2 className="mt-4 font-serif text-4xl sm:text-5xl tracking-tight text-ink text-balance">
            How huzlr <em className="italic text-clay">works</em>
          </h2>
          <p className="mt-5 text-base sm:text-lg leading-relaxed text-ink/60">
            Watch a live simulation of huzlr running a standup, spotting a
            blocker, and recommending the next move.
          </p>
        </div>

        {/* Main Interactive Demo */}
        <div className="rounded-2xl border border-hairline bg-card shadow-[0_24px_60px_-32px_rgba(41,37,31,0.35)] overflow-hidden">
          {/* Window chrome */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-hairline bg-sand/50">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-ink/15" />
              <div className="w-3 h-3 rounded-full bg-ink/15" />
              <div className="w-3 h-3 rounded-full bg-ink/15" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="flex items-center gap-2 px-4 py-1 rounded-full bg-paper border border-hairline text-xs text-ink/60">
                <div className="w-2 h-2 rounded-full bg-clay animate-pulse" />
                <span>Live simulation</span>
              </div>
            </div>
            <div className="w-14" /> {/* Spacer for symmetry */}
          </div>

          {/* Main Grid */}
          <div className="grid lg:grid-cols-[1fr_380px] min-h-[640px]">
            {/* Left: Process Indicator */}
            <ProcessIndicator
              currentPhase={simulationState}
              className="h-full min-h-[640px] border-r border-hairline bg-sand/30"
            />

            {/* Right: Chat Simulation */}
            <div className="h-[640px] bg-sand/20">
              <ChatSimulation
                onPhaseChange={(phase, topic) => {
                  setSimulationState(phase);
                  if (topic) setCurrentTopic(topic);
                }}
                className="h-full rounded-none border-0"
              />
            </div>
          </div>
        </div>

        {/* Bottom CTA band */}
        <div className="mt-16 flex flex-col md:flex-row items-center justify-between gap-8 border-t border-hairline pt-12">
          <div className="text-center md:text-left max-w-xl">
            <h3 className="font-serif text-3xl md:text-4xl tracking-tight text-ink text-balance">
              {bottomSection.title}
            </h3>
            <p className="mt-3 text-ink/60 leading-relaxed">
              {bottomSection.description}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <Link
              href="/signup"
              className="group px-6 py-3 rounded-full bg-clay text-white font-medium text-sm hover:bg-clay-deep transition-colors flex items-center gap-2"
            >
              Join the waitlist
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
