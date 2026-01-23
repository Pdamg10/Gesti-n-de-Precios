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
  userType: 'admin' | 'worker'
  name?: string
  lastName?: string
  connectedAt: string
  lastActivity: string
}

interface RealtimeData {
  products: Product[]
  settings: Setting[]
}

export function useRealtimeData(userType: 'admin' | 'worker' = 'worker', userInfo?: { name?: string, lastName?: string }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [data, setData] = useState<RealtimeData>({ products: [], settings: [] })
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([])
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    let connectionTimeout: NodeJS.Timeout
    let fallbackInterval: NodeJS.Timeout
    let activityInterval: NodeJS.Timeout

    // Function to load data from API (fallback mode)
    const loadDataFromAPI = async (signal?: AbortSignal) => {
      if (signal?.aborted) return

      try {
        // Wrapper to silence AbortErrors at the source
        const safeFetch = async (url: string) => {
          try {
            const res = await fetch(url, { signal })
            return res
          } catch (err: any) {
            if (err.name === 'AbortError' || signal?.aborted) return null
            throw err
          }
        }

        const [productsRes, settingsRes] = await Promise.all([
          safeFetch('/api/products'),
          safeFetch('/api/settings')
        ])
        
        if (signal?.aborted) return
        
        if (productsRes?.ok && settingsRes?.ok) {
          const [products, settings] = await Promise.all([
            productsRes.json(),
            settingsRes.json()
          ])
          
          if (!signal?.aborted) {
            setData({ products, settings })
          }
        }
      } catch (error: any) {
        // Final safety check
        if (signal?.aborted) return

        // Enhanced error suppression
        if (
          error.name === 'AbortError' || 
          error.message?.includes('aborted') || 
          error.name === 'TypeError' ||
          error.message === 'Failed to fetch' ||
          error.message?.includes('net::ERR_ABORTED')
        ) {
          return
        }
        
        console.error('Error loading data from API:', error)
      }
    }

    // Initialize socket connection (only once)
    const newSocket = io('/?XTransformPort=3001', {
      transports: ['websocket', 'polling'],
      timeout: 5000,
      reconnectionAttempts: 3
    })

    const controller = new AbortController()

    // Set a timeout to detect if WebSocket connection fails
    connectionTimeout = setTimeout(() => {
      if (!newSocket.connected) {
        console.warn('WebSocket connection failed, switching to fallback mode')
        loadDataFromAPI(controller.signal)
        
        // Poll for updates every 10 seconds in fallback mode
        fallbackInterval = setInterval(() => loadDataFromAPI(controller.signal), 10000)
      }
    }, 5000)

    newSocket.on('connect', () => {
      console.log('Connected to realtime service')
      setIsConnected(true)
      clearTimeout(connectionTimeout)
      clearInterval(fallbackInterval)
      
      // Request current data when connected
      newSocket.emit('request-current-data')
    })

    newSocket.on('disconnect', () => {
      console.log('Disconnected from realtime service')
      setIsConnected(false)
      // Do NOT clear users on disconnect to avoid flashing
      
      // Switch to fallback mode on disconnect
      loadDataFromAPI(controller.signal)
      fallbackInterval = setInterval(() => loadDataFromAPI(controller.signal), 10000)
    })

    newSocket.on('connect_error', (error) => {
      console.warn('WebSocket connection error:', error.message)
    })

    newSocket.on('data-update', (newData: RealtimeData) => {
      console.log('Received real-time update:', newData)
      setData(prevData => ({
        ...prevData,
        ...newData
      }))
    })

    newSocket.on('user-list', (users: ConnectedUser[]) => {
      console.log('Received user list:', users)
      setConnectedUsers(users)
    })

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

    // Load initial data from API immediately
    loadDataFromAPI(controller.signal)

    return () => {
      controller.abort()
      clearTimeout(connectionTimeout)
      clearInterval(fallbackInterval)
      clearInterval(activityInterval)
      newSocket.close()
    }
  }, []) // Empty dependency array = create socket ONLY ONCE

  // Separate effect to handle user identification when props change
  useEffect(() => {
    if (!socket || !socket.connected) return

    // Identify user for ALL user types (worker, admin)
    // This ensures the backend knows the name/lastname of the connected socket
    // enabling them to appear in the "Connected Users" list immediately.
    socket.emit('identify-user', { 
      userType,
      name: userInfo?.name,
      lastName: userInfo?.lastName
    })

    // If we are privileged users, we also want to fetch the list to see others
    if (userType === 'admin' || userType === 'worker') {
      socket.emit('request-user-list')
    }

  }, [socket, userType, userInfo?.name, userInfo?.lastName, isConnected])

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