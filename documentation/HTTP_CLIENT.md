PyCharm's HTTP client is a powerful tool for testing your API directly from the IDE. Here are the key use cases for your project:

## 1. Chaining requests — use response values in next request

```http
### Register worker
POST http://localhost:8000/api/v1/auth/register
Content-Type: application/json

{
  "name": "john doe",
  "username": "johndoe",
  "email": "test@test.com",
  "password": "1A123456",
  "role_type": "worker"
}

### Login and capture token
POST http://localhost:8000/api/v1/auth/login
Content-Type: application/json

{
  "username_or_email": "test@test.com",
  "password": "1A123456"
}

> {% client.global.set("access_token", response.body.access_token) %}

### Create worker profile — uses token from login
POST http://localhost:8000/api/v1/worker-profiles
Content-Type: application/json
Authorization: Bearer {{access_token}}

{
  "bio": "Experienced plumber",
  "hourly_rate": 75.00,
  "service_radius_km": 20,
  "is_available": true
}
```

---

## 2. Environment variables — switch between dev/staging/prod

```http
# http-client.env.json
{
  "dev": {
    "base_url": "http://localhost:8000",
    "worker_email": "test@test.com",
    "worker_password": "1A123456"
  },
  "staging": {
    "base_url": "https://staging.fixi.com",
    "worker_email": "staging@test.com",
    "worker_password": "StagingPass123"
  }
}
```

```http
### Login — works in both dev and staging
POST {{base_url}}/api/v1/auth/login
Content-Type: application/json

{
  "username_or_email": "{{worker_email}}",
  "password": "{{worker_password}}"
}
```

---

## 3. Full worker onboarding flow

```http
### 1. Register worker
POST {{base_url}}/api/v1/auth/register
Content-Type: application/json

{
  "name": "john doe",
  "username": "johndoe",
  "email": "test@test.com",
  "password": "1A123456",
  "role_type": "worker"
}

> {% client.global.set("worker_id", response.body.id) %}

### 2. Login
POST {{base_url}}/api/v1/auth/login
Content-Type: application/json

{
  "username_or_email": "test@test.com",
  "password": "1A123456"
}

> {% client.global.set("access_token", response.body.access_token) %}

### 3. Get worker profile
GET {{base_url}}/api/v1/worker-profiles/{{worker_id}}
Authorization: Bearer {{access_token}}

### 4. Update worker profile
PATCH {{base_url}}/api/v1/worker-profiles/{{worker_id}}
Content-Type: application/json
Authorization: Bearer {{access_token}}

{
  "bio": "Experienced plumber with 10 years",
  "hourly_rate": 85.00,
  "service_radius_km": 30
}

### 5. Assign trade
POST {{base_url}}/api/v1/worker-profiles/{{worker_id}}/trades
Content-Type: application/json
Authorization: Bearer {{access_token}}

{
  "trade_id": 1,
  "skill_level": "senior"
}

### 6. Toggle availability
PATCH {{base_url}}/api/v1/worker-profiles/{{worker_id}}/availability
Content-Type: application/json
Authorization: Bearer {{access_token}}

{
  "is_available": true
}
```

---

## 4. Response assertions — verify behavior inline

```http
### Login and assert response shape
POST {{base_url}}/api/v1/auth/login
Content-Type: application/json

{
  "username_or_email": "test@test.com",
  "password": "1A123456"
}

> {%
  client.test("Status is 200", function() {
    client.assert.response.status === 200;
  });

  client.test("Has access token", function() {
    client.assert.response.body.access_token !== undefined;
  });

  client.test("Token type is bearer", function() {
    client.assert.response.body.token_type === "bearer";
  });

  client.global.set("access_token", response.body.access_token);
%}
```

---

## 5. Test error cases

```http
### Register duplicate email — should return 409
POST {{base_url}}/api/v1/auth/register
Content-Type: application/json

{
  "name": "john doe",
  "username": "johndoe2",
  "email": "test@test.com",
  "password": "1A123456",
  "role_type": "worker"
}

> {%
  client.test("Returns 409 conflict", function() {
    client.assert.response.status === 409;
  });
%}

### Login with wrong password — should return 401
POST {{base_url}}/api/v1/auth/login
Content-Type: application/json

{
  "username_or_email": "test@test.com",
  "password": "wrongpassword"
}

> {%
  client.test("Returns 401 unauthorized", function() {
    client.assert.response.status === 401;
  });
%}

### Access protected route without token — should return 401
GET {{base_url}}/api/v1/worker-profiles/1
```

---

## 6. File structure recommendation

```
fixi/
└── http/
    ├── http-client.env.json       # environment variables
    ├── auth.http                  # register, login, logout, refresh
    ├── worker_profiles.http       # CRUD worker profiles
    ├── trades.http                # trade categories
    ├── worker_trades.http         # assign/remove trades
    ├── availability.http          # toggle availability
    └── files.http                 # file upload
```

---

## Key benefits over Postman/curl

| Feature | Benefit |
|---|---|
| Lives in the repo | shared with team via git |
| Chained requests | no manual copy-paste of tokens |
| Environment files | one file for dev/staging/prod |
| Inline assertions | lightweight API smoke tests |
| PyCharm integration | run directly from IDE, see response in split pane |
| No external tool | no Postman account needed |