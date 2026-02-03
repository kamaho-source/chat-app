package com.example.chat.controller;

import com.example.chat.model.Role;
import com.example.chat.model.User;
import com.example.chat.repository.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import com.example.chat.repository.*;
import com.example.chat.model.*;
import com.example.chat.service.*;

@RestController
@RequestMapping("/api/projects")
public class TaskController {
  private final TaskRepository taskRepository;
  private final ProjectRepository projectRepository;
  private final ProjectUserRepository projectUserRepository;
  private final UserRepository userRepository;

  public TaskController(TaskRepository taskRepository,
                        ProjectRepository projectRepository,
                        ProjectUserRepository projectUserRepository,
                        UserRepository userRepository) {
    this.taskRepository = taskRepository;
    this.projectRepository = projectRepository;
    this.projectUserRepository = projectUserRepository;
    this.userRepository = userRepository;
  }

  @GetMapping("/{id}/tasks")
  public ResponseEntity<?> list(@PathVariable Long id, Authentication authentication) {
    User me = (User) authentication.getPrincipal();
    if (!hasAccess(id, me)) {
      return ResponseEntity.status(403).build();
    }
    List<Task> tasks = taskRepository.findByProjectId(id);
    return ResponseEntity.ok(tasks.stream().map(TaskSummary::from).toList());
  }

  @PostMapping("/{id}/tasks")
  public ResponseEntity<?> create(@PathVariable Long id, @Valid @RequestBody TaskRequest request, Authentication authentication) {
    User me = (User) authentication.getPrincipal();
    if (!hasAccess(id, me)) {
      return ResponseEntity.status(403).build();
    }
    Project project = projectRepository.findById(id).orElse(null);
    if (project == null) {
      return ResponseEntity.notFound().build();
    }
    Task task = new Task();
    task.setProject(project);
    task.setTitle(request.title());
    task.setDescription(request.description());
    if (request.assigneeId() != null) {
      userRepository.findById(request.assigneeId()).ifPresent(task::setAssignee);
    }
    task.setDueDate(request.dueDate());
    task.setStatus(request.status());
    taskRepository.save(task);
    return ResponseEntity.ok(TaskSummary.from(task));
  }

  @PatchMapping("/{projectId}/tasks/{taskId}")
  public ResponseEntity<?> update(@PathVariable Long projectId, @PathVariable Long taskId, @Valid @RequestBody TaskRequest request, Authentication authentication) {
    User me = (User) authentication.getPrincipal();
    if (!hasAccess(projectId, me)) {
      return ResponseEntity.status(403).build();
    }
    return taskRepository.findById(taskId).map(task -> {
      task.setTitle(request.title());
      task.setDescription(request.description());
      if (request.assigneeId() != null) {
        userRepository.findById(request.assigneeId()).ifPresent(task::setAssignee);
      } else {
        task.setAssignee(null);
      }
      task.setDueDate(request.dueDate());
      task.setStatus(request.status());
      taskRepository.save(task);
      return ResponseEntity.ok(TaskSummary.from(task));
    }).orElseGet(() -> ResponseEntity.notFound().build());
  }

  @DeleteMapping("/{projectId}/tasks/{taskId}")
  public ResponseEntity<?> delete(@PathVariable Long projectId, @PathVariable Long taskId, Authentication authentication) {
    User me = (User) authentication.getPrincipal();
    if (!hasAccess(projectId, me)) {
      return ResponseEntity.status(403).build();
    }
    if (!taskRepository.existsById(taskId)) {
      return ResponseEntity.notFound().build();
    }
    taskRepository.deleteById(taskId);
    return ResponseEntity.ok().build();
  }

  private boolean hasAccess(Long projectId, User user) {
    return projectUserRepository.findByProjectIdAndUserId(projectId, user.getId()).isPresent() || user.getRole() == Role.ADMIN || user.getRole() == Role.MANAGER;
  }

  public record TaskRequest(
      @NotBlank @Size(max = 200) String title,
      String description,
      Long assigneeId,
      LocalDate dueDate,
      @NotNull TaskStatus status
  ) {}

  public record TaskSummary(Long id, String title, String description, Long assigneeId, LocalDate dueDate, TaskStatus status) {
    static TaskSummary from(Task task) {
      return new TaskSummary(task.getId(), task.getTitle(), task.getDescription(), task.getAssignee() == null ? null : task.getAssignee().getId(), task.getDueDate(), task.getStatus());
    }
  }
}
