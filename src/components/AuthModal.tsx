'use client'

import { useState } from 'react'
import { useRealtimeData } from '@/hooks/useRealtimeData'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onLogin: (userType: 'admin' | 'client' | 'worker', userInfo?: any) => void
  currentSocket: any
}

export default function AuthModal({ isOpen, onClose, onLogin, currentSocket }: AuthModalProps) {
  const [authMode, setAuthMode] = useState<'login' | 'identify'>('login')
  const [userType, setUserType] = useState<'admin' | 'client' | 'worker'>('client')
  const [formData, setFormData] = useState({
    name: '',
    lastName: '',
    password: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleAdminLogin = async () => {
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

    try {
      currentSocket.emit('admin-login', trimmedData)

      // Listen for response (using once to avoid duplicate listeners)
      currentSocket.once('admin-login-success', (data: any) => {
        onLogin('admin', { ...trimmedData, ...data.user })
        onClose()
        setIsLoading(false)
        currentSocket.off('admin-login-error')
      })

      currentSocket.once('admin-login-error', (errorMsg: string) => {
        setError(errorMsg)
        setIsLoading(false)
        currentSocket.off('admin-login-success')
      })
    } catch (error) {
      setError('Error de conexión')
      setIsLoading(false)
    }
  }

  const handleWorkerLogin = () => {
    if (!formData.name || !formData.lastName || !formData.password) {
      setError('Nombre, Apellido y Clave son obligatorios para trabajadores')
      return
    }

    const password = formData.password.trim()
    if (password !== 'Chirica001*' && password !== 'Chiricapoz001*') {
      setError('Clave de trabajador incorrecta')
      return
    }

    const name = formData.name.trim()
    const lastName = formData.lastName.trim()

    currentSocket.emit('identify-user', {
      userType: 'worker',
      name: name,
      lastName: lastName
    })

    onLogin('worker', { name, lastName })
    onClose()
  }

  const handleIdentify = () => {
    // Para clientes, el nombre es opcional
    currentSocket.emit('identify-user', {
      userType: 'client',
      name: formData.name || undefined,
      lastName: formData.lastName || undefined
    })

    onLogin('client', { name: formData.name, lastName: formData.lastName })
    onClose()
  }

  const handleGuestAccess = () => {
    onLogin('client')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card-glass rounded-2xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-white mb-4 text-center">
          {authMode === 'login' ? 'Acceso de Administrador' : 'Identificación'}
        </h2>

        {authMode === 'login' ? (
          <div className="space-y-4">
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-amber-400 mb-1">Nombre <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-dark rounded-lg px-3 py-2 w-full text-white"
                  placeholder="Tu nombre (obligatorio)"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-amber-400 mb-1">Apellido <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="input-dark rounded-lg px-3 py-2 w-full text-white"
                  placeholder="Tu apellido (obligatorio)"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-amber-400 mb-1">Clave de Acceso <span className="text-red-400">*</span></label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input-dark rounded-lg px-3 py-2 w-full text-white"
                  placeholder="Introduce tu clave de Admin"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="text-red-400 text-sm text-center bg-red-500/10 rounded-lg p-2">
                {error}
              </div>
            )}

            <button
              onClick={handleAdminLogin}
              disabled={isLoading}
              className="w-full btn-primary px-4 py-2 rounded-lg font-medium text-gray-900 disabled:opacity-50 transition-all shadow-lg hover:shadow-amber-500/20"
            >
              {isLoading ? 'Verificando...' : 'Acceder al Panel Admin'}
            </button>

            <div className="text-center">
              <button
                onClick={() => {
                  setAuthMode('identify')
                  setError('')
                  setFormData({ name: '', lastName: '', password: '' })
                }}
                className="text-amber-400 hover:text-amber-300 text-sm"
              >
                No soy administrador
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Tipo de Usuario</label>
              <select
                value={userType}
                onChange={(e) => {
                  setUserType(e.target.value as any)
                  setError('')
                }}
                className="input-dark rounded-lg px-3 py-2 w-full text-white"
              >
                <option value="client">Cliente</option>
                <option value="worker">Trabajador</option>
              </select>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-amber-400 mb-1">
                  Nombre {userType === 'worker' && <span className="text-red-400">*</span>}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-dark rounded-lg px-3 py-2 w-full text-white"
                  placeholder={userType === 'worker' ? 'Nombre obligatorio' : 'Nombre opcional'}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-amber-400 mb-1">
                  Apellido {userType === 'worker' && <span className="text-red-400">*</span>}
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="input-dark rounded-lg px-3 py-2 w-full text-white"
                  placeholder={userType === 'worker' ? 'Apellido obligatorio' : 'Apellido opcional'}
                />
              </div>

              {userType === 'worker' && (
                <div>
                  <label className="block text-sm font-semibold text-amber-400 mb-1">
                    Clave de Acceso <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="input-dark rounded-lg px-3 py-2 w-full text-white"
                    placeholder="Introduce la clave de trabajador"
                  />
                </div>
              )}
            </div>

            {error && (
              <div className="text-red-400 text-sm text-center bg-red-500/10 rounded-lg p-2">
                {error}
              </div>
            )}

            <button
              onClick={userType === 'worker' ? handleWorkerLogin : handleIdentify}
              className="w-full btn-primary px-4 py-2 rounded-lg font-medium text-gray-900 transition-all shadow-lg hover:shadow-amber-500/20"
            >
              {userType === 'worker' ? 'Acceder como Trabajador' : 'Identificarse'}
            </button>

            <div className="text-center space-y-2">
              <button
                onClick={() => {
                  setAuthMode('login')
                  setError('')
                  setFormData({ name: '', lastName: '', password: '' })
                }}
                className="text-amber-400 hover:text-amber-300 text-sm"
              >
                Soy administrador
              </button>
              
              <button
                onClick={handleGuestAccess}
                className="text-gray-400 hover:text-gray-300 text-sm"
              >
                Continuar como invitado
              </button>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-4 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium transition-all"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}