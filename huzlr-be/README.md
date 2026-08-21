# huzlr-be

Backend API for the Huzlr application built with FastAPI and PostgreSQL.

Persistent LiveKit voice workers are maintained and deployed independently from the
top-level `huzlr-agents` module. This backend only creates room tokens, dispatches
named agents, and exposes protected application-data APIs to those workers, which
keeps the FastAPI process compatible with Vercel's request-driven runtime.

## 🔗 Project Links

- **Linear Issues:** https://linear.app/huzlr/team/HUZ/active
- **Linear Project:** https://linear.app/huzlr/project/december-15th-demo-eb0480502aa1/overview

## 📚 Documentation

Comprehensive guides and setup instructions are available in the [`docs/`](docs/) folder:

### Setup Guides
- **[Docker Setup](docs/setup/DOCKER_SETUP.md)** - Run PostgreSQL with Docker
- **[pgAdmin Setup](docs/setup/PGADMIN_SETUP.md)** - Connect to your database with pgAdmin

### Development Guides
- **[SQLAlchemy Guide](docs/guides/SQLALCHEMY_GUIDE.md)** - Complete ORM reference
- **[Migrations Guide](docs/guides/MIGRATIONS_GUIDE.md)** - Database schema management with Alembic

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd huzlr-be
   ```

2. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start PostgreSQL with Docker**
   ```bash
   docker-compose up -d postgres
   ```

4. **Install dependencies**
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

5. **Run migrations**
   ```bash
   alembic upgrade head
   ```

6. **Start the server**
   ```bash
   cd app
   uvicorn main:app --reload
   ```

7. **Access the API**
   - API: http://localhost:8000
   - Docs: http://localhost:8000/docs

## 🛠️ Tech Stack

- **Framework:** FastAPI
- **Database:** PostgreSQL
- **ORM:** SQLAlchemy 2.0 (async)
- **Migrations:** Alembic
- **Database Driver:** asyncpg

## 📁 Project Structure

```
huzlr-be/
├── app/
│   ├── api/              # API routes
│   ├── core/             # Core configuration
│   ├── models/           # SQLAlchemy models
│   └── main.py           # Application entry point
├── alembic/              # Database migrations
├── docs/                 # Documentation
│   ├── setup/            # Setup guides
│   └── guides/           # Development guides
├── docker-compose.yml    # Docker services configuration
└── .env                  # Environment variables (not in git)
```

## 🤝 Contributing

See the [documentation](docs/) for development guides and best practices.

## 📄 License

[Add your license here]
