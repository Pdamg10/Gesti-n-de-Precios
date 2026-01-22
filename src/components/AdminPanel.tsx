'use client'

import { useEffect, useState } from 'react'
import { useRealtimeData, ConnectedUser } from '@/hooks/useRealtimeData'
import { useModal } from '@/context/ModalContext'

interface AdminPanelProps {
  socket: any
  currentUser: any
}

export default function AdminPanel({ socket, currentUser }: AdminPanelProps) {
  const { connectedUsers } = useRealtimeData('admin')
  const [showPasswordModal, setShowPasswordModal] = useState(false)
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
    const initial = lastName ? ` ${lastName.charAt(0)}.` : ''
    return `${name}${initial}`
  }

  const handleChangePassword = () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setMessage('Por favor completa todos los campos')
      return
    }

    setIsLoading(true)
    setMessage('')

    socket.emit('change-admin-password', {
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

    socket.emit('kick-worker', targetSocketId)

    socket.on('kick-worker-success', (msg) => {
      showAlert(msg, 'Éxito')
    })

    socket.on('kick-worker-error', (errorMsg) => {
      showAlert(errorMsg, 'Error')
    })
  }

  const admins = connectedUsers.filter(user => user.userType === 'admin')
  const canChangePassword = currentUser?.canChangePassword

  return (
    <div className="space-y-6">


      {/* Password Management - Super Admin Only */}
      <div>
        <h3 className="text-lg font-semibold text-amber-400 mb-3">Gestión de Contraseña</h3>
        {isSuperAdmin ? (
          <div className="space-y-3">
            <button
              onClick={() => setShowPasswordModal(true)}
              className="btn-primary px-4 py-2 rounded-lg font-medium text-gray-900"
            >
              Cambiar Contraseña de Admin
            </button>
            <p className="text-xs text-gray-400">
              Eres Super Administrador y puedes cambiar la contraseña general.
            </p>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-4 bg-white/5 rounded-xl border border-white/5">
            <p className="text-sm">No tienes permisos de Super Administrador</p>
            <p className="text-xs mt-1">Solo los super administradores pueden realizar esta acción</p>
          </div>
        )}
      </div>

      {/* All Users */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-amber-400">Usuarios Conectados</h3>
          <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-medium text-gray-300">
            Total: {connectedUsers.length}
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {connectedUsers.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full shadow-sm ${
                  user.userType === 'admin' ? 'bg-red-500 shadow-red-500/50' :
                  user.userType === 'worker' ? 'bg-blue-500 shadow-blue-500/50' : 'bg-green-500 shadow-green-500/50'
                }`}></div>
                <div>
                  <div className="text-sm font-semibold flex items-center gap-2">
                    {user.userType === 'admin' ? '👑' :
                     user.userType === 'worker' ? '👷' : '👤'}
                    {formatName(user.name, user.lastName)}
                    {user.socketId === currentUser?.socketId && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Tú</span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-400 font-medium">
                    {user.userType === 'admin' ? 'Administrador' :
                     user.userType === 'worker' ? 'Trabajador' : 'Cliente'} 
                    <span className="mx-1.5">•</span>
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

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-glass rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">Cambiar Contraseña de Admin</h3>
            
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
                  className="flex-1 btn-primary px-4 py-2 rounded-lg font-medium text-gray-900 disabled:opacity-50 transition-all shadow-lg hover:shadow-amber-500/20"
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