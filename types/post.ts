export type WallPost = {
  id: string;
  author_name: string;
  avatar_url: string | null;
  image_url: string | null;
  body: string;
  created_at: string;
  likes_count?: number;
};

