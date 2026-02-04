# SecureLock - Encrypted Data Transfer Service

A lock and key themed encryption service with a Node.js backend API.

## Quick Start

### Prerequisites
- Node.js installed on your system

### Installation

1. Open terminal in the project folder
2. Install dependencies:
```bash
npm install
```

### Running the Server

Start the backend server:
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

The server will start on `http://localhost:3000`

### Using the Website

1. Open your browser and go to `http://localhost:3000`
2. Enter data to encrypt and provide a strong key
3. Click "Encrypt Data" - the backend will process it
4. Copy the encrypted data and share it securely
5. To decrypt, paste encrypted data and use the same key

## API Endpoints

### POST /api/encrypt
Encrypt data using AES-256
```json
{
  "data": "Your secret message",
  "key": "your-encryption-key"
}
```

### POST /api/decrypt
Decrypt encrypted data
```json
{
  "encrypted": "U2FsdGVkX1...",
  "key": "your-encryption-key"
}
```

### GET /api/message/:id
Retrieve stored encrypted message by ID

### GET /api/health
Check server status

## Features

- **Backend Processing**: All encryption handled server-side
- **AES-256 Encryption**: Bank-grade security
- **Message Storage**: Temporary storage with 1-hour expiration
- **REST API**: Clean API endpoints for integration
- **Lock & Key Theme**: Beautiful UI design

## Project Structure

```
website_event/
├── server.js          # Backend Express server
├── index.html         # Frontend UI
├── styles.css         # Styling
├── script.js          # Frontend logic
├── package.json       # Dependencies
└── README.md         # This file
```

## Technologies

- Node.js + Express
- CryptoJS (AES-256)
- HTML/CSS/JavaScript
- REST API architecture
