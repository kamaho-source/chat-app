package com.example.chat.service;

import com.example.chat.service.AiService;
import com.example.chat.model.Channel;
import com.example.chat.model.ChannelMember;
import com.example.chat.repository.ChannelMemberRepository;
import com.example.chat.repository.ChannelRepository;
import com.example.chat.service.StorageService;
import com.example.chat.model.Role;
import com.example.chat.model.User;
import com.example.chat.repository.UserRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Optional;
import com.example.chat.repository.*;
import com.example.chat.model.*;

@Service
public class MessageService {
  private final MessageRepository messageRepository;
  private final ChannelRepository channelRepository;
  private final ChannelMemberRepository channelMemberRepository;
  private final StorageService storageService;
  private final SimpMessagingTemplate messagingTemplate;
  private final AiService aiService;
  private final UserRepository userRepository;

  public MessageService(MessageRepository messageRepository,
                        ChannelRepository channelRepository,
                        ChannelMemberRepository channelMemberRepository,
                        StorageService storageService,
                        SimpMessagingTemplate messagingTemplate,
                        AiService aiService,
                        UserRepository userRepository) {
    this.messageRepository = messageRepository;
    this.channelRepository = channelRepository;
    this.channelMemberRepository = channelMemberRepository;
    this.storageService = storageService;
    this.messagingTemplate = messagingTemplate;
    this.aiService = aiService;
    this.userRepository = userRepository;
  }

  public List<Message> listByChannel(Long channelId, User user) {
    ensureChannelViewable(channelId, user);
    return messageRepository.findByChannelIdOrderByCreatedAtAsc(channelId);
  }

  public Message postMessage(Long channelId, User user, String content, MultipartFile attachment) throws IOException {
    Channel channel = channelRepository.findById(channelId).orElseThrow();
    ensureCanPost(channelId, user);

    Message message = new Message();
    message.setChannel(channel);
    message.setSender(user);
    message.setContent(content);

    if (attachment != null && !attachment.isEmpty()) {
      StorageService.StoredFile stored = storageService.store(attachment, "message-attachments");
      message.setAttachmentUrl(stored.url());
    }

    Message saved = messageRepository.save(message);
    safeBroadcast("/topic/channels/" + channelId, MessageSummary.from(saved));

    if (content != null && content.contains("@AI")) {
      createAiReply(channel, content);
    }

    return saved;
  }

  public Message editMessage(Long messageId, User user, String content) {
    Message message = messageRepository.findById(messageId).orElseThrow();
    if (!message.getSender().getId().equals(user.getId()) && user.getRole() != Role.ADMIN && user.getRole() != Role.MANAGER) {
      throw new IllegalStateException("Forbidden");
    }
    message.setContent(content);
    message.setEdited(true);
    Message saved = messageRepository.save(message);
    safeBroadcast("/topic/channels/" + message.getChannel().getId(), MessageSummary.from(saved));
    return saved;
  }

  private void createAiReply(Channel channel, String prompt) {
    try {
      String reply = aiService.generateReply(prompt);
      User aiUser = userRepository.findByEmail("ai@system.local").orElseGet(() -> {
        User user = new User();
        user.setEmail("ai@system.local");
        user.setName("AI");
        user.setPassword("-");
        user.setRole(Role.MEMBER);
        return userRepository.save(user);
      });
      Message aiMessage = new Message();
      aiMessage.setChannel(channel);
      aiMessage.setSender(aiUser);
      aiMessage.setContent(reply);
      Message saved = messageRepository.save(aiMessage);
      safeBroadcast("/topic/channels/" + channel.getId(), MessageSummary.from(saved));
    } catch (Exception ignored) {
      safeBroadcast("/topic/channels/" + channel.getId(), new MessageSummary(null, channel.getId(), null, null, null, "AI reply failed", null, false));
    }
  }

  private void ensureChannelViewable(Long channelId, User user) {
    Optional<ChannelMember> member = channelMemberRepository.findByChannelIdAndUserId(channelId, user.getId());
    if (member.isEmpty()) {
      Channel channel = channelRepository.findById(channelId).orElseThrow();
      if (!channel.isActive()) {
        throw new IllegalStateException("Channel inactive");
      }
      if (channel.isPrivate() && user.getRole() != Role.ADMIN && user.getRole() != Role.MANAGER) {
        throw new IllegalStateException("Forbidden");
      }
    }
  }

  private void ensureCanPost(Long channelId, User user) {
    Optional<ChannelMember> member = channelMemberRepository.findByChannelIdAndUserId(channelId, user.getId());
    if (member.isPresent()) {
      if (!member.get().isCanPost()) {
        throw new IllegalStateException("Posting disabled");
      }
      return;
    }
    Channel channel = channelRepository.findById(channelId).orElseThrow();
    if (!channel.isActive()) {
      throw new IllegalStateException("Channel inactive");
    }
    if (!channel.isPrivate()) {
      return;
    }
    if (user.getRole() == Role.ADMIN || user.getRole() == Role.MANAGER) {
      return;
    }
    throw new IllegalStateException("Not a member");
  }

  private void safeBroadcast(String destination, Object payload) {
    try {
      messagingTemplate.convertAndSend(destination, payload);
    } catch (Exception ignored) {
    }
  }

  public record MessageSummary(Long id, Long channelId, Long senderId, String senderName, String senderAvatarUrl, String content, String attachmentUrl, boolean edited) {
    public static MessageSummary from(Message message) {
      User sender = message.getSender();
      return new MessageSummary(
          message.getId(),
          message.getChannel().getId(),
          sender != null ? sender.getId() : null,
          sender != null ? sender.getName() : null,
          sender != null ? sender.getAvatarUrl() : null,
          message.getContent(),
          message.getAttachmentUrl(),
          message.isEdited()
      );
    }
  }
}
