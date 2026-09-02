// Row types mirroring supabase/schema.sql — keep in sync with the DB.

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'rescheduled';

export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded';
export type PaymentTxnStatus = 'pending' | 'successful' | 'failed' | 'refunded';
export type InvoiceStatus = 'unpaid' | 'paid' | 'overdue' | 'void';
export type TicketStatus = 'open' | 'in_progress' | 'waiting_for_customer' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Profile {
  id: number;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  id_document_url?: string | null;
  career_status?: string | null;
  relationship_status?: string | null;
  avatar_url: string | null;
  profile_picture_url?: string | null;
  preferred_name?: string | null;
  bio?: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address_line?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
  facebook_url?: string | null;
  x_url?: string | null;
  instagram_url?: string | null;
  telegram_url?: string | null;
  role: 'customer' | 'staff' | 'admin';
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerProfile {
  id: number;
  profile_id: number;
  customer_number: string;
  preferred_contact_method: string;
  customer_status: string;
  property_type?: 'apartment' | 'house' | 'office' | 'airbnb' | 'other' | null;
  facebook_url?: string | null;
  x_url?: string | null;
  instagram_url?: string | null;
  telegram_url?: string | null;
  notes: string | null;
  invited_by_profile_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface Invite {
  id: number;
  token: string;
  inviter_profile_id: number | null;
  invitee_email: string | null;
  used: boolean;
  used_by_profile_id: number | null;
  created_at: string;
  expires_at: string | null;
}

export interface PricePlan {
  id: number;
  name: string;
  price: number;
  currency: string;
  features: string[];
  is_active: boolean;
  created_at: string;
}

export interface Address {
  id: number;
  profile_id: number;
  address_type: 'home' | 'work' | 'other';
  address_line: string;
  city: string;
  state: string | null;
  country: string;
  postal_code: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  id: number;
  profile_id: number;
  email_notifications: boolean;
  sms_notifications: boolean;
  marketing_notifications: boolean;
  created_at: string;
  updated_at: string;
}

export interface CleaningService {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  base_price: number;
  price_unit: 'flat' | 'per_room' | 'per_hour' | 'per_sqft';
  estimated_duration_minutes: number | null;
  is_active: boolean;
  display_order: number;
}

export interface Booking {
  id: number;
  customer_id: number;
  service_id: number;
  booking_number: string;
  booking_date: string;
  booking_time: string;
  property_type: 'apartment' | 'house' | 'office' | 'airbnb' | 'other';
  property_address: string;
  number_of_rooms: number;
  number_of_bathrooms: number;
  additional_services: string[] | null;
  special_instructions: string | null;
  estimated_price: number | null;
  final_price: number | null;
  assigned_staff: string | null;
  booking_status: BookingStatus;
  payment_status: PaymentStatus;
  created_at: string;
  updated_at: string;
  cleaning_services?: CleaningService;
}

export interface Payment {
  id: number;
  customer_id: number;
  booking_id: number | null;
  payment_reference: string;
  amount: number;
  currency: string;
  payment_method: string | null;
  payment_status: PaymentTxnStatus;
  paid_at: string | null;
  created_at: string;
}

export interface Invoice {
  id: number;
  customer_id: number;
  booking_id: number | null;
  invoice_number: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  currency: string;
  status: InvoiceStatus;
  due_date: string | null;
  created_at: string;
}

export interface ServiceReview {
  id: number;
  customer_id: number;
  booking_id: number;
  rating: number;
  review: string | null;
  created_at: string;
  bookings?: Booking;
}

export interface SupportTicket {
  id: number;
  customer_id: number;
  booking_id: number | null;
  subject: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupportTicketMessage {
  id: number;
  ticket_id: number;
  profile_id: number | null;
  sender_type: 'customer' | 'staff';
  message: string;
  created_at: string;
}

export type NotificationType =
  | 'booking_confirmed'
  | 'cleaner_assigned'
  | 'service_reminder'
  | 'booking_completed'
  | 'payment_received'
  | 'invoice_generated'
  | 'support_update'
  | 'promotional';

export interface AppNotification {
  id: number;
  profile_id: number;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  related_booking_id: number | null;
  created_at: string;
}
