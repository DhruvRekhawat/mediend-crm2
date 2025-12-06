# Leads Webhook API Documentation

## Overview
This API endpoint allows external systems to push lead generation data to the CRM. The endpoint accepts a POST request with a JSON payload containing the lead information.

### Endpoint Details
- **URL Path**: `/api/webhooks/leads`
- **Method**: `POST`
- **Content-Type**: `application/json`

---

## Authentication
This API is secured using a **Bearer Token**. You must include the `Authorization` header in every request.

**Header Format:**
```text
Authorization: Bearer <YOUR_API_SECRET_KEY>
```
*(Please contact the administrator to obtain your specific API Secret Key)*

---

## Request Body
The API is designed to be flexible and accepts any valid JSON object. You should send all available details regarding the lead.

### Example Payload
```json
{
  "source": "facebook_ads",
  "campaign_id": "123456789",
  "lead_data": {
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+1234567890",
    "city": "Mumbai",
    "interest": "Knee Replacement"
  },
  "metadata": {
    "click_id": "xyz-987",
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

---

## Responses

### Success (200 OK)
Returned when the lead is successfully received and queued for processing.
```json
{
  "success": true,
  "id": "cm4d..."
}
```

### Unauthorized (401)
Returned if the Bearer token is missing or invalid.
```json
{
  "success": false,
  "error": "Missing or invalid Authorization header"
}
```

### Server Error (500)
Returned if there is an internal issue processing the request.
```json
{
  "success": false,
  "error": "Internal Server Error"
}
```

---

## Example Usage (cURL)

```bash
curl -X POST https://your-domain.com/api/webhooks/leads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SECRET_KEY" \
  -d '{
    "name": "Jane Doe",
    "phone": "9876543210",
    "inquiry": "General Consultation"
  }'
```
