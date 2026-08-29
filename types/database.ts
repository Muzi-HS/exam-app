// 이 파일은 supabase/schema.sql 을 기준으로 손으로 작성한 타입입니다.
// 나중에 Supabase CLI로 `supabase gen types typescript`를 실행하면
// 이 파일을 자동 생성된 버전으로 교체할 수 있습니다.
//
// Relationships는 @supabase/supabase-js가 `select("... , related(...)")` 같은
// 임베디드(조인) select 문자열을 타입 레벨에서 해석하는 데 필요해서 채워둔 것입니다.

export type ProblemStatus = "unknown" | "partial" | "mastered";
export type Domain = "math" | "pedagogy" | "math_education";
export type MindmapDomain = "pedagogy" | "math_education";
export type ItemType = "math_problem" | "concept_question";
export type SessionMode = "practice" | "exam";
export type ImageType = "problem" | "solution";

export interface Database {
  __InternalSupabase: {
    PostgrestVersion: "12";
  };
  public: {
    Tables: {
      profiles: {
        Row: { id: string; email: string | null; created_at: string };
        Insert: { id: string; email?: string | null };
        Update: { email?: string | null };
        Relationships: [];
      };
      math_subjects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          order_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          order_index?: number;
        };
        Update: { name?: string; order_index?: number };
        Relationships: [];
      };
      math_topics: {
        Row: {
          id: string;
          subject_id: string;
          user_id: string;
          name: string;
          order_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          subject_id: string;
          user_id: string;
          name: string;
          order_index?: number;
        };
        Update: { name?: string; order_index?: number; subject_id?: string };
        Relationships: [
          {
            foreignKeyName: "math_topics_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "math_subjects";
            referencedColumns: ["id"];
          },
        ];
      };
      math_problems: {
        Row: {
          id: string;
          topic_id: string;
          user_id: string;
          title: string;
          source: string | null;
          year: number | null;
          problem_number: string | null;
          memo: string | null;
          youtube_url: string | null;
          is_favorite: boolean;
          last_practiced_at: string | null;
          current_status: ProblemStatus | null;
          solve_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          topic_id: string;
          user_id: string;
          title: string;
          source?: string | null;
          year?: number | null;
          problem_number?: string | null;
          memo?: string | null;
          youtube_url?: string | null;
          is_favorite?: boolean;
          last_practiced_at?: string | null;
          current_status?: ProblemStatus | null;
          solve_count?: number;
        };
        Update: Partial<Database["public"]["Tables"]["math_problems"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "math_problems_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "math_topics";
            referencedColumns: ["id"];
          },
        ];
      };
      problem_images: {
        Row: {
          id: string;
          problem_id: string;
          user_id: string;
          image_type: ImageType;
          storage_path: string;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          problem_id: string;
          user_id: string;
          image_type: ImageType;
          storage_path: string;
          order_index?: number;
        };
        Update: { order_index?: number };
        Relationships: [
          {
            foreignKeyName: "problem_images_problem_id_fkey";
            columns: ["problem_id"];
            isOneToOne: false;
            referencedRelation: "math_problems";
            referencedColumns: ["id"];
          },
        ];
      };
      tags: {
        Row: { id: string; user_id: string; name: string; created_at: string };
        Insert: { id?: string; user_id: string; name: string };
        Update: { name?: string };
        Relationships: [];
      };
      problem_tags: {
        Row: { problem_id: string; tag_id: string };
        Insert: { problem_id: string; tag_id: string };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "problem_tags_problem_id_fkey";
            columns: ["problem_id"];
            isOneToOne: false;
            referencedRelation: "math_problems";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "problem_tags_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id"];
          },
        ];
      };
      mindmap_topics: {
        Row: {
          id: string;
          user_id: string;
          domain: MindmapDomain;
          name: string;
          order_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          domain: MindmapDomain;
          name: string;
          order_index?: number;
        };
        Update: { name?: string; order_index?: number };
        Relationships: [];
      };
      mindmap_nodes: {
        Row: {
          id: string;
          topic_id: string;
          user_id: string;
          domain: MindmapDomain;
          parent_node_id: string | null;
          name: string;
          description: string | null;
          keywords: string | null;
          memo: string | null;
          order_index: number;
          is_collapsed: boolean;
          last_practiced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          topic_id: string;
          user_id: string;
          domain: MindmapDomain;
          parent_node_id?: string | null;
          name: string;
          description?: string | null;
          keywords?: string | null;
          memo?: string | null;
          order_index?: number;
          is_collapsed?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["mindmap_nodes"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "mindmap_nodes_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "mindmap_topics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mindmap_nodes_parent_node_id_fkey";
            columns: ["parent_node_id"];
            isOneToOne: false;
            referencedRelation: "mindmap_nodes";
            referencedColumns: ["id"];
          },
        ];
      };
      concept_questions: {
        Row: {
          id: string;
          node_id: string;
          user_id: string;
          question: string;
          answer: string;
          memo: string | null;
          order_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          node_id: string;
          user_id: string;
          question: string;
          answer: string;
          memo?: string | null;
          order_index?: number;
        };
        Update: Partial<Database["public"]["Tables"]["concept_questions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "concept_questions_node_id_fkey";
            columns: ["node_id"];
            isOneToOne: false;
            referencedRelation: "mindmap_nodes";
            referencedColumns: ["id"];
          },
        ];
      };
      progress_history: {
        Row: {
          id: string;
          user_id: string;
          item_type: ItemType;
          item_id: string;
          status: ProblemStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          item_type: ItemType;
          item_id: string;
          status: ProblemStatus;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      study_sessions: {
        Row: {
          id: string;
          user_id: string;
          domain: Domain;
          mode: SessionMode;
          filter_json: Record<string, unknown> | null;
          item_count: number;
          time_limit_seconds: number | null;
          started_at: string;
          ended_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          domain: Domain;
          mode: SessionMode;
          filter_json?: Record<string, unknown> | null;
          item_count?: number;
          time_limit_seconds?: number | null;
        };
        Update: { ended_at?: string | null };
        Relationships: [];
      };
      study_session_items: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          item_type: ItemType;
          item_id: string;
          order_index: number;
          self_rating: ProblemStatus | null;
          answered_at: string | null;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          item_type: ItemType;
          item_id: string;
          order_index?: number;
        };
        Update: { self_rating?: ProblemStatus | null; answered_at?: string | null };
        Relationships: [
          {
            foreignKeyName: "study_session_items_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "study_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      increment_solve_count: {
        Args: { p_problem_id: string };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
