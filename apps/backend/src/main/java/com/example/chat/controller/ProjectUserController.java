package com.example.chat.controller;

import com.example.chat.model.Role;
import com.example.chat.model.User;
import com.example.chat.repository.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import com.example.chat.repository.*;
import com.example.chat.model.*;
import com.example.chat.service.*;

@RestController
@RequestMapping("/api/projects")
public class ProjectUserController {
  private final ProjectRepository projectRepository;
  private final ProjectUserRepository projectUserRepository;
  private final UserRepository userRepository;

  public ProjectUserController(ProjectRepository projectRepository, ProjectUserRepository projectUserRepository, UserRepository userRepository) {
    this.projectRepository = projectRepository;
    this.projectUserRepository = projectUserRepository;
    this.userRepository = userRepository;
  }

  @GetMapping("/{id}/members")
  public ResponseEntity<?> list(@PathVariable Long id, Authentication authentication) {
    User me = (User) authentication.getPrincipal();
    if (!hasAccess(id, me)) {
      return ResponseEntity.status(403).build();
    }
    List<ProjectUser> members = projectUserRepository.findByProjectId(id);
    return ResponseEntity.ok(members.stream().map(ProjectUserSummary::from).toList());
  }

  @PostMapping("/{id}/members")
  public ResponseEntity<?> add(@PathVariable Long id, @Valid @RequestBody ProjectUserRequest request, Authentication authentication) {
    User me = (User) authentication.getPrincipal();
    if (!isOwnerOrAdmin(id, me)) {
      return ResponseEntity.status(403).build();
    }
    return projectRepository.findById(id).map(project -> {
      User user = userRepository.findById(request.userId()).orElse(null);
      if (user == null) {
        return ResponseEntity.badRequest().body(Map.of("message", "User not found"));
      }
      ProjectUser member = projectUserRepository.findByProjectIdAndUserId(id, user.getId()).orElseGet(ProjectUser::new);
      member.setProject(project);
      member.setUser(user);
      member.setRole(request.role());
      member.setVisible(request.visible());
      projectUserRepository.save(member);
      return ResponseEntity.ok(ProjectUserSummary.from(member));
    }).orElseGet(() -> ResponseEntity.notFound().build());
  }

  @PatchMapping("/{id}/members/{memberId}")
  public ResponseEntity<?> update(@PathVariable Long id, @PathVariable Long memberId, @Valid @RequestBody ProjectUserRequest request, Authentication authentication) {
    User me = (User) authentication.getPrincipal();
    if (!isOwnerOrAdmin(id, me)) {
      return ResponseEntity.status(403).build();
    }
    return projectUserRepository.findById(memberId).map(member -> {
      member.setRole(request.role());
      member.setVisible(request.visible());
      projectUserRepository.save(member);
      return ResponseEntity.ok(ProjectUserSummary.from(member));
    }).orElseGet(() -> ResponseEntity.notFound().build());
  }

  @DeleteMapping("/{id}/members/{memberId}")
  public ResponseEntity<?> remove(@PathVariable Long id, @PathVariable Long memberId, Authentication authentication) {
    User me = (User) authentication.getPrincipal();
    if (!isOwnerOrAdmin(id, me)) {
      return ResponseEntity.status(403).build();
    }
    if (!projectUserRepository.existsById(memberId)) {
      return ResponseEntity.notFound().build();
    }
    projectUserRepository.deleteById(memberId);
    return ResponseEntity.ok().build();
  }

  private boolean hasAccess(Long projectId, User user) {
    return projectUserRepository.findByProjectIdAndUserId(projectId, user.getId()).isPresent() || user.getRole() == Role.ADMIN || user.getRole() == Role.MANAGER;
  }

  private boolean isOwnerOrAdmin(Long projectId, User user) {
    if (user.getRole() == Role.ADMIN || user.getRole() == Role.MANAGER) {
      return true;
    }
    return projectUserRepository.findByProjectIdAndUserId(projectId, user.getId())
        .map(member -> member.getRole() == ProjectRole.OWNER)
        .orElse(false);
  }

  public record ProjectUserRequest(@NotNull Long userId, @NotNull ProjectRole role, @NotNull boolean visible) {}

  public record ProjectUserSummary(Long id, Long userId, ProjectRole role, boolean visible) {
    static ProjectUserSummary from(ProjectUser member) {
      return new ProjectUserSummary(member.getId(), member.getUser().getId(), member.getRole(), member.isVisible());
    }
  }
}
