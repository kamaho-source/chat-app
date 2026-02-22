package com.example.chat.service;

import com.example.chat.config.AppProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import com.example.chat.repository.*;
import com.example.chat.model.*;

@Service
public class AiService {
  private final AppProperties properties;
  private final ObjectMapper objectMapper;
  private final HttpClient httpClient;

  public AiService(AppProperties properties, ObjectMapper objectMapper) {
    this.properties = properties;
    this.objectMapper = objectMapper;
    this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
  }

  public String generateReply(String prompt) throws IOException, InterruptedException {
    if (!properties.getAi().isEnabled() || properties.getAi().getApiKey().isBlank()) {
      return "AI is not configured.";
    }
    Map<String, Object> payload = Map.of(
        "model", properties.getAi().getModel(),
        "messages", new Object[] { Map.of("role", "user", "content", prompt) }
    );
    String body = objectMapper.writeValueAsString(payload);
    HttpRequest request = HttpRequest.newBuilder()
        .uri(URI.create("https://api.openai.com/v1/chat/completions"))
        .timeout(Duration.ofSeconds(30))
        .header("Authorization", "Bearer " + properties.getAi().getApiKey())
        .header("Content-Type", "application/json")
        .POST(HttpRequest.BodyPublishers.ofString(body))
        .build();
    HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
    if (response.statusCode() >= 400) {
      return "AI response failed (HTTP " + response.statusCode() + "): " + response.body();
    }
    JsonNode root = objectMapper.readTree(response.body());
    JsonNode content = root.path("choices").path(0).path("message").path("content");
    return content.isMissingNode() ? "AI response empty." : content.asText();
  }
}
