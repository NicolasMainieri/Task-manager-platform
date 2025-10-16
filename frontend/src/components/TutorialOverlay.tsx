import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';

export interface TutorialStep {
  title: string;
  description: string;
  target?: string; // CSS selector per l'elemento da highlightare
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: () => void; // Azione opzionale da eseguire (es. aprire un modal)
}

type TutorialOverlayProps = {
  steps: TutorialStep[];
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  storageKey: string; // Key per salvare lo stato del tutorial in localStorage
};

export default function TutorialOverlay({
  steps,
  isOpen,
  onClose,
  onComplete,
  storageKey
}: TutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!isOpen) return;

    const step = steps[currentStep];
    if (step.target) {
      const element = document.querySelector(step.target) as HTMLElement;
      if (element) {
        setTargetElement(element);

        // Scroll to element
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Calcola posizione tooltip
        const rect = element.getBoundingClientRect();
        const tooltipWidth = 400;
        const tooltipHeight = 200;

        let top = 0;
        let left = 0;

        switch (step.position) {
          case 'top':
            top = rect.top - tooltipHeight - 20;
            left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
            break;
          case 'bottom':
            top = rect.bottom + 20;
            left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
            break;
          case 'left':
            top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
            left = rect.left - tooltipWidth - 20;
            break;
          case 'right':
            top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
            left = rect.right + 20;
            break;
          default:
            top = window.innerHeight / 2 - tooltipHeight / 2;
            left = window.innerWidth / 2 - tooltipWidth / 2;
        }

        setTooltipPosition({ top, left });
      } else {
        setTargetElement(null);
      }
    } else {
      setTargetElement(null);
      // Center tooltip
      setTooltipPosition({
        top: window.innerHeight / 2 - 100,
        left: window.innerWidth / 2 - 200
      });
    }

    // Esegui azione se presente
    if (step.action) {
      step.action();
    }
  }, [currentStep, isOpen, steps]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    // Salva in localStorage che il tutorial è stato completato
    localStorage.setItem(storageKey, 'completed');
    onComplete();
    onClose();
  };

  const handleSkip = () => {
    localStorage.setItem(storageKey, 'skipped');
    onClose();
  };

  if (!isOpen) return null;

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <>
      {/* Overlay scuro */}
      <div className="fixed inset-0 bg-black/70 z-[9998]" onClick={handleSkip} />

      {/* Highlight dell'elemento target */}
      {targetElement && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            top: targetElement.getBoundingClientRect().top - 4,
            left: targetElement.getBoundingClientRect().left - 4,
            width: targetElement.getBoundingClientRect().width + 8,
            height: targetElement.getBoundingClientRect().height + 8,
            border: '3px solid #06b6d4',
            borderRadius: '12px',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7), 0 0 20px rgba(6, 182, 212, 0.5)',
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="fixed z-[10000] bg-slate-900 border border-cyan-500/30 rounded-2xl shadow-2xl"
        style={{
          top: `${tooltipPosition.top}px`,
          left: `${tooltipPosition.left}px`,
          width: '400px',
          maxWidth: '90vw',
        }}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 text-xs rounded-full font-semibold">
                  Step {currentStep + 1}/{steps.length}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white">{step.title}</h3>
            </div>
            <button
              onClick={handleSkip}
              className="text-gray-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-gray-300 leading-relaxed">{step.description}</p>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-white transition text-sm"
          >
            Salta tutorial
          </button>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
              >
                <ChevronLeft className="w-4 h-4" />
                Indietro
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:shadow-lg text-white rounded-lg transition"
            >
              {currentStep === steps.length - 1 ? (
                <>
                  Completa
                  <Check className="w-4 h-4" />
                </>
              ) : (
                <>
                  Avanti
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
