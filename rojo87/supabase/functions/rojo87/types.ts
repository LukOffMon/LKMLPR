export type Merchant = {
  id: string;
  slug: string;
  name: string;
  owner_email: string;
  vertical: string;
  logo_png: string | null;
  icon_png: string | null;
  color_bg: string;
  color_fg: string;
  color_accent: string;
  reward_text: string;
  stamps_required: number;
  ticket_avg: number;
  inactive_days: number;
  stamp_cooldown_min: number;
  lat: number | null;
  lng: number | null;
  address: string | null;
  plan: string;
  trial_ends_at: string;
  design: Record<string, string> | null;
  nearby: string;
  created_at: string;
  status: string;
  pending_since: string;
  paid_until: string | null;
};

export type Customer = {
  id: string;
  merchant_id: string;
  name: string;
  phone: string;
  email: string | null;
  marketing_opt_in: boolean;
  serial: string;
  auth_token: string;
  stamps: number;
  rewards_available: number;
  rewards_redeemed: number;
  total_visits: number;
  last_visit_at: string | null;
  last_message: string | null;
  last_message_at: string | null;
  updated_at: string;
  created_at: string;
};

export type Session = {
  merchant_id: string;
  role: "owner" | "staff";
  staff_name: string | null;
};
