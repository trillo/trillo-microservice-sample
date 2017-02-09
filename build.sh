#!/bin/bash
# Builds trillo-server and deploys it to bin dir
rm -rf microsvc-bin

cd microservice
mvn install

cp startMicroService.txt ../microsvc-bin/startMicroService.sh
chmod +x ../microsvc-bin/startMicroService.sh
