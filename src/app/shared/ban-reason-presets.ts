import { CommunityBanSeverity } from './models/admin.model';

export const BAN_REASON_PRESETS: Record<CommunityBanSeverity, string[]> = {
  light: [
    'Spam o promozione non consentita nella community',
    'Contenuti inappropriati in eventi/jam',
    'Comportamento scorretto verso altri utenti',
  ],
  medium: [
    'Violazioni ripetute delle regole della community',
    'Contenuti offensivi o pericolosi',
    'Abuso delle segnalazioni o del sistema',
  ],
  permanent: [
    'Violazioni gravi e ripetute delle regole',
    'Minacce, molestie o comportamenti che compromettono la sicurezza',
    'Uso malevolo dell’account',
  ],
};

export function banReasonsFor(severity: CommunityBanSeverity): string[] {
  return BAN_REASON_PRESETS[severity];
}
