package com.example.chat.controller;

import com.example.chat.service.StorageService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import com.example.chat.repository.*;
import com.example.chat.model.*;
import com.example.chat.service.*;

@RestController
@RequestMapping("/api/users")
public class UserController {
  private static final long AVATAR_MAX_BYTES = 5L * 1024 * 1024;
  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final StorageService storageService;

  public UserController(UserRepository userRepository, PasswordEncoder passwordEncoder, StorageService storageService) {
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
    this.storageService = storageService;
  }

  @GetMapping
  public ResponseEntity<?> list(Authentication authentication) {
    User me = (User) authentication.getPrincipal();
    if (!isAdminOrManager(me)) {
      return ResponseEntity.status(403).build();
    }
    List<UserSummary> users = userRepository.findAll().stream().map(UserSummary::from).toList();
    return ResponseEntity.ok(users);
  }

  @GetMapping("/{id}")
  public ResponseEntity<?> detail(@PathVariable Long id, Authentication authentication) {
    User me = (User) authentication.getPrincipal();
    if (!me.getId().equals(id) && !isAdminOrManager(me)) {
      return ResponseEntity.status(403).build();
    }
    return userRepository.findById(id)
        .map(user -> ResponseEntity.ok(UserSummary.from(user)))
        .orElseGet(() -> ResponseEntity.notFound().build());
  }

  @PatchMapping("/{id}")
  public ResponseEntity<?> updateProfile(@PathVariable Long id, @Valid @RequestBody UpdateProfileRequest request, Authentication authentication) {
    User me = (User) authentication.getPrincipal();
    if (!me.getId().equals(id) && !isAdminOrManager(me)) {
      return ResponseEntity.status(403).build();
    }
    return userRepository.findById(id).map(user -> {
      user.setName(request.name());
      userRepository.save(user);
      return ResponseEntity.ok(UserSummary.from(user));
    }).orElseGet(() -> ResponseEntity.notFound().build());
  }

  @PostMapping("/{id}/avatar")
  public ResponseEntity<?> updateAvatar(@PathVariable Long id, @RequestParam("file") MultipartFile file, Authentication authentication) throws IOException {
    User me = (User) authentication.getPrincipal();
    if (!me.getId().equals(id) && !isAdminOrManager(me)) {
      return ResponseEntity.status(403).build();
    }
    if (file.getSize() > AVATAR_MAX_BYTES) {
      return ResponseEntity.badRequest().body(Map.of("message", "Avatar must be <= 5MB"));
    }
    return userRepository.findById(id).map(user -> {
      try {
        StorageService.StoredFile stored = storageService.store(file, "avatars");
        user.setAvatarUrl(stored.url());
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("avatarUrl", stored.url()));
      } catch (IOException e) {
        return ResponseEntity.internalServerError().body(Map.of("message", "Upload failed"));
      }
    }).orElseGet(() -> ResponseEntity.notFound().build());
  }

  @PatchMapping("/{id}/role")
  public ResponseEntity<?> updateRole(@PathVariable Long id, @Valid @RequestBody UpdateRoleRequest request, Authentication authentication) {
    User me = (User) authentication.getPrincipal();
    if (!isAdminOrManager(me)) {
      return ResponseEntity.status(403).build();
    }
    return userRepository.findById(id).map(user -> {
      user.setRole(request.role());
      userRepository.save(user);
      return ResponseEntity.ok(UserSummary.from(user));
    }).orElseGet(() -> ResponseEntity.notFound().build());
  }

  @PatchMapping("/{id}/status")
  public ResponseEntity<?> updateStatus(@PathVariable Long id, @Valid @RequestBody UpdateStatusRequest request, Authentication authentication) {
    User me = (User) authentication.getPrincipal();
    if (!isAdminOrManager(me)) {
      return ResponseEntity.status(403).build();
    }
    return userRepository.findById(id).map(user -> {
      user.setActive(request.active());
      userRepository.save(user);
      return ResponseEntity.ok(UserSummary.from(user));
    }).orElseGet(() -> ResponseEntity.notFound().build());
  }

  @PatchMapping("/{id}/password")
  public ResponseEntity<?> adminPasswordChange(@PathVariable Long id, @Valid @RequestBody UpdatePasswordRequest request, Authentication authentication) {
    User me = (User) authentication.getPrincipal();
    if (!isAdminOrManager(me)) {
      return ResponseEntity.status(403).build();
    }
    return userRepository.findById(id).map(user -> {
      user.setPassword(passwordEncoder.encode(request.password()));
      userRepository.save(user);
      return ResponseEntity.ok(Map.of("message", "Password updated"));
    }).orElseGet(() -> ResponseEntity.notFound().build());
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<?> delete(@PathVariable Long id, Authentication authentication) {
    User me = (User) authentication.getPrincipal();
    if (!isAdminOrManager(me)) {
      return ResponseEntity.status(403).build();
    }
    if (!userRepository.existsById(id)) {
      return ResponseEntity.notFound().build();
    }
    userRepository.deleteById(id);
    return ResponseEntity.ok(Map.of("message", "Deleted"));
  }

  private boolean isAdminOrManager(User user) {
    return user.getRole() == Role.ADMIN || user.getRole() == Role.MANAGER;
  }

  public record UpdateProfileRequest(@NotBlank @Size(max = 100) String name) {}

  public record UpdateRoleRequest(@NotNull Role role) {}

  public record UpdateStatusRequest(boolean active) {}

  public record UpdatePasswordRequest(@NotBlank @Size(min = 8, max = 200) String password) {}

  public record UserSummary(Long id, String email, String name, Role role, String avatarUrl, boolean active) {
    static UserSummary from(User user) {
      return new UserSummary(user.getId(), user.getEmail(), user.getName(), user.getRole(), user.getAvatarUrl(), user.isActive());
    }
  }
}
