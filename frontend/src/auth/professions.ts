export type ProfessionId =
  | 'fisherman'
  | 'researcher'
  | 'coastal-authority'
  | 'disaster-agency'
  | 'maritime-operator'

export type Profession = {
  id: ProfessionId
  label: string
  blurb: string
  /** Fishermen verify over SMS; every other role verifies over email. */
  verifyBy: 'sms' | 'email'
}

export const PROFESSIONS: Profession[] = [
  {
    id: 'fisherman',
    label: 'Fisherman',
    blurb: 'Fishing zones, weather windows, safety alerts',
    verifyBy: 'sms',
  },
  {
    id: 'researcher',
    label: 'Researcher',
    blurb: 'Datasets, model outputs, long-term analysis',
    verifyBy: 'email',
  },
  {
    id: 'coastal-authority',
    label: 'Coastal Authority',
    blurb: 'Shoreline monitoring, permits, compliance',
    verifyBy: 'email',
  },
  {
    id: 'disaster-agency',
    label: 'Disaster Management Agency',
    blurb: 'Cyclone tracks, storm surge, evacuation support',
    verifyBy: 'email',
  },
  {
    id: 'maritime-operator',
    label: 'Maritime Operator',
    blurb: 'Routing, port calls, sea-state advisories',
    verifyBy: 'email',
  },
]

export function getProfession(id: ProfessionId): Profession {
  return PROFESSIONS.find((item) => item.id === id) ?? PROFESSIONS[0]
}

export function professionLabel(id: ProfessionId): string {
  return getProfession(id).label
}

/** Fishermen register with a phone number only — no email is collected. */
export function usesEmail(id: ProfessionId): boolean {
  return getProfession(id).verifyBy === 'email'
}
