docker build -t dudo-app .
docker run -p 8080:8080 ^
 -e GOOGLE_CLOUD_PROJECT=trans-trees-453423-f7 ^
 -e GOOGLE_APPLICATION_CREDENTIALS=/app/gcloud/application_default_credentials.json ^
 -v "%APPDATA%\gcloud:/app/gcloud" ^
 dudo-app