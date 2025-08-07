import { SavedSearch } from '@/lib/db/dynamodb.service'

export interface DefaultSavedSearch extends Omit<SavedSearch, 'userId' | 'searchId' | 'createdAt' | 'updatedAt' | 'lastRunAt'> {
  isDefault: true
}

export const DEFAULT_SAVED_SEARCHES: DefaultSavedSearch[] = [
  {
    name: 'Remote Senior Developer',
    keywords: 'Senior Developer Engineer Remote',
    location: 'Remote',
    jobBoards: ['linkedin', 'indeed', 'remoteok'],
    filters: {
      remote: true,
      experienceLevel: ['senior', 'lead'],
      jobType: ['full-time'],
      salaryMin: 120000,
      salaryMax: 200000,
    },
    skills: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
    workPreferences: {
      remote: true,
      hybrid: false,
      visaSponsor: false,
    },
    isDefault: true,
    isEditable: true,
  },
  {
    name: 'Full Stack Engineer - Local',
    keywords: 'Full Stack Developer Engineer Software',
    location: 'San Francisco, CA',
    jobBoards: ['linkedin', 'indeed', 'glassdoor', 'dice'],
    filters: {
      remote: false,
      experienceLevel: ['mid', 'senior'],
      jobType: ['full-time'],
      salaryMin: 100000,
      salaryMax: 180000,
      companySize: ['small', 'medium', 'large'],
      industry: ['tech'],
    },
    skills: ['JavaScript', 'Python', 'SQL', 'AWS'],
    workPreferences: {
      remote: false,
      hybrid: true,
      visaSponsor: false,
    },
    isDefault: true,
    isEditable: true,
  },
  {
    name: 'React Frontend Developer',
    keywords: 'React Frontend Developer JavaScript TypeScript',
    location: 'United States',
    jobBoards: ['linkedin', 'indeed', 'stackoverflow'],
    filters: {
      experienceLevel: ['mid', 'senior'],
      jobType: ['full-time', 'contract'],
      salaryMin: 90000,
      salaryMax: 160000,
    },
    skills: ['React', 'JavaScript', 'TypeScript', 'CSS', 'HTML'],
    workPreferences: {
      remote: true,
      hybrid: true,
      visaSponsor: false,
    },
    isDefault: true,
    isEditable: true,
  },
  {
    name: 'Entry Level Software Engineer',
    keywords: 'Junior Software Developer Engineer Entry Level Graduate',
    location: 'United States',
    jobBoards: ['linkedin', 'indeed', 'glassdoor'],
    filters: {
      experienceLevel: ['entry', 'junior'],
      jobType: ['full-time'],
      remote: false,
      salaryMin: 60000,
      salaryMax: 90000,
      companySize: ['startup', 'small', 'medium', 'large'],
    },
    skills: ['Python', 'Java', 'JavaScript'],
    workPreferences: {
      remote: false,
      hybrid: true,
      visaSponsor: true,
    },
    isDefault: true,
    isEditable: true,
  },
]

export function getDefaultSearchesForUser(savedBoardIds: string[]): DefaultSavedSearch[] {
  // Filter default searches to only include boards the user has saved
  return DEFAULT_SAVED_SEARCHES.map(search => ({
    ...search,
    jobBoards: search.jobBoards.filter(boardId => savedBoardIds.includes(boardId))
  })).filter(search => search.jobBoards.length > 0)
}