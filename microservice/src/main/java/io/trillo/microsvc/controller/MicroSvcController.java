package io.trillo.microsvc.controller;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStreamReader;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;

import io.trillo.microsvc.entity.Result;

@RestController
public class MicroSvcController {

  @Value("${database.dir}")
  private String dbDir;

  @RequestMapping(value = "/data/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
  public @ResponseBody Object getData(@PathVariable(value = "id") String id) {
    File file = new File(dbDir, id + ".json");
    if (!file.exists()) {
      return new Result(Result.FAILED, "File not found");
    }
    try {
      return readFile(file).toString();
    } catch (Exception exc) {
      return new Result(Result.FAILED, "Failed to read file");
    }
  }

  @RequestMapping(value = "/HealthCheck", method = RequestMethod.GET)
  public Result healthCheck() {
    return new Result(Result.SUCCESS, "Greetings!");
  }

  private StringBuilder readFile(File file) {

    StringBuilder buf = new StringBuilder();
    FileInputStream fr = null;
    InputStreamReader is = null;
    BufferedReader br = null;

    try {
      fr = new FileInputStream(file);
      is = new InputStreamReader(fr, "UTF-8");
      br = new BufferedReader(is);

      String s;
      while ((s = br.readLine()) != null) {
        buf.append(s + "\n");
      }
    } catch (Exception exc) {
      throw new RuntimeException("Failed to read file: " + file.getName() + ", Error: " + exc.getMessage());
    } finally {
      if (br != null) {
        try {
          br.close();
        } catch (Exception exc) {
        }
      }
    }
    return buf;
  }
}
