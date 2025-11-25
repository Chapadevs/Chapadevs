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

# Expõe porta (Cloud Run will set BACKEND_PORT env var, default to 3001)
EXPOSE 3001

# Define variável de ambiente de produção
ENV NODE_ENV=production
# BACKEND_PORT will be set by Cloud Run, but default to 3001 if not set
ENV BACKEND_PORT=3001

# Comando para iniciar
CMD ["node", "server.js"]

