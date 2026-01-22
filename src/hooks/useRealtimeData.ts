'use client'

import { useEffect, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

interface Product {
  id: string
  productType: string
  type: string
  medida: string
  precioListaBs: number
  precioListaUsd: number
  adjustmentCashea?: number
  adjustmentTransferencia?: number
  adjustmentDivisas?: number
  adjustmentCustom?: number
  createdAt: string
  updatedAt: string
}

interface Setting {
  id: string
  settingKey: string
  settingValue?: string
  taxRate?: number
  globalCashea?: number
  globalTransferencia?: number
  globalDivisas?: number
  globalCustom?: number
  createdAt: string
  updatedAt: string
}

export interface ConnectedUser {
  id: string
  socketId: string
  userType: 'admin' | 'client' | 'worker'
  name?: string
  lastName?: string
  connectedAt: string
  lastActivity: string
}

interface RealtimeData {
  products: Product[]
  settings: Setting[]
}

export function useRealtimeData(userType: 'admin' | 'client' | 'worker' = 'client', userInfo?: { name?: string, lastName?: string }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [data, setData] = useState<RealtimeData>({ products: [], settings: [] })
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([])
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    let connectionTimeout: NodeJS.Timeout
    let fallbackInterval: NodeJS.Timeout
    let activityInterval: NodeJS.Timeout

    // Function to load data from API (fallback mode)
    const loadDataFromAPI = async () => {
      try {
        console.log('Loading data from API (fallback mode)...')
        const [productsRes, settingsRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/settings')
        ])
        
        if (productsRes.ok && settingsRes.ok) {
          const [products, settings] = await Promise.all([
            productsRes.json(),
            settingsRes.json()
          ])
          
          setData({ products, settings })
          console.log('Data loaded from API successfully')
        }
      } catch (error) {
        console.error('Error loading data from API:', error)
      }
    }

    // Try to connect to WebSocket service
    const newSocket = io('/?XTransformPort=3001', {
      transports: ['websocket', 'polling'],
      timeout: 5000,
      reconnectionAttempts: 3
    })

    // Set a timeout to detect if WebSocket connection fails
    connectionTimeout = setTimeout(() => {
      if (!newSocket.connected) {
        console.warn('WebSocket connection failed, switching to fallback mode')
        loadDataFromAPI()
        
        // Poll for updates every 10 seconds in fallback mode
        fallbackInterval = setInterval(loadDataFromAPI, 10000)
      }
    }, 5000)

    newSocket.on('connect', () => {
      console.log('Connected to realtime service')
      setIsConnected(true)
      clearTimeout(connectionTimeout)
      clearInterval(fallbackInterval)
      
      // Identify user
      newSocket.emit('identify-user', { 
        userType,
        name: userInfo?.name,
        lastName: userInfo?.lastName
      })
      
      // Request current data when connected
      newSocket.emit('request-current-data')
      
      // Request user list if admin or worker
      if (userType === 'admin' || userType === 'worker') {
        newSocket.emit('request-user-list')
      }
    })

    newSocket.on('disconnect', () => {
      console.log('Disconnected from realtime service')
      setIsConnected(false)
      
      // Switch to fallback mode on disconnect
      loadDataFromAPI()
      fallbackInterval = setInterval(loadDataFromAPI, 10000)
    })

    newSocket.on('connect_error', (error) => {
      console.warn('WebSocket connection error:', error.message)
      // Fallback will be triggered by connectionTimeout
    })

    newSocket.on('data-update', (newData: RealtimeData) => {
      console.log('Received real-time update:', newData)
      setData(prevData => ({
        ...prevData,
        ...newData
      }))
    })

    // Listen for user list updates (admin and workers)
    if (userType === 'admin' || userType === 'worker') {
      newSocket.on('user-list', (users: ConnectedUser[]) => {
        console.log('Received user list:', users)
        setConnectedUsers(users)
      })
    }

    // Send activity updates
    activityInterval = setInterval(() => {
      if (newSocket.connected) {
        newSocket.emit('activity')
      }
    }, 30000) // Every 30 seconds

    newSocket.on('admin-privileges-removed', (message: string) => {
      alert(message)
      window.location.reload() // Force reload to reset application state
    })

    setSocket(newSocket)

    // Load initial data from API immediately (don't wait for WebSocket)
    loadDataFromAPI()

    return () => {
      clearTimeout(connectionTimeout)
      clearInterval(fallbackInterval)
      clearInterval(activityInterval)
      newSocket.close()
    }
  }, [userType, userInfo?.name, userInfo?.lastName])

  const updateData = useCallback((type: 'products' | 'settings', newData: any) => {
    setData(prevData => ({
      ...prevData,
      [type]: newData
    }))
  }, [])

  return {
    socket,
    data,
    connectedUsers,
    isConnected,
    updateData
  }
}