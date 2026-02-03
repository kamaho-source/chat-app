package com.example.chat.controller;

import com.example.chat.model.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import com.example.chat.repository.*;
import com.example.chat.model.*;
import com.example.chat.service.*;

@RestController
@RequestMapping("/api")
public class MessageController {
  private final MessageService messageService;

  public MessageController(MessageService messageService) {
    this.messageService = messageService;
  }

  @GetMapping("/channels/{channelId}/messages")
  public ResponseEntity<List<MessageService.MessageSummary>> list(@PathVariable Long channelId, Authentication authentication) {
    User me = (User) authentication.getPrincipal();
    List<MessageService.MessageSummary> summaries = messageService.listByChannel(channelId, me).stream()
        .map(MessageService.MessageSummary::from)
        .toList();
    return ResponseEntity.ok(summaries);
  }

  @PostMapping("/channels/{channelId}/messages")
  public ResponseEntity<?> post(@PathVariable Long channelId,
                                @RequestParam(value = "content", required = false) String content,
                                @RequestParam(value = "file", required = false) MultipartFile file,
                                Authentication authentication) throws IOException {
    User me = (User) authentication.getPrincipal();
    if ((content == null || content.isBlank()) && (file == null || file.isEmpty())) {
      return ResponseEntity.badRequest().body(Map.of("message", "content or file required"));
    }
    Message message = messageService.postMessage(channelId, me, content, file);
    return ResponseEntity.ok(MessageService.MessageSummary.from(message));
  }

  @PatchMapping("/messages/{id}")
  public ResponseEntity<?> edit(@PathVariable Long id, @Valid @RequestBody EditRequest request, Authentication authentication) {
    User me = (User) authentication.getPrincipal();
    Message message = messageService.editMessage(id, me, request.content());
    return ResponseEntity.ok(MessageService.MessageSummary.from(message));
  }

  public record EditRequest(@NotBlank String content) {}
}
