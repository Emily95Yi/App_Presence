export function shouldRefreshProjectionCardImage({ showSplash, isIntroJourneyActive }) {
  return !showSplash && !isIntroJourneyActive;
}
