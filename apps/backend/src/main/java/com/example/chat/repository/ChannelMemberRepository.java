package com.example.chat.repository;

import com.example.chat.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import com.example.chat.model.*;

public interface ChannelMemberRepository extends JpaRepository<ChannelMember, Long> {
  List<ChannelMember> findByChannelId(Long channelId);
  Optional<ChannelMember> findByChannelIdAndUserId(Long channelId, Long userId);
  List<ChannelMember> findByUser(User user);
}
