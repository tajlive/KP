import Plausible from 'plausible-tracker'

const plausible = Plausible({
  domain: 'klarpakke.no',
  trackLocalhost: false,
})

export const trackEvent = (eventName: string, props?: Record<string, string | number>) => {
  if (typeof window !== 'undefined') {
    plausible.trackEvent(eventName, { props })
  }
}

export const trackPageview = () => {
  if (typeof window !== 'undefined') {
    plausible.trackPageview()
  }
}

export default plausible
