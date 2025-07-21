// Analytics event types
export type AnalyticsEventType = 
  | 'wizard_step_transition'
  | 'wizard_form_submission'
  | 'wizard_validation_error'
  | 'wizard_api_error'
  | 'wizard_edit_step';

// Analytics event properties
export interface AnalyticsEventProperties {
  step?: number;
  stepName?: string;
  direction?: 'next' | 'back';
  formData?: any;
  error?: string;
  validationErrors?: string[];
}

// Analytics service interface
interface AnalyticsService {
  trackEvent: (eventType: AnalyticsEventType, properties: AnalyticsEventProperties) => void;
}

// Mock analytics service implementation
class MockAnalyticsService implements AnalyticsService {
  private isDevelopment = process.env.NODE_ENV === 'development';

  trackEvent(eventType: AnalyticsEventType, properties: AnalyticsEventProperties): void {
    if (this.isDevelopment) {
      // Log events in development for debugging
      console.log('Analytics Event:', {
        eventType,
        properties,
        timestamp: new Date().toISOString()
      });
    } else {
      // In production, this would integrate with a real analytics service
      // For example: Google Analytics, Mixpanel, etc.
      // analytics.track(eventType, properties);
    }
  }
}

// Create singleton instance
const analytics = new MockAnalyticsService();

// Step names mapping
const STEP_NAMES = {
  0: 'Basic Info',
  1: 'Tools',
  2: 'Preview'
};

// Analytics utility functions
export const trackStepTransition = (step: number, direction: 'next' | 'back') => {
  analytics.trackEvent('wizard_step_transition', {
    step,
    stepName: STEP_NAMES[step as keyof typeof STEP_NAMES],
    direction
  });
};

export const trackFormSubmission = (step: number, formData: any) => {
  analytics.trackEvent('wizard_form_submission', {
    step,
    stepName: STEP_NAMES[step as keyof typeof STEP_NAMES],
    formData
  });
};

export const trackValidationError = (step: number, errors: string[]) => {
  analytics.trackEvent('wizard_validation_error', {
    step,
    stepName: STEP_NAMES[step as keyof typeof STEP_NAMES],
    validationErrors: errors
  });
};

export const trackApiError = (error: string) => {
  analytics.trackEvent('wizard_api_error', {
    error
  });
};

export const trackEditStep = (fromStep: number, toStep: number) => {
  analytics.trackEvent('wizard_edit_step', {
    step: toStep,
    stepName: STEP_NAMES[toStep as keyof typeof STEP_NAMES],
    formData: {
      fromStep,
      toStep
    }
  });
};

export const trackEvent = (eventName: string, eventData: Record<string, any>) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, eventData);
  }
};

export default analytics; 