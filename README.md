# trillo-microservice-sample
This repo contains a sample WEB application (dashboard) with one sample microservice. 
The WEB application is served by Trillo Server acting as web-server. Trillo Server also acts as API gateway to
the sample microservice.

[After or before trying out this sample, you can refer to Trillo Server repo for more details about it.](https://github.com/trillo/trillo-server)

Before you run the sample application, let us review its architecture.

* Trillo Server works as a WEB Server and API Gateway.
* It serves content from applications directory. (these apps are different from webapps served by conventional servlet containers).
* As API gateway it forwards rest calls to a microservice.
* Trillo Server runs on port 8080 (due to settings in the scripts / property files).
* Microservice runs on port 8090.

* Due to the following route.json, Trillo Server forwards all rest calls with URL pattern "api/data/*" to microservice.
```
  [
    {
      path : "api/data/*",
      location: "http://localhost:8090/data",
      roles: "*"
    }

  ]
```

The following diagram shows the components of the sample code in this repo.

![Trillo Example Microservice](Trillo-Example-Microservice.png)