package com.example.chat.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import com.example.chat.model.*;

public interface ProjectChatMessageRepository extends JpaRepository<ProjectChatMessage, Long> {
  List<ProjectChatMessage> findByProjectIdOrderByCreatedAtAsc(Long projectId);
}
