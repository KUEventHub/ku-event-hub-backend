# CS PROJECT

### Setup

1. install packages with `npm i`
2. create `.env` file in root
3. start server with `npm run dev`

### routes

#### users `/api/users`

- `post` `/api/users/create` create user
- `get` `/api/users/me` get user for user menu
- `post` `/api/users/login` log user's login
- `get` `/api/users/:id` get user information
- `get` `/api/users/:id/edit` get user information for editing
- `post` `/api/users/:id/edit` edit user information
- `post` `/api/users/:id/edit-privacy` edit user privacy
- `post` `/api/users/:id/unfriend` unfriend user
- `post` `/api/users/:id/ban` ban user
- `post` `/api/users/:id/unban` unban user

#### events `/api/events`

- `get` `/api/events/` get events
- `get` `/api/events/recommended` get recommended events
- `post` `/api/events/create` create event
- `post` `/api/events/check-qrcode` check qr code
- `get` `/api/events/:id` get event information
- `get` `/api/events/:id/edit` get event information for editing
- `post` `/api/events/:id/edit` edit event information
- `post` `/api/events/:id/join` join event
- `post` `/api/events/:id/leave` leave event
- `get` `/api/events/:id/qrcode` get qr code
- `post` `/api/events/:id/qrcode` create qr code
- `post` `/api/events/:id/verify` verify participation
- `post` `/api/events/:id/deactivate` deactivate event

#### friend requests `/api/friend-requests`

- `get` `/api/friend-requests/received` get received friend requests
- `get` `/api/friend-requests/sent` get sent friend requests
- `post` `/api/friend-requests/add` send a friend request
- `post` `/api/friend-requests/:id/accept` accept a friend request
- `post` `/api/friend-requests/:id/reject` reject a friend request
- `post` `/api/friend-requests/:id/cancel` cancel a friend request

#### admin `/api/admin`

- `get` `/api/admin/user-list` get user list
- `get` `/api/admin/banned-list` get banned user list
