import React, { useState } from 'react'
import RoleSelectView from './pages/RoleSelectView.jsx'
import DriverConsoleView from './pages/DriverConsoleView.jsx'
import DispatcherConsoleView from './pages/DispatcherConsoleView.jsx'

export default function App() {
  const [activeRole, setActiveRole] = useState('driver')

  if (activeRole === 'driver') {
    return <DriverConsoleView onChangeRole={() => setActiveRole('driver')} onOpenDispatcher={() => setActiveRole('dispatcher')} />
  }

  return <DispatcherConsoleView onChangeRole={() => setActiveRole(null)} onOpenDriver={() => setActiveRole('driver')} />
}
