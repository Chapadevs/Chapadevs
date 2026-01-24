# Backend Dockerfile
FROM node:20-alpine

# Define diretório de trabalho
WORKDIR /app

# Copia package files
COPY package*.json ./

# Instala dependências
RUN npm ci --only=production

# Copia código fonte
COPY . .

# Cloud Run provides PORT env var dynamically (usually 8080, but we set it to 3001)
# Expose the port that Cloud Run will use
EXPOSE 3001

# Define variável de ambiente de produção
ENV NODE_ENV=production

# Comando para iniciar
CMD ["node", "server.js"]

