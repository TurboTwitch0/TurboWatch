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
  {
    "id": "ines",
    "name": "Ines Romero",
    "username": "inesaroundtown",
    "avatar": "/media/avatar-ines.svg",
    "verified": true,
    "followers": 18300,
    "bio": "A city is a thousand tiny stories. Looking up at buildings, finding the quiet streets, and always taking notes.",
    "cover": "/media/lake-sunset.jpg"
  },
  {
    "id": "ari",
    "name": "Ari Lewis",
    "username": "arimakesthings",
    "avatar": "/media/avatar-ari.svg",
    "verified": false,
    "followers": 7200,
    "bio": "Color experiments, messy notebooks, and the happy accidents that turn into something. Make a little every day.",
    "cover": "/media/creative-table.jpg"
  },
  {
    "id": "sam",
    "name": "Sam Brooks",
    "username": "sambrews",
    "avatar": "/media/avatar-sam.svg",
    "verified": false,
    "followers": 13600,
    "bio": "Coffee first. Something delicious second. Stories from the kitchen and the little neighborhood places I love.",
    "cover": "/media/kitchen-prep.jpg"
  },
  {
    "id": "cleo",
    "name": "Cleo Winters",
    "username": "cleoonrepeat",
    "avatar": "/media/avatar-cleo.svg",
    "verified": true,
    "followers": 24100,
    "bio": "For the songs you play twice, the room before the show, and the people who stay for one more.",
    "cover": "/media/guitar-shop.jpg"
  },
  {
    "id": "finn",
    "name": "Finn Walker",
    "username": "finnoutside",
    "avatar": "/media/avatar-finn.svg",
    "verified": false,
    "followers": 15800,
    "bio": "Take the small road. Pack another layer. Outdoor moments, useful daydreams, and a very long someday list.",
    "cover": "/media/desert.jpg"
  },
  {
    "id": "zuri",
    "name": "Zuri Okafor",
    "username": "zuriseesthings",
    "avatar": "/media/avatar-zuri.svg",
    "verified": true,
    "followers": 29600,
    "bio": "Finding a frame in the everyday. Photographs, personal style, and the colors that follow me home.",
    "cover": "/media/wildlife.jpg"
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
  {
    "id": "alex-weekend-notes",
    "creatorId": "demo-user",
    "title": "Small plans for a big weekend.",
    "description": "A map full of circles and no alarm set for Monday. Collecting a few places to go when the calendar finally leaves a little room.",
    "mediaType": "image",
    "mediaUrl": "/media/mountains.jpg",
    "thumbnail": "/media/mountains.jpg",
    "category": "Travel",
    "tags": [
      "weekend",
      "daydreaming",
      "mountains"
    ],
    "aspect": "landscape",
    "views": 1840,
    "likes": 128,
    "createdAt": "2026-10-24T08:00:00.000Z"
  },
  {
    "id": "alex-creative-corner",
    "creatorId": "demo-user",
    "title": "The corner where ideas happen.",
    "description": "Made a small space for unfinished things. A little light, a place to sit, and one notebook that is allowed to be messy.",
    "mediaType": "image",
    "mediaUrl": "/media/studio.jpg",
    "thumbnail": "/media/studio.jpg",
    "category": "Design",
    "tags": [
      "workspace",
      "home",
      "makingthings"
    ],
    "aspect": "portrait",
    "views": 920,
    "likes": 74,
    "createdAt": "2026-10-24T08:10:00.000Z"
  },
  {
    "id": "alex-save-a-slice",
    "creatorId": "demo-user",
    "title": "An invitation to stay for dessert.",
    "description": "An excellent reason to clear the table slowly. Saving a seat, a slice, and another hour for the people who make a day feel good.",
    "mediaType": "image",
    "mediaUrl": "/media/picnic.jpg",
    "thumbnail": "/media/picnic.jpg",
    "category": "Food",
    "tags": [
      "dessert",
      "goodcompany",
      "weekend"
    ],
    "aspect": "square",
    "views": 2310,
    "likes": 206,
    "createdAt": "2026-10-24T08:20:00.000Z"
  },
  {
    "id": "alex-night-mode",
    "creatorId": "demo-user",
    "title": "Night mode, the good kind.",
    "description": "Putting the small screen away for the much bigger one. A still frame for anyone who needs a little perspective tonight.",
    "mediaType": "image",
    "mediaUrl": "/media/night.jpg",
    "thumbnail": "/media/night.jpg",
    "category": "Photography",
    "tags": [
      "night",
      "stars",
      "perspective"
    ],
    "aspect": "portrait",
    "views": 3150,
    "likes": 249,
    "createdAt": "2026-10-24T08:30:00.000Z"
  },
  {
    "id": "first-good-idea",
    "creatorId": "ari",
    "title": "Before the first good idea.",
    "description": "The desk before the work: loose pages, a favorite pen, and a camera close enough to catch the unexpected. Starting is a creative decision too.",
    "mediaType": "image",
    "mediaUrl": "/media/creative-table.jpg",
    "thumbnail": "/media/creative-table.jpg",
    "category": "Art",
    "tags": [
      "creativeprocess",
      "workspace",
      "notebooks"
    ],
    "aspect": "landscape",
    "views": 6800,
    "likes": 537,
    "createdAt": "2026-10-24T08:40:00.000Z"
  },
  {
    "id": "letter-love",
    "creatorId": "ari",
    "title": "A love letter to letters.",
    "description": "Today’s very small obsession: the shape of a serif, the space between two words, and a page that feels good before you even read it.",
    "mediaType": "image",
    "mediaUrl": "/media/type-study.jpg",
    "thumbnail": "/media/type-study.jpg",
    "category": "Art",
    "tags": [
      "typography",
      "letterpress",
      "design"
    ],
    "aspect": "landscape",
    "views": 7200,
    "likes": 638,
    "createdAt": "2026-10-24T08:50:00.000Z"
  },
  {
    "id": "camera-before-camera",
    "creatorId": "jules",
    "title": "The camera before the camera.",
    "description": "Two little time machines. I like that an old camera asks you to slow down before it asks you to press the shutter. What was your first camera?",
    "mediaType": "image",
    "mediaUrl": "/media/film-cameras.jpg",
    "thumbnail": "/media/film-cameras.jpg",
    "category": "Photography",
    "tags": [
      "film",
      "vintagecameras",
      "photography"
    ],
    "aspect": "landscape",
    "views": 13500,
    "likes": 1183,
    "createdAt": "2026-10-24T09:00:00.000Z"
  },
  {
    "id": "kitchen-ritual",
    "creatorId": "sam",
    "title": "The recipe starts with the prep.",
    "description": "A sharp knife, a good board, and the herbs that turn a simple dinner into something worth sitting down for. This is my favorite part before the first sizzle.",
    "mediaType": "image",
    "mediaUrl": "/media/kitchen-prep.jpg",
    "thumbnail": "/media/kitchen-prep.jpg",
    "category": "Food",
    "tags": [
      "cooking",
      "kitchen",
      "everydayrituals"
    ],
    "aspect": "landscape",
    "views": 9800,
    "likes": 764,
    "createdAt": "2026-10-24T09:10:00.000Z"
  },
  {
    "id": "makers-at-work",
    "creatorId": "milo",
    "title": "Measure twice. Make a little mess.",
    "description": "An appreciation post for the tools with worn edges. There is something lovely about making a useful thing with your hands and taking your time over it.",
    "mediaType": "image",
    "mediaUrl": "/media/makers-desk.jpg",
    "thumbnail": "/media/makers-desk.jpg",
    "category": "Design",
    "tags": [
      "craft",
      "tools",
      "madebyhand"
    ],
    "aspect": "landscape",
    "views": 8400,
    "likes": 591,
    "createdAt": "2026-10-24T09:20:00.000Z"
  },
  {
    "id": "sound-between-shelves",
    "creatorId": "cleo",
    "title": "A song between the shelves.",
    "description": "Records all around and a guitar in the middle. Some rooms make you want to stay until you discover something you did not know you were looking for.",
    "mediaType": "image",
    "mediaUrl": "/media/guitar-shop.jpg",
    "thumbnail": "/media/guitar-shop.jpg",
    "category": "Music",
    "tags": [
      "guitar",
      "recordshop",
      "music"
    ],
    "aspect": "square",
    "views": 15400,
    "likes": 1370,
    "createdAt": "2026-10-24T09:30:00.000Z"
  },
  {
    "id": "last-chord",
    "creatorId": "cleo",
    "title": "That last chord feeling.",
    "description": "The lights go blue, the room leans in, and the rest of the day gets a little quieter. A still frame from the kind of evening you want to remember.",
    "mediaType": "image",
    "mediaUrl": "/media/live-stage.jpg",
    "thumbnail": "/media/live-stage.jpg",
    "category": "Music",
    "tags": [
      "livemusic",
      "guitar",
      "stage"
    ],
    "aspect": "square",
    "views": 22900,
    "likes": 2085,
    "createdAt": "2026-10-24T09:40:00.000Z"
  },
  {
    "id": "pink-room",
    "creatorId": "cleo",
    "title": "When the room turns pink.",
    "description": "A little color study for the playlist in your head. Six strings, one spotlight, and a very good excuse to stay for the next song.",
    "mediaType": "image",
    "mediaUrl": "/media/after-hours.jpg",
    "thumbnail": "/media/after-hours.jpg",
    "category": "Music",
    "tags": [
      "afterhours",
      "guitar",
      "color"
    ],
    "aspect": "square",
    "views": 18700,
    "likes": 1642,
    "createdAt": "2026-10-24T09:50:00.000Z"
  },
  {
    "id": "red-rock-country",
    "creatorId": "finn",
    "title": "Out where the map gets quiet.",
    "description": "Red sandstone, open sky, and a landscape with absolutely no interest in your unread emails. This one is going straight on the someday list.",
    "mediaType": "image",
    "mediaUrl": "/media/desert.jpg",
    "thumbnail": "/media/desert.jpg",
    "category": "Outdoors",
    "tags": [
      "desert",
      "sandstone",
      "openroad"
    ],
    "aspect": "landscape",
    "views": 25300,
    "likes": 1940,
    "createdAt": "2026-10-24T10:00:00.000Z"
  },
  {
    "id": "small-friend",
    "creatorId": "zuri",
    "title": "Small friend. Very big landscape.",
    "description": "The best detail in the whole frame was the one I nearly walked past. A tiny reminder to look down as often as you look toward the horizon.",
    "mediaType": "image",
    "mediaUrl": "/media/wildlife.jpg",
    "thumbnail": "/media/wildlife.jpg",
    "category": "Photography",
    "tags": [
      "wildlife",
      "smallthings",
      "nature"
    ],
    "aspect": "square",
    "views": 17800,
    "likes": 1526,
    "createdAt": "2026-10-24T10:10:00.000Z"
  },
  {
    "id": "quiet-water",
    "creatorId": "theo",
    "title": "Pause here for a minute.",
    "description": "A few old branches, a very still surface, and no urgent reason to keep moving. An image for the quiet corner of your collection.",
    "mediaType": "image",
    "mediaUrl": "/media/quiet-water.jpg",
    "thumbnail": "/media/quiet-water.jpg",
    "category": "Outdoors",
    "tags": [
      "water",
      "stillness",
      "nature"
    ],
    "aspect": "portrait",
    "views": 11200,
    "likes": 892,
    "createdAt": "2026-10-24T10:20:00.000Z"
  },
  {
    "id": "tiny-headline",
    "creatorId": "zuri",
    "title": "The smallest headline of the day.",
    "description": "A tiny bird, a green branch, and a moment that would have been easy to miss. Not every good discovery makes a lot of noise.",
    "mediaType": "image",
    "mediaUrl": "/media/songbird.jpg",
    "thumbnail": "/media/songbird.jpg",
    "category": "Life",
    "tags": [
      "birds",
      "everydaywonder",
      "nature"
    ],
    "aspect": "portrait",
    "views": 21600,
    "likes": 2384,
    "createdAt": "2026-10-24T10:30:00.000Z"
  },
  {
    "id": "arctic-company",
    "creatorId": "maya",
    "title": "A very quiet kind of company.",
    "description": "Two birds on a little patch of ice and a whole ocean beyond them. Some of the most memorable travel frames are the ones that leave room to breathe.",
    "mediaType": "image",
    "mediaUrl": "/media/arctic.jpg",
    "thumbnail": "/media/arctic.jpg",
    "category": "Travel",
    "tags": [
      "birds",
      "coldwater",
      "travel"
    ],
    "aspect": "landscape",
    "views": 28200,
    "likes": 2419,
    "createdAt": "2026-10-24T10:40:00.000Z"
  },
  {
    "id": "lake-lines",
    "creatorId": "ines",
    "title": "Lines that lead to a slower evening.",
    "description": "A wooden jetty, a still lake, and the last warm light. I love a simple piece of design that quietly gives you a new way to see a place.",
    "mediaType": "image",
    "mediaUrl": "/media/lake-sunset.jpg",
    "thumbnail": "/media/lake-sunset.jpg",
    "category": "Design",
    "tags": [
      "jetty",
      "landscape",
      "sunset"
    ],
    "aspect": "landscape",
    "views": 14900,
    "likes": 1205,
    "createdAt": "2026-10-24T10:50:00.000Z"
  },
  {
    "id": "cockatoo-moment",
    "creatorId": "milo",
    "title": "Main character energy.",
    "description": "A white cockatoo taking a very small moment very seriously. A little bird-watching break for anyone who has been concentrating on the wrong kind of screen.",
    "mediaType": "video",
    "mediaUrl": "/media/clip-cockatoo.mp4",
    "thumbnail": "/media/clip-cockatoo.jpg",
    "category": "Life",
    "tags": [
      "cockatoo",
      "birds",
      "smalljoys"
    ],
    "aspect": "portrait",
    "duration": "0:14",
    "views": 36200,
    "likes": 3514,
    "createdAt": "2026-10-24T12:00:00.000Z"
  },
  {
    "id": "bloom-time",
    "creatorId": "zuri",
    "title": "A little patience, in bloom.",
    "description": "A red flower opening in time-lapse. Five seconds for the things that usually happen while we are busy looking somewhere else.",
    "mediaType": "video",
    "mediaUrl": "/media/clip-flower.mp4",
    "thumbnail": "/media/clip-flower.jpg",
    "category": "Outdoors",
    "tags": [
      "flower",
      "timelapse",
      "nature"
    ],
    "aspect": "portrait",
    "duration": "0:05",
    "views": 14200,
    "likes": 1345,
    "createdAt": "2026-10-24T12:05:00.000Z"
  },
  {
    "id": "cinema-rewind",
    "creatorId": "ines",
    "title": "A scene worth another look.",
    "description": "A six-second look at the rhythm of an old black-and-white office scene. Film excerpt from His Girl Friday (1940), included here as a little classic-cinema inspiration.",
    "mediaType": "video",
    "mediaUrl": "/media/clip-cinema.mp4",
    "thumbnail": "/media/clip-cinema.jpg",
    "category": "Culture",
    "tags": [
      "classicfilm",
      "cinema",
      "blackandwhite"
    ],
    "aspect": "landscape",
    "duration": "0:06",
    "views": 8400,
    "likes": 770,
    "createdAt": "2026-10-24T12:10:00.000Z"
  },
  {
    "id": "stream-reset",
    "creatorId": "finn",
    "title": "A tiny reset, on repeat.",
    "description": "Just water finding its way over the rocks. A very short loop for the part of your afternoon that needs a little less hurry.",
    "mediaType": "video",
    "mediaUrl": "/media/clip-stream.mp4",
    "thumbnail": "/media/clip-stream.jpg",
    "category": "Outdoors",
    "tags": [
      "water",
      "stream",
      "slowdown"
    ],
    "aspect": "landscape",
    "duration": "0:03",
    "views": 19600,
    "likes": 1697,
    "createdAt": "2026-10-24T12:15:00.000Z"
  },
  {
    "id": "rabbit-break",
    "creatorId": "noa",
    "title": "Your very important rabbit break.",
    "description": "A real white rabbit, a little grass, and an extremely unhurried moment. The official schedule has been adjusted accordingly.",
    "mediaType": "video",
    "mediaUrl": "/media/clip-rabbit.mp4",
    "thumbnail": "/media/clip-rabbit.jpg",
    "category": "Life",
    "tags": [
      "rabbit",
      "animals",
      "littlebreak"
    ],
    "aspect": "landscape",
    "duration": "0:08",
    "views": 46300,
    "likes": 4058,
    "createdAt": "2026-10-24T12:20:00.000Z"
  },
  {
    "id": "tiny-leap",
    "creatorId": "ari",
    "title": "Small jump. Big personality.",
    "description": "A tiny green wind-up frog hopping across a wooden table. This is a toy, and a very charming reminder that useful design can make room for play.",
    "mediaType": "video",
    "mediaUrl": "/media/clip-toy-frog.mp4",
    "thumbnail": "/media/clip-toy-frog.jpg",
    "category": "Design",
    "tags": [
      "winduptoy",
      "design",
      "play"
    ],
    "aspect": "landscape",
    "duration": "0:08",
    "views": 9200,
    "likes": 796,
    "createdAt": "2026-10-24T12:25:00.000Z"
  },
  {
    "id": "made-for-joy",
    "creatorId": "milo",
    "title": "Built for a little bit of joy.",
    "description": "A pink wind-up toy pig taking its tiny job very seriously. Simple objects sometimes have the most personality. File under things that make an ordinary day better.",
    "mediaType": "video",
    "mediaUrl": "/media/clip-toy-pig.mp4",
    "thumbnail": "/media/clip-toy-pig.jpg",
    "category": "Design",
    "tags": [
      "winduptoy",
      "littlethings",
      "objects"
    ],
    "aspect": "landscape",
    "duration": "0:07",
    "views": 11600,
    "likes": 998,
    "createdAt": "2026-10-24T12:30:00.000Z"
  },
  {
    "id": "imagined-worlds",
    "creatorId": "ari",
    "title": "A world someone imagined first.",
    "description": "Curated excerpt from Sintel © 2010 Blender Foundation (CC BY 3.0), trimmed and transcoded for this demo. A reminder that a whole world can start with a sketch, a story, and a lot of curiosity.",
    "mediaType": "video",
    "mediaUrl": "/media/clip-sintel.mp4",
    "thumbnail": "/media/clip-sintel.jpg",
    "category": "Art",
    "tags": [
      "animation",
      "sintel",
      "storytelling"
    ],
    "aspect": "landscape",
    "duration": "0:12",
    "views": 30600,
    "likes": 2480,
    "createdAt": "2026-10-24T12:35:00.000Z"
  },
  {
    "id": "produce-in-motion",
    "creatorId": "sam",
    "title": "A colorful little detour.",
    "description": "Curated excerpt from Intel IoT DevKit sample-videos (CC BY 4.0), trimmed and transcoded for this demo. Apples, broccoli, and pineapple move along a demonstration conveyor: a little color study in motion.",
    "mediaType": "video",
    "mediaUrl": "/media/clip-produce.mp4",
    "thumbnail": "/media/clip-produce.jpg",
    "category": "Food",
    "tags": [
      "produce",
      "color",
      "food"
    ],
    "aspect": "landscape",
    "duration": "0:12",
    "views": 7100,
    "likes": 573,
    "createdAt": "2026-10-24T12:40:00.000Z"
  },
  {
    "id": "city-choreography",
    "creatorId": "ines",
    "title": "The little choreography of a city.",
    "description": "Curated excerpt from Intel IoT DevKit sample-videos (CC BY 4.0), trimmed and transcoded. People, a cyclist, and a car cross a demonstration parking area. The ordinary gets interesting when you change the angle.",
    "mediaType": "video",
    "mediaUrl": "/media/clip-city.mp4",
    "thumbnail": "/media/clip-city.jpg",
    "category": "Culture",
    "tags": [
      "citylife",
      "fromabove",
      "perspective"
    ],
    "aspect": "landscape",
    "duration": "0:12",
    "views": 22800,
    "likes": 1960,
    "createdAt": "2026-10-24T12:45:00.000Z"
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
  {
    "id": "comment-expanded-01",
    "postId": "alex-weekend-notes",
    "creatorId": "finn",
    "text": "Leave one circle on the map for a place you have not found yet.",
    "createdAt": "2026-10-25T17:01:00.000Z"
  },
  {
    "id": "comment-expanded-02",
    "postId": "alex-creative-corner",
    "creatorId": "studio",
    "text": "The best workspace is the one that makes you want to come back tomorrow.",
    "createdAt": "2026-10-25T17:02:00.000Z"
  },
  {
    "id": "comment-expanded-03",
    "postId": "alex-save-a-slice",
    "creatorId": "noa",
    "text": "Sending this to everyone who says they are too full for dessert.",
    "createdAt": "2026-10-25T17:03:00.000Z"
  },
  {
    "id": "comment-expanded-04",
    "postId": "alex-night-mode",
    "creatorId": "maya",
    "text": "The only kind of night mode I want after a long day.",
    "createdAt": "2026-10-25T17:04:00.000Z"
  },
  {
    "id": "comment-expanded-05",
    "postId": "first-good-idea",
    "creatorId": "ines",
    "text": "The loose pages are usually where the interesting ideas live.",
    "createdAt": "2026-10-25T17:05:00.000Z"
  },
  {
    "id": "comment-expanded-06",
    "postId": "letter-love",
    "creatorId": "milo",
    "text": "That little bit of ink texture is doing so much. Love this.",
    "createdAt": "2026-10-25T17:06:00.000Z"
  },
  {
    "id": "comment-expanded-07",
    "postId": "camera-before-camera",
    "creatorId": "theo",
    "text": "My first was a hand-me-down with a light meter that only worked sometimes.",
    "createdAt": "2026-10-25T17:07:00.000Z"
  },
  {
    "id": "comment-expanded-08",
    "postId": "kitchen-ritual",
    "creatorId": "noa",
    "text": "The smell of chopped herbs is half the reason I cook.",
    "createdAt": "2026-10-25T17:08:00.000Z"
  },
  {
    "id": "comment-expanded-09",
    "postId": "makers-at-work",
    "creatorId": "ari",
    "text": "A worn-in ruler and a brand-new idea is a great combination.",
    "createdAt": "2026-10-25T17:09:00.000Z"
  },
  {
    "id": "comment-expanded-10",
    "postId": "sound-between-shelves",
    "creatorId": "sam",
    "text": "Coffee, records, and a guitar. I could lose an entire afternoon here.",
    "createdAt": "2026-10-25T17:10:00.000Z"
  },
  {
    "id": "comment-expanded-11",
    "postId": "last-chord",
    "creatorId": "jules",
    "text": "That blue light makes the whole room feel like a memory.",
    "createdAt": "2026-10-25T17:11:00.000Z"
  },
  {
    "id": "comment-expanded-12",
    "postId": "pink-room",
    "creatorId": "elena",
    "text": "Saving this color palette before I forget how much I love it.",
    "createdAt": "2026-10-25T17:12:00.000Z"
  },
  {
    "id": "comment-expanded-13",
    "postId": "red-rock-country",
    "creatorId": "maya",
    "text": "The scale of this place! Suddenly my to-do list feels very small.",
    "createdAt": "2026-10-25T17:13:00.000Z"
  },
  {
    "id": "comment-expanded-14",
    "postId": "small-friend",
    "creatorId": "finn",
    "text": "The tiny wildlife sightings always become the best story from the walk.",
    "createdAt": "2026-10-25T17:14:00.000Z"
  },
  {
    "id": "comment-expanded-15",
    "postId": "quiet-water",
    "creatorId": "studio",
    "text": "This is what I wish my thoughts looked like at the end of a busy week.",
    "createdAt": "2026-10-25T17:15:00.000Z"
  },
  {
    "id": "comment-expanded-16",
    "postId": "tiny-headline",
    "creatorId": "milo",
    "text": "Very important bird news. Thank you for the excellent reporting.",
    "createdAt": "2026-10-25T17:16:00.000Z"
  },
  {
    "id": "comment-expanded-17",
    "postId": "arctic-company",
    "creatorId": "zuri",
    "text": "The space around them is just as beautiful as the birds themselves.",
    "createdAt": "2026-10-25T17:17:00.000Z"
  },
  {
    "id": "comment-expanded-18",
    "postId": "lake-lines",
    "creatorId": "ari",
    "text": "Such a simple line through the frame. It gives everything else room to breathe.",
    "createdAt": "2026-10-25T17:18:00.000Z"
  },
  {
    "id": "comment-expanded-19",
    "postId": "golden-hour",
    "creatorId": "zuri",
    "text": "That warm yellow and the light together. A whole afternoon in one frame.",
    "createdAt": "2026-10-25T17:19:00.000Z"
  },
  {
    "id": "comment-expanded-20",
    "postId": "vintage-soul",
    "creatorId": "ines",
    "text": "Little details made with care never really go out of style.",
    "createdAt": "2026-10-25T17:20:00.000Z"
  },
  {
    "id": "comment-expanded-21",
    "postId": "picnic-club",
    "creatorId": "sam",
    "text": "I volunteer to carry the picnic basket. Very selfless of me.",
    "createdAt": "2026-10-25T17:21:00.000Z"
  },
  {
    "id": "comment-expanded-22",
    "postId": "closer-to-clouds",
    "creatorId": "finn",
    "text": "The weather change that turns into the photo you keep forever.",
    "createdAt": "2026-10-25T17:22:00.000Z"
  },
  {
    "id": "comment-expanded-23",
    "postId": "room-to-breathe",
    "creatorId": "demo-user",
    "text": "A reminder to buy one plant before I buy another storage box.",
    "createdAt": "2026-10-25T17:23:00.000Z"
  },
  {
    "id": "comment-expanded-24",
    "postId": "last-light",
    "creatorId": "maya",
    "text": "This is the frame I would stay another hour for.",
    "createdAt": "2026-10-25T17:24:00.000Z"
  },
  {
    "id": "comment-expanded-25",
    "postId": "alex-creative-corner",
    "creatorId": "demo-user",
    "text": "Exactly. Trying to make a little room for the work before the work.",
    "createdAt": "2026-10-25T17:25:00.000Z"
  },
  {
    "id": "comment-expanded-26",
    "postId": "kitchen-ritual",
    "creatorId": "sam",
    "text": "Yes! Especially when you accidentally chop more than the recipe needs.",
    "createdAt": "2026-10-25T17:26:00.000Z"
  },
  {
    "id": "comment-expanded-27",
    "postId": "camera-before-camera",
    "creatorId": "jules",
    "text": "A temperamental light meter is practically a character-building exercise.",
    "createdAt": "2026-10-25T17:27:00.000Z"
  },
  {
    "id": "comment-expanded-28",
    "postId": "cockatoo-moment",
    "creatorId": "zuri",
    "text": "That little head tilt deserves its own close-up.",
    "createdAt": "2026-10-25T17:28:00.000Z"
  },
  {
    "id": "comment-expanded-29",
    "postId": "bloom-time",
    "creatorId": "studio",
    "text": "A useful reminder that the good things can take their time.",
    "createdAt": "2026-10-25T17:29:00.000Z"
  },
  {
    "id": "comment-expanded-30",
    "postId": "cinema-rewind",
    "creatorId": "cleo",
    "text": "Black-and-white films make even an ordinary office look like a story.",
    "createdAt": "2026-10-25T17:30:00.000Z"
  },
  {
    "id": "comment-expanded-31",
    "postId": "stream-reset",
    "creatorId": "theo",
    "text": "Watched twice. Immediately planned a walk somewhere with water.",
    "createdAt": "2026-10-25T17:31:00.000Z"
  },
  {
    "id": "comment-expanded-32",
    "postId": "rabbit-break",
    "creatorId": "sam",
    "text": "I support every single decision this rabbit is making.",
    "createdAt": "2026-10-25T17:32:00.000Z"
  },
  {
    "id": "comment-expanded-33",
    "postId": "tiny-leap",
    "creatorId": "milo",
    "text": "Proof that a small mechanism can have a very big personality.",
    "createdAt": "2026-10-25T17:33:00.000Z"
  },
  {
    "id": "comment-expanded-34",
    "postId": "made-for-joy",
    "creatorId": "ari",
    "text": "Putting this in the collection called things that made me smile.",
    "createdAt": "2026-10-25T17:34:00.000Z"
  },
  {
    "id": "comment-expanded-35",
    "postId": "imagined-worlds",
    "creatorId": "jules",
    "text": "Every frame is a little world-building lesson. Beautiful work from Blender.",
    "createdAt": "2026-10-25T17:35:00.000Z"
  },
  {
    "id": "comment-expanded-36",
    "postId": "produce-in-motion",
    "creatorId": "noa",
    "text": "Now I want to cook something that keeps all of these colors.",
    "createdAt": "2026-10-25T17:36:00.000Z"
  },
  {
    "id": "comment-expanded-37",
    "postId": "city-choreography",
    "creatorId": "finn",
    "text": "Changing the angle makes the familiar feel like a new place.",
    "createdAt": "2026-10-25T17:37:00.000Z"
  },
];

export const seedMessages: Message[] = [
  { id: 'message-maya-1', senderId: 'maya', recipientId: 'demo-user', text: 'Hey Alex! Welcome to the demo. This is a sample conversation — a little space for your next creative connection.', createdAt: '2026-10-25T09:00:00.000Z' },
  { id: 'message-maya-2', senderId: 'demo-user', recipientId: 'maya', text: 'Thanks Maya! Already finding so much inspiration here.', createdAt: '2026-10-25T09:05:00.000Z' },
  { id: 'message-maya-3', senderId: 'maya', recipientId: 'demo-user', text: 'That is the best part. Have you started a board for your next adventure yet?', createdAt: '2026-10-25T16:00:00.000Z' },
  { id: 'message-theo-1', senderId: 'theo', recipientId: 'demo-user', text: 'Always happy to talk cameras, trails, or the best place to catch sunrise. This is a demo message to get you started.', createdAt: '2026-10-25T12:30:00.000Z' },
  { id: 'message-studio-1', senderId: 'studio', recipientId: 'demo-user', text: 'A little hello from Ordinary Studio. Save a few things you love and make this place your own. (Sample conversation)', createdAt: '2026-10-24T14:00:00.000Z' },
  {
    "id": "message-expanded-01",
    "senderId": "demo-user",
    "recipientId": "maya",
    "text": "Made my Somewhere, someday collection. It is getting dangerously long.",
    "createdAt": "2026-10-25T16:10:00.000Z"
  },
  {
    "id": "message-expanded-02",
    "senderId": "maya",
    "recipientId": "demo-user",
    "text": "A very good problem to have. I am keeping a whole weekend free for it.",
    "createdAt": "2026-10-25T16:12:00.000Z"
  },
  {
    "id": "message-expanded-03",
    "senderId": "demo-user",
    "recipientId": "theo",
    "text": "Do you travel light when you are taking photos on a hike?",
    "createdAt": "2026-10-25T13:05:00.000Z"
  },
  {
    "id": "message-expanded-04",
    "senderId": "theo",
    "recipientId": "demo-user",
    "text": "One lens, an extra battery, and enough room for snacks. The snacks are non-negotiable.",
    "createdAt": "2026-10-25T13:08:00.000Z"
  },
  {
    "id": "message-expanded-05",
    "senderId": "demo-user",
    "recipientId": "studio",
    "text": "Your slower Sunday corner is exactly what my room needs.",
    "createdAt": "2026-10-25T11:20:00.000Z"
  },
  {
    "id": "message-expanded-06",
    "senderId": "studio",
    "recipientId": "demo-user",
    "text": "Start with a lamp you love and one place to put your coffee. The rest can take its time.",
    "createdAt": "2026-10-25T11:25:00.000Z"
  },
  {
    "id": "message-expanded-07",
    "senderId": "ines",
    "recipientId": "demo-user",
    "text": "A sample hello from Ines! My favorite way to learn a city is to walk one street past the plan.",
    "createdAt": "2026-10-25T14:00:00.000Z"
  },
  {
    "id": "message-expanded-08",
    "senderId": "demo-user",
    "recipientId": "ines",
    "text": "The accidental side street always ends up being the best part.",
    "createdAt": "2026-10-25T14:04:00.000Z"
  },
  {
    "id": "message-expanded-09",
    "senderId": "ines",
    "recipientId": "demo-user",
    "text": "Exactly. A little map room for getting pleasantly distracted.",
    "createdAt": "2026-10-25T14:06:00.000Z"
  },
  {
    "id": "message-expanded-10",
    "senderId": "ari",
    "recipientId": "demo-user",
    "text": "Welcome to the demo, Alex. This is a sample conversation about making things even when the idea is not finished yet.",
    "createdAt": "2026-10-25T10:00:00.000Z"
  },
  {
    "id": "message-expanded-11",
    "senderId": "demo-user",
    "recipientId": "ari",
    "text": "I needed that reminder. My notebook is mostly arrows and unfinished titles.",
    "createdAt": "2026-10-25T10:05:00.000Z"
  },
  {
    "id": "message-expanded-12",
    "senderId": "ari",
    "recipientId": "demo-user",
    "text": "That sounds like a notebook doing its job. Keep a few pages for the weird ideas.",
    "createdAt": "2026-10-25T10:07:00.000Z"
  },
  {
    "id": "message-expanded-13",
    "senderId": "sam",
    "recipientId": "demo-user",
    "text": "A sample coffee chat to get you started. The current question: breakfast now, or a second breakfast later?",
    "createdAt": "2026-10-25T08:30:00.000Z"
  },
  {
    "id": "message-expanded-14",
    "senderId": "demo-user",
    "recipientId": "sam",
    "text": "Both feels like the correct answer to this very important question.",
    "createdAt": "2026-10-25T08:33:00.000Z"
  },
  {
    "id": "message-expanded-15",
    "senderId": "sam",
    "recipientId": "demo-user",
    "text": "Excellent. We are going to get along just fine.",
    "createdAt": "2026-10-25T08:35:00.000Z"
  },
  {
    "id": "message-expanded-16",
    "senderId": "cleo",
    "recipientId": "demo-user",
    "text": "A little sample message from Cleo. What song would you put on a playlist called Take the Long Way?",
    "createdAt": "2026-10-25T15:10:00.000Z"
  },
  {
    "id": "message-expanded-17",
    "senderId": "demo-user",
    "recipientId": "cleo",
    "text": "Something that makes a ten-minute walk turn into a whole afternoon.",
    "createdAt": "2026-10-25T15:14:00.000Z"
  },
  {
    "id": "message-expanded-18",
    "senderId": "cleo",
    "recipientId": "demo-user",
    "text": "Perfect brief. Leaving space for a surprise track in the middle.",
    "createdAt": "2026-10-25T15:17:00.000Z"
  },
  {
    "id": "message-expanded-19",
    "senderId": "finn",
    "recipientId": "demo-user",
    "text": "A fictional trail conversation for the demo: what is the one thing you always forget to pack?",
    "createdAt": "2026-10-24T17:00:00.000Z"
  },
  {
    "id": "message-expanded-20",
    "senderId": "demo-user",
    "recipientId": "finn",
    "text": "The spare layer, somehow. Every single time.",
    "createdAt": "2026-10-24T17:04:00.000Z"
  },
  {
    "id": "message-expanded-21",
    "senderId": "finn",
    "recipientId": "demo-user",
    "text": "I now put mine on top of my shoes the night before. Very advanced outdoor technology.",
    "createdAt": "2026-10-24T17:07:00.000Z"
  },
];

export const seedBoards: Board[] = [
  { id: 'board-someday', name: 'Somewhere, someday', description: 'Places worth taking the long way for.', postIds: ['coast-escape', 'mountain-morning', 'under-the-stars'], cover: '/media/coast.jpg' },
  { id: 'board-little-things', name: 'The little things', description: 'A collection of everyday good.', postIds: ['sweet-simple', 'picnic-club', 'creative-director'], cover: '/media/honey.jpg' },
  { id: 'board-room', name: 'Room to breathe', description: 'Thoughtful spaces and slower days.', postIds: ['slow-sunday', 'room-to-breathe'], cover: '/media/studio.jpg' },
  {
    "id": "board-creative-spark",
    "name": "A creative spark",
    "description": "Tools, textures, and ideas for the next thing you make.",
    "postIds": [
      "first-good-idea",
      "letter-love",
      "camera-before-camera",
      "makers-at-work",
      "alex-creative-corner"
    ],
    "cover": "/media/creative-table.jpg"
  },
  {
    "id": "board-after-hours",
    "name": "After hours",
    "description": "The lights, the songs, and the frames that stay with you.",
    "postIds": [
      "sound-between-shelves",
      "last-chord",
      "pink-room",
      "alex-night-mode",
      "cinema-rewind"
    ],
    "cover": "/media/live-stage.jpg"
  },
  {
    "id": "board-on-the-menu",
    "name": "On the menu",
    "description": "A very good excuse to gather around the table.",
    "postIds": [
      "kitchen-ritual",
      "sweet-simple",
      "picnic-club",
      "alex-save-a-slice"
    ],
    "cover": "/media/kitchen-prep.jpg"
  },
  {
    "id": "board-go-play",
    "name": "Go out and play",
    "description": "Little adventures, wide-open views, and reasons to go outside.",
    "postIds": [
      "red-rock-country",
      "quiet-water",
      "arctic-company",
      "lake-lines",
      "stream-reset"
    ],
    "cover": "/media/desert.jpg"
  },
];
