package com.example.chat.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import com.example.chat.model.*;

public interface MessageRepository extends JpaRepository<Message, Long> {
  List<Message> findByChannelIdOrderByCreatedAtAsc(Long channelId);
  void deleteByChannelId(Long channelId);
}
