package io.trillo.microsvc;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class MicroSvc {
 
  private static final Logger logger = LoggerFactory.getLogger(MicroSvc.class);
  
	public static void main(String[] args) {
		SpringApplication app = new SpringApplication(MicroSvc.class);
		app.run(args);
		String workingDir = System.getProperty("user.dir");
    logger.info("Current working directory : " + workingDir);
	}
}
