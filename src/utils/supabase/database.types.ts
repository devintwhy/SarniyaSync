export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Relationship[];
};

export type Database = {
  public: {
    Tables: {
      products: Table<
        {
          id: string;
          sku: string;
          name: string;
          description: string | null;
          category: string;
          color: string | null;
          size: string | null;
          cost_price: number;
          selling_price: number;
          stock_quantity: number;
          image_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          sku: string;
          name: string;
          description?: string | null;
          category: string;
          color?: string | null;
          size?: string | null;
          cost_price: number;
          selling_price: number;
          stock_quantity: number;
          image_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        }
      >;
      partner_stores: Table<
        {
          id: string;
          owner_id: string;
          name: string;
          address: string | null;
          city: string | null;
          phone: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          owner_id: string;
          name: string;
          address?: string | null;
          city?: string | null;
          phone?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        },
        {
          owner_id?: string;
          name?: string;
          address?: string | null;
          city?: string | null;
          phone?: string | null;
          is_active?: boolean;
          updated_at?: string;
        }
      >;
      partner_store_inventory: Table<
        {
          id: string;
          partner_store_id: string;
          product_id: string;
          stock_quantity: number;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          partner_store_id: string;
          product_id: string;
          stock_quantity?: number;
          created_at?: string;
          updated_at?: string;
        },
        {
          stock_quantity?: number;
          updated_at?: string;
        }
      >;
      profiles: Table<
        {
          id: string;
          full_name: string;
          phone: string | null;
          role: string;
          created_at: string;
          updated_at: string;
        },
        {
          id: string;
          full_name: string;
          phone?: string | null;
          role: string;
          created_at?: string;
          updated_at?: string;
        }
      >;
      sales_transactions: Table<
        {
          id: string;
          transaction_number: string;
          channel: string;
          partner_store_id: string;
          created_by: string;
          customer_name: string | null;
          customer_phone: string | null;
          items: Json;
          subtotal: number;
          discount: number;
          total: number;
          payment_method: string | null;
          status: string;
          sold_at: string;
          created_at: string;
        },
        {
          id?: string;
          transaction_number: string;
          channel: string;
          partner_store_id: string;
          created_by: string;
          customer_name?: string | null;
          customer_phone?: string | null;
          items: Json;
          subtotal: number;
          discount?: number;
          total: number;
          payment_method?: string | null;
          status: string;
          sold_at?: string;
          created_at?: string;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: {
      record_partner_sale: {
        Args: {
          p_partner_store_id: string;
          p_product_id: string;
          p_quantity: number;
          p_payment_method?: string | null;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};