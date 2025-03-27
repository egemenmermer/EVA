# EVA - Ethical Virtual Assistant

A comprehensive web-based application that helps software professionals navigate ethical decision-making scenarios through AI-powered simulations and guidance.

## Project Overview

EVA consists of three main components:

1. **Agent (Python)** - Core AI engine powered by OpenAI GPT for ethical decision processing
2. **Backend (Spring Boot)** - REST API for user management and conversation handling
3. **Frontend (React + TypeScript)** - Modern, responsive UI for interacting with EVA

## Features

- 🤖 **AI-Powered Guidance**: Utilizes OpenAI GPT models for intelligent, contextual responses
- 🎭 **Multiple Manager Types**: Simulates different managerial approaches to ethical challenges
- 📚 **Knowledge-Based**: Incorporates ACM, IEEE guidelines, and GDPR compliance standards
- 🔄 **Interactive Learning**: Real-time feedback and scoring on ethical decision-making
- 🛡️ **Secure Authentication**: JWT-based auth with Google OAuth integration
- 🌓 **Dark Mode Support**: Full dark mode implementation for better user experience

## Project Structure

```
eva/
├── agent/                 # Python AI Agent
│   ├── agents/           # Agent implementations
│   ├── data_processing/  # Data processing utilities
│   ├── embeddings/       # OpenAI embeddings
│   ├── evaluation/       # Evaluation tools
│   ├── retriever/        # Search and retrieval
│   ├── models.py         # Core model definitions
│   ├── main.py          # FastAPI application
│   └── requirements.txt  # Python dependencies
│
├── backend/              # Spring Boot Backend
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/
│   │   │   └── resources/
│   │   └── test/
│   └── pom.xml          # Maven dependencies
│
└── frontend/            # React Frontend
    ├── public/          # Static assets
    ├── src/
    │   ├── components/  # React components
    │   ├── pages/       # Page components
    │   ├── services/    # API services
    │   ├── store/       # State management
    │   └── types/       # TypeScript types
    ├── .env            # Environment variables
    └── package.json    # NPM dependencies
```

## Technology Stack

### Agent (Python)
- FastAPI for API endpoints
- OpenAI GPT-4 for language processing
- OpenAI Ada for embeddings
- FAISS for similarity search
- PyTorch for machine learning

### Backend (Java)
- Spring Boot 3.x
- Spring Security with JWT
- PostgreSQL database
- Flyway migrations
- Maven for dependency management

### Frontend (TypeScript)
- React 18
- TypeScript
- Tailwind CSS
- Zustand for state management
- React Query for data fetching

## Getting Started

### Prerequisites
- Python 3.8+
- Java 23
- Node.js 18+
- PostgreSQL 12+

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/egemenmermer/vu-thesis.git
   cd eva
   ```

2. **Set up the Agent**
   ```bash
   cd agent
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   
   # Configure .env
   cp .env.example .env
   # Add your OpenAI API key and other configuration
   ```

3. **Set up the Backend**
   ```bash
   cd backend
   
   # Configure .env
   cp .env.example .env
   # Add your database and API configuration
   
   # Run the application
   ./mvnw spring-boot:run
   ```

4. **Set up the Frontend**
   ```bash
   cd frontend
   npm install
   
   # Configure .env
   cp .env.example .env
   # Add your API URLs and OAuth credentials
   
   # Start the development server
   npm run dev
   ```

## Environment Variables

### Agent (.env)
```env
OPENAI_API_KEY=your_openai_api_key_here
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:8443
VITE_GOOGLE_CLIENT_ID=your_client_id
VITE_GITHUB_CLIENT_ID=your_client_id
```

## Development Workflow

1. **Running Tests**
   ```bash
   # Agent tests
   cd agent
   pytest
   
   # Backend tests
   cd backend
   ./mvnw test
   
   # Frontend tests
   cd frontend
   npm test
   ```

2. **Code Style**
   - Python: Black formatter
   - Java: Google Java Style
   - TypeScript: ESLint + Prettier

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [OpenAI GPT](https://openai.com/) for AI capabilities
- [ACM Code of Ethics](https://www.acm.org/code-of-ethics)
- [IEEE Code of Ethics](https://www.ieee.org/about/corporate/governance/p7-8.html)

---

**Author:** Egemen Mermer  
**Institution:** Vrije Universiteit Amsterdam  
**Contact:** egemenmermer@gmail.com
