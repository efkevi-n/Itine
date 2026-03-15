export type DeepLinkRoute = 'trip' | 'trippass' | 'itinerary';

export interface ParsedDeepLink {
  route: DeepLinkRoute;
  params: Record<string, string>;
}
