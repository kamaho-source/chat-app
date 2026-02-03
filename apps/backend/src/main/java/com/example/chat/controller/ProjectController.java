package com.example.chat.controller;

import com.example.chat.model.Channel;
import com.example.chat.repository.ChannelRepository;
import com.example.chat.model.Role;
import com.example.chat.model.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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
public class ProjectController {
  private final ProjectRepository projectRepository;
  private final ProjectUserRepository projectUserRepository;
  private final ProjectChannelRepository projectChannelRepository;
  private final ChannelRepository channelRepository;

  public ProjectController(ProjectRepository projectRepository,
                           ProjectUserRepository projectUserRepository,
                           ProjectChannelRepository projectChannelRepository,
                           ChannelRepository channelRepository) {
    this.projectRepository = projectRepository;
    this.projectUserRepository = projectUserRepository;
    this.projectChannelRepository = projectChannelRepository;
    this.channelRepository = channelRepository;
  }

  @GetMapping
  public ResponseEntity<?> list(Authentication authentication) {
    User me = (User) authentication.getPrincipal();
    if (me.getRole() == Role.ADMIN || me.getRole() == Role.MANAGER) {
      return ResponseEntity.ok(projectRepository.findAll().stream().map(ProjectSummary::from).toList());
    }
    List<Project> projects = projectRepository.findAll().stream()
        .filter(project -> !project.isPrivate()
            || projectUserRepository.findByProjectIdAndUserId(project.getId(), me.getId()).isPresent())
        .toList();
    return ResponseEntity.ok(projects.stream().map(ProjectSummary::from).toList());
  }

  @GetMapping("/{id}")
  public ResponseEntity<?> detail(@PathVariable Long id, Authentication authentication) {
    User me = (User) authentication.getPrincipal();
    return projectRepository.findById(id).map(project -> {
      if (project.isPrivate()
          && me.getRole() != Role.ADMIN
          && me.getRole() != Role.MANAGER
          && projectUserRepository.findByProjectIdAndUserId(id, me.getId()).isEmpty()) {
        return ResponseEntity.status(403).build();
      }
      return ResponseEntity.ok(ProjectSummary.from(project));
    }).orElseGet(() -> ResponseEntity.notFound().build());
  }

  @PostMapping
  public ResponseEntity<?> create(@Valid @RequestBody ProjectRequest request, Authentication authentication) {
    User me = (User) authentication.getPrincipal();
    Project project = new Project();
    project.setName(request.name());
    project.setDescription(request.description());
    project.setPrivate(Boolean.TRUE.equals(request.isPrivate()));
    project.setCreatedBy(me);
    projectRepository.save(project);

    ProjectUser owner = new ProjectUser();
    owner.setProject(project);
    owner.setUser(me);
    owner.setRole(ProjectRole.OWNER);
    owner.setVisible(true);
    projectUserRepository.save(owner);

    return ResponseEntity.ok(ProjectSummary.from(project));
  }

  @PatchMapping("/{id}")
  public ResponseEntity<?> update(@PathVariable Long id, @Valid @RequestBody ProjectPatchRequest request, Authentication authentication) {
    User me = (User) authentication.getPrincipal();
    return projectRepository.findById(id).map(project -> {
      if (!isOwnerOrAdmin(id, me)) {
        return ResponseEntity.status(403).build();
      }
      if (request.name() != null) {
        if (request.name().isBlank()) {
          return ResponseEntity.badRequest().body(Map.of("message", "name must not be blank"));
        }
        project.setName(request.name());
      }
      if (request.description() != null) {
        project.setDescription(request.description());
      }
      if (request.isPrivate() != null) {
        project.setPrivate(request.isPrivate());
      }
      projectRepository.save(project);
      return ResponseEntity.ok(ProjectSummary.from(project));
    }).orElseGet(() -> ResponseEntity.notFound().build());
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<?> delete(@PathVariable Long id, Authentication authentication) {
    User me = (User) authentication.getPrincipal();
    return projectRepository.findById(id).map(project -> {
      if (!isOwnerOrAdmin(id, me)) {
        return ResponseEntity.status(403).build();
      }
      projectRepository.delete(project);
      return ResponseEntity.ok().build();
    }).orElseGet(() -> ResponseEntity.notFound().build());
  }

  @PostMapping("/{id}/channels")
  public ResponseEntity<?> linkChannel(@PathVariable Long id, @Valid @RequestBody ProjectChannelRequest request, Authentication authentication) {
    User me = (User) authentication.getPrincipal();
    if (!isOwnerOrAdmin(id, me)) {
      return ResponseEntity.status(403).build();
    }
    Project project = projectRepository.findById(id).orElse(null);
    Channel channel = channelRepository.findById(request.channelId()).orElse(null);
    if (project == null || channel == null) {
      return ResponseEntity.badRequest().body(Map.of("message", "Project or channel not found"));
    }
    ProjectChannel link = new ProjectChannel();
    link.setProject(project);
    link.setChannel(channel);
    projectChannelRepository.save(link);
    return ResponseEntity.ok(Map.of("id", link.getId()));
  }

  @DeleteMapping("/{id}/channels/{linkId}")
  public ResponseEntity<?> unlinkChannel(@PathVariable Long id, @PathVariable Long linkId, Authentication authentication) {
    User me = (User) authentication.getPrincipal();
    if (!isOwnerOrAdmin(id, me)) {
      return ResponseEntity.status(403).build();
    }
    if (!projectChannelRepository.existsById(linkId)) {
      return ResponseEntity.notFound().build();
    }
    projectChannelRepository.deleteById(linkId);
    return ResponseEntity.ok().build();
  }

  @GetMapping("/{id}/channels")
  public ResponseEntity<?> listLinkedChannels(@PathVariable Long id, Authentication authentication) {
    User me = (User) authentication.getPrincipal();
    if (!isOwnerOrAdmin(id, me)) {
      return ResponseEntity.status(403).build();
    }
    List<ProjectChannel> links = projectChannelRepository.findByProjectId(id);
    return ResponseEntity.ok(links.stream().map(link ->
        Map.of("id", link.getId(), "channelId", link.getChannel().getId(), "projectId", link.getProject().getId())
    ).toList());
  }

  private boolean isOwnerOrAdmin(Long projectId, User user) {
    if (user.getRole() == Role.ADMIN || user.getRole() == Role.MANAGER) {
      return true;
    }
    return projectUserRepository.findByProjectIdAndUserId(projectId, user.getId())
        .map(member -> member.getRole() == ProjectRole.OWNER)
        .orElse(false);
  }

  public record ProjectRequest(
      @NotBlank @Size(max = 120) String name,
      @Size(max = 500) String description,
      Boolean isPrivate
  ) {}

  public record ProjectPatchRequest(
      @Size(max = 120) String name,
      @Size(max = 500) String description,
      Boolean isPrivate
  ) {}

  public record ProjectChannelRequest(@NotNull Long channelId) {}

  public record ProjectSummary(Long id, String name, String description, boolean isPrivate) {
    static ProjectSummary from(Project project) {
      return new ProjectSummary(project.getId(), project.getName(), project.getDescription(), project.isPrivate());
    }
  }
}
