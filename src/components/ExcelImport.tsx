'use client'

import { useState } from 'react'
import * as XLSX from 'xlsx'

interface ExtractedProduct {
  type: string
  medida: string
  precio: number
  selected: boolean
}

interface ExcelImportProps {
  onImport: (products: ExtractedProduct[]) => void
}

export default function ExcelImport({ onImport }: ExcelImportProps) {
  const [loading, setLoading] = useState(false)

  const processExcelFile = async (file: File): Promise<ExtractedProduct[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          
          // Get first sheet
          const firstSheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[firstSheetName]
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
          
          const products: ExtractedProduct[] = []
          const foundMatches = new Set()
          
          // Strategy: Try to detect columns
          let headerRow = -1
          let colType = -1
          let colMedida = -1
          let colPrecio = -1
          
          // Search for headers in first 5 rows
          for (let i = 0; i < Math.min(5, jsonData.length); i++) {
            const row = jsonData[i]
            if (!Array.isArray(row)) continue
            
            row.forEach((cell, colIdx) => {
              if (!cell) return
              const cellStr = String(cell).toLowerCase().trim()
              
              // Detect type/brand column
              if (cellStr.match(/tipo|marca|brand|descripci[oó]n|producto|caucho|bateria|nombre/i)) {
                colType = colIdx
                headerRow = i
              }
              
              // Detect size/measure column
              if (cellStr.match(/medida|tama[ñn]o|size|modelo|amperaje|dimensi[oó]n/i)) {
                colMedida = colIdx
                headerRow = i
              }
              
              // Detect price column
              if (cellStr.match(/precio|price|costo|cost|valor|value|lista/i)) {
                colPrecio = colIdx
                headerRow = i
              }
            })
            
            if (headerRow >= 0 && colType >= 0) break
          }
          
          // If we found headers, parse from header row + 1
          if (headerRow >= 0 && colType >= 0) {
            for (let i = headerRow + 1; i < jsonData.length; i++) {
              const row = jsonData[i]
              if (!Array.isArray(row) || row.length === 0) continue
              
              let type = colType >= 0 && row[colType] ? String(row[colType]).trim() : ''
              let medida = colMedida >= 0 && row[colMedida] ? String(row[colMedida]).trim() : ''
              let precio = 0
              
              // Extract price
              if (colPrecio >= 0 && row[colPrecio]) {
                const priceStr = String(row[colPrecio]).replace(/[^0-9.,]/g, '').replace(',', '.')
                precio = parseFloat(priceStr) || 0
              }
              
              // If no medida column detected, try to extract from type
              if (!medida && type) {
                const sizeMatch = type.match(/(\d{2,3})[\s\.\/-]*(\d{2})[\s\.\/-]*[RrDd]?[\s\.\/-]*(\d{2})/)
                if (sizeMatch) {
                  medida = `${sizeMatch[1]}/${sizeMatch[2]}R${sizeMatch[3]}`.toUpperCase()
                  type = type.replace(sizeMatch[0], '').trim()
                }
              }
              
              // Clean type
              type = type.replace(/^(Cauchos?|Llanta|Neumático|Batería|Battery)\s*[-:]?\s*/gi, '')
              type = type.replace(/\s+/g, ' ').trim()
              
              if (type.length > 1 || medida.length > 1) {
                const key = `${medida}-${type}-${precio}`
                if (!foundMatches.has(key)) {
                  foundMatches.add(key)
                  products.push({ 
                    type: type || 'Sin marca', 
                    medida: medida || 'Sin medida', 
                    precio: precio, 
                    selected: true 
                  })
                }
              }
            }
          } else {
            // No clear headers found, try to parse each row intelligently
            for (let i = 0; i < jsonData.length; i++) {
              const row = jsonData[i]
              if (!Array.isArray(row) || row.length === 0) continue
              
              let type = null
              let medida = null
              let precio = null
              
              // Try to identify each cell
              for (const cell of row) {
                if (!cell) continue
                const cellStr = String(cell).trim()
                
                // Check if it's a size
                const sizeMatch = cellStr.match(/(\d{2,3})[\s\.\/-]*(\d{2})[\s\.\/-]*[RrDd]?[\s\.\/-]*(\d{2})/)
                if (sizeMatch && !medida) {
                  medida = `${sizeMatch[1]}/${sizeMatch[2]}R${sizeMatch[3]}`.toUpperCase()
                  continue
                }
                
                // Check if it's a price
                const priceMatch = cellStr.match(/^[\$\s]*(\d+(?:[.,]\d{1,2})?)[\s]*(?:Bs|USD|\$)?$/i)
                if (priceMatch && !precio) {
                  const p = parseFloat(priceMatch[1].replace(',', '.'))
                  if (p > 10 && p < 1000000) {
                    precio = p
                    continue
                  }
                }
                
                // Otherwise it's likely the type/brand
                if (!type && /[A-Za-zÁ-úñÑ]/.test(cellStr) && cellStr.length > 1) {
                  type = cellStr
                }
              }
              
              if (type || medida) {
                const key = `${medida || 'Sin medida'}-${type || 'Sin marca'}-${precio || 0}`
                if (!foundMatches.has(key)) {
                  foundMatches.add(key)
                  products.push({ 
                    type: type || 'Sin marca', 
                    medida: medida || 'Sin medida', 
                    precio: precio || 0, 
                    selected: true 
                  })
                }
              }
            }
          }
          
          resolve(products)
        } catch (error) {
          reject(error)
        }
      }
      
      reader.onerror = () => reject(new Error('Error reading file'))
      reader.readAsArrayBuffer(file)
    })
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ]
    
    const isValid = validTypes.includes(file.type) || file.name.match(/\.(xlsx|xls|csv)$/i)
    
    if (!isValid) {
      alert('Por favor selecciona un archivo Excel válido (.xlsx, .xls, .csv)')
      return
    }
    
    setLoading(true)
    
    try {
      const extractedProducts = await processExcelFile(file)
      
      if (extractedProducts.length > 0) {
        onImport(extractedProducts)
        alert(`${extractedProducts.length} productos detectados en Excel`)
      } else {
        alert('No se detectaron productos en el archivo Excel')
      }
    } catch (error) {
      console.error('Error processing Excel:', error)
      alert('Error al procesar el archivo Excel')
    } finally {
      setLoading(false)
      // Reset file input
      event.target.value = ''
    }
  }

  return (
    <div>
      <input
        type="file"
        id="excel-file-input"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileSelect}
        className="hidden"
        disabled={loading}
      />
      <button
        onClick={() => document.getElementById('excel-file-input')?.click()}
        disabled={loading}
        className="btn-primary px-4 py-2 rounded-lg font-medium text-gray-900 transition-all flex items-center gap-2 disabled:opacity-50"
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
            Procesando...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Importar Excel
          </>
        )}
      </button>
    </div>
  )
}