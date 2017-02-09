#!/bin/bash
# Copied over to ../bin as ".sh" file by "../build.sh"
# Starts trillo-server
# See application.yml for parameters

java -Dspring.profiles.active=production -jar trillo-server.jar 