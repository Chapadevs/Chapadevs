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

# Expõe porta
EXPOSE 8080

# Define variável de ambiente de produção
ENV NODE_ENV=production
ENV PORT=8080

# Comando para iniciar
CMD ["node", "server.js"]

