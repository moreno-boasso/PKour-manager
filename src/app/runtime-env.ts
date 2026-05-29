declare global {
  interface Window {
    __PKOUR_ENV__?: {
      PKOUR_API_BASE_URL?: string;
      PKOUR_SPOTS_API_BASE_URL?: string;
      PKOUR_SPOTS_LIST_ENDPOINT?: string;
      PKOUR_SPOTS_MODERATE_ENDPOINT?: string;
      PKOUR_SPOTS_DETAIL_ENDPOINT?: string;
      PKOUR_REVIEWS_LIST_ENDPOINT?: string;
      PKOUR_REVIEWS_MODERATE_ENDPOINT?: string;
      PKOUR_REPORTS_LIST_ENDPOINT?: string;
      PKOUR_REPORTS_MODERATE_ENDPOINT?: string;
      PKOUR_BUG_REPORTS_LIST_ENDPOINT?: string;
      PKOUR_BUG_REPORTS_MODERATE_ENDPOINT?: string;
      PKOUR_PHOTOS_LIST_ENDPOINT?: string;
      PKOUR_PHOTOS_MODERATE_ENDPOINT?: string;
      PKOUR_TRICKS_WRITE_ENDPOINT?: string;
      PKOUR_TRICKS_DELETE_ENDPOINT?: string;
      LOCAL_TOOL_SECRET?: string;
      PKOUR_LOCAL_TOOL_SECRET?: string;
    };
  }
}

export function getRuntimeEnv() {
  const env = window.__PKOUR_ENV__ ?? {};

  return {
    apiBaseUrl: (env.PKOUR_API_BASE_URL ?? 'http://localhost:3000/api').trim(),
    spotsApiBaseUrl: (env.PKOUR_SPOTS_API_BASE_URL ?? 'http://localhost:3001/api').trim(),
    spotsListEndpoint: (env.PKOUR_SPOTS_LIST_ENDPOINT ?? '/spots/moderation').trim(),
    spotsModerateEndpoint: (env.PKOUR_SPOTS_MODERATE_ENDPOINT ?? '/spots/moderation').trim(),
    spotsDetailEndpoint: (env.PKOUR_SPOTS_DETAIL_ENDPOINT ?? '/spots/moderation').trim(),
    reviewsListEndpoint: (env.PKOUR_REVIEWS_LIST_ENDPOINT ?? '/reviews/moderation').trim(),
    reviewsModerateEndpoint: (env.PKOUR_REVIEWS_MODERATE_ENDPOINT ?? '/reviews/moderation').trim(),
    reportsListEndpoint: (env.PKOUR_REPORTS_LIST_ENDPOINT ?? '/reports/moderation').trim(),
    reportsModerateEndpoint: (env.PKOUR_REPORTS_MODERATE_ENDPOINT ?? '/reports/moderation').trim(),
    bugReportsListEndpoint: (env.PKOUR_BUG_REPORTS_LIST_ENDPOINT ?? '/bug-reports/moderation').trim(),
    bugReportsModerateEndpoint: (env.PKOUR_BUG_REPORTS_MODERATE_ENDPOINT ?? '/bug-reports/moderation').trim(),
    photosListEndpoint: (env.PKOUR_PHOTOS_LIST_ENDPOINT ?? '/photos/moderation').trim(),
    photosModerateEndpoint: (env.PKOUR_PHOTOS_MODERATE_ENDPOINT ?? '/photos/moderation').trim(),
    tricksWriteEndpoint: (env.PKOUR_TRICKS_WRITE_ENDPOINT ?? '/tricks/upsert-local').trim(),
    tricksDeleteEndpoint: (env.PKOUR_TRICKS_DELETE_ENDPOINT ?? '/tricks/delete-local').trim(),
    localToolSecret: (env.LOCAL_TOOL_SECRET ?? env.PKOUR_LOCAL_TOOL_SECRET ?? '').trim(),
  };
}

export {};
