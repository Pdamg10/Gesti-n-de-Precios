'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

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
  socketId: string // We'll map Supabase presence_ref to this for compatibility
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

// Mock socket interface for backward compatibility
interface MockSocket {
  id: string
  connected: boolean
  emit: (event: string, data?: any) => void
  on: (event: string, cb: any) => void
  off: (event: string, cb?: any) => void
  close: () => void
}

export function useRealtimeData(userType: 'admin' | 'worker' = 'worker', userInfo?: { name?: string, lastName?: string }) {
  const [socket, setSocket] = useState<MockSocket | null>(null)
  const [data, setData] = useState<RealtimeData>({ products: [], settings: [] })
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)

  // Load data function
  const loadDataFromAPI = useCallback(async () => {
    try {
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
      }
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }, [])

  useEffect(() => {
    // Initial data load
    loadDataFromAPI()

    // Create a unique ID for this session to mimic socket.id
    const sessionId = 'user-' + Math.random().toString(36).substring(2, 15)

    // Setup Supabase Channel
    const newChannel = supabase.channel('room1')
      .on('presence', { event: 'sync' }, () => {
        const state = newChannel.presenceState()
        const users: ConnectedUser[] = []
        
        // Transform presence state to ConnectedUser array
        Object.keys(state).forEach(key => {
          state[key].forEach((presence: any) => {
            users.push({
              id: key, // Use presence key as ID
              socketId: presence.socketId || key, // Map socketId
              userType: presence.userType || 'worker',
              name: presence.name,
              lastName: presence.lastName,
              connectedAt: presence.connectedAt || new Date().toISOString(),
              lastActivity: presence.lastActivity || new Date().toISOString()
            })
          })
        })
        
        console.log('Supabase Presence Sync:', users)
        setConnectedUsers(users)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        console.log('Product change detected, reloading...')
        loadDataFromAPI()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => {
        console.log('Settings change detected, reloading...')
        loadDataFromAPI()
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Connected to Supabase Realtime')
          setIsConnected(true)
          
          // Track user presence
          const presenceData = {
            socketId: sessionId,
            userType,
            name: userInfo?.name || 'Anónimo',
            lastName: userInfo?.lastName || '',
            connectedAt: new Date().toISOString(),
            lastActivity: new Date().toISOString()
          }
          newChannel.track(presenceData)
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.log('Disconnected from Supabase Realtime:', status)
          setIsConnected(false)
        }
      })

    setChannel(newChannel)

    // Create Mock Socket for backward compatibility
    const mockSocket: MockSocket = {
      id: sessionId,
      connected: true,
      emit: (event: string, payload?: any) => {
        console.log('Mock Socket Emit:', event, payload)
        if (event === 'identify-user') {
          // Re-track with updated info if needed
          newChannel.track({
            socketId: sessionId,
            userType: payload?.userType || userType,
            name: payload?.name || userInfo?.name,
            lastName: payload?.lastName || userInfo?.lastName,
            connectedAt: new Date().toISOString(),
            lastActivity: new Date().toISOString()
          })
        }
        // 'request-user-list' is handled automatically by presence sync
      },
      on: (event: string, cb: any) => {
        // Implement minimal listeners if needed, mostly no-op as we handle state internally
      },
      off: () => {},
      close: () => {
        supabase.removeChannel(newChannel)
      }
    }
    
    setSocket(mockSocket)

    return () => {
      supabase.removeChannel(newChannel)
      setSocket(null)
    }
  }, []) // Empty dependency array to run once on mount

  // Effect to update presence when user info changes
  useEffect(() => {
    if (channel && isConnected && userInfo) {
       // Update presence track with new info
       const sessionId = socket?.id || 'unknown'
       channel.track({
        socketId: sessionId,
        userType,
        name: userInfo.name,
        lastName: userInfo.lastName,
        connectedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      })
    }
  }, [userType, userInfo?.name, userInfo?.lastName, isConnected, channel])

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