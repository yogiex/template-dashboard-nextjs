"use client";

import { useState, useCallback } from "react";

export function useSetupWizard(totalSteps: number) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");

  const goNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setDirection("forward");
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, totalSteps]);

  const goBack = useCallback(() => {
    if (currentStep > 0) {
      setDirection("backward");
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback(
    (step: number) => {
      if (step >= 0 && step < totalSteps) {
        setDirection(step > currentStep ? "forward" : "backward");
        setCurrentStep(step);
      }
    },
    [currentStep, totalSteps],
  );

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return {
    currentStep,
    direction,
    isFirstStep,
    isLastStep,
    progress,
    goNext,
    goBack,
    goToStep,
  };
}
