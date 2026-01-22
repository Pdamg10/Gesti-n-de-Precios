import { createServer } from 'http'
import { Server } from 'socket.io'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://spyodxdqweqcxhcauqyq.supabase.co'
const supabaseKey = 'sb_publishable_XEp4zZ6afjpX0Edw356Mtw_q5i17QLE'
const supabase = createClient(supabaseUrl, supabaseKey)

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST"]
  }
})

const PORT = 3001

// Store connected users with their info
interface ConnectedUser {
  id: string
  socketId: string
  userType: 'admin' | 'worker'
  name?: string
  lastName?: string
  connectedAt: Date
  lastActivity: Date
}

const connectedUsers = new Map<string, ConnectedUser>()

// Store credentials (loaded from DB)
const authConfig = {
  adminPassword: 'Chirica001*', // Default
  workerPassword: 'Chirica001*', // Default
  superPassword: 'Chiricapoz001*',
  maxPasswordChangers: 2,
  superAdmins: [] as { name: string, lastName: string }[]
}

// Load credentials from DB
async function loadCredentials() {
  try {
    const { data } = await supabase.from('settings').select('*').in('settingKey', ['admin_password', 'worker_password'])
    if (data) {
      data.forEach(setting => {
        if (setting.settingKey === 'admin_password' && setting.settingValue) {
          authConfig.adminPassword = setting.settingValue
        }
        if (setting.settingKey === 'worker_password' && setting.settingValue) {
          authConfig.workerPassword = setting.settingValue
        }
      })
      console.log('Credentials loaded from DB')
    }
  } catch (error) {
    console.error('Error loading credentials:', error)
  }
}

// Initialize
loadCredentials()

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)
  
  // When user identifies themselves (Legacy/Auto)
  socket.on('identify-user', (userData: { 
    userType: 'admin' | 'worker',
    name?: string,
    lastName?: string 
  }) => {
    const user: ConnectedUser = {
      id: socket.id,
      socketId: socket.id,
      userType: userData.userType,
      name: userData.name,
      lastName: userData.lastName,
      connectedAt: new Date(),
      lastActivity: new Date()
    }
    
    connectedUsers.set(socket.id, user)
    console.log(`User identified: ${userData.userType} - ${userData.name || ''} ${userData.lastName || ''} - ${socket.id}`)
    
    // Send updated user list to all admins
    broadcastUserList()
  })

  // Admin authentication
  socket.on('admin-login', (credentials: { name: string, lastName: string, password: string }) => {
    const isSuperKey = credentials.password === authConfig.superPassword
    const isAdminKey = credentials.password === authConfig.adminPassword

    if (isSuperKey || isAdminKey) {
      const user: ConnectedUser = {
        id: socket.id,
        socketId: socket.id,
        userType: 'admin',
        name: credentials.name,
        lastName: credentials.lastName,
        connectedAt: new Date(),
        lastActivity: new Date()
      }
      
      connectedUsers.set(socket.id, user)
      
      const isSuperAdmin = isSuperKey || 
                          authConfig.superAdmins.some(sa => sa.name === credentials.name && sa.lastName === credentials.lastName)

      if (isSuperAdmin && !authConfig.superAdmins.some(sa => sa.name === credentials.name && sa.lastName === credentials.lastName)) {
        authConfig.superAdmins.push({ name: credentials.name, lastName: credentials.lastName })
      }

      socket.emit('admin-login-success', { 
        user: {
          name: user.name,
          lastName: user.lastName,
          isSuperAdmin: isSuperAdmin,
          canChangePassword: isSuperAdmin
        }
      })
      
      console.log(`${isSuperKey ? 'Super Admin' : 'Admin'} logged in: ${credentials.name} ${credentials.lastName}`)
      broadcastUserList()
    } else {
      socket.emit('admin-login-error', 'Contraseña incorrecta')
    }
  })

  // Worker authentication
  socket.on('worker-login', (credentials: { name: string, lastName: string, password: string }) => {
    const isWorkerKey = credentials.password === authConfig.workerPassword || credentials.password === authConfig.superPassword

    if (isWorkerKey) {
      const user: ConnectedUser = {
        id: socket.id,
        socketId: socket.id,
        userType: 'worker',
        name: credentials.name,
        lastName: credentials.lastName,
        connectedAt: new Date(),
        lastActivity: new Date()
      }
      
      connectedUsers.set(socket.id, user)
      
      socket.emit('worker-login-success', { 
        user: {
          name: user.name,
          lastName: user.lastName
        }
      })
      
      console.log(`Worker logged in: ${credentials.name} ${credentials.lastName}`)
      broadcastUserList()
    } else {
      socket.emit('worker-login-error', 'Contraseña incorrecta')
    }
  })

  // Change admin password
  socket.on('change-admin-password', async (data: { currentPassword: string, newPassword: string }) => {
    const user = connectedUsers.get(socket.id)
    if (!user || user.userType !== 'admin') {
      socket.emit('password-change-error', 'No autorizado')
      return
    }

    const isSuperAdmin = authConfig.superAdmins.some(sa => sa.name === user.name && sa.lastName === user.lastName)
    
    if (!isSuperAdmin) {
      socket.emit('password-change-error', 'Solo los administradores principales pueden cambiar la contraseña')
      return
    }

    if (data.currentPassword !== authConfig.adminPassword) {
      socket.emit('password-change-error', 'Contraseña actual incorrecta')
      return
    }

    // Change password
    authConfig.adminPassword = data.newPassword
    
    // Persist to DB
    try {
      const { error } = await supabase.from('settings').upsert({ 
        settingKey: 'admin_password', 
        settingValue: data.newPassword,
        updatedAt: new Date().toISOString()
      }, { onConflict: 'settingKey' })
      
      if (error) throw error
      
      socket.emit('password-change-success', 'Contraseña de Admin actualizada correctamente')
      console.log(`Admin ${user.name} changed admin password`)
    } catch (e) {
      console.error('Error saving admin password:', e)
      socket.emit('password-change-error', 'Error al guardar la contraseña')
    }
  })

  // Change worker password
  socket.on('change-worker-password', async (data: { newPassword: string }) => {
    const user = connectedUsers.get(socket.id)
    if (!user || user.userType !== 'admin') {
      socket.emit('password-change-error', 'No autorizado')
      return
    }

    const isSuperAdmin = authConfig.superAdmins.some(sa => sa.name === user.name && sa.lastName === user.lastName)
    if (!isSuperAdmin) {
       socket.emit('password-change-error', 'Solo los administradores principales pueden cambiar la contraseña')
       return
    }
    
    // Change password
    authConfig.workerPassword = data.newPassword
    
    // Persist to DB
    try {
      const { error } = await supabase.from('settings').upsert({ 
        settingKey: 'worker_password', 
        settingValue: data.newPassword,
        updatedAt: new Date().toISOString()
      }, { onConflict: 'settingKey' })
      
      if (error) throw error
      
      socket.emit('password-change-success', 'Contraseña de Trabajadores actualizada correctamente')
      console.log(`Admin ${user.name} changed worker password`)
    } catch (e) {
      console.error('Error saving worker password:', e)
      socket.emit('password-change-error', 'Error al guardar la contraseña')
    }
  })

  // Remove admin
  socket.on('remove-admin', (targetSocketId: string) => {
    const currentUser = connectedUsers.get(socket.id)
    if (!currentUser || currentUser.userType !== 'admin') {
      socket.emit('remove-admin-error', 'No autorizado')
      return
    }

    const isSuperAdmin = authConfig.superAdmins.some(sa => sa.name === currentUser.name && sa.lastName === currentUser.lastName)
    
    if (!isSuperAdmin) {
      socket.emit('remove-admin-error', 'Solo los administradores principales pueden remover a otros')
      return
    }

    const targetUser = connectedUsers.get(targetSocketId)
    if (!targetUser || targetUser.userType !== 'admin') {
      socket.emit('remove-admin-error', 'Usuario no encontrado o no es administrador')
      return
    }

    // Remove admin privileges
    targetUser.userType = 'worker'
    connectedUsers.set(targetSocketId, targetUser)
    
    // Notify the removed admin
    const targetSocket = io.sockets.sockets.get(targetSocketId)
    if (targetSocket) {
      targetSocket.emit('admin-privileges-removed', 'Se han removido tus privilegios de administrador')
    }
    
    socket.emit('remove-admin-success', 'Administrador removido correctamente')
    broadcastUserList()
    console.log(`Admin ${currentUser.name} removed admin privileges from ${targetUser.name}`)
  })

  // Kick user (worker or admin)
  socket.on('kick-user', (targetSocketId: string) => {
    const currentUser = connectedUsers.get(socket.id)
    if (!currentUser || currentUser.userType !== 'admin') {
      socket.emit('kick-error', 'No autorizado')
      return
    }

    const isSuperAdmin = authConfig.superAdmins.some(sa => sa.name === currentUser.name && sa.lastName === currentUser.lastName)
    if (!isSuperAdmin) {
      socket.emit('kick-error', 'Solo los super administradores pueden expulsar usuarios')
      return
    }

    const targetUser = connectedUsers.get(targetSocketId)
    if (!targetUser) {
      socket.emit('kick-error', 'Usuario no encontrado')
      return
    }

    // Disconnect the user
    const targetSocket = io.sockets.sockets.get(targetSocketId)
    if (targetSocket) {
      targetSocket.emit('admin-privileges-removed', 'Has sido desconectado por un administrador')
      targetSocket.disconnect(true)
    }
    
    connectedUsers.delete(targetSocketId)
    socket.emit('kick-success', 'Usuario desconectado')
    broadcastUserList()
    console.log(`Admin ${currentUser.name} kicked user ${targetUser.name}`)
  })

  socket.on('request-current-data', async () => {
    try {
      const [productsRes, settingsRes] = await Promise.all([
        supabase.from('products').select('*').order('createdAt', { ascending: false }),
        supabase.from('settings').select('*').order('settingKey', { ascending: true })
      ])

      socket.emit('data-update', {
        products: productsRes.data || [],
        settings: settingsRes.data || []
      })
    } catch (error) {
      console.error('Error sending current data:', error)
    }
  })

  // Request user list (admin and workers only)
  socket.on('request-user-list', () => {
    const user = connectedUsers.get(socket.id)
    if (user && (user.userType === 'admin' || user.userType === 'worker')) {
      socket.emit('user-list', Array.from(connectedUsers.values()))
    }
  })

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
    connectedUsers.delete(socket.id)
    broadcastUserList()
  })

  // Update last activity
  socket.on('activity', () => {
    const user = connectedUsers.get(socket.id)
    if (user) {
      user.lastActivity = new Date()
    }
  })
})

// Function to broadcast user list to admins and workers
function broadcastUserList() {
  const recipients = Array.from(connectedUsers.values())
    .filter(user => user.userType === 'admin' || user.userType === 'worker')
  
  const userList = Array.from(connectedUsers.values())
  
  recipients.forEach(recipient => {
    const socket = io.sockets.sockets.get(recipient.socketId)
    if (socket) {
      socket.emit('user-list', userList)
    }
  })
}

// Function to broadcast updates to all connected clients
export function broadcastUpdate(type: string, data: any) {
  console.log(`Broadcasting ${type} update to ${connectedUsers.size} clients`)
  io.emit('data-update', { type, [type]: data })
}

// HTTP endpoint for receiving notifications from API routes
httpServer.on('request', (req, res) => {
  if (req.method === 'POST' && req.url === '/notify') {
    let body = ''
    req.on('data', chunk => {
      body += chunk.toString()
    })
    req.on('end', () => {
      try {
        const { type, data } = JSON.parse(body)
        broadcastUpdate(type, data)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true }))
      } catch (error) {
        console.error('Error processing notification:', error)
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid request' }))
      }
    })
  } else {
    res.writeHead(404)
    res.end()
  }
})

// Start server
httpServer.listen(PORT, () => {
  console.log(`Realtime service running on port ${PORT}`)
})

// Export for potential external use
export { io, connectedUsers }