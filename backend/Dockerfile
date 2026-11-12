FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npx prisma generate
EXPOSE 4000
# Crea las tablas y, si la base está vacía, carga el seed (7 gimnasios idénticos, 6 rondas, catálogos)
CMD ["sh", "-c", "npx prisma db push --skip-generate && node -e \"import('./src/db.js').then(async ({prisma})=>{const n=await prisma.gym.count(); await prisma.$disconnect(); process.exit(n?0:1)})\" || node src/seed.js; node src/index.js"]
