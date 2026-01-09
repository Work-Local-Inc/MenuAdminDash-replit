declare global {
  interface Window {
    gtag: (...args: any[]) => void
    dataLayer: any[]
  }
}

type GA4EventName = 
  | 'page_view'
  | 'view_item'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'begin_checkout'
  | 'add_payment_info'
  | 'purchase'

interface GA4EventParams {
  currency?: string
  value?: number
  items?: Array<{
    item_id: string | number
    item_name: string
    item_category?: string
    price?: number
    quantity?: number
  }>
  payment_type?: string
  transaction_id?: string
  [key: string]: any
}

let isGtagReady = false
let isAnalyticsDisabled = false
let pendingEvents: Array<{ name: GA4EventName; params: GA4EventParams }> = []

export function setGtagReady(ready: boolean) {
  isGtagReady = ready
  isAnalyticsDisabled = false
  if (ready && pendingEvents.length > 0) {
    pendingEvents.forEach(({ name, params }) => {
      sendEvent(name, params)
    })
    pendingEvents = []
  }
}

export function setAnalyticsDisabled() {
  isAnalyticsDisabled = true
  isGtagReady = false
  pendingEvents = []
}

export function isAnalyticsActive() {
  return isGtagReady && !isAnalyticsDisabled
}

function sendEvent(name: GA4EventName, params: GA4EventParams) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', name, params)
  }
}

export function trackEvent(name: GA4EventName, params: GA4EventParams = {}) {
  if (isAnalyticsDisabled) {
    return
  }
  if (!isGtagReady) {
    pendingEvents.push({ name, params })
    return
  }
  sendEvent(name, params)
}

export function trackPageView(page_path: string, page_title?: string) {
  trackEvent('page_view', {
    page_path,
    page_title,
  })
}

export function trackViewItem(
  itemId: number | string,
  itemName: string,
  price: number,
  category?: string
) {
  trackEvent('view_item', {
    currency: 'CAD',
    value: price,
    items: [{
      item_id: String(itemId),
      item_name: itemName,
      item_category: category,
      price,
      quantity: 1,
    }],
  })
}

export function trackAddToCart(
  itemId: number | string,
  itemName: string,
  price: number,
  quantity: number = 1,
  category?: string
) {
  trackEvent('add_to_cart', {
    currency: 'CAD',
    value: price * quantity,
    items: [{
      item_id: String(itemId),
      item_name: itemName,
      item_category: category,
      price,
      quantity,
    }],
  })
}

export function trackRemoveFromCart(
  itemId: number | string,
  itemName: string,
  price: number,
  quantity: number = 1
) {
  trackEvent('remove_from_cart', {
    currency: 'CAD',
    value: price * quantity,
    items: [{
      item_id: String(itemId),
      item_name: itemName,
      price,
      quantity,
    }],
  })
}

export function trackBeginCheckout(
  items: Array<{ id: number | string; name: string; price: number; quantity: number }>,
  totalValue: number
) {
  trackEvent('begin_checkout', {
    currency: 'CAD',
    value: totalValue,
    items: items.map(item => ({
      item_id: String(item.id),
      item_name: item.name,
      price: item.price,
      quantity: item.quantity,
    })),
  })
}

export function trackAddPaymentInfo(paymentType: string, totalValue: number) {
  trackEvent('add_payment_info', {
    currency: 'CAD',
    value: totalValue,
    payment_type: paymentType,
  })
}

export function trackPurchase(
  transactionId: string,
  totalValue: number,
  items: Array<{ id: number | string; name: string; price: number; quantity: number }>,
  tax?: number,
  shipping?: number
) {
  trackEvent('purchase', {
    currency: 'CAD',
    transaction_id: transactionId,
    value: totalValue,
    tax,
    shipping,
    items: items.map(item => ({
      item_id: String(item.id),
      item_name: item.name,
      price: item.price,
      quantity: item.quantity,
    })),
  })
}
