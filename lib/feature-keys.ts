export const FEATURE_KEYS = {
  MD_APPROVAL_REQUEST: 'md_approval_request',
  CREATE_NOTICE: 'create_notice',
} as const

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS]
