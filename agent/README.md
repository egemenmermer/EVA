# Ethical AI Agent

This is the FastAPI-based agent component of the Ethical AI project.

## Setup with Python 3.12

This agent requires Python 3.12 and uses a virtual environment to manage dependencies.

### Initial Setup

1. Create a virtual environment:
   ```bash
   python3 -m venv venv
   ```

2. Activate the virtual environment:
   ```bash
   source venv/bin/activate  # On macOS/Linux
   # OR
   venv\Scripts\activate     # On Windows
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### Running the Agent

Make sure the virtual environment is activated, then run:

```bash
python -m uvicorn main:app --reload --port 5001 --log-level info
```

The agent will be available at http://localhost:5001.

### API Documentation

FastAPI automatically generates API documentation, available at:
- http://localhost:5001/docs (Swagger UI)
- http://localhost:5001/redoc (ReDoc)

### Health Check

To verify the agent is running properly, you can use:

```bash
curl http://localhost:5001/health
```

The response should be:
```json
{"status":"healthy","timestamp":"2025-05-16T13:56:14.000000"}
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
OPENAI_API_KEY=your_api_key_here
BACKEND_URL=http://localhost:8443
``` 