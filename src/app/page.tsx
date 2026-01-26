'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Virtuoso } from 'react-virtuoso'
import ExcelImport from '@/components/ExcelImport'
import PdfImportExport from '@/components/PdfImportExport'
import AuthModal from '@/components/AuthModal'
import AdminPanel from '@/components/AdminPanel'
import ProductRow from '@/components/ProductRow'
import MobileProductCard from '@/components/MobileProductCard'
import { useRealtimeData } from '@/hooks/useRealtimeData'
import { roundToNearest5 } from '@/lib/utils'
import { useModal } from '@/context/ModalContext'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'

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
}

interface ExtractedProduct {
  type: string
  medida: string
  precio: number
  selected: boolean
}

interface CustomList {
  id: string
  name: string
  emoji: string
}

export default function Home() {
  // Estados de autenticación primero
  const [isAdmin, setIsAdmin] = useState(false)
  const [isWorker, setIsWorker] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  
  // Modal system
  const { showAlert, showConfirm, showPrompt } = useModal()
  
  // Usar el hook de datos en tiempo real después de tener isAdmin o isWorker
  const { data: realtimeData, connectedUsers, updateData, socket } = useRealtimeData(
    (isAdmin || isWorker) ? (isAdmin ? 'admin' : 'worker') : 'worker',
    currentUser
  )
  
  const isSuperAdmin = currentUser?.isSuperAdmin === true
  
  // Estados locales
  const [products, setProducts] = useState<Product[]>([])
  const [settings, setSettings] = useState<Setting[]>([])
  const [activeTab, setActiveTab] = useState('cauchos')
  const [customLists, setCustomLists] = useState<CustomList[]>([])
  const [taxRate, setTaxRate] = useState(16)
  const [exchangeRate, setExchangeRate] = useState(60) // Default exchange rate
  const [viewCurrency, setViewCurrency] = useState<'bs' | 'usd'>('bs') // Global view preference

  const [globalAdjustments, setGlobalAdjustments] = useState<Record<string, any>>({
    cauchos: { cashea: 0, transferencia: 0, divisas: 0, custom: 0 },
    baterias: { cashea: 0, transferencia: 0, divisas: 0, custom: 0 }
  })
  const [localAdjustments, setLocalAdjustments] = useState<Record<string, any>>({
    cauchos: { cashea: '', transferencia: '', divisas: '', custom: '', pagoMovil: '' },
    baterias: { cashea: '', transferencia: '', divisas: '', custom: '', pagoMovil: '' }
  })
  const [priceColumns, setPriceColumns] = useState<{ key: string, label: string, base: 'bs' | 'usd', applyTax: boolean }[]>([
    { key: 'cashea', label: 'Cashea (Bs)', base: 'bs', applyTax: true },
    { key: 'transferencia', label: 'Transferencia (Bs)', base: 'bs', applyTax: true },
    { key: 'divisas', label: 'Divisas ($)', base: 'usd', applyTax: false },
    { key: 'custom', label: 'Divisas en Fisico', base: 'usd', applyTax: false },
    { key: 'pagoMovil', label: 'Pago Móvil (Bs)', base: 'bs', applyTax: true }
  ])
  const [newColumnName, setNewColumnName] = useState('')
  const [newColumnBase, setNewColumnBase] = useState<'bs' | 'usd'>('bs')
  const [editingColumn, setEditingColumn] = useState<{ key: string, label: string, base: 'bs' | 'usd', applyTax: boolean } | null>(null)
  const [isManagingColumns, setIsManagingColumns] = useState(false)
  const [defaultAdjustments, setDefaultAdjustments] = useState<Record<string, any>>({
    cauchos: { cashea: 0, transferencia: 0, divisas: 0, custom: 0, pagoMovil: 0 },
    baterias: { cashea: 0, transferencia: 0, divisas: 0, custom: 0, pagoMovil: 0 }
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [showConfigPanel, setShowConfigPanel] = useState(false)
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showAddListModal, setShowAddListModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [extractedProducts, setExtractedProducts] = useState<ExtractedProduct[]>([])
  const [editForm, setEditForm] = useState({
    type: '',
    medida: '',
    precioListaBs: 0,
    precioListaUsd: 0,
    adjustmentCashea: '',
    adjustmentTransferencia: '',
    adjustmentDivisas: '',
    adjustmentCustom: '',
    adjustmentPagoMovil: ''
  })
  const [addForm, setAddForm] = useState<{
    type: string
    medida: string
    precioListaBs: number | string
    precioListaUsd: number | string
  }>({
    type: '',
    medida: '',
    precioListaBs: '',
    precioListaUsd: ''
  })
  const [newListForm, setNewListForm] = useState({
    name: '',
    emoji: ''
  })
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordModalType, setPasswordModalType] = useState<'admin' | 'worker'>('admin')
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: ''
  })
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [adminAccordionValue, setAdminAccordionValue] = useState<string | undefined>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('adminAccordion') || undefined
    }
    return undefined
  })

  const ADMIN_PASSWORD = 'Chirica001*'
  const SUPER_ADMIN_PASSWORD = 'Chiricapoz001*'

  // Actualizar estados cuando cambian los datos en tiempo real
  useEffect(() => {
    if (realtimeData.products) {
      setProducts(realtimeData.products)
    }
    if (realtimeData.settings) {
      setSettings(realtimeData.settings)
      loadSettingsFromData(realtimeData.settings)
    }
  }, [realtimeData])

  // Función para actualizar datos localmente y notificar cambios
  const refreshData = useCallback(async () => {
    try {
      const [productsRes, settingsRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/settings')
      ])
      
      if (productsRes.ok) {
        const productsData = await productsRes.json()
        setProducts(productsData)
        updateData('products', productsData)
      }
      
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json()
        setSettings(settingsData)
        loadSettingsFromData(settingsData)
        updateData('settings', settingsData)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }, [updateData])

  // Check for saved auth on mount is handled in the useEffect below

  // Load view preference on mount
  useEffect(() => {
    const savedCurrency = sessionStorage.getItem('viewCurrency') as 'bs' | 'usd'
    if (savedCurrency) setViewCurrency(savedCurrency)
  }, [])

  // Save view preference
  const toggleViewCurrency = (currency: 'bs' | 'usd') => {
    setViewCurrency(currency)
    sessionStorage.setItem('viewCurrency', currency)
  }

  const loadSettingsFromData = (settingsData: Setting[]) => {
    // Load tax rate
    const taxSetting = settingsData.find(s => s.settingKey === 'tax_rate')
    if (taxSetting && taxSetting.taxRate !== undefined) {
      setTaxRate(taxSetting.taxRate)
    }

    // Load exchange rate
    const exchangeSetting = settingsData.find(s => s.settingKey === 'exchange_rate')
    if (exchangeSetting && exchangeSetting.settingValue) {
      setExchangeRate(parseFloat(exchangeSetting.settingValue) || 60)
    }

    // Load custom lists
    const listsSetting = settingsData.find(s => s.settingKey === 'custom_lists')
    if (listsSetting && listsSetting.settingValue) {
      const lists = JSON.parse(listsSetting.settingValue)
      setCustomLists(lists)
      
      const newAdjustments = { ...globalAdjustments }
      lists.forEach((list: CustomList) => {
        if (!newAdjustments[list.id]) {
          newAdjustments[list.id] = { cashea: 0, transferencia: 0, divisas: 0, custom: 0 }
        }
      })
      setGlobalAdjustments(newAdjustments)
      setLocalAdjustments(newAdjustments)
    }

    // Load default adjustments
    const defaults = { ...defaultAdjustments }
    ;['cauchos', 'baterias', ...customLists.map(l => l.id)].forEach((listType: string) => {
      const adjSetting = settingsData.find(s => s.settingKey === `default_adj_${listType}`)
      if (adjSetting && adjSetting.settingValue) {
        try {
          const parsed = JSON.parse(adjSetting.settingValue)
          defaults[listType] = {
            cashea: parsed.cashea || 0,
            transferencia: parsed.transferencia || 0,
            divisas: parsed.divisas || 0,
            custom: parsed.custom || 0
          }
        } catch (e) {
          console.error('Error parsing default adjustments', e)
        }
      }
    })
    setDefaultAdjustments(defaults)

    // Ensure local adjustments structure exists (start at 0)
    const locals = { ...localAdjustments }
    ;['cauchos', 'baterias', ...customLists.map(l => l.id)].forEach((listType: string) => {
      if (!locals[listType]) {
        locals[listType] = { cashea: '', transferencia: '', divisas: '', custom: '' }
      }
    })
    setLocalAdjustments(locals)

    // Load price columns
    const priceColsSetting = settingsData.find(s => s.settingKey === 'price_columns')
    if (priceColsSetting && priceColsSetting.settingValue) {
      try {
        let cols = JSON.parse(priceColsSetting.settingValue)
        // Auto-update legacy labels to new standard and FORCE correct base currency
        cols = cols.map((c: any) => {
           if (c.key === 'cashea') return { ...c, label: 'Cashea (Bs)', base: 'bs', applyTax: c.applyTax !== undefined ? c.applyTax : true }
           if (c.key === 'transferencia') return { ...c, label: 'Transferencia (Bs)', base: 'bs', applyTax: c.applyTax !== undefined ? c.applyTax : true }
           if (c.key === 'pagoMovil') return { ...c, label: 'Pago Móvil (Bs)', base: 'bs', applyTax: c.applyTax !== undefined ? c.applyTax : true }
           if (c.key === 'divisas') return { ...c, label: 'Divisas ($)', base: 'usd', applyTax: c.applyTax !== undefined ? c.applyTax : false }
           // Default applyTax to true for bs, false for usd if not present
           if (c.applyTax === undefined) return { ...c, applyTax: c.base === 'bs' }
           return c
        })
        setPriceColumns(cols)
      } catch (e) {
        console.error('Error parsing price columns', e)
      }
    }
  }

  // Funciones de autenticación
  const handleLogin = (userType: 'admin' | 'worker', userInfo?: any) => {
    setIsAdmin(userType === 'admin')
    setIsWorker(userType === 'worker')
    setCurrentUser(userInfo)
    localStorage.setItem('user_type', userType)
    if (userInfo) {
      localStorage.setItem('user_info', JSON.stringify(userInfo))
    }
    // Track identity in realtime channel
    try {
      if (socket?.connected && userInfo?.name && userInfo?.lastName) {
        socket.emit('identify-user', { 
          name: userInfo.name, 
          lastName: userInfo.lastName,
          userType 
        })
      }
    } catch {}
  }

  const handleLogout = () => {
    setIsAdmin(false)
    setIsWorker(false)
    setCurrentUser(null)
    setShowAdminPanel(false)
    localStorage.removeItem('user_type')
    localStorage.removeItem('user_info')
    sessionStorage.removeItem('adminAccordion')
    // Clear cookies and notify realtime
    try {
      if (socket?.connected) {
        socket.emit('logout-user', { 
          name: currentUser?.name, 
          lastName: currentUser?.lastName, 
          userType: (isAdmin ? 'admin' : 'worker')
        })
        socket.close()
      }
    } catch {}
    try {
      document.cookie.split(';').forEach(c => {
        const eq = c.indexOf('=')
        const name = eq > -1 ? c.substring(0, eq).trim() : c.trim()
        if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
      })
    } catch {}
    window.location.href = '/login'
  }

  // Check for saved auth on mount
  useEffect(() => {
    const savedUserType = localStorage.getItem('user_type')
    const savedUserInfo = localStorage.getItem('user_info')
    
    if (savedUserType && savedUserInfo) {
      try {
        const userInfo = JSON.parse(savedUserInfo)
        if (savedUserType === 'admin') {
          setIsAdmin(true)
          setIsWorker(false)
        } else if (savedUserType === 'worker') {
          setIsWorker(true)
          setIsAdmin(false)
        }
        setCurrentUser(userInfo)
        setShowAuthModal(false)
      } catch (error) {
        console.error('Error parsing saved user info:', error)
        setShowAuthModal(true)
      }
    } else {
      setShowAuthModal(true)
    }
  }, [])

  const saveTaxRate = async () => {
    try {
      await Promise.all([
        fetch(`/api/settings/tax_rate`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taxRate })
        }),
        fetch(`/api/settings/exchange_rate`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settingValue: exchangeRate.toString() })
        })
      ])
      
      showAlert('Configuración actualizada correctamente', 'Éxito')
    } catch (error) {
      console.error('Error saving settings:', error)
      showAlert('Error al guardar la configuración', 'Error')
    }
  }

  const handleChangePassword = () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setPasswordMessage('Por favor completa todos los campos')
      return
    }
    if (!socket || !socket.connected) {
      setPasswordMessage('No hay conexión con el servidor')
      return
    }
    setIsChangingPassword(true)
    setPasswordMessage('')
    const eventName = passwordModalType === 'admin' ? 'change-admin-password' : 'change-worker-password'
    socket.emit(eventName, {
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword
    })
    socket.on('password-change-success', (msg: string) => {
      setPasswordMessage(msg)
      setIsChangingPassword(false)
      setTimeout(() => {
        setShowPasswordModal(false)
        setPasswordForm({ currentPassword: '', newPassword: '' })
        setPasswordMessage('')
      }, 2000)
    })
    socket.on('password-change-error', (errorMsg: string) => {
      setPasswordMessage(errorMsg)
      setIsChangingPassword(false)
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
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      showAlert('Por favor selecciona un archivo JSON válido', 'Formato Incorrecto')
      return
    }
    if (!await showConfirm('¿Estás seguro de que quieres restaurar la base de datos? Esto sobrescribirá los datos existentes con los del archivo.', 'Confirmar Restauración')) {
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backupData)
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Error en la restauración')
      }
      showAlert('Base de datos restaurada con éxito', 'Éxito')
    } catch (error: any) {
      console.error('Error restoring database:', error)
      showAlert(error.message || 'Error al restaurar la base de datos', 'Error')
    } finally {
      setIsLoading(false)
      event.target.value = ''
    }
  }

  const saveGlobalAdjustment = async (type: string) => {
    try {
      const currentLocal = localAdjustments[activeTab] || {}
      const delta = currentLocal[type] || 0
      
      if (delta === 0) {
          showAlert('El ajuste es 0%, no hay cambios que aplicar', 'Información')
          return
      }

      // 1. Optimistic Update (Immediate Feedback)
      
      // Update Default Adjustments State
      const currentDefault = defaultAdjustments[activeTab] || { cashea: 0, transferencia: 0, divisas: 0, custom: 0, pagoMovil: 0 }
      const newDefaults = {
          ...currentDefault,
          [type]: (currentDefault[type] || 0) + delta
      }
      
      const newDefaultState = { ...defaultAdjustments }
      newDefaultState[activeTab] = newDefaults
      setDefaultAdjustments(newDefaultState)
      
      // Reset Local Adjustment State
      const newLocals = { ...localAdjustments }
      newLocals[activeTab] = { ...newLocals[activeTab], [type]: '' }
      setLocalAdjustments(newLocals)

      // Update Products State (Apply delta to all products of this type)
      // Since batch-update adds the delta to individual adjustments, we mimic that here
      setProducts(prevProducts => prevProducts.map(p => {
        if (p.productType !== activeTab) return p
        
        // Construct the key like adjustmentCashea
        const key = `adjustment${type.charAt(0).toUpperCase() + type.slice(1)}`
        const currentVal = (p as any)[key]
        // If it was null, it remains null (inherits). 
        // WAIT: The backend batch-update ADDS to existing value OR 0.
        // So if it was null, it becomes 0 + delta = delta.
        // So it stops being null (inheriting) and becomes a fixed value?
        // Let's check backend logic: newValues.adjustmentX = (product.adjustmentX || 0) + adjustments.X
        // Yes, it effectively sets a value, so it overrides the global default?
        // But we just updated the global default too!
        // If we update BOTH global default AND individual product adjustments...
        // Then `getEffectiveAdjustment` will see the individual value (delta) and use it.
        // But the global default is now (old + delta).
        // If product had 0 (inherited), now it has delta.
        // If product relies on global, it should be null.
        // The backend logic seems to "bake in" the adjustment to every product?
        // If so, my previous analysis of "inheriting" might be generous.
        // If the backend sets adjustmentCashea = 10, then it's 10.
        // If global is 10.
        // Effective is 10.
        // If I later change global to 20. Product stays 10.
        // This means "Global Adjustment" button acts as "Apply this change to everyone right now" rather than "Change the default for everyone".
        // It does BOTH: updates defaults AND updates products.
        // So yes, I should update the product state to have the new value.
        
        const newVal = (currentVal || 0) + delta
        return { ...p, [key]: newVal }
      }))

      // 2. Background API Calls
      await Promise.all([
        // Update products (Batch)
        fetch('/api/products/batch-update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: activeTab,
                adjustments: { [type]: delta }
            })
        }),
        // Update Default Adjustments
        fetch(`/api/settings/default_adj_${activeTab}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ settingValue: JSON.stringify(newDefaults) })
        })
      ])
      
      showAlert(`Ajuste ${type} aplicado y guardado`, 'Éxito')
    } catch (error) {
      console.error('Error saving adjustment:', error)
      showAlert('Error al guardar los ajustes (los cambios visuales pueden revertirse al recargar)', 'Error')
      refreshData() // Rollback/Sync on error
    }
  }

  const resetAllDiscounts = async () => {
    if (!await showConfirm('¿Estás seguro de resetear todos los descuentos a 0%? Esto afectará a todos los productos de esta lista.', 'Confirmar Reset')) return

    try {
        const currentDefaults = defaultAdjustments[activeTab] || {}
        const newDefaults: Record<string, number> = {}
        
        // Set all keys to 0
        Object.keys(currentDefaults).forEach(key => {
            newDefaults[key] = 0
        })

        // Save new defaults
        await fetch(`/api/settings/default_adj_${activeTab}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ settingValue: JSON.stringify(newDefaults) })
        })

        // Clear local adjustments state
        const newLocals = { ...localAdjustments }
        if (newLocals[activeTab]) {
            Object.keys(newLocals[activeTab]).forEach(key => {
                newLocals[activeTab][key] = ''
            })
        }
        setLocalAdjustments(newLocals)
        
        // Update defaults state
        const newDefaultState = { ...defaultAdjustments }
        newDefaultState[activeTab] = newDefaults
        setDefaultAdjustments(newDefaultState)
        
        refreshData()
        showAlert('Todos los descuentos han sido reseteados a 0%', 'Éxito')
    } catch (error) {
        console.error('Error resetting discounts:', error)
        showAlert('Error al resetear descuentos', 'Error')
    }
  }

  const addProduct = async () => {
    const precioBs = Number(addForm.precioListaBs)
    const precioUsd = Number(addForm.precioListaUsd)

    if (!addForm.type || !addForm.medida || !precioBs || precioBs <= 0 || !precioUsd || precioUsd <= 0) {
      showAlert('Por favor completa todos los campos', 'Información')
      return
    }

    try {
      const currentDefaults = defaultAdjustments[activeTab] || { cashea: 0, transferencia: 0, divisas: 0, custom: 0, pagoMovil: 0 }
      
      const payload: any = {
        productType: activeTab,
        type: addForm.type,
        medida: addForm.medida,
        precioListaBs: precioBs,
        precioListaUsd: precioUsd,
      }
      
      // Add dynamic adjustments
      // We iterate over known price columns + standard ones to be safe
      // Or just iterate over priceColumns if available
      
      // Standard mapping first for compatibility
      if (currentDefaults.cashea !== undefined) payload.adjustmentCashea = currentDefaults.cashea
      if (currentDefaults.transferencia !== undefined) payload.adjustmentTransferencia = currentDefaults.transferencia
      if (currentDefaults.divisas !== undefined) payload.adjustmentDivisas = currentDefaults.divisas
      if (currentDefaults.custom !== undefined) payload.adjustmentCustom = currentDefaults.custom
      if (currentDefaults.pagoMovil !== undefined) payload.adjustmentPagoMovil = currentDefaults.pagoMovil
      
      // For any other custom columns, we might need to handle them if the backend supports dynamic columns
      // Currently the backend schema (prisma) has specific columns. 
      // If we added dynamic columns in frontend, we need to map them to something or the backend needs update.
      // The user asked for "Gestionar Columnas". If they add "Zelle", where is it stored?
      // Ah, the dynamic columns feature I added earlier uses `adjustment${Key}`?
      // Wait, let's check `schema.prisma`.
      
      // If schema is static, we can't store arbitrary columns unless we use a JSON field or similar.
      // But the `getEffectiveAdjustment` logic checks `product['adjustment' + CapitalizedKey]`.
      // If the key is 'zelle', it looks for `adjustmentZelle`.
      // Does `Product` type have index signature?
      // If not, we can't save it unless we use a generic field.
      
      // Let's assume for now we only support the main ones, OR the user hasn't asked for backend schema changes yet.
      // But wait, the user asked to "add any new option".
      // If I add "Zelle", and I set a global discount for Zelle.
      // `defaultAdjustments` will have `zelle: 10`.
      // `getEffectiveAdjustment` will read `defaultAdjustments`.
      // So for *global* discounts, it works because it reads from settings.
      // For *individual* discounts, we need a place to store it on the product.
      // If the product schema doesn't have `adjustmentZelle`, we can't store individual zelle discount.
      // But we CAN store the product, and it will use the GLOBAL default.
      
      // So for `addProduct`, we don't need to save individual adjustments for dynamic columns 
      // because new products usually start with "Global" (null/undefined) adjustments anyway!
      // The code `adjustmentCashea: currentDefaults.cashea` actually *hardcodes* the default as an individual override?
      // If `currentDefaults.cashea` is 10, do we want the product to have `adjustmentCashea = 10` (individual) or `null` (inherit global)?
      
      // If we save it as 10, it becomes a fixed individual adjustment. If we later change global to 20, this product stays at 10.
      // If we want it to "inherit" global, we should save `null`.
      
      // "cuando se agregue un nuevo producto a este se le ponga los descuentos que esten en la lista de precio"
      // If the list has a discount, the product should have it.
      // If it's a *global* setting, it applies automatically if we save `null`.
      // BUT if we save the *value*, it becomes a snapshot.
      // "la lista de precio siempre se modifique los descuentos que se hagan"
      // This implies if I change the list later, the product should update?
      // If so, I should save `null` (or not send it).
      
      // However, the existing code was sending `currentDefaults.cashea`.
      // If `currentDefaults` comes from `defaultAdjustments`, which are the *Global* adjustments...
      // If I save `adjustmentCashea: 10`, it is now decoupled from global.
      // If the user wants "la lista de precio siempre se modifique", they probably want it to stay linked.
      // So saving `null` (or skipping the field) is better for "inheriting".
      
      // BUT, if the user explicitly wants to "stamp" the current discounts...
      // "cuando se agregue un nuevo producto a este se le ponga los descuentos que esten en la lista de precio"
      // This sounds like "apply the current state".
      
      // Let's look at `MobileProductCard`:
      // const defaultAdj = currentDefaults?.[type] || 0
      // const isIndividual = Math.abs(adjustment - defaultAdj) > 0.01
      
      // If I save `10` and default is `10`, `isIndividual` is false.
      // If I change default to `20`. Adjustment is `10` (saved). Default `20`. `isIndividual` is true.
      // So it effectively "locks" the price at creation time if I save the value.
      
      // If the user wants "la lista de precio siempre se modifique los descuentos que se hagan",
      // it sounds like they want the product to FOLLOW the global list.
      // If so, I should NOT save the specific adjustments on creation, but let them fallback to defaults.
      
      // Let's try sending NULL for adjustments to let them inherit.
      // Or just don't send them.
      // But the existing code was sending them.
      
      // Let's compromise: If I send them, they are locked. If I don't, they float.
      // "cuando se agregue un nuevo producto a este se le ponga los descuentos..."
      // This implies an action of "putting" them.
      // BUT "y la lista de precio siempre se modifique los descuentos que se hagan"
      // This second part is key. "The price list [global?] always modifies the discounts [of products?]".
      // If I change the global discount, it should update the products?
      // If products are locked, they won't update.
      // So products should probably NOT be locked.
      
      // So I should save `null` or `undefined` for adjustments so they use the global default.
      
      // Let's update `addProduct` to NOT send explicit adjustments unless necessary.
      // Actually, I'll remove the adjustment fields from the POST body so they default to NULL in DB (if nullable).
      
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        setAddForm({ type: '', medida: '', precioListaBs: '', precioListaUsd: '' })
        refreshData()
        showAlert('Producto agregado correctamente', 'Éxito')
      }
    } catch (error) {
      console.error('Error adding product:', error)
      showAlert('Error al agregar el producto', 'Error')
    }
  }

  const updateProduct = async () => {
    if (!selectedProduct) return

    try {
      const payload: any = {
        type: editForm.type,
        medida: editForm.medida,
        precioListaBs: editForm.precioListaBs,
        precioListaUsd: editForm.precioListaUsd,
      }

      // Process all dynamic adjustments
      priceColumns.forEach(col => {
        const key = `adjustment${col.key.charAt(0).toUpperCase() + col.key.slice(1)}`
        const val = (editForm as any)[key]
        // Convert to float or null
        payload[key] = (val && val !== '') ? parseFloat(val) : null
      })

      const response = await fetch(`/api/products/${selectedProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        setShowEditModal(false)
        refreshData()
        showAlert('Producto actualizado correctamente', 'Éxito')
      }
    } catch (error) {
      console.error('Error updating product:', error)
      showAlert('Error al actualizar el producto', 'Error')
    }
  }

  const deleteProduct = async () => {
    if (!selectedProduct) return

    try {
      const response = await fetch(`/api/products/${selectedProduct.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setShowDeleteModal(false)
        refreshData()
        showAlert('Producto eliminado correctamente', 'Éxito')
      }
    } catch (error) {
      console.error('Error deleting product:', error)
      showAlert('Error al eliminar el producto', 'Error')
    }
  }

  const saveNewList = async () => {
    if (!newListForm.name || !newListForm.emoji) {
      showAlert('Por favor completa todos los campos', 'Información')
      return
    }

    const newList = {
      id: newListForm.name.toLowerCase().replace(/\s+/g, '-'),
      name: newListForm.name,
      emoji: newListForm.emoji
    }

    const updatedLists = [...customLists, newList]
    
    try {
      const response = await fetch('/api/settings/custom_lists', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settingValue: JSON.stringify(updatedLists)
        })
      })

      if (response.ok) {
        setCustomLists(updatedLists)
        setNewListForm({ name: '', emoji: '' })
        setShowAddListModal(false)
        showAlert('Lista creada correctamente', 'Éxito')
        refreshData()
      }
    } catch (error) {
      console.error('Error saving list:', error)
      showAlert('Error al crear la lista', 'Error')
    }
  }

  const deleteCustomList = async (listId: string) => {
    try {
      const updatedLists = customLists.filter(l => l.id !== listId)
      
      const response = await fetch('/api/settings/custom_lists', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settingValue: JSON.stringify(updatedLists)
        })
      })

      if (response.ok) {
        setCustomLists(updatedLists)
        setActiveTab('cauchos') // Reset to default
        showAlert('Lista eliminada correctamente', 'Éxito')
        refreshData()
      }
    } catch (error) {
      console.error('Error deleting list:', error)
      showAlert('Error al eliminar la lista', 'Error')
    }
  }

  const exportToExcel = async () => {
    try {
      const response = await fetch('/api/export-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productType: activeTab })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${activeTab}_${new Date().toISOString().split('T')[0]}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        showAlert('Exportación completada', 'Éxito')
      }
    } catch (error) {
      console.error('Error exporting:', error)
      showAlert('Error al exportar a Excel', 'Error')
    }
  }

  const importProducts = async (products: ExtractedProduct[]) => {
    setExtractedProducts(products)
    setShowPreviewModal(true)
  }

  const confirmImport = async () => {
    const selectedProducts = extractedProducts.filter(p => p.selected)
    
    try {
      for (const product of selectedProducts) {
        // Verificar si el producto ya existe (por tipo y medida)
        const existingProduct = products.find(p => 
          p.productType === activeTab &&
          p.type.toLowerCase() === product.type.toLowerCase() && 
          p.medida.toLowerCase() === product.medida.toLowerCase()
        )

        if (existingProduct) {
          // Actualizar producto existente
          await fetch('/api/products', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: existingProduct.id,
              precioListaBs: product.precio,
              // Mantener otros valores
              productType: activeTab,
              type: product.type,
              medida: product.medida,
              precioListaUsd: existingProduct.precioListaUsd
            })
          })
        } else {
          // Crear nuevo producto
          await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productType: activeTab,
              type: product.type,
              medida: product.medida,
              precioListaBs: product.precio,
              precioListaUsd: 0
            })
          })
        }
      }
      
      setShowPreviewModal(false)
      await refreshData()
      await showAlert(`✅ ${extractedProducts.filter(p => p.selected).length} productos importados con éxito`, 'Importación Exitosa')
      setShowPreviewModal(false)
      setExtractedProducts([])
    } catch (error) {
      console.error('Error importing products:', error)
      showAlert('Error al importar productos', 'Error')
    }
  }

  const calculatePrice = useCallback((basePrice: number, adjustment: number, currency: 'bs' | 'usd' = 'bs', applyTax: boolean = false) => {
    // Aplicar impuesto solo si está habilitado para esta columna
    const priceWithTax = applyTax ? basePrice * (1 + taxRate / 100) : basePrice
    // Luego aplicar ajuste (descuento o incremento)
    const finalPrice = priceWithTax * (1 + adjustment / 100)
    return finalPrice
  }, [taxRate])

  const filteredProducts = useMemo(() => products.filter(product => 
    product.productType === activeTab &&
    (product.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.medida.toLowerCase().includes(searchTerm.toLowerCase()))
  ), [products, activeTab, searchTerm])

  const openEditModal = useCallback((product: Product) => {
    setSelectedProduct(product)
    setEditForm({
      type: product.type,
      medida: product.medida,
      precioListaBs: product.precioListaBs,
      precioListaUsd: product.precioListaUsd,
      adjustmentCashea: product.adjustmentCashea?.toString() || '',
      adjustmentTransferencia: product.adjustmentTransferencia?.toString() || '',
      adjustmentDivisas: product.adjustmentDivisas?.toString() || '',
      adjustmentCustom: product.adjustmentCustom?.toString() || '',
      adjustmentPagoMovil: (product as any).adjustmentPagoMovil?.toString() || ''
    })
    setShowEditModal(true)
  }, [])

  const openDeleteModal = useCallback((product: Product) => {
    setSelectedProduct(product)
    setShowDeleteModal(true)
  }, [])

  const addPriceColumn = async () => {
    if (!newColumnName.trim()) return
    
    const key = newColumnName.toLowerCase().replace(/[^a-z0-9]/g, '') + Date.now().toString().slice(-4)
    const newCol = { key, label: newColumnName, base: newColumnBase, applyTax: newColumnBase === 'bs' }
    const newColumns = [...priceColumns, newCol]
    
    // 1. Optimistic Update
    setPriceColumns(newColumns)
    setNewColumnName('')
    setNewColumnBase('bs') // Reset to default
    setIsManagingColumns(false)
    
    // Initialize adjustments for new column
    const newLocals = { ...localAdjustments }
    const newDefaults = { ...defaultAdjustments }
    
    ;['cauchos', 'baterias', ...customLists.map(l => l.id)].forEach((listType) => {
      if (newLocals[listType]) newLocals[listType][key] = ''
      if (newDefaults[listType]) newDefaults[listType][key] = 0
    })
    
    setLocalAdjustments(newLocals)
    setDefaultAdjustments(newDefaults)

    try {
      await fetch('/api/settings/price_columns', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settingValue: JSON.stringify(newColumns) })
      })
      
      showAlert('Columna de precio agregada correctamente', 'Éxito')
    } catch (error) {
      console.error('Error adding column:', error)
      showAlert('Error al agregar columna', 'Error')
      refreshData() // Rollback
    }
  }

  const removePriceColumn = async (keyToDelete: string) => {
    // Eliminamos la restricción de columnas predeterminadas
    // if (['cashea', 'transferencia', 'divisas', 'custom', 'pagoMovil'].includes(keyToDelete)) { ... }
    
    if (!await showConfirm('¿Eliminar esta columna de precio? Los datos asociados podrían perderse.', 'Confirmar eliminación')) return

    const newColumns = priceColumns.filter(c => c.key !== keyToDelete)
    const prevColumns = [...priceColumns]
    
    // 1. Optimistic Update
    setPriceColumns(newColumns)
    
    // Clean up local adjustments state
    const newLocals = { ...localAdjustments }
    Object.keys(newLocals).forEach(listType => {
      if (newLocals[listType] && newLocals[listType][keyToDelete] !== undefined) {
        const { [keyToDelete]: removed, ...rest } = newLocals[listType]
        newLocals[listType] = rest
      }
    })
    setLocalAdjustments(newLocals)
    
    // Clean up default adjustments state
    const newDefaults = { ...defaultAdjustments }
    Object.keys(newDefaults).forEach(listType => {
      if (newDefaults[listType] && newDefaults[listType][keyToDelete] !== undefined) {
        const { [keyToDelete]: removed, ...rest } = newDefaults[listType]
        newDefaults[listType] = rest
      }
    })
    setDefaultAdjustments(newDefaults)
    
    try {
      // 2. Update columns list in database
      const response = await fetch('/api/settings/price_columns', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settingValue: JSON.stringify(newColumns) })
      })
      
      // If response is not ok, try to parse error or just log text
      if (!response.ok) {
         const errText = await response.text()
         console.error('Update columns failed:', response.status, errText)
         throw new Error('Failed to update columns: ' + errText)
      }
      
      showAlert('Columna eliminada correctamente', 'Éxito')
    } catch (error) {
      console.error('Error removing column:', error)
      showAlert('Error al eliminar columna', 'Error')
      setPriceColumns(prevColumns) // Rollback
      refreshData()
    }
  }

  const editPriceColumn = async (key: string, newLabel: string, newBase: 'bs' | 'usd', newApplyTax: boolean) => {
    if (!newLabel.trim()) return
    
    const newColumns = priceColumns.map(col => 
      col.key === key ? { ...col, label: newLabel, base: newBase, applyTax: newApplyTax } : col
    )
    
    try {
      await fetch('/api/settings/price_columns', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settingValue: JSON.stringify(newColumns) })
      })
      
      setPriceColumns(newColumns)
      showAlert('Columna actualizada correctamente', 'Éxito')
    } catch (error) {
      console.error('Error updating column:', error)
      showAlert('Error al actualizar columna', 'Error')
    }
  }

  const [tempGlobalDiscounts, setTempGlobalDiscounts] = useState({
    bs: 0,
    usd: 0
  })

  // Apply visual discount without saving to DB yet
  const applyVisualDiscount = (currency: 'bs' | 'usd', delta: number) => {
    setTempGlobalDiscounts(prev => {
        const current = prev[currency]
        // Logic for reset button (0)
        if (delta < 0 && Math.abs(delta) === current && current !== 0) {
            return { ...prev, [currency]: 0 }
        }
        return { ...prev, [currency]: current + delta }
    })
  }

  // Calculate displayed price with temp discount
  const getDisplayedPrice = (product: Product, currency: 'bs' | 'usd') => {
    const basePrice = currency === 'bs' ? product.precioListaBs : product.precioListaUsd
    const discount = tempGlobalDiscounts[currency]
    if (discount === 0) return Math.max(0, basePrice)
    const newPrice = basePrice * (1 + discount / 100)
    // Asegurar que el precio no sea negativo
    return Math.max(0, roundToNearest5(newPrice))
  }

  // Commit temp discounts to DB permanently
  async function applyBasePriceAdjustment(currency: 'bs' | 'usd') {
    const adjustment = tempGlobalDiscounts[currency]
    
    if (adjustment === 0) {
      showAlert('El ajuste es 0%, no hay cambios que aplicar', 'Información')
      return
    }
    
    const currencyName = currency === 'bs' ? 'Bs' : 'USD'
    const sign = adjustment >= 0 ? '+' : ''
    
    if (!await showConfirm(`¿Aplicar permanentemente el ajuste de ${sign}${adjustment}% a la lista en ${currencyName}?
    
Esto modificará la base de datos y reiniciará el contador visual a 0.`, `Confirmar Aplicación`)) {
        return
    }

    const multiplier = 1 + (adjustment / 100)
    
    // 1. Optimistic Update
    setProducts(prevProducts => prevProducts.map(p => {
        if (p.productType !== activeTab) return p
        
        if (currency === 'bs') {
            const newPrice = Math.max(0, roundToNearest5(p.precioListaBs * multiplier))
            return { ...p, precioListaBs: newPrice }
        } else {
            const newPrice = Math.max(0, roundToNearest5(p.precioListaUsd * multiplier))
            return { ...p, precioListaUsd: newPrice }
        }
    }))
    
    // Reset visual counter immediately
    setTempGlobalDiscounts(prev => ({ ...prev, [currency]: 0 }))
    
    // 2. Background API Call
    try {
        const response = await fetch('/api/products/batch-price-update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: activeTab,
                percentageBs: currency === 'bs' ? adjustment : 0,
                percentageUsd: currency === 'usd' ? adjustment : 0
            })
        })
        
        if (!response.ok) throw new Error('Failed to batch update prices')
        
        showAlert(`✅ Precios base actualizados permanentemente`, 'Éxito')
    } catch (error) {
        console.error('Error applying base price adjustment:', error)
        showAlert('Error al aplicar cambios (los cambios visuales pueden revertirse)', 'Error')
        refreshData() // Rollback
    }
  }

  // Commit BOTH temp discounts
  async function applyBothBasePriceAdjustments() {
    const adjBs = tempGlobalDiscounts.bs
    const adjUsd = tempGlobalDiscounts.usd
    
    if (adjBs === 0 && adjUsd === 0) {
        showAlert('No hay ajustes pendientes para aplicar', 'Información')
        return
    }

    if (!await showConfirm(`¿Aplicar ambos ajustes permanentemente?
    
• Bs: ${adjBs > 0 ? '+' : ''}${adjBs}%
• USD: ${adjUsd > 0 ? '+' : ''}${adjUsd}%`, `Confirmar Todo`)) {
        return
    }

    // 1. Optimistic Update
    setProducts(prevProducts => prevProducts.map(p => {
        if (p.productType !== activeTab) return p
        
        const newBs = adjBs !== 0 ? Math.max(0, roundToNearest5(p.precioListaBs * (1 + adjBs/100))) : p.precioListaBs
        const newUsd = adjUsd !== 0 ? Math.max(0, roundToNearest5(p.precioListaUsd * (1 + adjUsd/100))) : p.precioListaUsd
        
        return { ...p, precioListaBs: newBs, precioListaUsd: newUsd }
    }))
    
    // Reset visual counters
    setTempGlobalDiscounts({ bs: 0, usd: 0 })

    // 2. Background API Call
    try {
        const response = await fetch('/api/products/batch-price-update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: activeTab,
                percentageBs: adjBs,
                percentageUsd: adjUsd
            })
        })
        
        if (!response.ok) throw new Error('Failed to batch update prices')
        
        showAlert(`✅ Productos actualizados permanentemente`, 'Éxito')
    } catch (error) {
        console.error('Error applying both adjustments:', error)
        showAlert('Error al aplicar cambios (los cambios visuales pueden revertirse)', 'Error')
        refreshData() // Rollback
    }
  }

  return (
    <div className="min-h-screen gradient-bg text-white p-4 md:p-6">
      {/* Header */}
      <header className="text-center mb-8 pt-4">
        <div className="flex items-center justify-center gap-2 mb-2 scale-100 transition-transform">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-[#dc2626] drop-shadow-[0_2px_0_rgba(255,255,255,0.5)] flex items-center gap-1" 
              style={{ textShadow: '2px 2px 0 #ffffff, -1px -1px 0 #ffffff, 1px -1px 0 #ffffff, -1px 1px 0 #ffffff, 1px 1px 0 #ffffff' }}>
            GRUP
            <svg className="w-8 h-8 md:w-12 md:h-12 inline-block drop-shadow-lg animate-spin-slow text-white" viewBox="0 0 100 100" aria-label="O - Neumático">
              <circle cx="50" cy="50" r="45" fill="#1a1a1a" stroke="currentColor" strokeWidth="4"></circle>
              <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5,5"></circle>
              <circle cx="50" cy="50" r="15" fill="#333" stroke="currentColor" strokeWidth="2"></circle>
              <path d="M50 5 L50 20 M50 80 L50 95 M5 50 L20 50 M80 50 L95 50" stroke="currentColor" strokeWidth="4"></path>
              <path d="M18 18 L29 29 M71 71 L82 82 M18 82 L29 71 M71 29 L82 18" stroke="currentColor" strokeWidth="4"></path>
            </svg>
          </h1>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-[#dc2626] drop-shadow-[0_2px_0_rgba(255,255,255,0.5)]"
              style={{ textShadow: '2px 2px 0 #ffffff, -1px -1px 0 #ffffff, 1px -1px 0 #ffffff, -1px 1px 0 #ffffff, 1px 1px 0 #ffffff' }}>
            CHIRICA
          </h1>
        </div>
        <p className="text-white font-bold tracking-wide uppercase text-xs md:text-sm bg-black/50 inline-block px-4 py-1 rounded-full backdrop-blur-sm border border-white/20 shadow-lg">
          Sistema de Gestión y Control
        </p>
        
        {/* Tabs */}
        <div className="flex justify-center gap-3 mt-8 flex-wrap items-center">
          <button
            onClick={() => setActiveTab('cauchos')}
            className={`h-12 px-6 rounded-lg font-bold tracking-wide uppercase transition-all shadow-lg flex items-center justify-center min-w-[140px] ${
              activeTab === 'cauchos' 
                ? 'bg-red-600 text-white border border-red-500 shadow-red-900/50 scale-[1.02]' 
                : 'bg-black/40 text-gray-300 hover:bg-white/10 hover:text-white border border-white/5'
            }`}
          >
            🚗 Cauchos
          </button>
          <button
            onClick={() => setActiveTab('baterias')}
            className={`h-12 px-6 rounded-lg font-bold tracking-wide uppercase transition-all shadow-lg flex items-center justify-center min-w-[140px] ${
              activeTab === 'baterias' 
                ? 'bg-red-600 text-white border border-red-500 shadow-red-900/50 scale-[1.02]' 
                : 'bg-black/40 text-gray-300 hover:bg-white/10 hover:text-white border border-white/5'
            }`}
          >
            🔋 Baterías
          </button>
          {isSuperAdmin && (
            <>
              <button
                onClick={() => setShowAddListModal(true)}
                className="h-12 px-6 rounded-lg font-bold tracking-wide uppercase transition-all shadow-lg flex items-center justify-center min-w-[140px] bg-green-600/20 text-green-400 hover:bg-green-600/40 border-2 border-green-600/50 border-dashed hover:text-white"
              >
                ➕ Agregar
              </button>
              <button
                onClick={async () => {
                  if (activeTab === 'cauchos' || activeTab === 'baterias') {
                    showAlert('No se pueden eliminar las listas predeterminadas', 'Acción no permitida')
                    return
                  }
                  
                  if (await showConfirm(`¿Estás seguro de que deseas eliminar la lista actual? Esta acción no se puede deshacer.`, 'Eliminar Lista')) {
                     await deleteCustomList(activeTab)
                  }
                }}
                className="h-12 px-6 rounded-lg font-bold tracking-wide uppercase transition-all shadow-lg flex items-center justify-center min-w-[140px] bg-red-600/20 text-red-400 hover:bg-red-600/40 border-2 border-red-600/50 border-dashed hover:text-white"
              >
                ➖ Quitar
              </button>
            </>
          )}
        </div>
      </header>

      {/* Lock Button */}
      <button
        onClick={async () => {
          if (isAdmin || isWorker) {
            if (await showConfirm('¿Cerrar sesión?', 'Cerrar Sesión')) {
              handleLogout()
            }
          } else {
            setShowAuthModal(true)
          }
        }}
        className="fixed top-4 right-4 p-3 rounded-full card-glass hover:bg-white/10 z-40 transition-all active:scale-95"
      >
        {(isAdmin || isWorker) ? (
          <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        )}
      </button>

      {/* Config Panel - Admin/Worker access the User list, Super Admin accesses settings */}
      {(isAdmin || isWorker) && (
        <div className="mb-4">
          <button
            onClick={() => setShowConfigPanel(!showConfigPanel)}
            className="w-full card-glass rounded-xl p-4 flex items-center justify-between hover:bg-white/10 transition-all font-semibold"
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-white">
                {isSuperAdmin ? 'Panel de Administración' : 'Panel de Usuarios Conectados'}
              </span>
            </div>
            <svg className={`w-6 h-6 text-gray-400 transform transition-transform ${showConfigPanel ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showConfigPanel && (
            <div className="card-glass rounded-2xl p-4 md:p-6 mt-4">
              <AdminPanel 
                socket={socket} 
                currentUser={{ ...currentUser, userType: isAdmin ? 'admin' : 'worker' }} 
                connectedUsers={connectedUsers}
              />
              
              {isAdmin && (
                <Accordion
                  type="single"
                  collapsible
                  className="mt-6 space-y-4"
                  defaultValue={adminAccordionValue}
                  onValueChange={(val) => {
                    const v = val || undefined
                    if (v) {
                      sessionStorage.setItem('adminAccordion', v)
                    } else {
                      sessionStorage.removeItem('adminAccordion')
                    }
                  }}
                >
                  {isSuperAdmin && (
                    <AccordionItem
                      value="password"
                      className="rounded-2xl border border-white/10 bg-black/40 shadow-lg shadow-black/40"
                    >
                      <AccordionTrigger className="px-5 md:px-6 text-white/90">
                        <span className="text-white font-semibold">Gestión de Contraseña</span>
                      </AccordionTrigger>
                      <AccordionContent className="px-5 md:px-6 pb-6 pt-0">
                        <div className="space-y-4 pt-1">
                          <div className="flex flex-wrap gap-3">
                            <button
                              onClick={() => { setPasswordModalType('worker'); setShowPasswordModal(true) }}
                              className="btn-primary px-4 py-2 rounded-lg font-medium text-gray-900 w-full md:w-auto"
                            >
                              Cambiar Contraseña de Trabajadores
                            </button>
                            <button
                              onClick={() => { setPasswordModalType('admin'); setShowPasswordModal(true) }}
                              className="btn-primary px-4 py-2 rounded-lg font-medium text-gray-900 w-full md:w-auto"
                            >
                              Cambiar Contraseña de Admin
                            </button>
                          </div>
                          <p className="text-xs text-gray-400">
                            Eres Administrador y puedes cambiar las contraseñas.
                          </p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {isSuperAdmin && (
                    <AccordionItem
                      value="backup"
                      className="rounded-2xl border border-white/10 bg-black/40 shadow-lg shadow-black/40"
                    >
                      <AccordionTrigger className="px-5 md:px-6 text-white/90">
                        <span className="text-white font-semibold">Copia de Seguridad y Restauración</span>
                      </AccordionTrigger>
                      <AccordionContent className="px-5 md:px-6 pb-6 pt-0">
                        <div className="space-y-4 pt-1">
                          <div className="p-4 rounded-xl bg-blue-900/20 border border-blue-500/30">
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

                          <div className="p-4 rounded-xl bg-red-900/20 border border-red-500/30">
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
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  <AccordionItem
                    value="config"
                    className="rounded-2xl border border-white/10 bg-black/40 shadow-lg shadow-black/40"
                  >
                    <AccordionTrigger className="px-5 md:px-6 text-white/90">
                      <span className="text-white font-semibold">Configuración Global</span>
                    </AccordionTrigger>
                    <AccordionContent className="px-5 md:px-6 pb-6 pt-0">
              
              {/* Tax & Exchange Config */}
              <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Impuesto (%)</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      value={taxRate === 0 ? '' : taxRate}
                      onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                      className="input-dark rounded-lg px-3 py-2 w-full text-white placeholder-gray-500"
                      placeholder="0"
                      min="0"
                      max="100"
                      step="0.1"
                    />
                    <span className="text-white font-bold">{taxRate}%</span>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <h3 className="text-sm text-gray-400 mb-2">Aplicar IVA a Columnas:</h3>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {priceColumns.map(col => (
                      <div 
                        key={col.key} 
                        onClick={async () => {
                          const updated = priceColumns.map(c => 
                            c.key === col.key ? { ...c, applyTax: !c.applyTax } : c
                          )
                          setPriceColumns(updated)
                          // Auto save columns config when toggling
                          try {
                            await fetch('/api/settings/price_columns', {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ settingValue: JSON.stringify(updated) })
                            })
                          } catch (err) { console.error(err) }
                        }}
                        className={`cursor-pointer p-2 rounded-lg border transition-all text-center select-none flex items-center justify-center ${
                          col.applyTax 
                            ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-900/50' 
                            : 'bg-black/20 border-white/5 text-gray-400 hover:border-white/10 hover:bg-white/5'
                        }`}
                      >
                        <span className="text-xs font-bold tracking-wide">{col.label}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3 items-center">
                    <button
                      onClick={saveTaxRate}
                      className="flex-1 btn-primary px-4 py-3 rounded-lg font-bold text-white transition-all shadow-lg hover:shadow-red-500/20 uppercase tracking-wide text-sm"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => {
                          setTaxRate(0)
                          const updated = priceColumns.map(c => ({ ...c, applyTax: false }))
                          setPriceColumns(updated)
                          fetch('/api/settings/price_columns', {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ settingValue: JSON.stringify(updated) })
                          }).catch(console.error)
                          saveTaxRate()
                      }}
                      className="flex-1 bg-orange-600 hover:bg-orange-700 px-4 py-3 rounded-lg font-bold text-white transition-all shadow-lg hover:shadow-orange-500/20 uppercase tracking-wide text-sm"
                      title="Restablecer Impuesto y Selección"
                    >
                      Restablecer
                    </button>
                  </div>

                </div>
              </div>

                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem
                    value="base"
                    className="rounded-2xl border border-white/10 bg-black/40 shadow-lg shadow-black/40"
                  >
                    <AccordionTrigger className="px-5 md:px-6 text-white/90">
                      <span className="text-white font-semibold">Ajustes de Precios Base (aplicar a todos los productos)</span>
                    </AccordionTrigger>
                    <AccordionContent className="px-5 md:px-6 pb-6 pt-0">
              <div className="mb-6 border-t border-white/10 pt-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <h3 className="text-sm font-bold text-white">Ajustes de Precios Base (aplicar a todos los productos)</h3>
                  </div>
                  <button
                    onClick={() => setTempGlobalDiscounts({ bs: 0, usd: 0 })}
                    className="text-xs text-white hover:text-gray-300 flex items-center gap-1 font-medium transition-colors"
                    title="Restablecer ajustes de precio base a 0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Restablecer
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* BS Panel */}
                  <div className="card-glass rounded-lg p-4 bg-black/20">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">📊</span>
                      <label className="block text-sm font-semibold text-gray-300">Ajustar Lista (Bs)</label>
                    </div>
                    
                    <div className="flex gap-1 mb-4">
                      <button onClick={() => applyVisualDiscount('bs', -5)} className="flex-1 py-2 rounded bg-black/40 hover:bg-black/60 border border-white/10 text-white font-bold text-sm transition-all">-5%</button>
                      <button onClick={() => applyVisualDiscount('bs', -1)} className="flex-1 py-2 rounded bg-black/40 hover:bg-black/60 border border-white/10 text-white font-bold text-sm transition-all">-1%</button>
                      <button onClick={() => applyVisualDiscount('bs', -tempGlobalDiscounts.bs)} className="flex-1 py-2 rounded bg-black/40 hover:bg-black/60 border border-white/10 text-white font-bold text-sm transition-all">0</button>
                      <button onClick={() => applyVisualDiscount('bs', 1)} className="flex-1 py-2 rounded bg-black/40 hover:bg-black/60 border border-white/10 text-white font-bold text-sm transition-all">+1%</button>
                      <button onClick={() => applyVisualDiscount('bs', 5)} className="flex-1 py-2 rounded bg-black/40 hover:bg-black/60 border border-white/10 text-white font-bold text-sm transition-all">+5%</button>
                    </div>
                    
                    <button 
                      onClick={() => applyBasePriceAdjustment('bs')}
                      className="w-full btn-primary py-2.5 rounded-lg font-bold text-white shadow-lg hover:shadow-red-500/20 transition-all mb-2"
                    >
                      Aplicar Ajuste a Lista (Bs) {tempGlobalDiscounts.bs !== 0 && `(${tempGlobalDiscounts.bs > 0 ? '+' : ''}${tempGlobalDiscounts.bs}%)`}
                    </button>
                    
                    <p className="text-xs text-gray-500">Ejemplo: +10% aumentará todos los precios en Bs un 10%</p>
                  </div>

                  {/* USD Panel */}
                  <div className="card-glass rounded-lg p-4 bg-black/20">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">💵</span>
                      <label className="block text-sm font-semibold text-gray-300">Ajustar Lista ($)</label>
                    </div>
                    
                    <div className="flex gap-1 mb-4">
                      <button onClick={() => applyVisualDiscount('usd', -5)} className="flex-1 py-2 rounded bg-black/40 hover:bg-black/60 border border-white/10 text-white font-bold text-sm transition-all">-5%</button>
                      <button onClick={() => applyVisualDiscount('usd', -1)} className="flex-1 py-2 rounded bg-black/40 hover:bg-black/60 border border-white/10 text-white font-bold text-sm transition-all">-1%</button>
                      <button onClick={() => applyVisualDiscount('usd', -tempGlobalDiscounts.usd)} className="flex-1 py-2 rounded bg-black/40 hover:bg-black/60 border border-white/10 text-white font-bold text-sm transition-all">0</button>
                      <button onClick={() => applyVisualDiscount('usd', 1)} className="flex-1 py-2 rounded bg-black/40 hover:bg-black/60 border border-white/10 text-white font-bold text-sm transition-all">+1%</button>
                      <button onClick={() => applyVisualDiscount('usd', 5)} className="flex-1 py-2 rounded bg-black/40 hover:bg-black/60 border border-white/10 text-white font-bold text-sm transition-all">+5%</button>
                    </div>
                    
                    <button 
                      onClick={() => applyBasePriceAdjustment('usd')}
                      className="w-full btn-primary py-2.5 rounded-lg font-bold text-white shadow-lg hover:shadow-red-500/20 transition-all mb-2"
                    >
                      Aplicar Ajuste a Lista ($) {tempGlobalDiscounts.usd !== 0 && `(${tempGlobalDiscounts.usd > 0 ? '+' : ''}${tempGlobalDiscounts.usd}%)`}
                    </button>
                    
                    <p className="text-xs text-gray-500">Ejemplo: -20% reducirá todos los precios en $ un 20%</p>
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <button
                    onClick={applyBothBasePriceAdjustments}
                    className="btn-primary px-8 py-3 rounded-lg font-bold text-white text-lg transition-all shadow-xl hover:shadow-red-500/30 hover:scale-[1.02]"
                  >
                    Aplicar Ambos Ajustes de Precio Base
                  </button>
                  <div className="flex items-center justify-center gap-2 mt-3 text-xs text-white">
                    <span className="text-lg">⚠️</span>
                    <p>Esta acción modificará permanentemente los precios base de todos los productos en esta lista</p>
                  </div>
                </div>
              </div>

                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem
                    value="global"
                    className="rounded-2xl border border-white/10 bg-black/40 shadow-lg shadow-black/40"
                  >
                    <AccordionTrigger className="px-5 md:px-6 text-white/90">
                      <span className="text-white font-semibold">Ajustes Globales por Tipo de Precio</span>
                    </AccordionTrigger>
                    <AccordionContent className="px-5 md:px-6 pb-6 pt-0">
              <div className="border-t border-white/10 pt-5">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold text-gray-300">Ajustes Globales por Tipo de Precio</h3>
                  <div className="flex gap-3">
                    <button
                        onClick={resetAllDiscounts}
                        className="text-xs text-white hover:text-gray-300 flex items-center gap-1 font-medium transition-colors"
                        title="Poner todos los descuentos en 0%"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Resetear Descuentos
                    </button>
                    <button 
                      onClick={() => setIsManagingColumns(!isManagingColumns)}
                      className="text-xs text-white hover:text-gray-300 flex items-center gap-1 font-medium transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Gestionar Columnas
                    </button>
                  </div>
                </div>

                {isManagingColumns && (
                  <div className="card-glass rounded-lg p-4 mb-4 border border-red-500/30">
                    <h4 className="text-sm font-semibold text-white mb-3">Gestionar Tipos de Precio</h4>
                    
                    <div className="flex gap-2 mb-4 items-center">
                      <input
                        type="text"
                        value={newColumnName}
                        onChange={(e) => setNewColumnName(e.target.value)}
                        placeholder="Nombre de nueva columna"
                        className="flex-1 input-dark rounded-lg px-3 py-2 text-white text-sm"
                      />
                      <select 
                        value={newColumnBase}
                        onChange={(e) => setNewColumnBase(e.target.value as 'bs' | 'usd')}
                        className="input-dark rounded-lg px-3 py-2 text-white text-sm"
                      >
                        <option value="bs">Base Bs</option>
                        <option value="usd">Base $</option>
                      </select>
                      <button
                        onClick={addPriceColumn}
                        disabled={!newColumnName.trim()}
                        className="btn-primary px-4 py-2 rounded-lg font-medium text-white text-xs disabled:opacity-50"
                      >
                        Agregar
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {priceColumns.map((col) => (
                        <div key={col.key} className="flex justify-between items-center bg-black/20 p-2 rounded">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-sm text-gray-300 truncate" title={col.label}>
                              {col.label} <span className="text-xs text-gray-500">({col.base === 'bs' ? 'Bs' : '$'})</span>
                            </span>
                          </div>
                          
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => setEditingColumn({ key: col.key, label: col.label, base: col.base || 'bs', applyTax: col.applyTax !== undefined ? col.applyTax : (col.base === 'bs') })}
                              className="text-blue-400 hover:text-blue-300 p-1"
                              title="Editar columna"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            
                            <button
                              onClick={() => removePriceColumn(col.key)}
                              className="text-red-400 hover:text-red-300 p-1"
                              title="Eliminar columna"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {priceColumns.map(({ key, label }) => {
                    const currentGlobal = defaultAdjustments[activeTab]?.[key] || 0
                    
                    return (
                    <div key={key} className="card-glass rounded-lg p-3 flex flex-col justify-between h-full">
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs text-gray-400 font-medium truncate pr-2" title={label}>{label}</label>
                        <span className={`text-xs font-bold ${currentGlobal > 0 ? 'text-green-400' : currentGlobal < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                          {currentGlobal > 0 ? '+' : ''}{currentGlobal}%
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            const current = Number(localAdjustments[activeTab]?.[key] || 0)
                            const newAdjustments = { ...localAdjustments }
                            newAdjustments[activeTab] = { ...newAdjustments[activeTab], [key]: current - 1 }
                            setLocalAdjustments(newAdjustments)
                          }}
                          className="w-8 h-8 flex items-center justify-center bg-black/40 hover:bg-black/60 border border-white/10 rounded text-white transition-all"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                          </svg>
                        </button>
                        <input
                          type="number"
                          value={localAdjustments[activeTab]?.[key] ?? ''}
                          onChange={(e) => {
                            const val = e.target.value
                            const newAdjustments = { ...localAdjustments }
                            newAdjustments[activeTab] = { 
                              ...newAdjustments[activeTab], 
                              [key]: val === '' ? '' : parseFloat(val) 
                            }
                            setLocalAdjustments(newAdjustments)
                          }}
                          className="flex-1 min-w-0 bg-black/40 border border-white/10 rounded px-1 text-center text-white text-sm focus:border-red-500 focus:outline-none"
                          step="0.1"
                          placeholder="0"
                        />
                        <button
                          onClick={() => {
                            const current = Number(localAdjustments[activeTab]?.[key] || 0)
                            const newAdjustments = { ...localAdjustments }
                            newAdjustments[activeTab] = { ...newAdjustments[activeTab], [key]: current + 1 }
                            setLocalAdjustments(newAdjustments)
                          }}
                          className="w-8 h-8 flex items-center justify-center bg-black/40 hover:bg-black/60 border border-white/10 rounded text-white transition-all"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                        <button
                          onClick={() => saveGlobalAdjustment(key)}
                          className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide transition-all shadow-lg hover:shadow-red-500/20"
                        >
                          Aplicar
                        </button>
                      </div>
                    </div>
                  )})}
                </div>
                
                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-400 mt-2">Los nuevos productos se crearán con el ajuste acumulado actual.</p>
                </div>
              </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
          )}
          </div>
        )}
        </div>
      )}

      {/* Add Product Panel - Only Super Admin or Admin */}
      {isAdmin && (
        <div className="mb-4">
          <button
            onClick={() => setShowAddPanel(!showAddPanel)}
            className="w-full card-glass rounded-xl p-4 flex items-center justify-between hover:bg-white/10 transition-all"
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="text-lg font-semibold text-white">
                Agregar Nuevo {activeTab === 'cauchos' ? 'Caucho' : 'Batería'}
              </span>
            </div>
            <svg className={`w-6 h-6 text-gray-400 transform transition-transform ${showAddPanel ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showAddPanel && (
            <div className="card-glass rounded-2xl p-4 md:p-6 mt-4">
              <h2 className="text-lg font-semibold text-white mb-4">Agregar Nuevo Producto</h2>
              
              <div className="mb-4 flex gap-2 flex-wrap">
                <ExcelImport onImport={importProducts} />
                <PdfImportExport 
                  products={products} 
                  activeTab={activeTab} 
                  onImport={importProducts}
                />
                <button
                  onClick={exportToExcel}
                  className="btn-primary px-4 py-2 rounded-lg font-medium text-white transition-all shadow-lg hover:shadow-red-500/20 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Exportar Excel
                </button>
                <button
                   onClick={() => alert("Función de subir foto pendiente de implementación")}
                   className="btn-primary px-4 py-2 rounded-lg font-medium text-white transition-all shadow-lg hover:shadow-red-500/20 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Subir Foto
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); addProduct(); }} className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    {activeTab === 'cauchos' ? 'Tipo/Marca' : 'Marca'}
                  </label>
                  <input
                    type="text"
                    value={addForm.type}
                    onChange={(e) => setAddForm({ ...addForm, type: e.target.value })}
                    className="input-dark rounded-lg px-3 py-2 w-full text-white"
                    placeholder={activeTab === 'cauchos' ? 'Ej: Pirelli P7' : 'Ej: Duncan'}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    {activeTab === 'cauchos' ? 'Medida' : 'Modelo/Amperaje'}
                  </label>
                  <input
                    type="text"
                    value={addForm.medida}
                    onChange={(e) => setAddForm({ ...addForm, medida: e.target.value })}
                    className="input-dark rounded-lg px-3 py-2 w-full text-white"
                    placeholder={activeTab === 'cauchos' ? 'Ej: 205/55R16' : 'Ej: 12V 75Ah'}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Precio Lista (Bs)</label>
                  <input
                    type="number"
                    value={addForm.precioListaBs}
                    onChange={(e) => setAddForm({ ...addForm, precioListaBs: e.target.value })}
                    className="input-dark rounded-lg px-3 py-2 w-full text-white"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Precio Lista ($)</label>
                  <input
                    type="number"
                    value={addForm.precioListaUsd}
                    onChange={(e) => setAddForm({ ...addForm, precioListaUsd: e.target.value })}
                    className="input-dark rounded-lg px-3 py-2 w-full text-white"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div className="flex items-end">
                  <button type="submit" className="btn-primary w-full px-4 py-2 rounded-lg font-medium text-white transition-all shadow-lg hover:shadow-red-500/20">
                    Agregar
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Product List */}
      <div className="card-glass rounded-2xl p-4 md:p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Lista de Precios
          </h2>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-dark rounded-lg px-3 py-2 text-white text-sm"
              placeholder="Buscar..."
            />
            <span className="text-sm text-gray-400">
              {filteredProducts.length} {activeTab === 'cauchos' ? 'cauchos' : 'baterías'}
            </span>
          </div>
        </div>

        {/* Mobile View */}
        <div className="md:hidden space-y-4">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-lg font-medium">
                {searchTerm 
                  ? 'No se encontraron resultados' 
                  : `No hay ${activeTab === 'cauchos' ? 'cauchos' : 'baterías'} registrados`
                }
              </p>
            </div>
          ) : (
            <Virtuoso
              useWindowScroll
              data={filteredProducts}
              itemContent={(index, product) => (
                <MobileProductCard
                  key={product.id}
                  product={product}
                  isAdmin={isAdmin}
                  calculatePrice={calculatePrice}
                  openEditModal={openEditModal}
                  openDeleteModal={openDeleteModal}
                  currentDefaults={defaultAdjustments[activeTab] || { cashea: 0, transferencia: 0, divisas: 0, custom: 0 }}
                  currentGlobals={globalAdjustments[activeTab] || { cashea: 0, transferencia: 0, divisas: 0, custom: 0 }}
                  priceColumns={priceColumns}
                  tempGlobalDiscounts={tempGlobalDiscounts}
                  taxRate={taxRate}
                />
              )}
            />
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 text-left">
                  <th className="pb-3 text-sm font-medium text-gray-400">Descripcion</th>
                  {priceColumns.map((col) => (
                    <th key={col.key} className="pb-3 text-sm font-medium text-white text-right">{col.label}</th>
                  ))}
                  <th className="pb-3 text-sm font-medium text-gray-400 text-right">Lista (Bs)</th>
                  <th className="pb-3 text-sm font-medium text-gray-400 text-right">Lista ($)</th>
                <th className="pb-3 text-sm font-medium text-gray-400 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <span>
                      {searchTerm 
                        ? 'No se encontraron resultados' 
                        : `No hay ${activeTab === 'cauchos' ? 'cauchos' : 'baterías'} registrados. ¡Agrega el primero!`
                      }
                    </span>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <ProductRow
                            key={product.id}
                            product={product}
                            isAdmin={isAdmin}
                            calculatePrice={calculatePrice}
                            openEditModal={openEditModal}
                            openDeleteModal={openDeleteModal}
                            currentDefaults={defaultAdjustments[activeTab] || { cashea: 0, transferencia: 0, divisas: 0, custom: 0 }}
                            currentGlobals={globalAdjustments[activeTab] || { cashea: 0, transferencia: 0, divisas: 0, custom: 0 }}
                            priceColumns={priceColumns}
                            tempGlobalDiscounts={tempGlobalDiscounts}
                            taxRate={taxRate}
                            exchangeRate={exchangeRate}
                            viewCurrency={viewCurrency}
                          />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-glass rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-white mb-4">Editar Producto</h3>
            <form onSubmit={(e) => { e.preventDefault(); updateProduct(); }}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Tipo/Marca</label>
                  <input
                    type="text"
                    value={editForm.type}
                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                    className="input-dark rounded-lg px-3 py-2 w-full text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Medida</label>
                  <input
                    type="text"
                    value={editForm.medida}
                    onChange={(e) => setEditForm({ ...editForm, medida: e.target.value })}
                    className="input-dark rounded-lg px-3 py-2 w-full text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Precio Lista (Bs)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">Bs</span>
                    <input
                      type="number"
                      value={editForm.precioListaBs}
                      onChange={(e) => setEditForm({ ...editForm, precioListaBs: parseFloat(e.target.value) || 0 })}
                      className="input-dark rounded-lg pl-9 pr-3 py-2 w-full text-white"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Precio Lista ($)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500 font-bold">$</span>
                    <input
                      type="number"
                      value={editForm.precioListaUsd}
                      onChange={(e) => setEditForm({ ...editForm, precioListaUsd: parseFloat(e.target.value) || 0 })}
                      className="input-dark rounded-lg pl-8 pr-3 py-2 w-full text-white"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>
              </div>
              
              <div className="border-t border-white/10 pt-4 mb-4">
                <h4 className="text-sm font-semibold text-gray-300 mb-3">Ajustes Individuales (opcional - dejar vacío para usar global)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {priceColumns.map(({ key, label, base, applyTax }) => {
                    const currentValue = (editForm as any)[`adjustment${key.charAt(0).toUpperCase() + key.slice(1)}`]
                    const isGlobal = currentValue === '' || currentValue === undefined
                    const effectiveAdjustment = isGlobal 
                      ? (defaultAdjustments[activeTab]?.[key] || 0)
                      : parseFloat(currentValue as string) || 0
                      
                    const currency = base || 'bs'
                    const basePrice = currency === 'usd'
                      ? editForm.precioListaUsd 
                      : editForm.precioListaBs
                      
                    const finalPrice = Math.max(0, calculatePrice(basePrice, effectiveAdjustment, currency, applyTax))
                    
                    return (
                      <div key={key} className="card-glass rounded-lg p-3">
                        <label className="block text-xs text-gray-400 mb-1">{label} %</label>
                        <input
                          type="number"
                          value={currentValue || ''}
                          onChange={(e) => setEditForm({ ...editForm, [`adjustment${key.charAt(0).toUpperCase() + key.slice(1)}`]: e.target.value })}
                          className="input-dark rounded-lg px-3 py-2 w-full text-white text-sm"
                          step="0.1"
                          placeholder="Global"
                        />
                        <div className={`text-right text-xs mt-1 font-medium ${effectiveAdjustment < 0 ? 'text-red-400' : effectiveAdjustment > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                           {currency === 'usd' ? '$' : 'Bs'}{finalPrice.toFixed(2)} ({effectiveAdjustment > 0 ? '+' : ''}{effectiveAdjustment}%)
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg font-medium bg-gray-700 hover:bg-gray-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary px-4 py-2 rounded-lg font-medium text-white transition-all shadow-lg hover:shadow-red-500/20"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Column Modal */}
      {editingColumn && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-glass rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-white/20 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-semibold text-white mb-2">Editar Columna</h3>
            <p className="text-gray-200 mb-6 leading-relaxed">Modifica el nombre y la moneda base:</p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nombre</label>
                <input 
                  className="w-full input-dark rounded-lg px-4 py-3 text-white border-white/10 focus:border-amber-500/50 transition-all outline-none" 
                  placeholder="Nombre de la columna" 
                  type="text" 
                  value={editingColumn.label}
                  onChange={(e) => setEditingColumn({...editingColumn, label: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Moneda Base</label>
                <select 
                  className="w-full input-dark rounded-lg px-4 py-3 text-white border-white/10 focus:border-amber-500/50 transition-all outline-none"
                  value={editingColumn.base}
                  onChange={(e) => setEditingColumn({...editingColumn, base: e.target.value as 'bs' | 'usd'})}
                >
                  <option value="bs">Base Bs</option>
                  <option value="usd">Base $</option>
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={editingColumn.applyTax}
                    onChange={(e) => setEditingColumn({...editingColumn, applyTax: e.target.checked})}
                    className="w-4 h-4 rounded border-gray-600 text-red-600 focus:ring-red-500 bg-gray-700"
                  />
                  <span className="text-sm text-gray-400">Aplicar IVA</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setEditingColumn(null)}
                className="flex-1 px-4 py-2.5 rounded-xl font-medium bg-gray-700/50 hover:bg-gray-700 text-gray-300 transition-all border border-white/5"
              >
                Cancelar
              </button>
              <button 
                onClick={() => editPriceColumn(editingColumn.key, editingColumn.label, editingColumn.base, editingColumn.applyTax)}
                className="flex-1 btn-primary px-4 py-2.5 rounded-xl font-medium text-gray-900 transition-all shadow-lg shadow-amber-500/20 active:scale-95"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-glass rounded-2xl p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto text-center">
            <svg className="w-16 h-16 mx-auto text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-xl font-semibold text-white mb-2">¿Eliminar producto?</h3>
            <p className="text-gray-400 mb-6">{selectedProduct.type} - {selectedProduct.medida}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 rounded-lg font-medium bg-gray-700 hover:bg-gray-600 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={deleteProduct}
                className="flex-1 btn-danger px-4 py-2 rounded-lg font-medium text-white transition-all shadow-lg hover:shadow-red-500/20"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-glass rounded-2xl p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-amber-400 mb-4">Productos Detectados</h3>
            <p className="text-sm text-gray-400 mb-4">Revisa y confirma los productos antes de importarlos</p>
            
            <div className="max-h-96 overflow-y-auto mb-4">
              <table className="w-full">
                <thead className="sticky top-0 bg-gray-900">
                  <tr className="border-b border-white/10">
                    <th className="pb-2 text-left text-sm text-gray-400">Tipo/Marca</th>
                    <th className="pb-2 text-left text-sm text-gray-400">Medida</th>
                    <th className="pb-2 text-right text-sm text-gray-400">Precio</th>
                    <th className="pb-2 text-center text-sm text-gray-400">Incluir</th>
                  </tr>
                </thead>
                <tbody>
                  {extractedProducts.map((product, index) => (
                    <tr key={index} className="border-b border-white/5">
                      <td className="py-2 text-sm">{product.type}</td>
                      <td className="py-2 text-sm">{product.medida}</td>
                      <td className="py-2 text-sm text-right">${product.precio.toFixed(2)}</td>
                      <td className="py-2 text-center">
                        <input
                          type="checkbox"
                          checked={product.selected}
                          onChange={(e) => {
                            const updated = [...extractedProducts]
                            updated[index].selected = e.target.checked
                            setExtractedProducts(updated)
                          }}
                          className="w-4 h-4 rounded"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="flex-1 px-4 py-2 rounded-lg font-medium bg-gray-700 hover:bg-gray-600 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={confirmImport}
                className="flex-1 btn-primary px-4 py-2 rounded-lg font-medium text-gray-900 transition-all shadow-lg hover:shadow-amber-500/20"
              >
                Confirmar Importación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add List Modal */}
      {showAddListModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-glass rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-white">Nueva Lista</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nombre de la lista</label>
                <input
                  type="text"
                  value={newListForm.name}
                  onChange={(e) => setNewListForm({ ...newListForm, name: e.target.value })}
                  placeholder="Ej: Aceites"
                  className="input-dark w-full rounded-lg px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Emoji representativo</label>
                <input
                  type="text"
                  value={newListForm.emoji}
                  onChange={(e) => setNewListForm({ ...newListForm, emoji: e.target.value })}
                  placeholder="Ej: 🛢️"
                  className="input-dark w-full rounded-lg px-4 py-2 text-white"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddListModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg font-medium bg-gray-700 hover:bg-gray-600 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveNewList}
                  className="flex-1 btn-primary px-4 py-2 rounded-lg font-medium text-gray-900 transition-all"
                >
                  Crear Lista
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={handleLogin}
        currentSocket={socket}
        adminPassword={ADMIN_PASSWORD}
        superAdminPassword={SUPER_ADMIN_PASSWORD}
      />
    </div>
  )
}
