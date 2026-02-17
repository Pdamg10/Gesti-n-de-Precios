import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Create an admin client if the service key is available (Server-side only)
const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey) 
  : supabase


// Database helper functions
export const db = {
  // Products
  async getProducts() {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .order('createdAt', { ascending: false })
    
    if (error) throw error
    return data
  },

  async createProduct(product: any) {
    const { data, error } = await supabaseAdmin
      .from('products')
      .insert([product])
      .select()
    
    if (error) throw error
    return data[0]
  },

  async updateProduct(id: string, updates: any) {
    const { data, error } = await supabaseAdmin
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
    
    if (error) throw error
    return data[0]
  },

  async deleteProduct(id: string) {
    const { error } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Settings
  async getSettings() {
    const { data, error } = await supabaseAdmin
      .from('settings')
      .select('*')
      .order('settingKey', { ascending: true })
    
    if (error) throw error
    return data
  },

  async createSetting(setting: any) {
    const { data, error } = await supabaseAdmin
      .from('settings')
      .insert([setting])
      .select()
    
    if (error) throw error
    return data[0]
  },

  async updateSetting(key: string, updates: any) {
    const { data, error } = await supabaseAdmin
      .from('settings')
      .update(updates)
      .eq('settingKey', key)
      .select()
    
    if (error) throw error
    return data[0]
  },

  async upsertSetting(setting: any) {
    const { data, error } = await supabaseAdmin
      .from('settings')
      .upsert(setting, { onConflict: 'settingKey' })
      .select()
    
    if (error) throw error
    return data[0]
  },

  async deleteSetting(key: string) {
    const { error } = await supabaseAdmin
      .from('settings')
      .delete()
      .eq('settingKey', key)
    
    if (error) throw error
  }
}