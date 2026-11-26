import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface StepItem {
  id: string;
  label: string;
  description?: string;
}

export interface StepperProps {
  steps: StepItem[];
  currentStepIndex: number;
  className?: string;
}

export function Stepper({ steps, currentStepIndex, className }: StepperProps) {
  return (
    <nav aria-label="Progression de la commande" className={cn("w-full", className)}>
      <ol className="grid gap-3 sm:grid-cols-4">
        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          return (
            <li
              key={step.id}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3 transition-colors",
                isCurrent && "border-brand-500 bg-brand-50/60",
                isCompleted && "border-success-500/30 bg-success-50/40",
                !isCurrent && !isCompleted && "border-surface-border bg-white"
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  isCurrent && "bg-brand-500 text-white",
                  isCompleted && "bg-success-600 text-white",
                  !isCurrent && !isCompleted && "bg-slate-100 text-slate-500"
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
              </span>
              <div className="min-w-0">
                <p
                  className={cn(
                    "truncate text-xs font-semibold",
                    isCurrent ? "text-brand-700" : isCompleted ? "text-success-700" : "text-navy-900"
                  )}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p className="truncate text-[11px] text-slate-500">{step.description}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export const ORDER_CHECKOUT_STEPS: StepItem[] = [
  { id: "cart", label: "Panier", description: "Sélection multi-fournisseurs" },
  { id: "verify", label: "Vérification", description: "Confirmation stocks & prix" },
  { id: "payment", label: "Paiement", description: "Montant définitif validé" },
  { id: "delivery", label: "Livraison", description: "Collecte & suivi Dakar" },
];
