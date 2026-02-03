package com.example.chat.controller;

import com.example.chat.model.Role;
import com.example.chat.model.User;
import com.example.chat.repository.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Random;
import com.example.chat.repository.*;
import com.example.chat.model.*;
import com.example.chat.service.*;

@RestController
@RequestMapping("/api/classrooms")
public class ClassroomController {
  private final ClassroomRepository classroomRepository;
  private final ClassroomUserRepository classroomUserRepository;
  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;

  public ClassroomController(ClassroomRepository classroomRepository,
                             ClassroomUserRepository classroomUserRepository,
                             UserRepository userRepository,
                             PasswordEncoder passwordEncoder) {
    this.classroomRepository = classroomRepository;
    this.classroomUserRepository = classroomUserRepository;
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
  }

  @GetMapping
  public ResponseEntity<?> list(Authentication authentication) {
    User me = (User) authentication.getPrincipal();
    if (me.getRole() != Role.ADMIN && me.getRole() != Role.MANAGER) {
      return ResponseEntity.status(403).build();
    }
    return ResponseEntity.ok(classroomRepository.findAll().stream()
        .map(c -> Map.of("id", c.getId(), "name", c.getName(), "code", c.getCode()))
        .toList());
  }

  @PostMapping
  public ResponseEntity<?> create(@Valid @RequestBody ClassroomRequest request, Authentication authentication) {
    User me = (User) authentication.getPrincipal();
    if (me.getRole() != Role.ADMIN && me.getRole() != Role.MANAGER) {
      return ResponseEntity.status(403).build();
    }
    Classroom classroom = new Classroom();
    classroom.setName(request.name());
    classroom.setCode(request.code() == null || request.code().isBlank() ? generateCode() : request.code());
    classroomRepository.save(classroom);
    return ResponseEntity.ok(Map.of("id", classroom.getId(), "name", classroom.getName(), "code", classroom.getCode()));
  }

  @GetMapping("/{id}/students")
  public ResponseEntity<?> listStudents(@PathVariable Long id, Authentication authentication) {
    User me = (User) authentication.getPrincipal();
    if (me.getRole() != Role.ADMIN && me.getRole() != Role.MANAGER) {
      return ResponseEntity.status(403).build();
    }
    List<ClassroomUser> users = classroomUserRepository.findByClassroomId(id);
    return ResponseEntity.ok(users.stream().map(cu -> Map.of(
        "id", cu.getId(),
        "userId", cu.getUser().getId(),
        "userName", cu.getUser().getName(),
        "userKey", cu.getUser().getEmail()
    )).toList());
  }

  @PostMapping("/{id}/students/bulk")
  public ResponseEntity<?> bulkCreate(@PathVariable Long id, @RequestBody List<BulkUserRequest> users, Authentication authentication) {
    User me = (User) authentication.getPrincipal();
    if (me.getRole() != Role.ADMIN && me.getRole() != Role.MANAGER) {
      return ResponseEntity.status(403).build();
    }
    Classroom classroom = classroomRepository.findById(id).orElse(null);
    if (classroom == null) {
      return ResponseEntity.notFound().build();
    }
    List<Map<String, Object>> created = users.stream().map(req -> {
      User user = userRepository.findByEmail(req.userId()).orElseGet(() -> {
        User u = new User();
        u.setEmail(req.userId());
        u.setName(req.userId());
        u.setPassword(passwordEncoder.encode(req.password()));
        u.setRole(Role.MEMBER);
        return userRepository.save(u);
      });
      ClassroomUser cu = classroomUserRepository.findByClassroomIdAndUserId(id, user.getId()).orElseGet(ClassroomUser::new);
      cu.setClassroom(classroom);
      cu.setUser(user);
      classroomUserRepository.save(cu);
      return Map.<String, Object>of("userId", user.getId(), "userKey", user.getEmail());
    }).toList();
    return ResponseEntity.ok(created);
  }

  private String generateCode() {
    String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    Random random = new Random();
    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < 6; i++) {
      sb.append(chars.charAt(random.nextInt(chars.length())));
    }
    return sb.toString();
  }

  public record ClassroomRequest(@NotBlank @Size(max = 100) String name, String code) {}

  public record BulkUserRequest(@NotBlank @Size(max = 50) String userId, @NotBlank @Size(min = 8, max = 200) String password) {}
}
