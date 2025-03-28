# EVA - Ethical Virtual Assistant

A comprehensive web-based application that helps software professionals navigate ethical decision-making scenarios through AI-powered simulations and guidance.

## Project Overview

EVA consists of three main components:

1. **Agent (Python)** - Core AI engine powered by OpenAI GPT for ethical decision processing
2. **Backend (Spring Boot)** - REST API for user management and conversation handling
3. **Frontend (React + TypeScript)** - Modern, responsive UI for interacting with EVA

The system offers an interactive environment where software engineers can practice ethical decision-making through simulated scenarios and conversations with AI-powered manager personas.

## Features

- 🤖 **AI-Powered Guidance**: Utilizes OpenAI GPT models for intelligent, contextual responses
- 🎭 **Multiple Manager Types**: Simulates different managerial approaches to ethical challenges
- 📚 **Knowledge-Based**: Incorporates ACM, IEEE guidelines, and GDPR compliance standards
- 🔄 **Interactive Learning**: Real-time feedback and scoring on ethical decision-making
- 🛡️ **Secure Authentication**: JWT-based auth with Google OAuth integration
- 🌓 **Dark Mode Support**: Full dark mode implementation for better user experience
- 🎮 **Practice Mode**: Interactive scenario-based practice with different manager types and ethical dilemmas
- 💬 **AI-Powered Ethical Conversations**: Engage in realistic ethical discussions with various manager personas
- 🧠 **Ethical Reasoning Framework**: Incorporates established ethical principles and reasoning techniques
- 📊 **Performance Tracking**: Monitor and improve your ethical reasoning skills over time

## Project Structure

```
.
├── agent/                     # AI agent and practice module
│   ├── app/                   # Main agent application code
│   ├── practice_module/       # Ethical practice scenarios module
│   │   ├── scenarios.json     # Ethical scenario definitions
│   │   ├── evaluator.py       # Scenario evaluation logic
│   │   ├── interaction_flow.py # Conversation flow management
│   │   └── strategy_knowledge.py # Ethical strategies information
│   ├── main.py                # Entry point for the AI agent
│   └── ...
├── backend/                   # Spring Boot backend service
│   ├── src/                   # Source code
│   └── ...
├── frontend/                  # React frontend application
│   ├── src/                   # Source code
│   └── ...
└── ...
```

## Technology Stack

### Agent (Python)
- Python 3.12
- FastAPI for API endpoints
- OpenAI GPT-4 for language processing
- LangChain for AI framework
- LangChain Community and FAISS for vector search
- Uvicorn for ASGI server

### Backend (Java)
- Spring Boot 3.x
- Spring Security with JWT
- PostgreSQL database
- Flyway migrations
- Maven for dependency management
- JDK 17+

### Frontend (TypeScript)
- React 18
- TypeScript
- Tailwind CSS
- Zustand for state management
- React Query for data fetching
- Vite for build tooling

## Getting Started

### Prerequisites
- Python 3.12+
- Java JDK 17+
- Node.js 18+
- PostgreSQL 15+

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/egemenmermer/vu-thesis.git
   cd vu-thesis
   ```

2. **Set up the Agent (Python 3.12)**
   ```bash
   cd agent
   
   # Create virtual environment
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   
   # Install dependencies
   pip install -r requirements.txt
   
   # Configure environment
   mkdir -p logs
   cp .env.example .env  # If .env.example exists
   # Edit .env to add your OpenAI API key
   
   # Run the application
   python -m uvicorn main:app --reload --port 5001 --log-level info
   ```

3. **Set up the Backend**
   ```bash
   cd backend
   
   # Configure application.properties or .env
   # Edit src/main/resources/application.properties with database settings
   
   # Run the application with Maven
   ./mvnw spring-boot:run
   ```

4. **Set up the Frontend**
   ```bash
   cd frontend
   npm install
   
   # Configure .env
   cp .env.example .env  # If .env.example exists
   # Edit .env with API URLs 
   
   # Start the development server
   npm run dev
   ```

5. **Verify All Services**
   
   After starting all components, verify they're running:
   
   - Agent API: http://localhost:5001/api/health
   - Backend API: http://localhost:8443/api/health
   - Frontend: http://localhost:5173

## Practice Module

The practice module offers interactive scenario-based ethical decision-making practice. Key features include:

- **Different Manager Types**: Practice handling ethical issues with various manager personalities:
  - Puppeteer: Managers who directly pressure employees into unethical actions
  - Camouflager: Managers who disguise unethical requests as standard business practices
  - Diluter: Managers who acknowledge ethical concerns but minimize their importance

- **Ethical Argumentation Framework**: Learn and practice different ethical advocacy strategies:
  - Direct Confrontation: Explicitly challenging unethical directives
  - Persuasive Rhetoric: Aligning ethical concerns with organizational goals
  - Process-Based Advocacy: Using organizational processes to address ethical concerns
  - Soft Resistance: Subtle approaches to mitigate ethical issues

- **Scenario-Based Learning**: Practice with realistic scenarios covering privacy, bias, transparency, and other ethical concerns common in software engineering

- **Feedback System**: Receive immediate feedback on your ethical choices with detailed evaluations and suggestions for improvement

To use the practice module:
```bash
cd agent
./practice_module/example.py
```

## Environment Variables

### Agent (.env)
```
OPENAI_API_KEY=your_openai_api_key
MODEL_NAME=gpt-4
BACKEND_URL=http://localhost:8443
```

### Backend (application.properties)
```properties
# Database Configuration
spring.datasource.url=jdbc:postgresql://localhost:5432/eva
spring.datasource.username=postgres
spring.datasource.password=yourpassword

# JWT Configuration
app.jwt.secret=your-secret-key
app.jwt.expiration=86400000
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5001
VITE_AGENT_URL=http://localhost:5001
```

## Troubleshooting Common Issues

### Python 3.12 Compatibility Issues
If you encounter module not found errors with Python 3.12:
1. Ensure you have created and activated the virtual environment
2. Make sure all dependencies are installed with `pip install -r requirements.txt`
3. If using a system Python, you may need to add `--break-system-packages` flag

### Connection Issues
If components can't communicate with each other:
1. Verify all services are running (check health endpoints)
2. Ensure correct ports are configured (5001 for agent, 8443 for backend, 5173 for frontend)
3. Check CORS configuration in the backend if needed

### JWT Authentication Issues
If experiencing login or authentication problems:
1. Clear browser localStorage and cookies
2. Verify JWT secret key matches between agent and backend
3. Check token expiration times

## Development Workflow

1. **Running Tests**
   ```bash
   # Agent tests
   cd agent
   source venv/bin/activate
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

## Deployment

### Docker (Optional)
Docker support is available for containerized deployment:

```bash
# Build containers
docker-compose build

# Start all services
docker-compose up -d
```

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
- [LangChain](https://langchain.com/) for AI framework
- [ACM Code of Ethics](https://www.acm.org/code-of-ethics)
- [IEEE Code of Ethics](https://www.ieee.org/about/corporate/governance/p7-8.html)

---

**Author:** Egemen Mermer  
**Institution:** Vrije Universiteit Amsterdam  
**Contact:** egemenmermer@gmail.com
