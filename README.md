# ShortIQ

### Link Shortening & Analytics Platform

ShortIQ is a full-stack URL shortening platform built to provide fast link creation, reliable redirects, and detailed click analytics through a clean, authenticated dashboard.

It combines a React-based frontend with a TypeScript/Express backend, PostgreSQL persistence, Redis caching, and asynchronous analytics processing.

---

## Overview

ShortIQ allows users to create, manage, and analyze short links from a single dashboard.

Each generated link can optionally use a custom alias or expiration time. When a short link is accessed, ShortIQ resolves the destination, records contextual analytics asynchronously, and redirects the visitor to the original URL.

The platform is designed around production-oriented engineering practices including authentication, request validation, rate limiting, caching, structured logging, database indexing, and asynchronous event processing.

---

## Features

### Link Management

* Create short URLs from long destinations
* Automatically generate unique short aliases
* Support custom aliases
* Optional link expiration
* View all links belonging to the authenticated user
* Copy generated short links
* Delete existing links

### Analytics

ShortIQ records and aggregates information about link activity, including:

* Total clicks
* Browser distribution
* Device type distribution
* Operating system distribution
* Country distribution
* Referrer information
* Click timestamps

IP addresses are hashed before analytics events are persisted.

### Authentication

* Google authentication through Firebase Authentication
* Anonymous guest access
* Firebase ID-token verification on protected API routes
* User synchronization between Firebase Authentication and PostgreSQL
* User-level ownership checks for link operations

### Performance & Reliability

* Redis caching for frequently accessed short links
* Asynchronous analytics processing with BullMQ
* In-memory fallback for development environments without Redis
* PostgreSQL indexes for frequently queried fields
* Automatic retry when generated aliases collide

### Security

* Helmet security middleware
* API rate limiting
* Separate limits for authentication, URL creation, API access, and redirects
* HTTP/HTTPS URL validation
* Authenticated ownership checks
* Environment-based configuration
* Secrets excluded from version control

---

## Architecture

```text
                         ┌──────────────────────┐
                         │      React Client    │
                         │   React + TypeScript  │
                         │        + Vite         │
                         └──────────┬───────────┘
                                    │
                                    │ HTTP / JSON
                                    ▼
                         ┌──────────────────────┐
                         │    Express Server    │
                         │    TypeScript API    │
                         └──────────┬───────────┘
                                    │
                  ┌─────────────────┼─────────────────┐
                  │                 │                 │
                  ▼                 ▼                 ▼
          ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
          │ PostgreSQL   │  │    Redis     │  │   Firebase   │
          │   + Drizzle  │  │    Cache     │  │     Auth     │
          └──────────────┘  └──────────────┘  └──────────────┘
                                    │
                                    ▼
                           ┌─────────────────┐
                           │     BullMQ      │
                           │ Analytics Queue │
                           └────────┬────────┘
                                    │
                                    ▼
                           ┌─────────────────┐
                           │ Click Analytics │
                           │   PostgreSQL    │
                           └─────────────────┘
```

---

## Request Flow

### Creating a short link

```text
User
 │
 ▼
React Dashboard
 │
 ▼
POST /api/urls
 │
 ▼
Authentication + Rate Limit
 │
 ▼
URL Validation
 │
 ▼
Generate / Validate Alias
 │
 ▼
PostgreSQL
 │
 ▼
Redis Cache
 │
 ▼
Return Short URL
```

### Redirect and analytics flow

```text
Visitor
 │
 ▼
/r/{alias}
 │
 ▼
Redis lookup
 │
 ├── Cache hit ─────────────┐
 │                          │
 └── Cache miss → PostgreSQL│
                            │
                            ▼
                     Resolve destination
                            │
                            ▼
                         Redirect
                            │
                            └──────────────┐
                                           ▼
                                  Collect request context
                                           │
                                           ▼
                                    BullMQ analytics
                                           │
                                           ▼
                                       PostgreSQL
```

Analytics processing is intentionally separated from the redirect path so that analytics persistence does not need to block the core redirect operation.

---

## Technology Stack

| Layer          | Technology                   |
| -------------- | ---------------------------- |
| Frontend       | React, TypeScript, Vite      |
| Styling        | Tailwind CSS                 |
| Backend        | Node.js, Express, TypeScript |
| Database       | PostgreSQL                   |
| ORM            | Drizzle ORM                  |
| Cache          | Redis                        |
| Queue          | BullMQ                       |
| Authentication | Firebase Authentication      |
| Analytics      | UAParser, GeoIP              |
| Validation     | Zod                          |
| Security       | Helmet, express-rate-limit   |
| Logging        | Winston                      |
| Build          | Vite, esbuild                |
| Runtime        | Node.js / tsx                |

---

## API

### Health Check

```http
GET /api/health
```

Returns the current API health status.

### Authentication

```http
POST /api/auth/sync
```

Synchronizes the authenticated Firebase user with the application database.

### Create Short URL

```http
POST /api/urls
```

Creates a short URL for the authenticated user.

Example request:

```json
{
  "originalUrl": "https://example.com/some/long/path",
  "customAlias": "example",
  "expiresAt": null
}
```

### List User URLs

```http
GET /api/urls
```

Returns URLs belonging to the authenticated user.

### Link Analytics

```http
GET /api/urls/:id/analytics
```

Returns aggregated analytics for a specific link.

### Delete Link

```http
DELETE /api/urls/:id
```

Deletes a link and its associated analytics.

### Redirect

```http
GET /r/:alias
```

Resolves a short alias and redirects the visitor to its destination.

---

## Data Model

ShortIQ uses three primary PostgreSQL entities:

```text
Users
 │
 └──< URLs
        │
        └──< Clicks
```

### Users

Stores application-level user records associated with Firebase Authentication.

### URLs

Stores:

* Original destination
* Short alias
* Owner
* Creation timestamp
* Optional expiration timestamp

### Clicks

Stores analytics events including:

* URL reference
* Hashed IP
* Country / region / city
* Device type
* Browser
* Operating system
* Referrer
* Timestamp

Database indexes are used for user ownership, aliases, URL references, and click timestamps.

---

## Getting Started

### Prerequisites

Make sure the following are installed:

* Node.js
* npm
* PostgreSQL
* Redis
* A Firebase project with Authentication configured

### 1. Clone the repository

```bash
git clone https://github.com/Rishav9142/ShortIQ.git
cd ShortIQ
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a local `.env` file based on `.env.example`.

```bash
cp .env.example .env
```

Never commit `.env` or any credential files.

### 4. Configure PostgreSQL

Set the PostgreSQL connection string in your environment:

```env
DATABASE_URL=your_postgresql_connection_string
```

### 5. Configure Redis

```env
REDIS_URL=your_redis_connection_string
```

### 6. Configure Firebase

Configure the Firebase client and server credentials using the environment variables documented in `.env.example`.

### 7. Push the database schema

```bash
npm run db:push
```

### 8. Start the development server

```bash
npm run dev
```

The application will be available at:

```text
http://localhost:3000
```

---

## Available Scripts

| Command             | Purpose                                 |
| ------------------- | --------------------------------------- |
| `npm run dev`       | Start the development server            |
| `npm run build`     | Build the frontend and backend          |
| `npm start`         | Start the production build              |
| `npm run preview`   | Preview the Vite production build       |
| `npm run lint`      | Run TypeScript validation               |
| `npm run db:push`   | Push the Drizzle schema to the database |
| `npm run db:studio` | Open Drizzle Studio                     |

---

## Engineering Practices

ShortIQ is structured around several production-oriented principles:

### Authentication at the API boundary

Protected endpoints require a verified Firebase ID token before accessing user-owned resources.

### Ownership enforcement

Database queries scope URL operations to the authenticated user, preventing users from modifying resources belonging to another account.

### Cache-first redirects

Short-link resolution checks Redis before falling back to PostgreSQL, reducing database reads on frequently accessed links.

### Asynchronous analytics

Analytics events are queued through BullMQ when Redis is available, keeping analytics persistence separate from the primary redirect path.

### Rate limiting

Different API operations have dedicated rate limits to reduce abuse and protect expensive endpoints.

### Database indexing

Indexes are defined for commonly queried relationships and timestamps to improve lookup performance as the dataset grows.

### Secure configuration

Credentials and environment-specific configuration are kept outside source control.

---

## Project Structure

```text
ShortIQ/
├── src/
│   ├── components/       # React UI components
│   ├── db/               # Drizzle schema and database access
│   ├── lib/              # Firebase, Redis, queues, logging, utilities
│   ├── middleware/       # Authentication and rate limiting
│   ├── App.tsx           # Application entry component
│   ├── main.tsx          # React entry point
│   └── types.ts          # Shared TypeScript types
│
├── server.ts             # Express application and API routes
├── drizzle.config.ts     # Drizzle configuration
├── docker-compose.yml    # Local service orchestration
├── vite.config.ts        # Vite configuration
├── tsconfig.json         # TypeScript configuration
├── package.json          # Dependencies and scripts
├── .env.example          # Environment variable template
└── README.md
```

---

## Security

ShortIQ follows basic application-security practices including:

* Authentication and authorization on protected routes
* Input validation for destination URLs
* Request rate limiting
* Helmet security headers
* Hashed IP storage for analytics
* Environment-based secrets
* Secret files excluded from Git

Security issues should not be reported through public issues when they contain sensitive information. Please use the repository's security reporting mechanism instead.

---

## Development Workflow

The repository is intended to follow a production-style development workflow:

```text
Feature / Fix
     │
     ▼
Local Development
     │
     ▼
TypeScript Validation
     │
     ▼
Testing
     │
     ▼
Pull Request
     │
     ▼
Code Review
     │
     ▼
CI Checks
     │
     ▼
Merge
```

---

## Roadmap

Potential future improvements include:

* Automated test coverage
* GitHub Actions CI/CD
* More granular time-series analytics
* Link-level analytics exports
* Advanced dashboard filtering
* Custom branded domains
* Improved observability and metrics
* Production deployment configuration
* API documentation with OpenAPI

---

## License

This project is licensed under the Apache License 2.0.

---

## Author

**Rishav Sharma**

GitHub: [@Rishav9142](https://github.com/Rishav9142)
