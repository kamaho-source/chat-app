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
@RequestMapping("/api/channels")
public class ChannelPrivacyController {
  private final ChannelRepository channelRepository;
  private final ChannelMemberRepository channelMemberRepository;
  private final UserRepository userRepository;

  public ChannelPrivacyController(ChannelRepository channelRepository, ChannelMemberRepository channelMemberRepository, UserRepository userRepository) {
    this.channelRepository = channelRepository;
    this.channelMemberRepository = channelMemberRepository;
    this.userRepository = userRepository;
  }

  @GetMapping("/{id}/members")
  public ResponseEntity<?> members(@PathVariable Long id, Authentication authentication) {
    User me = (User) authentication.getPrincipal();
    if (!hasAccess(id, me)) {
      return ResponseEntity.status(403).build();
    }
    List<ChannelMember> members = channelMemberRepository.findByChannelId(id);
    return ResponseEntity.ok(members.stream().map(ChannelMemberSummary::from).toList());
  }

  @PostMapping("/{id}/members")
  public ResponseEntity<?> addMember(@PathVariable Long id, @Valid @RequestBody ChannelMemberRequest request, Authentication authentication) {
    User me = (User) authentication.getPrincipal();
    if (!isOwnerOrAdmin(id, me)) {
      return ResponseEntity.status(403).build();
    }
    return channelRepository.findById(id).map(channel -> {
      User user = userRepository.findById(request.userId()).orElse(null);
      if (user == null) {
        return ResponseEntity.badRequest().body(Map.of("message", "User not found"));
      }
      ChannelMember member = channelMemberRepository.findByChannelIdAndUserId(id, user.getId()).orElseGet(ChannelMember::new);
      member.setChannel(channel);
      member.setUser(user);
      member.setRole(request.role());
      member.setCanPost(request.canPost());
      channelMemberRepository.save(member);
      return ResponseEntity.ok(ChannelMemberSummary.from(member));
    }).orElseGet(() -> ResponseEntity.notFound().build());
  }

  @PatchMapping("/{id}/members/{memberId}")
  public ResponseEntity<?> updateMember(@PathVariable Long id, @PathVariable Long memberId, @Valid @RequestBody ChannelMemberRequest request, Authentication authentication) {
    User me = (User) authentication.getPrincipal();
    if (!isOwnerOrAdmin(id, me)) {
      return ResponseEntity.status(403).build();
    }
    return channelMemberRepository.findById(memberId).map(member -> {
      member.setRole(request.role());
      member.setCanPost(request.canPost());
      channelMemberRepository.save(member);
      return ResponseEntity.ok(ChannelMemberSummary.from(member));
    }).orElseGet(() -> ResponseEntity.notFound().build());
  }

  @DeleteMapping("/{id}/members/{memberId}")
  public ResponseEntity<?> removeMember(@PathVariable Long id, @PathVariable Long memberId, Authentication authentication) {
    User me = (User) authentication.getPrincipal();
    if (!isOwnerOrAdmin(id, me)) {
      return ResponseEntity.status(403).build();
    }
    if (!channelMemberRepository.existsById(memberId)) {
      return ResponseEntity.notFound().build();
    }
    channelMemberRepository.deleteById(memberId);
    return ResponseEntity.ok().build();
  }

  @PatchMapping("/{id}/privacy")
  public ResponseEntity<?> updatePrivacy(@PathVariable Long id, @Valid @RequestBody PrivacyRequest request, Authentication authentication) {
    User me = (User) authentication.getPrincipal();
    return channelRepository.findById(id).map(channel -> {
      if (!isOwnerOrAdmin(id, me)) {
        return ResponseEntity.status(403).build();
      }
      channel.setPrivate(request.isPrivate());
      channelRepository.save(channel);
      return ResponseEntity.ok(Map.of("isPrivate", channel.isPrivate()));
    }).orElseGet(() -> ResponseEntity.notFound().build());
  }

  private boolean hasAccess(Long channelId, User user) {
    return channelMemberRepository.findByChannelIdAndUserId(channelId, user.getId()).isPresent() || user.getRole() == Role.ADMIN || user.getRole() == Role.MANAGER;
  }

  private boolean isOwnerOrAdmin(Long channelId, User user) {
    if (user.getRole() == Role.ADMIN || user.getRole() == Role.MANAGER) {
      return true;
    }
    return channelMemberRepository.findByChannelIdAndUserId(channelId, user.getId())
        .map(member -> member.getRole() == ChannelRole.OWNER)
        .orElse(false);
  }

  public record ChannelMemberRequest(@NotNull Long userId, @NotNull ChannelRole role, @NotNull boolean canPost) {}

  public record PrivacyRequest(@NotNull boolean isPrivate) {}

  public record ChannelMemberSummary(Long id, Long userId, ChannelRole role, boolean canPost) {
    static ChannelMemberSummary from(ChannelMember member) {
      return new ChannelMemberSummary(member.getId(), member.getUser().getId(), member.getRole(), member.isCanPost());
    }
  }
}
