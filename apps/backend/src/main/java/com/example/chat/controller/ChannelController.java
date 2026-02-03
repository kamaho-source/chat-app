package com.example.chat.controller;

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
import com.example.chat.repository.*;
import com.example.chat.model.*;
import com.example.chat.service.*;

@RestController
@RequestMapping("/api/channels")
public class ChannelController {
  private final ChannelRepository channelRepository;
  private final ChannelMemberRepository channelMemberRepository;

  public ChannelController(ChannelRepository channelRepository, ChannelMemberRepository channelMemberRepository) {
    this.channelRepository = channelRepository;
    this.channelMemberRepository = channelMemberRepository;
  }

  @GetMapping
  public ResponseEntity<?> list(Authentication authentication) {
    User me = authentication != null && authentication.getPrincipal() instanceof User user ? user : null;
    List<Channel> channels = channelRepository.findAll().stream()
        .filter(channel -> isVisibleTo(channel, me))
        .toList();
    return ResponseEntity.ok(channels.stream().map(ChannelSummary::from).toList());
  }

  @GetMapping("/{id}")
  public ResponseEntity<?> detail(@PathVariable Long id, Authentication authentication) {
    User me = authentication != null && authentication.getPrincipal() instanceof User user ? user : null;
    return channelRepository.findById(id).map(channel -> {
      if (!isVisibleTo(channel, me)) {
        return ResponseEntity.status(403).build();
      }
      return ResponseEntity.ok(ChannelSummary.from(channel));
    }).orElseGet(() -> ResponseEntity.notFound().build());
  }

  @PostMapping
  public ResponseEntity<?> create(@Valid @RequestBody ChannelCreateRequest request, Authentication authentication) {
    User me = (User) authentication.getPrincipal();
    Channel channel = new Channel();
    channel.setName(request.name());
    channel.setDescription(request.description());
    channel.setPrivate(request.isPrivate());
    channel.setCreatedBy(me);
    channelRepository.save(channel);

    ChannelMember member = new ChannelMember();
    member.setChannel(channel);
    member.setUser(me);
    member.setRole(ChannelRole.OWNER);
    member.setCanPost(true);
    channelMemberRepository.save(member);

    return ResponseEntity.ok(ChannelSummary.from(channel));
  }

  @PatchMapping("/{id}")
  public ResponseEntity<?> update(@PathVariable Long id, @Valid @RequestBody ChannelUpdateRequest request, Authentication authentication) {
    User me = (User) authentication.getPrincipal();
    return channelRepository.findById(id).map(channel -> {
      if (!isOwnerOrAdmin(channel, me)) {
        return ResponseEntity.status(403).build();
      }
      channel.setName(request.name());
      channel.setDescription(request.description());
      channel.setPrivate(request.isPrivate());
      channelRepository.save(channel);
      return ResponseEntity.ok(ChannelSummary.from(channel));
    }).orElseGet(() -> ResponseEntity.notFound().build());
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<?> delete(@PathVariable Long id, Authentication authentication) {
    User me = (User) authentication.getPrincipal();
    return channelRepository.findById(id).map(channel -> {
      if (!isOwnerOrAdmin(channel, me)) {
        return ResponseEntity.status(403).build();
      }
      channelRepository.delete(channel);
      return ResponseEntity.ok().build();
    }).orElseGet(() -> ResponseEntity.notFound().build());
  }

  private boolean isOwnerOrAdmin(Channel channel, User user) {
    if (user.getRole() == Role.ADMIN || user.getRole() == Role.MANAGER) {
      return true;
    }
    return channelMemberRepository.findByChannelIdAndUserId(channel.getId(), user.getId())
        .map(member -> member.getRole() == ChannelRole.OWNER)
        .orElse(false);
  }

  private boolean isVisibleTo(Channel channel, User user) {
    if (!channel.isPrivate()) {
      return true;
    }
    if (user == null) {
      return false;
    }
    if (user.getRole() == Role.ADMIN || user.getRole() == Role.MANAGER) {
      return true;
    }
    return channelMemberRepository.findByChannelIdAndUserId(channel.getId(), user.getId()).isPresent();
  }

  public record ChannelCreateRequest(
      @NotBlank @Size(max = 120) String name,
      @Size(max = 500) String description,
      @NotNull boolean isPrivate
  ) {}

  public record ChannelUpdateRequest(
      @NotBlank @Size(max = 120) String name,
      @Size(max = 500) String description,
      @NotNull boolean isPrivate
  ) {}

  public record ChannelSummary(Long id, String name, String description, boolean isPrivate) {
    static ChannelSummary from(Channel channel) {
      return new ChannelSummary(channel.getId(), channel.getName(), channel.getDescription(), channel.isPrivate());
    }
  }
}
