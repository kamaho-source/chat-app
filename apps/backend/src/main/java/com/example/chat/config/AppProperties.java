package com.example.chat.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public class AppProperties {
  private final Storage storage = new Storage();
  private final Ai ai = new Ai();
  private final Security security = new Security();
  private final Bootstrap bootstrap = new Bootstrap();

  public Storage getStorage() {
    return storage;
  }

  public Ai getAi() {
    return ai;
  }

  public Security getSecurity() {
    return security;
  }

  public Bootstrap getBootstrap() {
    return bootstrap;
  }

  public static class Storage {
    private String baseDir = "./data";

    public String getBaseDir() {
      return baseDir;
    }

    public void setBaseDir(String baseDir) {
      this.baseDir = baseDir;
    }
  }

  public static class Ai {
    private String apiKey = "";
    private String model = "gpt-4o-mini";
    private boolean enabled = false;

    public String getApiKey() {
      return apiKey;
    }

    public void setApiKey(String apiKey) {
      this.apiKey = apiKey;
    }

    public String getModel() {
      return model;
    }

    public void setModel(String model) {
      this.model = model;
    }

    public boolean isEnabled() {
      return enabled;
    }

    public void setEnabled(boolean enabled) {
      this.enabled = enabled;
    }
  }

  public static class Security {
    private String frontendOrigin = "http://localhost:3000";
    private String sessionCookieName = "session_id";

    public String getFrontendOrigin() {
      return frontendOrigin;
    }

    public void setFrontendOrigin(String frontendOrigin) {
      this.frontendOrigin = frontendOrigin;
    }

    public String getSessionCookieName() {
      return sessionCookieName;
    }

    public void setSessionCookieName(String sessionCookieName) {
      this.sessionCookieName = sessionCookieName;
    }
  }

  public static class Bootstrap {
    private boolean enabled = true;
    private String email = "kid@example.com";
    private String name = "Kid";
    private String password = "password123";
    private String role = "ADMIN";

    public boolean isEnabled() {
      return enabled;
    }

    public void setEnabled(boolean enabled) {
      this.enabled = enabled;
    }

    public String getEmail() {
      return email;
    }

    public void setEmail(String email) {
      this.email = email;
    }

    public String getName() {
      return name;
    }

    public void setName(String name) {
      this.name = name;
    }

    public String getPassword() {
      return password;
    }

    public void setPassword(String password) {
      this.password = password;
    }

    public String getRole() {
      return role;
    }

    public void setRole(String role) {
      this.role = role;
    }
  }
}
