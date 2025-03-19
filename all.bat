docker build -t dudo-app .
docker tag dudo-app gcr.io/trans-trees-453423-f7/dudo-app:latest
docker push gcr.io/trans-trees-453423-f7/dudo-app:latest
gcloud run deploy dudo-service --image gcr.io/trans-trees-453423-f7/dudo-app:latest --platform managed --region us-east4 --allow-unauthenticated
