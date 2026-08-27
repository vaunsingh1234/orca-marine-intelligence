import type { WeatherNow } from './weather'

export type Verdict = 'yes' | 'caution' | 'no'

export type FishingPotential = 'High' | 'Moderate' | 'Low'

export type Advice = {
  verdict: Verdict
  headline: string
  why: string
  checks: string[]
  potential: FishingPotential
  potentialReason: string
  timeWindow: string
  zone: string
  route: string
  avoid: string
  hazard: { title: string; action: string } | null
  potentialIsEstimate: boolean
}

export function advise(weather: WeatherNow | null, placeLabel: string | null): Advice {
  const wind = weather?.windKmh
  const waves = weather?.waveHeightM
  const code = weather?.weatherCode ?? -1
  const severeSky = code >= 95
  const wetSky = code >= 61 && code < 95
  const strongWind = typeof wind === 'number' && wind >= 40
  const livelyWind = typeof wind === 'number' && wind >= 28
  const roughSea = typeof waves === 'number' && waves >= 2.5
  const choppySea = typeof waves === 'number' && waves >= 1.8

  let verdict: Verdict = 'yes'
  if (!weather) verdict = 'caution'
  else if (severeSky || strongWind || roughSea) verdict = 'no'
  else if (wetSky || livelyWind || choppySea) verdict = 'caution'

  const where = placeLabel ? ` near ${placeLabel}` : ''
  const checks: string[] = []
  if (weather) checks.push(`${weather.condition} sky conditions`)
  if (typeof wind === 'number') {
    checks.push(wind < 28 ? 'Manageable wind' : wind < 40 ? 'Stronger wind building' : 'High wind')
  }
  if (typeof waves === 'number') {
    checks.push(
      waves < 1.8 ? 'Moderate wave conditions' : waves < 2.5 ? 'Choppy sea state' : 'Rough sea state',
    )
  }
  checks.push(verdict === 'no' ? 'Go-to-sea risk is high' : 'No cyclone warning in this weather feed')
  checks.push(
    verdict === 'yes' ? 'Favourable fishing potential' : 'Fishing potential is reduced',
  )

  const potential: FishingPotential =
    verdict === 'yes' ? 'High' : verdict === 'caution' ? 'Moderate' : 'Low'

  if (verdict === 'yes') {
    return {
      verdict,
      headline: 'Yes — conditions are favourable',
      why: `Conditions look generally favourable for fishing${where}. Seas should stay workable and no major storm signal is in the current weather feed.`,
      checks,
      potential,
      potentialReason:
        'Estimated from local wind, sea state and sky — not a guarantee of where fish are.',
      timeWindow: '05:30 AM – 10:30 AM',
      zone: 'Stay within about 18 km of shore, northeast of your position',
      route: 'Low-risk nearshore route',
      avoid: 'Do not push farther offshore after late morning',
      hazard: null,
      potentialIsEstimate: true,
    }
  }

  if (verdict === 'no') {
    return {
      verdict,
      headline: 'No — not recommended',
      why: `Going to sea is not recommended${where}. Wind, waves or storm conditions look unsafe for small craft.`,
      checks,
      potential,
      potentialReason: 'Poor sea conditions lower both safety and fishing potential.',
      timeWindow: 'Stay ashore until conditions ease',
      zone: 'No recommended fishing zone while this risk remains',
      route: 'Do not put to sea',
      avoid: 'Harbour mouth and open water until the weather feed improves',
      hazard: {
        title: 'Unsafe sea conditions',
        action: 'Remain in harbour. Recheck with ORCA before leaving.',
      },
      potentialIsEstimate: true,
    }
  }

  return {
    verdict,
    headline: 'Caution — conditions may deteriorate',
    why: weather
      ? `You can consider a short trip${where}, but conditions may worsen. Keep the outing close to shore and watch the sky.`
      : 'ORCA does not yet have your local weather. Allow location so the advice can use live conditions.',
    checks: weather ? checks : ['Local weather not available yet', 'Safety advice is limited'],
    potential,
    potentialReason: weather
      ? 'Mixed sea and wind signals — treat fishing potential as only moderate.'
      : 'Fishing potential cannot be judged without local conditions.',
    timeWindow: '05:30 AM – 09:00 AM, then review',
    zone: 'Stay close to shore',
    route: 'Short, low-risk loop — return early',
    avoid: 'Northern offshore water after 11:00 AM',
    hazard: weather
      ? {
          title: 'Conditions may worsen later in the day',
          action: 'Consider returning before late morning.',
        }
      : null,
    potentialIsEstimate: true,
  }
}
