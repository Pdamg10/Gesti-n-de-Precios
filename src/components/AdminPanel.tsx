'use client'

import { useEffect, useState } from 'react'
import { useRealtimeData, ConnectedUser } from '@/hooks/useRealtimeData'
import { useModal } from '@/context/ModalContext'

interface AdminPanelProps {
  socket: any
  currentUser: any
  connectedUsers: ConnectedUser[] // Recibir connectedUsers como prop
}

export default function AdminPanel({ socket, currentUser, connectedUsers: propConnectedUsers }: AdminPanelProps) {
  // Ya no usamos useRealtimeData aquí internamente para obtener usuarios,
  // confiamos en los props que vienen de page.tsx donde está la conexión principal.
  // Sin embargo, para compatibilidad si no se pasa, intentamos usar el hook o un array vacío.
  
  // NOTA: El problema original era que useRealtimeData crea una NUEVA conexión de socket
  // cada vez que se invoca. Al llamarlo aquí dentro de AdminPanel, se creaba una segunda conexión
  // (socketId diferente) que no estaba autenticada ni sincronizada con la principal de page.tsx.
  // La solución correcta es pasar 'connectedUsers' desde el componente padre (page.tsx)
  // que ya tiene la conexión 'admin' establecida.
  
  const connectedUsers = propConnectedUsers || []
  
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordModalType, setPasswordModalType] = useState<'admin' | 'worker'>('admin')
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const { showAlert, showConfirm } = useModal()

  const isAdmin = currentUser?.userType === 'admin'
  const isSuperAdmin = currentUser?.isSuperAdmin === true

  const formatName = (name?: string, lastName?: string) => {
    if (!name) return 'Anónimo'
    const initial = lastName ? ` ${lastName.charAt(0).toUpperCase()}.` : ''
    return `${name}${initial}`
  }

  const handleChangePassword = () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setMessage('Por favor completa todos los campos')
      return
    }

    setIsLoading(true)
    setMessage('')

    const eventName = passwordModalType === 'admin' ? 'change-admin-password' : 'change-worker-password'
    
    socket.emit(eventName, {
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword
    })

    socket.on('password-change-success', (msg) => {
      setMessage(msg)
      setIsLoading(false)
      setTimeout(() => {
        setShowPasswordModal(false)
        setPasswordForm({ currentPassword: '', newPassword: '' })
        setMessage('')
      }, 2000)
    })

    socket.on('password-change-error', (errorMsg) => {
      setMessage(errorMsg)
      setIsLoading(false)
    })
  }

  const handleRemoveAdmin = async (targetSocketId: string, targetName: string) => {
    if (!canChangePassword) {
      showAlert('No tienes permiso para remover administradores. Solo los administradores principales pueden hacer esto.', 'Permiso Denegado')
      return
    }

    if (!await showConfirm(`¿Estás seguro de que quieres remover a ${targetName} como administrador?`, 'Confirmar Eliminación')) {
      return
    }

    socket.emit('remove-admin', targetSocketId)

    socket.on('remove-admin-success', (msg) => {
      showAlert(msg, 'Éxito')
    })

    socket.on('remove-admin-error', (errorMsg) => {
      showAlert(errorMsg, 'Error')
    })
  }

  const handleKickWorker = async (targetSocketId: string, targetName: string) => {
    if (!isSuperAdmin) {
      showAlert('Solo los super administradores pueden sacar trabajadores.', 'Error')
      return
    }

    if (!await showConfirm(`¿Estás seguro de que quieres sacar a ${targetName} de la sesión?`, 'Confirmar')) {
      return
    }

    socket.emit('kick-user', targetSocketId)

    socket.on('kick-success', (msg) => {
      showAlert(msg, 'Éxito')
    })

    socket.on('kick-error', (errorMsg) => {
      showAlert(errorMsg, 'Error')
    })
  }

  const handleBackup = async () => {
    try {
      setIsLoading(true)
      const [productsRes, settingsRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/settings')
      ])
      
      const products = await productsRes.json()
      const settings = await settingsRes.json()
      
      const backupData = {
        timestamp: new Date().toISOString(),
        products,
        settings
      }
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `backup-precios-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      showAlert('Copia de seguridad descargada con éxito', 'Éxito')
    } catch (error) {
      console.error('Error creating backup:', error)
      showAlert('Error al crear la copia de seguridad', 'Error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      showAlert('Por favor selecciona un archivo JSON válido', 'Formato Incorrecto')
      return
    }

    if (!await showConfirm('¿Estás seguro de que quieres restaurar la base de datos? Esto sobrescribirá los datos existentes con los del archivo.', 'Confirmar Restauración')) {
      // Clear input so user can select same file again if they cancelled
      event.target.value = ''
      return
    }

    try {
      setIsLoading(true)
      const text = await file.text()
      const backupData = JSON.parse(text)
      
      if (!backupData.products || !backupData.settings) {
        throw new Error('Formato de archivo inválido: faltan datos de productos o configuración')
      }

      const response = await fetch('/api/admin/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(backupData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error en la restauración')
      }

      showAlert('Base de datos restaurada con éxito', 'Éxito')
      // Optional: Refresh page or trigger re-fetch logic if not fully reactive via socket
    } catch (error: any) {
      console.error('Error restoring database:', error)
      showAlert(error.message || 'Error al restaurar la base de datos', 'Error')
    } finally {
      setIsLoading(false)
      event.target.value = '' // Reset input
    }
  }

  const admins = connectedUsers.filter(user => user.userType === 'admin')
  const canChangePassword = currentUser?.canChangePassword

  return (
    <div className="space-y-6">

      {/* All Users */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">Usuarios Conectados</h3>
          <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-medium text-gray-300">
            Total: {connectedUsers.length}
          </span>
          <button 
            onClick={() => socket.emit('request-user-list')}
            className="ml-2 text-xs text-white hover:text-gray-300 underline"
          >
            Refrescar
          </button>
        </div>

        {/* Legend - Only for Admin */}
        {isAdmin && (
          <div className="flex flex-wrap gap-4 mb-4 text-xs bg-white/5 p-3 rounded-lg border border-white/10">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span className="text-gray-300">👑 Admin</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span className="text-gray-300">👷 Trabajador</span>
            </div>
          </div>
        )}
        
        {connectedUsers.length === 0 && (
          <div className="text-gray-400 text-sm italic p-4 text-center border border-white/10 rounded-lg">
            No hay usuarios visibles. Intenta refrescar o verifica la conexión.
            <br/>Estado del socket: {socket?.connected ? 'Conectado' : 'Desconectado'}
            <br/>ID: {socket?.id}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {connectedUsers.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full shadow-sm animate-pulse ${
                    user.userType === 'admin' ? 'bg-red-500 shadow-red-500/50' :
                    'bg-blue-500 shadow-blue-500/50'
                  }`}></div>
                <div>
                  <div className="text-sm font-medium text-white flex items-center gap-2">
                    {formatName(user.name, user.lastName)}
                    <span className="text-xs text-gray-400">({user.userType === 'admin' ? 'Admin' : 'Trabajador'})</span>
                    {(user.socketId === socket.id || (currentUser && user.name === currentUser.name && user.lastName === currentUser.lastName)) && (
                      <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Tú</span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-400 font-medium">
                    {new Date(user.connectedAt).toLocaleTimeString('es-VE', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              </div>

              {isSuperAdmin && user.socketId !== currentUser?.socketId && (
                <div className="flex gap-2">
                  {user.userType === 'worker' && (
                    <button
                      onClick={() => handleKickWorker(user.id, formatName(user.name, user.lastName))}
                      className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs transition-all border border-red-500/20"
                      title="Sacar trabajador"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    </button>
                  )}
                  {user.userType === 'admin' && isSuperAdmin && (
                    <button
                      onClick={() => handleRemoveAdmin(user.id, formatName(user.name, user.lastName))}
                      className="p-2 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-xs transition-all border border-orange-500/20"
                      title="Degradar admin"
                    >
                      👑 ↓
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Password Management - Super Admin Only */}
      {isSuperAdmin && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Gestión de Contraseña</h3>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  setPasswordModalType('worker')
                  setShowPasswordModal(true) 
                }}
                className="btn-primary px-4 py-2 rounded-lg font-medium text-gray-900 w-full md:w-auto"
              >
                Cambiar Contraseña de Trabajadores
              </button>
              <button
                 onClick={() => {
                   setPasswordModalType('admin')
                   setShowPasswordModal(true)
                 }}
                 className="btn-primary px-4 py-2 rounded-lg font-medium text-gray-900 w-full md:w-auto"
              >
                Cambiar Contraseña de Admin
              </button>
            </div>
            <p className="text-xs text-gray-400">
              Eres Administrador y puedes cambiar las contraseñas.
            </p>
          </div>
        </div>
      )}

      {/* Backup - Super Admin Only */}
      {isSuperAdmin && (
        <div className="border-t border-white/10 pt-4">
          <h3 className="text-lg font-semibold text-white mb-3">Copia de Seguridad y Restauración</h3>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-blue-900/20 border border-blue-500/30">
              <h4 className="text-sm font-medium text-blue-300 mb-2">Descargar Copia de Seguridad</h4>
              <p className="text-xs text-gray-400 mb-3">
                Genera un archivo JSON con todos los productos y configuraciones actuales.
              </p>
              <button
                onClick={handleBackup}
                disabled={isLoading}
                className="w-full md:w-auto px-4 py-2 rounded-lg font-medium bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-lg flex items-center gap-2 justify-center"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {isLoading ? 'Procesando...' : 'Descargar Copia de Seguridad (JSON)'}
              </button>
            </div>

            <div className="p-4 rounded-lg bg-red-900/20 border border-red-500/30">
              <h4 className="text-sm font-medium text-red-300 mb-2">Restaurar Base de Datos</h4>
              <p className="text-xs text-gray-400 mb-3">
                Sube un archivo de copia de seguridad (JSON) para restaurar los datos. 
                <span className="text-red-400 font-bold block mt-1">⚠️ Esto sobrescribirá los datos existentes.</span>
              </p>
              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestore}
                  disabled={isLoading}
                  className="hidden"
                  id="restore-file-input"
                />
                <label
                  htmlFor="restore-file-input"
                  className={`w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-all shadow-lg cursor-pointer ${
                    isLoading ? 'bg-gray-600 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  {isLoading ? 'Procesando...' : 'Subir y Restaurar (JSON)'}
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-glass rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-red-500 mb-4">
              {passwordModalType === 'admin' ? 'Cambiar Contraseña de Admin' : 'Cambiar Contraseña de Trabajadores'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Contraseña Actual</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="input-dark rounded-lg px-3 py-2 w-full text-white"
                  placeholder="Contraseña actual"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Nueva Contraseña</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="input-dark rounded-lg px-3 py-2 w-full text-white"
                  placeholder="Nueva contraseña"
                />
              </div>

              {message && (
                <div className={`text-sm text-center p-2 rounded ${
                  message.includes('correctamente') 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {message}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleChangePassword}
                  disabled={isLoading}
                  className="flex-1 btn-primary px-4 py-2 rounded-lg font-medium text-gray-900 disabled:opacity-50 transition-all shadow-lg hover:shadow-red-500/20"
                >
                  {isLoading ? 'Cambiando...' : 'Cambiar'}
                </button>
                <button
                  onClick={() => {
                    setShowPasswordModal(false)
                    setPasswordForm({ currentPassword: '', newPassword: '' })
                    setMessage('')
                  }}
                  className="flex-1 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}