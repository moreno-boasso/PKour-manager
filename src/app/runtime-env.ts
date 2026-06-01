declare global {
  interface Window {
    __PKOUR_ENV__?: {
      PKOUR_API_BASE_URL?: string;
    };
  }
}

export function getRuntimeEnv() {
  const env = window.__PKOUR_ENV__ ?? {};
  const apiBaseUrl = (env.PKOUR_API_BASE_URL ?? 'http://localhost:3001').replace(/\/+$/, '');

  return {
    apiBaseUrl,
    spotsListEndpoint: '/api/spots/moderation',
    spotsModerateEndpoint: '/api/spots/moderation',
    spotsDetailEndpoint: '/api/spots/moderation',
    reviewsListEndpoint: '/api/reviews/moderation',
    reviewsModerateEndpoint: '/api/reviews/moderation',
    reportsListEndpoint: '/api/reports/moderation',
    reportsModerateEndpoint: '/api/reports/moderation',
    bugReportsListEndpoint: '/api/bug-reports/moderation',
    bugReportsModerateEndpoint: '/api/bug-reports/moderation',
    photosListEndpoint: '/api/photos/moderation',
    photosModerateEndpoint: '/api/photos/moderation',
    tricksWriteEndpoint: '/api/tricks/upsert-local',
    tricksDeleteEndpoint: '/api/tricks/delete-local',
  };
}

export {};
