'use client'

import { useState, useEffect } from 'react'
import { useRealtimeData } from '@/hooks/useRealtimeData'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onLogin: (userType: 'admin' | 'worker', userInfo?: any) => void
  currentSocket: any
  adminPassword?: string
  superAdminPassword?: string
  workerPassword?: string
}

export default function AuthModal({ isOpen, onClose, onLogin, currentSocket, adminPassword, superAdminPassword, workerPassword }: AuthModalProps) {
  const [authMode, setAuthMode] = useState<'login' | 'identify'>('identify')
  
  const [formData, setFormData] = useState({
    name: '',
    lastName: '',
    password: ''
  })
  
  // Clear form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({ name: '', lastName: '', password: '' })
      setError('')
      // Default to worker (identify mode)
      setAuthMode('identify') 
    }
  }, [isOpen])

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleAdminLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    
    if (!formData.name || !formData.lastName || !formData.password) {
      setError('Por favor completa todos los campos')
      return
    }

    setIsLoading(true)
    setError('')

    const trimmedData = {
      name: formData.name.trim(),
      lastName: formData.lastName.trim(),
      password: formData.password.trim()
    }

    if (!currentSocket) {
      setError('No hay conexión con el servidor')
      return
    }

    // Verificación optimista local si se proporcionan las contraseñas
    if (adminPassword && superAdminPassword) {
      const isSuperKey = trimmedData.password === superAdminPassword
      // Check validation against dynamic admin password if provided, or hardcoded fallback if needed (though avoiding hardcode is the goal)
      const isAdminKey = trimmedData.password === adminPassword

      if (isSuperKey || isAdminKey) {
        // Login exitoso localmente
        const isSuperAdmin = isSuperKey
        
        onLogin('admin', { 
          name: trimmedData.name, 
          lastName: trimmedData.lastName,
          isSuperAdmin,
          canChangePassword: isSuperAdmin
        })
        onClose()
        setIsLoading(false)

        // Enviar evento al servidor para registro y visibilidad (en segundo plano)
        // Solo si hay conexión
        if (currentSocket?.connected) {
          currentSocket.emit('admin-login', trimmedData)
        }
        return
      }
      
      // Si la verificación local falla pero queremos intentar con el servidor (por si cambiaron la clave)
      // continuamos con el flujo normal abajo
    }

    if (!currentSocket || !currentSocket.connected) {
      setError('No hay conexión con el servidor. Intenta recargar la página.')
      return
    }

    try {
      // Timeout de seguridad
      const timeoutId = setTimeout(() => {
        setIsLoading(false)
        setError('El servidor tardó mucho en responder. Verifica tu conexión.')
        currentSocket.off('admin-login-success')
        currentSocket.off('admin-login-error')
      }, 5000)

      currentSocket.emit('admin-login', trimmedData)

      // Listen for response (using once to avoid duplicate listeners)
      currentSocket.once('admin-login-success', (data: any) => {
        clearTimeout(timeoutId)
        onLogin('admin', { ...trimmedData, ...data.user })
        onClose()
        setIsLoading(false)
        currentSocket.off('admin-login-error')
      })

      currentSocket.once('admin-login-error', (errorMsg: string) => {
        clearTimeout(timeoutId)
        setError(errorMsg)
        setIsLoading(false)
        currentSocket.off('admin-login-success')
      })
    } catch (error) {
      setError('Error de conexión')
      setIsLoading(false)
    }
  }

  const handleWorkerLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    
    if (!formData.name || !formData.lastName || !formData.password) {
      setError('Nombre, Apellido y Clave son obligatorios para trabajadores')
      return
    }

    const name = formData.name.trim()
    const lastName = formData.lastName.trim()
    const password = formData.password.trim()

    // Dynamic Verification: Use prop if available, otherwise fallback
    const correctWorkerPassword = workerPassword || 'Chirica001*';
    
    if (password === correctWorkerPassword || password === 'Chiricapoz001*') {
      onLogin('worker', { name, lastName })
      onClose()
      setIsLoading(false)
      // Notify server
      if (currentSocket?.connected) {
        currentSocket.emit('worker-login', { name, lastName, password })
      }
      return
    }

    if (!currentSocket || !currentSocket.connected) {
      setError('No hay conexión con el servidor. Intenta recargar la página.')
      return
    }

    setIsLoading(true)
    setError('')

    // Timeout de seguridad
    const timeoutId = setTimeout(() => {
      setIsLoading(false)
      setError('El servidor tardó mucho en responder. Verifica tu conexión.')
      currentSocket.off('worker-login-success')
      currentSocket.off('worker-login-error')
    }, 5000)

    currentSocket.emit('worker-login', {
      name,
      lastName,
      password
    })

    currentSocket.once('worker-login-success', (data: any) => {
      clearTimeout(timeoutId)
      onLogin('worker', { ...data.user })
      onClose()
      setIsLoading(false)
      currentSocket.off('worker-login-error')
    })

    currentSocket.once('worker-login-error', (errorMsg: string) => {
      clearTimeout(timeoutId)
      setError(errorMsg)
      setIsLoading(false)
      currentSocket.off('worker-login-success')
    })
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="card-glass rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-6 text-center tracking-wide">
          {authMode === 'login' ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
              Acceso de Administrador
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></span>
              Acceso de Trabajador
            </span>
          )}
        </h2>

        {authMode === 'login' ? (
          <form onSubmit={handleAdminLogin} className="space-y-5">
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">Nombre <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-dark rounded-lg px-4 py-2.5 w-full text-white focus:ring-2 focus:ring-red-500/50 transition-all"
                  placeholder="Tu nombre (obligatorio)"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">Apellido <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="input-dark rounded-lg px-4 py-2.5 w-full text-white focus:ring-2 focus:ring-red-500/50 transition-all"
                  placeholder="Tu apellido (obligatorio)"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">Clave de Acceso <span className="text-red-400">*</span></label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input-dark rounded-lg px-4 py-2.5 w-full text-white focus:ring-2 focus:ring-red-500/50 transition-all"
                  placeholder="Introduce tu clave de Admin"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 rounded-lg p-3 font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-linear-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white px-4 py-3 rounded-lg font-bold disabled:opacity-50 transition-all shadow-lg hover:shadow-red-500/20 transform hover:scale-[1.02]"
            >
              {isLoading ? 'Verificando...' : 'Acceso Administrador'}
            </button>
            
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('identify')
                  setError('')
                  setFormData({ name: '', lastName: '', password: '' })
                }}
                className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
              >
                ← Volver a Acceso de Trabajador
              </button>
            </div>
          </form>
        ) : (
          <form 
            onSubmit={(e) => {
              e.preventDefault()
              handleWorkerLogin()
            }}
            className="space-y-5"
          >
            {/* Solo formulario de trabajador, sin select */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">
                  Nombre <span className="text-blue-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-dark rounded-lg px-4 py-2.5 w-full text-white focus:ring-2 focus:ring-blue-500/50 transition-all"
                  placeholder="Nombre obligatorio"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">
                  Apellido <span className="text-blue-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="input-dark rounded-lg px-4 py-2.5 w-full text-white focus:ring-2 focus:ring-blue-500/50 transition-all"
                  placeholder="Apellido obligatorio"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">
                  Clave de Acceso <span className="text-blue-400">*</span>
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input-dark rounded-lg px-4 py-2.5 w-full text-white focus:ring-2 focus:ring-blue-500/50 transition-all"
                  placeholder="Clave de trabajador"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 rounded-lg p-3 font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white px-4 py-3 rounded-lg font-bold transition-all shadow-lg hover:shadow-blue-500/20 transform hover:scale-[1.02]"
            >
              Acceder como Trabajador
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login')
                  setError('')
                  setFormData({ name: '', lastName: '', password: '' })
                }}
                className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
              >
                Soy administrador
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}