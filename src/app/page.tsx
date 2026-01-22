'use client'

import { useState, useEffect, useCallback } from 'react'
import ExcelImport from '@/components/ExcelImport'
import PdfImportExport from '@/components/PdfImportExport'
import AuthModal from '@/components/AuthModal'
import AdminPanel from '@/components/AdminPanel'
import ProductRow from '@/components/ProductRow'
import MobileProductCard from '@/components/MobileProductCard'
import { useRealtimeData } from '@/hooks/useRealtimeData'
import { roundToNearest5 } from '@/lib/utils'
import { useModal } from '@/context/ModalContext'

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
    (isAdmin || isWorker) ? (isAdmin ? 'admin' : 'worker') : 'client',
    currentUser
  )
  
  const isSuperAdmin = currentUser?.isSuperAdmin === true
  
  // Estados locales
  const [products, setProducts] = useState<Product[]>([])
  const [settings, setSettings] = useState<Setting[]>([])
  const [activeTab, setActiveTab] = useState('cauchos')
  const [customLists, setCustomLists] = useState<CustomList[]>([])
  const [taxRate, setTaxRate] = useState(16)
  const [globalAdjustments, setGlobalAdjustments] = useState<Record<string, any>>({
    cauchos: { cashea: 0, transferencia: 0, divisas: 0, custom: 0 },
    baterias: { cashea: 0, transferencia: 0, divisas: 0, custom: 0 }
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
    adjustmentCustom: ''
  })
  const [addForm, setAddForm] = useState({
    type: '',
    medida: '',
    precioListaBs: 0,
    precioListaUsd: 0
  })
  const [basePriceBs, setBasePriceBs] = useState(0)
  const [basePriceUsd, setBasePriceUsd] = useState(0)
  const [newListForm, setNewListForm] = useState({
    name: '',
    emoji: ''
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

  const loadSettingsFromData = (settingsData: Setting[]) => {
    // Load tax rate
    const taxSetting = settingsData.find(s => s.settingKey === 'tax_rate')
    if (taxSetting && taxSetting.taxRate !== undefined) {
      setTaxRate(taxSetting.taxRate)
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
    }

    // Load global adjustments
    const adjustments = { ...globalAdjustments }
    ;['cauchos', 'baterias', ...customLists.map(l => l.id)].forEach((listType: string) => {
      const adjSetting = settingsData.find(s => s.settingKey === `global_adj_${listType}`)
      if (adjSetting) {
        adjustments[listType] = {
          cashea: adjSetting.globalCashea || 0,
          transferencia: adjSetting.globalTransferencia || 0,
          divisas: adjSetting.globalDivisas || 0,
          custom: adjSetting.globalCustom || 0
        }
      }
    })
    setGlobalAdjustments(adjustments)

    // Load base prices
    const basePriceBsSetting = settingsData.find(s => s.settingKey === 'base_price_bs')
    const basePriceUsdSetting = settingsData.find(s => s.settingKey === 'base_price_usd')
    
    if (basePriceBsSetting) {
      setBasePriceBs(parseFloat(basePriceBsSetting.settingValue || '0') || 0)
    }
    if (basePriceUsdSetting) {
      setBasePriceUsd(parseFloat(basePriceUsdSetting.settingValue || '0') || 0)
    }
  }

  // Funciones de autenticación
  const handleLogin = (userType: 'admin' | 'client' | 'worker', userInfo?: any) => {
    setIsAdmin(userType === 'admin')
    setIsWorker(userType === 'worker')
    setCurrentUser(userInfo)
    localStorage.setItem('user_type', userType)
    if (userInfo) {
      localStorage.setItem('user_info', JSON.stringify(userInfo))
    }
  }

  const handleLogout = () => {
    setIsAdmin(false)
    setIsWorker(false)
    setCurrentUser(null)
    setShowAdminPanel(false)
    localStorage.removeItem('user_type')
    localStorage.removeItem('user_info')
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
        } else if (savedUserType === 'worker') {
          setIsWorker(true)
        }
        setCurrentUser(userInfo)
      } catch (error) {
        console.error('Error parsing saved user info:', error)
      }
    }
  }, [])

  const saveTaxRate = async () => {
    try {
      const response = await fetch(`/api/settings/tax_rate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taxRate })
      })
      
      if (response.ok) {
        alert('Impuesto actualizado correctamente')
      }
    } catch (error) {
      console.error('Error saving tax rate:', error)
      showAlert('Error al guardar el impuesto', 'Error')
    }
  }

  const saveGlobalAdjustment = async (type: string) => {
    try {
      const response = await fetch(`/api/settings/global_adj_${activeTab}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(globalAdjustments[activeTab])
      })
      
      if (response.ok) {
        showAlert(`Ajuste global ${type} actualizado`, 'Éxito')
      }
    } catch (error) {
      console.error('Error saving adjustment:', error)
      showAlert('Error al guardar los ajustes', 'Error')
    }
  }

  const addProduct = async () => {
    if (!addForm.type || !addForm.medida || addForm.precioListaBs <= 0 || addForm.precioListaUsd <= 0) {
      showAlert('Por favor completa todos los campos', 'Información')
      return
    }

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productType: activeTab,
          ...addForm
        })
      })

      if (response.ok) {
        setAddForm({ type: '', medida: '', precioListaBs: 0, precioListaUsd: 0 })
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
      const response = await fetch(`/api/products/${selectedProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          adjustmentCashea: editForm.adjustmentCashea ? parseFloat(editForm.adjustmentCashea) : null,
          adjustmentTransferencia: editForm.adjustmentTransferencia ? parseFloat(editForm.adjustmentTransferencia) : null,
          adjustmentDivisas: editForm.adjustmentDivisas ? parseFloat(editForm.adjustmentDivisas) : null,
          adjustmentCustom: editForm.adjustmentCustom ? parseFloat(editForm.adjustmentCustom) : null,
        })
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

  // Función para guardar ajustes globales en la base de datos
  const saveGlobalAdjustmentsToDB = async () => {
    try {
      const currentAdjustments = globalAdjustments[activeTab] || { cashea: 0, transferencia: 0, divisas: 0, custom: 0 }
      
      await fetch('/api/settings/global-adjustments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentAdjustments)
      })

      await showAlert('Ajustes globales guardados con éxito', 'Éxito')
      console.log('Ajustes globales guardados para', activeTab)
    } catch (error) {
      console.error('Error guardando ajustes globales:', error)
    }
  }

  // Función para guardar precios base en la base de datos
  const saveBasePricesToDB = async () => {
    try {
      await fetch('/api/settings/base-prices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          basePriceBs,
          basePriceUsd
        })
      })

      console.log('Precios base guardados')
    } catch (error) {
      console.error('Error guardando precios base:', error)
    }
  }

  const calculatePrice = (basePrice: number, adjustment: number) => {
    // Aplicar impuesto primero
    const priceWithTax = basePrice * (1 + taxRate / 100)
    // Luego aplicar ajuste (descuento o incremento)
    const finalPrice = priceWithTax * (1 + adjustment / 100)
    return finalPrice
  }

  const getEffectiveAdjustment = (product: Product, type: string) => {
    const individualKey = `adjustment${type.charAt(0).toUpperCase() + type.slice(1)}`
    const individualAdjustment = (product as any)[individualKey]
    return individualAdjustment !== undefined && individualAdjustment !== null 
      ? individualAdjustment 
      : globalAdjustments[product.productType]?.[type] || 0
  }

  // Función mejorada para calcular todos los precios
  const calculateAllPrices = (product: Product) => {
    const prices: Record<string, { base: number; final: number; adjustment: number }> = {}
    
    const types = ['cashea', 'transferencia', 'divisas', 'custom']
    types.forEach(type => {
      const basePrice = (type === 'divisas' || type === 'custom') ? product.precioListaUsd : product.precioListaBs
      const adjustment = getEffectiveAdjustment(product, type)
      const finalPrice = calculatePrice(basePrice, adjustment)
      
      prices[type] = {
        base: basePrice,
        final: finalPrice,
        adjustment: adjustment
      }
    })
    
    return prices
  }

  const filteredProducts = products.filter(product => 
    product.productType === activeTab &&
    (product.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.medida.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const openEditModal = (product: Product) => {
    setSelectedProduct(product)
    setEditForm({
      type: product.type,
      medida: product.medida,
      precioListaBs: product.precioListaBs,
      precioListaUsd: product.precioListaUsd,
      adjustmentCashea: product.adjustmentCashea?.toString() || '',
      adjustmentTransferencia: product.adjustmentTransferencia?.toString() || '',
      adjustmentDivisas: product.adjustmentDivisas?.toString() || '',
      adjustmentCustom: product.adjustmentCustom?.toString() || ''
    })
    setShowEditModal(true)
  }

  const openDeleteModal = (product: Product) => {
    setSelectedProduct(product)
    setShowDeleteModal(true)
  }

  const adjustGlobalValue = (type: string, delta: number) => {
    const newAdjustments = { ...globalAdjustments }
    newAdjustments[activeTab] = { ...newAdjustments[activeTab], [type]: (globalAdjustments[activeTab]?.[type] || 0) + delta }
    setGlobalAdjustments(newAdjustments)
  }

  const adjustBasePriceValue = (currency: string, delta: number) => {
    if (currency === 'bs') {
      const newValue = Math.round((basePriceBs + delta) / 5) * 5  // Redondear al múltiplo de 5 más cercano
      setBasePriceBs(newValue)
      // Guardar automáticamente
      setTimeout(() => saveBasePricesToDB(), 100)
    } else {
      const newValue = Math.round((basePriceUsd + delta) / 5) * 5  // Redondear al múltiplo de 5 más cercano
      setBasePriceUsd(newValue)
      // Guardar automáticamente
      setTimeout(() => saveBasePricesToDB(), 100)
    }
  }

  async function applyBasePriceAdjustment(currency: string) {
    const adjustmentPercent = currency === 'bs' ? basePriceBs : basePriceUsd
    
    if (adjustmentPercent === 0) {
      showAlert('El ajuste es 0%, no hay cambios que aplicar', 'Información')
      return
    }
    
    // Confirmation with inline UI
    const tempDiv = document.createElement('div')
    tempDiv.className = 'fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4'
    const currencyName = currency === 'bs' ? 'Bolívares (Bs)' : 'Dólares ($)'
    const sign = adjustmentPercent >= 0 ? '+' : ''
    
    tempDiv.innerHTML = `
      <div class="card-glass rounded-2xl p-6 w-full max-w-md text-center">
        <svg class="w-16 h-16 mx-auto ${adjustmentPercent > 0 ? 'text-green-500' : 'text-red-500'} mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        <h3 class="text-xl font-semibold text-white mb-2">¿Ajustar precios base?</h3>
        <p class="text-gray-300 mb-1">Aplicarás <span class="text-amber-400 font-bold">${sign}${adjustmentPercent}%</span> a todos los precios Lista (${currencyName})</p>
        <p class="text-gray-400 text-sm mb-4">Esta acción afectará ${filteredProducts.length} productos</p>
        <p class="text-red-400 text-sm mb-6">⚠️ Este cambio es permanente y modificará los valores base</p>
        <div class="flex gap-3">
          <button id="temp-cancel-base" class="flex-1 px-4 py-2 rounded-lg font-medium bg-gray-700 hover:bg-gray-600 transition-all">Cancelar</button>
          <button id="temp-confirm-base" class="flex-1 btn-primary px-4 py-2 rounded-lg font-medium text-gray-900 transition-all">Confirmar</button>
        </div>
      </div>
    `
    
    document.body.appendChild(tempDiv)
    
    document.getElementById('temp-cancel-base')!.addEventListener('click', () => tempDiv.remove())
    document.getElementById('temp-confirm-base')!.addEventListener('click', async () => {
      const confirmBtn = document.getElementById('temp-confirm-base')! as HTMLButtonElement
      confirmBtn.disabled = true
      confirmBtn.textContent = 'Aplicando...'
      
      const productsToUpdate = filteredProducts
      let updated = 0
      let errors = 0
      
      const multiplier = 1 + (adjustmentPercent / 100)
      

      
      for (const product of productsToUpdate) {
        const newPriceBs = currency === 'bs' 
          ? roundToNearest5(product.precioListaBs * multiplier)
          : product.precioListaBs
        
        const newPriceUsd = currency === 'usd'
          ? roundToNearest5(product.precioListaUsd * multiplier)
          : product.precioListaUsd
        
        try {
          const response = await fetch(`/api/products/${product.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...product,
              precioListaBs: newPriceBs,
              precioListaUsd: newPriceUsd
            })
          })
          
          if (response.ok) {
            updated++
          } else {
            errors++
          }
        } catch (error) {
          errors++
        }
      }
      
      tempDiv.remove()
      
      if (updated > 0) {
        if (currency === 'bs') {
          setBasePriceBs(0)
        } else {
          setBasePriceUsd(0)
        }
        // Guardar precios base en la base de datos
        saveBasePricesToDB()
        refreshData()
        showAlert(`✅ ${updated} precio${updated !== 1 ? 's' : ''} actualizado${updated !== 1 ? 's' : ''} (${sign}${adjustmentPercent}% en ${currencyName})`, 'Éxito')
      }
      
      if (errors > 0) {
        showAlert(`❌ ${errors} producto${errors !== 1 ? 's' : ''} no se pudieron actualizar`, 'Error')
      }
    })
  }

  async function applyBothBasePriceAdjustments() {
    const adjustmentBs = basePriceBs
    const adjustmentUsd = basePriceUsd
    
    if (adjustmentBs === 0 && adjustmentUsd === 0) {
      showAlert('Ambos ajustes son 0%, no hay cambios que aplicar', 'Información')
      return
    }
    
    // Confirmation
    const tempDiv = document.createElement('div')
    tempDiv.className = 'fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4'
    const signBs = adjustmentBs >= 0 ? '+' : ''
    const signUsd = adjustmentUsd >= 0 ? '+' : ''
    
    tempDiv.innerHTML = `
      <div class="card-glass rounded-2xl p-6 w-full max-w-md text-center">
        <svg class="w-16 h-16 mx-auto text-amber-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        <h3 class="text-xl font-semibold text-white mb-2">¿Ajustar ambos precios base?</h3>
        <p class="text-gray-300 mb-2">Aplicarás:</p>
        <p class="text-gray-300 mb-1">• Lista (Bs): <span class="text-amber-400 font-bold">${signBs}${adjustmentBs}%</span></p>
        <p class="text-gray-300 mb-4">• Lista ($): <span class="text-amber-400 font-bold">${signUsd}${adjustmentUsd}%</span></p>
        <p class="text-gray-400 text-sm mb-4">Esta acción afectará ${filteredProducts.length} productos</p>
        <p class="text-red-400 text-sm mb-6">⚠️ Este cambio es permanente y modificará los valores base</p>
        <div class="flex gap-3">
          <button id="temp-cancel-both" class="flex-1 px-4 py-2 rounded-lg font-medium bg-gray-700 hover:bg-gray-600 transition-all">Cancelar</button>
          <button id="temp-confirm-both" class="flex-1 btn-primary px-4 py-2 rounded-lg font-medium text-gray-900 transition-all">Confirmar</button>
        </div>
      </div>
    `
    
    document.body.appendChild(tempDiv)
    
    document.getElementById('temp-cancel-both')!.addEventListener('click', () => tempDiv.remove())
    document.getElementById('temp-confirm-both')!.addEventListener('click', async () => {
      const confirmBtn = document.getElementById('temp-confirm-both')! as HTMLButtonElement
      confirmBtn.disabled = true
      confirmBtn.textContent = 'Aplicando...'
      
      const productsToUpdate = filteredProducts
      let updated = 0
      let errors = 0
      
      const multiplierBs = 1 + (adjustmentBs / 100)
      const multiplierUsd = 1 + (adjustmentUsd / 100)
      

      
      for (const product of productsToUpdate) {
        const newPriceBs = roundToNearest5(product.precioListaBs * multiplierBs)
        const newPriceUsd = roundToNearest5(product.precioListaUsd * multiplierUsd)
        
        try {
          const response = await fetch(`/api/products/${product.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...product,
              precioListaBs: newPriceBs,
              precioListaUsd: newPriceUsd
            })
          })
          
          if (response.ok) {
            updated++
          } else {
            errors++
          }
        } catch (error) {
          errors++
        }
      }
      
      tempDiv.remove()
      
      if (updated > 0) {
        setBasePriceBs(0)
        setBasePriceUsd(0)
        // Guardar precios base en la base de datos
        saveBasePricesToDB()
        refreshData()
        showAlert(`✅ ${updated} producto${updated !== 1 ? 's' : ''} actualizado${updated !== 1 ? 's' : ''} (Bs: ${signBs}${adjustmentBs}%, $: ${signUsd}${adjustmentUsd}%)`, 'Éxito')
      }
      
      if (errors > 0) {
        showAlert(`❌ ${errors} producto${errors !== 1 ? 's' : ''} no se pudieron actualizar`, 'Error')
      }
    })
  }

  return (
    <div className="min-h-screen gradient-bg text-white p-4 md:p-6">
      <style jsx>{`
        .gradient-bg {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
        }
        .card-glass {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .input-dark {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .input-dark:focus {
          border-color: #f59e0b;
          outline: none;
          box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
        }
        .btn-primary {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        }
        .btn-primary:hover {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
        }
        .btn-danger {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        }
        .btn-danger:hover {
          background: linear-gradient(135deg, #f87171 0%, #ef4444 100%);
        }
        .price-up { color: #22c55e; }
        .price-down { color: #ef4444; }
      `}</style>

      {/* Header */}
      <header className="text-center mb-6">
        <h1 className="text-3xl md:text-4xl font-bold bg-linear-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
          Gestión de Precios
        </h1>
        <p className="text-gray-400 mt-2">Sistema de control de precios con impuestos y ajustes</p>
        
        {/* Tabs */}
        <div className="flex justify-center gap-2 mt-4 flex-wrap">
          <button
            onClick={() => setActiveTab('cauchos')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'cauchos' 
                ? 'bg-amber-600 text-gray-900' 
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            🚗 Cauchos
          </button>
          <button
            onClick={() => setActiveTab('baterias')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'baterias' 
                ? 'bg-amber-600 text-gray-900' 
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            🔋 Baterías
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => setShowAddListModal(true)}
              className="px-6 py-2 rounded-lg font-medium transition-all bg-green-600/20 text-green-400 hover:bg-green-600/40 border-2 border-green-600/50 border-dashed"
            >
              ➕ Agregar Lista
            </button>
          )}
        </div>
      </header>

      {/* Lock Button */}
      <button
        onClick={async () => {
          if (isAdmin) {
            if (await showConfirm('¿Cerrar sesión de administrador?', 'Cerrar Sesión')) {
              handleLogout()
            }
          } else {
            setShowAuthModal(true)
          }
        }}
        className="fixed top-4 right-4 p-3 rounded-full card-glass hover:bg-white/10 z-40 transition-all active:scale-95"
      >
        {isAdmin ? (
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
              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-amber-400">
                {isSuperAdmin ? 'Panel de Administración' : 'Panel de Usuarios Conectados'}
              </span>
            </div>
            <svg className={`w-6 h-6 text-gray-400 transform transition-transform ${showConfigPanel ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showConfigPanel && (
            <div className="card-glass rounded-2xl p-4 md:p-6 mt-4">
              <AdminPanel socket={socket} currentUser={{ ...currentUser, userType: isAdmin ? 'admin' : 'worker' }} />
              
              {isAdmin && (
                <>
                  <h2 className="text-lg font-semibold text-amber-400 mb-4 mt-8 border-t border-white/10 pt-6">Configuración Global</h2>
              
              {/* Tax Config */}
              <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-2">Impuesto (%)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                    className="input-dark rounded-lg px-3 py-2 w-32 text-white"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                  <button
                    onClick={saveTaxRate}
                    className="btn-primary px-4 py-2 rounded-lg font-medium text-gray-900 transition-all shadow-lg hover:shadow-amber-500/20"
                  >
                    Guardar
                  </button>
                  <span className="flex items-center text-xs text-gray-500 ml-2">
                    Impuesto actual: <span className="text-amber-400 ml-1">{taxRate}%</span>
                  </span>
                </div>
              </div>

              {/* Base Price Adjustments */}
              <div className="mb-6 border-t border-white/10 pt-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Ajuste de Precios Base</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="card-glass rounded-lg p-3">
                    <label className="block text-xs text-gray-400 mb-2">📊 Ajustar Lista (Bs)</label>
                    <div className="flex items-center gap-1 mb-2">
                      <button
                        onClick={() => adjustBasePriceValue('bs', -5)}
                        className="flex-1 px-2 py-1 rounded text-white bg-red-600/20 hover:bg-red-600/40 border border-red-600/50 text-xs font-medium"
                      >
                        -5%
                      </button>
                      <button
                        onClick={() => adjustBasePriceValue('bs', -1)}
                        className="flex-1 px-2 py-1 rounded text-white bg-red-600/20 hover:bg-red-600/40 border border-red-600/50 text-xs font-medium"
                      >
                        -1%
                      </button>
                      <button
                        onClick={() => adjustBasePriceValue('bs', -basePriceBs)}
                        className="flex-1 px-2 py-1 rounded text-white bg-gray-600/20 hover:bg-gray-600/40 border border-gray-600/50 text-xs font-medium"
                      >
                        0
                      </button>
                      <button
                        onClick={() => adjustBasePriceValue('bs', 1)}
                        className="flex-1 px-2 py-1 rounded text-white bg-green-600/20 hover:bg-green-600/40 border border-green-600/50 text-xs font-medium"
                      >
                        +1%
                      </button>
                      <button
                        onClick={() => adjustBasePriceValue('bs', 5)}
                        className="flex-1 px-2 py-1 rounded text-white bg-green-600/20 hover:bg-green-600/40 border border-green-600/50 text-xs font-medium"
                      >
                        +5%
                      </button>
                      <button
                        onClick={() => {
                          const newValue = basePriceBs + 5
                          setBasePriceBs(newValue)
                          setTimeout(() => saveBasePricesToDB(), 100)
                        }}
                        className="px-2 py-1 rounded text-white bg-amber-600/20 hover:bg-amber-600/40 border border-amber-600/50 text-xs font-medium"
                      >
                        +
                      </button>
                    </div>
                    <div className="text-center">
                      <p className={`text-xl font-bold ${basePriceBs > 0 ? 'price-up' : basePriceBs < 0 ? 'price-down' : 'text-amber-400'}`}>
                        {(basePriceBs >= 0 ? '+' : '')}{basePriceBs}%
                      </p>
                    </div>
                  </div>

                  <div className="card-glass rounded-lg p-3">
                    <label className="block text-xs text-gray-400 mb-2">💵 Ajustar Lista ($)</label>
                    <div className="flex items-center gap-1 mb-2">
                      <button
                        onClick={() => adjustBasePriceValue('usd', -5)}
                        className="flex-1 px-2 py-1 rounded text-white bg-red-600/20 hover:bg-red-600/40 border border-red-600/50 text-xs font-medium"
                      >
                        -5%
                      </button>
                      <button
                        onClick={() => adjustBasePriceValue('usd', -1)}
                        className="flex-1 px-2 py-1 rounded text-white bg-red-600/20 hover:bg-red-600/40 border border-red-600/50 text-xs font-medium"
                      >
                        -1%
                      </button>
                      <button
                        onClick={() => adjustBasePriceValue('usd', -basePriceUsd)}
                        className="flex-1 px-2 py-1 rounded text-white bg-gray-600/20 hover:bg-gray-600/40 border border-gray-600/50 text-xs font-medium"
                      >
                        0
                      </button>
                      <button
                        onClick={() => adjustBasePriceValue('usd', 1)}
                        className="flex-1 px-2 py-1 rounded text-white bg-green-600/20 hover:bg-green-600/40 border border-green-600/50 text-xs font-medium"
                      >
                        +1%
                      </button>
                      <button
                        onClick={() => adjustBasePriceValue('usd', 5)}
                        className="flex-1 px-2 py-1 rounded text-white bg-green-600/20 hover:bg-green-600/40 border border-green-600/50 text-xs font-medium"
                      >
                        +5%
                      </button>
                      <button
                        onClick={() => {
                          const newValue = basePriceUsd + 5
                          setBasePriceUsd(newValue)
                          setTimeout(() => saveBasePricesToDB(), 100)
                        }}
                        className="px-2 py-1 rounded text-white bg-amber-600/20 hover:bg-amber-600/40 border border-amber-600/50 text-xs font-medium"
                      >
                        +
                      </button>
                    </div>
                    <div className="text-center">
                      <p className={`text-xl font-bold ${basePriceUsd > 0 ? 'price-up' : basePriceUsd < 0 ? 'price-down' : 'text-amber-400'}`}>
                        {(basePriceUsd >= 0 ? '+' : '')}{basePriceUsd}%
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-center">
                  <button
                    onClick={applyBothBasePriceAdjustments}
                    className="btn-primary px-6 py-2 rounded-lg font-medium text-gray-900 transition-all shadow-lg hover:shadow-amber-500/20"
                  >
                    Aplicar Ambos Ajustes
                  </button>
                  <p className="text-xs text-amber-400 mt-2">⚠️ Esta acción modificará permanentemente los precios base de todos los productos en esta lista</p>
                </div>
              </div>

              {/* Global Adjustments */}
              <div className="border-t border-white/10 pt-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Ajustes Globales por Tipo de Precio</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { key: 'cashea', label: 'Cashea (Bs)' },
                    { key: 'transferencia', label: 'Transferencia (Bs)' },
                    { key: 'divisas', label: 'Divisas ($)' },
                    { key: 'custom', label: 'Divisas en Fisico' }
                  ].map(({ key, label }) => (
                    <div key={key} className="card-glass rounded-lg p-3">
                      <label className="block text-xs text-gray-400 mb-1">{label}</label>
                      <div className="flex gap-1 mb-2">
                        <button
                          onClick={() => {
                            const current = globalAdjustments[activeTab]?.[key] || 0
                            const newAdjustments = { ...globalAdjustments }
                            newAdjustments[activeTab] = { ...newAdjustments[activeTab], [key]: current - 1 }
                            setGlobalAdjustments(newAdjustments)
                            // Guardar automáticamente
                            setTimeout(() => saveGlobalAdjustmentsToDB(), 100)
                          }}
                          className="input-dark px-2 py-1 rounded text-white hover:bg-white/10"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                          </svg>
                        </button>
                        <input
                          type="number"
                          value={globalAdjustments[activeTab]?.[key] || 0}
                          onChange={(e) => {
                            const newAdjustments = { ...globalAdjustments }
                            newAdjustments[activeTab] = { ...newAdjustments[activeTab], [key]: parseFloat(e.target.value) || 0 }
                            setGlobalAdjustments(newAdjustments)
                            // Guardar automáticamente
                            setTimeout(() => saveGlobalAdjustmentsToDB(), 100)
                          }}
                          className="input-dark rounded px-2 py-1 w-16 text-white text-sm text-center"
                          step="0.1"
                        />
                        <button
                          onClick={() => {
                            const current = globalAdjustments[activeTab]?.[key] || 0
                            const newAdjustments = { ...globalAdjustments }
                            newAdjustments[activeTab] = { ...newAdjustments[activeTab], [key]: current + 1 }
                            setGlobalAdjustments(newAdjustments)
                            // Guardar automáticamente
                            setTimeout(() => saveGlobalAdjustmentsToDB(), 100)
                          }}
                          className="input-dark px-2 py-1 rounded text-white hover:bg-white/10"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                        <button
                          onClick={() => saveGlobalAdjustment(key)}
                          className="btn-primary px-3 py-1 rounded text-xs font-medium text-gray-900"
                        >
                          Aplicar
                        </button>
                      </div>
                      <div className="text-center">
                        <p className={`text-xl font-bold ${globalAdjustments[activeTab]?.[key] > 0 ? 'price-up' : globalAdjustments[activeTab]?.[key] < 0 ? 'price-down' : 'text-amber-400'}`}>
                          {(globalAdjustments[activeTab]?.[key] >= 0 ? '+' : '')}{globalAdjustments[activeTab]?.[key] || 0}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 text-center">
                  <button
                    onClick={() => {
                      // Guardar todos los ajustes globales actuales
                      saveGlobalAdjustmentsToDB()
                      alert('✅ Todos los ajustes globales han sido guardados')
                    }}
                    className="btn-primary px-6 py-2 rounded-lg font-medium text-gray-900"
                  >
                    Aplicar Todos los Ajustes Globales
                  </button>
                  <p className="text-xs text-gray-400 mt-2">Los nuevos cauchos heredan automáticamente estos ajustes globales</p>
                </div>
              </div>
            </>
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
              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="text-lg font-semibold text-amber-400">
                Agregar Nuevo {activeTab === 'cauchos' ? 'Caucho' : 'Batería'}
              </span>
            </div>
            <svg className={`w-6 h-6 text-gray-400 transform transition-transform ${showAddPanel ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showAddPanel && (
            <div className="card-glass rounded-2xl p-4 md:p-6 mt-4">
              <h2 className="text-lg font-semibold text-amber-400 mb-4">Agregar Nuevo Producto</h2>
              
              <div className="mb-4 flex gap-2 flex-wrap">
                <ExcelImport onImport={importProducts} />
                <PdfImportExport 
                  products={products} 
                  activeTab={activeTab} 
                  onImport={importProducts}
                />
                <button
                  onClick={exportToExcel}
                  className="btn-primary px-4 py-2 rounded-lg font-medium text-gray-900 transition-all shadow-lg hover:shadow-amber-500/20 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Exportar Excel
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
                    onChange={(e) => setAddForm({ ...addForm, precioListaBs: parseFloat(e.target.value) || 0 })}
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
                    onChange={(e) => setAddForm({ ...addForm, precioListaUsd: parseFloat(e.target.value) || 0 })}
                    className="input-dark rounded-lg px-3 py-2 w-full text-white"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div className="flex items-end">
                  <button type="submit" className="btn-primary w-full px-4 py-2 rounded-lg font-medium text-gray-900 transition-all shadow-lg hover:shadow-amber-500/20">
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
          <h2 className="text-lg font-semibold text-amber-400 flex items-center gap-2">
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
            filteredProducts.map((product) => (
              <MobileProductCard
                key={product.id}
                product={product}
                isAdmin={isAdmin}
                getEffectiveAdjustment={getEffectiveAdjustment}
                calculatePrice={calculatePrice}
                openEditModal={openEditModal}
                openDeleteModal={openDeleteModal}
              />
            ))
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="border-b border-white/10 text-left">
                <th className="pb-3 text-sm font-medium text-gray-400">Producto</th>
                <th className="pb-3 text-sm font-medium text-amber-400 text-right">Transferencia (Bs)</th>
                  <th className="pb-3 text-sm font-medium text-amber-400 text-right">Cashea (Bs)</th>
                  <th className="pb-3 text-sm font-medium text-amber-400 text-right">Divisas ($)</th>
                  <th className="pb-3 text-sm font-medium text-amber-400 text-right">Divisas en Fisico</th>
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
                    getEffectiveAdjustment={getEffectiveAdjustment}
                    calculatePrice={calculatePrice}
                    openEditModal={openEditModal}
                    openDeleteModal={openDeleteModal}
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
          <div className="card-glass rounded-2xl p-6 w-full max-w-2xl">
            <h3 className="text-xl font-semibold text-amber-400 mb-4">Editar Producto</h3>
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
                  <input
                    type="number"
                    value={editForm.precioListaBs}
                    onChange={(e) => setEditForm({ ...editForm, precioListaBs: parseFloat(e.target.value) || 0 })}
                    className="input-dark rounded-lg px-3 py-2 w-full text-white"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Precio Lista ($)</label>
                  <input
                    type="number"
                    value={editForm.precioListaUsd}
                    onChange={(e) => setEditForm({ ...editForm, precioListaUsd: parseFloat(e.target.value) || 0 })}
                    className="input-dark rounded-lg px-3 py-2 w-full text-white"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>
              
              <div className="border-t border-white/10 pt-4 mb-4">
                <h4 className="text-sm font-semibold text-gray-300 mb-3">Ajustes Individuales (opcional)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { key: 'adjustmentCashea', label: 'Cashea (Bs) %' },
                    { key: 'adjustmentTransferencia', label: 'Transferencia (Bs) %' },
                    { key: 'adjustmentDivisas', label: 'Divisas ($) %' },
                    { key: 'adjustmentCustom', label: 'Divisas en Fisico %' }
                  ].map(({ key, label }) => (
                    <div key={key} className="card-glass rounded-lg p-3">
                      <label className="block text-xs text-gray-400 mb-1">{label}</label>
                      <input
                        type="number"
                        value={editForm[key as keyof typeof editForm]}
                        onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                        className="input-dark rounded px-3 py-2 w-full text-white text-sm"
                        step="0.1"
                        placeholder="Global"
                      />
                    </div>
                  ))}
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
                  className="flex-1 btn-primary px-4 py-2 rounded-lg font-medium text-gray-900"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-glass rounded-2xl p-6 w-full max-w-sm text-center">
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
          <div className="card-glass rounded-2xl p-6 w-full max-w-md">
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