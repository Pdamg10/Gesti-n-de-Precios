'use client'

import { memo } from 'react'
import { roundToNearest5, formatCurrency } from '@/lib/utils'

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
  adjustmentPagoMovil?: number
  createdAt: string
  updatedAt: string
}

interface ProductRowProps {
  product: Product
  isAdmin: boolean
  calculatePrice: (basePrice: number, adjustment: number, currency?: 'bs' | 'usd', applyTax?: boolean) => number
  openEditModal: (product: Product) => void
  openDeleteModal: (product: Product) => void
  currentDefaults: { [key: string]: number }
  currentGlobals: { [key: string]: number }
  priceColumns: { key: string, label: string, base?: 'bs' | 'usd', applyTax?: boolean }[]
  tempGlobalDiscounts?: { bs: number, usd: number }
  taxRate?: number
  exchangeRate?: number
  viewCurrency?: 'bs' | 'usd'
}

const ProductRow = memo(function ProductRow({
  product,
  isAdmin,
  calculatePrice,
  openEditModal,
  openDeleteModal,
  currentDefaults,
  currentGlobals,
  priceColumns,
  tempGlobalDiscounts = { bs: 0, usd: 0 },
  taxRate = 16,
  exchangeRate = 60,
  viewCurrency = 'bs'
}: ProductRowProps) {
  const getEffectiveAdjustment = (type: string) => {
    const individualKey = `adjustment${type.charAt(0).toUpperCase() + type.slice(1)}`
    const individualAdjustment = (product as any)[individualKey]

    // Treat 0 as "Inherit" to allow Global unification to work on existing products
    // (User requested that Baterías list matches Cauchos list automatically)
    if (individualAdjustment !== undefined && individualAdjustment !== null && individualAdjustment !== '' && individualAdjustment !== 0) {
      return parseFloat(individualAdjustment)
    }

    return currentGlobals?.[type] || currentDefaults?.[type] || 0
  }

  const getDisplayedBasePrice = (currency: 'bs' | 'usd') => {
    // Always derive base price relative to USD if currency is BS
    const base = currency === 'bs'
      ? (product.precioListaUsd * exchangeRate)
      : product.precioListaUsd

    // Discount logic moved to render for strict separation
    return Math.max(0, Math.round(base * 100) / 100)
  }

  return (
    <tr key={product.id} className="border-b border-white/10 hover:bg-white/10 transition-colors group">
      <td className="py-3 pr-3">
        <div className="font-mono text-white font-bold text-lg drop-shadow-sm">{product.medida}</div>
        <div className="text-sm text-white/90 font-medium">{product.type}</div>
      </td>
      {(priceColumns || []).map(({ key: type, base, applyTax }) => {
        const adjustment = getEffectiveAdjustment(type)
        const nativeCurrency = base || 'usd' // The actual currency of this column
        const isNativeUsd = nativeCurrency === 'usd'

        // 1. Get raw base price in display currency ($)
        const displayBasePrice = getDisplayedBasePrice('usd')

        // 2. Get discount and adjustments
        // Descuento = Global Discount (tempGlobalDiscounts)
        const globalDiscount = tempGlobalDiscounts[type] || 0
        // Aumento = Column Adjustment (getEffectiveAdjustment)
        const increaseAdjustment = getEffectiveAdjustment(type)

        // 3. Calculate final price
        const shouldApplyTax = applyTax !== undefined ? applyTax : (nativeCurrency === 'bs')

        // Native base for calculation (USD or Bs based on configuration)
        const calculationBase = nativeCurrency === 'bs'
          ? (product.precioListaUsd * exchangeRate)
          : product.precioListaUsd

        // Apply global discount first
        console.log(`[ProductRow] ${type}: Base=${calculationBase}, Discount=${globalDiscount}, Adjust=${increaseAdjustment}`);
        let priceAfterDiscount = calculationBase
        if (globalDiscount !== 0) {
          priceAfterDiscount = calculationBase * (1 + globalDiscount / 100)
        }

        // Then apply column adjustment (Aumento)
        // Note: Logic suggests "Aumento" is the per-column adjustment.
        // We use calculatePrice to defer to the centralized logic if needed, but here we want to be explicit.
        // calculatePrice usually does base * (1+adj/100).
        // Let's chain them: Base -> Discount -> Increase.

        let finalPrice = priceAfterDiscount
        if (increaseAdjustment !== 0) {
          finalPrice = finalPrice * (increaseAdjustment / 100)
        }

        if (shouldApplyTax) {
          finalPrice = finalPrice * (1 + taxRate / 100)
        }

        // Apply Tax if needed (logic matches calculatePrice internal structure usually)
        // If calculatePrice encapsulates all of this, we might need to update it? 
        // But for now, let's keep it explicit in the row for display.

        // Actually, let's rely on standard logic for the FINAL number to remain "correct" in system terms,
        // but we just show the breakdown.
        // BUT, getDisplayedBasePrice used to include discount. We need to strip that from the helper function below.

        // Re-calcuating final manually to ensure "Descuento" + "Aumento" logic lines up.
        // If globalDiscount is stored as negative (e.g. -5%), it works.
        // If increaseAdjustment is stored as positive (e.g. 5%), it works.
        const nativeFinalPrice = Math.max(0, finalPrice)

        const defaultAdj = currentDefaults?.[type] || 0
        const isIndividual = Math.abs(increaseAdjustment - defaultAdj) > 0.01

        const currencySymbol = nativeCurrency === 'bs' ? 'Bs' : '$'
        const baseSymbol = '$'

        return (
          <td key={type} className="py-3 px-2 text-right">
            <div className="text-sm text-white/70 mb-1 font-medium">
              Base: {baseSymbol}{formatCurrency(displayBasePrice * (increaseAdjustment !== 0 ? increaseAdjustment / 100 : 1))}
            </div>

            {/* Descuento - Always Visible */}
            <div className={`text-sm mb-1 font-bold ${globalDiscount < 0 ? 'text-red-400' : globalDiscount > 0 ? 'text-green-400' : 'text-white/60'}`}>
              Descuento {globalDiscount > 0 ? '+' : ''}{globalDiscount}%
            </div>

            {/* Aumento / Descuento Logic - Admin Only */}
            {isAdmin && isIndividual && (
              <div className="text-xs text-amber-500 font-bold mb-1">
                (Ajuste Manual)
              </div>
            )}

            {isAdmin && (
              <>
                {increaseAdjustment < 100 ? (
                  <div className="text-sm mb-1 font-bold text-green-400">
                    Descuento {Math.round(100 - increaseAdjustment)}%
                    <span className="text-xs opacity-70 font-normal ml-1">
                      (Cobra {increaseAdjustment}%)
                    </span>
                  </div>
                ) : increaseAdjustment > 100 ? (
                  <div className="text-sm mb-1 font-bold text-blue-400">
                    Aumento +{Math.round(increaseAdjustment - 100)}%
                    <span className="text-xs opacity-70 font-normal ml-1">
                      (x{increaseAdjustment / 100})
                    </span>
                  </div>
                ) : (
                  <div className="text-sm mb-1 font-bold text-white/40">
                    Precio de Lista
                  </div>
                )}
              </>
            )}

            <div className="font-mono text-lg font-black text-white drop-shadow-sm mt-1">
              {shouldApplyTax ? 'Total + IVA:' : 'Total:'}
              <span className="text-yellow-400 ml-1">{currencySymbol}{formatCurrency(nativeFinalPrice)}</span>
            </div>

            {/* Dual Currency Display */}
            <div className="text-xs text-white/50 font-medium mt-1">
              {nativeCurrency === 'bs' ? (
                // If Base is Bs, show USD
                `Ref: $${formatCurrency(nativeFinalPrice / exchangeRate)}`
              ) : (
                // If Base is USD, show Bs
                `Ref: Bs${formatCurrency(nativeFinalPrice * exchangeRate)}`
              )}
            </div>
          </td>
        )
      })}
      <td className="py-3 px-2 text-right font-mono text-sm text-white font-semibold">${formatCurrency(getDisplayedBasePrice('usd'))}</td>
      {isAdmin && (
        <td className="py-3 pl-2 text-center">
          <div className="flex justify-center gap-1">
            <button
              onClick={() => openEditModal(product)}
              className="p-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 transition-colors"
              title="Editar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => openDeleteModal(product)}
              className="p-2 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-400 transition-colors"
              title="Eliminar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </td>
      )}
    </tr>
  )
})

export default ProductRow
