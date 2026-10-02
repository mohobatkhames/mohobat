export const INSTALL_KEY = 'mohobat-app-installed';

export function shouldOfferInstall({ standalone, related, remembered }) {
  if (standalone || related === true) return false;
  if (related === false) return true;
  return !remembered;
}
