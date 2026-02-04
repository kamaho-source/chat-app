package com.example.chat.controller;

import com.example.chat.service.StorageService;
import com.example.chat.model.Role;
import com.example.chat.model.User;
import com.example.chat.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import com.example.chat.repository.*;
import com.example.chat.model.*;
import com.example.chat.service.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private static final long AVATAR_MAX_BYTES = 300L * 1024 * 1024;
  private final AuthenticationManager authenticationManager;
  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final StorageService storageService;

  public AuthController(AuthenticationManager authenticationManager,
                        UserRepository userRepository,
                        PasswordEncoder passwordEncoder,
                        StorageService storageService) {
    this.authenticationManager = authenticationManager;
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
    this.storageService = storageService;
  }

  @PostMapping("/register")
  public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
    if (userRepository.findByEmail(request.userId()).isPresent()) {
      return ResponseEntity.badRequest().body(Map.of("message", "ID already registered"));
    }
    User user = new User();
    user.setEmail(request.userId());
    user.setName(request.userId());
    user.setPassword(passwordEncoder.encode(request.password()));
    user.setRole(Role.MEMBER);
    userRepository.save(user);
    return ResponseEntity.ok(Map.of("id", user.getId(), "email", user.getEmail(), "name", user.getName()));
  }

  @PostMapping("/register-child")
  public ResponseEntity<?> registerChild(@RequestParam("userId") String userId,
                                         @RequestParam("password") String password,
                                         @RequestParam(value = "avatar", required = false) MultipartFile avatar) throws IOException {
    if (userId == null || userId.isBlank() || userId.length() > 50) {
      return ResponseEntity.badRequest().body(Map.of("message", "Invalid userId"));
    }
    if (password == null || password.length() < 8) {
      return ResponseEntity.badRequest().body(Map.of("message", "Password too short"));
    }
    if (userRepository.findByEmail(userId).isPresent()) {
      return ResponseEntity.badRequest().body(Map.of("message", "ID already registered"));
    }
    if (avatar != null && avatar.getSize() > AVATAR_MAX_BYTES) {
      return ResponseEntity.badRequest().body(Map.of("message", "Avatar must be <= 300MB"));
    }
    User user = new User();
    user.setEmail(userId);
    user.setName(userId);
    user.setPassword(passwordEncoder.encode(password));
    user.setRole(Role.MEMBER);
    if (avatar != null && !avatar.isEmpty()) {
      StorageService.StoredFile stored = storageService.store(avatar, "avatars");
      user.setAvatarUrl(stored.url());
    }
    userRepository.save(user);
    return ResponseEntity.ok(Map.of("id", user.getId(), "userId", user.getEmail(), "avatarUrl", user.getAvatarUrl()));
  }

  @PostMapping("/login")
  public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
    try {
      Authentication auth = authenticationManager.authenticate(
          new UsernamePasswordAuthenticationToken(request.userId(), request.password()));
      SecurityContextHolder.getContext().setAuthentication(auth);
      httpRequest.getSession(true);
      return ResponseEntity.ok(Map.of("message", "Logged in"));
    } catch (BadCredentialsException ex) {
      return ResponseEntity.status(401).body(Map.of("message", "Invalid credentials"));
    }
  }

  @PostMapping("/classroom-login")
  public ResponseEntity<?> classroomLogin(@Valid @RequestBody ClassroomLoginRequest request, HttpServletRequest httpRequest) {
    if (request.classCode() == null || request.classCode().isBlank()) {
      return ResponseEntity.badRequest().body(Map.of("message", "Class code required"));
    }
    try {
      Authentication auth = authenticationManager.authenticate(
          new UsernamePasswordAuthenticationToken(request.userId(), request.password()));
      SecurityContextHolder.getContext().setAuthentication(auth);
      httpRequest.getSession(true);
      return ResponseEntity.ok(Map.of("message", "Logged in"));
    } catch (BadCredentialsException ex) {
      return ResponseEntity.status(401).body(Map.of("message", "Invalid credentials"));
    }
  }

  @PostMapping("/guest")
  public ResponseEntity<?> guest(HttpServletRequest httpRequest) {
    String guestId = "guest_" + System.currentTimeMillis();
    User user = new User();
    user.setEmail(guestId);
    user.setName("Guest");
    user.setPassword(passwordEncoder.encode(guestId));
    user.setRole(Role.MEMBER);
    userRepository.save(user);
    Authentication auth = authenticationManager.authenticate(
        new UsernamePasswordAuthenticationToken(guestId, guestId));
    SecurityContextHolder.getContext().setAuthentication(auth);
    httpRequest.getSession(true);
    return ResponseEntity.ok(Map.of("message", "Logged in", "userId", guestId));
  }

  @PostMapping("/logout")
  public ResponseEntity<?> logout(HttpServletRequest request, HttpServletResponse response) {
    new SecurityContextLogoutHandler().logout(request, response, null);
    return ResponseEntity.ok(Map.of("message", "Logged out"));
  }

  @GetMapping("/me")
  public ResponseEntity<?> me(Authentication authentication) {
    if (authentication == null || !authentication.isAuthenticated()) {
      return ResponseEntity.status(401).body(Map.of("message", "Not authenticated"));
    }
    Object principal = authentication.getPrincipal();
    if (!(principal instanceof User user)) {
      return ResponseEntity.status(401).body(Map.of("message", "Not authenticated"));
    }
    Map<String, Object> payload = new java.util.LinkedHashMap<>();
    payload.put("id", user.getId());
    payload.put("email", user.getEmail());
    payload.put("name", user.getName());
    payload.put("role", user.getRole() == null ? "MEMBER" : user.getRole().name());
    payload.put("avatarUrl", user.getAvatarUrl());
    payload.put("active", user.isActive());
    return ResponseEntity.ok(payload);
  }

  public record RegisterRequest(
      @NotBlank @Size(min = 2, max = 50) String userId,
      @NotBlank @Size(min = 8, max = 200) String password
  ) {}

  public record LoginRequest(
      @NotBlank @Size(min = 2, max = 50) String userId,
      @NotBlank String password
  ) {}

  public record ClassroomLoginRequest(
      @NotBlank String classCode,
      @NotBlank @Size(min = 2, max = 50) String userId,
      @NotBlank String password
  ) {}
}
