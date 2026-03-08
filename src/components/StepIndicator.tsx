import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center gap-2 flex-1">
          <div className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors',
            i < currentStep && 'bg-success text-success-foreground',
            i === currentStep && 'bg-primary text-primary-foreground',
            i > currentStep && 'bg-muted text-muted-foreground'
          )}>
            {i < currentStep ? <Check className="h-4 w-4" /> : i + 1}
          </div>
          <span className={cn(
            'text-xs font-medium hidden sm:block',
            i === currentStep ? 'text-foreground' : 'text-muted-foreground'
          )}>
            {step}
          </span>
          {i < steps.length - 1 && <div className="flex-1 h-px bg-border" />}
        </div>
      ))}
    </div>
  );
}
