import type { ComponentType } from 'react'
import { template as backInStockConfirmation } from './back-in-stock-confirmation'
import { template as priceAlertConfirmation } from './price-alert-confirmation'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 *
 * Example:
 *   import { template as welcomeTemplate } from './welcome'
 *   // then add to TEMPLATES: 'welcome': welcomeTemplate
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'back-in-stock-confirmation': backInStockConfirmation,
  'price-alert-confirmation': priceAlertConfirmation,
}
