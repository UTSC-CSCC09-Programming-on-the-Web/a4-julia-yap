# Modular API Services

This directory contains modular API service files that handle different aspects of the application.

## Service Structure

- **http-client.js**: Core HTTP functionality for making authenticated requests to the API. Handles token refresh and basic request/response processing.
- **auth-service.js**: Handles user authentication operations (signup, signin, signout, etc.)
- **gallery-service.js**: Manages gallery-related operations
- **image-service.js**: Handles image upload, retrieval, and deletion
- **comment-service.js**: Manages comments on images
- **api-service.js**: Exports all services both individually and as a combined API service

## Usage

You can use these services in two ways:

### 1. Combined API Service

```javascript
import apiService from "./services/api-service.js";

// Use the combined service
apiService.signIn(username, password);
apiService.getImages();
apiService.addComment(imageId, userId, content);
```

### 2. Individual Services

```javascript
import {
  authService,
  imageService,
  commentService,
} from "./services/api-service.js";

// Use individual services
authService.signIn(username, password);
imageService.getImages();
commentService.addComment(imageId, userId, content);
```

## Benefits of Modular Approach

1. **Separation of Concerns**: Each service handles a specific aspect of the application
2. **Easier Maintenance**: Smaller files are easier to understand and modify
3. **Better Organization**: Related functionality is grouped together
4. **Code Reusability**: Services can be reused across different parts of the application
5. **Testability**: Individual services can be tested in isolation
