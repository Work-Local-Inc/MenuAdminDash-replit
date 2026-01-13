import { SupabaseClient } from '@supabase/supabase-js'

export type SupportedLanguage = 'en' | 'fr'

export interface MenuFetchOptions {
  restaurantId: number
  language?: string
  activeItemsOnly?: boolean
  useCache?: boolean
}

export interface MenuFetchResult {
  data: any
  error: Error | null
}

export function validateLanguageCode(language: string): SupportedLanguage {
  const normalized = language?.toLowerCase().trim()
  if (normalized === 'en' || normalized === 'fr') {
    return normalized
  }
  return 'en'
}

export async function fetchRestaurantMenu(
  supabase: SupabaseClient | any,
  options: MenuFetchOptions
): Promise<MenuFetchResult> {
  const {
    restaurantId,
    language = 'en',
    activeItemsOnly = true,
    useCache = true,
  } = options

  const validatedLanguage = validateLanguageCode(language)

  try {
    if (useCache) {
      const { data, error } = await supabase
        .schema('menuca_v3')
        .rpc('get_restaurant_menu_cached', {
          p_restaurant_id: restaurantId,
          p_language_code: validatedLanguage,
        })

      if (error) {
        console.error('[Menu Fetch] Cache error, falling back to live:', error.message)
        return fetchLiveMenu(supabase, restaurantId, validatedLanguage, activeItemsOnly)
      }

      return { data, error: null }
    }

    return fetchLiveMenu(supabase, restaurantId, validatedLanguage, activeItemsOnly)
  } catch (err: any) {
    console.error('[Menu Fetch] Unexpected error:', err)
    return { data: null, error: err }
  }
}

async function fetchLiveMenu(
  supabase: SupabaseClient | any,
  restaurantId: number,
  language: SupportedLanguage,
  activeItemsOnly: boolean
): Promise<MenuFetchResult> {
  const { data, error } = await supabase
    .schema('menuca_v3')
    .rpc('get_restaurant_menu', {
      p_restaurant_id: restaurantId,
      p_language_code: language,
      p_active_items_only: activeItemsOnly,
    })

  if (error) {
    return { data: null, error }
  }

  return { data, error: null }
}

export async function fetchMenuForCustomer(
  supabase: SupabaseClient | any,
  restaurantId: number,
  language?: string
): Promise<MenuFetchResult> {
  return fetchRestaurantMenu(supabase, {
    restaurantId,
    language,
    activeItemsOnly: true,
    useCache: true,
  })
}

export async function fetchMenuForAdmin(
  supabase: SupabaseClient | any,
  restaurantId: number,
  language?: string
): Promise<MenuFetchResult> {
  return fetchRestaurantMenu(supabase, {
    restaurantId,
    language,
    activeItemsOnly: false,
    useCache: false,
  })
}
