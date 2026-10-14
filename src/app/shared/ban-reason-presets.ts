import { CommunityBanSeverity } from './models/admin.model';

/** English base reasons shown to users; admins can edit before saving. */
export const BAN_REASON_PRESETS: Record<CommunityBanSeverity, string[]> = {
  light: [
    'Spam or unauthorized promotion in the community',
    'Inappropriate content in events/jams',
    'Unacceptable behavior toward other users',
  ],
  medium: [
    'Repeated community rules violations',
    'Offensive or dangerous content',
    'Abuse of reports or the system',
  ],
  permanent: [
    'Severe and repeated rules violations',
    'Threats, harassment, or safety-compromising behavior',
    'Malicious use of the account',
  ],
};

export function banReasonsFor(severity: CommunityBanSeverity): string[] {
  return BAN_REASON_PRESETS[severity];
}

export function defaultBanReason(severity: CommunityBanSeverity): string {
  return BAN_REASON_PRESETS[severity][0] ?? '';
}
