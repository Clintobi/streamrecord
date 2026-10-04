import { lazy, Suspense, useEffect, useState } from 'react'
import { Layout } from './ui'
import MapScreen from './screens/MapScreen'
import SiteReading from './screens/SiteReading'
import FieldCheck from './screens/FieldCheck'
import ClinicianReading from './screens/ClinicianReading'
import Sources from './screens/Sources'
import ReviewQueue from './screens/ReviewQueue'
import Story from './screens/Story'
// the printable sign pulls in the QR encoder, so it loads only when opened
const StreamSign = lazy(() => import('./screens/StreamSign'))

function useHash() {
  const [h, setH] = useState(location.hash || '#/')
  useEffect(() => {
    const on = () => { setH(location.hash || '#/'); window.scrollTo(0, 0); document.getElementById('main')?.focus() }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return h
}

export default function App() {
  const h = useHash()
  const [, route, id] = h.replace(/^#/, '').split('/')
  let screen
  if (route === 'site' && id) screen = <SiteReading id={decodeURIComponent(id)} />
  else if (route === 'check' && id) screen = <FieldCheck id={decodeURIComponent(id)} />
  else if (route === 'clinician' && id) screen = <ClinicianReading id={decodeURIComponent(id)} />
  else if (route === 'sources') screen = <Sources />
  else if (route === 'review') screen = <ReviewQueue />
  else if (route === 'story') screen = <Story />
  else if (route === 'sign' && id) screen = <Suspense fallback={null}><StreamSign id={decodeURIComponent(id)} /></Suspense>
  else screen = <MapScreen city={route === 'city' ? id : undefined} />
  return <Layout route={route || ''}>{screen}</Layout>
}
