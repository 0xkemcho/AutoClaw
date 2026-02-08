export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          wallet_address: string;
          display_name: string | null;
          auth_method: string | null;
          risk_profile: 'conservative' | 'moderate' | 'aggressive' | null;
          risk_answers: Record<string, unknown> | null;
          preferred_currencies: string[] | null;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          wallet_address: string;
          display_name?: string | null;
          auth_method?: string | null;
          risk_profile?: 'conservative' | 'moderate' | 'aggressive' | null;
          risk_answers?: Record<string, unknown> | null;
          preferred_currencies?: string[] | null;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          wallet_address?: string;
          display_name?: string | null;
          auth_method?: string | null;
          risk_profile?: 'conservative' | 'moderate' | 'aggressive' | null;
          risk_answers?: Record<string, unknown> | null;
          preferred_currencies?: string[] | null;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          system_prompt: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string | null;
          system_prompt?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string | null;
          system_prompt?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: 'user' | 'assistant' | 'system' | 'tool';
          content: string | null;
          tool_calls: Record<string, unknown> | null;
          tool_results: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: 'user' | 'assistant' | 'system' | 'tool';
          content?: string | null;
          tool_calls?: Record<string, unknown> | null;
          tool_results?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          role?: 'user' | 'assistant' | 'system' | 'tool';
          content?: string | null;
          tool_calls?: Record<string, unknown> | null;
          tool_results?: Record<string, unknown> | null;
          created_at?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          type: 'swap' | 'sip';
          source_token: string;
          target_token: string;
          source_amount: number;
          target_amount: number;
          exchange_rate: number | null;
          tx_hash: string | null;
          status: 'pending' | 'confirmed' | 'failed';
          sip_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'swap' | 'sip';
          source_token: string;
          target_token: string;
          source_amount: number;
          target_amount: number;
          exchange_rate?: number | null;
          tx_hash?: string | null;
          status?: 'pending' | 'confirmed' | 'failed';
          sip_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'swap' | 'sip';
          source_token?: string;
          target_token?: string;
          source_amount?: number;
          target_amount?: number;
          exchange_rate?: number | null;
          tx_hash?: string | null;
          status?: 'pending' | 'confirmed' | 'failed';
          sip_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      sip_configs: {
        Row: {
          id: string;
          user_id: string;
          source_token: string;
          target_token: string;
          amount: number;
          frequency: 'daily' | 'weekly' | 'monthly';
          day_of_week: number | null;
          day_of_month: number | null;
          is_active: boolean;
          allowance_tx_hash: string | null;
          next_execution: string | null;
          total_invested: number;
          total_executions: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          source_token: string;
          target_token: string;
          amount: number;
          frequency: 'daily' | 'weekly' | 'monthly';
          day_of_week?: number | null;
          day_of_month?: number | null;
          is_active?: boolean;
          allowance_tx_hash?: string | null;
          next_execution?: string | null;
          total_invested?: number;
          total_executions?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          source_token?: string;
          target_token?: string;
          amount?: number;
          frequency?: 'daily' | 'weekly' | 'monthly';
          day_of_week?: number | null;
          day_of_month?: number | null;
          is_active?: boolean;
          allowance_tx_hash?: string | null;
          next_execution?: string | null;
          total_invested?: number;
          total_executions?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      portfolio_snapshots: {
        Row: {
          id: string;
          user_id: string;
          total_value_usd: number | null;
          holdings: Record<string, string> | null;
          snapshot_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          total_value_usd?: number | null;
          holdings?: Record<string, string> | null;
          snapshot_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          total_value_usd?: number | null;
          holdings?: Record<string, string> | null;
          snapshot_at?: string;
        };
        Relationships: [];
      };
      token_price_snapshots: {
        Row: {
          id: string;
          token_symbol: string;
          price_usd: number;
          snapshot_at: string;
        };
        Insert: {
          id?: string;
          token_symbol: string;
          price_usd: number;
          snapshot_at?: string;
        };
        Update: {
          id?: string;
          token_symbol?: string;
          price_usd?: number;
          snapshot_at?: string;
        };
        Relationships: [];
      };
      news_articles: {
        Row: {
          id: string;
          title: string;
          summary: string | null;
          source_url: string;
          source_name: string | null;
          tickers: string[] | null;
          related_tokens: string[] | null;
          sentiment: 'positive' | 'negative' | 'neutral' | null;
          published_at: string | null;
          crawled_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          summary?: string | null;
          source_url: string;
          source_name?: string | null;
          tickers?: string[] | null;
          related_tokens?: string[] | null;
          sentiment?: 'positive' | 'negative' | 'neutral' | null;
          published_at?: string | null;
          crawled_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          summary?: string | null;
          source_url?: string;
          source_name?: string | null;
          tickers?: string[] | null;
          related_tokens?: string[] | null;
          sentiment?: 'positive' | 'negative' | 'neutral' | null;
          published_at?: string | null;
          crawled_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
