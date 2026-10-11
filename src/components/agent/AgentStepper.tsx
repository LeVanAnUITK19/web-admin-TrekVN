import { Check, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AgentTaskStep } from '@/types'

interface AgentStepperProps {
  steps: AgentTaskStep[]
  /** If true renders horizontally (wizard header), otherwise vertical list */
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

/**
 * Horizontal wizard stepper — used in Place/Map builder page header.
 * Receives simple string labels and an active step index.
 */
interface WizardStepperProps {
  steps: string[]
  activeStep: number  // 0-based
  className?: string
}

export function WizardStepper({ steps, activeStep, className }: WizardStepperProps) {
  return (
    <div className={cn('flex items-center gap-0', className)}>
      {steps.map((label, idx) => {
        const isDone = idx < activeStep
        const isActive = idx === activeStep
        return (
          <div key={label} className="flex items-center">
            {/* Step circle */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all',
                  isDone
                    ? 'bg-primary border-primary text-white'
                    : isActive
                    ? 'bg-white border-primary text-primary'
                    : 'bg-white border-border text-muted-foreground'
                )}
              >
                {isDone ? <Check className="w-3.5 h-3.5" /> : idx + 1}
              </div>
              <span
                className={cn(
                  'text-xs mt-1 whitespace-nowrap font-medium',
                  isActive ? 'text-primary' : isDone ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {label}
              </span>
            </div>
            {/* Connector line */}
            {idx < steps.length - 1 && (
              <div
                className={cn(
                  'h-0.5 w-12 mx-1 mb-5 transition-all',
                  idx < activeStep ? 'bg-primary' : 'bg-border'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/**
 * Vertical progress step list — used in task progress panels.
 */
export function AgentProgressSteps({ steps, className }: AgentStepperProps) {
  return (
    <div className={cn('space-y-1', className)}>
      {steps.map((step, idx) => (
        <div key={`${step.label}-${idx}`} className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 w-5 h-5 mt-0.5">
            {step.status === 'done' && (
              <div className="w-5 h-5 rounded-full bg-green-100 border border-green-300 flex items-center justify-center">
                <Check className="w-3 h-3 text-green-700" />
              </div>
            )}
            {step.status === 'active' && (
              <div className="w-5 h-5 rounded-full bg-blue-100 border border-blue-300 flex items-center justify-center">
                <Loader2 className="w-3 h-3 text-blue-600 animate-spin" />
              </div>
            )}
            {step.status === 'error' && (
              <div className="w-5 h-5 rounded-full bg-red-100 border border-red-300 flex items-center justify-center">
                <AlertCircle className="w-3 h-3 text-red-600" />
              </div>
            )}
            {step.status === 'pending' && (
              <div className="w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
              </div>
            )}
          </div>
          {/* Label + timestamp */}
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                'text-sm',
                step.status === 'done' ? 'text-foreground' :
                step.status === 'active' ? 'text-blue-700 font-medium' :
                step.status === 'error' ? 'text-red-700 font-medium' :
                'text-muted-foreground'
              )}
            >
              {step.label}
            </p>
            {step.timestamp && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(step.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            )}
            {step.message && step.status === 'error' && (
              <p className="text-xs text-red-600 mt-0.5">{step.message}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
