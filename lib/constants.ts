export const FEED_INTERVAL_MINUTES = 150;
export const CAREGIVERS = ["Mom", "Dad", "Grandma", "Grandpa"] as const;
export type Caregiver = (typeof CAREGIVERS)[number];
