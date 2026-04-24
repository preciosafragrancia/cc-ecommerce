import { supabase } from '@/integrations/supabase/client';
import { getSessionId } from '@/utils/sessionId';

export type ProductEventType = 
  | 'view_item'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'purchase'
  | 'begin_checkout'
  | 'update_cart_quantity'
  | 'update_checkout_quantity';

interface ProductEventPayload {
  product_id: string;
  product_name: string;
  event_type: ProductEventType;
  price?: number;
  category?: string;
  quantity?: number;
}

/**
 * Persists a product event to Supabase (fire-and-forget).
 */
export const trackProductEvent = (payload: ProductEventPayload) => {
  const sessionId = getSessionId();
  
  supabase
    .from('product_events' as any)
    .insert({
      product_id: payload.product_id,
      product_name: payload.product_name,
      event_type: payload.event_type,
      price: payload.price ?? 0,
      category: payload.category ?? null,
      quantity: payload.quantity ?? 1,
      session_id: sessionId,
    })
    .then(({ error }) => {
      if (error) console.error('Error tracking product event:', error);
    });
};

/**
 * Persists multiple product events at once (e.g. purchase with multiple items).
 */
export const trackProductEventsBatch = (items: ProductEventPayload[]) => {
  const sessionId = getSessionId();
  
  const rows = items.map(item => ({
    product_id: item.product_id,
    product_name: item.product_name,
    event_type: item.event_type,
    price: item.price ?? 0,
    category: item.category ?? null,
    quantity: item.quantity ?? 1,
    session_id: sessionId,
  }));

  supabase
    .from('product_events' as any)
    .insert(rows)
    .then(({ error }) => {
      if (error) console.error('Error tracking product events batch:', error);
    });
};

export interface ProductMetric {
  product_id: string;
  product_name: string;
  views: number;
  sales: number;
}

/**
 * Fetches aggregated product metrics (views + sales) for admin dashboard.
 */
export const getProductMetrics = async (): Promise<ProductMetric[]> => {
  const { data, error } = await supabase
    .from('product_events' as any)
    .select('product_id, product_name, event_type, quantity')
    ;

  if (error || !data) {
    console.error('Error fetching product metrics:', error);
    return [];
  }

  const metricsMap = new Map<string, ProductMetric>();

  (data as any[]).forEach((row: any) => {
    const key = row.product_id;
    if (!metricsMap.has(key)) {
      metricsMap.set(key, {
        product_id: row.product_id,
        product_name: row.product_name,
        views: 0,
        sales: 0,
      });
    }
    const m = metricsMap.get(key)!;
    if (row.event_type === 'view_item') m.views++;
    if (row.event_type === 'purchase') m.sales += (row.quantity ?? 1);
  });

  return Array.from(metricsMap.values());
};

// ---- Funnel data for admin-intelligence ----

export interface FunnelData {
  product_name: string;
  product_id: string;
  views: number;
  addToCart: number;
  purchases: number;
}

export const getFunnelData = async (startDate: string, endDate: string): Promise<FunnelData[]> => {
  const startIso = new Date(`${startDate}T00:00:00`).toISOString();
  const endIso = new Date(`${endDate}T23:59:59.999`).toISOString();

  const { data, error } = await supabase
    .from('product_events' as any)
    .select('product_id, product_name, event_type, quantity')
    .gte('created_at', startIso)
    .lte('created_at', endIso)
    .in('event_type', ['view_item', 'add_to_cart', 'purchase']);

  if (error || !data) {
    console.error('Error fetching funnel data:', error);
    return [];
  }

  const map = new Map<string, FunnelData>();

  (data as any[]).forEach((row: any) => {
    const key = row.product_id;
    if (!map.has(key)) {
      map.set(key, {
        product_id: row.product_id,
        product_name: row.product_name,
        views: 0,
        addToCart: 0,
        purchases: 0,
      });
    }
    const m = map.get(key)!;
    if (row.event_type === 'view_item') m.views++;
    if (row.event_type === 'add_to_cart') m.addToCart += (row.quantity ?? 1);
    if (row.event_type === 'purchase') m.purchases += (row.quantity ?? 1);
  });

  return Array.from(map.values()).sort((a, b) => b.views - a.views);
};
