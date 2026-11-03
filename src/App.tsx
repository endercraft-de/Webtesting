import { lazy, Suspense, useEffect, type ComponentType, type LazyExoticComponent } from 'react'
import { HashRouter, Link, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { Layout } from './components/Layout'
import { PasswordProvider } from './components/PasswordDialog'
import Home from './pages/Home'
import { toolBySlug } from './tools/registry'

function Spinner() {
  return (
    <div className="flex justify-center py-32">
      <div className="size-8 animate-spin rounded-full border-[3px] border-brand-200 border-t-brand-600" />
    </div>
  )
}

const lazyCache = new Map<string, LazyExoticComponent<ComponentType>>()
function lazyTool(slug: string, load: () => Promise<{ default: ComponentType }>) {
  let c = lazyCache.get(slug)
  if (!c) lazyCache.set(slug, (c = lazy(load)))
  return c
}

function ToolRoute() {
  const { slug = '' } = useParams()
  const location = useLocation()
  const tool = toolBySlug(slug)
  const Comp = tool ? lazyTool(tool.slug, tool.load) : null
  useEffect(() => {
    document.title = tool ? `${tool.title} – PDFwerk` : 'PDFwerk'
  }, [tool])
  if (!Comp)
    return (
      <div className="py-32 text-center">
        <p className="text-slate-500">Dieses Werkzeug gibt es nicht.</p>
        <Link to="/" className="mt-4 inline-block font-medium text-brand-600">
          Zur Übersicht
        </Link>
      </div>
    )
  return (
    <Suspense fallback={<Spinner />}>
      <Comp key={location.key} />
    </Suspense>
  )
}

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
    if (pathname === '/') document.title = 'PDFwerk – PDF-Werkzeuge'
  }, [pathname])
  return null
}

export default function App() {
  return (
    <HashRouter>
      <PasswordProvider>
        <ScrollTop />
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/:slug" element={<ToolRoute />} />
          </Routes>
        </Layout>
      </PasswordProvider>
    </HashRouter>
  )
}
