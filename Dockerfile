# Dockerfile
# ✅ Garantindo que o container expõe 8088
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV PORT=8088
EXPOSE 8088

CMD ["npm","start"]
