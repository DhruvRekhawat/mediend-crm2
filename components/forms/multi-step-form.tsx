'use client'

import { useState, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
  id: string
  title: string
  description?: string
  component: ReactNode | ((props: { formData: Record<string, unknown>, updateFormData: (data: Partial<Record<string, unknown>>) => void }) => ReactNode)
  validate?: () => boolean | Promise<boolean>
}

interface MultiStepFormProps {
  steps: Step[]
  onSubmit: (data: Record<string, unknown>) => Promise<void> | void
  onCancel?: () => void
  initialStep?: number
  initialFormData?: Record<string, unknown>
  className?: string
  saveDraft?: (stepIndex: number, data: Record<string, unknown>) => void
}

export function MultiStepForm({
  steps,
  onSubmit,
  onCancel,
  initialStep = 0,
  initialFormData = {},
  className,
  saveDraft,
}: MultiStepFormProps) {
  const [currentStep, setCurrentStep] = useState(initialStep)
  const [formData, setFormData] = useState<Record<string, unknown>>(initialFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const progress = ((currentStep + 1) / steps.length) * 100

  const handleNext = async () => {
    const step = steps[currentStep]
    
    // Validate current step if validator exists
    if (step.validate) {
      const isValid = await step.validate()
      if (!isValid) {
        return
      }
    }

    // Save draft if callback provided
    if (saveDraft) {
      saveDraft(currentStep, formData)
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await onSubmit(formData)
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateFormData = (data: Partial<Record<string, unknown>>) => {
    setFormData(prev => ({ ...prev, ...data }))
  }

  const currentStepData = steps[currentStep]

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="space-y-2">
          <CardTitle>{currentStepData.title}</CardTitle>
          {currentStepData.description && (
            <p className="text-sm text-muted-foreground">{currentStepData.description}</p>
          )}
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} />
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="min-h-[300px]">
          {typeof currentStepData.component === 'function'
            ? currentStepData.component({ formData, updateFormData })
            : currentStepData.component}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <div>
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {currentStep > 0 && (
            <Button variant="outline" onClick={handlePrevious}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
          )}
          {currentStep < steps.length - 1 ? (
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
