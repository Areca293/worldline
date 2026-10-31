import { Route, Routes } from 'react-router-dom'
import { Layout } from './app/Layout'
import { Home } from './reading/Home'
import { Detail } from './reading/Detail'
import { Login } from './account/Login'
import { Register } from './account/Register'
import { SavedStories } from './bookmarks/SavedStories'
import { Research } from './assistance/Research'
import { NotFound } from './ui/ContentNotice'
// Preserve the original feature stylesheet order before main.tsx loads styles.css.
import './assistance.css'
import './discovery.css'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/articles/:slug" element={<Detail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/bookmarks" element={<SavedStories />} />
        <Route path="/research" element={<Research />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  )
}
