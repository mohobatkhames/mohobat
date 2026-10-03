import { bootstrapProject, isDevelopmentMode, isManualSetupMode } from './firebase';

export function canOpenSetupWizard() {
  return isDevelopmentMode() || isManualSetupMode();
}

export function resolveEntry() {
  try {
    const result = bootstrapProject();
    if (result === 'wizard' && canOpenSetupWizard()) return 'setup';
  } catch {
    if (canOpenSetupWizard()) return 'setup';
  }
  return 'login';
}
