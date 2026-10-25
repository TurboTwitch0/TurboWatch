import type { Board, Comment, Creator, Message, Post } from './model';

// These are fictional demo accounts. Photography and video credits live in
// public/media/SOURCES.md; the people pictured are not the demo account owners.
export const demoUser: Creator = {
  id: 'demo-user',
  name: 'Alex Carter',
  username: 'alexcreates',
  avatar: '/media/avatar-alex.svg',
  bio: 'A little curious about everything. Collecting moments, making things, finding my people.',
  followers: 248,
  cover: '/media/mountains.jpg',
};

export const seedCreators: Creator[] = [
  demoUser,
  {
    id: 'maya', name: 'Maya Rivera', username: 'mayarivera',
    avatar: '/media/avatar-maya.svg', verified: true, followers: 28400,
    bio: 'Taking the long way home. Travel films, salty hair, and places worth getting lost in.',
    cover: '/media/coast.jpg',
  },
  {
    id: 'theo', name: 'Theo Park', username: 'theopark',
    avatar: '/media/avatar-theo.svg', verified: true, followers: 17200,
    bio: 'Chasing light and little adventures. Photographer, early riser, occasional mountain person.',
    cover: '/media/mountains.jpg',
  },
  {
    id: 'studio', name: 'Ordinary Studio', username: 'ordinarystudio',
    avatar: '/media/avatar-studio.svg', verified: true, followers: 11600,
    bio: 'Spaces to breathe. Thoughtful interiors and everyday objects that make life a little better.',
    cover: '/media/studio.jpg',
  },
  {
    id: 'noa', name: 'Noa Silva', username: 'noainthekitchen',
    avatar: '/media/avatar-noa.svg', verified: false, followers: 9200,
    bio: 'Good food, good company, and no complicated recipes. There is always room at the table.',
    cover: '/media/honey.jpg',
  },
  {
    id: 'jules', name: 'Jules Chen', username: 'julesonfilm',
    avatar: '/media/avatar-jules.svg', verified: true, followers: 31800,
    bio: 'Stories in still frames. A camera, a notebook, and a very full memory card.',
    cover: '/media/night.jpg',
  },
  {
    id: 'elena', name: 'Elena Rose', username: 'elenarose',
    avatar: '/media/avatar-elena.svg', verified: false, followers: 6400,
    bio: 'Personal style, secondhand treasures, and whatever catches the afternoon light.',
    cover: '/media/portrait.jpg',
  },
  {
    id: 'milo', name: 'Milo King', username: 'madebymilo',
    avatar: '/media/avatar-milo.svg', verified: false, followers: 4800,
    bio: 'Old things, new ideas. Design enthusiast and full-time employee of a very demanding cat.',
    cover: '/media/vintage.jpg',
  },
];

export const seedPosts: Post[] = [
  {
    id: 'coast-escape', creatorId: 'maya', title: 'Take the scenic route.',
    description: 'No itinerary. No notifications. Just a little stretch of coastline and a whole lot of blue. Where would you disappear to for a day?',
    mediaType: 'video', mediaUrl: '/media/coast.mp4', thumbnail: '/media/coast.jpg',
    category: 'Travel', tags: ['ocean', 'slowliving', 'travel', 'escape'],
    aspect: 'landscape', duration: '0:37', views: 24800, likes: 1842,
    createdAt: '2026-10-25T16:30:00.000Z',
  },
  {
    id: 'mountain-morning', creatorId: 'theo', title: 'Some places make you feel small.',
    description: 'Three frames from the mountains. A twelve-second photo story for anyone who needs a deep breath today. Save this for your next adventure.',
    mediaType: 'video', mediaUrl: '/media/mountain-story.mp4', thumbnail: '/media/mountains.jpg',
    category: 'Outdoors', tags: ['mountains', 'photostory', 'nature', 'adventure'],
    aspect: 'landscape', duration: '0:12', views: 18300, likes: 1249,
    createdAt: '2026-10-25T15:15:00.000Z',
  },
  {
    id: 'slow-sunday', creatorId: 'studio', title: 'A slower kind of Sunday.',
    description: 'Soft light, natural textures, and a corner that asks nothing of you. Sometimes a little less really is a little more.',
    mediaType: 'image', mediaUrl: '/media/studio.jpg', thumbnail: '/media/studio.jpg',
    category: 'Design', tags: ['interiors', 'minimal', 'design', 'slowliving'],
    aspect: 'portrait', views: 8900, likes: 846,
    createdAt: '2026-10-25T14:10:00.000Z',
  },
  {
    id: 'sweet-simple', creatorId: 'noa', title: 'Sweet. Simple. A little golden.',
    description: 'Ripe stone fruit, a spoonful of honey, and the good plates. Your reminder that breakfast can be the best part of the day.',
    mediaType: 'image', mediaUrl: '/media/honey.jpg', thumbnail: '/media/honey.jpg',
    category: 'Food', tags: ['breakfast', 'honey', 'food', 'simplepleasures'],
    aspect: 'square', views: 12400, likes: 1036,
    createdAt: '2026-10-25T13:20:00.000Z',
  },
  {
    id: 'golden-hour', creatorId: 'elena', title: 'Chasing the golden hour.',
    description: 'Warm tones, vintage details, and a little afternoon sunshine. Moodboard for the days that feel like a film still.',
    mediaType: 'image', mediaUrl: '/media/portrait.jpg', thumbnail: '/media/portrait.jpg',
    category: 'Style', tags: ['style', 'portrait', 'goldenhour', 'moodboard'],
    aspect: 'portrait', views: 19600, likes: 1582,
    createdAt: '2026-10-25T12:45:00.000Z',
  },
  {
    id: 'under-the-stars', creatorId: 'jules', title: 'Meet me under the stars.',
    description: 'The best kind of screen time. One sky, a million reasons to look up. What is your favorite place to see the stars?',
    mediaType: 'image', mediaUrl: '/media/night.jpg', thumbnail: '/media/night.jpg',
    category: 'Photography', tags: ['night', 'stars', 'photography', 'mountains'],
    aspect: 'portrait', views: 31200, likes: 2417,
    createdAt: '2026-10-25T11:10:00.000Z',
  },
  {
    id: 'vintage-soul', creatorId: 'milo', title: 'A little old-school soul.',
    description: 'The curves. The color. The details nobody had to add, but somebody cared enough to. An appreciation post for making things beautifully.',
    mediaType: 'image', mediaUrl: '/media/vintage.jpg', thumbnail: '/media/vintage.jpg',
    category: 'Culture', tags: ['vintage', 'design', 'cars', 'details'],
    aspect: 'landscape', views: 6700, likes: 592,
    createdAt: '2026-10-25T10:30:00.000Z',
  },
  {
    id: 'picnic-club', creatorId: 'noa', title: 'You bring the stories. I’ll bring pie.',
    description: 'Starting a very unofficial picnic club. The only rule: stay for another slice. Tag the person you would save a spot for.',
    mediaType: 'image', mediaUrl: '/media/picnic.jpg', thumbnail: '/media/picnic.jpg',
    category: 'Food', tags: ['picnic', 'baking', 'food', 'weekend'],
    aspect: 'square', views: 11200, likes: 920,
    createdAt: '2026-10-24T18:30:00.000Z',
  },
  {
    id: 'closer-to-clouds', creatorId: 'theo', title: 'A little closer to the clouds.',
    description: 'Somewhere between the last turn and the first glimpse of the summit. The weather did not follow the plan. That was the best part.',
    mediaType: 'image', mediaUrl: '/media/mist.jpg', thumbnail: '/media/mist.jpg',
    category: 'Outdoors', tags: ['hiking', 'mist', 'outdoors', 'adventure'],
    aspect: 'portrait', views: 14700, likes: 1187,
    createdAt: '2026-10-24T17:15:00.000Z',
  },
  {
    id: 'creative-director', creatorId: 'milo', title: 'The creative director is on a break.',
    description: 'Feedback has been postponed until after the nap. Honestly, this is the energy I am trying to bring to the entire week.',
    mediaType: 'image', mediaUrl: '/media/cat.jpg', thumbnail: '/media/cat.jpg',
    category: 'Life', tags: ['cats', 'creative', 'life', 'slowday'],
    aspect: 'square', views: 26900, likes: 3032,
    createdAt: '2026-10-24T16:30:00.000Z',
  },
  {
    id: 'room-to-breathe', creatorId: 'studio', title: 'Make room for a little more life.',
    description: 'A plant by the window. A piece of art you love. The kind of room that gets better when you actually live in it.',
    mediaType: 'image', mediaUrl: '/media/room.jpg', thumbnail: '/media/room.jpg',
    category: 'Design', tags: ['home', 'interiors', 'plants', 'design'],
    aspect: 'landscape', views: 7500, likes: 684,
    createdAt: '2026-10-24T14:00:00.000Z',
  },
  {
    id: 'last-light', creatorId: 'jules', title: 'One more minute of this, please.',
    description: 'The last light always feels like a gift. An image for your someday board, your lock screen, or that little place in your head where you go to rest.',
    mediaType: 'image', mediaUrl: '/media/summit.jpg', thumbnail: '/media/summit.jpg',
    category: 'Photography', tags: ['sunset', 'mountains', 'landscape', 'photography'],
    aspect: 'landscape', views: 22300, likes: 1965,
    createdAt: '2026-10-24T12:20:00.000Z',
  },
];

export const seedComments: Comment[] = [
  { id: 'comment-coast-1', postId: 'coast-escape', creatorId: 'theo', text: 'The color of that water! Adding this to my someday list.', createdAt: '2026-10-25T16:40:00.000Z' },
  { id: 'comment-coast-2', postId: 'coast-escape', creatorId: 'noa', text: 'This is exactly the kind of reset I needed today.', createdAt: '2026-10-25T16:45:00.000Z' },
  { id: 'comment-coast-3', postId: 'coast-escape', creatorId: 'jules', text: 'Could watch this on loop forever. Beautiful little moment.', createdAt: '2026-10-25T16:50:00.000Z' },
  { id: 'comment-mountain-1', postId: 'mountain-morning', creatorId: 'maya', text: 'Proof that the early alarm is always worth it.', createdAt: '2026-10-25T15:30:00.000Z' },
  { id: 'comment-studio-1', postId: 'slow-sunday', creatorId: 'elena', text: 'Saving every single detail of this corner.', createdAt: '2026-10-25T14:40:00.000Z' },
  { id: 'comment-honey-1', postId: 'sweet-simple', creatorId: 'studio', text: 'The light, the plate, the honey. So lovely.', createdAt: '2026-10-25T13:50:00.000Z' },
  { id: 'comment-stars-1', postId: 'under-the-stars', creatorId: 'theo', text: 'Nothing quite like a sky with no city lights.', createdAt: '2026-10-25T11:30:00.000Z' },
  { id: 'comment-cat-1', postId: 'creative-director', creatorId: 'noa', text: 'Finally, a manager who understands work-life balance.', createdAt: '2026-10-24T17:00:00.000Z' },
];

export const seedMessages: Message[] = [
  { id: 'message-maya-1', senderId: 'maya', recipientId: 'demo-user', text: 'Hey Alex! Welcome to the demo. This is a sample conversation — a little space for your next creative connection.', createdAt: '2026-10-25T09:00:00.000Z' },
  { id: 'message-maya-2', senderId: 'demo-user', recipientId: 'maya', text: 'Thanks Maya! Already finding so much inspiration here.', createdAt: '2026-10-25T09:05:00.000Z' },
  { id: 'message-maya-3', senderId: 'maya', recipientId: 'demo-user', text: 'That is the best part. Have you started a board for your next adventure yet?', createdAt: '2026-10-25T16:00:00.000Z' },
  { id: 'message-theo-1', senderId: 'theo', recipientId: 'demo-user', text: 'Always happy to talk cameras, trails, or the best place to catch sunrise. This is a demo message to get you started.', createdAt: '2026-10-25T12:30:00.000Z' },
  { id: 'message-studio-1', senderId: 'studio', recipientId: 'demo-user', text: 'A little hello from Ordinary Studio. Save a few things you love and make this place your own. (Sample conversation)', createdAt: '2026-10-24T14:00:00.000Z' },
];

export const seedBoards: Board[] = [
  { id: 'board-someday', name: 'Somewhere, someday', description: 'Places worth taking the long way for.', postIds: ['coast-escape', 'mountain-morning', 'under-the-stars'], cover: '/media/coast.jpg' },
  { id: 'board-little-things', name: 'The little things', description: 'A collection of everyday good.', postIds: ['sweet-simple', 'picnic-club', 'creative-director'], cover: '/media/honey.jpg' },
  { id: 'board-room', name: 'Room to breathe', description: 'Thoughtful spaces and slower days.', postIds: ['slow-sunday', 'room-to-breathe'], cover: '/media/studio.jpg' },
];
