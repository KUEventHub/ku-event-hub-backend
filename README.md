# CS PROJECT

### Setup

1. install packages with `npm i`
2. create `.env` file in root
3. start server with `npm run dev`

### routes

#### users `/api/users`

- `post` `/api/users/create` create user
- `get` `/api/users/me` fetch user for user menu
- `get` `/api/users/:id` fetch user information
- `get` `/api/users/:id/edit` get user information for editing
- `post` `/api/users/:id/edit` edit user information

#### events `/api/events`

- `get` `/api/events/` fetch events
- `post` `/api/events/create` create event
