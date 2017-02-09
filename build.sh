#!/bin/bash
# Builds trillo-server and deploys it to bin dir
rm -rf bin
cd trillo-core
mvn install
cd ../trillo-security
mvn install
cd ../trillo-server
mvn install

cp application.yml ../bin
cp startTrilloServer.txt ../bin/startTrilloServer.sh
