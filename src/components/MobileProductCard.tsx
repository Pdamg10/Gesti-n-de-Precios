'use client'

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

interface MobileProductCardProps {
  product: Product
  isAdmin: boolean
  getEffectiveAdjustment: (product: Product, type: string) => number
  calculatePrice: (basePrice: number, adjustment: number) => number
  openEditModal: (product: Product) => void
  openDeleteModal: (product: Product) => void
}

export default function MobileProductCard({
  product,
  isAdmin,
  getEffectiveAdjustment,
  calculatePrice,
  openEditModal,
  openDeleteModal
}: MobileProductCardProps) {
  return (
    <div className="card-glass rounded-xl p-5 mb-4 border border-white/10 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-bl-full -mr-4 -mt-4 pointer-events-none" />
      
      {/* Header: Product Info & Actions */}
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <h3 className="text-2xl font-bold text-amber-400 mb-1">{product.medida}</h3>
          <p className="text-lg text-gray-300 font-medium">{product.type}</p>
        </div>
        
        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={() => openEditModal(product)}
              className="p-3 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 transition-colors"
              aria-label="Editar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => openDeleteModal(product)}
              className="p-3 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-400 transition-colors"
              aria-label="Eliminar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Prices Grid */}
      <div className="grid grid-cols-1 gap-4">
        {['transferencia', 'cashea', 'divisas', 'custom'].map((type) => {
          const adjustment = getEffectiveAdjustment(product, type)
          const basePrice = (type === 'divisas' || type === 'custom') ? product.precioListaUsd : product.precioListaBs
          const finalPrice = calculatePrice(basePrice, adjustment)
          const isIndividual = (product as any)[`adjustment${type.charAt(0).toUpperCase() + type.slice(1)}`] !== undefined && (product as any)[`adjustment${type.charAt(0).toUpperCase() + type.slice(1)}`] !== null
          const isUsd = type === 'divisas' || type === 'custom'
          
          let label = ''
          if (type === 'transferencia') label = 'Transferencia (Bs)'
          else if (type === 'cashea') label = 'Cashea (Bs)'
          else if (type === 'divisas') label = 'Divisas ($)'
          else label = 'Divisas en Fisico'

          return (
            <div key={type} className="bg-black/20 rounded-lg p-3 border border-white/5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400 text-sm font-medium uppercase tracking-wide">{label}</span>
                <div className={`flex items-center gap-2 ${adjustment < 0 ? 'text-red-400' : adjustment > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                  {isIndividual && <span className="text-amber-400 text-xs" title="Ajuste individual">●</span>}
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    adjustment < 0 
                      ? 'bg-red-500/10 border border-red-500/30' 
                      : adjustment > 0 
                        ? 'bg-green-500/10 border border-green-500/30'
                        : 'bg-gray-500/10 border border-gray-500/30'
                  }`}>
                    {(adjustment >= 0 ? '+' : '')}{adjustment}%
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between items-end">
                <div className="text-xs text-gray-600">
                  Base: {isUsd ? '$' : 'Bs. '}{basePrice.toFixed(2)}
                </div>
                <div className="text-2xl font-bold font-mono text-white">
                  {isUsd ? '$' : 'Bs. '}{finalPrice.toFixed(2)}
                  <span className="text-xs text-gray-500 ml-1 font-sans font-normal">(Inc. IVA)</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-3 border-t border-white/10 flex justify-between text-xs text-gray-500">
        <div>Lista (Bs): <span className="text-gray-300 font-mono">Bs. {product.precioListaBs.toFixed(2)}</span></div>
        <div>Lista ($): <span className="text-gray-300 font-mono">${product.precioListaUsd.toFixed(2)}</span></div>
      </div>
    </div>
  )
}
