export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      contact_messages: {
        Row: {
          id: string
          name: string
          email: string
          subject: string
          message: string
          reply_text: string | null
          replied: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          subject: string
          message: string
          reply_text?: string | null
          replied?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          subject?: string
          message?: string
          reply_text?: string | null
          replied?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          id: string
          title: string
          description: string | null
          category: string | null
          date: string
          time: string | null
          location: string | null
          organizer: string | null
          image: string | null
          image_url: string | null
          popularity_score: number
          trending_score: number
          registration_link: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          category?: string | null
          date: string
          time?: string | null
          location?: string | null
          organizer?: string | null
          image?: string | null
          image_url?: string | null
          popularity_score?: number
          trending_score?: number
          registration_link?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          category?: string | null
          date?: string
          time?: string | null
          location?: string | null
          organizer?: string | null
          image?: string | null
          image_url?: string | null
          popularity_score?: number
          trending_score?: number
          registration_link?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      event_attendees: {
        Row: {
          event_id: string
          id: string
          joined_at: string
          rsvp_status: string
          user_id: string
        }
        Insert: {
          event_id: string
          id?: string
          joined_at?: string
          rsvp_status: string
          user_id: string
        }
        Update: {
          event_id?: string
          id?: string
          joined_at?: string
          rsvp_status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      event_comments: {
        Row: {
          comment_text: string
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          comment_text: string
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          comment_text?: string
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_comments_event_id_fkey"
            columns: ["event_id"]
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_comments_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      event_reviews: {
        Row: {
          created_at: string
          event_id: string
          id: string
          rating: number
          review_text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          rating: number
          review_text: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          rating?: number
          review_text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_reviews_event_id_fkey"
            columns: ["event_id"]
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_reviews_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_options: {
        Row: {
          id: string
          poll_id: string
          option_text: string
          votes: number
          created_at: string
        }
        Insert: {
          id?: string
          poll_id: string
          option_text: string
          votes?: number
          created_at?: string
        }
        Update: {
          id?: string
          poll_id?: string
          option_text?: string
          votes?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            referencedRelation: "polls"
            referencedColumns: ["id"]
          }
        ]
      }
      polls: {
        Row: {
          id: string
          event_id: string
          question: string
          registration_link: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          question: string
          registration_link?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          question?: string
          registration_link?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "polls_event_id_fkey"
            columns: ["event_id"]
            referencedRelation: "events"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          title: string
          description: string | null
          image_url: string | null
          github_url: string | null
          demo_url: string | null
          registration_link: string | null
          tags: string[] | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          image_url?: string | null
          github_url?: string | null
          demo_url?: string | null
          registration_link?: string | null
          tags?: string[] | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          image_url?: string | null
          github_url?: string | null
          demo_url?: string | null
          registration_link?: string | null
          tags?: string[] | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      social_links: {
        Row: {
          id: string
          platform: string
          url: string
          icon: string | null
          display_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          platform: string
          url: string
          icon?: string | null
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          platform?: string
          url?: string
          icon?: string | null
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_saved_events: {
        Row: {
          event_id: string
          id: string
          saved_at: string
          user_id: string
        }
        Insert: {
          event_id: string
          id?: string
          saved_at?: string
          user_id: string
        }
        Update: {
          event_id?: string
          id?: string
          saved_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_saved_events_event_id_fkey"
            columns: ["event_id"]
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_saved_events_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          college: string | null
          created_at: string
          email: string
          id: string
          name: string | null
          profile_picture: string | null
        }
        Insert: {
          college?: string | null
          created_at?: string
          email: string
          id: string
          name?: string | null
          profile_picture?: string | null
        }
        Update: {
          college?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          profile_picture?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: Database["public"]["Enums"]["app_role"]
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role?: Database["public"]["Enums"]["app_role"]
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          created_at?: string
        }
        Relationships: []
      }
      votes: {
        Row: {
          id: string
          poll_id: string
          option_id: string
          user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          poll_id: string
          option_id: string
          user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          poll_id?: string
          option_id?: string
          user_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_option_id_fkey"
            columns: ["option_id"]
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_poll_id_fkey"
            columns: ["poll_id"]
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
