#!/bin/bash -ex
mkdir -p test/gen
(cat test/Dockerfile; echo 'RUN echo' `date` '> /usr/share/nginx/html/index.html') > test/gen/Dockerfile
docker build -t localhost:5000/nginx:latest test/gen
docker push localhost:5000/nginx:latest
