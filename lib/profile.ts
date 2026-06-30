import fs from 'node:fs';
import path from 'node:path';

export type ProfileData = {
  name: string;
  title: string;
  avatar: string;
  background: string;
  about: string[];
  skills: string[];
};

const profilePath = path.join(process.cwd(), 'content', 'profile.json');

const fallbackProfile: ProfileData = {
  name: 'Neko',
  title: 'MaHoShaojyu',
  avatar: '/photo/toma.jpg',
  background: '/photo/background.jpeg',
  about: ["saving world's neko chan", 'This is neko chan no secrete world!'],
  skills: ['Fighting', 'Saving', 'Feeling'],
};

const normalizeArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  return String(value ?? '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
};

export const getProfile = (): ProfileData => {
  if (!fs.existsSync(profilePath)) return fallbackProfile;

  try {
    const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8')) as Partial<ProfileData>;
    return {
      name: String(profile.name || fallbackProfile.name),
      title: String(profile.title || fallbackProfile.title),
      avatar: String(profile.avatar || fallbackProfile.avatar),
      background: String(profile.background || fallbackProfile.background),
      about: normalizeArray(profile.about).length ? normalizeArray(profile.about) : fallbackProfile.about,
      skills: normalizeArray(profile.skills).length ? normalizeArray(profile.skills) : fallbackProfile.skills,
    };
  } catch {
    return fallbackProfile;
  }
};
