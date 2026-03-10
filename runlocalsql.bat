docker build -t dudo-app .
docker run -p 8080:8080 -e DB_USER=dudo_app -e DB_PASSWORD=dudo-app-nodejs -e DB_NAME=dudo-db dudo-app
