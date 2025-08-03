export interface JobBoardConfig {
  id: string
  name: string
  description: string
  url: string
  enabled: boolean
  isDefault: boolean
}

export const DEFAULT_JOB_BOARDS: JobBoardConfig[] = [
  {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Professional networking and job search platform',
    url: 'https://www.linkedin.com/jobs',
    enabled: true,
    isDefault: true,
  },
  {
    id: 'indeed',
    name: 'Indeed',
    description: 'One of the largest job search engines worldwide',
    url: 'https://www.indeed.com',
    enabled: true,
    isDefault: true,
  },
  {
    id: 'glassdoor',
    name: 'Glassdoor',
    description: 'Job search with company reviews and salary insights',
    url: 'https://www.glassdoor.com',
    enabled: true,
    isDefault: true,
  },
  {
    id: 'monster',
    name: 'Monster',
    description: 'Global employment website and job search engine',
    url: 'https://www.monster.com',
    enabled: true,
    isDefault: true,
  },
  {
    id: 'dice',
    name: 'Dice',
    description: 'Tech-focused job board for technology professionals',
    url: 'https://www.dice.com',
    enabled: true,
    isDefault: true,
  },
  {
    id: 'stackoverflow',
    name: 'Stack Overflow Jobs',
    description: 'Developer jobs from the Stack Overflow community',
    url: 'https://stackoverflow.com/jobs',
    enabled: true,
    isDefault: false,
  },
  {
    id: 'angellist',
    name: 'AngelList',
    description: 'Startup jobs and investment opportunities',
    url: 'https://angel.co',
    enabled: true,
    isDefault: false,
  },
  {
    id: 'remoteok',
    name: 'RemoteOK',
    description: 'Remote work opportunities from around the world',
    url: 'https://remoteok.io',
    enabled: true,
    isDefault: false,
  },
]

export const DEFAULT_SAVED_BOARD_IDS = DEFAULT_JOB_BOARDS
  .filter(board => board.isDefault)
  .map(board => board.id)