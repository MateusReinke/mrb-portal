FROM node:22-alpine

WORKDIR /app

# copia apenas manifests primeiro (melhor cache)
COPY package*.json ./

# instala deps (multer incluso)
RUN npm install --omit=dev

# copia o resto
COPY . .

ENV PORT=8088
EXPOSE 8088

CMD ["npm","start"]
