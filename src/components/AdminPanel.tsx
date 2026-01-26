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
  
  const { showAlert, showConfirm } = useModal()

  const isAdmin = currentUser?.userType === 'admin'
  const isSuperAdmin = currentUser?.isSuperAdmin === true

  const formatName = (name?: string, lastName?: string) => {
    if (!name) return 'Anónimo'
    const initial = lastName ? ` ${lastName.charAt(0).toUpperCase()}.` : ''
    return `${name}${initial}`
  }

  const handleRemoveAdmin = async (targetSocketId: string, user: ConnectedUser) => {
    if (!canChangePassword) {
      showAlert('No tienes permiso para remover administradores. Solo los administradores principales pueden hacer esto.', 'Permiso Denegado')
      return
    }

    const targetName = formatName(user.name, user.lastName)
    if (!await showConfirm(`¿Estás seguro de que quieres remover a ${targetName} como administrador?`, 'Confirmar Eliminación')) {
      return
    }

    socket.emit('remove-admin', {
      targetId: targetSocketId,
      targetName: user.name,
      targetLastName: user.lastName,
      targetUserType: user.userType
    })

    socket.on('remove-admin-success', (msg: string) => {
      showAlert(msg, 'Éxito')
    })

    socket.on('remove-admin-error', (errorMsg: string) => {
      showAlert(errorMsg, 'Error')
    })
  }

  const handleKickWorker = async (targetSocketId: string, user: ConnectedUser) => {
    if (!isSuperAdmin) {
      showAlert('Solo los super administradores pueden sacar trabajadores.', 'Error')
      return
    }

    const targetName = formatName(user.name, user.lastName)
    if (!await showConfirm(`¿Estás seguro de que quieres sacar a ${targetName} de la sesión?`, 'Confirmar')) {
      return
    }

    socket.emit('kick-user', {
      targetId: targetSocketId,
      targetName: user.name,
      targetLastName: user.lastName,
      targetUserType: user.userType
    })

    socket.on('kick-success', (msg: string) => {
      showAlert(msg, 'Éxito')
    })

    socket.on('kick-error', (errorMsg: string) => {
      showAlert(errorMsg, 'Error')
    })
  }

  // Backup and password management moved to page.tsx accordion

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

              {isSuperAdmin && (user.name !== currentUser?.name || user.lastName !== currentUser?.lastName) && (
                <div className="flex gap-2">
                  {user.userType === 'worker' && (
                    <button
                      onClick={() => handleKickWorker(user.id, user)}
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
                      onClick={() => handleRemoveAdmin(user.id, user)}
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

    </div>
  )
}
