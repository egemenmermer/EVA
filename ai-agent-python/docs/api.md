# API Documentation

## Overview

The Ethical Decision-Making API provides endpoints for obtaining ethical guidance in software development contexts. The API supports role-based ethical analysis, conversation management, and feedback collection.

## Base URL

```
https://api.example.com/v1
```

## Authentication

API requests require authentication using an API key. Include the key in the Authorization header:

```
Authorization: Bearer your_api_key_here
```

## Endpoints

### General

#### GET /
Get API information and status.

**Response**
```json
{
    "name": "Ethical Decision-Making API",
    "version": "1.0.0",
    "description": "Provides ethical guidance for software professionals"
}
```

#### GET /health
Check API health status.

**Response**
```json
{
    "status": "healthy"
}
```

### Roles

#### GET /roles
Get available professional roles and their descriptions.

**Response**
```json
{
    "software_engineer": "Technical implementation and code-level decisions",
    "project_manager": "Project planning and team coordination",
    "product_owner": "Product vision and user value",
    ...
}
```

#### POST /set-role
Set the user's professional role.

**Request**
```json
{
    "role": "software_engineer"
}
```

**Response**
```json
{
    "message": "Role set to software engineer. I'll focus on technical feasibility, code quality, and security practices."
}
```

### Conversation

#### POST /start
Start a new conversation.

**Response**
```json
{
    "message": "Welcome! I'm your ethical decision-making assistant...",
    "conversation_id": "conv-123-456"
}
```

#### POST /query
Process an ethical query.

**Request**
```json
{
    "text": "What are the ethical implications of using facial recognition?",
    "conversation_id": "conv-123-456"
}
```

**Response**
```json
{
    "response": "Based on ethical guidelines...",
    "role": "software_engineer",
    "conversation_id": "conv-123-456",
    "context": [
        {
            "source": "acm_ethics.pdf",
            "text": "Privacy must be protected..."
        }
    ]
}
```

### Feedback

#### POST /feedback/{query_id}
Submit feedback for a response.

**Request**
```json
{
    "rating": 5,
    "comment": "Very helpful guidance"
}
```

**Response**
```json
{
    "message": "Feedback submitted successfully",
    "feedback_id": "fb-789-012"
}
```

## Response Codes

- 200: Success
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 429: Too Many Requests
- 500: Internal Server Error

## Rate Limiting

- 100 requests per minute per API key
- 1000 requests per hour per API key
- Rate limit headers included in responses:
  - X-RateLimit-Limit
  - X-RateLimit-Remaining
  - X-RateLimit-Reset

## Error Handling

Errors are returned in a consistent format:

```json
{
    "error": {
        "code": "ERROR_CODE",
        "message": "Detailed error message",
        "details": {
            "additional": "information"
        }
    }
}
```

Common error codes:
- INVALID_ROLE
- MISSING_ROLE
- INVALID_QUERY
- RATE_LIMIT_EXCEEDED
- SERVER_ERROR

## Examples

### Python

```python
import requests

API_KEY = "your_api_key"
BASE_URL = "https://api.example.com/v1"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# Start conversation
response = requests.post(f"{BASE_URL}/start", headers=headers)
conversation_id = response.json()["conversation_id"]

# Set role
role_response = requests.post(
    f"{BASE_URL}/set-role",
    headers=headers,
    json={"role": "software_engineer"}
)

# Submit query
query_response = requests.post(
    f"{BASE_URL}/query",
    headers=headers,
    json={
        "text": "What are the ethical implications of using facial recognition?",
        "conversation_id": conversation_id
    }
)
```

### cURL

```bash
# Start conversation
curl -X POST "https://api.example.com/v1/start" \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json"

# Set role
curl -X POST "https://api.example.com/v1/set-role" \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"role": "software_engineer"}'

# Submit query
curl -X POST "https://api.example.com/v1/query" \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "What are the ethical implications of using facial recognition?",
    "conversation_id": "conv-123-456"
  }'
```

## Best Practices

1. Error Handling
   - Always check response status codes
   - Implement exponential backoff for retries
   - Handle rate limiting gracefully

2. Conversation Management
   - Store conversation IDs for context
   - Use consistent roles throughout conversations
   - Submit feedback when appropriate

3. Security
   - Never expose API keys in client-side code
   - Use HTTPS for all requests
   - Validate and sanitize input

4. Performance
   - Implement request caching where appropriate
   - Monitor response times
   - Handle timeouts gracefully

## Support

For API support:
- Email: api-support@example.com
- Documentation: https://docs.example.com
- Status: https://status.example.com 