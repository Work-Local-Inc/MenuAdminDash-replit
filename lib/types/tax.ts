export type TaxType = 'HST' | 'TPS' | 'TVQ';

export interface TaxConfig {
  type: TaxType;
  rate: number;
}

export interface RestaurantTaxInfo {
  restaurant_id: number;
  restaurant_uuid: string;
  restaurant_name: string;
  province_id: number;
  province_code: 'ON' | 'QC';
  province_name: string;
  taxes: TaxConfig[];
  total_tax_rate: number;
}

export interface TaxLineItem {
  type: string;
  rate: number;
  amount: number;
}

export interface TaxBreakdown {
  taxes: TaxLineItem[];
  total: number;
}

export function calculateTaxes(subtotal: number, taxes: TaxConfig[]): TaxLineItem[] {
  return taxes.map(tax => ({
    type: tax.type,
    rate: tax.rate,
    amount: Math.round(subtotal * tax.rate * 100) / 100
  }));
}

export function getTotalTax(taxItems: TaxLineItem[]): number {
  return taxItems.reduce((sum, t) => sum + t.amount, 0);
}

export function formatTaxRate(rate: number): string {
  if (rate === 0.09975) {
    return '9.975%';
  }
  return `${(rate * 100).toFixed(0)}%`;
}

export function getTaxLabel(type: string, rate: number): string {
  return `${type} (${formatTaxRate(rate)})`;
}
