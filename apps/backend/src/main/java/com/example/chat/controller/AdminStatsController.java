package com.example.chat.controller;

import com.example.chat.repository.ChannelRepository;
import com.example.chat.model.Message;
import com.example.chat.repository.MessageRepository;
import com.example.chat.model.Role;
import com.example.chat.model.User;
import com.example.chat.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import com.example.chat.repository.*;
import com.example.chat.model.*;
import com.example.chat.service.*;

@RestController
@RequestMapping("/api/admin/stats")
public class AdminStatsController {
  private final UserRepository userRepository;
  private final ChannelRepository channelRepository;
  private final MessageRepository messageRepository;

  public AdminStatsController(UserRepository userRepository, ChannelRepository channelRepository, MessageRepository messageRepository) {
    this.userRepository = userRepository;
    this.channelRepository = channelRepository;
    this.messageRepository = messageRepository;
  }

  @GetMapping
  public ResponseEntity<?> stats(Authentication authentication) {
    User me = (User) authentication.getPrincipal();
    if (me.getRole() != Role.ADMIN && me.getRole() != Role.MANAGER) {
      return ResponseEntity.status(403).build();
    }

    long userCount = userRepository.count();
    long channelCount = channelRepository.count();
    long messageCount = messageRepository.count();

    List<Message> messages = messageRepository.findAll();

    Map<Long, Long> channelMessageCounts = messages.stream()
        .collect(Collectors.groupingBy(m -> m.getChannel().getId(), Collectors.counting()));

    Map<LocalDate, Long> dailyUsage = messages.stream()
        .collect(Collectors.groupingBy(m -> LocalDate.ofInstant(m.getCreatedAt(), ZoneId.systemDefault()), Collectors.counting()));

    return ResponseEntity.ok(Map.of(
        "userCount", userCount,
        "channelCount", channelCount,
        "messageCount", messageCount,
        "channelMessageCounts", channelMessageCounts,
        "dailyUsage", dailyUsage
    ));
  }
}
