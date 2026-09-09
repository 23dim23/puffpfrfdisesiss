export interface Section {
  id: string;
  title: string;
  isActive: boolean;
  heroTitle: string;
  heroSubtitle: string;
  description: string;
  contentMarkdown: string;
  // Specific sections can have sub-components like packages
  packages?: Package[];
}

export interface Package {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  duration: string; // e.g. "2 часа", "3 часа"
  playersCount: string; // e.g. "до 10 человек"
  features: string[];
  isPopular?: boolean;
}

export interface Service {
  id: string;
  category: string;
  name: string;
  description: string;
  price: number;
  oldPrice?: number;
  duration?: string;
  image?: string;
  isPopular?: boolean;
  availability?: string;
}

export interface Review {
  id: string;
  author: string;
  date: string;
  rating: number;
  text: string;
  avatarUrl?: string;
  source: 'yandex' | 'google' | 'vk' | 'manual';
  sourceUrl?: string;
}

export interface Reel {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
  likes: number;
  plays: string;
  duration: string;
  tag: string;
}

export interface ContactInfo {
  phone: string;
  email: string;
  address: string;
  workingHours: string;
  yandexMapWidgetUrl: string;
  vkUrl?: string;
  telegramUrl?: string;
  instagramUrl?: string;
}

export interface AdminSettings {
  visibleSections: { [sectionId: string]: boolean };
  sectionsContent: { [sectionId: string]: Partial<Section> };
  services: Service[];
  reviews: Review[];
  contacts: ContactInfo;
}
