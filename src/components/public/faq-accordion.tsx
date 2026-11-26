"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface FaqItem {
  question: string;
  answer: string;
  category: string;
}

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);

  return (
    <div className="divide-y divide-surface-border overflow-hidden rounded-2xl border border-surface-border bg-white shadow-card">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={item.question}>
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-surface-muted"
            >
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-600">
                  {item.category}
                </span>
                <p className="mt-0.5 text-sm font-semibold text-navy-900 sm:text-base">
                  {item.question}
                </p>
              </div>
              <ChevronDown
                className={cn(
                  "h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200",
                  isOpen && "rotate-180 text-brand-500"
                )}
              />
            </button>
            {isOpen && (
              <div className="border-t border-surface-border/60 bg-surface-muted/50 px-6 py-4 text-sm leading-relaxed text-slate-600">
                {item.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
