FROM node:18

# Arbeitsverzeichnis im Container
WORKDIR /backend

# Abhängigkeiten installieren
COPY package*.json ./
RUN npm install --production

# Backend-Code kopieren
COPY . .

# Port freigeben
EXPOSE 3000

# Startbefehl
CMD ["node", "index.js"]
