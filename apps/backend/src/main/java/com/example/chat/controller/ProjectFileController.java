package com.example.chat.controller;

import com.example.chat.service.StorageService;
import com.example.chat.model.Role;
import com.example.chat.model.User;
import jakarta.validation.constraints.NotNull;
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
@RequestMapping("/api/projects")
public class ProjectFileController {
  private static final long FILE_MAX_BYTES = 5L * 1024 * 1024;
  private final ProjectRepository projectRepository;
  private final ProjectFileRepository projectFileRepository;
  private final ProjectUserRepository projectUserRepository;
  private final StorageService storageService;

  public ProjectFileController(ProjectRepository projectRepository,
                               ProjectFileRepository projectFileRepository,
                               ProjectUserRepository projectUserRepository,
                               StorageService storageService) {
    this.projectRepository = projectRepository;
    this.projectFileRepository = projectFileRepository;
    this.projectUserRepository = projectUserRepository;
    this.storageService = storageService;
  }

  @GetMapping("/{id}/files")
  public ResponseEntity<?> list(@PathVariable Long id, Authentication authentication) {
    User me = (User) authentication.getPrincipal();
    if (!hasAccess(id, me)) {
      return ResponseEntity.status(403).build();
    }
    List<ProjectFile> files = projectFileRepository.findByProjectId(id);
    return ResponseEntity.ok(files.stream().map(ProjectFileSummary::from).toList());
  }

  @PostMapping("/{id}/files")
  public ResponseEntity<?> upload(@PathVariable Long id, @RequestParam("file") MultipartFile file, Authentication authentication) throws IOException {
    User me = (User) authentication.getPrincipal();
    if (!hasAccess(id, me)) {
      return ResponseEntity.status(403).build();
    }
    if (file.getSize() > FILE_MAX_BYTES) {
      return ResponseEntity.badRequest().body(Map.of("message", "File must be <= 5MB"));
    }
    Project project = projectRepository.findById(id).orElse(null);
    if (project == null) {
      return ResponseEntity.notFound().build();
    }
    StorageService.StoredFile stored = storageService.store(file, "project-files");
    ProjectFile projectFile = new ProjectFile();
    projectFile.setProject(project);
    projectFile.setUploadedBy(me);
    projectFile.setFilename(file.getOriginalFilename());
    projectFile.setUrl(stored.url());
    projectFile.setSize(stored.size());
    projectFileRepository.save(projectFile);
    return ResponseEntity.ok(ProjectFileSummary.from(projectFile));
  }

  @DeleteMapping("/{id}/files/{fileId}")
  public ResponseEntity<?> delete(@PathVariable Long id, @PathVariable Long fileId, Authentication authentication) {
    User me = (User) authentication.getPrincipal();
    if (!isOwnerOrAdmin(id, me)) {
      return ResponseEntity.status(403).build();
    }
    if (!projectFileRepository.existsById(fileId)) {
      return ResponseEntity.notFound().build();
    }
    projectFileRepository.deleteById(fileId);
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

  public record ProjectFileSummary(Long id, String filename, String url, long size) {
    static ProjectFileSummary from(ProjectFile file) {
      return new ProjectFileSummary(file.getId(), file.getFilename(), file.getUrl(), file.getSize());
    }
  }
}
