FROM node:20
WORKDIR /app
COPY . .
RUN apt-get update && apt-get install -y ffmpeg && npm install && rm -rf /var/lib/apt/lists/*
EXPOSE 3000
CMD ["node", "app.js"]
