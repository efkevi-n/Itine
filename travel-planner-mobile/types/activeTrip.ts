/**
 * Types for Active Trip screen: current day, service status, next upcoming.
 */

export type ServiceStatusDisplay = 'used' | 'upcoming' | 'not_yet_active';

export interface ActiveServiceItem {
  id?: number;
  serviceId?: number;
  serviceType: string;
  providerName: string;
  reference?: string;
  timeLabel?: string;
  validFrom?: string;
  validUntil?: string;
  isUsed: boolean;
  statusDisplay: ServiceStatusDisplay;
  dayIndex: number;
  locationAddress?: string;
}

export interface CurrentDayInfo {
  dayIndex: number;
  totalDays: number;
  isToday: boolean;
}
