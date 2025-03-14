# Ethical AI Decision-Making Assistant

A comprehensive web-based application that provides ethical guidance for software development decisions, leveraging AI models and a database of ethical guidelines and case studies.

## Project Overview

This project consists of three main components:

1. **AI Agent (Python)** - The core AI engine that processes ethical queries and provides guidance
2. **Backend (Spring Boot)** - Java-based REST API for handling user authentication, data persistence, and communication with the AI agent
3. **Frontend (React)** - User interface for interacting with the ethical AI assistant

## Repository Structure

```
ethical-agent/
├── ai-agent-python/     # Python AI agent implementation
│   ├── agents/          # Agent implementations
│   ├── data/            # Data storage and processing
│   ├── data_processing/ # Data processing utilities
│   ├── database/        # Database operations
│   ├── docs/            # Documentation
│   ├── embeddings/      # Embedding models
│   ├── app.py           # FastAPI application
│   ├── Dockerfile       # Docker configuration
│   └── README.md        # Agent documentation
│
├── backend/             # Spring Boot backend
│   ├── src/             # Java source code
│   │   ├── main/        # Application code
│   │   └── test/        # Test code
│   ├── .mvn/            # Maven wrapper
│   ├── mvnw             # Maven wrapper script (Unix)
│   ├── mvnw.cmd         # Maven wrapper script (Windows)
│   └── pom.xml          # Maven dependencies
│
└── frontend/            # React frontend
    ├── public/          # Static files
    ├── src/             # React source code
    │   ├── components/  # Reusable UI components
    │   ├── pages/       # Page components
    │   ├── services/    # API services
    │   └── styles/      # CSS and styling
    ├── package.json     # NPM dependencies
    └── tsconfig.json    # TypeScript configuration
```

## Component Details

### AI Agent (Python)

The AI agent is built with Python and uses the following technologies:

- **FastAPI**: Web framework for creating the API endpoints
- **Sentence Transformers**: For generating embeddings from text
- **FAISS**: For efficient similarity search
- **SQLAlchemy**: ORM for database operations
- **PyPDF2**: For processing PDF documents

The agent processes ethical queries by:
1. Analyzing the query against a database of ethical guidelines
2. Retrieving relevant context using semantic search
3. Generating a response using an LLM (Llama-2)
4. Storing the conversation for future reference

### Backend (Spring Boot)

The Java backend provides:

- User authentication and authorization
- Data persistence using PostgreSQL
- RESTful API endpoints for the frontend
- Integration with the Python AI agent
- Security features and input validation

Technologies used:
- Spring Boot 3.4.3
- Spring Security with JWT authentication
- Spring Data JPA for ORM
- PostgreSQL for data storage
- Flyway for database migrations

### Frontend (React)

The React frontend offers:

- User-friendly interface for ethical queries
- Role-based views for different user types
- Conversation history and management
- Feedback collection for responses

Technologies used:
- React 18 with TypeScript
- Material UI for components
- React Query for data fetching
- React Router for navigation

## Getting Started

### Prerequisites

- Java 23
- Python 3.8 or higher
- Node.js 18 or higher
- PostgreSQL 12 or higher
- Docker (optional, for containerized deployment)

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/egemenmermer/vu-thesis.git
   cd vu-thesis
   ```

2. **Set up the AI Agent**
   ```bash
   cd ethical-agent/ai-agent-python
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Set up the Backend**
   ```bash
   cd backend
   ./mvnw clean install
   ```

4. **Set up the Frontend**
   ```bash
   cd frontend
   npm install
   ```

5. **Configure environment variables**
   - Create `.env` files in each component directory based on the provided examples

6. **Run the components**
   - AI Agent: `uvicorn app:app --reload --host 0.0.0.0 --port 8000`
   - Backend: `./mvnw spring-boot:run`
   - Frontend: `npm start`

## Deployment

### Docker Deployment

Each component includes a Dockerfile for containerized deployment:

```bash
# Build and run the AI Agent
cd ethical-agent/ai-agent-python
docker build -t ethical-ai-agent .
docker run -p 8000:8000 ethical-ai-agent

# Build and run the Backend
cd backend
docker build -t ethical-ai-backend .
docker run -p 8080:8080 ethical-ai-backend

# Build and run the Frontend
cd frontend
docker build -t ethical-ai-frontend .
docker run -p 3000:80 ethical-ai-frontend
```

### Cloud Deployment

The application can be deployed to various cloud platforms:

- **AWS**: Using ECS, EKS, or Elastic Beanstalk
- **Google Cloud**: Using Cloud Run or GKE
- **Azure**: Using App Service or AKS

Detailed deployment instructions are available in the documentation.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Author:** Egemen Mermer  
**Affiliation:** Vrije Universiteit Amsterdam  
**Contact:** [Your email or professional website]
