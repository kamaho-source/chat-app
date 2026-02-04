package com.example.chat.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import com.example.chat.model.*;

public interface ProjectChannelRepository extends JpaRepository<ProjectChannel, Long> {
  List<ProjectChannel> findByProjectId(Long projectId);
  List<ProjectChannel> findByChannelId(Long channelId);
  void deleteByChannelId(Long channelId);
}
