export interface User {
  id: number;
  uid: string;
  email: string;
  createdAt: string;
}

export interface ShortUrl {
  id: number;
  userId: number;
  originalUrl: string;
  alias: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface AnalyticsData {
  totalClicks: number;
  browsers: { name: string; count: number }[];
  devices: { name: string; count: number }[];
  os: { name: string; count: number }[];
  countries: { name: string; count: number }[];
}
