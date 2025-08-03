/**
 * TypeScript Type Definitions
 * Comprehensive type definitions for the Shopify app
 */

// ============================================================================
// Error Types
// ============================================================================

export interface AppError {
  name: string;
  message: string;
  type: string;
  statusCode: number;
  severity: string;
  context: Record<string, any>;
  timestamp: string;
  stack?: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    type: string;
    message: string;
    timestamp: string;
    stack?: string;
    details?: Record<string, any>;
  };
}

export interface SuccessResponse<T = any> {
  success: true;
  data?: T;
  timestamp: string;
  requestId?: string;
}

export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;

// ============================================================================
// Database Types
// ============================================================================

export interface Session {
  id: string;
  shop: string;
  state: string;
  isOnline: boolean;
  scope?: string;
  expires?: Date;
  accessToken: string;
  userId?: bigint;
  firstName?: string;
  lastName?: string;
  email?: string;
  accountOwner: boolean;
  locale?: string;
  collaborator?: boolean;
  emailVerified?: boolean;
}

export interface SessionStats {
  total: number;
  online: number;
  offline: number;
  expired: number;
}

export interface DatabaseHealth {
  status: 'healthy' | 'unhealthy' | 'error';
  timestamp: string;
  database: string;
  error?: string;
}

// ============================================================================
// API Types
// ============================================================================

export interface ApiClientOptions {
  baseURL?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
  requestId: string;
}

// ============================================================================
// Shopify Types
// ============================================================================

export interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  vendor: string;
  product_type: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
  template_suffix?: string;
  status: 'active' | 'archived' | 'draft';
  published_scope: string;
  tags: string;
  admin_graphql_api_id: string;
  variants: ShopifyVariant[];
  options: ShopifyOption[];
  images: ShopifyImage[];
  image?: ShopifyImage;
}

export interface ShopifyVariant {
  id: number;
  product_id: number;
  title: string;
  price: string;
  sku?: string;
  position: number;
  inventory_policy: string;
  compare_at_price?: string;
  fulfillment_service: string;
  inventory_management?: string;
  option1?: string;
  option2?: string;
  option3?: string;
  created_at: string;
  updated_at: string;
  taxable: boolean;
  barcode?: string;
  grams: number;
  image_id?: number;
  weight: number;
  weight_unit: string;
  inventory_item_id: number;
  inventory_quantity: number;
  old_inventory_quantity: number;
  requires_shipping: boolean;
  admin_graphql_api_id: string;
}

export interface ShopifyOption {
  id: number;
  product_id: number;
  name: string;
  position: number;
  values: string[];
}

export interface ShopifyImage {
  id: number;
  product_id: number;
  position: number;
  created_at: string;
  updated_at: string;
  alt?: string;
  width: number;
  height: number;
  src: string;
  variant_ids: number[];
  admin_graphql_api_id: string;
}

export interface ShopifyOrder {
  id: number;
  admin_graphql_api_id: string;
  app_id?: number;
  browser_ip?: string;
  buyer_accepts_marketing: boolean;
  cancel_reason?: string;
  cancelled_at?: string;
  cart_token?: string;
  checkout_id?: number;
  checkout_token?: string;
  client_details?: any;
  closed_at?: string;
  confirmed: boolean;
  contact_email?: string;
  created_at: string;
  currency: string;
  current_subtotal_price: string;
  current_subtotal_price_set: any;
  current_total_discounts: string;
  current_total_discounts_set: any;
  current_total_duties_set?: any;
  current_total_price: string;
  current_total_price_set: any;
  current_total_tax: string;
  current_total_tax_set: any;
  customer_locale?: string;
  device_id?: number;
  discount_codes: any[];
  email?: string;
  estimated_taxes: boolean;
  financial_status: string;
  fulfillment_status?: string;
  gateway?: string;
  landing_site?: string;
  landing_site_ref?: string;
  location_id?: number;
  name: string;
  note?: string;
  note_attributes: any[];
  number: number;
  order_number: number;
  order_status_url: string;
  original_total_duties_set?: any;
  payment_gateway_names: string[];
  phone?: string;
  presentment_currency: string;
  processed_at: string;
  processing_method: string;
  reference?: string;
  referring_site?: string;
  source_identifier?: string;
  source_name: string;
  source_url?: string;
  subtotal_price: string;
  subtotal_price_set: any;
  tags: string;
  tax_lines: any[];
  taxes_included: boolean;
  test: boolean;
  token: string;
  total_discounts: string;
  total_discounts_set: any;
  total_line_items_price: string;
  total_line_items_price_set: any;
  total_outstanding: string;
  total_price: string;
  total_price_set: any;
  total_price_usd: string;
  total_shipping_price_set: any;
  total_tax: string;
  total_tax_set: any;
  total_tip_received: string;
  total_weight: number;
  updated_at: string;
  user_id?: number;
  billing_address?: ShopifyAddress;
  customer?: ShopifyCustomer;
  discount_applications: any[];
  fulfillments: any[];
  line_items: ShopifyLineItem[];
  payment_terms?: any;
  refunds: any[];
  shipping_address?: ShopifyAddress;
  shipping_lines: any[];
}

export interface ShopifyCustomer {
  id: number;
  email?: string;
  accepts_marketing: boolean;
  created_at: string;
  updated_at: string;
  first_name?: string;
  last_name?: string;
  orders_count: number;
  state: string;
  total_spent: string;
  last_order_id?: number;
  note?: string;
  verified_email: boolean;
  multipass_identifier?: string;
  tax_exempt: boolean;
  phone?: string;
  tags: string;
  last_order_name?: string;
  currency: string;
  addresses: ShopifyAddress[];
  accepts_marketing_updated_at: string;
  marketing_opt_in_level?: string;
  tax_exemptions: any[];
  admin_graphql_api_id: string;
  default_address?: ShopifyAddress;
}

export interface ShopifyAddress {
  id?: number;
  customer_id?: number;
  first_name?: string;
  last_name?: string;
  company?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  country?: string;
  zip?: string;
  phone?: string;
  name?: string;
  province_code?: string;
  country_code?: string;
  country_name?: string;
  default?: boolean;
}

export interface ShopifyLineItem {
  id: number;
  admin_graphql_api_id: string;
  fulfillable_quantity: number;
  fulfillment_service: string;
  fulfillment_status?: string;
  gift_card: boolean;
  grams: number;
  name: string;
  origin_location?: any;
  price: string;
  price_set: any;
  product_exists: boolean;
  product_id?: number;
  properties: any[];
  quantity: number;
  requires_shipping: boolean;
  sku?: string;
  taxable: boolean;
  title: string;
  total_discount: string;
  total_discount_set: any;
  variant_id?: number;
  variant_inventory_management?: string;
  variant_title?: string;
  vendor?: string;
  tax_lines: any[];
  duties: any[];
  discount_allocations: any[];
}

// ============================================================================
// External API Types
// ============================================================================

export interface RushrOrder {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  updated_at: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  items: RushrOrderItem[];
  total: number;
  currency: string;
}

export interface RushrOrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  sku?: string;
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationRule {
  type: string;
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: RegExp;
  };
  options?: {
    maxLength?: number;
    allowNull?: boolean;
    itemType?: string;
    maxItems?: number;
  };
}

export interface ValidationSchema {
  [field: string]: ValidationRule;
}

export interface ValidationErrors {
  [field: string]: string[];
}

// ============================================================================
// Rate Limiting Types
// ============================================================================

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests: boolean;
  skipFailedRequests: boolean;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

export interface RateLimitData {
  count: number;
  resetTime: number;
  firstRequest: number;
}

// ============================================================================
// Logging Types
// ============================================================================

export interface LogEntry {
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'PERFORMANCE' | 'AUDIT';
  message: string;
  timestamp: string;
  context: Record<string, any>;
  environment: string;
  pid: number;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
    type?: string;
    statusCode?: number;
    severity?: string;
  };
}

export interface PerformanceLogEntry extends LogEntry {
  operation: string;
  duration: string;
}

export interface AuditLogEntry extends LogEntry {
  action: string;
  user: string;
}

// ============================================================================
// Utility Types
// ============================================================================

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type NonEmptyArray<T> = [T, ...T[]];

export type Awaited<T> = T extends Promise<infer U> ? U : T;
