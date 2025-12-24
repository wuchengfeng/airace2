import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from './app/AdminLayout'
import { UserLayout } from './app/UserLayout'
import { HomePage } from './pages/HomePage'
import { ListsPage } from './pages/ListsPage'
import { ListDetailPage } from './pages/ListDetailPage'
import { ModePage } from './pages/ModePage'
import { PracticePage } from './pages/PracticePage'
import { PracticeResultPage } from './pages/PracticeResultPage'
import { MistakesPage } from './pages/MistakesPage'
import { CorrectsPage } from './pages/CorrectsPage'
import { AdminPromptsPage } from './pages/AdminPromptsPage'
import { HistoryDetailPage } from './pages/HistoryDetailPage'
import { HistoryPage } from './pages/HistoryPage'
import { NotFoundPage } from './pages/NotFoundPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="/home" element={<Navigate to="/app" replace />} />
      <Route path="/landing" element={<HomePage />} />

      <Route path="/app" element={<UserLayout />}>
        <Route index element={<ModePage />} />
        <Route path="practice/:listId/result" element={<PracticeResultPage />} />
        <Route path="practice/:listId" element={<PracticePage />} />
        <Route path="mistakes" element={<MistakesPage />} />
        <Route path="corrects" element={<CorrectsPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="history/:runId" element={<HistoryDetailPage />} />
      </Route>

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/lists" replace />} />
        <Route path="lists" element={<ListsPage />} />
        <Route path="lists/:listId" element={<ListDetailPage />} />
        <Route path="prompts" element={<AdminPromptsPage />} />
      </Route>

      <Route path="/lists" element={<Navigate to="/admin/lists" replace />} />
      <Route path="/lists/:listId" element={<Navigate to="/admin/lists" replace />} />
      <Route path="/practice/:listId" element={<Navigate to="/app" replace />} />
      <Route path="/practice/:listId/result" element={<Navigate to="/app" replace />} />
      <Route path="/mistakes" element={<Navigate to="/app/mistakes" replace />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
