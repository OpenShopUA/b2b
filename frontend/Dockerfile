FROM node:18

WORKDIR /app
COPY . .

RUN npm install
RUN npm run build
RUN npm install -g serve

# Створюємо скрипт для генерації конфігурації під час запуску
RUN echo '#!/bin/sh \n\
echo "window.ENV = { \n\
  API_URL: \"${VITE_API_URL}\" \n\
};" > /app/dist/config.js \n\
serve -s dist -l 80' > /app/start.sh

RUN chmod +x /app/start.sh

EXPOSE 80
CMD ["/app/start.sh"]