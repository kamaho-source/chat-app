package com.example.chat.controller;

import com.example.chat.model.Role;
import com.example.chat.model.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import com.example.chat.repository.*;
import com.example.chat.model.*;
import com.example.chat.service.*;

@RestController
@RequestMapping("/api/projects")
public class ProjectChatController {
  private final ProjectRepository projectRepository;
  private final ProjectUserRepository projectUserRepository;
  private final ProjectChatMessageRepository chatRepository;
  private final SimpMessagingTemplate messagingTemplate;

  public ProjectChatController(ProjectRepository projectRepository,
                               ProjectUserRepository projectUserRepository,
                               ProjectChatMessageRepository chatRepository,
                               SimpMessagingTemplate messagingTemplate) {
    this.projectRepository = projectRepository;
    this.projectUserRepository = projectUserRepository;
    this.chatRepository = chatRepository;
    this.messagingTemplate = messagingTemplate;
  }

  @GetMapping("/{id}/chat")
  public ResponseEntity<?> list(@PathVariable Long id, Authentication authentication) {
    User me = (User) authentication.getPrincipal();
    if (!hasAccess(id, me)) {
      return ResponseEntity.status(403).build();
    }
    List<ProjectChatMessage> messages = chatRepository.findByProjectIdOrderByCreatedAtAsc(id);
    return ResponseEntity.ok(messages.stream().map(ProjectChatSummary::from).toList());
  }

  @PostMapping("/{id}/chat")
  public ResponseEntity<?> post(@PathVariable Long id, @Valid @RequestBody ChatRequest request, Authentication authentication) {
    User me = (User) authentication.getPrincipal();
    if (!hasAccess(id, me)) {
      return ResponseEntity.status(403).build();
    }
    Project project = projectRepository.findById(id).orElse(null);
    if (project == null) {
      return ResponseEntity.notFound().build();
    }
    ProjectChatMessage message = new ProjectChatMessage();
    message.setProject(project);
    message.setSender(me);
    message.setContent(request.content());
    chatRepository.save(message);
    safeBroadcast("/topic/projects/" + id, ProjectChatSummary.from(message));
    return ResponseEntity.ok(ProjectChatSummary.from(message));
  }

  private boolean hasAccess(Long projectId, User user) {
    return projectUserRepository.findByProjectIdAndUserId(projectId, user.getId()).isPresent() || user.getRole() == Role.ADMIN || user.getRole() == Role.MANAGER;
  }

  private void safeBroadcast(String destination, Object payload) {
    try {
      messagingTemplate.convertAndSend(destination, payload);
    } catch (Exception ignored) {
    }
  }

  public record ChatRequest(@NotBlank String content) {}

  public record ProjectChatSummary(Long id, Long projectId, Long senderId, String content) {
    static ProjectChatSummary from(ProjectChatMessage message) {
      return new ProjectChatSummary(message.getId(), message.getProject().getId(), message.getSender().getId(), message.getContent());
    }
  }
}
