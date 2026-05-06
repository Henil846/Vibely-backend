# Vibely Backend

Node.js/Express backend for the Vibely social platform.

## Setup

```bash
npm install
```

## Environment Variables

Create a `.env` file with:

```
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
IMAGE_KIT_PRIVATEKEY=your_imagekit_private_key
IMAGE_KIT_PUBLICKEY=your_imagekit_public_key
IMAGEKIT_URL_ENDPOINT=your_imagekit_url
GMAIL_USER=your_gmail@gmail.com
GMAIL_APP_PASSWORD=your_gmail_app_password
```

## Run

```bash
npm start      # Production
npm run dev    # Development with nodemon
```
