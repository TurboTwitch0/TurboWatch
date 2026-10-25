export type MediaType = 'image' | 'video';
export type PostAspect = 'portrait' | 'landscape' | 'square';

export interface Creator {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  verified?: boolean;
  followers?: number;
  cover?: string;
}

export interface Post {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  mediaType: MediaType;
  mediaUrl: string;
  thumbnail: string;
  category: string;
  tags: string[];
  aspect: PostAspect;
  duration?: string;
  views: number;
  likes: number;
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  creatorId: string;
  text: string;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  text: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  creatorId: string;
  messages: Message[];
  unread: number;
}

export interface Board {
  id: string;
  name: string;
  description?: string;
  postIds: string[];
  cover?: string;
}

export interface Notification {
  id: string;
  creatorId: string;
  text: string;
  createdAt: string;
  postId?: string;
  read: boolean;
}

export type CreatePostInput = Omit<Post, 'id' | 'creatorId' | 'createdAt' | 'views' | 'likes'>;
export type ProfilePatch = Partial<Pick<Creator, 'name' | 'username' | 'bio' | 'avatar'>>;

export interface SocialState {
  user: Creator | null;
  creators: Creator[];
  posts: Post[];
  comments: Comment[];
  messages: Message[];
  boards: Board[];
  likedIds: string[];
  savedIds: string[];
  repostedIds: string[];
  followingIds: string[];
  readAt: Record<string, string>;
  notificationsReadAt: string;
}
