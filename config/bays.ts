import type { BayConfig } from '@/types/appointment'

export const STATIC_BAY_CONFIG: BayConfig[] = [
  {
    bayId: 'NB',
    bayName: 'No Bay',
    techName: '',
    bayType: 'other',
    sortOrder: 0,
    isActive: true,
  },
  {
    bayId: 'bay-1',
    bayName: 'Bay 1',
    techName: 'Randy',
    bayType: 'general',
    sortOrder: 1,
    isActive: true,
  },
  {
    bayId: 'bay-2',
    bayName: 'Bay 2',
    techName: 'Alex',
    bayType: 'oil',
    sortOrder: 2,
    isActive: true,
  },
  {
    bayId: 'bay-3',
    bayName: 'Bay 3',
    techName: 'Jordan',
    bayType: 'tires',
    sortOrder: 3,
    isActive: true,
  },
  {
    bayId: 'bay-4',
    bayName: 'Bay 4',
    techName: 'Taylor',
    bayType: 'alignment',
    sortOrder: 4,
    isActive: true,
  },
]
