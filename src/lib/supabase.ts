import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://spyodxdqweqcxhcauqyq.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_XEp4zZ6afjpX0Edw356Mtw_q5i17QLE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database helper functions
export const db = {
  // Products
  async getProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('createdAt', { ascending: false })
    
    if (error) throw error
    return data
  },

  async createProduct(product: any) {
    const { data, error } = await supabase
      .from('products')
      .insert([product])
      .select()
    
    if (error) throw error
    return data[0]
  },

  async updateProduct(id: string, updates: any) {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
    
    if (error) throw error
    return data[0]
  },

  async deleteProduct(id: string) {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Settings
  async getSettings() {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .order('settingKey', { ascending: true })
    
    if (error) throw error
    return data
  },

  async createSetting(setting: any) {
    const { data, error } = await supabase
      .from('settings')
      .insert([setting])
      .select()
    
    if (error) throw error
    return data[0]
  },

  async updateSetting(key: string, updates: any) {
    const { data, error } = await supabase
      .from('settings')
      .update(updates)
      .eq('settingKey', key)
      .select()
    
    if (error) throw error
    return data[0]
  },

  async upsertSetting(setting: any) {
    const { data, error } = await supabase
      .from('settings')
      .upsert(setting, { onConflict: 'settingKey' })
      .select()
    
    if (error) throw error
    return data[0]
  }
}